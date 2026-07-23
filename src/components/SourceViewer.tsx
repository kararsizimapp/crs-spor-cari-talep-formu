import React, { useState } from 'react';
import { Eye, FileText, ZoomIn, ZoomOut, Maximize2, Image as ImageIcon } from 'lucide-react';

interface SourceViewerProps {
  sourceData?: {
    type: 'image' | 'pdf' | 'text';
    content: string; // base64 URL or plain text
    fileName?: string;
  } | null;
}

export const SourceViewer: React.FC<SourceViewerProps> = ({ sourceData }) => {
  const [zoom, setZoom] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);

  if (!sourceData) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col h-full min-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-center space-x-2">
          <Eye className="w-4 h-4 text-sky-600" />
          <h3 className="text-sm font-bold text-slate-800">
            Kaynak Belge / Mesaj Ön İzleme
          </h3>
        </div>

        {sourceData.type === 'image' && (
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded"
              title="Uzaklaştır"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-500 px-1">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded"
              title="Yakınlaştır"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Content Container */}
      <div className="flex-1 bg-slate-900/5 rounded-xl overflow-auto p-3 flex items-center justify-center relative min-h-[400px]">
        {sourceData.type === 'image' ? (
          <div className="overflow-auto max-h-[600px] w-full flex items-center justify-center">
            <img
              src={sourceData.content}
              alt="Kaynak Görsel"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
              className="max-w-full rounded-lg shadow-md transition-transform duration-150"
            />
          </div>
        ) : sourceData.type === 'pdf' ? (
          <iframe
            src={sourceData.content}
            className="w-full h-[550px] rounded-lg border border-slate-200"
            title="PDF Ön İzleme"
          />
        ) : (
          <div className="w-full h-full p-4 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 font-mono whitespace-pre-wrap overflow-y-auto max-h-[550px]">
            {sourceData.content}
          </div>
        )}
      </div>
    </div>
  );
};
