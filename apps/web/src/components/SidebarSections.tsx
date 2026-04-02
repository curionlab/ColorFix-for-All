import React from 'react';
import { Info, Sliders, Eye, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { checkWcagCompliance, checkIsoCompliance, parseHex, simulateCVD } from '@colorfix/color-engine';
import type { ExtractedTextElement, Issue, Recommendation } from '../types';

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: React.ReactNode;
}

export function SidebarAccordionSection({ title, icon, isOpen, onToggle, children, badge }: SectionProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col shrink-0">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-slate-500">{icon}</span>
          <span className="text-xs font-bold text-slate-700">{title}</span>
          {badge}
        </div>
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          {isOpen ? '閉じる' : '表示する'}
        </span>
      </button>
      {isOpen && (
        <div className="p-4 border-t border-slate-50 animate-in fade-in slide-in-from-top-1 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

export function MetricDetails({ fw, bg, originalFg, originalBg }: { fw: string; bg: string; originalFg?: string; originalBg?: string }) {
  const pBg = parseHex(bg);
  const pFg = parseHex(fw);
  if (!pBg || !pFg) return null;
  const wcag = checkWcagCompliance(pFg, pBg);
  const iso = checkIsoCompliance(pFg, pBg);

  let originalWcag = null;
  let originalIso = null;
  if (originalFg && originalBg) {
    const opFg = parseHex(originalFg);
    const opBg = parseHex(originalBg);
    if (opFg && opBg) {
      originalWcag = checkWcagCompliance(opFg, opBg);
      originalIso = checkIsoCompliance(opFg, opBg);
    }
  }
  
  return (
    <div className="flex flex-col gap-3 font-mono text-[11px]">
      <div className="flex justify-between items-center border-b border-slate-50 pb-2">
        <span className="text-slate-400 uppercase">WCAG Ratio</span>
        <div className="flex items-center gap-2">
          {originalWcag && (
            <>
              <span className="text-slate-400 line-through decoration-slate-300 opacity-60">
                {originalWcag.ratio.toFixed(2)}
              </span>
              <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
            </>
          )}
          <span className={`font-bold ${wcag.ratio >= 4.5 ? 'text-emerald-600' : 'text-red-500'}`}>
            {wcag.ratio.toFixed(2)} : 1 {wcag.ratio >= 4.5 ? '✓' : '✗'}
          </span>
        </div>
      </div>
      <div className="flex justify-between items-center border-b border-slate-50 pb-2">
        <span className="text-slate-400 uppercase">P/D型 (赤緑) ΔE₀₀</span>
        <div className="flex items-center gap-2">
          {originalIso && (
            <>
              <span className="text-slate-400 line-through decoration-slate-300 opacity-60">
                {originalIso.deltaE_PD.toFixed(1)}
              </span>
              <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
            </>
          )}
          <span className={`font-bold ${iso.deltaE_PD >= 18 ? 'text-emerald-600' : 'text-red-400'}`}>
            {iso.deltaE_PD.toFixed(1)} {iso.deltaE_PD >= 18 ? '✓' : '✗'}
          </span>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-slate-400 uppercase">T型 (青黄) ΔE₀₀</span>
        <div className="flex items-center gap-2">
          {originalIso && (
            <>
              <span className="text-slate-400 line-through decoration-slate-300 opacity-60">
                {originalIso.deltaE_T.toFixed(1)}
              </span>
              <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
            </>
          )}
          <span className={`font-bold ${iso.deltaE_T >= 18 ? 'text-emerald-600' : 'text-red-400'}`}>
            {iso.deltaE_T.toFixed(1)} {iso.deltaE_T >= 18 ? '✓' : '✗'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ColorAdjustmentSection({
  customFg,
  customBg,
  fixedFg,
  fixedBg,
  onFgChange,
  onBgChange,
  onReset
}: {
  customFg: string;
  customBg: string;
  fixedFg: string;
  fixedBg: string;
  onFgChange: (hex: string) => void;
  onBgChange: (hex: string) => void;
  onReset: () => void;
}) {
  const [fgInput, setFgInput] = React.useState(customFg);
  const [bgInput, setBgInput] = React.useState(customBg);

  React.useEffect(() => { setFgInput(customFg); }, [customFg]);
  React.useEffect(() => { setBgInput(customBg); }, [customBg]);

  const isValidHex = (hex: string) => /^#[0-9a-fA-F]{6}$/.test(hex);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">文字色 (FG)</span>
        <div className="flex items-center gap-2">
          <input type="color" value={customFg} onChange={(e) => onFgChange(e.target.value)} className="w-9 h-9 rounded-lg border-none shadow-sm cursor-pointer overflow-hidden p-0" />
          <input 
            type="text" 
            value={fgInput.replace('#','')} 
            onChange={(e) => {
              const val = e.target.value;
              setFgInput(val);
              const norm = val.startsWith('#') ? val : '#'+val;
              if (isValidHex(norm)) onFgChange(norm);
            }}
            className="flex-1 font-mono text-xs border border-slate-200 rounded-lg px-3 py-2 uppercase focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">背景色 (BG)</span>
        <div className="flex items-center gap-2">
          <input type="color" value={customBg} onChange={(e) => onBgChange(e.target.value)} className="w-9 h-9 rounded-lg border-none shadow-sm cursor-pointer overflow-hidden p-0" />
          <input 
            type="text" 
            value={bgInput.replace('#','')} 
            onChange={(e) => {
              const val = e.target.value;
              setBgInput(val);
              const norm = val.startsWith('#') ? val : '#'+val;
              if (isValidHex(norm)) onBgChange(norm);
            }}
            className="flex-1 font-mono text-xs border border-slate-200 rounded-lg px-3 py-2 uppercase focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
          />
        </div>
      </div>
      
      <button 
        onClick={onReset}
        disabled={customFg.toLowerCase() === fixedFg.toLowerCase() && customBg.toLowerCase() === fixedBg.toLowerCase()}
        className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 disabled:opacity-0 disabled:pointer-events-none transition-all"
      >
        <RefreshCw className="w-3 h-3" /> おすすめの状態にリセット
      </button>
    </div>
  );
}

export function SimulationPreview({ fw, bg, text }: { fw: string; bg: string; text: string }) {
  const parsedBg = parseHex(bg);
  const parsedFg = parseHex(fw);
  if (!parsedBg || !parsedFg) return null;
  
  const toHex = (c: { r: number; g: number; b: number }) =>
    '#' + [c.r, c.g, c.b].map(v => v.toString(16).padStart(2, '0')).join('');
    
  const simulations = [
    { label: '正常視', fg: fw, bg: bg },
    { label: 'P型 (プロタノピア)', fg: toHex(simulateCVD(parsedFg, 'protanopia')), bg: toHex(simulateCVD(parsedBg, 'protanopia')) },
    { label: 'D型 (デュータノピア)', fg: toHex(simulateCVD(parsedFg, 'deuteranopia')), bg: toHex(simulateCVD(parsedBg, 'deuteranopia')) },
    { label: 'T型 (トリタノピア)', fg: toHex(simulateCVD(parsedFg, 'tritanopia')), bg: toHex(simulateCVD(parsedBg, 'tritanopia')) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {simulations.map((sim, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{sim.label}</span>
          <div className="h-10 rounded border border-slate-100 flex items-center justify-center p-1 shadow-inner overflow-hidden" style={{ backgroundColor: sim.bg }}>
            <span style={{ color: sim.fg }} className="font-bold text-[10px] truncate px-1">
              {text.trim().substring(0, 8) || 'Aaあ'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
