import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

// Increase body limit for image & PDF base64 uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check Endpoint (supports both /api/health and /health)
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV || 'development' });
});

// Lazy Gemini AI initialization helper
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY ortam değişkeni bulunamadı. Lütfen Vercel panelinizden (Settings -> Environment Variables) GEMINI_API_KEY değişkenini eklediğinizden ve Redeploy yaptığınızdan emin olun.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

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

// Define JSON Schema for Gemini Output using Type from @google/genai
const fieldSchema = (valueType: Type, description: string) => ({
  type: Type.OBJECT,
  properties: {
    value: { type: valueType, description },
    confidence: { type: Type.STRING, description: "high, medium, low" },
    note: { type: Type.STRING, description: "Not veya uyarı varsa yazın" },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Birden fazla ihtimal varsa alternatifler",
    },
  },
  required: ["value", "confidence"],
});

const extractionResponseSchema = {
  type: Type.OBJECT,
  properties: {
    firmaAdi: fieldSchema(Type.STRING, "Firma Unvanı veya Adı"),
    vergiDairesi: fieldSchema(Type.STRING, "Vergi Dairesi Adı"),
    vergiNo: fieldSchema(Type.STRING, "Vergi Kimlik No veya TC Kimlik No"),
    vergiNoTuru: fieldSchema(Type.STRING, "VKN veya TCKN"),
    telefon: fieldSchema(Type.STRING, "Firma Sabit veya Cep Telefonu"),
    faks: fieldSchema(Type.STRING, "Faks Numarası"),
    eposta: fieldSchema(Type.STRING, "Firma E-posta Adresi"),
    adres: fieldSchema(Type.STRING, "Firma Açık Adresi veya Tebligat Adresi"),
    eFatura: fieldSchema(Type.BOOLEAN, "E-Fatura mükellefi mi? True, False veya null"),
    eArsiv: fieldSchema(Type.BOOLEAN, "E-Arşiv mükellefi mi? True, False veya null"),

    sirketYetkilisiAd: fieldSchema(Type.STRING, "Şirket Yetkilisi Ad Soyad"),
    sirketYetkilisiGsm: fieldSchema(Type.STRING, "Şirket Yetkilisi Cep Telefonu"),
    sirketYetkilisiEposta: fieldSchema(Type.STRING, "Şirket Yetkilisi E-posta"),
    muhasebeYetkilisiAd: fieldSchema(Type.STRING, "Muhasebe veya Satın Alma Yetkilisi Ad Soyad"),
    muhasebeYetkilisiGsm: fieldSchema(Type.STRING, "Muhasebe / Satın Alma GSM"),
    muhasebeYetkilisiEposta: fieldSchema(Type.STRING, "Muhasebe / Satın Alma E-posta"),

    bankaAdi: fieldSchema(Type.STRING, "Banka Adı"),
    subeAdi: fieldSchema(Type.STRING, "Banka Şubesi Adı ve Kodu"),
    iban: fieldSchema(Type.STRING, "TR ile başlayan 26 karakterlik IBAN"),

    vadeli: fieldSchema(Type.BOOLEAN, "Vadeli ödeme var mı?"),
    vadeGunu: fieldSchema(Type.STRING, "Vade süresi / günü (örn: 30 Gün)"),
    pesin: fieldSchema(Type.BOOLEAN, "Peşin ödeme var mı?"),
    krediKarti: fieldSchema(Type.BOOLEAN, "Kredi Kartı ödemesi var mı?"),
    cekSenet: fieldSchema(Type.BOOLEAN, "Çek veya Senet var mı?"),
    iskontoOrani: fieldSchema(Type.STRING, "İskonto oranı (örn: %5)"),
    cariLimit: fieldSchema(Type.STRING, "Talep edilen Cari Limit (örn: 50.000 TL)"),

    tarih: fieldSchema(Type.STRING, "Belge veya mesaj tarihi GG.AA.YYYY"),
    kaseImzaVar: fieldSchema(Type.BOOLEAN, "Görselde Kaşe veya İmza var mı?"),
    aciklama: fieldSchema(Type.STRING, "Görselden/mesajdan çıkarılan ilave notlar veya açıklamalar"),
  },
};

// API Endpoint: Analyze Uploaded Document or Text via Gemini
app.post(['/api/analyze', '/analyze'], async (req, res) => {
  try {
    const { imageBase64, mimeType, textContent } = req.body;

    if (!imageBase64 && !textContent) {
      return res.status(400).json({
        success: false,
        error: 'Lütfen bir görsel, PDF belgesi yükleyin veya metin yapıştırın.',
      });
    }

    const ai = getGeminiClient();

    let contentsPayload: any;

    if (imageBase64 && mimeType) {
      // Clean base64 string prefix if included
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      contentsPayload = [
        {
          inlineData: {
            mimeType: mimeType || 'image/png',
            data: cleanBase64,
          },
        },
        {
          text: 'Lütfen bu görseldeki/belgedeki cari ve firma bilgilerini okuyup yapılandırılmış JSON olarak çıkart.',
        },
      ];
    } else if (textContent) {
      contentsPayload = [
        `Aşağıdaki mesaj metnini analiz ederek cari ve firma bilgilerini yapılandırılmış JSON olarak çıkart:\n\n${textContent}`,
      ];
    } else {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz veri formatı. Belge veya metin bulunamadı.',
      });
    }

    let response: any = null;
    let lastError: any = null;

    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ];

    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: contentsPayload,
          config: {
            systemInstruction: EXTRACTION_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: extractionResponseSchema,
            temperature: 0.1,
          },
        });
        if (response && response.text) {
          console.log(`Successfully generated content using model: ${modelName}`);
          break;
        }
      } catch (modelErr: any) {
        console.warn(`Model ${modelName} failed:`, modelErr?.message || modelErr);
        lastError = modelErr;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('Yapay zeka analiz servisinden yanıt alınamadı.');
    }

    const rawText = response.text.trim();
    const cleanJsonText = rawText.replace(/^```(json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    let extractedData = JSON.parse(cleanJsonText);

    return res.json({
      success: true,
      data: extractedData,
      rawExtractedText: cleanJsonText,
    });
  } catch (err: any) {
    console.error('Gemini Analysis Error:', err);
    let errMsg = err?.message || 'Görsel veya metin analiz edilirken bir hata oluştu.';
    if (typeof errMsg === 'string' && (errMsg.includes('The page c') || errMsg.includes('<!DOCTYPE') || errMsg.includes('<html>'))) {
      errMsg = 'Yapay zeka servisine bağlanırken sunucu erişim hatası oluştu. Lütfen birkaç saniye sonra tekrar deneyin.';
    }
    return res.status(500).json({
      success: false,
      error: errMsg,
    });
  }
});

// Global Express error middleware to guarantee JSON responses
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error Middleware:', err);
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({
      success: false,
      error: 'Yüklenen belge/görsel boyutu sunucu limitini aşıyor. Lütfen daha küçük bir görsel veya metin girin.',
    });
  }
  return res.status(err?.status || 500).json({
    success: false,
    error: err?.message || 'Sunucuda beklenmeyen bir hata oluştu.',
  });
});

// Express & Vite server setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
