import React, { useRef, useState } from 'react';
import {
  CariFormData,
  ConfidenceLevel,
  FieldWithConfidence,
  AppSettings,
  AttachedFile,
} from '../types';
import {
  normalizePhone,
  validateEmail,
  normalizeIBAN,
  validateTaxOrTCKN,
  formatDateTurkish,
  formatIskontoOrani,
  formatCurrencyTRY,
} from '../utils/validators';
import {
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Building2,
  Users,
  CreditCard,
  Banknote,
  FileCheck2,
  PenTool,
  RotateCcw,
  Trash2,
  Save,
  Eye,
  FileDown,
  Sparkles,
  Paperclip,
  Upload,
  Download,
  Archive,
  FileText,
  Check,
} from 'lucide-react';
import { downloadSingleFile, downloadAllFilesZip } from '../utils/attachmentUtils';
import { DEFAULT_REPRESENTATIVES } from '../utils/initialFormData';

interface FormEditorProps {
  formData: CariFormData;
  settings: AppSettings;
  onChange: (updated: CariFormData) => void;
  onReAnalyze: () => void;
  onClearForm: () => void;
  onSaveDraft: () => void;
  onOpenPdfPreview: () => void;
  onGeneratePdf: () => void;
  onOpenTemsilciModal?: () => void;
  onSelectTemsilci?: (selectedTemsilci: string) => void;
}

export const FormEditor: React.FC<FormEditorProps> = ({
  formData,
  settings,
  onChange,
  onReAnalyze,
  onClearForm,
  onSaveDraft,
  onOpenPdfPreview,
  onGeneratePdf,
  onOpenTemsilciModal,
  onSelectTemsilci,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<
    'Vergi Levhası' | 'İmza Sirküsü' | 'Ticaret Sicil Gazetesi' | 'Faaliyet Belgesi' | 'Diğer'
  >('Vergi Levhası');

  // Helper to update a single key in formData
  const updateField = <K extends keyof CariFormData>(
    key: K,
    newVal: CariFormData[K]['value'],
    confidence: ConfidenceLevel = 'high'
  ) => {
    onChange({
      ...formData,
      [key]: {
        ...formData[key],
        value: newVal,
        confidence,
      },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);

    filesArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          const newDoc: AttachedFile = {
            id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl,
            category: selectedCategory,
            uploadedAt: new Date().toLocaleDateString('tr-TR'),
          };
          const currentList = formData.attachedFiles?.value || [];
          updateField('attachedFiles', [...currentList, newDoc]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (fileId: string) => {
    const currentList = formData.attachedFiles?.value || [];
    updateField('attachedFiles', currentList.filter((f) => f.id !== fileId));
  };

  // Validation Checks
  const phoneValidation = normalizePhone(formData.telefon?.value || '');
  const emailValidation = validateEmail(formData.eposta?.value || '');
  const ibanValidation = normalizeIBAN(formData.iban?.value || '');
  const taxValidation = validateTaxOrTCKN(formData.vergiNo?.value || '');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6">
      {/* Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sky-600" />
            2. Cari Hesap Açma Talep Formu Ön İzleme
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerekli düzeltmeleri yapın. Tüm alanlar düzenlenebilir durumdadır.
          </p>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 1: CARİ FİRMA BİLGİLERİ */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <h3 className="text-xs font-bold text-slate-800 tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-600" />
            1. CARİ FİRMA BİLGİLERİ
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Firma Adı */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Firma Adı / Unvanı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.firmaAdi?.value || ''}
              onChange={(e) => updateField('firmaAdi', e.target.value)}
              placeholder="Örn: ABC Spor Malzemeleri A.Ş."
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all"
            />
            {formData.firmaAdi?.options && formData.firmaAdi.options.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                <span className="text-[11px] text-amber-700 font-medium">Algılanan Seçenekler:</span>
                {formData.firmaAdi.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => updateField('firmaAdi', opt, 'high')}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs px-2 py-0.5 rounded border border-amber-300"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Vergi Dairesi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Vergi Dairesi
            </label>
            <input
              type="text"
              value={formData.vergiDairesi?.value || ''}
              onChange={(e) => updateField('vergiDairesi', e.target.value)}
              placeholder="Örn: Kadıköy"
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:border-sky-500 outline-none"
            />
          </div>

          {/* Vergi No / TCKN */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                {formData.vergiNoTuru?.value === 'TCKN' ? 'T.C. Kimlik No (11 hane)' : 'Vergi No (10 hane)'}
              </label>
              <button
                type="button"
                onClick={() =>
                  updateField(
                    'vergiNoTuru',
                    formData.vergiNoTuru?.value === 'TCKN' ? 'VKN' : 'TCKN'
                  )
                }
                className="text-[11px] text-sky-600 underline font-medium"
              >
                Tür Değiştir ({formData.vergiNoTuru?.value || 'VKN'})
              </button>
            </div>
            <input
              type="text"
              value={formData.vergiNo?.value || ''}
              onChange={(e) => updateField('vergiNo', e.target.value)}
              placeholder="Örn: 1234567890"
              className={`w-full text-sm px-3 py-2 rounded-lg border outline-none ${
                !taxValidation.isValid
                  ? 'border-red-400 bg-red-50/50 text-red-900'
                  : 'border-slate-300 focus:border-sky-500'
              }`}
            />
            {!taxValidation.isValid && taxValidation.warning && (
              <p className="text-[11px] text-red-600 mt-1">{taxValidation.warning}</p>
            )}
          </div>

          {/* Telefon */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Telefon Numarası
            </label>
            <input
              type="text"
              value={formData.telefon?.value || ''}
              onChange={(e) => updateField('telefon', e.target.value)}
              placeholder="0532 000 00 00"
              className={`w-full text-sm px-3 py-2 rounded-lg border outline-none ${
                !phoneValidation.isValid
                  ? 'border-red-400 bg-red-50/50'
                  : 'border-slate-300 focus:border-sky-500'
              }`}
            />
            {!phoneValidation.isValid && phoneValidation.warning && (
              <p className="text-[11px] text-red-600 mt-1">{phoneValidation.warning}</p>
            )}
          </div>

          {/* Faks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Faks Numarası
            </label>
            <input
              type="text"
              value={formData.faks?.value || ''}
              onChange={(e) => updateField('faks', e.target.value)}
              placeholder="0216 000 00 00"
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:border-sky-500 outline-none"
            />
          </div>

          {/* E-posta */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Firma E-posta Adresi
            </label>
            <input
              type="email"
              value={formData.eposta?.value || ''}
              onChange={(e) => updateField('eposta', e.target.value)}
              placeholder="info@firma.com"
              className={`w-full text-sm px-3 py-2 rounded-lg border outline-none ${
                !emailValidation.isValid
                  ? 'border-red-400 bg-red-50/50 text-red-900'
                  : 'border-slate-300 focus:border-sky-500'
              }`}
            />
            {!emailValidation.isValid && emailValidation.warning && (
              <p className="text-[11px] text-red-600 mt-1">{emailValidation.warning}</p>
            )}
          </div>

          {/* Firma Adresi */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Firma Açık Adresi
            </label>
            <textarea
              rows={2}
              value={formData.adres?.value || ''}
              onChange={(e) => updateField('adres', e.target.value)}
              placeholder="Örn: Esentepe Mah. Şehitler Cd. No:20 Merkez/Bolu İzzet Baysal Devlet Hastanesi Özlük Birimi"
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all resize-y min-h-[64px]"
            />
            {formData.adres?.options && formData.adres.options.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                <span className="text-[11px] text-amber-700 font-medium">Algılanan Seçenekler:</span>
                {formData.adres.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => updateField('adres', opt, 'high')}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs px-2 py-0.5 rounded border border-amber-300"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* E-Fatura ve E-Arşiv Status */}
          <div className="flex items-center space-x-6 pt-1">
            <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.eFatura?.value === true}
                onChange={(e) => updateField('eFatura', e.target.checked)}
                className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
              />
              <span>E-Fatura Mükellefi</span>
            </label>

            <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.eArsiv?.value === true}
                onChange={(e) => updateField('eArsiv', e.target.checked)}
                className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
              />
              <span>E-Arşiv Mükellefi</span>
            </label>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 2: FİRMA YETKİLİLERİ */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <h3 className="text-xs font-bold text-slate-800 tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-600" />
            2. FİRMA YETKİLİLERİ
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Şirket Yetkilisi */}
          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase border-b pb-1 text-sky-700">
              ŞİRKET YETKİLİSİ
            </h4>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Ad Soyad</label>
              <input
                type="text"
                value={formData.sirketYetkilisiAd?.value || ''}
                onChange={(e) => updateField('sirketYetkilisiAd', e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
                className="w-full text-xs p-2 rounded border border-slate-300 outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">GSM Numarası</label>
              <input
                type="text"
                value={formData.sirketYetkilisiGsm?.value || ''}
                onChange={(e) => updateField('sirketYetkilisiGsm', e.target.value)}
                placeholder="0532 000 00 00"
                className="w-full text-xs p-2 rounded border border-slate-300 outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">E-posta</label>
              <input
                type="email"
                value={formData.sirketYetkilisiEposta?.value || ''}
                onChange={(e) => updateField('sirketYetkilisiEposta', e.target.value)}
                placeholder="ahmet@firma.com"
                className="w-full text-xs p-2 rounded border border-slate-300 outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Muhasebe / Satın Alma Yetkilisi */}
          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 border-b pb-1 text-sky-700">
              MUHASEBE VEYA SATIN ALMA YETKİLİSİ
            </h4>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Ad Soyad</label>
              <input
                type="text"
                value={formData.muhasebeYetkilisiAd?.value || ''}
                onChange={(e) => updateField('muhasebeYetkilisiAd', e.target.value)}
                placeholder="Örn: Mehmet Demir"
                className="w-full text-xs p-2 rounded border border-slate-300 outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">GSM Numarası</label>
              <input
                type="text"
                value={formData.muhasebeYetkilisiGsm?.value || ''}
                onChange={(e) => updateField('muhasebeYetkilisiGsm', e.target.value)}
                placeholder="0533 000 00 00"
                className="w-full text-xs p-2 rounded border border-slate-300 outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">E-posta</label>
              <input
                type="email"
                value={formData.muhasebeYetkilisiEposta?.value || ''}
                onChange={(e) => updateField('muhasebeYetkilisiEposta', e.target.value)}
                placeholder="muhasebe@firma.com"
                className="w-full text-xs p-2 rounded border border-slate-300 outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 3: BANKA BİLGİLERİ */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <h3 className="text-xs font-bold text-slate-800 tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-sky-600" />
            3. BANKA BİLGİLERİ
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Banka Adı</label>
            <input
              type="text"
              value={formData.bankaAdi?.value || ''}
              onChange={(e) => updateField('bankaAdi', e.target.value)}
              placeholder="Örn: Ziraat Bankası, Garanti BBVA"
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:border-sky-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Şube Adı / Kodu</label>
            <input
              type="text"
              value={formData.subeAdi?.value || ''}
              onChange={(e) => updateField('subeAdi', e.target.value)}
              placeholder="Örn: Kadıköy Şubesi / 123"
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:border-sky-500 outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              IBAN Numarası (26 Haneli TR IBAN)
            </label>
            <input
              type="text"
              value={formData.iban?.value || ''}
              onChange={(e) => updateField('iban', e.target.value)}
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              className={`w-full text-sm font-mono px-3 py-2 rounded-lg border outline-none ${
                !ibanValidation.isValid
                  ? 'border-red-400 bg-red-50/50 text-red-900'
                  : 'border-slate-300 focus:border-sky-500'
              }`}
            />
            {!ibanValidation.isValid && ibanValidation.warning && (
              <p className="text-[11px] text-red-600 mt-1">{ibanValidation.warning}</p>
            )}
            {formData.iban?.options && formData.iban.options.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                <span className="text-[11px] text-amber-700 font-medium">Algılanan IBAN Seçenekleri:</span>
                {formData.iban.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => updateField('iban', opt, 'high')}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs px-2 py-0.5 rounded border border-amber-300 font-mono"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 4: ÖDEME ŞEKLİ */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <h3 className="text-xs font-bold text-slate-800 tracking-wider flex items-center gap-2">
            <Banknote className="w-4 h-4 text-sky-600" />
            4. ÖDEME ŞEKLİ VE ŞARTLARI
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-slate-200">
          <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.vadeli?.value || false}
              onChange={(e) => updateField('vadeli', e.target.checked)}
              className="w-4 h-4 text-sky-600 rounded"
            />
            <span>Vadeli Ödeme</span>
          </label>

          <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.pesin?.value || false}
              onChange={(e) => updateField('pesin', e.target.checked)}
              className="w-4 h-4 text-sky-600 rounded"
            />
            <span>Peşin</span>
          </label>

          <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.krediKarti?.value || false}
              onChange={(e) => updateField('krediKarti', e.target.checked)}
              className="w-4 h-4 text-sky-600 rounded"
            />
            <span>Kredi Kartı</span>
          </label>

          <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.cekSenet?.value || false}
              onChange={(e) => updateField('cekSenet', e.target.checked)}
              className="w-4 h-4 text-sky-600 rounded"
            />
            <span>Çek veya Senet</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Vade Süresi (Gün) - Direct Buttons */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-800">Vade Süresi (Gün)</label>
              <span className="text-[11px] text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                (Süre seçin)
              </span>
            </div>
            
            <div className="grid grid-cols-5 gap-1 p-1 bg-slate-200/80 rounded-xl border border-slate-300/80">
              {['30 Gün', '60 Gün', '90 Gün', '120 Gün', '150 Gün'].map((vadeOpt) => {
                const isSelected = (formData.vadeGunu?.value || '30 Gün') === vadeOpt;
                return (
                  <button
                    key={vadeOpt}
                    type="button"
                    onClick={() => {
                      updateField('vadeGunu', vadeOpt);
                      if (!formData.vadeli?.value) {
                        updateField('vadeli', true);
                      }
                    }}
                    className={`py-2 text-[11px] sm:text-xs font-black rounded-lg transition-all text-center flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-sky-600 text-white shadow-2xs ring-2 ring-sky-400/50'
                        : 'text-slate-700 hover:bg-white/90'
                    }`}
                  >
                    <span>{vadeOpt.replace(' Gün', 'G')}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Seçilen Vade: <span className="font-extrabold text-sky-900">{formData.vadeGunu?.value || '30 Gün'}</span>
            </p>
          </div>

          {/* İskonto Oranı */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">İskonto Oranı</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-extrabold text-xs pointer-events-none">
                %
              </span>
              <input
                type="text"
                value={formData.iskontoOrani?.value || ''}
                onChange={(e) => updateField('iskontoOrani', e.target.value)}
                placeholder="Örn: 10"
                className="w-full text-sm font-bold pl-7 pr-3 py-2 rounded-xl border border-slate-300 focus:border-sky-500 outline-none text-slate-900 bg-white"
              />
            </div>
            {formData.iskontoOrani?.value && (
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                Görünüm: <span className="font-extrabold">{formatIskontoOrani(formData.iskontoOrani.value)}</span>
              </p>
            )}
          </div>

          {/* Cari Limit */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Cari Limit (TL)</label>
            <input
              type="text"
              value={formData.cariLimit?.value || ''}
              onChange={(e) => {
                const formatted = formatCurrencyTRY(e.target.value);
                updateField('cariLimit', formatted);
              }}
              placeholder="Örn: 1.000 TL"
              className="w-full text-sm font-bold px-3 py-2 rounded-xl border border-slate-300 focus:border-sky-500 text-sky-950 bg-white outline-none shadow-2xs"
            />
            {formData.cariLimit?.value && (
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                Tutar: <span className="font-extrabold">{formData.cariLimit.value.replace(/₺/g, 'TL')}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 5: İSTENİLEN EVRAKLAR & ONAYLAR */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <h3 className="text-xs font-bold text-slate-800 tracking-wider flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-sky-600" />
            5. İSTENİLEN EVRAKLAR & TEMSİLCİ / ONAYLAR
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Temsilci Selector - Direct Tabs */}
          <div className="lg:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-sky-600" />
                <span>Temsilci Seçimi</span>
              </label>
              <span className="text-[11px] text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                (İsme tıklayarak doğrudan seçin)
              </span>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-slate-300/80 shadow-2xs">
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                {(settings.temsilciler && settings.temsilciler.length > 0
                  ? settings.temsilciler
                  : DEFAULT_REPRESENTATIVES
                ).map((rep) => {
                  const isSelected = (formData.temsilci?.value || settings.temsilci) === rep;
                  return (
                    <button
                      key={rep}
                      type="button"
                      onClick={() => {
                        updateField('temsilci', rep);
                        if (onSelectTemsilci) {
                          onSelectTemsilci(rep);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-400/50 scale-102'
                          : 'bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-800 border border-slate-200/80'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                      <span>{rep}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <span>💡 Formun sağ üst köşesinde ve alt onay kısmında seçtiğiniz temsilci görünecektir.</span>
            </p>
          </div>

          {/* Doküman Kodu / Çalışma Şekli */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-sky-600" />
                <span>Doküman Kodu / Çalışma Şekli</span>
              </label>
              <span className="text-[11px] text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                (Tıklayarak değiştirin)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-200/80 rounded-xl border border-slate-300/80">
              {[
                { code: 'Q', desc: 'Kalite Doküman Kodu' },
                { code: 'İF', desc: 'İdari Form Kodu' },
                { code: 'İ', desc: 'İthalat / İhracat Kodu' },
              ].map(({ code, desc }) => {
                const isSelected = (formData.dokumanKodu?.value || 'Q') === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => updateField('dokumanKodu', code)}
                    title={`Doküman Kodunu ${code} olarak değiştir: ${desc}`}
                    className={`py-2 text-xs font-black rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-400/50'
                        : 'text-slate-700 hover:bg-white/90'
                    }`}
                  >
                    <span>{code}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* EK BELGELER YÜKLEME VE LİSTELEME ALANI (MUHASEBE İÇİN) */}
        <div className="pt-3 border-t border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-sky-600" />
              <span>Ek Belgeler & Evrak Yükleme</span>
              <span className="text-[11px] font-normal text-slate-500">(Vergi Levhası, İmza Sirküsü vb.)</span>
            </label>
            {formData.attachedFiles?.value && formData.attachedFiles.value.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  downloadAllFilesZip(
                    formData.attachedFiles!.value,
                    formData.firmaAdi?.value || 'Cari'
                  )
                }
                className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-3 py-1 rounded-lg shadow-sm transition-all"
                title="Yüklenen Tüm Ek Belgeleri ZIP Olarak Paketleyip İndir"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Tüm Ek Belgeleri İndir (ZIP Paket)</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-3 bg-white p-2.5 rounded-xl border border-slate-200">
            <div className="sm:col-span-5">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="w-full text-xs font-semibold px-2.5 py-2 rounded-lg border border-slate-300 focus:border-sky-500 outline-none bg-slate-50 text-slate-800"
              >
                <option value="Vergi Levhası">1. Vergi Levhası</option>
                <option value="İmza Sirküsü">2. İmza Sirküsü</option>
                <option value="Ticaret Sicil Gazetesi">3. Ticaret Sicil Gazetesi</option>
                <option value="Faaliyet Belgesi">4. Faaliyet Belgesi</option>
                <option value="Diğer">5. Diğer Ek Belge</option>
              </select>
            </div>

            <div className="sm:col-span-7 flex items-center">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="attached-file-upload-input"
              />
              <label
                htmlFor="attached-file-upload-input"
                className="w-full flex items-center justify-center space-x-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-dashed border-sky-300 hover:border-sky-400 font-bold text-xs py-2 px-3 rounded-lg cursor-pointer transition-all text-center"
              >
                <Upload className="w-3.5 h-3.5 text-sky-600" />
                <span>Belge Seç / Yükle (PDF, PNG, JPG)</span>
              </label>
            </div>
          </div>

          {/* Yüklenen Dosyaların Listesi */}
          {formData.attachedFiles?.value && formData.attachedFiles.value.length > 0 ? (
            <div className="space-y-1.5">
              {formData.attachedFiles.value.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs hover:border-sky-300 transition-all"
                >
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    <span className="bg-sky-100 text-sky-800 font-bold text-[10px] px-2 py-0.5 rounded shrink-0">
                      {file.category}
                    </span>
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-800 truncate max-w-[200px] sm:max-w-[320px]">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 hidden sm:inline">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => downloadSingleFile(file)}
                      className="flex items-center space-x-1 bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] px-2.5 py-1 rounded-md transition-all shadow-2xs cursor-pointer"
                      title="Belgeyi Cihaza İndir"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>İndir</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(file.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="Belgeyi Kaldır"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic bg-white/60 p-2 rounded-lg border border-dashed border-slate-200 text-center">
              Henüz ek belge yüklenmedi. Vergi Levhası, İmza Sirküsü vb. dosyaları yukarıdan seçip ekleyebilirsiniz.
            </p>
          )}
        </div>
      </div>

      {/* ACTION BUTTONS TOOLBAR */}
      <div className="pt-4 border-t border-slate-200 flex justify-end">
        <button
          type="button"
          onClick={onGeneratePdf}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm sm:text-base px-7 py-3 rounded-2xl font-extrabold transition-all shadow-lg shadow-emerald-700/25 active:scale-98 cursor-pointer"
        >
          <FileDown className="w-5 h-5" />
          <span>PDF İndir</span>
        </button>
      </div>
    </div>
  );
};
