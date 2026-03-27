import React, { useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle, CheckCircle2, Copy, ExternalLink, ChevronRight, Zap, Download, XCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AnalysisApp() {
  const [url, setUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'results' | 'source'>('results');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [mode, setMode] = useState('balanced');
  const [selectedBrandColor, setSelectedBrandColor] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url) return;
    
    setIsAnalyzing(true);
    setResults(null);
    setActiveTab('results');
    
    try {
      const response = await fetch('http://localhost:8787/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url, 
          mode, 
          brandColor: mode === 'brand' ? selectedBrandColor : undefined 
        })
      }).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();
        setResults(data);
        
        if (data.declaredColors && data.declaredColors.length > 0 && !selectedBrandColor) {
           setSelectedBrandColor(data.declaredColors[0].value);
        }
      } else {
        const errorText = response ? await response.text() : 'Worker is unreachable';
        setToast({ message: `Analysis failed: ${errorText}`, type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Analysis failed. Check console.', type: 'error' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setToast({ message: 'Copied to clipboard!', type: 'success' });
  };

  const downloadCss = () => {
    if (!results || !results.recommendations) return;
    const css = results.recommendations.map((r: any) => r.cssPatch).join('\n\n');
    const blob = new Blob([css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `colorfix-${new Date().getTime()}.css`;
    a.click();
    setToast({ message: 'CSS Patch downloaded!', type: 'success' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Toast Notification */}
      {toast && (
        <div className={cn(
          "fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10",
          toast.type === 'success' ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          <span className="font-bold">{toast.message}</span>
        </div>
      )}

      {/* Search Header */}
      <section className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-200 border border-gray-100">
        <form onSubmit={(e) => handleAnalyze(e)} className="max-w-3xl mx-auto space-y-6">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="block w-full pl-11 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl text-lg transition-all outline-none"
              required
            />
          </div>
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Strategy</label>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                {['brand', 'balanced', 'readability'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all",
                      mode === m ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'brand' && results?.declaredColors && (
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Brand Color</label>
                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl overflow-x-auto max-w-[200px] no-scrollbar">
                  {results.declaredColors.slice(0, 8).map((c: any) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setSelectedBrandColor(c.value)}
                      className={cn(
                        "w-8 h-8 rounded-lg shrink-0 border-2 transition-all",
                        selectedBrandColor === c.value ? "border-indigo-500 scale-110 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                      )}
                      style={{ backgroundColor: c.value }}
                      title={`${c.value} (${c.count} uses)`}
                    />
                  ))}
                </div>
              </div>
            )}
            
            <button
              type="submit"
              disabled={isAnalyzing}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 mt-auto"
            >
              {isAnalyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>
        </form>
      </section>

      {/* Navigation Tabs */}
      {results && (
        <div className="flex gap-4 border-b border-gray-100 pb-px">
          <button 
            onClick={() => setActiveTab('results')}
            className={cn(
              "pb-4 px-2 text-sm font-bold transition-all relative",
              activeTab === 'results' ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Analysis Results
            {activeTab === 'results' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('source')}
            className={cn(
              "pb-4 px-2 text-sm font-bold transition-all relative",
              activeTab === 'source' ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Source Data
            {activeTab === 'source' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full"></div>}
          </button>
        </div>
      )}

      {/* Content Area */}
      {results && activeTab === 'results' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in slide-in-from-bottom-4 duration-500">
          {/* Issues List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Issues ({results.issues.length})
              </h2>
            </div>
            {results.issues.length > 0 ? results.issues.map((issue: any) => {
              const element = results.elements.find((e: any) => e.id === issue.targetElementId);
              return (
                <div key={issue.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start mb-3">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[10px] uppercase font-black",
                      issue.severity === 'high' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {issue.severity} priority
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono font-bold" title={issue.targetElementId}>
                      {issue.selectorHint || element?.tagName}
                    </span>
                  </div>
                  <p className="text-gray-900 font-semibold mb-2 text-sm">{issue.message}</p>
                  
                  {element?.textSample && (
                    <div className="mb-3 px-3 py-2 bg-indigo-50/30 rounded-lg border border-indigo-50 text-[11px] text-gray-500 italic">
                      "{element.textSample}..."
                    </div>
                  )}
                  
                  <div className="mt-4 p-3 bg-gray-50 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-gray-400">
                      <span>Analyzed Colors</span>
                      <span className="text-indigo-500">Contrast {issue.metrics?.contrastRatio?.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2">
                        <div className="w-5 h-5 rounded border border-gray-200" style={{ backgroundColor: issue.actualColors?.foreground }}></div>
                        <span className="text-[9px] font-mono text-gray-500">Text: {issue.actualColors?.foreground}</span>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="w-5 h-5 rounded border border-gray-200" style={{ backgroundColor: issue.actualColors?.background }}></div>
                        <span className="text-[9px] font-mono text-gray-500">Bg: {issue.actualColors?.background}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="bg-emerald-50 p-8 rounded-2xl border border-emerald-100 text-center">
                 <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
                 <p className="text-emerald-800 font-bold text-sm">No accessibility issues found!</p>
              </div>
            )}
          </div>

          {/* Recommendations */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Recommended Fixes
              </h2>
              {results.recommendations?.length > 0 && (
                <button 
                  onClick={downloadCss}
                  className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                >
                  <Download className="h-3 w-3" />
                  Download Patch
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              {results.recommendations?.length > 0 ? results.recommendations.map((rec: any, idx: number) => {
                const issue = results.issues.find((i: any) => i.id === rec.issueId);
                const isBgFix = rec.cssPatch.includes('background-color:');
                
                return (
                  <div key={idx} className="bg-white overflow-hidden rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row group hover:shadow-xl hover:shadow-gray-200 transition-all duration-300">
                    <div className="p-8 flex-1 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center gap-1">
                             <div className="w-12 h-12 rounded-2xl border-2 border-white shadow-lg flex items-center justify-center font-bold text-white text-[10px]" style={{ backgroundColor: rec.replacements[0].from }}>
                                OLD
                             </div>
                             <span className="text-[10px] font-mono font-bold text-gray-400">{rec.replacements[0].from}</span>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-300" />
                          <div className="flex flex-col items-center gap-1">
                             <div className="w-12 h-12 rounded-2xl border-2 border-white shadow-lg flex items-center justify-center font-bold text-white text-[10px]" style={{ backgroundColor: rec.replacements[0].to }}>
                                NEW
                             </div>
                             <span className="text-[10px] font-mono font-bold text-indigo-600">{rec.replacements[0].to}</span>
                          </div>
                          
                          <div className="ml-4 px-3 py-1 bg-gray-100 rounded-full text-[9px] font-black uppercase text-gray-500 tracking-wider">
                            Target: {isBgFix ? 'Background' : 'Foreground (Text)'}
                          </div>
                        </div>
                        <div className="flex gap-2 text-[9px] font-black uppercase tracking-wider">
                          <div className="bg-emerald-50 text-emerald-600 px-2 py-1.5 rounded-lg border border-emerald-100">ACC {Math.round(rec.scores.accessibility * 100)}%</div>
                          <div className="bg-indigo-50 text-indigo-600 px-2 py-1.5 rounded-lg border border-indigo-100">BRAND {Math.round(rec.scores.brandPreservation * 100)}%</div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">{rec.mode} mode</span>
                          <div className="h-px flex-1 bg-gray-50"></div>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed italic">"{rec.reason}"</p>
                      </div>

                      <div className="bg-gray-900 rounded-2xl p-4 relative group/code overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover/code:opacity-100 transition-opacity"></div>
                        <pre className="text-indigo-300 text-xs font-mono overflow-x-auto relative">
                          <code>{rec.cssPatch}</code>
                        </pre>
                        <button 
                          onClick={() => copyToClipboard(rec.cssPatch)}
                          className="absolute top-3 right-3 p-2 bg-white/10 opacity-0 group-hover/code:opacity-100 rounded-lg text-white hover:bg-white/20 transition-all flex items-center gap-1 text-[10px] font-bold"
                        >
                          <Copy className="h-3 w-3" />
                          Copy CSS
                        </button>
                      </div>
                    </div>
                    
                    <div className="md:w-48 bg-gray-50/50 p-6 flex flex-col justify-center items-center text-center border-t md:border-t-0 md:border-l border-gray-100">
                      <div className="text-4xl font-black text-indigo-600 mb-1 leading-none">{Math.round(rec.scores.overall * 100)}</div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Match Score</div>
                      <button 
                        onClick={() => copyToClipboard(rec.cssPatch)}
                        className="w-full py-3 bg-white border-2 border-gray-100 text-indigo-600 text-xs font-black rounded-xl hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
                      >
                        Apply Fix
                      </button>
                    </div>
                  </div>
                );
              }) : (
                <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8 text-gray-200" />
                  </div>
                  <h3 className="font-bold text-gray-400">No recommendations available</h3>
                  <p className="text-sm text-gray-300">Adjust strategy or brand color to see different fixes.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Source Data Tab */}
      {results && activeTab === 'source' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
               <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                 <Copy className="h-5 w-5 text-gray-400" />
                 Captured HTML
               </h3>
               <div className="bg-gray-900 rounded-3xl p-6 h-[500px] overflow-auto border border-gray-800">
                  <pre className="text-indigo-300 text-[11px] font-mono whitespace-pre-wrap leading-relaxed">
                    <code>{results.assets?.html || 'No HTML captured'}</code>
                  </pre>
               </div>
            </div>
            <div className="space-y-4">
               <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                 <Copy className="h-5 w-5 text-gray-400" />
                 Captured CSS
               </h3>
               <div className="bg-gray-900 rounded-3xl p-6 h-[500px] overflow-auto border border-gray-800">
                  <pre className="text-indigo-300 text-[11px] font-mono whitespace-pre-wrap leading-relaxed">
                    <code>{results.assets?.css || 'No CSS found in <style> tags'}</code>
                  </pre>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
