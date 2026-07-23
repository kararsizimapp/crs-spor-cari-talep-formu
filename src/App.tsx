import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UploadSection } from './components/UploadSection';
import { FormEditor } from './components/FormEditor';
import { PdfPreviewModal } from './components/PdfPreviewModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { TemsilciModal } from './components/TemsilciModal';

import { CariFormData, AppSettings, SavedRecord } from './types';
import { DEFAULT_SETTINGS, DEFAULT_REPRESENTATIVES, createEmptyFormData } from './utils/initialFormData';
import { generateCariFormPdf, getPdfFilename } from './utils/pdfGenerator';
import { normalizePhone, normalizeIBAN, formatDateTurkish } from './utils/validators';
import { Check, Info } from 'lucide-react';

export default function App() {
  // Settings State with auto-migration/cleanup of old values
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('crs_app_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // If old representative list contains 7MUSTAFA or is missing representatives, reset to DEFAULT_REPRESENTATIVES
        if (
          !parsed.temsilciler ||
          parsed.temsilciler.includes('7MUSTAFA') ||
          parsed.temsilciler.length !== DEFAULT_REPRESENTATIVES.length
        ) {
          parsed.temsilciler = DEFAULT_REPRESENTATIVES;
        }
        if (!parsed.temsilci || parsed.temsilci === '7MUSTAFA' || !DEFAULT_REPRESENTATIVES.includes(parsed.temsilci)) {
          parsed.temsilci = 'Mustafa Can';
        }
        if (parsed.cariLimit === '50.000,00 TL' || parsed.cariLimit === '50.000 TL' || parsed.cariLimit === '0 TL') {
          parsed.cariLimit = '';
        }
        return { ...DEFAULT_SETTINGS, ...parsed };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Current Form State
  const [formData, setFormData] = useState<CariFormData>(() => createEmptyFormData(settings));

  // Current Source Data (for Left Column Preview)
  const [sourceData, setSourceData] = useState<{
    type: 'image' | 'pdf' | 'text';
    content: string;
    fileName?: string;
  } | null>(null);

  // Saved Records History State
  const [savedRecords, setSavedRecords] = useState<SavedRecord[]>(() => {
    const saved = localStorage.getItem('crs_saved_records');
    if (!saved) return [];
    try {
      const parsed: SavedRecord[] = JSON.parse(saved);
      // Clean out test records with old '7MUSTAFA' representative
      return parsed.filter((r) => r.formData?.temsilci?.value !== '7MUSTAFA');
    } catch (e) {
      return [];
    }
  });

  // UI Modals & State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isTemsilciModalOpen, setIsTemsilciModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Save Settings to LocalStorage
  useEffect(() => {
    localStorage.setItem('crs_app_settings', JSON.stringify(settings));
  }, [settings]);

  // Save Records to LocalStorage
  useEffect(() => {
    localStorage.setItem('crs_saved_records', JSON.stringify(savedRecords));
  }, [savedRecords]);

  // Show Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Switch Active Representative
  const handleSelectTemsilci = (selectedTemsilci: string, updatedList?: string[]) => {
    const updatedSettings: AppSettings = {
      ...settings,
      temsilci: selectedTemsilci,
      temsilciler: updatedList || settings.temsilciler,
    };
    setSettings(updatedSettings);

    // Update current form data representative value immediately
    setFormData((prev) => ({
      ...prev,
      temsilci: { value: selectedTemsilci, confidence: 'high' },
    }));

    showToast(`Aktif Temsilci '${selectedTemsilci}' olarak değiştirildi!`);
  };

  // Reset Counter for UploadSection
  const [resetKey, setResetKey] = useState(0);

  // Reset Form for a Brand New Record
  const handleNewRecord = () => {
    const newEmptyForm = createEmptyFormData(settings);
    setFormData(newEmptyForm);
    setSourceData(null);
    setAnalysisError(null);
    setResetKey((prev) => prev + 1);
    showToast('Yeni kayıt için form ve yüklenen belge temizlendi!');
  };

  // Perform AI Analysis via Server API (/api/analyze)
  const handleAnalyze = async (
    fileData?: { base64: string; mimeType: string; fileName: string } | null,
    textContent?: string
  ) => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      if (fileData) {
        const isPdf = fileData.mimeType === 'application/pdf' || fileData.fileName.endsWith('.pdf');
        setSourceData({
          type: isPdf ? 'pdf' : 'image',
          content: fileData.base64,
          fileName: fileData.fileName,
        });
      } else if (textContent) {
        setSourceData({
          type: 'text',
          content: textContent,
        });
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: fileData?.base64,
          mimeType: fileData?.mimeType,
          textContent,
        }),
      });

      const responseText = await response.text();
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('Non-JSON server response:', responseText);
        throw new Error(
          'Sunucudan beklenmeyen bir yanıt alındı. Lütfen görsel boyutunu küçültüp veya metni kontrol edip tekrar deneyiniz.'
        );
      }

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result?.error || `Sunucu hatası (${response.status}). Lütfen tekrar deneyin.`);
      }

      const raw = result.data;

      // Merge and sanitize extracted data into CariFormData with confidence scores
      const merged: CariFormData = {
        firmaAdi: raw.firmaAdi || { value: '', confidence: 'high' },
        vergiDairesi: raw.vergiDairesi || { value: '', confidence: 'high' },
        vergiNo: raw.vergiNo || { value: '', confidence: 'high' },
        vergiNoTuru: raw.vergiNoTuru || { value: 'VKN', confidence: 'high' },
        telefon: raw.telefon
          ? {
              ...raw.telefon,
              value: normalizePhone(raw.telefon.value).formatted || raw.telefon.value,
            }
          : { value: '', confidence: 'high' },
        faks: raw.faks || { value: '', confidence: 'high' },
        eposta: raw.eposta || { value: '', confidence: 'high' },
        adres: raw.adres || { value: '', confidence: 'high' },
        eFatura: raw.eFatura || { value: null, confidence: 'high' },
        eArsiv: raw.eArsiv || { value: null, confidence: 'high' },

        sirketYetkilisiAd: raw.sirketYetkilisiAd || { value: '', confidence: 'high' },
        sirketYetkilisiGsm: raw.sirketYetkilisiGsm
          ? {
              ...raw.sirketYetkilisiGsm,
              value: normalizePhone(raw.sirketYetkilisiGsm.value).formatted || raw.sirketYetkilisiGsm.value,
            }
          : { value: '', confidence: 'high' },
        sirketYetkilisiEposta: raw.sirketYetkilisiEposta || { value: '', confidence: 'high' },

        muhasebeYetkilisiAd: raw.muhasebeYetkilisiAd || { value: '', confidence: 'high' },
        muhasebeYetkilisiGsm: raw.muhasebeYetkilisiGsm
          ? {
              ...raw.muhasebeYetkilisiGsm,
              value: normalizePhone(raw.muhasebeYetkilisiGsm.value).formatted || raw.muhasebeYetkilisiGsm.value,
            }
          : { value: '', confidence: 'high' },
        muhasebeYetkilisiEposta: raw.muhasebeYetkilisiEposta || { value: '', confidence: 'high' },

        bankaAdi: raw.bankaAdi || { value: '', confidence: 'high' },
        subeAdi: raw.subeAdi || { value: '', confidence: 'high' },
        iban: raw.iban
          ? {
              ...raw.iban,
              value: normalizeIBAN(raw.iban.value).formatted || raw.iban.value,
            }
          : { value: '', confidence: 'high' },

        vadeli: raw.vadeli || { value: false, confidence: 'high' },
        vadeGunu: raw.vadeGunu || { value: '30 Gün', confidence: 'high' },
        pesin: raw.pesin || { value: false, confidence: 'high' },
        krediKarti: raw.krediKarti || { value: false, confidence: 'high' },
        cekSenet: raw.cekSenet || { value: false, confidence: 'high' },
        iskontoOrani: raw.iskontoOrani || { value: '', confidence: 'high' },
        cariLimit: raw.cariLimit?.value ? raw.cariLimit : { value: settings.cariLimit, confidence: 'high' },

        evraklar: { value: ['1- Vergi Levhası', '2- İmza Sirküsü'], confidence: 'high' },

        temsilci: raw.temsilci?.value ? raw.temsilci : { value: settings.temsilci, confidence: 'high' },
        tarih: { value: formatDateTurkish(raw.tarih?.value), confidence: 'high' },
        kaseImzaVar: raw.kaseImzaVar || { value: false, confidence: 'high' },
        pazarlamaOnay: { value: false, confidence: 'high' },
        muhasebeOnay: { value: false, confidence: 'high' },
        aciklama: raw.aciklama || { value: '', confidence: 'high' },
      };

      setFormData(merged);
      showToast('Yapay zeka verileri başarıyla analiz etti ve forma doldurdu!');
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err.message || 'Analiz sırasında bir hata oluştu.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Re-Analyze current source
  const handleReAnalyze = () => {
    if (!sourceData) {
      setAnalysisError('Lütfen önce bir dosya yükleyin veya metin girin.');
      return;
    }
    if (sourceData.type === 'text') {
      handleAnalyze(null, sourceData.content);
    } else {
      handleAnalyze({
        base64: sourceData.content,
        mimeType: sourceData.type === 'pdf' ? 'application/pdf' : 'image/png',
        fileName: sourceData.fileName || 'belge',
      });
    }
  };

  // Clear Form
  const handleClearForm = () => {
    setFormData(createEmptyFormData(settings));
    setSourceData(null);
    setAnalysisError(null);
    setResetKey((prev) => prev + 1);
    showToast('Form ve kaynak temizlendi.');
  };

  // Save Draft Record
  const handleSaveDraft = () => {
    const newRecord: SavedRecord = {
      id: Date.now().toString(),
      createdAt: new Date().toLocaleDateString('tr-TR'),
      firmaAdi: formData.firmaAdi?.value || 'İsimsiz Firma',
      formData,
      sourceType: sourceData?.type || 'text',
      sourceData: sourceData?.content,
      settings,
    };

    setSavedRecords((prev) => [newRecord, ...prev]);
    showToast('Taslak kayıtlarına başarıyla eklendi!');
  };

  // Generate & Download PDF Directly
  const handleGeneratePdf = async () => {
    const pdf = await generateCariFormPdf(formData, settings);
    const filename = getPdfFilename(formData);
    pdf.save(filename);
    showToast(`${filename} indirildi!`);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* App Header */}
      <Header
        settings={settings}
        onNewRecord={handleNewRecord}
        onOpenHistory={() => setIsHistoryOpen(true)}
        savedCount={savedRecords.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Upload & Paste Section */}
        <UploadSection
          key={resetKey}
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
          error={analysisError}
        />

        {/* Main Form Editor - Always Full Width */}
        <div className="w-full">
          <FormEditor
            formData={formData}
            settings={settings}
            onChange={setFormData}
            onReAnalyze={handleReAnalyze}
            onClearForm={handleNewRecord}
            onSaveDraft={handleSaveDraft}
            onOpenPdfPreview={() => setIsPdfPreviewOpen(true)}
            onGeneratePdf={handleGeneratePdf}
            onOpenTemsilciModal={() => setIsTemsilciModalOpen(true)}
            onSelectTemsilci={handleSelectTemsilci}
          />
        </div>
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Temsilci Login & Role Modal */}
      <TemsilciModal
        isOpen={isTemsilciModalOpen}
        onClose={() => setIsTemsilciModalOpen(false)}
        settings={settings}
        onSelectTemsilci={handleSelectTemsilci}
      />

      {/* Live A4 PDF Preview Modal */}
      <PdfPreviewModal
        isOpen={isPdfPreviewOpen}
        onClose={() => setIsPdfPreviewOpen(false)}
        formData={formData}
        settings={settings}
      />

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        savedRecords={savedRecords}
        onLoadRecord={(rec) => {
          setFormData(rec.formData);
          if (rec.sourceData && rec.sourceType) {
            setSourceData({
              type: rec.sourceType,
              content: rec.sourceData,
            });
          }
          showToast(`${rec.firmaAdi} kaydı yüklendi.`);
        }}
        onDeleteRecord={(id) => {
          setSavedRecords((prev) => prev.filter((r) => r.id !== id));
          showToast('Kayıt silindi.');
        }}
        settings={settings}
      />
    </div>
  );
}
