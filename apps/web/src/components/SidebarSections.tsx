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

  const RenderStatus = ({ pass, value, target }: { pass: boolean, value: string, target?: string }) => (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1.5">
        {pass ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
        )}
        <span className={`text-[13px] font-black ${pass ? 'text-emerald-600' : 'text-rose-600'}`}>
          {value}
        </span>
      </div>
      {target && <span className="text-[8px] text-slate-400 mt-1 uppercase tracking-tighter">基準: {target}</span>}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Table Header */}
      <div className="grid grid-cols-[1fr,85px,85px] gap-2 border-b border-slate-200 pb-2 px-1">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">判定タイプ</div>
        <div className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">変更前</div>
        <div className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">変更後</div>
      </div>

      {/* WCAG Row */}
      <div className="grid grid-cols-[1fr,85px,85px] gap-2 items-center px-1 py-1 border-b border-slate-50">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-slate-700">WCAG 輝度コントラスト</span>
          <span className="text-[9px] text-slate-400">標準視覚における識別性</span>
        </div>
        <div className="text-center">
          {originalWcag ? (
            <RenderStatus pass={originalWcag.passesAA} value={originalWcag.ratio.toFixed(2)} />
          ) : <span className="text-slate-300">-</span>}
        </div>
        <div className="text-center">
          <RenderStatus pass={wcag.passesAA} value={wcag.ratio.toFixed(2)} target="4.5:1" />
        </div>
      </div>

      {/* P Row */}
      <div className="grid grid-cols-[1fr,85px,85px] gap-2 items-center px-1 py-1 border-b border-slate-50">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-slate-700">P型 (プロタノピア)</span>
          <span className="text-[9px] text-slate-400">赤を暗く感じる特性時</span>
        </div>
        <div className="text-center">
          {originalIso ? (
            <RenderStatus pass={originalIso.deltaE_P >= 18} value={originalIso.deltaE_P.toFixed(1)} />
          ) : <span className="text-slate-300">-</span>}
        </div>
        <div className="text-center">
          <RenderStatus pass={iso.deltaE_P >= 18} value={iso.deltaE_P.toFixed(1)} target="ΔE 18" />
        </div>
      </div>

      {/* D Row */}
      <div className="grid grid-cols-[1fr,85px,85px] gap-2 items-center px-1 py-1 border-b border-slate-50">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-slate-700">D型 (デュータノピア)</span>
          <span className="text-[9px] text-slate-400">赤と緑を混同する特性時</span>
        </div>
        <div className="text-center">
          {originalIso ? (
            <RenderStatus pass={originalIso.deltaE_D >= 18} value={originalIso.deltaE_D.toFixed(1)} />
          ) : <span className="text-slate-300">-</span>}
        </div>
        <div className="text-center">
          <RenderStatus pass={iso.deltaE_D >= 18} value={iso.deltaE_D.toFixed(1)} target="ΔE 18" />
        </div>
      </div>

      {/* T Row */}
      <div className="grid grid-cols-[1fr,85px,85px] gap-2 items-center px-1 py-1">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-slate-700">T型 (トリタノピア)</span>
          <span className="text-[9px] text-slate-400">青と黄を混同する特性時</span>
        </div>
        <div className="text-center">
          {originalIso ? (
            <RenderStatus pass={originalIso.deltaE_T >= 18} value={originalIso.deltaE_T.toFixed(1)} />
          ) : <span className="text-slate-300">-</span>}
        </div>
        <div className="text-center">
          <RenderStatus pass={iso.deltaE_T >= 18} value={iso.deltaE_T.toFixed(1)} target="ΔE 18" />
        </div>
      </div>

      <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mb-1">
          <div className="w-1 h-1 rounded-full bg-slate-400"></div> 判定基準
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          標準視覚はWCAG 2.1基準(4.5:1)、各色覚特性はISO 24505-2基準に基づき色彩差(ΔE ≥ 18)で判定しています。
        </p>
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
