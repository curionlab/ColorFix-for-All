import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { ExtractedTextElement, Issue, Recommendation } from '../types';
import { checkWcagCompliance, checkIsoCompliance, parseHex, simulateCVD } from '@colorfix/color-engine';
import { ArrowRight, Copy, CheckCircle2, AlertTriangle, Sliders, RefreshCw, Eye, Info } from 'lucide-react';

interface RecommendationCardProps {
  element: ExtractedTextElement;
  issue: Issue;
  recommendation: Recommendation;
  onAdjust?: (elementId: string, fg: string, bg: string) => void;
}

function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

export default function RecommendationCard({ element, issue, recommendation, onAdjust }: RecommendationCardProps) {
  const fg = recommendation.originalFg;
  const bg = recommendation.originalBg;
  const fixedFg = recommendation.suggestedFg;
  const fixedBg = recommendation.suggestedBg;

  // --- UI States ---
  const [customFg, setCustomFg] = useState(fixedFg);
  const [customBg, setCustomBg] = useState(fixedBg);
  const [fgHexInput, setFgHexInput] = useState(fixedFg);
  const [bgHexInput, setBgHexInput] = useState(fixedBg);
  
  const [liveWcag, setLiveWcag] = useState<ReturnType<typeof checkWcagCompliance> | null>(null);
  const [liveIso, setLiveIso] = useState<ReturnType<typeof checkIsoCompliance> | null>(null);
  
  const [copied, setCopied] = useState<'fg' | 'bg' | 'both' | null>(null);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // --- CVD Simulation (computed from customFg and customBg) ---
  const cvdSimulations = useMemo(() => {
    const parsedBg = parseHex(customBg);
    const parsedFg = parseHex(customFg);
    if (!parsedBg || !parsedFg) return null;
    const toHex = (c: { r: number; g: number; b: number }) =>
      '#' + [c.r, c.g, c.b].map(v => v.toString(16).padStart(2, '0')).join('');
    return [
      { label: '正常視', key: 'normal', fg: customFg, bg: customBg },
      { label: 'P型（プロタノピア）', key: 'prot', fg: toHex(simulateCVD(parsedFg, 'protanopia')), bg: toHex(simulateCVD(parsedBg, 'protanopia')) },
      { label: 'D型（デュータノピア）', key: 'deut', fg: toHex(simulateCVD(parsedFg, 'deuteranopia')), bg: toHex(simulateCVD(parsedBg, 'deuteranopia')) },
      { label: 'T型（トリタノピア）', key: 'trit', fg: toHex(simulateCVD(parsedFg, 'tritanopia')), bg: toHex(simulateCVD(parsedBg, 'tritanopia')) },
    ];
  }, [customFg, customBg]);

  // Recompute live metrics whenever colors change
  const recomputeMetrics = useCallback((fgHex: string, bgHex: string) => {
    const pBg = parseHex(bgHex);
    const pFg = parseHex(fgHex);
    if (!pBg || !pFg) return;
    setLiveWcag(checkWcagCompliance(pFg, pBg));
    setLiveIso(checkIsoCompliance(pFg, pBg));
  }, []);

  // Initialize on mount and when recommendation changes
  useEffect(() => {
    setCustomFg(fixedFg);
    setFgHexInput(fixedFg);
    setCustomBg(fixedBg);
    setBgHexInput(fixedBg);
    recomputeMetrics(fixedFg, fixedBg);
  }, [fixedFg, fixedBg, recomputeMetrics]);

  const handleFgChange = (hex: string) => {
    setCustomFg(hex);
    setFgHexInput(hex);
    recomputeMetrics(hex, customBg);
    onAdjust?.(element.id, hex, customBg);
  };

  const handleBgChange = (hex: string) => {
    setCustomBg(hex);
    setBgHexInput(hex);
    recomputeMetrics(customFg, hex);
    onAdjust?.(element.id, customFg, hex);
  };

  const handleReset = () => {
    setCustomFg(fixedFg);
    setFgHexInput(fixedFg);
    setCustomBg(fixedBg);
    setBgHexInput(fixedBg);
    recomputeMetrics(fixedFg, fixedBg);
    onAdjust?.(element.id, fixedFg, fixedBg);
  };

  const handleCopyFg = () => {
    navigator.clipboard.writeText(customFg);
    setCopied('fg');
    setTimeout(() => setCopied(null), 1800);
  };

  const isModified = customFg.toLowerCase() !== fixedFg.toLowerCase() || customBg.toLowerCase() !== fixedBg.toLowerCase();
  const passesAll = !!(liveWcag?.passesAA && liveIso?.passesIso24505);

  return (
    <div className="border border-red-200 rounded-xl bg-white overflow-hidden flex flex-col">
      <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="text-red-800 font-bold">視認性の最適化案</span>
        </div>
        <div className="flex gap-2">
          {issue.metrics && !issue.metrics.passesWcagAA && <span className="bg-red-200 text-red-800 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">WCAG AA 違反</span>}
          {issue.metrics && !issue.metrics.passesIso24505 && <span className="bg-red-200 text-red-800 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">識別性の欠如 (CVD)</span>}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Target text preview */}
        <div className="bg-slate-50 p-3 rounded-lg border text-sm font-mono whitespace-nowrap overflow-hidden text-ellipsis shadow-inner text-slate-700">
          "{element.text}"
        </div>

        {/* Before/After swatches */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">現状の色</span>
            <div className="h-16 rounded-md border shadow-sm flex items-center justify-center p-2" style={{ backgroundColor: bg }}>
              <span style={{ color: fg }} className="font-bold text-xl leading-none drop-shadow-sm truncate px-1 max-w-full">
                {element.text.trim().substring(0, 4) || 'あAa'}
              </span>
            </div>
            <div className="flex flex-col text-[10px] text-slate-500 mt-1 uppercase font-mono leading-tight">
              <span>FG: {fg}</span>
              <span>BG: {bg}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1 relative">
            <div className="absolute top-1/2 -left-3 -translate-y-1/2 bg-white rounded-full p-0.5 shadow-sm border z-10">
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-1" style={{ color: passesAll ? '#059669' : '#b45309' }}>
              {passesAll ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              {passesAll ? '基準クリア' : '基準未達'}
            </span>
            <div
              className="h-16 rounded-md border-2 ring-2 ring-offset-1 shadow-sm flex items-center justify-center p-2 overflow-hidden transition-all"
              style={{
                backgroundColor: customBg,
                borderColor: passesAll ? '#6ee7b7' : '#fca5a5',
                boxShadow: `0 0 0 2px ${passesAll ? '#d1fae5' : '#fee2e2'}`,
              }}
            >
              <span style={{ color: customFg }} className="font-bold text-xl leading-none drop-shadow-sm truncate px-1 max-w-full">
                {element.text.trim().substring(0, 4) || 'あAa'}
              </span>
            </div>
            <div className="flex flex-col text-[10px] mt-1 uppercase font-mono leading-tight">
              <span className="font-bold rounded w-fit px-1" style={{ color: passesAll ? '#059669' : '#92400e', background: passesAll ? '#d1fae5' : '#fef3c7' }}>
                FG: {customFg}
              </span>
              <span className={`rounded w-fit px-1 ${customBg.toLowerCase() !== bg.toLowerCase() ? 'font-bold bg-amber-100 text-amber-800' : 'text-slate-500'}`}>
                BG: {customBg}
              </span>
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className="text-sm text-slate-600 leading-relaxed border-l-2 border-emerald-400 pl-3">
          {recommendation.reason}
        </div>

        {/* ─── Details Section ─── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between hover:bg-slate-200 transition-colors"
          >
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> 詳細・計算値 (変更前後)
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {showDetails ? '閉じる' : '表示する'}
            </span>
          </button>

          {showDetails && (
            <div className="p-3 bg-white flex flex-col gap-5 font-mono text-[11px] animate-in fade-in slide-in-from-top-1">
              {/* Original Metrics */}
              {(() => {
                const pBg = parseHex(bg);
                const pFg = parseHex(fg);
                if (!pBg || !pFg) return null;
                const oWcag = checkWcagCompliance(pFg, pBg);
                const oIso = checkIsoCompliance(pFg, pBg);
                const passes = oWcag.passesAA && oIso.passesIso24505;
                return (
                  <div>
                    <h4 className="font-bold text-slate-500 mb-2 border-b pb-1 flex justify-between">
                      <span>▼ 現状の判定</span>
                      <span className={passes ? "text-emerald-600" : "text-red-500"}>{passes ? 'PASS' : 'FAIL'}</span>
                    </h4>
                    <div className="flex flex-col gap-1 text-slate-600">
                      <div className="flex justify-between items-center text-xs">
                        <span>WCAG 比:</span>
                        <span className="font-bold">{oWcag.ratio.toFixed(2)} : 1</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>P/D型 ΔE₀₀:</span>
                        <span className={oIso.deltaE_PD >= 18 ? "text-emerald-600" : "text-red-400"}>{oIso.deltaE_PD.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>T型 ΔE₀₀:</span>
                        <span className={oIso.deltaE_T >= 18 ? "text-emerald-600" : "text-red-400"}>{oIso.deltaE_T.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Adjusted Metrics */}
              {liveWcag && liveIso && (
                <div>
                  <h4 className="font-bold text-emerald-600 mb-2 border-b border-emerald-100 pb-1 flex justify-between">
                    <span>▼ 調整後の判定</span>
                    <CheckCircle2 className="w-3 h-3" />
                  </h4>
                  <div className="flex flex-col gap-1 text-slate-800">
                    <div className="flex justify-between items-center text-xs">
                      <span>WCAG 比:</span>
                      <span className="font-bold text-emerald-600">{liveWcag.ratio.toFixed(2)} : 1</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>P/D型 ΔE₀₀:</span>
                      <span className="font-bold text-emerald-600">{liveIso.deltaE_PD.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>T型 ΔE₀₀:</span>
                      <span className="font-bold text-emerald-600">{liveIso.deltaE_T.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Manual Adjustment Section ─── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
          <button
            onClick={() => setShowAdjustment(!showAdjustment)}
            className="w-full px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between hover:bg-slate-200 transition-colors"
          >
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> 手動調整 (FG & BG)
            </span>
            <div className="flex items-center gap-3">
              {isModified && (
                <span onClick={(e) => { e.stopPropagation(); handleReset(); }} className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 hover:text-emerald-700 cursor-pointer">
                  <RefreshCw className="w-2.5 h-2.5" /> リセット
                </span>
              )}
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {showAdjustment ? '閉じる' : '表示する'}
              </span>
            </div>
          </button>

          {showAdjustment && (
            <div className="p-3 flex flex-col gap-4 animate-in fade-in slide-in-from-top-1">
              {/* FG Adjust */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">文字色 (FG)</span>
                <div className="flex items-center gap-2">
                  <input type="color" value={customFg} onChange={(e) => handleFgChange(e.target.value)} className="w-8 h-8 rounded border-none cursor-pointer" />
                  <input 
                    type="text" 
                    value={fgHexInput.replace('#','')} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setFgHexInput(val);
                      const norm = val.startsWith('#') ? val : '#'+val;
                      if(isValidHex(norm)) handleFgChange(norm);
                    }}
                    className="flex-1 font-mono text-xs border rounded px-2 py-1 uppercase"
                  />
                </div>
              </div>
              {/* BG Adjust */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">背景色 (BG)</span>
                <div className="flex items-center gap-2">
                  <input type="color" value={customBg} onChange={(e) => handleBgChange(e.target.value)} className="w-8 h-8 rounded border-none cursor-pointer" />
                  <input 
                    type="text" 
                    value={bgHexInput.replace('#','')} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setBgHexInput(val);
                      const norm = val.startsWith('#') ? val : '#'+val;
                      if(isValidHex(norm)) handleBgChange(norm);
                    }}
                    className="flex-1 font-mono text-xs border rounded px-2 py-1 uppercase"
                  />
                </div>
              </div>

              {liveWcag && liveIso && (
                <div className="font-mono text-[10px] flex flex-col gap-1 bg-white border border-slate-100 rounded-lg p-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">WCAG</span>
                    <span className={`font-bold ${liveWcag.passesAA ? 'text-emerald-600' : 'text-red-500'}`}>
                      {liveWcag.ratio.toFixed(2)} : 1 {liveWcag.passesAA ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">P/D型ΔE₀₀</span>
                    <span className={`font-bold ${liveIso.deltaE_PD >= 18 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {liveIso.deltaE_PD.toFixed(1)} {liveIso.deltaE_PD >= 18 ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">T型ΔE₀₀</span>
                    <span className={`font-bold ${liveIso.deltaE_T >= 18 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {liveIso.deltaE_T.toFixed(1)} {liveIso.deltaE_T >= 18 ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── CVD Simulation Preview ─── */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <button onClick={() => setShowSimulation(!showSimulation)} className="w-full px-3 py-2 bg-slate-50 border-b flex items-center justify-between text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> 見え方のシミュレーション</span>
            <span className="text-[10px] text-slate-400 tracking-wider font-bold">{showSimulation ? '閉じる' : '表示する'}</span>
          </button>
          {showSimulation && cvdSimulations && (
            <div className="p-3 grid grid-cols-2 gap-2 animate-in fade-in">
              {cvdSimulations.map((sim) => (
                <div key={sim.key} className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500">{sim.label}</span>
                  <div className="h-10 rounded border flex items-center justify-center p-1" style={{ backgroundColor: sim.bg }}>
                    <span style={{ color: sim.fg }} className="font-bold text-xs truncate">
                      {element.text.trim().substring(0, 4) || 'あAa'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleCopyFg}
          className={`mt-2 w-full flex items-center justify-center gap-2 text-white py-2.5 rounded-lg text-sm font-bold transition-all shadow focus:ring-4 ${
            passesAll ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-slate-700 hover:bg-slate-800'
          }`}
        >
          {copied === 'fg'
            ? <><CheckCircle2 className="w-4 h-4" /> 文字色をコピーしました</>
            : <><Copy className="w-4 h-4" /> 決定した色をコピー</>
          }
        </button>
      </div>
    </div>
  );
}
