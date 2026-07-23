import React, { useState, useRef } from 'react';
import { Upload, FileText, Camera, Image, Sparkles, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface UploadSectionProps {
  onAnalyze: (fileData?: { base64: string; mimeType: string; fileName: string } | null, textContent?: string) => Promise<void>;
  isAnalyzing: boolean;
  error?: string | null;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onAnalyze,
  isAnalyzing,
  error,
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [pastedText, setPastedText] = useState('');
  const [selectedFile, setSelectedFile] = useState<{
    file: File;
    previewUrl?: string;
    base64: string;
    mimeType: string;
  } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    if (!file) return;

    const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/png');
    const reader = new FileReader();

    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setSelectedFile({
        file,
        previewUrl: file.type.startsWith('image/') ? base64 : undefined,
        base64,
        mimeType,
      });
    };

    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleStartAnalysis = async () => {
    if (activeTab === 'file' && selectedFile) {
      await onAnalyze({
        base64: selectedFile.base64,
        mimeType: selectedFile.mimeType,
        fileName: selectedFile.file.name,
      });
    } else if (activeTab === 'text' && pastedText.trim()) {
      await onAnalyze(null, pastedText);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-5 mb-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-600" />
            1. Belge / Mesaj Yükleyin veya Yapıştırın
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            WhatsApp yazışması, e-posta, vergi levhası veya dekont. Yapıştırılan bilgiler Cari Firma Bilgilerine aktarılır.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="bg-slate-100 p-1 rounded-xl flex space-x-1">
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'file'
                ? 'bg-white text-sky-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5 inline mr-1.5" />
            Dosya / Görsel
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'text'
                ? 'bg-white text-sky-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 inline mr-1.5" />
            Metin Yapıştır
          </button>
        </div>
      </div>

      {activeTab === 'file' ? (
        <div>
          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-sky-500 bg-sky-50/70 scale-[0.99]'
                : selectedFile
                ? 'border-emerald-400 bg-emerald-50/30'
                : 'border-slate-300 hover:border-sky-400 hover:bg-slate-50/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
              }}
            />

            {selectedFile ? (
              <div className="flex flex-col items-center">
                {selectedFile.previewUrl ? (
                  <img
                    src={selectedFile.previewUrl}
                    alt="Ön İzleme"
                    className="max-h-36 rounded-lg shadow-sm border border-slate-200 mb-3 object-contain"
                  />
                ) : (
                  <div className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center text-sky-600 mb-3">
                    <FileText className="w-8 h-8" />
                  </div>
                )}
                <div className="flex items-center space-x-2 text-emerald-700 font-bold text-sm mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{selectedFile.file.name}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {(selectedFile.file.size / 1024 / 1024).toFixed(2)} MB • Değiştirmek için tıklayın
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">
                    Sürükleyip bırakın veya <span className="text-sky-600 underline">dosya seçin</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    WhatsApp Ekran Görüntüsü, E-posta, PNG, JPG, JPEG veya PDF (Maks. 20 MB)
                  </p>
                </div>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      cameraInputRef.current?.click();
                    }}
                    className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-200 font-medium transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-sky-600" />
                    <span>Kamera ile Çek</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Gelen WhatsApp / E-posta / Mesaj Metnini Buraya Yapıştırın:
          </label>
          <textarea
            rows={5}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Örnek: Merhaba, ABC Spor Ltd. Şti. için cari açılış talep ediyoruz. Vergi Dairesi: Kadıköy, Vergi No: 1234567890, Telefon: 0532 111 22 33, IBAN: TR12 0006 2000 0000 0000 0000 00..."
            className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-slate-800 placeholder:text-slate-400"
          />
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Progress / Loading Indicator */}
      {isAnalyzing && (
        <div className="mt-4 p-4 bg-sky-50 border border-sky-200 rounded-xl">
          <div className="flex items-center space-x-3 mb-2">
            <Loader2 className="w-5 h-5 text-sky-600 animate-spin" />
            <span className="text-xs font-bold text-sky-900">
              Yapay Zeka Görseli Okuyor & Cari Bilgilerini Analiz Ediyor...
            </span>
          </div>
          <div className="w-full bg-sky-200 rounded-full h-1.5 overflow-hidden">
            <div className="bg-sky-600 h-1.5 rounded-full animate-pulse w-3/4"></div>
          </div>
        </div>
      )}

      {/* Submit Action Button */}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={isAnalyzing || (activeTab === 'file' ? !selectedFile : !pastedText.trim())}
          onClick={handleStartAnalysis}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md shadow-sky-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analiz Ediliyor...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Bilgileri Analiz Et & Formu Doldur</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
