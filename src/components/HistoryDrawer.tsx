import React, { useState } from 'react';
import { X, Search, FileText, Trash2, Download, Clock, Paperclip, Archive } from 'lucide-react';
import { SavedRecord, AppSettings } from '../types';
import { generateCariFormPdf, getPdfFilename } from '../utils/pdfGenerator';
import { downloadAllFilesZip } from '../utils/attachmentUtils';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedRecords: SavedRecord[];
  onLoadRecord: (record: SavedRecord) => void;
  onDeleteRecord: (id: string) => void;
  settings: AppSettings;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  savedRecords,
  onLoadRecord,
  onDeleteRecord,
  settings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filtered = savedRecords.filter((rec) =>
    rec.firmaAdi.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownload = async (rec: SavedRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const pdf = await generateCariFormPdf(rec.formData, rec.settings || settings);
    const filename = getPdfFilename(rec.formData);
    pdf.save(filename);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-base">Eski Cari Kayıtları</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Firma adına göre ara..."
              className="w-full text-xs pl-9 pr-3 py-2.5 bg-white rounded-xl border border-slate-200 focus:border-sky-500 outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold">Kayıt Bulunamadı</p>
            </div>
          ) : (
            filtered.map((rec) => (
              <div
                key={rec.id}
                onClick={() => {
                  onLoadRecord(rec);
                  onClose();
                }}
                className="bg-slate-50 hover:bg-sky-50/60 border border-slate-200 hover:border-sky-300 rounded-xl p-3 cursor-pointer transition-all flex items-start justify-between group"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-sky-900">
                    {rec.firmaAdi || 'İsimsiz Firma'}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Tarih: {rec.formData.tarih?.value || rec.createdAt}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="bg-sky-100 text-sky-800 text-[10px] font-semibold px-2 py-0.5 rounded">
                      {rec.sourceType === 'image' ? 'Görsel OCR' : rec.sourceType === 'pdf' ? 'PDF Belge' : 'Düz Metin'}
                    </span>
                    {rec.formData.vergiNo?.value && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        VKN: {rec.formData.vergiNo.value}
                      </span>
                    )}
                    {rec.formData.attachedFiles?.value && rec.formData.attachedFiles.value.length > 0 && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <Paperclip className="w-3 h-3 text-emerald-600" />
                        {rec.formData.attachedFiles.value.length} Ek Belge
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  {rec.formData.attachedFiles?.value && rec.formData.attachedFiles.value.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadAllFilesZip(rec.formData.attachedFiles!.value, rec.firmaAdi || 'Cari');
                      }}
                      className="p-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg transition-colors flex items-center gap-1"
                      title="Tüm Ek Belgeleri ZIP Olarak İndir (Muhasebe)"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDownload(rec, e)}
                    className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition-colors"
                    title="PDF İndir"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRecord(rec.id);
                    }}
                    className="p-1.5 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                    title="Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
