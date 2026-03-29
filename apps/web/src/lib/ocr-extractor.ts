import { createWorker } from 'tesseract.js';
import type { ExtractedTextElement } from '../types';
import { getForegroundBackgroundColors } from './pdf-extractor';

export async function extractImage(file: File): Promise<{
  elements: ExtractedTextElement[],
  thumbnailUrl: string,
  width: number,
  height: number
}> {
  // 1. Load image to canvas to get dimensions and for sampling
  const imageUrl = URL.createObjectURL(file);
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imageUrl;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  // 2. Run Tesseract OCR
  console.log('Starting Tesseract OCR (eng+jpn)...');
  const worker = await createWorker('eng+jpn', 1, {
    workerPath: 'https://unpkg.com/tesseract.js@5.1.1/dist/worker.min.js',
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    corePath: 'https://unpkg.com/tesseract.js-core@5.1.0/tesseract-core.wasm.js',
    logger: m => console.log('[Tesseract]', m),
    errorHandler: e => console.error('[Tesseract Error]', e)
  });

  // Set PSM to 11 (Sparse text. Find as much text as possible in no particular order.)
  // This is better for diagrams and scattered text.
  await (worker as any).setParameters({
    tessedit_pageseg_mode: '11',
  });
  
  const { data } = await worker.recognize(canvas);
  await worker.terminate();

  // 3. Map OCR results to ExtractedTextElement
  const elements: ExtractedTextElement[] = [];
  
  // Robustly collect lines from blocks/paragraphs if top-level lines is empty
  const allLines: any[] = [];
  if ((data as any).lines && (data as any).lines.length > 0) {
    allLines.push(...(data as any).lines);
  } else if (data.blocks) {
    data.blocks.forEach((block: any) => {
      if (block.paragraphs) {
        block.paragraphs.forEach((para: any) => {
          if (para.lines) allLines.push(...para.lines);
        });
      }
    });
  }

  // Fallback to words if no lines found but text exists
  if (allLines.length === 0 && (data as any).words && (data as any).words.length > 0) {
    console.log('No lines found, falling back to word-level elements');
    allLines.push(...(data as any).words);
  }

  console.log(`OCR complete. Raw text length: ${data.text?.length || 0}`);
  if (data.text?.length > 0) {
    console.log(`Preview: "${data.text.substring(0, 50).replace(/\n/g, ' ')}..."`);
  }
  console.log(`Found ${allLines.length} text elements.`);

  allLines.forEach((line: any, index: number) => {
    const text = line.text.trim();
    if (!text || text.length < 1) return;

    const { x0, y0, x1, y1 } = line.bbox;
    const w = x1 - x0;
    const h = y1 - y0;

    if (w <= 0 || h <= 0) return;

    let bgColor = '#ffffff';
    let fgColor = '#000000';
    try {
      const sx = Math.max(0, x0);
      const sy = Math.max(0, y0);
      const sw = Math.min(canvas.width - sx, w);
      const sh = Math.min(canvas.height - sy, h);
      
      if (sw > 0 && sh > 0) {
        const areaSample = ctx.getImageData(sx, sy, sw, sh);
        const colors = getForegroundBackgroundColors(areaSample);
        bgColor = colors.bg;
        fgColor = colors.fg;
      }
    } catch (e) {
      console.error('OCR color sampling failed:', e);
    }

    elements.push({
      id: `ocr-${index}`,
      text: text,
      bounds: { x: x0, y: y0, width: w, height: h },
      fontSize: h * 0.75,
      foregroundColor: fgColor,
      backgroundColor: bgColor
    });
  });

  URL.revokeObjectURL(imageUrl);
  return {
    elements,
    thumbnailUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height
  };
}

/**
 * Fallback for PDF pages that contain no embedded text (scanned PDFs)
 */
export async function extractScannedPdfPage(canvas: HTMLCanvasElement): Promise<ExtractedTextElement[]> {
  console.log('Starting OCR on PDF canvas...');
  const worker = await createWorker('eng+jpn', 1, {
    workerPath: 'https://unpkg.com/tesseract.js@5.1.1/dist/worker.min.js',
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    corePath: 'https://unpkg.com/tesseract.js-core@5.1.0/tesseract-core.wasm.js',
    logger: m => console.log('[Tesseract PDF]', m),
    errorHandler: e => console.error('[Tesseract PDF Error]', e)
  });

  await (worker as any).setParameters({
    tessedit_pageseg_mode: '11',
  });
  
  const { data } = await worker.recognize(canvas);
  await worker.terminate();

  const elements: ExtractedTextElement[] = [];
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  const allLines: any[] = [];
  if ((data as any).lines && (data as any).lines.length > 0) {
    allLines.push(...(data as any).lines);
  } else if (data.blocks) {
    data.blocks.forEach((block: any) => {
      if (block.paragraphs) {
        block.paragraphs.forEach((para: any) => {
          if (para.lines) allLines.push(...para.lines);
        });
      }
    });
  }
  
  if (allLines.length === 0 && (data as any).words) {
    allLines.push(...(data as any).words);
  }

  console.log(`PDF OCR complete. Raw text length: ${data.text?.length || 0}`);
  console.log(`Found ${allLines.length} text elements.`);

  allLines.forEach((line: any, index: number) => {
    const text = line.text.trim();
    if (!text || text.length < 1) return;

    const { x0, y0, x1, y1 } = line.bbox;
    const w = x1 - x0;
    const h = y1 - y0;

    let bgColor = '#ffffff';
    let fgColor = '#000000';
    try {
      const sx = Math.max(0, x0);
      const sy = Math.max(0, y0);
      const sw = Math.min(canvas.width - sx, w);
      const sh = Math.min(canvas.height - sy, h);
      if (sw > 0 && sh > 0) {
        const areaSample = ctx.getImageData(sx, sy, sw, sh);
        const colors = getForegroundBackgroundColors(areaSample);
        bgColor = colors.bg;
        fgColor = colors.fg;
      }
    } catch (e) {}

    elements.push({
      id: `pdf-ocr-${index}`,
      text: text,
      bounds: { x: x0, y: y0, width: w, height: h },
      fontSize: h * 0.75,
      foregroundColor: fgColor,
      backgroundColor: bgColor
    });
  });

  return elements;
}
