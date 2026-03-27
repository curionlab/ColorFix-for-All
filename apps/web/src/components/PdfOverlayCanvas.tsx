import React, { useRef, useEffect, useState } from 'react';
import type { ExtractedTextElement, Issue } from '../types';
import { simulateCVD } from '@colorfix/color-engine';

interface PdfOverlayCanvasProps {
  imageUrl: string;
  originalWidth: number;
  originalHeight: number;
  elements: ExtractedTextElement[];
  issues: Issue[];
  selectedElementId: string | null;
  onSelectElement: (id: string) => void;
  cvdType?: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

export default function PdfOverlayCanvas({
  imageUrl,
  originalWidth,
  originalHeight,
  elements,
  issues,
  selectedElementId,
  onSelectElement,
  cvdType = 'none'
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

        const canvas = document.createElement('canvas');
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, originalWidth, originalHeight);
        const { data } = imageData;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          
          const simulated = simulateCVD({ r, g, b }, cvdType);
          data[i] = simulated.r;
          data[i+1] = simulated.g;
          data[i+2] = simulated.b;
        }

        if (isCancelled) return;
        ctx.putImageData(imageData, 0, 0);
        setSimulatedImageUrl(canvas.toDataURL('image/png'));
      } catch (err) {
        console.error('Simulation error:', err);
      } finally {
        if (!isCancelled) setIsSimulating(false);
      }
    };

    processSimulation();
    return () => { isCancelled = true; };
  }, [imageUrl, cvdType, originalWidth, originalHeight]);

  const showOverlays = cvdType === 'none';
  const finalImageUrl = simulatedImageUrl || imageUrl;

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
              シミュレーション演算中...
            </div>
          </div>
        )}

        {/* Overlay boxes - only show in 'none' mode */}
        {showOverlays && elements.map((el) => {
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
