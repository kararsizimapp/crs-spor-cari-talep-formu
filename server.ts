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
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return null;
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
    console.log("[/api/analyze] Express handler invoked");
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({
        success: false,
        error: 'Gemini API anahtarı sunucu ortamında tanımlı değil.',
      });
    }

    const { imageBase64, mimeType, textContent } = req.body || {};

    if ((!imageBase64 || typeof imageBase64 !== 'string' || !imageBase64.trim()) &&
        (!textContent || typeof textContent !== 'string' || !textContent.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Analiz edilecek dosya, görsel veya metin bulunamadı.',
      });
    }

    const contents: any[] = [];

    if (textContent && typeof textContent === 'string' && textContent.trim()) {
      contents.push({
        text: `İncelenecek Yapıştırılan Metin / İletişim Notu:\n${textContent.trim()}`,
      });
    }

    if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.trim()) {
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      contents.push({
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: cleanBase64,
        },
      });
      contents.push({
        text: 'Lütfen yukarıdaki görseldeki/belgedeki cari ve firma bilgilerini okuyup çıkarın.',
      });
    }

    let responseText: string | null = null;
    let primaryError: any = null;

    console.log("[/api/analyze] Using model: gemini-3.6-flash");
    try {
      const result = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents,
        config: {
          systemInstruction: EXTRACTION_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: extractionResponseSchema,
          temperature: 0.1,
        },
      });
      if (result && result.text) {
        responseText = result.text;
      }
    } catch (err: any) {
      primaryError = err;
      const statusCode = err?.status || err?.statusCode;
      console.error("[/api/analyze] Gemini 3.6 Flash call failed:", {
        statusCode,
        message: err?.message,
        stack: err?.stack,
      });

      const isAuthOrKeyError =
        statusCode === 401 ||
        statusCode === 403 ||
        (err?.message && (
          err.message.includes('API_KEY_INVALID') ||
          err.message.includes('API key not valid') ||
          err.message.includes('UNAUTHENTICATED') ||
          err.message.includes('PERMISSION_DENIED')
        ));

      if (!isAuthOrKeyError) {
        console.log("[/api/analyze] Attempting fallback model: gemini-2.5-flash");
        try {
          const fallbackResult = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents,
            config: {
              systemInstruction: EXTRACTION_SYSTEM_INSTRUCTION,
              responseMimeType: 'application/json',
              responseSchema: extractionResponseSchema,
              temperature: 0.1,
            },
          });
          if (fallbackResult && fallbackResult.text) {
            responseText = fallbackResult.text;
          }
        } catch (fallbackErr: any) {
          console.error("[/api/analyze] Gemini 2.5 Flash fallback call failed:", {
            statusCode: fallbackErr?.status || fallbackErr?.statusCode,
            message: fallbackErr?.message,
            stack: fallbackErr?.stack,
          });
        }
      }
    }

    if (!responseText) {
      const errToReport = primaryError || new Error("Yapay zeka analiz servisinden yanıt alınamadı.");
      const errMessage = errToReport?.message || "";
      const errStatus = errToReport?.status || errToReport?.statusCode;

      let httpCode = 500;
      let userFriendlyError = "Yapay zeka analizi sırasında sunucuda bir hata oluştu.";

      if (errStatus === 401 || errStatus === 403 || errMessage.includes('401') || errMessage.includes('403') || errMessage.includes('API key') || errMessage.includes('UNAUTHENTICATED') || errMessage.includes('PERMISSION_DENIED')) {
        httpCode = 401;
        userFriendlyError = "Gemini API anahtarı geçersiz veya yetkisiz. Lütfen Vercel panelinizden API anahtarınızı kontrol edin.";
      } else if (errStatus === 429 || errMessage.includes('429') || errMessage.includes('RESOURCE_EXHAUSTED') || errMessage.includes('quota')) {
        httpCode = 429;
        userFriendlyError = "Gemini API kota sınırı aşıldı veya çok fazla istek yapıldı. Lütfen biraz bekleyip tekrar deneyin.";
      } else if (errStatus === 400 || errMessage.includes('400') || errMessage.includes('INVALID_ARGUMENT')) {
        httpCode = 400;
        userFriendlyError = "Gönderilen veri veya dosya formatı yapay zeka servisi tarafından işlenemedi.";
      } else if (errStatus === 502 || errStatus === 503 || errMessage.includes('502') || errMessage.includes('503') || errMessage.includes('UNAVAILABLE')) {
        httpCode = 503;
        userFriendlyError = "Gemini yapay zeka servisine erişilemiyor. Lütfen kısa bir süre sonra tekrar deneyiniz.";
      }

      return res.status(httpCode).json({
        success: false,
        error: userFriendlyError,
      });
    }

    let extractedData: any = null;
    let cleanJsonText = "";
    try {
      const rawText = responseText.trim();
      cleanJsonText = rawText.replace(/^```(json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      extractedData = JSON.parse(cleanJsonText);
    } catch (parseErr: any) {
      console.error("[/api/analyze] JSON parse error:", {
        message: parseErr?.message,
        stack: parseErr?.stack,
      });
      return res.status(500).json({
        success: false,
        error: "Yapay zeka çıktısı geçerli bir JSON formatında alınamadı. Lütfen tekrar deneyiniz.",
      });
    }

    return res.status(200).json({
      success: true,
      data: extractedData,
      rawExtractedText: cleanJsonText,
    });
  } catch (err: any) {
    console.error('Gemini Analysis Error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Sunucuda beklenmeyen bir analiz hatası oluştu.',
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
