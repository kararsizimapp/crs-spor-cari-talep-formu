import { jsPDF } from 'jspdf';
import { CariFormData, AppSettings } from '../types';
import { formatIskontoOrani } from './validators';

let robotoRegularBase64: string | null = null;
let robotoBoldBase64: string | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function ensureRobotoFonts(doc: jsPDF): Promise<boolean> {
  try {
    if (!robotoRegularBase64 || !robotoBoldBase64) {
      const [regRes, boldRes] = await Promise.all([
        fetch('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf'),
        fetch('https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1Mu51xKOzY.ttf'),
      ]);
      if (!regRes.ok || !boldRes.ok) throw new Error('Font fetch failed');
      const regBuf = await regRes.arrayBuffer();
      const boldBuf = await boldRes.arrayBuffer();
      robotoRegularBase64 = arrayBufferToBase64(regBuf);
      robotoBoldBase64 = arrayBufferToBase64(boldBuf);
    }

    doc.addFileToVFS('Roboto-Regular.ttf', robotoRegularBase64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

    doc.addFileToVFS('Roboto-Bold.ttf', robotoBoldBase64);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

    doc.setFont('Roboto', 'normal');
    return true;
  } catch (err) {
    console.warn('Could not load Roboto TTF font, falling back to standard font:', err);
    return false;
  }
}

/**
 * Clean & Format string for jsPDF text output.
 * Preserves Turkish characters (İ, ı, Ş, ş, Ğ, ğ, Ç, ç, Ö, ö, Ü, ü).
 * In fallback mode, maps non-WinAnsi Turkish characters to standard Latin equivalents.
 */
function cleanText(str?: string | null, isFallbackFont = false): string {
  if (str === null || str === undefined) return '';
  let text = String(str).trim();

  // Normalize Unicode and replace Lira symbol with 'TL'
  text = text.normalize('NFC').replace(/₺/g, 'TL');

  if (isFallbackFont) {
    return text
      .replace(/İ/g, 'I')
      .replace(/İ/g, 'I')
      .replace(/ı/g, 'i')
      .replace(/i̇/g, 'i')
      .replace(/Ş/g, 'S')
      .replace(/Ṡ/g, 'S')
      .replace(/ş/g, 's')
      .replace(/ṡ/g, 's')
      .replace(/Ğ/g, 'G')
      .replace(/ğ/g, 'g');
  }

  return text;
}

/**
 * Generates an A4 portrait, high-resolution vector PDF using jsPDF.
 * Fits strictly on 1 single page with crisp layout and clean typography.
 */
export async function generateCariFormPdf(formData: CariFormData, settings: AppSettings) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const isRobotoLoaded = await ensureRobotoFonts(doc);

  const setPdfFont = (fontStyle: 'bold' | 'normal' | 'italic' = 'normal') => {
    if (isRobotoLoaded) {
      doc.setFont('Roboto', fontStyle === 'italic' ? 'normal' : fontStyle);
    } else {
      doc.setFont('helvetica', fontStyle);
    }
  };

  const formatText = (str?: string | null) => cleanText(str, !isRobotoLoaded);

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const marginX = 10; // Left/Right margin 10mm
  const contentWidth = pageWidth - marginX * 2; // 190 mm

  let currentY = 10;

  // Color Palette
  const darkNavy = '#1E293B'; // Slate 800
  const borderGray = '#CBD5E1'; // Slate 300

  // Draw Box Helper
  const drawBox = (x: number, y: number, w: number, h: number, bgHex?: string, borderHex = borderGray) => {
    if (bgHex) {
      doc.setFillColor(bgHex);
      doc.rect(x, y, w, h, 'F');
    }
    doc.setDrawColor(borderHex);
    doc.setLineWidth(0.3);
    doc.rect(x, y, w, h, 'S');
  };

  // Vector Checkbox Helper
  const drawCheckbox = (x: number, y: number, checked: boolean, label: string) => {
    const size = 3.3;
    if (checked) {
      // Solid filled navy box with rounded corners
      doc.setFillColor(30, 41, 59);
      doc.setDrawColor(30, 41, 59);
      doc.roundedRect(x, y, size, size, 0.5, 0.5, 'F');

      // Crisp white checkmark line inside box
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      doc.line(x + 0.7, y + 1.6, x + 1.3, y + 2.4);
      doc.line(x + 1.3, y + 2.4, x + 2.5, y + 0.8);
    } else {
      // Empty white box with subtle border
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(148, 163, 184); // Slate 400 border
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, size, size, 0.5, 0.5, 'DF');
    }

    doc.setTextColor(15, 23, 42);
    setPdfFont(checked ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.text(formatText(label), x + size + 1.8, y + 2.5);
  };

  // Section Header Helper
  const drawSectionHeader = (title: string, y: number): number => {
    doc.setFillColor(30, 41, 59); // Dark Navy
    doc.rect(marginX, y, contentWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    setPdfFont('bold');
    doc.setFontSize(8.5);
    doc.text(formatText(title), marginX + 3, y + 4.2);
    return y + 6;
  };

  // -------------------------------------------------------------
  // HEADER SECTION
  // -------------------------------------------------------------
  const headerHeight = 22;
  drawBox(marginX, currentY, contentWidth, headerHeight, '#F8FAFC', darkNavy);

  // Left Logo Box: CRS SPOR
  doc.setFillColor(15, 23, 42); // Navy
  doc.rect(marginX + 2, currentY + 2, 32, 18, 'F');
  doc.setTextColor(255, 255, 255);
  setPdfFont('bold');
  doc.setFontSize(11);
  doc.text('CRS SPOR', marginX + 18, currentY + 12.5, { align: 'center' });

  // Center Title & Form Date
  const centerCenterX = 84; // Center position
  doc.setTextColor(15, 23, 42);
  setPdfFont('bold');
  doc.setFontSize(9.5);
  doc.text(formatText('TEDARİKÇİ / CARİ HESAP AÇMA TALEP FORMU'), centerCenterX, currentY + 9, { align: 'center' });

  // Form Date in Header Center
  setPdfFont('bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85); // Slate 700
  const formDateVal = formData.tarih?.value || new Date().toLocaleDateString('tr-TR');
  doc.text(formatText(`Form Tarihi: ${formDateVal}`), centerCenterX, currentY + 15.5, { align: 'center' });

  // Box 3: TEMSİLCİ
  const repBoxX = marginX + 114;
  const repBoxY = currentY + 2;
  const repBoxW = 34;
  const repBoxH = 18;

  drawBox(repBoxX, repBoxY, repBoxW, repBoxH, '#FFFFFF', darkNavy);
  doc.setFillColor(30, 41, 59);
  doc.rect(repBoxX, repBoxY, repBoxW, 4.8, 'F');
  doc.setTextColor(255, 255, 255);
  setPdfFont('bold');
  doc.setFontSize(7);
  doc.text(formatText('TEMSİLCİ'), repBoxX + repBoxW / 2, repBoxY + 3.6, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  setPdfFont('bold');
  doc.setFontSize(8.5);
  const repName = formData.temsilci?.value || settings.temsilci || '-';
  doc.text(formatText(repName), repBoxX + repBoxW / 2, repBoxY + 12.5, { align: 'center' });

  // Box 4: ÇALIŞMA ŞEKLİ (DOKÜMAN KODU)
  const codeBoxX = marginX + 150;
  const codeBoxY = currentY + 2;
  const codeBoxW = 36;
  const codeBoxH = 18;

  drawBox(codeBoxX, codeBoxY, codeBoxW, codeBoxH, '#FFFFFF', darkNavy);
  doc.setFillColor(30, 41, 59);
  doc.rect(codeBoxX, codeBoxY, codeBoxW, 4.8, 'F');
  doc.setTextColor(255, 255, 255);
  setPdfFont('bold');
  doc.setFontSize(7);
  doc.text(formatText('ÇALIŞMA ŞEKLİ'), codeBoxX + codeBoxW / 2, codeBoxY + 3.6, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  setPdfFont('bold');
  doc.setFontSize(11);
  const docCode = formData.dokumanKodu?.value || settings.dokumanKodu || 'Q';
  doc.text(formatText(docCode), codeBoxX + codeBoxW / 2, codeBoxY + 13, { align: 'center' });

  currentY += headerHeight + 3;

  // -------------------------------------------------------------
  // SECTION 1: CARİ FİRMA BİLGİLERİ
  // -------------------------------------------------------------
  currentY = drawSectionHeader('CARİ FİRMA BİLGİLERİ', currentY);

  const col1W = 35;
  const col2W = 60;
  const col3W = 35;
  const col4W = 60;
  const rowH = 5.8;

  const drawRowLabelVal = (y: number, l1: string, v1?: string, l2?: string, v2?: string) => {
    // Col 1 label
    drawBox(marginX, y, col1W, rowH, '#F1F5F9');
    doc.setTextColor(51, 65, 85);
    setPdfFont('bold');
    doc.setFontSize(7.5);
    doc.text(formatText(l1), marginX + 2, y + 4);

    // Col 2 val
    drawBox(marginX + col1W, y, col2W, rowH, '#FFFFFF');
    doc.setTextColor(15, 23, 42);
    setPdfFont('normal');
    doc.setFontSize(8);
    doc.text(formatText(v1 || '-'), marginX + col1W + 2, y + 4);

    // Col 3 label
    drawBox(marginX + col1W + col2W, y, col3W, rowH, '#F1F5F9');
    doc.setTextColor(51, 65, 85);
    setPdfFont('bold');
    doc.setFontSize(7.5);
    doc.text(formatText(l2 || ''), marginX + col1W + col2W + 2, y + 4);

    // Col 4 val
    drawBox(marginX + col1W + col2W + col3W, y, col4W, rowH, '#FFFFFF');
    doc.setTextColor(15, 23, 42);
    setPdfFont('normal');
    doc.setFontSize(8);
    doc.text(formatText(v2 || '-'), marginX + col1W + col2W + col3W + 2, y + 4);
  };

  // Row 1: Firma Adı & Telefon
  drawRowLabelVal(currentY, 'Firma Adı', formData.firmaAdi?.value, 'Telefon', formData.telefon?.value);
  currentY += rowH;

  // Row 2: Vergi Dairesi & Faks Numarası
  drawRowLabelVal(currentY, 'Vergi Dairesi', formData.vergiDairesi?.value, 'Faks Numarası', formData.faks?.value);
  currentY += rowH;

  // Row 3: Vergi No / T.C. Kimlik No & E-Posta
  const taxLabel = formData.vergiNoTuru?.value === 'TCKN' ? 'T.C. Kimlik No' : 'Vergi No';
  drawRowLabelVal(currentY, taxLabel, formData.vergiNo?.value, 'E-Posta', formData.eposta?.value);
  currentY += rowH;

  // Row 4: Firma Adresi (Dynamic Multi-Line Height)
  const rawAddress = formData.adres?.value || '-';
  const addressValW = col2W + col3W + col4W - 4; // Total width for value (151mm)
  setPdfFont('normal');
  doc.setFontSize(8);
  const addressLines = doc.splitTextToSize(formatText(rawAddress), addressValW);
  const addressRowH = Math.max(rowH, addressLines.length * 4.2 + 2);

  drawBox(marginX, currentY, col1W, addressRowH, '#F1F5F9');
  doc.setTextColor(51, 65, 85);
  setPdfFont('bold');
  doc.setFontSize(7.5);
  doc.text(formatText('Firma Adresi'), marginX + 2, currentY + 4);

  drawBox(marginX + col1W, currentY, col2W + col3W + col4W, addressRowH, '#FFFFFF');
  doc.setTextColor(15, 23, 42);
  setPdfFont('normal');
  doc.setFontSize(8);
  doc.text(addressLines, marginX + col1W + 2, currentY + 4);
  currentY += addressRowH;

  // Row 5: E-Fatura Durumu & E-Arşiv Durumu with Modern Checkboxes
  drawBox(marginX, currentY, col1W, rowH, '#F1F5F9');
  doc.setTextColor(51, 65, 85);
  setPdfFont('bold');
  doc.setFontSize(7.5);
  doc.text(formatText('E-Fatura Durumu'), marginX + 2, currentY + 4);

  drawBox(marginX + col1W, currentY, col2W, rowH, '#FFFFFF');
  drawCheckbox(marginX + col1W + 3, currentY + 1.25, formData.eFatura?.value === true, 'Evet');
  drawCheckbox(marginX + col1W + 26, currentY + 1.25, false, 'Hayır');

  drawBox(marginX + col1W + col2W, currentY, col3W, rowH, '#F1F5F9');
  doc.setTextColor(51, 65, 85);
  setPdfFont('bold');
  doc.setFontSize(7.5);
  doc.text(formatText('E-Arşiv Durumu'), marginX + col1W + col2W + 2, currentY + 4);

  drawBox(marginX + col1W + col2W + col3W, currentY, col4W, rowH, '#FFFFFF');
  drawCheckbox(marginX + col1W + col2W + col3W + 3, currentY + 1.25, formData.eArsiv?.value === true, 'Evet');
  drawCheckbox(marginX + col1W + col2W + col3W + 26, currentY + 1.25, false, 'Hayır');

  currentY += rowH + 3;

  // -------------------------------------------------------------
  // SECTION 2: FİRMA YETKİLİLERİ
  // -------------------------------------------------------------
  currentY = drawSectionHeader('FİRMA YETKİLİLERİ', currentY);

  const subW = contentWidth / 2;
  drawBox(marginX, currentY, subW, 4.8, '#E2E8F0');
  doc.setTextColor(30, 41, 59);
  setPdfFont('bold');
  doc.setFontSize(7.5);
  doc.text(formatText('ŞİRKET YETKİLİSİ'), marginX + 3, currentY + 3.5);

  drawBox(marginX + subW, currentY, subW, 4.8, '#E2E8F0');
  doc.text(formatText('MUHASEBE / SATIN ALMA YETKİLİSİ'), marginX + subW + 3, currentY + 3.5);
  currentY += 4.8;

  const yCol1LabelW = 28;
  const yCol1ValW = subW - yCol1LabelW;

  const drawYetkiliRow = (y: number, l1: string, v1?: string, l2?: string, v2?: string) => {
    drawBox(marginX, y, yCol1LabelW, rowH, '#F8FAFC');
    doc.setTextColor(71, 85, 105);
    setPdfFont('bold');
    doc.setFontSize(7);
    doc.text(formatText(l1), marginX + 2, y + 4);

    drawBox(marginX + yCol1LabelW, y, yCol1ValW, rowH, '#FFFFFF');
    doc.setTextColor(15, 23, 42);
    setPdfFont('normal');
    doc.setFontSize(7.5);
    doc.text(formatText(v1 || '-'), marginX + yCol1LabelW + 2, y + 4);

    drawBox(marginX + subW, y, yCol1LabelW, rowH, '#F8FAFC');
    doc.setTextColor(71, 85, 105);
    setPdfFont('bold');
    doc.setFontSize(7);
    doc.text(formatText(l2 || ''), marginX + subW + 2, y + 4);

    drawBox(marginX + subW + yCol1LabelW, y, yCol1ValW, rowH, '#FFFFFF');
    doc.setTextColor(15, 23, 42);
    setPdfFont('normal');
    doc.setFontSize(7.5);
    doc.text(formatText(v2 || '-'), marginX + subW + yCol1LabelW + 2, y + 4);
  };

  drawYetkiliRow(currentY, 'Adı Soyadı', formData.sirketYetkilisiAd?.value, 'Adı Soyadı', formData.muhasebeYetkilisiAd?.value);
  currentY += rowH;
  drawYetkiliRow(currentY, 'GSM No', formData.sirketYetkilisiGsm?.value, 'GSM No', formData.muhasebeYetkilisiGsm?.value);
  currentY += rowH;
  drawYetkiliRow(currentY, 'E-Posta', formData.sirketYetkilisiEposta?.value, 'E-Posta', formData.muhasebeYetkilisiEposta?.value);
  currentY += rowH + 3;

  // -------------------------------------------------------------
  // SECTION 3: BANKA BİLGİLERİ
  // -------------------------------------------------------------
  currentY = drawSectionHeader('BANKA BİLGİLERİ', currentY);

  drawBox(marginX, currentY, 35, rowH, '#F1F5F9');
  doc.setTextColor(51, 65, 85);
  setPdfFont('bold');
  doc.setFontSize(7.5);
  doc.text(formatText('Banka Adı'), marginX + 2, currentY + 4);

  drawBox(marginX + 35, currentY, 60, rowH, '#FFFFFF');
  doc.setTextColor(15, 23, 42);
  setPdfFont('normal');
  doc.setFontSize(8);
  doc.text(formatText(formData.bankaAdi?.value || '-'), marginX + 37, currentY + 4);

  drawBox(marginX + 95, currentY, 35, rowH, '#F1F5F9');
  doc.setTextColor(51, 65, 85);
  setPdfFont('bold');
  doc.setFontSize(7.5);
  doc.text(formatText('Şube Adı / Kodu'), marginX + 97, currentY + 4);

  drawBox(marginX + 130, currentY, 60, rowH, '#FFFFFF');
  doc.setTextColor(15, 23, 42);
  setPdfFont('normal');
  doc.setFontSize(8);
  doc.text(formatText(formData.subeAdi?.value || '-'), marginX + 132, currentY + 4);

  currentY += rowH;

  drawBox(marginX, currentY, 35, rowH, '#F1F5F9');
  doc.setTextColor(51, 65, 85);
  setPdfFont('bold');
  doc.setFontSize(7.5);
  doc.text(formatText('IBAN Numarası'), marginX + 2, currentY + 4);

  drawBox(marginX + 35, currentY, 155, rowH, '#FFFFFF');
  doc.setTextColor(15, 23, 42);
  setPdfFont('bold');
  doc.setFontSize(8.5);
  doc.text(formatText(formData.iban?.value || '-'), marginX + 37, currentY + 4);

  currentY += rowH + 3;

  // -------------------------------------------------------------
  // SECTION 4: ÖDEME ŞEKLİ & CARİ LİMİT
  // -------------------------------------------------------------
  currentY = drawSectionHeader('ÖDEME ŞEKLİ', currentY);

  const payRowH = 5.8;

  // Row 1: Checkboxes
  drawBox(marginX, currentY, contentWidth, payRowH, '#FFFFFF');

  const isVadeli = !!formData.vadeli?.value;
  const isPesin = !!formData.pesin?.value;
  const isKK = !!formData.krediKarti?.value;
  const isCek = !!formData.cekSenet?.value;

  const vadeliLabel = `Vadeli Ödeme${isVadeli && formData.vadeGunu?.value ? ` (${formData.vadeGunu.value})` : ''}`;

  drawCheckbox(marginX + 4, currentY + 1.25, isVadeli, vadeliLabel);
  drawCheckbox(marginX + 62, currentY + 1.25, isPesin, 'Peşin');
  drawCheckbox(marginX + 98, currentY + 1.25, isKK, 'Kredi Kartı');
  drawCheckbox(marginX + 138, currentY + 1.25, isCek, 'Çek / Senet');

  currentY += payRowH;

  // Row 2: İskonto Oranı & Cari Limit
  const halfW = contentWidth / 2; // 95mm
  const labelW = 28;
  const valW = halfW - labelW; // 67mm

  // Left side: İskonto Oranı
  drawBox(marginX, currentY, labelW, payRowH, '#F1F5F9');
  doc.setTextColor(51, 65, 85);
  setPdfFont('bold');
  doc.setFontSize(7.5);
  doc.text(formatText('İskonto Oranı'), marginX + 2, currentY + 4);

  drawBox(marginX + labelW, currentY, valW, payRowH, '#FFFFFF');
  doc.setTextColor(15, 23, 42);
  setPdfFont('normal');
  doc.setFontSize(8);
  doc.text(formatText(formatIskontoOrani(formData.iskontoOrani?.value)), marginX + labelW + 2, currentY + 4);

  // Right side: Cari Limit
  let rawLimit = (formData.cariLimit?.value || '-').replace(/₺/g, 'TL').trim();
  if (rawLimit !== '-' && !rawLimit.toUpperCase().includes('TL') && /^\d/.test(rawLimit)) {
    rawLimit += ' TL';
  }

  drawBox(marginX + halfW, currentY, labelW, payRowH, '#F1F5F9');
  doc.setTextColor(51, 65, 85);
  setPdfFont('bold');
  doc.setFontSize(7.5);
  doc.text(formatText('Cari Limit'), marginX + halfW + 2, currentY + 4);

  drawBox(marginX + halfW + labelW, currentY, valW, payRowH, '#FFFFFF');
  doc.setTextColor(15, 23, 42);
  setPdfFont('bold');
  doc.setFontSize(8);
  doc.text(formatText(rawLimit), marginX + halfW + labelW + 2, currentY + 4);

  currentY += payRowH + 3;

  // -------------------------------------------------------------
  // SECTION 5: İSTENİLEN EVRAKLAR
  // -------------------------------------------------------------
  currentY = drawSectionHeader('İSTENİLEN EVRAKLAR', currentY);

  const attachedFiles = formData.attachedFiles?.value || [];
  const hasAttached = attachedFiles.length > 0;
  const evrakBoxH = hasAttached ? 10 + (attachedFiles.length * 4.2) : 10;

  drawBox(marginX, currentY, contentWidth, evrakBoxH, '#F8FAFC');

  if (hasAttached) {
    setPdfFont('bold');
    doc.setFontSize(7.5);
    doc.setTextColor(5, 150, 105); // Emerald 600
    doc.text(formatText('YÜKLENEN EK BELGELER:'), marginX + 4, currentY + 5);

    attachedFiles.forEach((file, idx) => {
      const itemY = currentY + 9 + (idx * 4.2);
      const fileLine = `[YÜKLENDİ] ${file.category}: ${file.name}`;
      setPdfFont('normal');
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(7.5);
      doc.text(formatText(fileLine), marginX + 6, itemY);

      setPdfFont('bold');
      doc.setTextColor(5, 150, 105); // Emerald
      doc.text(formatText('[Form Ekinde Mevcut]'), marginX + 125, itemY);
    });
  } else {
    setPdfFont('bold');
    doc.setFontSize(8.5);
    doc.setTextColor(225, 29, 72); // Rose 600
    doc.text(formatText('Evrak eklenmedi'), marginX + 4, currentY + 6.5);
  }

  currentY += evrakBoxH + 3;

  // -------------------------------------------------------------
  // SECTION 6: APPROVAL BOXES
  // -------------------------------------------------------------
  const boxW3 = (contentWidth - 6) / 3;
  const approvalBoxH = 26;

  // 1. Şirket Yetkilisi İmza & Kaşe
  drawBox(marginX, currentY, boxW3, approvalBoxH, '#FFFFFF');
  doc.setFillColor(30, 41, 59);
  doc.rect(marginX, currentY, boxW3, 4.8, 'F');
  doc.setTextColor(255, 255, 255);
  setPdfFont('bold');
  doc.setFontSize(7.5);
  doc.text(formatText('FİRMA KAŞE / İMZA'), marginX + boxW3 / 2, currentY + 3.5, { align: 'center' });

  doc.setTextColor(148, 163, 184);
  setPdfFont('italic');
  doc.setFontSize(7);
  doc.text(formatText('(İmza / Kaşe Alanı)'), marginX + boxW3 / 2, currentY + 15, { align: 'center' });

  // 2. Pazarlama Onayı
  const pX = marginX + boxW3 + 3;
  drawBox(pX, currentY, boxW3, approvalBoxH, '#FFFFFF');
  doc.setFillColor(30, 41, 59);
  doc.rect(pX, currentY, boxW3, 4.8, 'F');
  doc.setTextColor(255, 255, 255);
  setPdfFont('bold');
  doc.setFontSize(7.5);
  doc.text(formatText('PAZARLAMA ONAYI'), pX + boxW3 / 2, currentY + 3.5, { align: 'center' });

  doc.setTextColor(148, 163, 184);
  setPdfFont('italic');
  doc.setFontSize(7);
  doc.text(formatText('(Onay / İmza Alanı)'), pX + boxW3 / 2, currentY + 15, { align: 'center' });

  // 3. Muhasebe Onayı
  const mX = pX + boxW3 + 3;
  drawBox(mX, currentY, boxW3, approvalBoxH, '#FFFFFF');
  doc.setFillColor(30, 41, 59);
  doc.rect(mX, currentY, boxW3, 4.8, 'F');
  doc.setTextColor(255, 255, 255);
  setPdfFont('bold');
  doc.setFontSize(7.5);
  doc.text(formatText('MUHASEBE ONAYI'), mX + boxW3 / 2, currentY + 3.5, { align: 'center' });

  doc.setTextColor(148, 163, 184);
  setPdfFont('italic');
  doc.setFontSize(7);
  doc.text(formatText('(Onay / İmza Alanı)'), mX + boxW3 / 2, currentY + 15, { align: 'center' });

  currentY += approvalBoxH + 3;

  // -------------------------------------------------------------
  // APPEND ATTACHED IMAGE PAGES AT THE END OF PDF (IF ANY)
  // -------------------------------------------------------------
  if (attachedFiles && attachedFiles.length > 0) {
    attachedFiles.forEach((file, index) => {
      if (file.dataUrl && file.dataUrl.startsWith('data:image/')) {
        try {
          doc.addPage();
          // Header banner for attachment page
          doc.setFillColor(15, 23, 42); // Slate 900
          doc.rect(0, 0, 210, 16, 'F');
          doc.setTextColor(255, 255, 255);
          setPdfFont('bold');
          doc.setFontSize(9.5);
          doc.text(formatText(`EK BELGE ${index + 1}: ${file.category.toUpperCase()}`), 10, 11);
          doc.setFontSize(7.5);
          setPdfFont('normal');
          doc.text(formatText(`Dosya: ${file.name}`), 125, 11);

          // Add image onto page
          const format = file.type.includes('png') ? 'PNG' : 'JPEG';
          doc.addImage(file.dataUrl, format, 10, 22, 190, 255, undefined, 'FAST');
        } catch (err) {
          console.warn('Could not render attached image to PDF page:', err);
        }
      }
    });
  }

  // -------------------------------------------------------------
  // CONVERT JSPDF TO ARRAYBUFFER & MERGE ATTACHED PDF FILES (IF ANY)
  // -------------------------------------------------------------
  const jsPdfArrayBuffer = doc.output('arraybuffer');
  const pdfAttachments = (attachedFiles || []).filter(
    (f) => f.dataUrl && (f.dataUrl.includes('data:application/pdf') || f.name.toLowerCase().endsWith('.pdf'))
  );

  let finalPdfBytes: Uint8Array;

  if (pdfAttachments.length > 0) {
    try {
      const { PDFDocument } = await import('pdf-lib');
      const mergedPdf = await PDFDocument.load(jsPdfArrayBuffer);

      for (const file of pdfAttachments) {
        try {
          const base64Str = file.dataUrl.includes('base64,') ? file.dataUrl.split('base64,')[1] : file.dataUrl;
          const binaryStr = atob(base64Str);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }

          const attachedPdfDoc = await PDFDocument.load(bytes);
          const copiedPages = await mergedPdf.copyPages(attachedPdfDoc, attachedPdfDoc.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } catch (err) {
          console.warn('Could not merge attached PDF file:', file.name, err);
        }
      }

      finalPdfBytes = await mergedPdf.save();
    } catch (err) {
      console.error('Error merging PDF files using pdf-lib:', err);
      finalPdfBytes = new Uint8Array(jsPdfArrayBuffer);
    }
  } else {
    finalPdfBytes = new Uint8Array(jsPdfArrayBuffer);
  }

  return {
    save: (filename: string) => {
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    autoPrint: () => {
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      };
    },
    outputBlob: () => new Blob([finalPdfBytes], { type: 'application/pdf' }),
    getUint8Array: () => finalPdfBytes,
  };
}

/**
 * Creates filename in format: Cari_Hesap_Formu_[Firma_Adi]_[Tarih].pdf
 */
export function getPdfFilename(formData: CariFormData): string {
  let rawCompany = formData.firmaAdi?.value || 'Firma';
  let cleanCompany = rawCompany
    .replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 30);

  if (!cleanCompany || cleanCompany === '_') cleanCompany = 'Firma';

  let rawDate = formData.tarih?.value || new Date().toLocaleDateString('tr-TR');
  let cleanDate = rawDate.replace(/\//g, '.');

  return `Cari_Hesap_Formu_${cleanCompany}_${cleanDate}.pdf`;
}
