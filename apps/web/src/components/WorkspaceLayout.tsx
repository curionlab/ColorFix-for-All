import React, { useState, useEffect } from 'react';
import type { AnalysisReport, ExtractedTextElement } from '../types';
import { checkWcagCompliance, checkIsoCompliance, findAccessibleColor, parseHex } from '@colorfix/color-engine';
import FileDropzone from './FileDropzone';
import PdfOverlayCanvas from './PdfOverlayCanvas';
import RecommendationCard from './RecommendationCard';
import { extractPdf } from '../lib/pdf-extractor';
import { Download, ListFilter, FileOutput, FileJson, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

export default function WorkspaceLayout() {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfCanvasUrl, setPdfCanvasUrl] = useState<string | null>(null);
  const [pdfDimensions, setPdfDimensions] = useState({ width: 800, height: 1000 });
  const [previewSource, setPreviewSource] = useState<'original' | 'recommended'>('original');
  const [cvdSimulation, setCvdSimulation] = useState<'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'>('none');
  const [showOverlays, setShowOverlays] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'fixes' | 'export'>('fixes');
  const [customResultsMap, setCustomResultsMap] = useState<Record<string, string>>({}); // elementId -> hex

  /** Download all color recommendations as a structured JSON file */
  const handleExportJson = () => {
    if (!report) return;
    const exportData = {
      fileName: report.fileName,
      exportedAt: new Date().toISOString(),
      summary: {
        totalElements: report.elements.length,
        violations: report.issues.length,
      },
      colorMap: report.recommendations.map(rec => {
        const element = report.elements.find(e => `issue-${e.id}` === rec.issueId);
        const currentFg = (element && customResultsMap[element.id]) || rec.suggestedFg;
        
        // Re-calculate metrics for the current (possibly adjusted) color
        const fg = parseHex(currentFg);
        const bg = parseHex(rec.originalBg);
        let liveMetrics = null;
        if (fg && bg) {
          const wcag = checkWcagCompliance(fg, bg);
          const iso = checkIsoCompliance(fg, bg);
          liveMetrics = {
            contrastRatio: wcag.ratio.toFixed(2),
            passesWcagAA: wcag.passesAA,
            passesIso24505: iso.passesIso24505,
            deltaE_normal: iso.normalDeltaE.toFixed(1),
            deltaE_PD: iso.deltaE_PD.toFixed(1),
            deltaE_T: iso.deltaE_T.toFixed(1)
          };
        }

        return {
          elementId: element?.id ?? rec.issueId,
          text: element?.text?.trim().substring(0, 60) ?? '',
          backgroundColor: rec.originalBg,
          originalForegroundColor: rec.originalFg,
          finalForegroundColor: currentFg,
          isManuallyAdjusted: !!(element && customResultsMap[element.id]),
          metrics: liveMetrics,
          reason: rec.reason,
        };
      }),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = report.fileName.replace(/\.pdf$/i, '') + '_colorfix.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  /** Download color recommendations as a CSV for design tools */
  const handleExportCsv = () => {
    if (!report) return;
    const header = 'elementId,text,backgroundColor,originalForegroundColor,recommendedForegroundColor\n';
    const rows = report.recommendations.map(rec => {
      const element = report.elements.find(e => `issue-${e.id}` === rec.issueId);
      const currentFg = (element && customResultsMap[element.id]) || rec.suggestedFg;
      const text = (element?.text?.trim() ?? '').replace(/"/g, '""');
      return `"${element?.id ?? ''}","${text}","${rec.originalBg}","${rec.originalFg}","${currentFg}"`;
    });
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = report.fileName.replace(/\.pdf$/i, '') + '_colorfix.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

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
                detailedReason = '（赤と緑など）色覚特性のある方の視界では似通って見えてしまう配色です。色相に依存しなくても区別できる十分なコントラスト（知覚色差 ΔE₀₀）を確保するよう調整しました。';
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
        setCustomResultsMap({}); // Reset map for new file
        
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
        <div className="px-4 py-3 border-b bg-slate-50 text-sm font-medium flex flex-wrap gap-4 items-center justify-between">
          <span className="text-slate-700 truncate min-w-[120px]">{report.fileName}</span>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Highlights Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none border-r pr-4">
              <input 
                type="checkbox" 
                checked={showOverlays} 
                onChange={e => setShowOverlays(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-600 font-bold">ハイライト表示</span>
            </label>

            {/* Source Selector */}
            <div className="flex bg-slate-200 p-0.5 rounded-lg text-[10px] items-center">
              <button 
                onClick={() => setPreviewSource('original')}
                className={`px-3 py-1 rounded-md transition-all ${previewSource === 'original' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
              >
                元の画像
              </button>
              <button 
                onClick={() => setPreviewSource('recommended')}
                className={`px-3 py-1 rounded-md transition-all ${previewSource === 'recommended' ? 'bg-emerald-500 text-white font-bold shadow-sm' : 'text-emerald-600 hover:bg-emerald-100'}`}
              >
                修正後
              </button>
            </div>

            {/* CVD Selector */}
            <div className="flex bg-slate-200 p-0.5 rounded-lg text-[10px] items-center border border-slate-300">
              <button 
                onClick={() => setCvdSimulation('none')}
                className={`px-2 py-1 rounded-md transition-all ${cvdSimulation === 'none' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
              >
                通常
              </button>
              <button 
                onClick={() => setCvdSimulation('protanopia')}
                className={`px-2 py-1 rounded-md transition-all ${cvdSimulation === 'protanopia' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
              >
                P型
              </button>
              <button 
                onClick={() => setCvdSimulation('deuteranopia')}
                className={`px-2 py-1 rounded-md transition-all ${cvdSimulation === 'deuteranopia' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
              >
                D型
              </button>
              <button 
                onClick={() => setCvdSimulation('tritanopia')}
                className={`px-2 py-1 rounded-md transition-all ${cvdSimulation === 'tritanopia' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
              >
                T型
              </button>
            </div>
            
            <span className="text-red-600 bg-red-100 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">{report.issues.length} 件のエラー</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-slate-200 relative p-8 flex justify-center items-start">
          {pdfCanvasUrl && (
            <PdfOverlayCanvas 
              imageUrl={pdfCanvasUrl}
              originalWidth={pdfDimensions.width}
              originalHeight={pdfDimensions.height}
              elements={report.elements}
              issues={report.issues}
              recommendations={report.recommendations}
              selectedElementId={selectedElementId}
              onSelectElement={setSelectedElementId}
              previewSource={previewSource}
              cvdSimulation={cvdSimulation}
              customResultsMap={customResultsMap}
              showOverlays={showOverlays}
            />
          )}
        </div>
      </div>

      {/* Right Pane: Issues & Fixes */}
      <div className="w-[400px] flex-shrink-0 bg-white border rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="flex bg-slate-50 border-b z-10">
          <button 
            onClick={() => setActiveSidebarTab('fixes')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-all border-b-2 ${activeSidebarTab === 'fixes' ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
          >
            <ListFilter className="w-4 h-4" /> 修正提案
          </button>
          <button 
            onClick={() => setActiveSidebarTab('export')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-all border-b-2 ${activeSidebarTab === 'export' ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
          >
            <FileOutput className="w-4 h-4" /> レポート出力
          </button>
        </div>

        {activeSidebarTab === 'fixes' && (
          <div className="px-4 py-2.5 bg-slate-100 border-b flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>エラー箇所を調整</span>
            <div className="flex gap-2 items-center">
              <button 
                onClick={() => setSelectedElementId(report.issues[(selectedIssueIndex - 1 + report.issues.length) % report.issues.length].elementId)}
                className="p-1 px-1.5 bg-white border rounded hover:bg-slate-50 text-slate-600 transition-colors"
              >
                ←
              </button>
              <span className="font-mono text-slate-700">{selectedIssueIndex + 1} / {report.issues.length}</span>
              <button 
                onClick={() => setSelectedElementId(report.issues[(selectedIssueIndex + 1) % report.issues.length].elementId)}
                className="p-1 px-1.5 bg-white border rounded hover:bg-slate-50 text-slate-600 transition-colors"
              >
                →
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {activeSidebarTab === 'fixes' ? (
            <>
              {!selectedDetails && (
                <div className="text-slate-500 text-center py-12">左側のハイライトをクリックして詳細を確認</div>
              )}
              
              {selectedDetails && selectedIssue && selectedRec && (
                <RecommendationCard 
                  element={selectedDetails}
                  issue={selectedIssue}
                  recommendation={selectedRec}
                  onAdjust={(id, hex) => {
                    setCustomResultsMap(prev => ({ ...prev, [id]: hex }));
                  }}
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
                    <span className="font-bold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> 基準クリア</span>
                    <p>このテキストは充分なコントラスト比があり、ISO基準も満たしています。</p>
                    <div className="text-[11px] bg-white/60 p-2 rounded border border-green-100 flex flex-col gap-1 mt-2 text-green-900">
                      <div className="flex justify-between">
                        <span>WCAGコントラスト比 (目標 4.50):</span>
                        <span className="font-bold">{wcag.ratio.toFixed(2)} : 1</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="bg-slate-50 border rounded-xl p-5 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-600" /> レポートのエクスポート
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  すべての修正提案と、手動で調整した色を含むレポートを保存します。
                </p>
                <div className="grid grid-cols-1 gap-3 mt-2">
                  <button 
                    onClick={handleExportJson}
                    className="flex items-center justify-between px-4 py-3 bg-white border border-emerald-200 rounded-lg hover:border-emerald-400 hover:bg-emerald-50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <FileJson className="w-5 h-5 text-emerald-600" />
                      <div className="text-left">
                        <div className="text-sm font-bold text-slate-800">JSON形式</div>
                        <div className="text-[10px] text-slate-500 font-medium">エンジニア向け・全データを含む</div>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-slate-300 group-hover:text-emerald-500" />
                  </button>
                  <button 
                    onClick={handleExportCsv}
                    className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg hover:border-slate-400 hover:bg-slate-100 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-slate-600" />
                      <div className="text-left">
                        <div className="text-sm font-bold text-slate-800">CSV形式</div>
                        <div className="text-[10px] text-slate-500 font-medium">表計算ソフト・デザインツール向け</div>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                  </button>
                </div>
              </div>

              <div className="px-1 flex flex-col gap-4">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">現在のステータス</h3>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-white border rounded-lg p-3">
                    <div className="text-xl font-black text-slate-800">{report.issues.length}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">総検出数</div>
                  </div>
                  <div className="bg-white border rounded-lg p-3">
                    <div className="text-xl font-black text-emerald-600">{Object.keys(customResultsMap).length}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">手動調整済み</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
