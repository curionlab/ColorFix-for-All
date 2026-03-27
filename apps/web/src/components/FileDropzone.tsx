import React, { useCallback, useState } from 'react';
import { UploadCloud } from 'lucide-react';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
}

export default function FileDropzone({ onFileSelect, accept = 'application/pdf,image/*' }: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  return (
    <div 
      className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-colors cursor-pointer text-center ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 bg-white'}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.onchange = (e) => {
          const target = e.target as HTMLInputElement;
          if (target.files?.length) onFileSelect(target.files[0]);
        };
        input.click();
      }}
    >
      <UploadCloud className="w-16 h-16 text-blue-500 mb-4" />
      <h3 className="text-xl font-bold text-slate-800 mb-2">PDFや画像をアップロード</h3>
      <p className="text-slate-500 text-sm">ドラッグ＆ドロップ、またはクリックしてファイルを選択</p>
      <p className="text-slate-400 text-xs mt-4">※すべての処理はブラウザ内で完了し、サーバーには送信されません。</p>

      <button
        onClick={async (e) => {
          e.stopPropagation();
          const res = await fetch('/dummy.pdf');
          const blob = await res.blob();
          onFileSelect(new File([blob], 'dummy.pdf', { type: 'application/pdf' }));
        }}
        className="mt-6 px-4 py-2 bg-slate-800 text-white rounded text-sm font-bold z-50 relative"
      >
        [Debug] Auto-load dummy.pdf
      </button>

    </div>
  );
}
