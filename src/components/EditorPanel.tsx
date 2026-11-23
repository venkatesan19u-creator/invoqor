import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  BookmarkCheck,
  Building2,
  Check,
  ChevronDown,
  Coins,
  Eraser,
  FileText,
  ImagePlus,
  Landmark,
  LayoutTemplate,
  ListChecks,
  PenTool,
  Percent,
  Plus,
  QrCode,
  RotateCcw,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import {
  ACCENT_COLORS,
  AccentColorId,
  AppSettings,
  BankDetails,
  calculateDocumentTotals,
  calculateDueDateFromTerms,
  CURRENCIES,
  CurrencyCode,
  DEFAULT_APP_SETTINGS,
  DiscountType,
  DocumentData,
  DocumentMode,
  DocumentStatus,
  formatMoney,
  LineItem,
  SavedClientRecord,
  SavedServiceRecord,
  TemplateTheme,
} from '../types/billing';
import { normalizeHex } from '../utils/colorTheme';
import { GlassAccordionCard } from './GlassAccordionCard';
import { NumericInput } from './NumericInput';
import { SignaturePad } from './SignaturePad';

interface EditorPanelProps {
  doc: DocumentData;
  settings?: AppSettings;
  onChange: (updater: (prev: DocumentData) => DocumentData) => void;
  onResetDocument: () => void;
  onSaveToHistory: () => void;
  hasDefaultProfile: boolean;
  onSaveDefaultProfile: () => void;
  savedClients: SavedClientRecord[];
  onSaveCurrentClient: () => void;
  onDeleteSavedClient: (id: string) => void;
  savedServices: SavedServiceRecord[];
  onSaveServiceFromItem: (item: LineItem) => void;
  onDeleteSavedService: (id: string) => void;
  customA4Color: string;
  onCustomA4ColorChange: (hex: string) => void;
  isLightTheme?: boolean;
}

type SectionKey =
  | 'business'
  | 'client'
  | 'items'
  | 'tax'
  | 'templates'
  | 'signature';

const TEMPLATE_OPTIONS: {
  id: TemplateTheme;
  name: string;
  description: string;
  swatchClass: string;
}[] = [
  {
    id: 'minimalist',
    name: 'Minimalist Clean',
    description: 'Monochrome Swiss grid with crisp hairlines',
    swatchClass: 'bg-gradient-to-br from-slate-100 to-slate-300',
  },
  {
    id: 'modern',
    name: 'Modern Glass Accent',
    description: 'Gradient accent bar and soft tinted totals',
    swatchClass: 'bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600',
  },
  {
    id: 'corporate',
    name: 'Classic Corporate',
    description: 'Solid accent header band and formal ledger grid',
    swatchClass: 'bg-gradient-to-br from-slate-800 to-slate-950',
  },
];

const STATUS_OPTIONS: { id: DocumentStatus; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'paid', label: 'PAID' },
  { id: 'pending', label: 'PENDING' },
  { id: 'draft', label: 'DRAFT' },
];

const QUICK_PAYMENT_TERMS: { label: string; text: string }[] = [
  {
    label: 'Due Upon Receipt',
    text: 'Payment is due upon receipt. Please remit payment via the details listed below. Thank you for your business.',
  },
  {
    label: 'Net 15 Days',
    text: 'Payment terms: Net 15 days from the issue date. Please include the document number as your payment reference.',
  },
  {
    label: '50% Upfront, 50% on Delivery',
    text: 'Payment schedule: 50% advance deposit due prior to project kickoff, with the remaining 50% balance due upon final delivery.',
  },
];

export const EditorPanel: React.FC<EditorPanelProps> = ({
  doc,
  settings = DEFAULT_APP_SETTINGS,
  onChange,
  onResetDocument,
  onSaveToHistory,
  hasDefaultProfile,
  onSaveDefaultProfile,
  savedClients,
  onSaveCurrentClient,
  onDeleteSavedClient,
  savedServices,
  onSaveServiceFromItem,
  onDeleteSavedService,
  customA4Color,
  onCustomA4ColorChange,
  isLightTheme = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);

  const activeCustomHex = normalizeHex(doc.customAccentHex || '') ?? normalizeHex(customA4Color) ?? '#6366F1';
  const [customHexDraft, setCustomHexDraft] = useState(activeCustomHex);

  useEffect(() => {
    setCustomHexDraft(activeCustomHex);
  }, [activeCustomHex]);

  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(() => {
    const isDesktop = typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
    return {
      business: true,
      client: true,
      items: true,
      tax: isDesktop,
      templates: isDesktop,
      signature: true,
    };
  });

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        clientDropdownRef.current &&
        !clientDropdownRef.current.contains(e.target as Node)
      ) {
        setClientDropdownOpen(false);
      }
      if (
        serviceDropdownRef.current &&
        !serviceDropdownRef.current.contains(e.target as Node)
      ) {
        setServiceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const { features } = settings;
  const taxLabel = settings.taxLabel?.trim() || 'Tax';
  const totals = calculateDocumentTotals(doc, features.taxCalculator);
  const isInvoice = doc.mode === 'invoice';
  const currentAccent = doc.accentColor ?? 'purple';
  const currentStatus = doc.status ?? 'none';
  const activeAccentLabel =
    currentAccent === 'custom'
      ? `Custom (${activeCustomHex})`
      : ACCENT_COLORS[currentAccent].name;

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setMode = (mode: DocumentMode) => {
    onChange((prev) => {
      const currentNum = prev.details.documentNumber;
      let nextNum = currentNum;
      if (mode === 'proposal' && currentNum.startsWith('INV-')) {
        nextNum = currentNum.replace(/^INV-/, 'PROP-');
      } else if (mode === 'invoice' && currentNum.startsWith('PROP-')) {
        nextNum = currentNum.replace(/^PROP-/, 'INV-');
      }
      return {
        ...prev,
        mode,
        details: {
          ...prev.details,
          documentNumber: nextNum,
        },
      };
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (result) {
        onChange((prev) => ({
          ...prev,
          business: { ...prev.business, logoDataUrl: result },
        }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const updateItem = (id: string, patch: Partial<LineItem>) => {
    onChange((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const addItem = () => {
    onChange((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          description: '',
          quantity: 1,
          unitPrice: 0,
        },
      ],
    }));
  };

  const deleteItem = (id: string) => {
    onChange((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    onChange((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.items.length) return prev;
      const nextItems = [...prev.items];
      const [moved] = nextItems.splice(index, 1);
      nextItems.splice(targetIndex, 0, moved);
      return {
        ...prev,
        items: nextItems,
      };
    });
  };

  const handleInsertSavedService = (service: SavedServiceRecord) => {
    onChange((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          description: service.description,
          quantity: service.defaultQty && service.defaultQty > 0 ? service.defaultQty : 1,
          unitPrice: service.unitPrice,
        },
      ],
    }));
    setServiceDropdownOpen(false);
  };

  const handleSelectSavedClient = (client: SavedClientRecord) => {
    onChange((prev) => ({
      ...prev,
      client: {
        name: client.name,
        companyOrEmail: client.companyOrEmail,
        address: client.address,
      },
    }));
    setClientDropdownOpen(false);
  };

  const bankDetails: BankDetails = doc.business.bankDetails ?? {
    accountHolder: '',
    bankName: '',
    accountNumber: '',
    routingCode: '',
    paypalOrUpi: '',
  };

  const updateBankField = (field: keyof BankDetails, value: string) => {
    onChange((prev) => ({
      ...prev,
      business: {
        ...prev.business,
        bankDetails: {
          accountHolder: prev.business.bankDetails?.accountHolder ?? '',
          bankName: prev.business.bankDetails?.bankName ?? '',
          accountNumber: prev.business.bankDetails?.accountNumber ?? '',
          routingCode: prev.business.bankDetails?.routingCode ?? '',
          paypalOrUpi: prev.business.bankDetails?.paypalOrUpi ?? '',
          [field]: value,
        },
      },
    }));
  };

  return (
    <div className="space-y-3.5">
      {/* Compact Editor Header with Start Fresh Trigger */}
      <div className="glass-card rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-sm font-semibold ui-text-primary truncate">
            {isInvoice ? 'Invoice Editor' : 'Proposal Editor'}
          </h2>
          <p className="text-[11px] ui-text-muted truncate">
            {hasDefaultProfile
              ? 'Default business profile ready'
              : 'Live synced to document preview'}
          </p>
        </div>

        <button
          type="button"
          onClick={onResetDocument}
          title="Clear fields and start a blank document"
          className="ui-btn-soft min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Eraser className="w-3.5 h-3.5 ui-accent-text" />
          Start Fresh
        </button>
      </div>

      {/* Mobile-only Invoice / Proposal Toggle Card */}
      <div className="md:hidden glass-card rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="ui-subpanel ui-text-secondary w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <span className="font-display text-[15px] font-semibold ui-text-primary truncate">
            {isInvoice ? 'Invoice Mode' : 'Proposal Mode'}
          </span>
        </div>

        <div className="ui-subpanel flex items-center gap-1 p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setMode('invoice')}
            className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              isInvoice
                ? isLightTheme
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-950 shadow-sm'
                : 'ui-text-secondary hover:opacity-80'
            }`}
          >
            Invoice
          </button>
          <button
            type="button"
            onClick={() => setMode('proposal')}
            className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              !isInvoice
                ? isLightTheme
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-950 shadow-sm'
                : 'ui-text-secondary hover:opacity-80'
            }`}
          >
            Proposal
          </button>
        </div>
      </div>

      {/* Mobile-only Currency Card */}
      <div className="md:hidden glass-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="ui-subpanel ui-text-secondary w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-display text-[15px] font-semibold ui-text-primary">Currency</h2>
            <p className="text-xs ui-text-muted">Active: {CURRENCIES[doc.currency].label}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
            const active = doc.currency === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => onChange((prev) => ({ ...prev, currency: code }))}
                className={`min-h-[44px] rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/30'
                    : 'ui-btn-soft'
                }`}
              >
                {CURRENCIES[code].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. Business & Logo Card */}
      <GlassAccordionCard
        title="Business & Logo"
        subtitle={doc.business.name || 'Add studio or company identity'}
        icon={<Building2 className="w-4 h-4" />}
        isOpen={openSections.business}
        onToggle={() => toggleSection('business')}
      >
        <div className="space-y-3.5 pt-2">
          {/* Interactive Logo Upload Box */}
          <div>
            <label className="block text-xs font-medium ui-text-secondary mb-1.5">
              Brand Logo
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="ui-subpanel flex-1 min-h-[64px] px-3.5 py-2.5 rounded-xl border-dashed hover:border-indigo-400/50 transition-colors flex items-center gap-3 text-left cursor-pointer"
              >
                {doc.business.logoDataUrl ? (
                  <img
                    src={doc.business.logoDataUrl}
                    alt="Uploaded business logo"
                    className="w-11 h-11 rounded-lg object-contain bg-white p-1 shrink-0"
                  />
                ) : (
                  <div className="ui-btn-soft w-11 h-11 rounded-lg flex items-center justify-center shrink-0">
                    <ImagePlus className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-semibold ui-text-primary truncate">
                    {doc.business.logoDataUrl ? 'Replace Logo Image' : 'Upload Logo (PNG, JPG, SVG)'}
                  </div>
                  <div className="text-[11px] ui-text-muted truncate mt-0.5">
                    Converted locally in your browser
                  </div>
                </div>
              </button>

              {doc.business.logoDataUrl && (
                <button
                  type="button"
                  onClick={() =>
                    onChange((prev) => ({
                      ...prev,
                      business: { ...prev.business, logoDataUrl: null },
                    }))
                  }
                  title="Remove logo"
                  aria-label="Remove logo"
                  className="ui-btn-soft min-w-[44px] min-h-[44px] rounded-xl hover:text-rose-400 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="biz-name" className="block text-xs font-medium ui-text-secondary mb-1.5">
                Business Name
              </label>
              <input
                id="biz-name"
                type="text"
                value={doc.business.name}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    business: { ...prev.business, name: e.target.value },
                  }))
                }
                placeholder="Studio Nova"
                className="glass-input w-full h-11 px-3.5 rounded-xl text-sm"
              />
            </div>

            <div>
              <label htmlFor="biz-email" className="block text-xs font-medium ui-text-secondary mb-1.5">
                Business Email
              </label>
              <input
                id="biz-email"
                type="email"
                value={doc.business.email}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    business: { ...prev.business, email: e.target.value },
                  }))
                }
                placeholder="billing@studionova.design"
                className="glass-input w-full h-11 px-3.5 rounded-xl text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="biz-address" className="block text-xs font-medium ui-text-secondary mb-1.5">
              Business Address
            </label>
            <textarea
              id="biz-address"
              rows={2}
              value={doc.business.address}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  business: { ...prev.business, address: e.target.value },
                }))
              }
              placeholder="548 Market Street, San Francisco, CA"
              className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm resize-none"
            />
          </div>

          {/* Structured Bank & Payment Details and Payment QR Sections */}
          {(features.bankDetails || features.paymentQr) && (
            <div className="pt-3 border-t ui-divider space-y-3">
              {features.bankDetails && (
                <>
                  <div className="flex items-center gap-2">
                    <Landmark className="w-3.5 h-3.5 ui-accent-text shrink-0" />
                    <span className="text-xs font-semibold ui-text-primary">
                      Bank &amp; Payment Details
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="bank-holder"
                        className="block text-xs font-medium ui-text-secondary mb-1.5"
                      >
                        Account Holder Name
                      </label>
                      <input
                        id="bank-holder"
                        type="text"
                        value={bankDetails.accountHolder}
                        onChange={(e) => updateBankField('accountHolder', e.target.value)}
                        placeholder="Studio Nova Design LLC"
                        className="glass-input w-full h-11 px-3.5 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="bank-name"
                        className="block text-xs font-medium ui-text-secondary mb-1.5"
                      >
                        Bank Name
                      </label>
                      <input
                        id="bank-name"
                        type="text"
                        value={bankDetails.bankName}
                        onChange={(e) => updateBankField('bankName', e.target.value)}
                        placeholder="Mercury · Choice Financial Group"
                        className="glass-input w-full h-11 px-3.5 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="bank-account"
                        className="block text-xs font-medium ui-text-secondary mb-1.5"
                      >
                        Account Number / IBAN
                      </label>
                      <input
                        id="bank-account"
                        type="text"
                        value={bankDetails.accountNumber}
                        onChange={(e) => updateBankField('accountNumber', e.target.value)}
                        placeholder="8840-1920-4410"
                        className="glass-input font-mono-nums w-full h-11 px-3.5 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="bank-routing"
                        className="block text-xs font-medium ui-text-secondary mb-1.5"
                      >
                        Routing / SWIFT / IFSC Code
                      </label>
                      <input
                        id="bank-routing"
                        type="text"
                        value={bankDetails.routingCode}
                        onChange={(e) => updateBankField('routingCode', e.target.value)}
                        placeholder="091311229 / CHFGUS44"
                        className="glass-input font-mono-nums w-full h-11 px-3.5 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="bank-paypal-upi"
                      className="block text-xs font-medium ui-text-secondary mb-1.5"
                    >
                      PayPal Email or UPI ID
                    </label>
                    <input
                      id="bank-paypal-upi"
                      type="text"
                      value={bankDetails.paypalOrUpi}
                      onChange={(e) => updateBankField('paypalOrUpi', e.target.value)}
                      placeholder="payments@studionova.design or name@upi"
                      className="glass-input w-full h-11 px-3.5 rounded-xl text-sm"
                    />
                  </div>
                </>
              )}

              {/* Payment QR Code Link & Visibility Toggle */}
              {features.paymentQr && (
                <div
                  className={`${
                    features.bankDetails ? 'pt-2.5 border-t ui-divider' : ''
                  } space-y-2.5`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="payment-qr-link"
                      className="inline-flex items-center gap-1.5 text-xs font-medium ui-text-secondary"
                    >
                      <QrCode className="w-3.5 h-3.5 ui-accent-text shrink-0" />
                      <span>Payment QR Link / UPI ID</span>
                    </label>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] ui-text-secondary">
                        Show QR Code on Document
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(doc.business.showPaymentQr)}
                        aria-label="Show QR Code on Document"
                        onClick={() =>
                          onChange((prev) => ({
                            ...prev,
                            business: {
                              ...prev.business,
                              showPaymentQr: !prev.business.showPaymentQr,
                            },
                          }))
                        }
                        className={`relative w-11 h-6 rounded-full border p-0.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                          doc.business.showPaymentQr
                            ? 'bg-indigo-500 border-indigo-400'
                            : isLightTheme
                              ? 'bg-slate-900/15 border-slate-900/20'
                              : 'bg-white/15 border-white/15'
                        }`}
                      >
                        <span
                          className={`block w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            doc.business.showPaymentQr ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <input
                    id="payment-qr-link"
                    type="text"
                    value={doc.business.paymentQrLink ?? ''}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        business: {
                          ...prev.business,
                          paymentQrLink: e.target.value,
                        },
                      }))
                    }
                    placeholder="https://paypal.me/studionova, Stripe link, or UPI ID"
                    className="glass-input w-full h-11 px-3.5 rounded-xl text-sm"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-[11px] ui-text-muted">
              {hasDefaultProfile
                ? 'Default profile active for new documents'
                : 'Pre-fill new documents with this profile'}
            </span>
            <button
              type="button"
              onClick={onSaveDefaultProfile}
              className="ui-btn-soft min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BookmarkCheck className="w-3.5 h-3.5 ui-accent-text" />
              Save as Default Profile
            </button>
          </div>
        </div>
      </GlassAccordionCard>

      {/* 2. Client & Document Details Card */}
      <GlassAccordionCard
        title="Client Details"
        subtitle={
          doc.client.name
            ? `${doc.client.name} · ${doc.details.documentNumber || 'Draft'}`
            : 'Recipient info, dates, stamp & notes'
        }
        icon={<UserRound className="w-4 h-4" />}
        isOpen={openSections.client}
        onToggle={() => toggleSection('client')}
      >
        <div className="space-y-3.5 pt-2">
          {/* Quick-Select Saved Clients Dropdown */}
          <div className="relative" ref={clientDropdownRef}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium ui-text-secondary">Saved Clients</span>
              <span className="text-[11px] ui-text-muted">
                Auto-saved when client info is entered
              </span>
            </div>
            <button
              type="button"
              onClick={() => setClientDropdownOpen((v) => !v)}
              className="glass-input w-full h-11 px-3.5 rounded-xl text-sm flex items-center justify-between gap-2 text-left cursor-pointer"
            >
              <span className="inline-flex items-center gap-2 min-w-0 truncate ui-text-primary">
                <Users className="w-4 h-4 ui-accent-text shrink-0" />
                <span className="truncate">
                  {savedClients.length > 0
                    ? `Select a saved client (${savedClients.length})`
                    : 'No saved clients yet'}
                </span>
              </span>
              <ChevronDown
                className={`w-4 h-4 ui-text-muted shrink-0 transition-transform ${
                  clientDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {clientDropdownOpen && (
              <div className="ui-modal-surface absolute left-0 right-0 mt-1.5 z-30 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto custom-scrollbar">
                {savedClients.length === 0 ? (
                  <div className="px-3.5 py-4 text-center text-xs ui-text-muted">
                    Enter a client name below and it will appear here for 1-click reuse.
                  </div>
                ) : (
                  savedClients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between gap-2 px-3 py-2.5 border-b ui-divider last:border-b-0 hover:bg-indigo-500/10 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectSavedClient(client)}
                        className="flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <div className="text-xs font-semibold ui-text-primary truncate">
                          {client.name}
                        </div>
                        {client.companyOrEmail && (
                          <div className="text-[11px] ui-text-muted truncate mt-0.5">
                            {client.companyOrEmail}
                          </div>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSavedClient(client.id)}
                        aria-label={`Remove ${client.name} from saved clients`}
                        className="min-w-[32px] min-h-[32px] rounded-lg ui-text-muted hover:text-rose-500 hover:bg-rose-500/15 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="client-name" className="block text-xs font-medium ui-text-secondary mb-1.5">
                Client Name
              </label>
              <input
                id="client-name"
                type="text"
                value={doc.client.name}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    client: { ...prev.client, name: e.target.value },
                  }))
                }
                onBlur={onSaveCurrentClient}
                placeholder="Elena Vance"
                className="glass-input w-full h-11 px-3.5 rounded-xl text-sm"
              />
            </div>

            <div>
              <label htmlFor="client-company" className="block text-xs font-medium ui-text-secondary mb-1.5">
                Client Email / Company
              </label>
              <input
                id="client-company"
                type="text"
                value={doc.client.companyOrEmail}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    client: { ...prev.client, companyOrEmail: e.target.value },
                  }))
                }
                onBlur={onSaveCurrentClient}
                placeholder="Aether Labs Inc. · elena@aetherlabs.io"
                className="glass-input w-full h-11 px-3.5 rounded-xl text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="client-address" className="block text-xs font-medium ui-text-secondary mb-1.5">
              Client Address
            </label>
            <textarea
              id="client-address"
              rows={2}
              value={doc.client.address}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  client: { ...prev.client, address: e.target.value },
                }))
              }
              onBlur={onSaveCurrentClient}
              placeholder="210 Mercer Street, New York, NY"
              className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="doc-number" className="block text-xs font-medium ui-text-secondary mb-1.5">
                {isInvoice ? 'Invoice #' : 'Proposal #'}
              </label>
              <input
                id="doc-number"
                type="text"
                value={doc.details.documentNumber}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    details: { ...prev.details, documentNumber: e.target.value },
                  }))
                }
                placeholder={isInvoice ? 'INV-2026-001' : 'PROP-2026-001'}
                className="glass-input font-mono-nums w-full h-11 px-3.5 rounded-xl text-sm"
              />
            </div>

            <div>
              <label htmlFor="issue-date" className="block text-xs font-medium ui-text-secondary mb-1.5">
                {isInvoice ? 'Issue Date' : 'Date Prepared'}
              </label>
              <input
                id="issue-date"
                type="date"
                value={doc.details.issueDate}
                onChange={(e) => {
                  const nextIssueDate = e.target.value;
                  const autoDueDate = calculateDueDateFromTerms(
                    nextIssueDate,
                    settings.defaultPaymentTerms
                  );
                  onChange((prev) => ({
                    ...prev,
                    details: {
                      ...prev.details,
                      issueDate: nextIssueDate,
                      dueDate: autoDueDate,
                    },
                  }));
                }}
                className="glass-input w-full h-11 px-3 rounded-xl text-sm"
              />
            </div>

            <div>
              <label htmlFor="due-date" className="block text-xs font-medium ui-text-secondary mb-1.5">
                {isInvoice ? 'Due Date' : 'Valid Until'}
              </label>
              <input
                id="due-date"
                type="date"
                value={doc.details.dueDate}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    details: { ...prev.details, dueDate: e.target.value },
                  }))
                }
                className="glass-input w-full h-11 px-3 rounded-xl text-sm"
              />
            </div>
          </div>

          {/* Document Status Stamp Pill Selector */}
          {features.statusStamp && (
            <div>
              <span className="block text-xs font-medium ui-text-secondary mb-1.5">
                Document Status Stamp
              </span>
              <div
                className="ui-subpanel grid grid-cols-4 gap-1.5 p-1 rounded-xl"
                role="group"
                aria-label="Document status stamp"
              >
                {STATUS_OPTIONS.map((opt) => {
                  const active = currentStatus === opt.id;
                  const activeColors =
                    opt.id === 'paid'
                      ? isLightTheme
                        ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/45'
                        : 'bg-emerald-500/25 text-emerald-200 border-emerald-400/50'
                      : opt.id === 'pending'
                        ? isLightTheme
                          ? 'bg-amber-500/15 text-amber-700 border-amber-500/45'
                          : 'bg-amber-500/25 text-amber-200 border-amber-400/50'
                        : opt.id === 'draft'
                          ? isLightTheme
                            ? 'bg-slate-900/10 text-slate-800 border-slate-900/25'
                            : 'bg-slate-500/30 text-slate-100 border-slate-400/50'
                          : isLightTheme
                            ? 'bg-slate-900/10 text-slate-900 border-slate-900/20'
                            : 'bg-white/15 text-white border-white/20';

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChange((prev) => ({ ...prev, status: opt.id }))}
                      className={`min-h-[38px] rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        active
                          ? activeColors
                          : 'border-transparent ui-text-muted hover:opacity-90'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="doc-notes" className="block text-xs font-medium ui-text-secondary mb-1.5">
              Project Notes &amp; Terms
            </label>
            <textarea
              id="doc-notes"
              rows={2}
              value={doc.details.notes}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  details: { ...prev.details, notes: e.target.value },
                }))
              }
              placeholder="Payment terms, deliverables schedule, or thank you note..."
              className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm resize-none"
            />
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              {QUICK_PAYMENT_TERMS.map((preset) => {
                const active = doc.details.notes.trim() === preset.text;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      onChange((prev) => ({
                        ...prev,
                        details: { ...prev.details, notes: preset.text },
                      }))
                    }
                    className={`min-h-[32px] px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                      active
                        ? isLightTheme
                          ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-700 font-semibold'
                          : 'bg-indigo-500/20 border-indigo-400/55 text-indigo-200 font-semibold'
                        : 'ui-btn-soft'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </GlassAccordionCard>

      {/* 3. Dynamic Line Items Card */}
      <GlassAccordionCard
        title="Line Items"
        subtitle={`${doc.items.length} ${doc.items.length === 1 ? 'item' : 'items'} · Subtotal ${formatMoney(totals.subtotal, doc.currency)}`}
        icon={<ListChecks className="w-4 h-4" />}
        isOpen={openSections.items}
        onToggle={() => toggleSection('items')}
      >
        <div className="space-y-3 pt-2">
          {doc.items.length === 0 ? (
            <div className="ui-subpanel rounded-xl border-dashed py-6 px-4 text-center">
              <p className="text-sm ui-text-primary">No line items yet.</p>
              <p className="text-xs ui-text-muted mt-1">
                Add deliverables, consulting hours, or milestone fees below.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {doc.items.map((item, idx) => {
                const rowTotal =
                  (Number.isFinite(item.quantity) ? Math.max(0, item.quantity) : 0) *
                  (Number.isFinite(item.unitPrice) ? Math.max(0, item.unitPrice) : 0);
                const isAlreadySaved =
                  item.description.trim().length > 0 &&
                  savedServices.some(
                    (s) =>
                      s.description.trim().toLowerCase() ===
                        item.description.trim().toLowerCase() &&
                      s.unitPrice === item.unitPrice
                  );

                return (
                  <div
                    key={item.id}
                    className="ui-subpanel rounded-xl p-3 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-semibold ui-text-muted">
                          Item {idx + 1}
                        </span>
                        <div className="flex items-center gap-0.5 ml-1">
                          <button
                            type="button"
                            onClick={() => moveItem(idx, -1)}
                            disabled={idx === 0}
                            title="Move item up"
                            aria-label={`Move item ${idx + 1} up`}
                            className="w-7 h-7 rounded-md ui-text-muted hover:ui-text-primary hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(idx, 1)}
                            disabled={idx === doc.items.length - 1}
                            title="Move item down"
                            aria-label={`Move item ${idx + 1} down`}
                            className="w-7 h-7 rounded-md ui-text-muted hover:ui-text-primary hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-mono-nums text-xs font-semibold ui-accent-text mr-1">
                          {formatMoney(rowTotal, doc.currency)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSaveServiceFromItem(item)}
                          title={isAlreadySaved ? 'Saved in Quick Insert' : 'Save Item for Quick Insert'}
                          aria-label={`Save item ${idx + 1} to saved services`}
                          className={`min-w-[34px] min-h-[34px] rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                            isAlreadySaved
                              ? 'ui-accent-text bg-indigo-500/15'
                              : 'ui-text-muted hover:ui-accent-text hover:bg-indigo-500/15'
                          }`}
                        >
                          {isAlreadySaved ? (
                            <BookmarkCheck className="w-3.5 h-3.5" />
                          ) : (
                            <Bookmark className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteItem(item.id)}
                          aria-label={`Delete item ${idx + 1}`}
                          className="min-w-[34px] min-h-[34px] rounded-lg ui-text-muted hover:text-rose-500 hover:bg-rose-500/15 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, { description: e.target.value })}
                      placeholder="Service or deliverable description"
                      className="glass-input w-full h-10 px-3 rounded-lg text-sm"
                    />

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label
                          htmlFor={`item-qty-${item.id}`}
                          className="block text-[11px] ui-text-muted mb-1"
                        >
                          Qty
                        </label>
                        <NumericInput
                          id={`item-qty-${item.id}`}
                          value={item.quantity}
                          resetKey={doc.id}
                          placeholder="0"
                          ariaLabel={`Quantity for item ${idx + 1}`}
                          onChange={(nextQty) => updateItem(item.id, { quantity: nextQty })}
                          className="glass-input font-mono-nums w-full h-10 px-3 rounded-lg text-sm"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`item-price-${item.id}`}
                          className="block text-[11px] ui-text-muted mb-1"
                        >
                          Unit Price ({CURRENCIES[doc.currency].symbol})
                        </label>
                        <NumericInput
                          id={`item-price-${item.id}`}
                          value={item.unitPrice}
                          resetKey={doc.id}
                          placeholder="0"
                          ariaLabel={`Unit price for item ${idx + 1}`}
                          onChange={(nextPrice) => updateItem(item.id, { unitPrice: nextPrice })}
                          className="glass-input font-mono-nums w-full h-10 px-3 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Insert Saved Service Dropdown */}
          <div className="relative" ref={serviceDropdownRef}>
            <button
              type="button"
              onClick={() => setServiceDropdownOpen((v) => !v)}
              className="glass-input w-full h-11 px-3.5 rounded-xl text-xs font-medium flex items-center justify-between gap-2 text-left cursor-pointer"
            >
              <span className="inline-flex items-center gap-2 min-w-0 truncate ui-text-primary">
                <Bookmark className="w-3.5 h-3.5 ui-accent-text shrink-0" />
                <span className="truncate">
                  {savedServices.length > 0
                    ? `Quick Insert Saved Service (${savedServices.length})`
                    : 'Quick Insert Saved Service'}
                </span>
              </span>
              <ChevronDown
                className={`w-4 h-4 ui-text-muted shrink-0 transition-transform ${
                  serviceDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {serviceDropdownOpen && (
              <div className="ui-modal-surface absolute left-0 right-0 bottom-full mb-1.5 z-30 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto custom-scrollbar">
                {savedServices.length === 0 ? (
                  <div className="px-3.5 py-4 text-center text-xs ui-text-muted">
                    Tap the bookmark icon on any line item above to save frequent services and rates here.
                  </div>
                ) : (
                  savedServices.map((svc) => (
                    <div
                      key={svc.id}
                      className="flex items-center justify-between gap-2 px-3 py-2.5 border-b ui-divider last:border-b-0 hover:bg-indigo-500/10 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => handleInsertSavedService(svc)}
                        className="flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <div className="text-xs font-semibold ui-text-primary truncate">
                          {svc.description}
                        </div>
                        <div className="text-[11px] font-mono-nums ui-accent-text mt-0.5">
                          {formatMoney(svc.unitPrice, doc.currency)} · Qty{' '}
                          {svc.defaultQty && svc.defaultQty > 0 ? svc.defaultQty : 1}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSavedService(svc.id)}
                        aria-label={`Remove ${svc.description} from saved services`}
                        className="min-w-[32px] min-h-[32px] rounded-lg ui-text-muted hover:text-rose-500 hover:bg-rose-500/15 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="ui-btn-soft w-full min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 ui-accent-text" />
            Add Line Item
          </button>
        </div>
      </GlassAccordionCard>

      {/* 4. Tax & Discount Card */}
      {features.taxCalculator && (
        <GlassAccordionCard
          title={`${taxLabel} & Discount`}
          subtitle={
            totals.depositPaid > 0
              ? `${taxLabel} ${doc.taxRate}% · Balance Due ${formatMoney(totals.balanceDue, doc.currency)}`
              : `${taxLabel} ${doc.taxRate}% · Grand Total ${formatMoney(totals.grandTotal, doc.currency)}`
          }
          icon={<Percent className="w-4 h-4" />}
          isOpen={openSections.tax}
          onToggle={() => toggleSection('tax')}
        >
          <div className="space-y-3.5 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="tax-rate" className="block text-xs font-medium ui-text-secondary mb-1.5">
                  {taxLabel} Rate (%)
                </label>
                <NumericInput
                  id="tax-rate"
                  value={doc.taxRate}
                  resetKey={doc.id}
                  placeholder="0"
                  onChange={(nextTax) =>
                    onChange((prev) => ({
                      ...prev,
                      taxRate: nextTax,
                    }))
                  }
                  className="glass-input font-mono-nums w-full h-11 px-3.5 rounded-xl text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="discount-val" className="text-xs font-medium ui-text-secondary">
                    Discount
                  </label>
                  <div className="ui-subpanel flex items-center gap-1 rounded-lg p-0.5">
                    {(['percent', 'flat'] as DiscountType[]).map((dtype) => (
                      <button
                        key={dtype}
                        type="button"
                        onClick={() => onChange((prev) => ({ ...prev, discountType: dtype }))}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                          doc.discountType === dtype
                            ? 'bg-indigo-500 text-white'
                            : 'ui-text-muted hover:opacity-80'
                        }`}
                      >
                        {dtype === 'percent' ? '%' : CURRENCIES[doc.currency].symbol}
                      </button>
                    ))}
                  </div>
                </div>
                <NumericInput
                  id="discount-val"
                  value={doc.discountValue}
                  resetKey={doc.id}
                  placeholder="0"
                  onChange={(nextDiscount) =>
                    onChange((prev) => ({
                      ...prev,
                      discountValue: nextDiscount,
                    }))
                  }
                  className="glass-input font-mono-nums w-full h-11 px-3.5 rounded-xl text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="deposit-paid" className="block text-xs font-medium ui-text-secondary mb-1.5">
                Advance / Deposit Paid ({CURRENCIES[doc.currency].symbol})
              </label>
              <NumericInput
                id="deposit-paid"
                value={doc.depositPaid ?? 0}
                resetKey={doc.id}
                placeholder="0"
                onChange={(nextDeposit) =>
                  onChange((prev) => ({
                    ...prev,
                    depositPaid: nextDeposit,
                  }))
                }
                className="glass-input font-mono-nums w-full h-11 px-3.5 rounded-xl text-sm"
              />
            </div>

            <div className="ui-subpanel rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between ui-text-secondary">
                <span>Subtotal</span>
                <span className="font-mono-nums font-medium">
                  {formatMoney(totals.subtotal, doc.currency)}
                </span>
              </div>
              <div
                className={`flex justify-between ${
                  isLightTheme ? 'text-emerald-700' : 'text-emerald-300'
                }`}
              >
                <span>Discount</span>
                <span className="font-mono-nums font-medium">
                  -{formatMoney(totals.discountAmount, doc.currency)}
                </span>
              </div>
              <div className="flex justify-between ui-text-secondary">
                <span>
                  {taxLabel} ({doc.taxRate}%)
                </span>
                <span className="font-mono-nums font-medium">
                  {formatMoney(totals.taxAmount, doc.currency)}
                </span>
              </div>
              {totals.depositPaid > 0 ? (
                <>
                  <div className="pt-2 border-t ui-divider flex justify-between text-xs font-semibold ui-text-primary">
                    <span>Total</span>
                    <span className="font-mono-nums">
                      {formatMoney(totals.grandTotal, doc.currency)}
                    </span>
                  </div>
                  <div
                    className={`flex justify-between ${
                      isLightTheme ? 'text-emerald-700' : 'text-emerald-300'
                    }`}
                  >
                    <span>Deposit Paid (-)</span>
                    <span className="font-mono-nums font-medium">
                      -{formatMoney(totals.depositPaid, doc.currency)}
                    </span>
                  </div>
                  <div className="pt-2 border-t ui-divider flex justify-between text-sm font-semibold ui-text-primary">
                    <span>Balance Due</span>
                    <span className="font-mono-nums ui-accent-text">
                      {formatMoney(totals.balanceDue, doc.currency)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="pt-2 border-t ui-divider flex justify-between text-sm font-semibold ui-text-primary">
                  <span>Grand Total</span>
                  <span className="font-mono-nums ui-accent-text">
                    {formatMoney(totals.grandTotal, doc.currency)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </GlassAccordionCard>
      )}

      {/* 5. Templates & Unlimited A4 Accent Color Picker Card */}
      <GlassAccordionCard
        title="Templates"
        subtitle={`${TEMPLATE_OPTIONS.find((t) => t.id === doc.template)?.name} · ${activeAccentLabel}`}
        icon={<LayoutTemplate className="w-4 h-4" />}
        isOpen={openSections.templates}
        onToggle={() => toggleSection('templates')}
      >
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {TEMPLATE_OPTIONS.map((tpl) => {
              const active = doc.template === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, template: tpl.id }))}
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                    active
                      ? isLightTheme
                        ? 'bg-indigo-500/12 border-indigo-500/60 shadow-sm shadow-indigo-500/15'
                        : 'bg-indigo-500/20 border-indigo-400/70 shadow-sm shadow-indigo-500/20'
                      : 'ui-subpanel hover:opacity-95'
                  }`}
                >
                  <div className={`w-full h-8 rounded-lg mb-2.5 ${tpl.swatchClass}`} />
                  <div className="text-xs font-semibold ui-text-primary leading-snug">{tpl.name}</div>
                  <div className="text-[11px] ui-text-muted mt-1 leading-snug">
                    {tpl.description}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 5 Preset Swatches + Unlimited Custom Color Picker (+ Rainbow Button) */}
          <div className="pt-2 border-t ui-divider space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium ui-text-secondary">A4 Accent Color</span>
              <span className="text-[11px] ui-text-muted font-mono-nums">
                {activeAccentLabel}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(Object.keys(ACCENT_COLORS) as AccentColorId[]).map((colorId) => {
                const color = ACCENT_COLORS[colorId];
                const active = currentAccent === colorId;
                return (
                  <button
                    key={colorId}
                    type="button"
                    onClick={() => onChange((prev) => ({ ...prev, accentColor: colorId }))}
                    title={color.name}
                    aria-label={`Select ${color.name} accent color`}
                    aria-pressed={active}
                    className={`min-h-[48px] p-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      active
                        ? isLightTheme
                          ? 'bg-indigo-500/12 border-indigo-500/55 shadow-sm'
                          : 'bg-white/[0.12] border-white/35 shadow-sm'
                        : 'ui-subpanel hover:opacity-95'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full ring-2 flex items-center justify-center ${
                        isLightTheme ? 'ring-slate-900/15' : 'ring-white/20'
                      }`}
                      style={{ backgroundColor: color.swatch }}
                    >
                      {active && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    </span>
                    <span className="text-[10px] ui-text-secondary truncate max-w-full">
                      {color.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}

              {/* Unlimited Custom Color Picker (+ Rainbow Button) */}
              <label
                title="Pick any custom brand color"
                aria-label="Custom Color picker for A4 document"
                className={`relative overflow-hidden min-h-[48px] p-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  currentAccent === 'custom'
                    ? isLightTheme
                      ? 'bg-indigo-500/12 border-indigo-500/55 shadow-sm'
                      : 'bg-white/[0.12] border-white/35 shadow-sm'
                    : 'ui-subpanel hover:opacity-95'
                }`}
              >
                <input
                  type="color"
                  value={activeCustomHex}
                  onChange={(e) => {
                    const nextHex = e.target.value.toUpperCase();
                    onCustomA4ColorChange(nextHex);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <span
                  className={`w-5 h-5 rounded-full ring-2 flex items-center justify-center shadow-sm pointer-events-none ${
                    isLightTheme ? 'ring-slate-900/15' : 'ring-white/25'
                  }`}
                  style={{
                    background:
                      currentAccent === 'custom'
                        ? activeCustomHex
                        : 'conic-gradient(from 0deg, #EF4444, #F59E0B, #10B981, #3B82F6, #8B5CF6, #EC4899, #EF4444)',
                  }}
                >
                  <Plus className="w-3 h-3 text-white stroke-[3] drop-shadow" />
                </span>
                <span className="text-[10px] ui-text-secondary truncate max-w-full pointer-events-none">
                  Custom
                </span>
              </label>
            </div>

            {currentAccent === 'custom' && (
              <div className="ui-subpanel rounded-xl px-3 py-2 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <label
                    className={`relative overflow-hidden w-6 h-6 rounded-lg shrink-0 cursor-pointer ring-1 ${
                      isLightTheme ? 'ring-slate-900/20' : 'ring-white/25'
                    }`}
                    style={{ backgroundColor: activeCustomHex }}
                    title="Open color wheel"
                    aria-label="Adjust custom A4 accent color"
                  >
                    <input
                      type="color"
                      value={activeCustomHex}
                      onChange={(e) => onCustomA4ColorChange(e.target.value.toUpperCase())}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </label>
                  <span className="text-xs font-medium ui-text-secondary truncate">
                    Custom Color
                  </span>
                </div>
                <input
                  type="text"
                  value={customHexDraft}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomHexDraft(val);
                    const valid = normalizeHex(val);
                    if (valid) {
                      onCustomA4ColorChange(valid);
                    }
                  }}
                  onBlur={() => {
                    const valid = normalizeHex(customHexDraft);
                    if (valid) {
                      setCustomHexDraft(valid);
                      onCustomA4ColorChange(valid);
                    } else {
                      setCustomHexDraft(activeCustomHex);
                    }
                  }}
                  maxLength={7}
                  spellCheck={false}
                  aria-label="Custom A4 accent hex color"
                  className="glass-input font-mono-nums w-24 h-8 px-2.5 rounded-lg text-xs uppercase text-center"
                />
              </div>
            )}
          </div>
        </div>
      </GlassAccordionCard>

      {/* 6. Interactive Digital Signature Pad Card */}
      {features.digitalSignature && (
        <GlassAccordionCard
          title="Signature Pad"
          subtitle={doc.signatureDataUrl ? 'Signature attached' : 'Sign with mouse or touch'}
          icon={<PenTool className="w-4 h-4" />}
          isOpen={openSections.signature}
          onToggle={() => toggleSection('signature')}
        >
          <div className="pt-2">
            <SignaturePad
              value={doc.signatureDataUrl}
              isLightTheme={isLightTheme}
              onChange={(signatureDataUrl) =>
                onChange((prev) => ({ ...prev, signatureDataUrl }))
              }
            />
          </div>
        </GlassAccordionCard>
      )}

      {/* Draft Actions Row (Save to History + Reset / New Document) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 pb-2">
        <button
          type="button"
          onClick={onSaveToHistory}
          className="ui-btn-soft flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer"
        >
          Save Snapshot to History
        </button>

        <button
          type="button"
          onClick={onResetDocument}
          className="ui-btn-soft flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset / New Document
        </button>
      </div>
    </div>
  );
};
