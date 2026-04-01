import React from 'react';
import type { ExtractedTextElement, Issue, Recommendation } from '../types';
import { ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';

interface RecommendationCardProps {
  element: ExtractedTextElement;
  issue: Issue;
  recommendation: Recommendation;
}

export default function RecommendationCard({ element, issue, recommendation }: RecommendationCardProps) {
  const fg = recommendation.originalFg;
  const bg = recommendation.originalBg;
  const fixedFg = recommendation.suggestedFg;
  const fixedBg = recommendation.suggestedBg;
 
  return (
    <div className="border border-red-200 rounded-xl bg-white overflow-hidden flex flex-col shrink-0 shadow-sm transition-all hover:shadow-md">
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
        <div className="bg-slate-50 p-3 rounded-lg border text-sm font-mono whitespace-nowrap overflow-hidden text-ellipsis shadow-inner text-slate-700 border-slate-200">
          "{element.text}"
        </div>
 
        {/* Before/After swatches */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">現状の色</span>
            <div className="h-16 rounded-md border border-slate-200 shadow-sm flex items-center justify-center p-2" style={{ backgroundColor: bg }}>
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
            <div className="absolute top-1/2 -left-3.5 -translate-y-1/2 bg-white rounded-full p-0.5 shadow-sm border border-slate-200 z-10">
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="w-3 h-3" />
              おすすめ
            </span>
            <div
              className="h-16 rounded-md border-2 border-emerald-300 ring-4 ring-emerald-50 ring-offset-0 shadow-sm flex items-center justify-center p-2 overflow-hidden transition-all bg-white"
              style={{ backgroundColor: fixedBg }}
            >
              <span style={{ color: fixedFg }} className="font-bold text-xl leading-none drop-shadow-sm truncate px-1 max-w-full">
                {element.text.trim().substring(0, 4) || 'あAa'}
              </span>
            </div>
            <div className="flex flex-col text-[10px] mt-1 uppercase font-mono leading-tight">
              <span className="font-bold rounded w-fit px-1 text-emerald-600 bg-emerald-50">
                FG: {fixedFg}
              </span>
              <span className="text-slate-500">
                BG: {fixedBg}
              </span>
            </div>
          </div>
        </div>
 
        {/* Reason */}
        <div className="text-sm text-slate-600 leading-relaxed border-l-2 border-emerald-400 pl-3 italic">
          {recommendation.reason}
        </div>
      </div>
    </div>
  );
}
