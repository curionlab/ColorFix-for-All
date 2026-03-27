import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import type { ExtractedTextElement } from '../types';
import { toHex } from '@colorfix/color-engine';

// Use local worker or CDN. For simplicity, we can load from CDN in production
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.mjs`;

function getMedianColor(imageData: ImageData): string {
  const { data } = imageData;
  let r = 0, g = 0, b = 0, count = 0;
  
  // A simple average of non-transparent (or mostly non-transparent) pixels
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 128) { // if alpha > 0.5
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
  }

  if (count === 0) return '#ffffff'; // Fallback to white

  return toHex({
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count)
  });
}

function getDominantForegroundColor(imageData: ImageData, bgColorHex: string): string {
  const { data } = imageData;
  
  let bgR = 255, bgG = 255, bgB = 255;
  if (bgColorHex.length === 7) {
    bgR = parseInt(bgColorHex.slice(1, 3), 16);
    bgG = parseInt(bgColorHex.slice(3, 5), 16);
    bgB = parseInt(bgColorHex.slice(5, 7), 16);
  }

  const colorCounts = new Map<string, { count: number, r: number, g: number, b: number }>();
  let hasDistinctPixels = false;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 128) { // non-transparent
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
      // If pixel is visually distinct from background (distance > 15 out of 765)
      if (diff > 15) {
        hasDistinctPixels = true;
        
        // Quantize slightly (remove lowest 3 bits) to group anti-aliased sub-pixels together
        const qR = r & 0xF8;
        const qG = g & 0xF8;
        const qB = b & 0xF8;
        const key = `${qR},${qG},${qB}`;
        
        if (!colorCounts.has(key)) {
          colorCounts.set(key, { count: 0, r, g, b }); // store the exact color of the first match
        }
        colorCounts.get(key)!.count++;
      }
    }
  }

  // Fallback if no distinct pixels were found (e.g. extremely low contrast or very thin font missed)
  if (!hasDistinctPixels) {
    return getMostDifferentColorFallback(imageData, bgR, bgG, bgB);
  }

  // Find the exact color that appeared most frequently among non-background pixels
  let maxCount = -1;
  let dominantColor = { r: 0, g: 0, b: 0 };
  
  // Need to iterate using Array.from because we compile to ES2022+ or just use forEach
  colorCounts.forEach(val => {
    if (val.count > maxCount) {
      maxCount = val.count;
      dominantColor = { r: val.r, g: val.g, b: val.b };
    }
  });

  return toHex(dominantColor);
}

function getMostDifferentColorFallback(imageData: ImageData, bgR: number, bgG: number, bgB: number): string {
  const { data } = imageData;
  let maxDiff = -1;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 128) {
      const diff = Math.abs(data[i] - bgR) + Math.abs(data[i + 1] - bgG) + Math.abs(data[i + 2] - bgB);
      if (diff > maxDiff) {
        maxDiff = diff;
        r = data[i];
        g = data[i + 1];
        b = data[i + 2];
      }
    }
  }
  return toHex({ r, g, b });
}

export async function extractPdf(file: File): Promise<{
  elements: ExtractedTextElement[],
  thumbnailUrl: string,
  width: number,
  height: number
}> {
  const arrayBuffer = await file.arrayBuffer();
  
  // Load PDF with CMap configuration for CJK languages (like Japanese)
  const loadingTask = getDocument({ 
    data: arrayBuffer,
    cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/standard_fonts/'
  });
  const pdf = await loadingTask.promise;
  
  // For MVP, just process Page 1
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 }); // Scale up for better pixel sampling

  // Create canvas for rendering
  const canvas = document.createElement('canvas');
  // willReadFrequently is important for getImageData performance
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  // Fill with white first, as PDFs assume a white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Render exactly what a user sees to the canvas
  await page.render({ canvasContext: ctx, viewport }).promise;

  // Get text content
  const textContent = await page.getTextContent();
  const elements: ExtractedTextElement[] = [];

  for (let i = 0; i < textContent.items.length; i++) {
    const item = textContent.items[i];
    if ('str' in item && item.str.trim() !== '') {
      // Ignore decorative text elements (like "......" or "----") which cause false flags
      if (item.str.replace(/[\s.,\-_・]/g, '') === '') {
        continue;
      }

      // Calculate bounding box using transform matrix
      const tx = viewport.transform;
      // item.transform is [fontHeight, 0, 0, fontHeight, x, y] roughly
      // PDF y-axis is bottom-up, viewport.transform flips it.
      const x = (item.transform[4] * tx[0]) + (item.transform[5] * tx[2]) + tx[4];
      const y = (item.transform[4] * tx[1]) + (item.transform[5] * tx[3]) + tx[5];
      
      const w = item.width * viewport.scale;
      // item.height doesn't directly exist on TextItem type in older pdfjs but usually the font size is item.transform[0]
      const h = item.transform[0] * viewport.scale; 
      
      // Adjust Y because it represents baseline, moving it up to roughly top of text
      const adjustedY = y - h;

      // Sample background color just outside the text bounds
      let bgColor = '#ffffff';
      try {
        const sx = Math.max(0, x - 4);
        const sy = Math.max(0, adjustedY - 4);
        const sample = ctx.getImageData(sx, sy, 4, 4); // sample a 4x4 area outside
        bgColor = getMedianColor(sample);
      } catch(e) { /* ignore CORS/bounds errors */ }

      // Get text color by sampling the entire bounding box and taking the dominant pixel different from background
      // This protects against mistaking background noise or neighboring boxes as the text itself.
      let fgColor = '#000000'; 
      try {
        const sx = Math.max(0, x - 1);
        const sy = Math.max(0, adjustedY - 1);
        const sw = Math.min(canvas.width - sx, w + 2);
        const sh = Math.min(canvas.height - sy, h + 2);
        if (sw > 0 && sh > 0) {
          const areaSample = ctx.getImageData(sx, sy, sw, sh);
          fgColor = getDominantForegroundColor(areaSample, bgColor);
        }
      } catch(e) {}

      elements.push({
        id: `text-${i}`,
        text: item.str,
        bounds: { x, y: adjustedY, width: w, height: h },
        fontSize: item.transform[0],
        foregroundColor: fgColor,
        backgroundColor: bgColor
      });
    }
  }

  const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);

  return {
    elements,
    thumbnailUrl,
    width: viewport.width,
    height: viewport.height
  };
}
