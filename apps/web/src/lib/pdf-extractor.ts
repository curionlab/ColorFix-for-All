import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import type { ExtractedTextElement } from '../types';
import { toHex, parseHex } from '@colorfix/color-engine';

// Use local worker or CDN. For simplicity, we can load from CDN in production
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.mjs`;

function getForegroundBackgroundColors(imageData: ImageData): { fg: string, bg: string } {
  const { data, width, height } = imageData;
  
  const colorBorders = new Map<string, number>();
  const colorTotals = new Map<string, { count: number, r: number, g: number, b: number }>();
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] > 128) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        const qR = r & 0xF0;
        const qG = g & 0xF0;
        const qB = b & 0xF0;
        const key = `${qR},${qG},${qB}`;
        
        if (!colorTotals.has(key)) {
          colorTotals.set(key, { count: 0, r: 0, g: 0, b: 0 });
          colorBorders.set(key, 0);
        }
        const total = colorTotals.get(key)!;
        total.count++;
        total.r += r; 
        total.g += g;
        total.b += b;
        
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          colorBorders.set(key, (colorBorders.get(key) || 0) + 1);
        }
      }
    }
  }

  let bgKey = '';
  let maxBorder = -1;
  colorBorders.forEach((bCount, key) => {
    if (bCount > maxBorder) {
      maxBorder = bCount;
      bgKey = key;
    }
  });

  const bgCluster = colorTotals.get(bgKey);
  let bgR = 255, bgG = 255, bgB = 255;
  if (bgCluster) {
    bgR = Math.round(bgCluster.r / bgCluster.count);
    bgG = Math.round(bgCluster.g / bgCluster.count);
    bgB = Math.round(bgCluster.b / bgCluster.count);
  }

  let bestFg = { r: bgR, g: bgG, b: bgB };
  let maxScore = -1;

  colorTotals.forEach((cluster, key) => {
    if (key === bgKey) return;
    const cr = Math.round(cluster.r / cluster.count);
    const cg = Math.round(cluster.g / cluster.count);
    const cb = Math.round(cluster.b / cluster.count);
    const diff = Math.abs(cr - bgR) + Math.abs(cg - bgG) + Math.abs(cb - bgB);
    
    if (diff < 60) return;
    const score = cluster.count * Math.min(1.0, diff / 200); 

    if (score > maxScore) {
      maxScore = score;
      bestFg = { r: cr, g: cg, b: cb };
    }
  });

  if (maxScore === -1) {
    let maxDiffFallback = -1;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 128) {
        const d = Math.abs(data[i] - bgR) + Math.abs(data[i + 1] - bgG) + Math.abs(data[i + 2] - bgB);
        if (d > maxDiffFallback) {
          maxDiffFallback = d;
          bestFg = { r: data[i], g: data[i + 1], b: data[i + 2] };
        }
      }
    }
  }

  return {
    bg: toHex({ r: bgR, g: bgG, b: bgB }),
    fg: toHex(bestFg)
  };
}

export async function extractPdf(file: File): Promise<{
  elements: ExtractedTextElement[],
  thumbnailUrl: string,
  width: number,
  height: number
}> {
  const arrayBuffer = await file.arrayBuffer();
  
  const loadingTask = getDocument({ 
    data: arrayBuffer,
    cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/standard_fonts/'
  });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;

  const textContent = await page.getTextContent();
  const elements: ExtractedTextElement[] = [];

  for (let i = 0; i < textContent.items.length; i++) {
    const item = textContent.items[i] as TextItem;
    if (item.str && item.str.trim() !== '') {
      if (item.str.replace(/[\s.,\-_・]/g, '') === '') continue;

      const tx = viewport.transform;
      const x = (item.transform[4] * tx[0]) + (item.transform[5] * tx[2]) + tx[4];
      const y = (item.transform[4] * tx[1]) + (item.transform[5] * tx[3]) + tx[5];
      const w = item.width * viewport.scale;
      const h = item.transform[0] * viewport.scale; 
      const adjustedY = y - h;

      let bgColor = '#ffffff';
      let fgColor = '#000000';
      try {
        const sx = Math.max(0, Math.floor(x - 2));
        const sy = Math.max(0, Math.floor(adjustedY - 2));
        const sw = Math.min(canvas.width - sx, Math.ceil(w + 4));
        const sh = Math.min(canvas.height - sy, Math.ceil(h + 4));
        
        if (sw > 0 && sh > 0) {
          const areaSample = ctx.getImageData(sx, sy, sw, sh);
          const colors = getForegroundBackgroundColors(areaSample);
          bgColor = colors.bg;
          fgColor = colors.fg;
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

  const thumbnailUrl = canvas.toDataURL('image/png');

  return {
    elements,
    thumbnailUrl,
    width: viewport.width,
    height: viewport.height
  };
}
