import { GoogleGenAI, Type } from '@google/genai';

// System Instruction for Turkish Cari Account Extraction
const EXTRACTION_SYSTEM_INSTRUCTION = `
Sen Türkiye'de ticari işletmeler için "Tedarikçi ve Cari Hesap Açma Talep Formu" verilerini ekran görüntülerinden, WhatsApp yazışmalarından, e-postalardan, banka dekontlarından, vergi levhalarından ve metinlerden çıkartan uzman bir OCR ve Veri Analizi Asistanısın.

GÖREVİN VE ÇOK KATI KURALLARIN:
1. Yalnızca gönderilen içerikte (görsel, PDF veya metin) açıkça yazan bilgileri çıkar.
2. Görselde veya metinde bulunmayan hiçbir bilgiyi ASLA TAHMİN ETME, UYDURMA VEYA DOLDURMA. Bulunamayan alanların 'value' değerini boş string ("") veya boolean ise null/false bırak.
3. KATI KURAL - FİRMA YETKİLİLERİ AYRIMI:
   Yapıştırılan mesajlarda veya yüklenen belgelerde yer alan genel iletişim kişilerini, telefon ve e-posta adreslerini YALNIZCA "1. CARİ FİRMA BİLGİLERİ" (Firma Adı, Telefon, E-posta, Vergi No vb.) bölümüne ekle.
   "2. FİRMA YETKİLİLERİ" (sirketYetkilisiAd, sirketYetkilisiGsm, muhasebeYetkilisiAd, muhasebeYetkilisiGsm vb.) alanlarını ASLA genel iletişim bilgileriyle DOLDURMA.
   "FİRMA YETKİLİLERİ" alanları SADECE ve SADECE metinde "Şirket Yetkilisi", "Şirket Müdürü", "Genel Müdür", "Muhasebe Müdürü", "Satın Alma Yetkilisi" gibi unvanlar veya görevler açıkça ve doğrudan belirtilmişse doldurulmalıdır; aksi halde BOŞ ("") bırakılmalıdır.
4. KATI KURAL - FİRMA AÇIK ADRESİ:
   Gönderilen içerikte (metinde veya görselde) yer alan Mahalle, Cadde, Sokak, Bina No, İlçe, İl, Hastane/Birim veya Kurum adresi gibi tüm açık adres bilgilerini YALNIZCA ve EKSİKSİZ şekilde 'adres' (Firma Açık Adresi) alanına yaz.
5. Çıkarılan her alan için 'confidence' (güven düzeyi) belirle:
   - 'high': Metinde tam ve net şekilde yazıyor.
   - 'medium': Kısmen net, imla hatası veya okunabilirlik şüphesi var.
   - 'low': Çok silik, karmaşık veya birden fazla çelişkili bilgi içeriyor.
6. Bir alan için birden fazla ihtimal varsa (örneğin iki farklı IBAN veya iki farklı telefon), 'options' listesini doldur ve güven derecesini 'medium' yap.
7. Biçimlendirme Kuralları:
   - Telefon: 05XX XXX XX XX veya 02XX XXX XX XX standardında.
   - IBAN: TR ile başlayan 26 karakterlik IBAN (TRXX XXXX XXXX XXXX XXXX XXXX XX).
   - Vergi/TCKN: 10 hane ise 'VKN', 11 hane ise 'TCKN'.
   - Tarih: GG.AA.YYYY formatında.
   - E-Fatura / E-Arşiv: Belgede açıkça "E-Fatura mükellefidir", "E-Arşiv" vb. geçiyorsa true, aksi halde null.
   - Ödeme Şekli: "30 gün vadeli", "60 gün", "peşin", "kredi kartı", "çek" ifadelerini ilgili boolean alanlara ve vadeGunu'ne ekle.

Lütfen yanıtı SADECE ve SADECE tanımlanan JSON şemasına uygun geçerli bir JSON olarak döndür.
`;

const fieldSchema = (valueType: Type, description: string) => ({
  type: Type.OBJECT,
  properties: {
    value: { type: valueType, description },
    confidence: { type: Type.STRING, description: 'high, medium, low' },
    note: { type: Type.STRING, description: 'Not veya uyarı varsa yazın' },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Birden fazla ihtimal varsa alternatifler',
    },
  },
  required: ['value', 'confidence'],
});

const extractionResponseSchema = {
  type: Type.OBJECT,
  properties: {
    firmaAdi: fieldSchema(Type.STRING, 'Firma Unvanı veya Adı'),
    vergiDairesi: fieldSchema(Type.STRING, 'Vergi Dairesi Adı'),
    vergiNo: fieldSchema(Type.STRING, 'Vergi Kimlik No veya TC Kimlik No'),
    vergiNoTuru: fieldSchema(Type.STRING, 'VKN veya TCKN'),
    telefon: fieldSchema(Type.STRING, 'Firma Sabit veya Cep Telefonu'),
    faks: fieldSchema(Type.STRING, 'Faks Numarası'),
    eposta: fieldSchema(Type.STRING, 'Firma E-posta Adresi'),
    adres: fieldSchema(Type.STRING, 'Firma Açık Adresi veya Tebligat Adresi'),
    eFatura: fieldSchema(Type.BOOLEAN, 'E-Fatura mükellefi mi? True, False veya null'),
    eArsiv: fieldSchema(Type.BOOLEAN, 'E-Arşiv mükellefi mi? True, False veya null'),

    sirketYetkilisiAd: fieldSchema(Type.STRING, 'Şirket Yetkilisi Ad Soyad'),
    sirketYetkilisiGsm: fieldSchema(Type.STRING, 'Şirket Yetkilisi Cep Telefonu'),
    sirketYetkilisiEposta: fieldSchema(Type.STRING, 'Şirket Yetkilisi E-posta'),
    muhasebeYetkilisiAd: fieldSchema(Type.STRING, 'Muhasebe veya Satın Alma Yetkilisi Ad Soyad'),
    muhasebeYetkilisiGsm: fieldSchema(Type.STRING, 'Muhasebe / Satın Alma GSM'),
    muhasebeYetkilisiEposta: fieldSchema(Type.STRING, 'Muhasebe / Satın Alma E-posta'),

    bankaAdi: fieldSchema(Type.STRING, 'Banka Adı'),
    subeAdi: fieldSchema(Type.STRING, 'Banka Şubesi Adı ve Kodu'),
    iban: fieldSchema(Type.STRING, 'TR ile başlayan 26 karakterlik IBAN'),

    vadeli: fieldSchema(Type.BOOLEAN, 'Vadeli ödeme var mı?'),
    vadeGunu: fieldSchema(Type.STRING, 'Vade süresi / günü (örn: 30 Gün)'),
    pesin: fieldSchema(Type.BOOLEAN, 'Peşin ödeme var mı?'),
    krediKarti: fieldSchema(Type.BOOLEAN, 'Kredi Kartı ödemesi var mı?'),
    cekSenet: fieldSchema(Type.BOOLEAN, 'Çek veya Senet var mı?'),
    iskontoOrani: fieldSchema(Type.STRING, 'İskonto oranı (örn: %5)'),
    cariLimit: fieldSchema(Type.STRING, 'Talep edilen Cari Limit (örn: 50.000 TL)'),

    tarih: fieldSchema(Type.STRING, 'Belge veya mesaj tarihi GG.AA.YYYY'),
    kaseImzaVar: fieldSchema(Type.BOOLEAN, 'Görselde Kaşe veya İmza var mı?'),
    aciklama: fieldSchema(Type.STRING, 'Görselden/mesajdan çıkarılan ilave notlar veya açıklamalar'),
  },
};

export default async function handler(req: any, res: any) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'GEMINI_API_KEY Vercel ortam değişkenlerinde bulunamadı. Lütfen Vercel panelinizde Settings -> Environment Variables kısmından GEMINI_API_KEY değişkenini ekleyip projenizi yeniden yayınlayın (Redeploy).',
      });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { imageBase64, mimeType, textContent } = body;

    if (!imageBase64 && !textContent) {
      return res.status(400).json({
        success: false,
        error: 'Analiz edilecek dosya, görsel veya metin bulunamadı.',
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const contents: any[] = [];

    if (textContent && textContent.trim()) {
      contents.push({
        text: `İncelenecek Yapıştırılan Metin / İletişim Notu:\n${textContent.trim()}`,
      });
    }

    if (imageBase64 && mimeType) {
      contents.push({
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      });
      contents.push({
        text: 'Lütfen yukarıdaki görseldeki/belgedeki cari ve firma bilgilerini okuyup çıkarın.',
      });
    }

    let response: any = null;
    let lastError: any = null;

    const candidateModels = [
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ];

    for (const modelName of candidateModels) {
      try {
        console.log(`Gemini analizi başlatılıyor (${modelName})...`);
        const result = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction: EXTRACTION_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: extractionResponseSchema,
            temperature: 0.1,
          },
        });

        if (result && result.text) {
          response = result;
          console.log(`Gemini analizi tamamlandı (${modelName})`);
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} başarısız oldu:`, err?.message || err);
        lastError = err;
      }
    }

    if (!response || !response.text) {
      return res.status(500).json({
        success: false,
        error: lastError?.message || 'Yapay zeka analiz servisinden yanıt alınamadı.',
      });
    }

    const rawText = response.text.trim();
    const cleanJsonText = rawText.replace(/^```(json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const extractedData = JSON.parse(cleanJsonText);

    return res.status(200).json({
      success: true,
      data: extractedData,
      rawExtractedText: cleanJsonText,
    });
  } catch (err: any) {
    console.error('API Analyze Error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Sunucuda bir analiz hatası oluştu.',
    });
  }
}
