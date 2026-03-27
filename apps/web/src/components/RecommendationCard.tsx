import React, { useMemo } from 'react';
import type { ExtractedTextElement, Issue, Recommendation } from '@colorfix/schemas';
import { checkWcagCompliance, checkIsoCompliance, parseHex } from '@colorfix/color-engine';
import { ArrowRight, Copy, CheckCircle2, AlertTriangle } from 'lucide-react';

interface RecommendationCardProps {
  element: ExtractedTextElement;
  issue: Issue;
  recommendation: Recommendation;
}

export default function RecommendationCard({ element, issue, recommendation }: RecommendationCardProps) {
  const fg = recommendation.originalFg;
  const bg = recommendation.originalBg;
  const fixedFg = recommendation.suggestedFg;

  const handleCopy = () => {
    navigator.clipboard.writeText(fixedFg);
    alert('カラーコードをコピーしました！');
  };

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
        {/* Target Object string representation */}
        <div className="bg-slate-50 p-3 rounded-lg border text-sm font-mono whitespace-nowrap overflow-hidden text-ellipsis shadow-inner text-slate-700">
          "{element.text}"
        </div>

        {/* Current State vs Fixed State Swatches */}
        <div className="grid grid-cols-2 gap-4">
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

          <div className="flex flex-col gap-1 relative">
            <div className="absolute top-1/2 -left-3 -translate-y-1/2 bg-white rounded-full p-0.5 shadow-sm border z-10">
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> 提案する色
            </span>
            <div 
              className="h-16 rounded-md border border-blue-200 ring-2 ring-blue-50 ring-offset-1 shadow-sm flex items-center justify-center p-2 overflow-hidden"
              style={{ backgroundColor: bg }}
            >
              <span style={{ color: fixedFg }} className="font-bold text-xl leading-none drop-shadow-sm truncate px-1 max-w-full">
                {element.text.trim().substring(0, 4) || 'あAa'}
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 uppercase font-mono">
              <span className="text-blue-600 font-bold bg-blue-50 px-1 rounded">FG: {fixedFg}</span>
              <span>BG: {bg}</span>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="text-sm text-slate-600 leading-relaxed border-l-2 border-blue-400 pl-3">
          {recommendation.reason}
        </div>

        {/* Details section */}
        {issue.metrics && (
          <details className="mt-1 text-sm text-slate-600 bg-slate-50 rounded-lg border">
            <summary className="cursor-pointer px-3 py-2 font-bold hover:bg-slate-100 outline-none select-none">詳細・計算値 (変更前後)</summary>
            
            {/* Scrollable container for the deep math outputs */}
            <div className="px-3 py-3 border-t flex flex-col gap-5 font-mono text-[11px] overflow-y-auto max-h-[250px] shadow-inner bg-white">
              
              {/* CURRENT METRICS */}
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
                          <span className={issue.metrics.isoDetails.deltaL >= 40.0 ? "" : "text-red-500 font-bold"}>{issue.metrics.isoDetails.deltaL?.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-100 mt-1 pt-1">
                          <span>通常色差 ΔE:</span>
                          <span>{issue.metrics.isoDetails.normalDeltaE?.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>P/D型(赤緑) 推定ΔE:</span>
                          <span className={issue.metrics.isoDetails.deltaE_PD >= 30.0 ? "" : "text-red-500 font-bold"}>{issue.metrics.isoDetails.deltaE_PD?.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>T型(青黄) 推定ΔE:</span>
                          <span className={issue.metrics.isoDetails.deltaE_T >= 30.0 ? "" : "text-red-500 font-bold"}>{issue.metrics.isoDetails.deltaE_T?.toFixed(1)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* NEW METRICS (Computed dynamically) */}
              {(() => {
                const parsedBg = parseHex(bg);
                const parsedNewFg = parseHex(fixedFg);
                if (!parsedBg || !parsedNewFg) return null;
                
                const newWcag = checkWcagCompliance(parsedNewFg, parsedBg);
                const newIso = checkIsoCompliance(parsedNewFg, parsedBg);

                return (
                  <div>
                    <h4 className="font-bold text-blue-600 mb-2 border-b border-blue-100 pb-1 flex justify-between">
                      <span>▼ 修正後の判定 (提案色)</span>
                      {newWcag.passesAA && newIso.passesIso24505 ? <span className="text-blue-500">PASS ✓</span> : <span className="text-red-500">NOT OPTIMAL</span>}
                    </h4>
                    <div className="flex justify-between items-center">
                      <span>WCAG コントラスト比:</span>
                      <span className={newWcag.passesAA ? "text-blue-600 font-bold" : "text-slate-600 font-bold"}>
                        {newWcag.ratio?.toFixed(2)} : 1
                      </span>
                    </div>
                    <div className="flex justify-between items-start mt-2 pt-2 border-t border-slate-100">
                      <span className="flex-shrink-0">ISO 24505-2 原則:</span>
                      <div className="flex flex-col items-end gap-1 text-right min-w-[150px]">
                        <span className={newIso.passesIso24505 ? "text-blue-600 font-bold" : "text-slate-600 font-bold"}>
                          {newIso.passesIso24505 ? 'Pass' : 'Fail'}
                        </span>
                        
                        <div className="text-[10px] bg-blue-50/50 p-1.5 rounded flex flex-col gap-0.5 mt-0.5 w-full text-slate-600 border border-blue-50">
                          <div className="flex justify-between">
                            <span>明度差 ΔL*:</span>
                            <span className={newIso.deltaL >= 40.0 ? "text-blue-700" : ""}>{newIso.deltaL?.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between border-t border-blue-50 mt-1 pt-1">
                            <span>通常色差 ΔE:</span>
                            <span>{newIso.normalDeltaE?.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>P/D型(赤緑) 推定ΔE:</span>
                            <span className={newIso.deltaE_PD >= 30.0 ? "text-blue-700" : ""}>{newIso.deltaE_PD?.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>T型(青黄) 推定ΔE:</span>
                            <span className={newIso.deltaE_T >= 30.0 ? "text-blue-700" : ""}>{newIso.deltaE_T?.toFixed(1)}</span>
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

        {/* Action */}
        <button 
          onClick={handleCopy}
          className="mt-2 w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-lg text-sm font-bold transition-colors shadow focus:ring-4 focus:ring-slate-100"
        >
          <Copy className="w-4 h-4" /> 新しい文字色 ({fixedFg}) をコピー
        </button>
      </div>
    </div>
  );
}
