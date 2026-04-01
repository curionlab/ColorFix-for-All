import React, { useRef, useEffect, useState } from 'react';
import type { ExtractedTextElement, Issue, Recommendation } from '../types';
import { simulateCVD, parseHex } from '@colorfix/color-engine';

interface PdfOverlayCanvasProps {
  imageUrl: string;
  originalWidth: number;
  originalHeight: number;
  elements: ExtractedTextElement[];
  issues: Issue[];
  recommendations: Recommendation[];
  selectedElementId: string | null;
  onSelectElement: (id: string) => void;
  previewSource?: 'original' | 'recommended';
  cvdSimulation?: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  customResultsMap?: Record<string, { fg: string, bg: string }>;
  showOverlays?: boolean;
  zoomScale?: number;
}

export default function PdfOverlayCanvas({
  imageUrl,
  originalWidth,
  originalHeight,
  elements,
  issues,
  recommendations,
  selectedElementId,
  onSelectElement,
  previewSource = 'original',
  cvdSimulation = 'none',
  customResultsMap = {},
  showOverlays = true,
  zoomScale = 1.0
}: PdfOverlayCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeDetectorRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [simulatedImageUrl, setSimulatedImageUrl] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Auto-fit scale logic
  useEffect(() => {
    if (!sizeDetectorRef.current) return;
    
    const updateScale = (width: number, height: number) => {
      if (!width || !height) return;
      
      const padding = 64;
      const availW = Math.max(100, width - padding);
      const availH = Math.max(100, height - padding);
      
      const sw = availW / originalWidth;
      const sh = availH / originalHeight;
      
      let ns = Math.min(sw, sh);
      if (ns > 2.0) ns = 2.0;
      if (ns < 0.05) ns = 0.05;
      
      setScale(ns);
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        updateScale(entry.contentRect.width, entry.contentRect.height);
      }
    });

    observer.observe(sizeDetectorRef.current);
    return () => observer.disconnect();
  }, [originalWidth, originalHeight]);

  // Effect to generate simulated image
  useEffect(() => {
    // If no simulation and original source, just use the original image
    if (previewSource === 'original' && cvdSimulation === 'none') {
      setSimulatedImageUrl(null);
      return;
    }

    let isCancelled = false;
    const processSimulation = async () => {
      setIsSimulating(true);
      try {
        const img = new Image();
        img.src = imageUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        if (isCancelled) return;

        const iWidth = Math.floor(originalWidth);
        const iHeight = Math.floor(originalHeight);

        const canvas = document.createElement('canvas');
        canvas.width = iWidth;
        canvas.height = iHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0, iWidth, iHeight);

        const imageData = ctx.getImageData(0, 0, iWidth, iHeight);
        const { data, width: dataW, height: dataH } = imageData;
        
        // 1. Apply "Recommended" color replacement if requested
        if (previewSource === 'recommended') {
          elements.forEach(el => {
            const recommendation = recommendations.find(r => r.issueId === `issue-${el.id}`);
            if (!recommendation) return;

            const customPair = customResultsMap[el.id];
            const targetFgHex = customPair?.fg || recommendation.suggestedFg;
            const targetBgHex = customPair?.bg || recommendation.suggestedBg;
            
            const targetFg = parseHex(targetFgHex);
            const targetBg = parseHex(targetBgHex);
            const originalFg = parseHex(recommendation.originalFg);
            const originalBg = parseHex(recommendation.originalBg);
            
            if (!targetFg || !targetBg || !originalFg || !originalBg) return;

            const vR = originalFg.r - originalBg.r;
            const vG = originalFg.g - originalBg.g;
            const vB = originalFg.b - originalBg.b;
            const vLenSq = vR*vR + vG*vG + vB*vB;
            if (vLenSq < 10) return;

            const margin = 4;
            const startX = Math.max(0, Math.floor(el.bounds.x - margin));
            const startY = Math.max(0, Math.floor(el.bounds.y - margin));
            const endX = Math.min(dataW, Math.ceil(el.bounds.x + el.bounds.width + margin));
            const endY = Math.min(dataH, Math.ceil(el.bounds.y + el.bounds.height + margin));

            for (let y = startY; y < endY; y++) {
              for (let x = startX; x < endX; x++) {
                const i = (y * dataW + x) * 4;
                const r = data[i];
                const g = data[i+1];
                const b = data[i+2];

                if (r === undefined) continue;

                const dFgSq = (r - originalFg.r)**2 + (g - originalFg.g)**2 + (b - originalFg.b)**2;
                const dBgSq = (r - originalBg.r)**2 + (g - originalBg.g)**2 + (b - originalBg.b)**2;

                // Process pixels that are reasonably close to either the foreground or background color
                if (dFgSq < 4000 || dBgSq < 4000 || dFgSq < dBgSq) { 
                  // Interpolation factor t (0 = background, 1 = foreground)
                  const pR = r - originalBg.r;
                  const pG = g - originalBg.g;
                  const pB = b - originalBg.b;
                  let t = (pR*vR + pG*vG + pB*vB) / vLenSq;
                  t = Math.max(0, Math.min(1, t));
                  
                  // If much closer to FG, snap to 1.0; if much closer to BG, snap to 0
                  if (dFgSq < 800) t = 1.0;
                  if (dBgSq < 800) t = 0.0;

                  // Move current pixel to the new color range (targetBg to targetFg)
                  data[i] = Math.round(t * targetFg.r + (1 - t) * targetBg.r);
                  data[i+1] = Math.round(t * targetFg.g + (1 - t) * targetBg.g);
                  data[i+2] = Math.round(t * targetFg.b + (1 - t) * targetBg.b);
                }
              }
            }
          });
        }

        // 2. Apply CVD Simulation if requested
        if (cvdSimulation !== 'none') {
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            const simulated = simulateCVD({ r, g, b }, cvdSimulation as any);
            data[i] = simulated.r;
            data[i+1] = simulated.g;
            data[i+2] = simulated.b;
          }
        }

        ctx.putImageData(imageData, 0, 0);

        if (isCancelled) return;
        setSimulatedImageUrl(canvas.toDataURL('image/png'));
      } catch (err) {
        console.error('Simulation error:', err);
      } finally {
        if (!isCancelled) setIsSimulating(false);
      }
    };

    processSimulation();
    return () => { isCancelled = true; };
  }, [imageUrl, previewSource, cvdSimulation, originalWidth, originalHeight, recommendations, customResultsMap, elements, issues]);

  const finalImageUrl = simulatedImageUrl || imageUrl;
  // Use both the global simulation state AND the manual toggle
  const actualShowOverlays = showOverlays && cvdSimulation === 'none';
  const effectiveScale = scale * zoomScale;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Invisible detector that fills parent but doesn't scroll */}
      <div ref={sizeDetectorRef} className="absolute inset-0 pointer-events-none invisible" />
      
      {/* Scrollable layer for the content */}
      <div className="absolute inset-0 overflow-auto p-4 lg:p-8 flex items-start justify-center">
        <div 
          ref={containerRef} 
          className="relative shadow-xl outline outline-1 outline-slate-300 transform-gpu shrink-0 m-auto"
          style={{
            width: originalWidth * effectiveScale,
            height: originalHeight * effectiveScale,
            backgroundImage: `url(${finalImageUrl})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* Loading overlay for simulation */}
          {isSimulating && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-[1px] z-50">
              <div className="text-xs font-bold text-slate-600 bg-white/80 px-4 py-2 rounded-full shadow-lg border border-slate-100 animate-pulse">
                プレビュー生成中...
              </div>
            </div>
          )}
 
          {/* Overlay boxes */}
          {actualShowOverlays && elements.map((el) => {
            const isIssue = issues.some(i => i.elementId === el.id);
            const isSelected = selectedElementId === el.id;
            
            let boxClass = "absolute cursor-pointer border-2 rounded-[1px] ";
            
            if (isSelected) {
              boxClass += "border-blue-500 bg-transparent z-20 shadow-[0_0_8px_rgba(59,130,246,0.5)] ";
            } else if (isIssue) {
              boxClass += "border-red-400/80 bg-transparent hover:border-red-500 hover:bg-red-500/5 z-10 ";
            } else {
              boxClass += "border-transparent hover:border-emerald-400 hover:bg-emerald-400/5 z-0 ";
            }
 
            return (
              <div
                key={el.id}
                onClick={() => onSelectElement(el.id)}
                className={boxClass}
                title={el.text}
                style={{
                  left: el.bounds.x * effectiveScale,
                  top: el.bounds.y * effectiveScale,
                  width: el.bounds.width * effectiveScale,
                  height: el.bounds.height * effectiveScale,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
