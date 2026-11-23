export type DocumentMode = 'invoice' | 'proposal';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'INR';

export type TemplateTheme = 'minimalist' | 'modern' | 'corporate';

export type AccentColorId = 'navy' | 'emerald' | 'purple' | 'crimson' | 'slate';

export type DocumentStatus = 'none' | 'paid' | 'pending' | 'draft';

export type DiscountType = 'percent' | 'flat';

export interface AccentColorConfig {
  id: AccentColorId;
  name: string;
  swatch: string;
  primary: string;
  gradientEnd: string;
  soft: string;
  border: string;
  tableText: string;
}

export const ACCENT_COLORS: Record<AccentColorId, AccentColorConfig> = {
  navy: {
    id: 'navy',
    name: 'Midnight Navy',
    swatch: '#1E3A8A',
    primary: '#1E3A8A',
    gradientEnd: '#2563EB',
    soft: '#EFF6FF',
    border: '#DBEAFE',
    tableText: '#1E40AF',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Green',
    swatch: '#059669',
    primary: '#047857',
    gradientEnd: '#10B981',
    soft: '#ECFDF5',
    border: '#D1FAE5',
    tableText: '#065F46',
  },
  purple: {
    id: 'purple',
    name: 'Royal Purple',
    swatch: '#6366F1',
    primary: '#4F46E5',
    gradientEnd: '#7C3AED',
    soft: '#F5F3FF',
    border: '#E0E7FF',
    tableText: '#4338CA',
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson Red',
    swatch: '#E11D48',
    primary: '#BE123C',
    gradientEnd: '#F43F5E',
    soft: '#FFF1F2',
    border: '#FFE4E6',
    tableText: '#9F1239',
  },
  slate: {
    id: 'slate',
    name: 'Slate Black',
    swatch: '#0F172A',
    primary: '#0F172A',
    gradientEnd: '#334155',
    soft: '#F8FAFC',
    border: '#E2E8F0',
    tableText: '#334155',
  },
};

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
  locale: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', label: 'USD $', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', label: 'EUR €', locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', label: 'GBP £', locale: 'en-GB' },
  INR: { code: 'INR', symbol: '₹', label: 'INR ₹', locale: 'en-IN' },
};

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface BankDetails {
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  routingCode: string;
  paypalOrUpi: string;
}

export interface BusinessInfo {
  name: string;
  email: string;
  address: string;
  logoDataUrl: string | null;
  bankDetails?: BankDetails;
  paymentDetails?: string;
  paymentQrLink?: string;
  showPaymentQr?: boolean;
}

export interface ClientInfo {
  name: string;
  companyOrEmail: string;
  address: string;
}

export interface DocumentDetails {
  documentNumber: string;
  issueDate: string;
  dueDate: string;
  notes: string;
}

export interface DocumentData {
  id: string;
  mode: DocumentMode;
  currency: CurrencyCode;
  template: TemplateTheme;
  accentColor?: AccentColorId | 'custom';
  customAccentHex?: string;
  status?: DocumentStatus;
  business: BusinessInfo;
  client: ClientInfo;
  details: DocumentDetails;
  items: LineItem[];
  taxRate: number;
  discountType: DiscountType;
  discountValue: number;
  depositPaid?: number;
  signatureDataUrl: string | null;
  updatedAt: string;
}

export interface SavedDocumentRecord {
  id: string;
  title: string;
  mode: DocumentMode;
  documentNumber: string;
  clientName: string;
  currency: CurrencyCode;
  grandTotal: number;
  savedAt: string;
  data: DocumentData;
}

export interface DefaultBusinessProfile {
  business: BusinessInfo;
  signatureDataUrl: string | null;
  savedAt: string;
}

export interface SavedClientRecord {
  id: string;
  name: string;
  companyOrEmail: string;
  address: string;
  updatedAt: string;
}

export interface SavedServiceRecord {
  id: string;
  description: string;
  unitPrice: number;
  defaultQty?: number;
  updatedAt: string;
}

export type PaperSize = 'a4' | 'letter';
export type TaxLabelPreset = 'Tax' | 'GST' | 'VAT' | 'Sales Tax';
export type DateFormatOption = 'DD/MM/YYYY' | 'MM/DD/YYYY';
export type DocumentFontOption = 'modern-sans' | 'classic-serif' | 'clean-mono';
export type PaymentTermsOption = 'due-on-receipt' | 'net-7' | 'net-15' | 'net-30';
export type GlassBlurIntensity = 'subtle' | 'medium' | 'heavy';

export interface FeatureToggles {
  paymentQr: boolean;
  digitalSignature: boolean;
  bankDetails: boolean;
  taxCalculator: boolean;
  statusStamp: boolean;
  poweredByFooter: boolean;
}

export interface AppSettings {
  features: FeatureToggles;
  paperSize: PaperSize;
  taxLabel: string;
  dateFormat: DateFormatOption;
  documentFont: DocumentFontOption;
  documentPrefix: string;
  autoIncrementNumber: boolean;
  defaultPaymentTerms: PaymentTermsOption;
  defaultCurrency: CurrencyCode;
  defaultTaxRate: number;
  glassBlurIntensity: GlassBlurIntensity;
  privacyPinEnabled: boolean;
  privacyPinCode: string;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  features: {
    paymentQr: true,
    digitalSignature: true,
    bankDetails: true,
    taxCalculator: true,
    statusStamp: true,
    poweredByFooter: false,
  },
  paperSize: 'a4',
  taxLabel: 'Tax',
  dateFormat: 'MM/DD/YYYY',
  documentFont: 'modern-sans',
  documentPrefix: 'INV-2026-',
  autoIncrementNumber: true,
  defaultPaymentTerms: 'net-15',
  defaultCurrency: 'USD',
  defaultTaxRate: 0,
  glassBlurIntensity: 'medium',
  privacyPinEnabled: false,
  privacyPinCode: '',
};

export const PAPER_DIMENSIONS: Record<
  PaperSize,
  { label: string; shortLabel: string; width: number; height: number }
> = {
  a4: {
    label: 'A4 (210 × 297 mm)',
    shortLabel: 'A4',
    width: 794,
    height: 1122,
  },
  letter: {
    label: 'US Letter (8.5 × 11 in)',
    shortLabel: 'US Letter',
    width: 816,
    height: 1056,
  },
};

export const PAYMENT_TERMS_OPTIONS: {
  id: PaymentTermsOption;
  label: string;
  days: number;
}[] = [
  { id: 'due-on-receipt', label: 'Due on Receipt', days: 0 },
  { id: 'net-7', label: 'Net 7', days: 7 },
  { id: 'net-15', label: 'Net 15', days: 15 },
  { id: 'net-30', label: 'Net 30', days: 30 },
];

export function calculateDueDateFromTerms(
  issueDateIso: string,
  terms: PaymentTermsOption
): string {
  const term = PAYMENT_TERMS_OPTIONS.find((t) => t.id === terms);
  const days = term ? term.days : 14;
  const parts = issueDateIso.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return issueDateIso;
  }
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  if (Number.isNaN(dt.getTime())) return issueDateIso;
  dt.setDate(dt.getDate() + days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface InvoqorBackupPayload {
  version: number;
  exportedAt: string;
  draft: DocumentData | null;
  history: SavedDocumentRecord[];
  defaultProfile: DefaultBusinessProfile | null;
  savedClients: SavedClientRecord[];
  savedServices?: SavedServiceRecord[];
  uiBackgroundColor?: string;
  settings?: AppSettings;
}

export interface DocumentTotals {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
  depositPaid: number;
  balanceDue: number;
}

export function calculateDocumentTotals(
  doc: DocumentData,
  includeTaxAndDiscount = true
): DocumentTotals {
  const subtotal = doc.items.reduce((sum, item) => {
    const qty = Number.isFinite(item.quantity) ? Math.max(0, item.quantity) : 0;
    const price = Number.isFinite(item.unitPrice) ? Math.max(0, item.unitPrice) : 0;
    return sum + qty * price;
  }, 0);

  if (!includeTaxAndDiscount) {
    return {
      subtotal,
      discountAmount: 0,
      taxableAmount: subtotal,
      taxAmount: 0,
      grandTotal: subtotal,
      depositPaid: 0,
      balanceDue: subtotal,
    };
  }

  const rawDiscount = Number.isFinite(doc.discountValue) ? Math.max(0, doc.discountValue) : 0;
  const discountAmount =
    doc.discountType === 'percent'
      ? Math.min(subtotal, subtotal * (Math.min(100, rawDiscount) / 100))
      : Math.min(subtotal, rawDiscount);

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxRate = Number.isFinite(doc.taxRate) ? Math.max(0, Math.min(100, doc.taxRate)) : 0;
  const taxAmount = taxableAmount * (taxRate / 100);
  const grandTotal = taxableAmount + taxAmount;
  const depositPaid = Number.isFinite(doc.depositPaid)
    ? Math.max(0, doc.depositPaid ?? 0)
    : 0;
  const balanceDue = Math.max(0, grandTotal - depositPaid);

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    grandTotal,
    depositPaid,
    balanceDue,
  };
}

export function formatMoney(amount: number, currency: CurrencyCode): string {
  const cfg = CURRENCIES[currency];
  const safe = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(cfg.locale, {
      style: 'currency',
      currency: cfg.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe);
  } catch {
    return `${cfg.symbol}${safe.toFixed(2)}`;
  }
}
