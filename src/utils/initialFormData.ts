import { CariFormData, AppSettings } from '../types';
import { formatDateTurkish } from './validators';

export const DEFAULT_REPRESENTATIVES: string[] = [
  'Mustafa Can',
  'Fatih Dikmen',
  'Yakup Aslan',
  'Cemal Celayir',
  'Engin Ceylan',
  'Eyüp Kılıçoğlu',
  'Osman Coruh',
  'Fatih Karakaş',
  'Ferit Semizoğlu',
  'Serkan Akgül',
  'Rabia Aliyev',
  'Kadir Can',
  'Fazlıhan Carus',
  'Murat Yıldıran',
  'Hakan Gündüz',
];

export const DEFAULT_SETTINGS: AppSettings = {
  temsilci: 'Mustafa Can',
  temsilciler: DEFAULT_REPRESENTATIVES,
  cariLimit: '',
  website: 'www.formatasarim.com',
  gonderimEpostasi: 'muhasebe@crsspor.com',
  dokumanKodu: 'Q İF',
};

export function createEmptyFormData(settings: AppSettings = DEFAULT_SETTINGS): CariFormData {
  return {
    firmaAdi: { value: '', confidence: 'high' },
    vergiDairesi: { value: '', confidence: 'high' },
    vergiNo: { value: '', confidence: 'high' },
    vergiNoTuru: { value: 'VKN', confidence: 'high' },
    telefon: { value: '', confidence: 'high' },
    faks: { value: '', confidence: 'high' },
    eposta: { value: '', confidence: 'high' },
    eFatura: { value: null, confidence: 'high' },
    eArsiv: { value: null, confidence: 'high' },

    sirketYetkilisiAd: { value: '', confidence: 'high' },
    sirketYetkilisiGsm: { value: '', confidence: 'high' },
    sirketYetkilisiEposta: { value: '', confidence: 'high' },
    muhasebeYetkilisiAd: { value: '', confidence: 'high' },
    muhasebeYetkilisiGsm: { value: '', confidence: 'high' },
    muhasebeYetkilisiEposta: { value: '', confidence: 'high' },

    bankaAdi: { value: '', confidence: 'high' },
    subeAdi: { value: '', confidence: 'high' },
    iban: { value: '', confidence: 'high' },

    vadeli: { value: false, confidence: 'high' },
    vadeGunu: { value: '30 Gün', confidence: 'high' },
    pesin: { value: false, confidence: 'high' },
    krediKarti: { value: false, confidence: 'high' },
    cekSenet: { value: false, confidence: 'high' },
    iskontoOrani: { value: '', confidence: 'high' },
    cariLimit: { value: '', confidence: 'high' },

    evraklar: { value: ['1- Vergi Levhası', '2- İmza Sirküsü'], confidence: 'high' },
    attachedFiles: { value: [], confidence: 'high' },

    temsilci: { value: settings.temsilci, confidence: 'high' },
    dokumanKodu: { value: settings.dokumanKodu || 'Q', confidence: 'high' },
    tarih: { value: formatDateTurkish(), confidence: 'high' },
    kaseImzaVar: { value: false, confidence: 'high' },
    pazarlamaOnay: { value: false, confidence: 'high' },
    muhasebeOnay: { value: false, confidence: 'high' },
    aciklama: { value: '', confidence: 'high' },
  };
}
