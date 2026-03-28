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
  cvdType?: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'recommended';
  customResultsMap?: Record<string, string>;
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
  cvdType = 'none',
  customResultsMap = {}
}: PdfOverlayCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [simulatedImageUrl, setSimulatedImageUrl] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Auto-fit scale logic
  useEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      const container = containerRef.current?.parentElement;
      if (!container) return;
      
      const padding = 64;
      const maxW = container.clientWidth - padding;
      
      let newScale = maxW / originalWidth;
      if (newScale > 1.5) newScale = 1.5;
      
      setScale(newScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [originalWidth]);

  // Effect to generate simulated image
  useEffect(() => {
    if (cvdType === 'none') {
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

        // Use integer dimensions for the canvas to avoid sub-pixel indexing errors
        const iWidth = Math.floor(originalWidth);
        const iHeight = Math.floor(originalHeight);

        const canvas = document.createElement('canvas');
        canvas.width = iWidth;
        canvas.height = iHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        // Ensure image is drawn to fit the integer dimensions
        ctx.drawImage(img, 0, 0, iWidth, iHeight);

        const imageData = ctx.getImageData(0, 0, iWidth, iHeight);
        const { data, width: dataW, height: dataH } = imageData;
        
        if (cvdType === 'recommended') {
          let totalReplaced = 0;
          
          elements.forEach(el => {
            const recommendation = recommendations.find(r => r.issueId === `issue-${el.id}`);
            if (!recommendation) return;

            const customFgHex = customResultsMap[el.id];
            const targetFgHex = customFgHex || recommendation.suggestedFg;
            
            const targetFg = parseHex(targetFgHex);
            const originalFg = parseHex(recommendation.originalFg);
            const originalBg = parseHex(recommendation.originalBg);
            
            if (!targetFg || !originalFg || !originalBg) return;

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

                if (dFgSq < dBgSq || dFgSq < 4000) { 
                  const pR = r - originalBg.r;
                  const pG = g - originalBg.g;
                  const pB = b - originalBg.b;
                  let t = (pR*vR + pG*vG + pB*vB) / vLenSq;
                  if (t < 0) t = 0;
                  if (t > 1) t = 1;

                  if (dFgSq < 800) t = 1.0;

                  data[i] = Math.round(t * targetFg.r + (1 - t) * originalBg.r);
                  data[i+1] = Math.round(t * targetFg.g + (1 - t) * originalBg.g);
                  data[i+2] = Math.round(t * targetFg.b + (1 - t) * originalBg.b);
                  totalReplaced++;
                }
              }
            }
          });
          console.log(`[PdfOverlayCanvas] Replaced ${totalReplaced} pixels in Recommended mode.`);
          ctx.putImageData(imageData, 0, 0);
        } else {
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            const simulated = simulateCVD({ r, g, b }, cvdType as any);
            data[i] = simulated.r;
            data[i+1] = simulated.g;
            data[i+2] = simulated.b;
          }
          ctx.putImageData(imageData, 0, 0);
        }

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
  }, [imageUrl, cvdType, originalWidth, originalHeight, recommendations, customResultsMap, elements, issues]);

  const finalImageUrl = simulatedImageUrl || imageUrl;
  const finalShowOverlays = cvdType === 'none';

  return (
    <div className="relative">
      <div 
        ref={containerRef} 
        className="relative shadow-xl outline outline-1 outline-slate-300 transition-all duration-300"
        style={{
          width: originalWidth * scale,
          height: originalHeight * scale,
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

        {/* Overlay boxes - only show in 'none' mode */}
        {finalShowOverlays && elements.map((el) => {
          const isIssue = issues.some(i => i.elementId === el.id);
          const isSelected = selectedElementId === el.id;
          
          let boxClass = "absolute cursor-pointer transition-all border-2 rounded-[2px] ";
          
          if (isSelected) {
            boxClass += "border-blue-500 bg-blue-500/20 z-20 ";
          } else if (isIssue) {
            boxClass += "border-red-400 bg-red-400/20 hover:bg-red-400/40 z-10 ";
          } else {
            boxClass += "border-transparent hover:border-green-400 hover:bg-green-400/20 z-0 ";
          }

          return (
            <div
              key={el.id}
              onClick={() => onSelectElement(el.id)}
              className={boxClass}
              title={el.text}
              style={{
                left: el.bounds.x * scale,
                top: el.bounds.y * scale,
                width: el.bounds.width * scale,
                height: el.bounds.height * scale,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
