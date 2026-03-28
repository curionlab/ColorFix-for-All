import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { ExtractedTextElement, Issue, Recommendation } from '../types';
import { checkWcagCompliance, checkIsoCompliance, parseHex, simulateCVD } from '@colorfix/color-engine';
import { ArrowRight, Copy, CheckCircle2, AlertTriangle, Sliders, RefreshCw, Eye, Download, FileJson, FileSpreadsheet } from 'lucide-react';

interface RecommendationCardProps {
  element: ExtractedTextElement;
  issue: Issue;
  recommendation: Recommendation;
  onAdjust?: (elementId: string, customFg: string) => void;
  onExportJson?: () => void;
  onExportCsv?: () => void;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

export default function RecommendationCard({ element, issue, recommendation, onAdjust, onExportJson, onExportCsv }: RecommendationCardProps) {
  const fg = recommendation.originalFg;
  const bg = recommendation.originalBg;
  const fixedFg = recommendation.suggestedFg;

  // --- Manual Adjustment State ---
  const [customFg, setCustomFg] = useState(fixedFg);
  const [hexInput, setHexInput] = useState(fixedFg);
  const [liveWcag, setLiveWcag] = useState<ReturnType<typeof checkWcagCompliance> | null>(null);
  const [liveIso, setLiveIso] = useState<ReturnType<typeof checkIsoCompliance> | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);

  // --- CVD Simulation (computed from customFg and bg) ---
  const cvdSimulations = useMemo(() => {
    const parsedBg = parseHex(bg);
    const parsedFg = parseHex(customFg);
    if (!parsedBg || !parsedFg) return null;
    const toHex = (c: { r: number; g: number; b: number }) =>
      '#' + [c.r, c.g, c.b].map(v => v.toString(16).padStart(2, '0')).join('');
    const sims = [
      { label: '正常視', key: 'normal', fg: customFg, bg },
      { label: 'P型（プロタノピア）', key: 'prot', fg: toHex(simulateCVD(parsedFg, 'protanopia')), bg: toHex(simulateCVD(parsedBg, 'protanopia')) },
      { label: 'D型（デュータノピア）', key: 'deut', fg: toHex(simulateCVD(parsedFg, 'deuteranopia')), bg: toHex(simulateCVD(parsedBg, 'deuteranopia')) },
      { label: 'T型（トリタノピア）', key: 'trit', fg: toHex(simulateCVD(parsedFg, 'tritanopia')), bg: toHex(simulateCVD(parsedBg, 'tritanopia')) },
    ];
    return sims;
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

  // Handle color picker changes (always valid hex)
  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setCustomFg(hex);
    setHexInput(hex);
    recomputeMetrics(hex);
    onAdjust?.(element.id, hex);
  };

  // Handle hex text input changes (validate before applying)
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

  // Reset to suggestion
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
          {issue.metrics && !issue.metrics.passesIso24505 && <span className="bg-red-200 text-red-800 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">ISO 24505-2 違反</span>}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Target text preview */}
        <div className="bg-slate-50 p-3 rounded-lg border text-sm font-mono whitespace-nowrap overflow-hidden text-ellipsis shadow-inner text-slate-700">
          "{element.text}"
        </div>

        {/* Before/After swatches */}
        <div className="grid grid-cols-2 gap-4">
          {/* Before */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">現状の色</span>
            <div
              className="h-16 rounded-md border shadow-sm flex items-center justify-center p-2"
              style={{ backgroundColor: bg }}
            >
              <span style={{ color: fg }} className="font-bold text-xl leading-none drop-shadow-sm truncate px-1 max-w-full">
                {element.text.trim().substring(0, 4) || 'あAa'}
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 uppercase font-mono">
              <span>FG: {fg}</span>
              <span>BG: {bg}</span>
            </div>
          </div>

          {/* After — live preview with customFg */}
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
          <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> 文字色を手動調整
            </span>
            {isModified && (
              <button
                onClick={handleReset}
                className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                title="提案色に戻す"
              >
                <RefreshCw className="w-2.5 h-2.5" /> リセット
              </button>
            )}
          </div>

          <div className="p-3 flex flex-col gap-3">
            {/* Color picker + hex input */}
            <div className="flex items-center gap-3">
              <label className="relative cursor-pointer flex-shrink-0">
                {/* Swatch that opens native picker */}
                <div
                  className="w-10 h-10 rounded-lg border-2 border-white shadow-md ring-1 ring-slate-200 transition-transform hover:scale-105"
                  style={{ backgroundColor: customFg }}
                />
                <input
                  type="color"
                  value={customFg}
                  onChange={handlePickerChange}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  aria-label="文字色を選択"
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
                  aria-label="HEXカラーコード入力"
                />
              </div>
            </div>

            {/* Live metrics */}
            {liveWcag && liveIso && (
              <div className="font-mono text-[10px] flex flex-col gap-1 bg-white border border-slate-100 rounded-lg p-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">WCAGコントラスト比</span>
                  <span className={`font-bold ${liveWcag.passesAA ? 'text-emerald-600' : 'text-red-500'}`}>
                    {liveWcag.ratio.toFixed(2)} : 1 {liveWcag.passesAA ? '✓ AA' : '✗ AA'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">明度差 ΔL*</span>
                  <span className={`font-bold ${liveIso.deltaL >= 20 ? 'text-emerald-600' : 'text-amber-500'}`}>
                    {liveIso.deltaL.toFixed(1)} {liveIso.deltaL >= 20 ? '✓' : '✗'} (目標 20)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">CIEDE2000 / P/D型 ΔE₀₀</span>
                  <span className={`font-bold ${liveIso.deltaE_PD >= 18 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {liveIso.deltaE_PD.toFixed(1)} {liveIso.deltaE_PD >= 18 ? '✓' : '✗'} (目標 18)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">CIEDE2000 / T型 ΔE₀₀</span>
                  <span className={`font-bold ${liveIso.deltaE_T >= 18 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {liveIso.deltaE_T.toFixed(1)} {liveIso.deltaE_T >= 18 ? '✓' : '✗'} (目標 18)
                  </span>
                </div>
                <div className={`mt-1 pt-1 border-t border-slate-100 flex items-center justify-center gap-1 font-bold text-[11px] ${passesAll ? 'text-emerald-600' : 'text-red-500'}`}>
                  {passesAll ? '✓ すべての基準をクリアしています' : '✗ いずれかの基準が未達です'}
                </div>
              </div>
            )}
          </div>
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
            <div className="p-3 grid grid-cols-2 gap-2 bg-white">
              {cvdSimulations.map((sim) => (
                <div key={sim.key} className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-500 truncate">{sim.label}</span>
                  <div
                    className="h-10 rounded border shadow-sm flex items-center justify-center p-1 overflow-hidden"
                    style={{ backgroundColor: sim.bg }}
                  >
                    <span 
                      style={{ color: sim.fg }} 
                      className="font-bold text-sm leading-none drop-shadow-sm truncate"
                    >
                      {element.text.trim().substring(0, 4) || 'あAa'}
                    </span>
                  </div>
                  {sim.key !== 'normal' && (
                    <div className="flex justify-between text-[8px] text-slate-400 font-mono">
                      <span>{sim.fg}</span>
                    </div>
                  )}
                </div>
              ))}
              <div className="col-span-2 mt-1 pt-2 border-t border-slate-100 italic text-[9px] text-slate-400 leading-tight">
                ※ Brettel/Viénotアルゴリズムに基づく推定値です。実際の見え方は個人差があります。
              </div>
            </div>
          )}
        </div>

        {/* Details section */}
        {issue.metrics && (
          <details className="mt-1 text-sm text-slate-600 bg-slate-50 rounded-lg border">
            <summary className="cursor-pointer px-3 py-2 font-bold hover:bg-slate-100 outline-none select-none">詳細・計算値 (変更前後)</summary>

            <div className="px-3 py-3 border-t flex flex-col gap-5 font-mono text-[11px] overflow-y-auto max-h-[250px] shadow-inner bg-white">

              {/* CURRENT (original) METRICS */}
              <div>
                <h4 className="font-bold text-slate-500 mb-2 border-b pb-1 flex justify-between">
                  <span>▼ 現状の判定</span>
                  {issue.metrics.passesWcagAA && issue.metrics.passesIso24505 ? <span className="text-green-500">PASS</span> : <span className="text-red-500">FAIL</span>}
                </h4>
                <div className="flex justify-between items-center">
                  <span>WCAG コントラスト比:</span>
                  <span className={issue.metrics.passesWcagAA ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                    {issue.metrics.contrastRatio?.toFixed(2)} : 1
                  </span>
                </div>
                <div className="flex justify-between items-start mt-2 pt-2 border-t border-slate-100">
                  <span className="flex-shrink-0">ISO 24505-2 原則:</span>
                  <div className="flex flex-col items-end gap-1 text-right min-w-[150px]">
                    <span className={issue.metrics.passesIso24505 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                      {issue.metrics.passesIso24505 ? 'Pass' : 'Fail'}
                    </span>
                    {issue.metrics.isoDetails && (
                      <div className="text-[10px] bg-slate-50 p-1.5 rounded flex flex-col gap-0.5 mt-0.5 w-full text-slate-500 border border-slate-100">
                        <div className="flex justify-between">
                          <span>明度差 ΔL*:</span>
                          <span className={issue.metrics.isoDetails.deltaL >= 20.0 ? "" : "text-red-500 font-bold"}>{issue.metrics.isoDetails.deltaL?.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-100 mt-1 pt-1">
                          <span>通常色差 CIEDE2000 ΔE₀₀:</span>
                          <span>{issue.metrics.isoDetails.normalDeltaE?.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>P/D型(赤緑) 推定ΔE₀₀:</span>
                          <span className={issue.metrics.isoDetails.deltaE_PD >= 18.0 ? "" : "text-red-500 font-bold"}>{issue.metrics.isoDetails.deltaE_PD?.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>T型(青黄) 推定ΔE₀₀:</span>
                          <span className={issue.metrics.isoDetails.deltaE_T >= 18.0 ? "" : "text-red-500 font-bold"}>{issue.metrics.isoDetails.deltaE_T?.toFixed(1)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SUGGESTED METRICS */}
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
                      {newWcag.passesAA && newIso.passesIso24505 ? <span className="text-emerald-500">PASS ✓</span> : <span className="text-red-500">NOT OPTIMAL</span>}
                    </h4>
                    <div className="flex justify-between items-center">
                      <span>WCAG コントラスト比:</span>
                      <span className={newWcag.passesAA ? "text-emerald-600 font-bold" : "text-slate-600 font-bold"}>
                        {newWcag.ratio?.toFixed(2)} : 1
                      </span>
                    </div>
                    <div className="flex justify-between items-start mt-2 pt-2 border-t border-slate-100">
                      <span className="flex-shrink-0">ISO 24505-2 原則:</span>
                      <div className="flex flex-col items-end gap-1 text-right min-w-[150px]">
                        <span className={newIso.passesIso24505 ? "text-emerald-600 font-bold" : "text-slate-600 font-bold"}>
                          {newIso.passesIso24505 ? 'Pass' : 'Fail'}
                        </span>
                        <div className="text-[10px] bg-emerald-50/50 p-1.5 rounded flex flex-col gap-0.5 mt-0.5 w-full text-slate-600 border border-emerald-50">
                          <div className="flex justify-between">
                            <span>明度差 ΔL*:</span>
                            <span className={newIso.deltaL >= 20.0 ? "text-emerald-700" : ""}>{newIso.deltaL?.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between border-t border-emerald-50 mt-1 pt-1">
                            <span>通常色差 CIEDE2000 ΔE₀₀:</span>
                            <span>{newIso.normalDeltaE?.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>P/D型(赤緑) 推定ΔE₀₀:</span>
                            <span className={newIso.deltaE_PD >= 18.0 ? "text-emerald-700" : ""}>{newIso.deltaE_PD?.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>T型(青黄) 推定ΔE₀₀:</span>
                            <span className={newIso.deltaE_T >= 18.0 ? "text-emerald-700" : ""}>{newIso.deltaE_T?.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </details>
        )}

        {/* Action: copy current custom color */}
        <button
          onClick={handleCopy}
          className={`mt-2 w-full flex items-center justify-center gap-2 text-white py-2.5 rounded-lg text-sm font-bold transition-all shadow focus:ring-4 ${
            passesAll
              ? 'bg-emerald-700 hover:bg-emerald-800 focus:ring-emerald-100'
              : 'bg-slate-700 hover:bg-slate-800 focus:ring-slate-100'
          }`}
        >
          {copied
            ? <><CheckCircle2 className="w-4 h-4" /> コピーしました！</>
            : <><Copy className="w-4 h-4" /> {isModified ? '調整した文字色' : '提案する文字色'} ({customFg}) をコピー</>
          }
        </button>

        {/* --- Export Actions --- */}
        {(onExportJson || onExportCsv) && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">レポートを書き出す</span>
            <div className="grid grid-cols-2 gap-2">
              {onExportJson && (
                <button
                  onClick={onExportJson}
                  className="flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors font-medium"
                >
                  <FileJson className="w-3.5 h-3.5" /> JSONで保存
                </button>
              )}
              {onExportCsv && (
                <button
                  onClick={onExportCsv}
                  className="flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors font-medium"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> CSVで保存
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
