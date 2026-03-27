import React, { useState, useEffect } from 'react';
import type { AnalysisReport, ExtractedTextElement } from '../types';
import { checkWcagCompliance, checkIsoCompliance, findAccessibleColor, parseHex } from '@colorfix/color-engine';
import FileDropzone from './FileDropzone';
import PdfOverlayCanvas from './PdfOverlayCanvas';
import RecommendationCard from './RecommendationCard';
import { extractPdf } from '../lib/pdf-extractor';

export default function WorkspaceLayout() {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfCanvasUrl, setPdfCanvasUrl] = useState<string | null>(null);
  const [pdfDimensions, setPdfDimensions] = useState({ width: 800, height: 1000 });

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    try {
      if (file.type === 'application/pdf') {
        const { elements, thumbnailUrl, width, height } = await extractPdf(file);
        setPdfCanvasUrl(thumbnailUrl);
        setPdfDimensions({ width, height });

        // Analyze elements
        const issues: any[] = [];
        const recommendations: any[] = [];

        elements.forEach(el => {
          const fg = parseHex(el.foregroundColor);
          const bg = parseHex(el.backgroundColor);
          
          if (!fg || !bg) return;

          const wcag = checkWcagCompliance(fg, bg);
          const iso = checkIsoCompliance(fg, bg);

          if (!wcag.passesAA || !iso.passesIso24505) {
            const issueId = `issue-${el.id}`;
            issues.push({
              id: issueId,
              elementId: el.id,
              message: `文字色と背景色の識別性が基準を満たしていません (WCAG AA: ${wcag.passesAA ? 'Pass' : 'Fail'}, ISO: ${iso.passesIso24505 ? 'Pass' : 'Fail'})`,
              metrics: {
                contrastRatio: wcag.ratio,
                passesWcagAA: wcag.passesAA,
                passesIso24505: iso.passesIso24505,
                isoDetails: iso
              }
            });

            const fixedFg = findAccessibleColor(fg, bg);
            if (fixedFg) {
              const toHexStr = (c: any) => `#${c.r.toString(16).padStart(2,'0')}${c.g.toString(16).padStart(2,'0')}${c.b.toString(16).padStart(2,'0')}`;
              
              let detailedReason = '色相（色味）を維持したまま、明暗差（コントラスト）を調整して基準をクリアしました。';
              if (iso.isProblematicPairing) {
                detailedReason = '（赤と緑など）色覚多様性の視界では似通って見えてしまう配色です。ISO原則に基づき、色相に依存しなくても区別できる十分な明度差（Lab色空間）を確保するよう調整しました。';
              } else if (!iso.luminanceContrastPasses) {
                detailedReason = '高齢者やロービジョン（弱視）の方でもはっきり文字の形を認識できるよう、ISO 24505-2の原則に基づき、Lab色空間において十分な明度差（ΔL* >= 20）を確保するよう明度を調整しました。';
              } else if (!wcag.passesAA) {
                detailedReason = 'WCAG AA基準（コントラスト比 4.5 以上）を満たすよう、色相を変えずに文字の明度を調整して視認性を高めました。';
              }

              recommendations.push({
                issueId,
                originalFg: el.foregroundColor,
                originalBg: el.backgroundColor,
                suggestedFg: toHexStr(fixedFg),
                reason: detailedReason
              });
            }
          }
        });

        setReport({
          fileName: file.name,
          elements,
          issues,
          recommendations
        });
        
        if (issues.length > 0) {
          setSelectedElementId(issues[0].elementId);
        }
      } else if (file.type.startsWith('image/')) {
        alert('現在はPDFファイルのみに対応しています。画像の解析は次期アップデートをお待ちください。');
      } else {
        alert('対応していないファイル形式です。PDFファイルを選択してください。');
      }
    } catch (e: any) {
      console.error(e);
      alert('ファイルの解析に失敗しました: ' + (e?.message || String(e)));
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="text-xl font-bold text-slate-600 animate-pulse">ドキュメントを解析中...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="max-w-2xl w-full">
          <FileDropzone onFileSelect={handleFileSelect} />
        </div>
      </div>
    );
  }

  const selectedIssueIndex = report.issues.findIndex(i => i.elementId === selectedElementId);
  const selectedIssue = selectedIssueIndex >= 0 ? report.issues[selectedIssueIndex] : undefined;
  const selectedDetails = report.elements.find(e => e.id === selectedElementId);
  const selectedRec = selectedIssue ? report.recommendations.find(r => r.issueId === selectedIssue.id) : null;

  return (
    <div className="flex-1 flex flex-row overflow-hidden bg-slate-100 p-4 gap-4">
      {/* Left Pane: Visual Canvas */}
      <div className="flex-1 rounded-xl shadow-sm border bg-white overflow-hidden relative flex flex-col">
        <div className="px-4 py-3 border-b bg-slate-50 text-sm font-medium flex justify-between items-center">
          <span className="text-slate-700 truncate">{report.fileName}</span>
          <span className="text-red-600 bg-red-100 px-2 py-1 rounded text-xs font-bold">{report.issues.length} 件のエラー</span>
        </div>
        <div className="flex-1 overflow-auto bg-slate-200 relative p-8 flex justify-center items-start">
          {pdfCanvasUrl && (
            <PdfOverlayCanvas 
              imageUrl={pdfCanvasUrl}
              originalWidth={pdfDimensions.width}
              originalHeight={pdfDimensions.height}
              elements={report.elements}
              issues={report.issues}
              selectedElementId={selectedElementId}
              onSelectElement={setSelectedElementId}
            />
          )}
        </div>
      </div>

      {/* Right Pane: Issues & Fixes */}
      <div className="w-[400px] flex-shrink-0 bg-white border rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 font-bold text-slate-800 flex justify-between items-center">
          <span>修正の提案</span>
          {report.issues.length > 0 && selectedIssueIndex >= 0 && (
            <div className="flex gap-2 text-sm font-normal items-center">
              <button 
                onClick={() => setSelectedElementId(report.issues[(selectedIssueIndex - 1 + report.issues.length) % report.issues.length].elementId)}
                className="px-2 py-1 bg-white border rounded hover:bg-slate-100 text-slate-600"
              >
                前へ
              </button>
              <span className="text-slate-500 text-xs">{selectedIssueIndex + 1} / {report.issues.length}</span>
              <button 
                onClick={() => setSelectedElementId(report.issues[(selectedIssueIndex + 1) % report.issues.length].elementId)}
                className="px-2 py-1 bg-emerald-600 text-white border border-emerald-700 rounded hover:bg-emerald-700"
              >
                次へ
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {!selectedDetails && (
            <div className="text-slate-500 text-center py-12">左側のハイライトをクリックして詳細を確認</div>
          )}
          
          {selectedDetails && selectedIssue && selectedRec && (
            <RecommendationCard 
              element={selectedDetails}
              issue={selectedIssue}
              recommendation={selectedRec}
            />
          )}

          {selectedDetails && !selectedIssue && (() => {
            const fg = parseHex(selectedDetails.foregroundColor);
            const bg = parseHex(selectedDetails.backgroundColor);
            if (!fg || !bg) return null;
            const wcag = checkWcagCompliance(fg, bg);
            const iso = checkIsoCompliance(fg, bg);
            return (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-green-800 text-sm flex flex-col gap-2">
                <span className="font-bold">✓ 基準クリア</span>
                <p>このテキストは充分なコントラスト比があり、ISO基準も満たしています。</p>
                <div className="text-[11px] bg-white/60 p-2 rounded border border-green-100 flex flex-col gap-1 mt-2 text-green-900">
                  <div className="flex justify-between">
                    <span>WCAGコントラスト比 (目標 4.50):</span>
                    <span className="font-bold">{wcag.ratio.toFixed(2)} : 1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>明度差 ΔL* (目標 20.0):</span>
                    <span className="font-bold">{iso.deltaL?.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between border-t border-green-200 mt-1 pt-1">
                    <span>通常色差 CIEDE2000 ΔE₀₀:</span>
                    <span className="font-bold">{iso.normalDeltaE?.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>P/D型ΔE₀₀推定 (目標 18.0):</span>
                    <span className="font-bold">{iso.deltaE_PD?.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>T型ΔE₀₀推定 (目標 18.0):</span>
                    <span className="font-bold">{iso.deltaE_T?.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
