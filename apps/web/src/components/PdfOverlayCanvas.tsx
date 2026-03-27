import React, { useRef, useEffect, useState } from 'react';
import type { ExtractedTextElement, Issue } from '../types';

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

  // Auto-fit scale logic
  useEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      const container = containerRef.current?.parentElement;
      if (!container) return;
      
      const padding = 64; // arbitrary padding
      const maxW = container.clientWidth - padding;
      
      let newScale = maxW / originalWidth;
      if (newScale > 1.5) newScale = 1.5; // cap max zoom
      
      setScale(newScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [originalWidth]);

  const showOverlays = cvdType === 'none';

  return (
    <div className="relative">
      {/* SVG Filters for CVD simulation */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true" focusable="false">
        <defs>
          <filter id="protanopia-filter">
            <feColorMatrix
              type="matrix"
              values="0.567, 0.433, 0, 0, 0, 0.558, 0.442, 0, 0, 0, 0, 0.242, 0.758, 0, 0, 0, 0, 0, 1, 0"
            />
          </filter>
          <filter id="deuteranopia-filter">
            <feColorMatrix
              type="matrix"
              values="0.625, 0.375, 0, 0, 0, 0.7, 0.3, 0, 0, 0, 0, 0.3, 0.7, 0, 0, 0, 0, 0, 1, 0"
            />
          </filter>
          <filter id="tritanopia-filter">
            <feColorMatrix
              type="matrix"
              values="0.95, 0.05, 0, 0, 0, 0, 0.433, 0.567, 0, 0, 0, 0.475, 0.525, 0, 0, 0, 0, 0, 1, 0"
            />
          </filter>
        </defs>
      </svg>

      <div 
        ref={containerRef} 
        className="relative shadow-xl outline outline-1 outline-slate-300 transition-all duration-300"
        style={{
          width: originalWidth * scale,
          height: originalHeight * scale,
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          filter: cvdType === 'none' ? 'none' : `url(#${cvdType}-filter)`
        }}
      >
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
