import React from 'react';
import { X, Download, Printer, FileText, Archive } from 'lucide-react';
import { CariFormData, AppSettings } from '../types';
import { generateCariFormPdf, getPdfFilename } from '../utils/pdfGenerator';
import { downloadSingleFile, downloadAllFilesZip } from '../utils/attachmentUtils';
import { formatIskontoOrani } from '../utils/validators';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: CariFormData;
  settings: AppSettings;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  formData,
  settings,
}) => {
  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    const pdf = await generateCariFormPdf(formData, settings);
    const filename = getPdfFilename(formData);
    pdf.save(filename);
  };

  const handlePrint = async () => {
    const pdf = await generateCariFormPdf(formData, settings);
    pdf.autoPrint();
  };

  const attachedFiles = formData.attachedFiles?.value || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-sm sm:text-base">A4 Cari Hesap Açma Talep Formu Ön İzleme</h3>
          </div>
          <div className="flex items-center space-x-2">
            {attachedFiles.length > 0 && (
              <button
                onClick={() =>
                  downloadAllFilesZip(attachedFiles, formData.firmaAdi?.value || 'Cari')
                }
                className="hidden md:flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-all shadow-sm"
                title="Yüklenen Tüm Ek Belgeleri ZIP Olarak Paketleyip İndir"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Ek Belgeler (ZIP)</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Yazdır</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-1.5 rounded-lg font-bold transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF İndir</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: A4 Paper Representation */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 flex flex-col items-center space-y-6 bg-slate-200/80">
          {/* A4 Sheet Container */}
          <div
            id="a4-form-preview"
            className="bg-white text-slate-900 w-full max-w-[794px] min-h-[1080px] p-6 sm:p-8 shadow-xl rounded-sm border border-slate-300 text-xs flex flex-col justify-between font-sans relative"
          >
            <div>
              {/* Header */}
              <div className="border border-slate-900 rounded-sm p-3 mb-4 bg-slate-50 flex items-center justify-between relative">
                {/* Doküman Kodu Top Right */}
                <span className="absolute top-1 right-2 text-[10px] font-bold text-slate-500 font-mono">
                  {formData.dokumanKodu?.value || settings.dokumanKodu || 'Q'}
                </span>

                {/* Left Logo */}
                <div className="bg-slate-900 text-white px-3 py-3 rounded text-center w-32 shrink-0 flex items-center justify-center">
                  <div className="font-black text-sm tracking-wider">CRS SPOR</div>
                </div>

                {/* Center Title & Form Date */}
                <div className="text-center flex-1 px-2">
                  <h1 className="font-extrabold text-xs sm:text-sm tracking-tight text-slate-900 uppercase">
                    TEDARİKÇİ / CARİ HESAP AÇMA TALEP FORMU
                  </h1>
                  <div className="mt-1 text-xs font-bold text-slate-700">
                    Form Tarihi: {formData.tarih?.value || new Date().toLocaleDateString('tr-TR')}
                  </div>
                </div>

                {/* Right Agent Box */}
                <div className="border border-slate-900 rounded w-32 text-center overflow-hidden shrink-0 flex flex-col justify-between">
                  <div className="bg-slate-800 text-white font-bold text-[9px] py-0.5 text-center">TEMSİLCİ</div>
                  <div className="font-extrabold text-xs py-2 text-slate-900 text-center flex items-center justify-center flex-1">
                    {formData.temsilci?.value || settings.temsilci || '-'}
                  </div>
                </div>
              </div>

              {/* Main Title Banner */}
              <div className="bg-slate-900 text-white font-bold text-xs px-3 py-1.5 mb-2 tracking-wider">
                CARİ FİRMA BİLGİLERİ
              </div>

              {/* Table 1: Cari Firma Bilgileri */}
              <div className="border border-slate-300 rounded-sm overflow-hidden mb-4 text-[11px]">
                <div className="grid grid-cols-4 border-b border-slate-200">
                  <div className="bg-slate-100 font-bold p-1.5 border-r border-slate-200">Firma Adı</div>
                  <div className="p-1.5 border-r border-slate-200 col-span-1 font-semibold">{formData.firmaAdi?.value || '-'}</div>
                  <div className="bg-slate-100 font-bold p-1.5 border-r border-slate-200">Telefon</div>
                  <div className="p-1.5">{formData.telefon?.value || '-'}</div>
                </div>
                <div className="grid grid-cols-4 border-b border-slate-200">
                  <div className="bg-slate-100 font-bold p-1.5 border-r border-slate-200">Vergi Dairesi</div>
                  <div className="p-1.5 border-r border-slate-200">{formData.vergiDairesi?.value || '-'}</div>
                  <div className="bg-slate-100 font-bold p-1.5 border-r border-slate-200">Faks Numarası</div>
                  <div className="p-1.5">{formData.faks?.value || '-'}</div>
                </div>
                <div className="grid grid-cols-4 border-b border-slate-200">
                  <div className="bg-slate-100 font-bold p-1.5 border-r border-slate-200">
                    {formData.vergiNoTuru?.value === 'TCKN' ? 'T.C. Kimlik No' : 'Vergi No'}
                  </div>
                  <div className="p-1.5 border-r border-slate-200 font-mono font-bold">{formData.vergiNo?.value || '-'}</div>
                  <div className="bg-slate-100 font-bold p-1.5 border-r border-slate-200">E-Posta</div>
                  <div className="p-1.5">{formData.eposta?.value || '-'}</div>
                </div>
                <div className="grid grid-cols-4">
                  <div className="bg-slate-100 font-bold p-1.5 border-r border-slate-200">E-Fatura Durumu</div>
                  <div className="p-1.5 border-r border-slate-200">
                    <div className="flex items-center space-x-3 text-slate-800">
                      <div className="flex items-center space-x-1">
                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${formData.eFatura?.value === true ? 'bg-sky-600 border-sky-600 text-white font-bold text-[10px]' : 'border-slate-400 bg-white'}`}>
                          {formData.eFatura?.value === true && '✓'}
                        </span>
                        <span>Evet</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${formData.eFatura?.value === false ? 'bg-sky-600 border-sky-600 text-white font-bold text-[10px]' : 'border-slate-400 bg-white'}`}>
                          {formData.eFatura?.value === false && '✓'}
                        </span>
                        <span>Hayır</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-100 font-bold p-1.5 border-r border-slate-200">E-Arşiv Durumu</div>
                  <div className="p-1.5">
                    <div className="flex items-center space-x-3 text-slate-800">
                      <div className="flex items-center space-x-1">
                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${formData.eArsiv?.value === true ? 'bg-sky-600 border-sky-600 text-white font-bold text-[10px]' : 'border-slate-400 bg-white'}`}>
                          {formData.eArsiv?.value === true && '✓'}
                        </span>
                        <span>Evet</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${formData.eArsiv?.value === false ? 'bg-sky-600 border-sky-600 text-white font-bold text-[10px]' : 'border-slate-400 bg-white'}`}>
                          {formData.eArsiv?.value === false && '✓'}
                        </span>
                        <span>Hayır</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Title 2: Firma Yetkilileri */}
              <div className="bg-slate-900 text-white font-bold text-xs px-3 py-1.5 mb-2 tracking-wider">
                FİRMA YETKİLİLERİ
              </div>
              <div className="border border-slate-300 rounded-sm overflow-hidden mb-4 text-[11px]">
                <div className="grid grid-cols-2 bg-slate-200 font-bold text-slate-800 border-b border-slate-300 p-1">
                  <div>ŞİRKET YETKİLİSİ</div>
                  <div>MUHASEBE / SATIN ALMA YETKİLİSİ</div>
                </div>
                <div className="grid grid-cols-4 border-b border-slate-200">
                  <div className="bg-slate-100 font-bold p-1.5 border-r border-slate-200">Adı Soyadı</div>
                  <div className="p-1.5 border-r border-slate-200">{formData.sirketYetkilisiAd?.value || '-'}</div>
                  <div className="bg-slate-100 font-bold p-1.5 border-r border-slate-200">Adı Soyadı</div>
                  <div className="p-1.5">{formData.muhasebeYetkilisiAd?.value || '-'}</div>
                </div>
                <div className="grid grid-cols-4 border-b border-slate-200">
                  <div className="bg-slate-100 font-bold p-1.5 border-r border-slate-200">GSM No</div>
                  <div className="p-1.5 border-r border-slate-200">{formData.sirketYetkilisiGsm?.value || '-'}</div>
                  <div className="bg-slate-100 font-bold p-1.5 border-r border-slate-200">GSM No</div>
                  <div className="p-1.5">{formData.muhasebeYetkilisiGsm?.value || '-'}</div>
                </div>
                <div className="grid grid-cols-4">
                  <div className="bg-slate-100 font-bold p-1.5 border-r border-slate-200">E-Posta</div>
                  <div className="p-1.5 border-r border-slate-200">{formData.sirketYetkilisiEposta?.value || '-'}</div>
                  <div className="bg-slate-100 font-bold p-1.5 border-r border-slate-200">E-Posta</div>
                  <div className="p-1.5">{formData.muhasebeYetkilisiEposta?.value || '-'}</div>
                </div>
              </div>

              {/* Title 3: Banka Bilgileri */}
              <div className="bg-slate-900 text-white font-bold text-xs px-3 py-1.5 mb-2 tracking-wider">
                BANKA BİLGİLERİ
              </div>
              <div className="border border-slate-300 rounded-sm overflow-hidden mb-4 text-[11px]">
                <div className="grid grid-cols-4 border-b border-slate-200">
                  <div className="bg-slate-100 font-bold p-1.5 border-r border-slate-200">Banka Adı</div>
                  <div className="p-1.5 border-r border-slate-200">{formData.bankaAdi?.value || '-'}</div>
                  <div className="bg-slate-100 font-bold p-1.5 border-r border-slate-200">Şube Adı / Kodu</div>
                  <div className="p-1.5">{formData.subeAdi?.value || '-'}</div>
                </div>
                <div className="grid grid-cols-4">
                  <div className="bg-slate-100 font-bold p-1.5 border-r border-slate-200">IBAN Numarası</div>
                  <div className="p-1.5 col-span-3 font-mono font-bold text-sky-900">{formData.iban?.value || '-'}</div>
                </div>
              </div>

              {/* Title 4: Ödeme Şekli */}
              <div className="bg-slate-900 text-white font-bold text-xs px-3 py-1.5 mb-2 tracking-wider">
                ÖDEME ŞEKLİ
              </div>
              <div className="border border-slate-300 rounded-sm p-3 mb-4 text-[11px] space-y-2 bg-slate-50">
                <div className="flex flex-wrap gap-5 font-semibold text-slate-800">
                  <div className="flex items-center space-x-1.5">
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${formData.vadeli?.value ? 'bg-sky-600 border-sky-600 text-white font-bold text-[10px]' : 'border-slate-400 bg-white'}`}>
                      {formData.vadeli?.value && '✓'}
                    </span>
                    <span>Vadeli Ödeme {formData.vadeli?.value && formData.vadeGunu?.value ? `(${formData.vadeGunu.value})` : ''}</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${formData.pesin?.value ? 'bg-sky-600 border-sky-600 text-white font-bold text-[10px]' : 'border-slate-400 bg-white'}`}>
                      {formData.pesin?.value && '✓'}
                    </span>
                    <span>Peşin</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${formData.krediKarti?.value ? 'bg-sky-600 border-sky-600 text-white font-bold text-[10px]' : 'border-slate-400 bg-white'}`}>
                      {formData.krediKarti?.value && '✓'}
                    </span>
                    <span>Kredi Kartı</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${formData.cekSenet?.value ? 'bg-sky-600 border-sky-600 text-white font-bold text-[10px]' : 'border-slate-400 bg-white'}`}>
                      {formData.cekSenet?.value && '✓'}
                    </span>
                    <span>Çek / Senet</span>
                  </div>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 text-slate-700">
                  <span>İskonto Oranı: <strong>{formatIskontoOrani(formData.iskontoOrani?.value)}</strong></span>
                  <span>Cari Limit: <strong className="text-sky-900 font-bold text-xs">{formData.cariLimit?.value || '-'}</strong></span>
                </div>
              </div>

              {/* Title 5: İstenilen Evraklar & Yüklenen Ek Belgeler */}
              <div className="bg-slate-900 text-white font-bold text-xs px-3 py-1.5 mb-2 tracking-wider">
                İSTENİLEN EVRAKLAR & YÜKLENEN BELGELER
              </div>
              <div className="border border-slate-300 rounded-sm p-2.5 mb-4 text-[11px] bg-slate-50 space-y-2">
                {attachedFiles.length > 0 ? (
                  <div>
                    <div className="text-emerald-800 font-bold text-[10px] uppercase mb-1.5 flex items-center justify-between">
                      <span>YÜKLENEN EK BELGELER:</span>
                      <span className="text-[10px] text-emerald-600 font-normal">(Aşağıdaki butonlara basarak dosyaları indirebilirsiniz)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
                      {attachedFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between bg-white p-1.5 rounded border border-emerald-200 shadow-2xs">
                          <div className="flex items-center space-x-1.5 overflow-hidden">
                            <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-1.5 py-0.5 rounded shrink-0">
                              {file.category}
                            </span>
                            <span className="font-semibold text-slate-800 truncate text-[11px] max-w-[150px] sm:max-w-[200px]">
                              {file.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => downloadSingleFile(file)}
                            className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2 py-1 rounded transition-all cursor-pointer shrink-0 ml-1 shadow-2xs"
                            title="Dosyayı İndir"
                          >
                            <Download className="w-3 h-3" />
                            <span>İndir</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-rose-600 font-bold text-xs py-0.5">
                    Evrak eklenmedi
                  </div>
                )}
              </div>

              {/* Approval Boxes */}
              <div className="grid grid-cols-3 gap-3 mb-2">
                <div className="border border-slate-300 rounded-sm overflow-hidden h-24">
                  <div className="bg-slate-800 text-white text-[10px] font-bold p-1 text-center">FİRMA KAŞE / İMZA</div>
                  <div className="p-2 text-center text-slate-400 italic text-[10px] pt-6">(İmza / Kaşe Alanı)</div>
                </div>

                <div className="border border-slate-300 rounded-sm overflow-hidden h-24">
                  <div className="bg-slate-800 text-white text-[10px] font-bold p-1 text-center">PAZARLAMA ONAYI</div>
                  <div className="p-2 text-center text-slate-400 italic text-[10px] pt-6">(Onay / İmza Alanı)</div>
                </div>

                <div className="border border-slate-300 rounded-sm overflow-hidden h-24">
                  <div className="bg-slate-800 text-white text-[10px] font-bold p-1 text-center">MUHASEBE ONAYI</div>
                  <div className="p-2 text-center text-slate-400 italic text-[10px] pt-6">(Onay / İmza Alanı)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Pages for Attached Images (if any) */}
          {attachedFiles.map(
            (file, idx) =>
              file.dataUrl &&
              file.dataUrl.startsWith('data:image/') && (
                <div
                  key={file.id}
                  className="w-[210mm] min-h-[297mm] bg-white text-slate-900 font-sans border border-slate-300 p-[12mm] shadow-lg flex flex-col justify-start relative text-[12px] print:shadow-none print:border-none uppercase"
                >
                  <div className="bg-slate-900 text-white font-bold text-xs p-2.5 mb-4 flex justify-between items-center">
                    <span>EK BELGE {idx + 1}: {file.category}</span>
                    <span className="text-[10px] font-normal text-slate-300">{file.name}</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center border border-dashed border-slate-300 p-2 rounded bg-slate-50">
                    <img
                      src={file.dataUrl}
                      alt={file.name}
                      className="max-w-full max-h-[240mm] object-contain rounded"
                    />
                  </div>
                </div>
              )
          )}
        </div>
      </div>
    </div>
  );
};
