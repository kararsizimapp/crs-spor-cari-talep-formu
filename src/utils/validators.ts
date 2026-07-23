/**
 * Validation & Formatting Utilities for Turkish Business Forms
 */

/**
 * Normalizes Turkish phone numbers to '05XX XXX XX XX' or '02XX XXX XX XX' format.
 * Accepts +90, 90, 0, or unspaced formats.
 */
export function normalizePhone(raw: string): { formatted: string; isValid: boolean; warning?: string } {
  if (!raw || !raw.trim()) {
    return { formatted: '', isValid: true };
  }

  // Remove non-digit characters
  const digits = raw.replace(/\D/g, '');

  let cleaned = digits;
  if (cleaned.startsWith('90')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0090')) {
    cleaned = cleaned.substring(4);
  }

  if (cleaned.length === 10 && !cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }

  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    const formatted = `${cleaned.substring(0, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7, 9)} ${cleaned.substring(9, 11)}`;
    return { formatted, isValid: true };
  }

  return {
    formatted: raw,
    isValid: false,
    warning: 'Geçersiz telefon formatı. Örn: 0532 000 00 00',
  };
}

/**
 * Validates Email addresses
 */
export function validateEmail(email: string): { isValid: boolean; warning?: string } {
  if (!email || !email.trim()) return { isValid: true };

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const isValid = emailRegex.test(email.trim());

  return {
    isValid,
    warning: isValid ? undefined : 'Geçersiz e-posta adresi formatı!',
  };
}

/**
 * Normalizes & Formats Turkish IBAN
 * TRXX XXXX XXXX XXXX XXXX XXXX XX (26 chars total)
 */
export function normalizeIBAN(raw: string): { formatted: string; isValid: boolean; warning?: string } {
  if (!raw || !raw.trim()) return { formatted: '', isValid: true };

  // Remove spaces
  let cleaned = raw.replace(/\s+/g, '').toUpperCase();
  if (!cleaned.startsWith('TR')) {
    cleaned = 'TR' + cleaned.replace(/[^A-Z0-9]/g, '');
  }

  if (cleaned.length === 26) {
    // Format into groups of 4 and last 2
    const groups = [
      cleaned.substring(0, 4),
      cleaned.substring(4, 8),
      cleaned.substring(8, 12),
      cleaned.substring(12, 16),
      cleaned.substring(16, 20),
      cleaned.substring(20, 24),
      cleaned.substring(24, 26),
    ];
    return { formatted: groups.join(' '), isValid: true };
  }

  return {
    formatted: raw,
    isValid: false,
    warning: 'TR IBAN 26 karakterden oluşmalıdır. Örn: TR00 0000 0000 0000 0000 0000 00',
  };
}

export function formatIskontoOrani(val?: string): string {
  if (!val || val.trim() === '' || val.trim() === '-') return '-';
  let cleaned = val.trim();
  if (cleaned.endsWith('%')) {
    cleaned = '%' + cleaned.slice(0, -1).trim();
  } else if (!cleaned.startsWith('%')) {
    cleaned = '%' + cleaned;
  }
  return cleaned;
}

export function formatCurrencyTRY(val?: string): string {
  if (!val || !val.trim()) return '';
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  if (isNaN(num)) return '';
  return `${num.toLocaleString('tr-TR')} TL`;
}

/**
 * Validates Tax ID (10 digits) or TCKN (11 digits)
 */
export function validateTaxOrTCKN(val: string): { type: 'VKN' | 'TCKN'; isValid: boolean; warning?: string } {
  if (!val || !val.trim()) {
    return { type: 'VKN', isValid: true };
  }

  const digits = val.replace(/\D/g, '');
  if (digits.length === 11) {
    return { type: 'TCKN', isValid: true };
  } else if (digits.length === 10) {
    return { type: 'VKN', isValid: true };
  }

  return {
    type: digits.length > 10 ? 'TCKN' : 'VKN',
    isValid: false,
    warning: 'Vergi No 10 haneli, T.C. Kimlik No 11 haneli olmalıdır.',
  };
}

/**
 * Formats date string into DD.MM.YYYY
 */
export function formatDateTurkish(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }

  // If matches YYYY-MM-DD
  const isoMatch = dateStr.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch;
    return `${String(dd).padStart(2, '0')}.${String(mm).padStart(2, '0')}.${yyyy}`;
  }

  // If matches DD.MM.YYYY
  const trMatch = dateStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (trMatch) {
    const [, dd, mm, yyyy] = trMatch;
    return `${String(dd).padStart(2, '0')}.${String(mm).padStart(2, '0')}.${yyyy}`;
  }

  return dateStr;
}
