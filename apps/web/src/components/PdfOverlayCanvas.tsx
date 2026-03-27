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
}

export default function PdfOverlayCanvas({
  imageUrl,
  originalWidth,
  originalHeight,
  elements,
  issues,
  selectedElementId,
  onSelectElement
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

  return (
    <div 
      ref={containerRef} 
      className="relative shadow-xl outline outline-1 outline-slate-300"
      style={{
        width: originalWidth * scale,
        height: originalHeight * scale,
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay boxes */}
      {elements.map((el) => {
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
  );
}
