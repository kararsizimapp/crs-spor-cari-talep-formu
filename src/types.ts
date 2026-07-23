export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  category: 'Vergi Levhası' | 'İmza Sirküsü' | 'Ticaret Sicil Gazetesi' | 'Faaliyet Belgesi' | 'Diğer';
  uploadedAt: string;
}

export interface FieldWithConfidence<T = string> {
  value: T;
  confidence: ConfidenceLevel;
  note?: string;
  options?: string[]; // Multiple choice options if AI detected ambiguity
}

export interface CariFormData {
  // 1. Cari Firma Bilgileri
  firmaAdi: FieldWithConfidence<string>;
  vergiDairesi: FieldWithConfidence<string>;
  vergiNo: FieldWithConfidence<string>; // 10 digits Tax or 11 digits TC
  vergiNoTuru: FieldWithConfidence<'VKN' | 'TCKN'>;
  telefon: FieldWithConfidence<string>;
  faks: FieldWithConfidence<string>;
  eposta: FieldWithConfidence<string>;
  adres?: FieldWithConfidence<string>;
  eFatura: FieldWithConfidence<boolean | null>;
  eArsiv: FieldWithConfidence<boolean | null>;

  // 2. Firma Yetkilileri
  sirketYetkilisiAd: FieldWithConfidence<string>;
  sirketYetkilisiGsm: FieldWithConfidence<string>;
  sirketYetkilisiEposta: FieldWithConfidence<string>;
  muhasebeYetkilisiAd: FieldWithConfidence<string>;
  muhasebeYetkilisiGsm: FieldWithConfidence<string>;
  muhasebeYetkilisiEposta: FieldWithConfidence<string>;

  // 3. Banka Bilgileri
  bankaAdi: FieldWithConfidence<string>;
  subeAdi: FieldWithConfidence<string>;
  iban: FieldWithConfidence<string>;

  // 4. Ödeme Şekli
  vadeli: FieldWithConfidence<boolean>;
  vadeGunu: FieldWithConfidence<string>;
  pesin: FieldWithConfidence<boolean>;
  krediKarti: FieldWithConfidence<boolean>;
  cekSenet: FieldWithConfidence<boolean>;
  iskontoOrani: FieldWithConfidence<string>;
  cariLimit: FieldWithConfidence<string>;

  // 5. İstenilen Evraklar
  evraklar: FieldWithConfidence<string[]>;
  attachedFiles?: FieldWithConfidence<AttachedFile[]>;

  // 6, 7, 8 & Diğer
  temsilci: FieldWithConfidence<string>;
  dokumanKodu: FieldWithConfidence<string>;
  tarih: FieldWithConfidence<string>;
  kaseImzaVar: FieldWithConfidence<boolean>;
  pazarlamaOnay: FieldWithConfidence<boolean>;
  muhasebeOnay: FieldWithConfidence<boolean>;
  aciklama: FieldWithConfidence<string>;
}

export interface AppSettings {
  temsilci: string;
  temsilciler: string[];
  cariLimit: string;
  website: string;
  gonderimEpostasi: string;
  dokumanKodu: string;
}

export interface SavedRecord {
  id: string;
  createdAt: string;
  firmaAdi: string;
  formData: CariFormData;
  sourceType: 'image' | 'pdf' | 'text';
  sourceData?: string; // base64 preview or text content
  settings: AppSettings;
}

export interface AnalysisResponse {
  success: boolean;
  data?: CariFormData;
  error?: string;
  rawExtractedText?: string;
}
