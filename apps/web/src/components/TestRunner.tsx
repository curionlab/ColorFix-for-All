import React, { useEffect, useState } from 'react';
import { extractPdf } from '../lib/pdf-extractor';
import type { ExtractedTextElement } from '../types';
import { parseHex } from '@colorfix/color-engine';

export default function TestRunner() {
  const [results, setResults] = useState<{ element: ExtractedTextElement, expectedFg: string, expectedBg: string, passFg: boolean, passBg: boolean }[] | null>(null);
  const [loading, setLoading] = useState(true);

  const EXPECTED_COLORS: Record<string, { fg: string, bg: string }> = {
    "1. Good Contrast": { fg: "#000000", bg: "#f8f9fa" },
    "2. Low Lightness": { fg: "#adb5bd", bg: "#ffffff" },
    "3. Red-Green Clash": { fg: "#d93838", bg: "#4ca64c" },
    "4. Blue-Yellow Clash": { fg: "#4a88cb", bg: "#a3a35c" },
    "5. Low Vision Warning": { fg: "#888888", bg: "#e9ecef" }
  };

  const isSimilar = (hex1: string, hex2: string) => {
    // allow slight variations due to PDF rendering rasterization/anti-aliasing
    const c1 = parseHex(hex1);
    const c2 = parseHex(hex2);
    if (!c1 || !c2) return false;
    const diff = Math.abs(c1.r - c2.r) + Math.abs(c1.g - c2.g) + Math.abs(c1.b - c2.b);
    return diff <= 15;
  };

  useEffect(() => {
    async function runTest() {
      try {
        const response = await fetch('/test.pdf');
        if (!response.ok) {
          throw new Error('Could not fetch test.pdf');
        }
        const blob = await response.blob();
        const file = new File([blob], 'test.pdf', { type: 'application/pdf' });
        
        const extracted = await extractPdf(file);
        const testResults = [];
        
        for (const [text, expected] of Object.entries(EXPECTED_COLORS)) {
          const element = extracted.elements.find(e => e.text.includes(text));
          if (element) {
             testResults.push({
               element,
               expectedFg: expected.fg,
               expectedBg: expected.bg,
               passFg: isSimilar(element.foregroundColor, expected.fg),
               passBg: isSimilar(element.backgroundColor, expected.bg)
             });
          }
        }
        
        if (testResults.length === 0) {
          console.error("No strings were matched! Extracted elements:", extracted.elements);
        }
        
        setResults(testResults);
      } catch (e) {
        console.error("Test extraction error:", e);
      } finally {
        setLoading(false);
      }
    }
    
    runTest();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse font-bold">PDFのサンプリングテストを実行中...</div>;
  if (!results || results.length === 0) {
    return (
      <div className="p-8 text-red-500 font-bold border rounded bg-red-50">
        テスト結果のロードに失敗しました (test.pdf が見つからない・パース失敗)<br/>
        開発者ツール(F12)のコンソールエラーを確認してください。
      </div>
    );
  }

  const allPass = results.length > 0 && results.every(r => r.passFg && r.passBg);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mt-6">
      <div className={`px-6 py-4 border-b font-bold text-lg flex items-center justify-between ${allPass ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
        <span>{allPass ? '✓ すべてのテストに合格しました！' : '⚠ テストに失敗した項目があります'}</span>
        <button onClick={() => window.location.reload()} className="px-3 py-1 bg-white border rounded shadow-sm text-sm font-normal text-slate-600 hover:bg-slate-50">再実行</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-3 text-sm font-semibold text-slate-600">抽出対象の文字列</th>
              <th className="px-6 py-3 text-sm font-semibold text-slate-600">期待される色指定 (HTML)</th>
              <th className="px-6 py-3 text-sm font-semibold text-slate-600">Canvasからの抽出色 (判定)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {results.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-slate-800 max-w-xs">{r.element.text}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-6">FG:</span>
                      <div className="w-5 h-5 rounded border border-slate-300 shadow-inner" style={{ backgroundColor: r.expectedFg }}></div>
                      <span className="font-mono text-sm uppercase">{r.expectedFg}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-6">BG:</span>
                      <div className="w-5 h-5 rounded border border-slate-300 shadow-inner" style={{ backgroundColor: r.expectedBg }}></div>
                      <span className="font-mono text-sm uppercase">{r.expectedBg}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-6">FG:</span>
                      <div className="w-5 h-5 rounded shadow-inner border border-slate-300" style={{ backgroundColor: r.element.foregroundColor }}></div>
                      <span className={`font-mono text-sm uppercase font-bold px-1 rounded ${!r.passFg ? 'text-red-700 bg-red-100' : 'text-slate-700'}`}>
                        {r.element.foregroundColor}
                        {!r.passFg && ' ❌'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-6">BG:</span>
                      <div className="w-5 h-5 rounded shadow-inner border border-slate-300" style={{ backgroundColor: r.element.backgroundColor }}></div>
                      <span className={`font-mono text-sm uppercase font-bold px-1 rounded ${!r.passBg ? 'text-red-700 bg-red-100' : 'text-slate-700'}`}>
                        {r.element.backgroundColor}
                        {!r.passBg && ' ❌'}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
