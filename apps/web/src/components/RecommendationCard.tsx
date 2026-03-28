import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { ExtractedTextElement, Issue, Recommendation } from '../types';
import { checkWcagCompliance, checkIsoCompliance, parseHex, simulateCVD } from '@colorfix/color-engine';
import { ArrowRight, Copy, CheckCircle2, AlertTriangle, Sliders, RefreshCw, Eye, Info } from 'lucide-react';

interface RecommendationCardProps {
  element: ExtractedTextElement;
  issue: Issue;
  recommendation: Recommendation;
  onAdjust?: (elementId: string, customFg: string) => void;
}

function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

export default function RecommendationCard({ element, issue, recommendation, onAdjust }: RecommendationCardProps) {
  const fg = recommendation.originalFg;
  const bg = recommendation.originalBg;
  const fixedFg = recommendation.suggestedFg;

  // --- UI States ---
  const [customFg, setCustomFg] = useState(fixedFg);
  const [hexInput, setHexInput] = useState(fixedFg);
  const [liveWcag, setLiveWcag] = useState<ReturnType<typeof checkWcagCompliance> | null>(null);
  const [liveIso, setLiveIso] = useState<ReturnType<typeof checkIsoCompliance> | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // --- CVD Simulation (computed from customFg and bg) ---
  const cvdSimulations = useMemo(() => {
    const parsedBg = parseHex(bg);
    const parsedFg = parseHex(customFg);
    if (!parsedBg || !parsedFg) return null;
    const toHex = (c: { r: number; g: number; b: number }) =>
      '#' + [c.r, c.g, c.b].map(v => v.toString(16).padStart(2, '0')).join('');
    return [
      { label: '正常視', key: 'normal', fg: customFg, bg },
      { label: 'P型（プロタノピア）', key: 'prot', fg: toHex(simulateCVD(parsedFg, 'protanopia')), bg: toHex(simulateCVD(parsedBg, 'protanopia')) },
      { label: 'D型（デュータノピア）', key: 'deut', fg: toHex(simulateCVD(parsedFg, 'deuteranopia')), bg: toHex(simulateCVD(parsedBg, 'deuteranopia')) },
      { label: 'T型（トリタノピア）', key: 'trit', fg: toHex(simulateCVD(parsedFg, 'tritanopia')), bg: toHex(simulateCVD(parsedBg, 'tritanopia')) },
    ];
  }, [customFg, bg]);

  // Recompute live metrics whenever the custom color changes
  const recomputeMetrics = useCallback((hex: string) => {
    const parsedBg = parseHex(bg);
    const parsedFg = parseHex(hex);
    if (!parsedBg || !parsedFg) return;
    setLiveWcag(checkWcagCompliance(parsedFg, parsedBg));
    setLiveIso(checkIsoCompliance(parsedFg, parsedBg));
  }, [bg]);

  // Initialize metrics on mount and whenever fixedFg changes
  useEffect(() => {
    setCustomFg(fixedFg);
    setHexInput(fixedFg);
    recomputeMetrics(fixedFg);
  }, [fixedFg, recomputeMetrics]);

  // Handle color picker changes
  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setCustomFg(hex);
    setHexInput(hex);
    recomputeMetrics(hex);
    onAdjust?.(element.id, hex);
  };

  // Handle hex text input changes
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    const normalized = val.startsWith('#') ? val : '#' + val;
    if (isValidHex(normalized)) {
      setCustomFg(normalized);
      recomputeMetrics(normalized);
      onAdjust?.(element.id, normalized);
    }
  };

  const handleReset = () => {
    setCustomFg(fixedFg);
    setHexInput(fixedFg);
    recomputeMetrics(fixedFg);
    onAdjust?.(element.id, fixedFg);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(customFg);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const isModified = customFg.toLowerCase() !== fixedFg.toLowerCase();
  const passesAll = !!(liveWcag?.passesAA && liveIso?.passesIso24505);

  return (
    <div className="border border-red-200 rounded-xl bg-white overflow-hidden flex flex-col">
      <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="text-red-800 font-bold">読みにくいテキスト</span>
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
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 uppercase font-mono">
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
                backgroundColor: bg,
                borderColor: passesAll ? '#6ee7b7' : '#fca5a5',
                boxShadow: `0 0 0 2px ${passesAll ? '#d1fae5' : '#fee2e2'}`,
              }}
            >
              <span style={{ color: customFg }} className="font-bold text-xl leading-none drop-shadow-sm truncate px-1 max-w-full">
                {element.text.trim().substring(0, 4) || 'あAa'}
              </span>
            </div>
            <div className="flex justify-between text-[10px] mt-1 uppercase font-mono">
              <span className="font-bold px-1 rounded" style={{ color: passesAll ? '#059669' : '#92400e', background: passesAll ? '#d1fae5' : '#fef3c7' }}>
                FG: {customFg}
              </span>
              <span className="text-slate-500">BG: {bg}</span>
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className="text-sm text-slate-600 leading-relaxed border-l-2 border-emerald-400 pl-3">
          {recommendation.reason}
        </div>

        {/* ─── Manual Adjustment Section ─── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
          <button
            onClick={() => setShowAdjustment(!showAdjustment)}
            className="w-full px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between hover:bg-slate-200 transition-colors"
          >
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> 文字色を手動調整
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
            <div className="p-3 flex flex-col gap-3 transition-all animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-3">
                <label className="relative cursor-pointer flex-shrink-0">
                  <div
                    className="w-10 h-10 rounded-lg border-2 border-white shadow-md ring-1 ring-slate-200 transition-transform hover:scale-105"
                    style={{ backgroundColor: customFg }}
                  />
                  <input
                    type="color"
                    value={customFg}
                    onChange={handlePickerChange}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                </label>
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">#</span>
                  <input
                    type="text"
                    value={hexInput.replace(/^#/, '')}
                    onChange={handleHexInputChange}
                    maxLength={6}
                    placeholder="例: 1a5c2f"
                    className="w-full font-mono text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 uppercase"
                  />
                </div>
              </div>

              {liveWcag && liveIso && (
                <div className="font-mono text-[10px] flex flex-col gap-1 bg-white border border-slate-100 rounded-lg p-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">WCAGコントラスト比</span>
                    <span className={`font-bold ${liveWcag.passesAA ? 'text-emerald-600' : 'text-red-500'}`}>
                      {liveWcag.ratio.toFixed(2)} : 1 {liveWcag.passesAA ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">P/D型(赤緑) 推定ΔE₀₀</span>
                    <span className={`font-bold ${liveIso.deltaE_PD >= 18 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {liveIso.deltaE_PD.toFixed(1)} {liveIso.deltaE_PD >= 18 ? '✓' : '✗'} (目標 18)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">T型(青黄) 推定ΔE₀₀</span>
                    <span className={`font-bold ${liveIso.deltaE_T >= 18 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {liveIso.deltaE_T.toFixed(1)} {liveIso.deltaE_T >= 18 ? '✓' : '✗'} (目標 18)
                    </span>
                  </div>
                  <div className={`mt-1 pt-1 border-t border-slate-100 flex items-center justify-center gap-1 font-bold text-[11px] ${passesAll ? 'text-emerald-600' : 'text-red-500'}`}>
                    {passesAll ? '✓ 識別基準をクリア' : '✗ 基準未達'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── CVD Simulation Preview ─── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
          <button
            onClick={() => setShowSimulation(!showSimulation)}
            className="w-full px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between hover:bg-slate-200 transition-colors"
          >
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> 見え方のシミュレーション
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {showSimulation ? '閉じる' : '表示する'}
            </span>
          </button>

          {showSimulation && cvdSimulations && (
            <div className="p-3 grid grid-cols-2 gap-2 bg-white animate-in fade-in slide-in-from-top-1">
              {cvdSimulations.map((sim) => (
                <div key={sim.key} className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-500 truncate">{sim.label}</span>
                  <div className="h-10 rounded border shadow-sm flex items-center justify-center p-1 overflow-hidden" style={{ backgroundColor: sim.bg }}>
                    <span style={{ color: sim.fg }} className="font-bold text-sm leading-none drop-shadow-sm truncate">
                      {element.text.trim().substring(0, 4) || 'あAa'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Details Section ─── */}
        {issue.metrics && (
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
              <div className="px-3 py-3 border-t flex flex-col gap-5 font-mono text-[11px] overflow-y-auto max-h-[250px] shadow-inner bg-white animate-in fade-in slide-in-from-top-1">
                <div>
                  <h4 className="font-bold text-slate-500 mb-2 border-b pb-1 flex justify-between">
                    <span>▼ 現状の判定</span>
                    {issue.metrics.passesWcagAA && issue.metrics.passesIso24505 ? <span className="text-green-500">PASS</span> : <span className="text-red-500">FAIL</span>}
                  </h4>
                  <div className="text-[14px] flex justify-between items-center text-slate-600">
                    <span>WCAG 比:</span>
                    <span>{issue.metrics.contrastRatio?.toFixed(2)} : 1</span>
                  </div>
                  {issue.metrics.isoDetails && (
                    <div className="mt-2 text-[14px] flex flex-col gap-1 text-slate-500">
                      <div className="flex justify-between">
                        <span>P/D型ΔE₀₀:</span>
                        <span className={issue.metrics.isoDetails.deltaE_PD >= 18.0 ? "text-emerald-600" : "text-red-500"}>
                          {issue.metrics.isoDetails.deltaE_PD?.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>T型ΔE₀₀:</span>
                        <span className={issue.metrics.isoDetails.deltaE_T >= 18.0 ? "text-emerald-600" : "text-red-500"}>
                          {issue.metrics.isoDetails.deltaE_T?.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {(() => {
                  const parsedBg = parseHex(bg);
                  const parsedNewFg = parseHex(fixedFg);
                  if (!parsedBg || !parsedNewFg) return null;
                  const newWcag = checkWcagCompliance(parsedNewFg, parsedBg);
                  const newIso = checkIsoCompliance(parsedNewFg, parsedBg);
                  return (
                    <div>
                      <h4 className="font-bold text-emerald-600 mb-2 border-b border-emerald-100 pb-1 flex justify-between">
                        <span>▼ 修正後の判定 (提案色)</span>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </h4>
                      <div className="text-[14px] flex justify-between items-center">
                        <span>WCAG 比:</span>
                        <span className="font-bold">{newWcag.ratio?.toFixed(2)} : 1</span>
                      </div>
                      <div className="mt-2 text-[14px] flex flex-col gap-1">
                        <div className="flex justify-between">
                          <span>P/D型ΔE₀₀:</span>
                          <span className="font-bold text-emerald-600">{newIso.deltaE_PD?.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>T型ΔE₀₀:</span>
                          <span className="font-bold text-emerald-600">{newIso.deltaE_T?.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleCopy}
          className={`mt-2 w-full flex items-center justify-center gap-2 text-white py-2.5 rounded-lg text-sm font-bold transition-all shadow focus:ring-4 ${passesAll
            ? 'bg-emerald-700 hover:bg-emerald-800 focus:ring-emerald-100'
            : 'bg-slate-700 hover:bg-slate-800 focus:ring-slate-100'
            }`}
        >
          {copied
            ? <><CheckCircle2 className="w-4 h-4" /> コピー完了</>
            : <><Copy className="w-4 h-4" /> {isModified ? '調整色' : '提案色'} ({customFg}) をコピー</>
          }
        </button>
      </div>
    </div>
  );
}
