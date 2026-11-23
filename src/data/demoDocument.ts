import {
  AppSettings,
  BankDetails,
  calculateDueDateFromTerms,
  DefaultBusinessProfile,
  DocumentData,
} from '../types/billing';

// Clean geometric Studio Nova SVG logo encoded as data URL for instant crisp preview
const STUDIO_NOVA_LOGO_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none">
    <defs>
      <linearGradient id="novaGrad" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#3B82F6"/>
        <stop offset="55%" stop-color="#6366F1"/>
        <stop offset="100%" stop-color="#7C3AED"/>
      </linearGradient>
    </defs>
    <rect width="80" height="80" rx="18" fill="url(#novaGrad)"/>
    <path d="M40 16L45.8 34.2L64 40L45.8 45.8L40 64L34.2 45.8L16 40L34.2 34.2L40 16Z" fill="white"/>
    <circle cx="40" cy="40" r="4.5" fill="#4F46E5"/>
  </svg>`
)}`;

export const DEMO_BANK_DETAILS: BankDetails = {
  accountHolder: 'Studio Nova Design LLC',
  bankName: 'Mercury · Choice Financial Group',
  accountNumber: '8840-1920-4410',
  routingCode: '091311229 / CHFGUS44',
  paypalOrUpi: 'payments@studionova.design',
};

export function createEmptyBankDetails(): BankDetails {
  return {
    accountHolder: '',
    bankName: '',
    accountNumber: '',
    routingCode: '',
    paypalOrUpi: '',
  };
}

function getIsoDateOffset(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

export function createDemoDocument(): DocumentData {
  return {
    id: 'demo-doc-1',
    mode: 'invoice',
    currency: 'USD',
    template: 'modern',
    accentColor: 'purple',
    customAccentHex: '#6366F1',
    status: 'none',
    business: {
      name: 'Studio Nova',
      email: 'billing@studionova.design',
      address: '548 Market Street, Suite 410\nSan Francisco, CA 94104',
      logoDataUrl: STUDIO_NOVA_LOGO_SVG,
      bankDetails: { ...DEMO_BANK_DETAILS },
      paymentQrLink: 'https://paypal.me/studionova',
      showPaymentQr: true,
    },
    client: {
      name: 'Elena Vance',
      companyOrEmail: 'Aether Labs Inc. · elena@aetherlabs.io',
      address: '210 Mercer Street, Floor 4\nNew York, NY 10012',
    },
    details: {
      documentNumber: 'INV-2026-001',
      issueDate: getIsoDateOffset(0),
      dueDate: getIsoDateOffset(14),
      notes:
        'Payment due within 14 days. Thank you for partnering with Studio Nova.',
    },
    items: [
      {
        id: 'item-1',
        description: 'Brand Strategy & Visual Identity System',
        quantity: 1,
        unitPrice: 2400,
      },
      {
        id: 'item-2',
        description: 'Responsive Marketing Site & Interactive UI Build',
        quantity: 1,
        unitPrice: 3850,
      },
      {
        id: 'item-3',
        description: 'Design Tokens, Motion Specs & QA Handoff (hrs)',
        quantity: 12,
        unitPrice: 150,
      },
    ],
    taxRate: 8.5,
    discountType: 'percent',
    discountValue: 5,
    signatureDataUrl: null,
    updatedAt: new Date().toISOString(),
  };
}

export function createBlankDocument(
  mode: 'invoice' | 'proposal' = 'invoice',
  defaultProfile?: DefaultBusinessProfile | null,
  settings?: AppSettings,
  generatedDocNumber?: string
): DocumentData {
  const prefix = mode === 'invoice' ? 'INV' : 'PROP';
  const rand = String(Math.floor(100 + Math.random() * 900));
  const issueDate = getIsoDateOffset(0);
  const dueDate = settings
    ? calculateDueDateFromTerms(issueDate, settings.defaultPaymentTerms)
    : getIsoDateOffset(14);

  return {
    id: `doc-${Date.now()}`,
    mode,
    currency: settings?.defaultCurrency ?? 'USD',
    template: 'modern',
    accentColor: 'purple',
    customAccentHex: '#6366F1',
    status: 'none',
    business: defaultProfile
      ? {
          name: defaultProfile.business.name || '',
          email: defaultProfile.business.email || '',
          address: defaultProfile.business.address || '',
          logoDataUrl: defaultProfile.business.logoDataUrl ?? null,
          bankDetails: defaultProfile.business.bankDetails
            ? { ...defaultProfile.business.bankDetails }
            : createEmptyBankDetails(),
          paymentDetails: defaultProfile.business.paymentDetails || '',
          paymentQrLink: defaultProfile.business.paymentQrLink || '',
          showPaymentQr: Boolean(defaultProfile.business.showPaymentQr),
        }
      : {
          name: '',
          email: '',
          address: '',
          logoDataUrl: null,
          bankDetails: createEmptyBankDetails(),
          paymentDetails: '',
          paymentQrLink: '',
          showPaymentQr: false,
        },
    client: {
      name: '',
      companyOrEmail: '',
      address: '',
    },
    details: {
      documentNumber:
        generatedDocNumber || `${prefix}-${new Date().getFullYear()}-${rand}`,
      issueDate,
      dueDate,
      notes:
        mode === 'invoice'
          ? 'Payment is due within 14 days of invoice issue.'
          : 'This proposal is valid for 30 days from the issue date.',
    },
    items: [
      {
        id: `item-${Date.now()}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
      },
    ],
    taxRate: settings?.defaultTaxRate ?? 0,
    discountType: 'percent',
    discountValue: 0,
    signatureDataUrl: defaultProfile ? defaultProfile.signatureDataUrl : null,
    updatedAt: new Date().toISOString(),
  };
}
