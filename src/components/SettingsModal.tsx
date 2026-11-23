import React, { useEffect, useRef, useState } from 'react';
import {
  BookmarkCheck,
  Check,
  Download,
  DownloadCloud,
  FileText,
  Lock,
  Palette,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sliders,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  AppSettings,
  CURRENCIES,
  CurrencyCode,
  DateFormatOption,
  DocumentFontOption,
  FeatureToggles,
  GlassBlurIntensity,
  PAPER_DIMENSIONS,
  PaperSize,
  PAYMENT_TERMS_OPTIONS,
  PaymentTermsOption,
  TaxLabelPreset,
} from '../types/billing';
import { isColorLight, normalizeHex, UI_BACKGROUND_PRESETS } from '../utils/colorTheme';
import { NumericInput } from './NumericInput';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (updater: (prev: AppSettings) => AppSettings) => void;
  onPaymentTermsChange: (terms: PaymentTermsOption) => void;
  onResetAllSettings: () => void;
  onSaveDefaultProfile: () => void;
  hasDefaultProfile: boolean;
  uiBackgroundColor: string;
  onUiBackgroundChange: (hex: string) => void;
  documentAccentHex: string;
  onDocumentAccentChange: (hex: string) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onLockWorkspaceNow: () => void;
  isLightTheme: boolean;
}

const TAX_LABEL_PRESETS: TaxLabelPreset[] = ['Tax', 'GST', 'VAT', 'Sales Tax'];

const FONT_OPTIONS: {
  id: DocumentFontOption;
  label: string;
  sampleClass: string;
}[] = [
  { id: 'modern-sans', label: 'Modern Sans', sampleClass: 'font-sans' },
  { id: 'classic-serif', label: 'Classic Serif', sampleClass: 'font-serif' },
  { id: 'clean-mono', label: 'Clean Mono', sampleClass: 'font-mono' },
];

const BLUR_OPTIONS: { id: GlassBlurIntensity; label: string }[] = [
  { id: 'subtle', label: 'Subtle' },
  { id: 'medium', label: 'Medium' },
  { id: 'heavy', label: 'Heavy' },
];

const FEATURE_ROWS: {
  key: keyof FeatureToggles;
  label: string;
  description: string;
}[] = [
  {
    key: 'paymentQr',
    label: 'Payment QR Code',
    description: 'Show scannable payment link QR in editor and document footer',
  },
  {
    key: 'digitalSignature',
    label: 'Digital Signature Pad',
    description: 'Enable interactive signature pad and signature block on PDFs',
  },
  {
    key: 'bankDetails',
    label: 'Bank & Payment Details',
    description: 'Display structured bank transfer, IBAN, and UPI fields',
  },
  {
    key: 'taxCalculator',
    label: 'Tax & Discount Calculator',
    description: 'Include tax rate, discount, and adjusted total breakdown',
  },
  {
    key: 'statusStamp',
    label: 'Document Status Stamp',
    description: 'Render angled PAID / PENDING / DRAFT stamp badge on preview',
  },
  {
    key: 'poweredByFooter',
    label: "Show 'Powered by Invoqor' Footer",
    description: 'Add a subtle brand attribution line at the bottom of documents',
  },
];

interface IosSwitchProps {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
  isLightTheme: boolean;
}

const IosSwitch: React.FC<IosSwitchProps> = ({
  checked,
  onChange,
  ariaLabel,
  isLightTheme,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    onClick={onChange}
    className={`relative w-11 h-6 rounded-full border p-0.5 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
      checked
        ? 'bg-indigo-500 border-indigo-400'
        : isLightTheme
          ? 'bg-slate-900/15 border-slate-900/20'
          : 'bg-white/15 border-white/15'
    }`}
  >
    <span
      className={`block w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onPaymentTermsChange,
  onResetAllSettings,
  onSaveDefaultProfile,
  hasDefaultProfile,
  uiBackgroundColor,
  onUiBackgroundChange,
  documentAccentHex,
  onDocumentAccentChange,
  onExportBackup,
  onImportBackup,
  onLockWorkspaceNow,
  isLightTheme,
}) => {
  const backupInputRef = useRef<HTMLInputElement>(null);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const [bgHexDraft, setBgHexDraft] = useState(uiBackgroundColor);
  const [docHexDraft, setDocHexDraft] = useState(documentAccentHex);
  const [pinDraft, setPinDraft] = useState(settings.privacyPinCode || '');
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pwaNotice, setPwaNotice] = useState<string | null>(null);

  useEffect(() => {
    setBgHexDraft(uiBackgroundColor);
  }, [uiBackgroundColor]);

  useEffect(() => {
    setDocHexDraft(documentAccentHex);
  }, [documentAccentHex]);

  useEffect(() => {
    if (isOpen) {
      setPinDraft(settings.privacyPinCode || '');
      setIsEditingPin(false);
      setPinError(null);
      setConfirmReset(false);
      setPwaNotice(null);
    }
  }, [isOpen, settings.privacyPinCode]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleFeature = (key: keyof FeatureToggles) => {
    onUpdateSettings((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [key]: !prev.features[key],
      },
    }));
  };

  const handleTogglePin = () => {
    if (settings.privacyPinEnabled) {
      onUpdateSettings((prev) => ({
        ...prev,
        privacyPinEnabled: false,
      }));
      setIsEditingPin(false);
      setPinError(null);
      return;
    }

    if (/^\d{4}$/.test(settings.privacyPinCode)) {
      onUpdateSettings((prev) => ({
        ...prev,
        privacyPinEnabled: true,
      }));
    } else {
      setIsEditingPin(true);
      setPinDraft('');
      setPinError(null);
    }
  };

  const handleSavePin = () => {
    const cleaned = pinDraft.replace(/\D/g, '').slice(0, 4);
    if (!/^\d{4}$/.test(cleaned)) {
      setPinError('Enter exactly 4 numeric digits (0–9).');
      return;
    }
    onUpdateSettings((prev) => ({
      ...prev,
      privacyPinEnabled: true,
      privacyPinCode: cleaned,
    }));
    setPinDraft(cleaned);
    setIsEditingPin(false);
    setPinError(null);
  };

  const handleInstallPwaClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    if (isIOS) {
      setPwaNotice('In Safari, tap Share and choose "Add to Home Screen".');
      return;
    }
    if (isInstalled) {
      setPwaNotice('Invoqor is already installed on this device.');
      return;
    }
    setPwaNotice('Open your browser menu and select "Install Invoqor" or "Add to Home Screen".');
  };

  const activePillClass = isLightTheme
    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
    : 'bg-indigo-500 text-white border-indigo-400 shadow-sm shadow-indigo-500/25';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Invoqor Settings Control Center"
    >
      <div
        className="ui-modal-surface w-full sm:max-w-2xl max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile bottom-sheet grab handle */}
        <div className="sm:hidden w-10 h-1 bg-slate-400/35 rounded-full mx-auto mt-3 shrink-0" />

        {/* Sticky Modal Header */}
        <div className="px-5 py-4 border-b ui-divider flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="ui-subpanel w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
              <Settings className="w-4 h-4 ui-accent-text" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-semibold ui-text-primary truncate">
                Settings Control Center
              </h2>
              <p className="text-[11px] ui-text-muted truncate">
                100% local preferences saved automatically in your browser
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="ui-btn-soft min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable 5-Section Control Center Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
          {/* SECTION 1: Feature Toggles */}
          <section className="space-y-3" aria-labelledby="settings-sec-1">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 ui-accent-text shrink-0" />
              <h3 id="settings-sec-1" className="font-display text-sm font-semibold ui-text-primary">
                01. Feature Toggles
              </h3>
            </div>

            <div className="ui-subpanel rounded-2xl divide-y ui-divider overflow-hidden">
              {FEATURE_ROWS.map((item) => {
                const checked = settings.features[item.key];
                return (
                  <div
                    key={item.key}
                    className="px-4 py-3 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold ui-text-primary">
                        {item.label}
                      </div>
                      <div className="text-[11px] ui-text-muted mt-0.5 leading-snug">
                        {item.description}
                      </div>
                    </div>
                    <IosSwitch
                      checked={checked}
                      onChange={() => toggleFeature(item.key)}
                      ariaLabel={`Toggle ${item.label}`}
                      isLightTheme={isLightTheme}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION 2: International Paper, Tax & Typography */}
          <section className="space-y-3 pt-2 border-t ui-divider" aria-labelledby="settings-sec-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 ui-accent-text shrink-0" />
              <h3 id="settings-sec-2" className="font-display text-sm font-semibold ui-text-primary">
                02. International Paper, Tax &amp; Typography
              </h3>
            </div>

            <div className="ui-subpanel rounded-2xl p-4 space-y-4">
              {/* Paper Size */}
              <div>
                <span className="block text-xs font-medium ui-text-secondary mb-2">
                  Paper Size
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(['a4', 'letter'] as PaperSize[]).map((size) => {
                    const active = settings.paperSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() =>
                          onUpdateSettings((prev) => ({ ...prev, paperSize: size }))
                        }
                        className={`min-h-[42px] px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          active ? activePillClass : 'ui-btn-soft'
                        }`}
                      >
                        {PAPER_DIMENSIONS[size].label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Tax Label */}
              <div>
                <label
                  htmlFor="settings-tax-label"
                  className="block text-xs font-medium ui-text-secondary mb-2"
                >
                  Custom Tax Label
                </label>
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {TAX_LABEL_PRESETS.map((preset) => {
                    const active = settings.taxLabel === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          onUpdateSettings((prev) => ({ ...prev, taxLabel: preset }))
                        }
                        className={`min-h-[34px] px-3 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          active ? activePillClass : 'ui-btn-soft'
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
                <input
                  id="settings-tax-label"
                  type="text"
                  value={settings.taxLabel}
                  onChange={(e) =>
                    onUpdateSettings((prev) => ({ ...prev, taxLabel: e.target.value }))
                  }
                  placeholder="Tax, GST, VAT, Sales Tax..."
                  maxLength={24}
                  className="glass-input w-full h-10 px-3.5 rounded-xl text-xs"
                />
              </div>

              {/* Date Format & Document Font */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs font-medium ui-text-secondary mb-2">
                    Date Format
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['DD/MM/YYYY', 'MM/DD/YYYY'] as DateFormatOption[]).map((fmt) => {
                      const active = settings.dateFormat === fmt;
                      return (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() =>
                            onUpdateSettings((prev) => ({ ...prev, dateFormat: fmt }))
                          }
                          className={`min-h-[40px] px-2.5 rounded-xl border text-xs font-mono-nums font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                            active ? activePillClass : 'ui-btn-soft'
                          }`}
                        >
                          {fmt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-medium ui-text-secondary mb-2">
                    Document Font
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {FONT_OPTIONS.map((font) => {
                      const active = settings.documentFont === font.id;
                      return (
                        <button
                          key={font.id}
                          type="button"
                          onClick={() =>
                            onUpdateSettings((prev) => ({ ...prev, documentFont: font.id }))
                          }
                          className={`min-h-[40px] px-2 rounded-xl border text-[11px] font-semibold transition-colors truncate cursor-pointer ${
                            font.sampleClass
                          } ${active ? activePillClass : 'ui-btn-soft'}`}
                        >
                          {font.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3: Smart Defaults & Automation */}
          <section className="space-y-3 pt-2 border-t ui-divider" aria-labelledby="settings-sec-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 ui-accent-text shrink-0" />
              <h3 id="settings-sec-3" className="font-display text-sm font-semibold ui-text-primary">
                03. Smart Defaults &amp; Automation
              </h3>
            </div>

            <div className="ui-subpanel rounded-2xl p-4 space-y-4">
              {/* Custom Document Prefix + Auto-Increment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label
                    htmlFor="settings-doc-prefix"
                    className="block text-xs font-medium ui-text-secondary mb-1.5"
                  >
                    Custom Document Prefix
                  </label>
                  <input
                    id="settings-doc-prefix"
                    type="text"
                    value={settings.documentPrefix}
                    onChange={(e) =>
                      onUpdateSettings((prev) => ({ ...prev, documentPrefix: e.target.value }))
                    }
                    placeholder="INV-2026-"
                    maxLength={20}
                    className="glass-input font-mono-nums w-full h-10 px-3 rounded-xl text-xs"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 h-10 px-3 rounded-xl border ui-divider">
                  <span className="text-xs font-medium ui-text-primary truncate">
                    Auto-Increment Number
                  </span>
                  <IosSwitch
                    checked={settings.autoIncrementNumber}
                    onChange={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        autoIncrementNumber: !prev.autoIncrementNumber,
                      }))
                    }
                    ariaLabel="Toggle Auto-Increment Document Number"
                    isLightTheme={isLightTheme}
                  />
                </div>
              </div>

              {/* Default Payment Terms */}
              <div>
                <span className="block text-xs font-medium ui-text-secondary mb-2">
                  Default Payment Terms (Auto-calculates Due Date)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {PAYMENT_TERMS_OPTIONS.map((term) => {
                    const active = settings.defaultPaymentTerms === term.id;
                    return (
                      <button
                        key={term.id}
                        type="button"
                        onClick={() => onPaymentTermsChange(term.id)}
                        className={`min-h-[40px] px-2.5 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          active ? activePillClass : 'ui-btn-soft'
                        }`}
                      >
                        {term.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Default Currency & Default Tax Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="block text-xs font-medium ui-text-secondary mb-1.5">
                    Default Currency
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
                      const active = settings.defaultCurrency === code;
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() =>
                            onUpdateSettings((prev) => ({ ...prev, defaultCurrency: code }))
                          }
                          className={`min-h-[40px] rounded-xl border text-[11px] font-semibold transition-colors cursor-pointer ${
                            active ? activePillClass : 'ui-btn-soft'
                          }`}
                        >
                          {CURRENCIES[code].label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="settings-default-tax"
                    className="block text-xs font-medium ui-text-secondary mb-1.5"
                  >
                    Default Tax Rate (%)
                  </label>
                  <NumericInput
                    id="settings-default-tax"
                    value={settings.defaultTaxRate}
                    placeholder="0"
                    onChange={(val) =>
                      onUpdateSettings((prev) => ({ ...prev, defaultTaxRate: val }))
                    }
                    className="glass-input font-mono-nums w-full h-10 px-3 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Save Business Profile as Default */}
              <div className="pt-2 border-t ui-divider flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] ui-text-muted">
                  {hasDefaultProfile
                    ? 'Default business profile saved locally for new documents'
                    : 'Save current business info, logo & signature as default'}
                </span>
                <button
                  type="button"
                  onClick={onSaveDefaultProfile}
                  className="ui-btn-soft min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <BookmarkCheck className="w-3.5 h-3.5 ui-accent-text" />
                  Save Business Profile as Default
                </button>
              </div>
            </div>
          </section>

          {/* SECTION 4: Appearance & Unlimited Colors */}
          <section className="space-y-3 pt-2 border-t ui-divider" aria-labelledby="settings-sec-4">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 ui-accent-text shrink-0" />
              <h3 id="settings-sec-4" className="font-display text-sm font-semibold ui-text-primary">
                04. Appearance &amp; Unlimited Colors
              </h3>
            </div>

            <div className="ui-subpanel rounded-2xl p-4 space-y-4">
              {/* App Background Theme Presets + Color Wheel */}
              <div className="space-y-2.5">
                <span className="block text-xs font-medium ui-text-secondary">
                  App Background Theme (White Document Paper Preserved)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {UI_BACKGROUND_PRESETS.map((preset) => {
                    const active =
                      uiBackgroundColor.toUpperCase() === preset.hex.toUpperCase();
                    const lightPreset = isColorLight(preset.hex);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onUiBackgroundChange(preset.hex)}
                        className={`min-h-[42px] px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                          active ? activePillClass : 'ui-btn-soft'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-4 h-4 rounded-full shrink-0 ring-1 ${
                              lightPreset ? 'ring-slate-900/20' : 'ring-white/30'
                            }`}
                            style={{ backgroundColor: preset.hex }}
                          />
                          <span className="text-xs font-semibold truncate">
                            {preset.name}
                          </span>
                        </div>
                        {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Unlimited Custom Background Color Wheel */}
                  <div>
                    <label
                      htmlFor="settings-ui-bg-hex"
                      className="block text-[11px] font-medium ui-text-muted mb-1.5"
                    >
                      Custom Background Color Wheel
                    </label>
                    <div className="flex items-center gap-2">
                      <label
                        className={`relative overflow-hidden w-10 h-10 rounded-xl shrink-0 cursor-pointer ring-1 ${
                          isLightTheme ? 'ring-slate-900/20' : 'ring-white/25'
                        }`}
                        style={{ backgroundColor: uiBackgroundColor }}
                        title="Open background color wheel"
                        aria-label="Pick custom app background color"
                      >
                        <input
                          type="color"
                          value={uiBackgroundColor}
                          onChange={(e) => onUiBackgroundChange(e.target.value.toUpperCase())}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </label>
                      <input
                        id="settings-ui-bg-hex"
                        type="text"
                        value={bgHexDraft}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBgHexDraft(val);
                          const valid = normalizeHex(val);
                          if (valid) onUiBackgroundChange(valid);
                        }}
                        onBlur={() => {
                          const valid = normalizeHex(bgHexDraft);
                          if (valid) {
                            setBgHexDraft(valid);
                            onUiBackgroundChange(valid);
                          } else {
                            setBgHexDraft(uiBackgroundColor);
                          }
                        }}
                        maxLength={7}
                        spellCheck={false}
                        className="glass-input font-mono-nums flex-1 h-10 px-3 rounded-xl text-xs uppercase"
                      />
                    </div>
                  </div>

                  {/* Document Brand Accent Color Wheel */}
                  <div>
                    <label
                      htmlFor="settings-doc-accent-hex"
                      className="block text-[11px] font-medium ui-text-muted mb-1.5"
                    >
                      Document Brand Accent Color Wheel
                    </label>
                    <div className="flex items-center gap-2">
                      <label
                        className={`relative overflow-hidden w-10 h-10 rounded-xl shrink-0 cursor-pointer ring-1 ${
                          isLightTheme ? 'ring-slate-900/20' : 'ring-white/25'
                        }`}
                        style={{ backgroundColor: documentAccentHex }}
                        title="Open document brand accent color wheel"
                        aria-label="Pick custom document brand accent color"
                      >
                        <input
                          type="color"
                          value={documentAccentHex}
                          onChange={(e) => onDocumentAccentChange(e.target.value.toUpperCase())}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </label>
                      <input
                        id="settings-doc-accent-hex"
                        type="text"
                        value={docHexDraft}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDocHexDraft(val);
                          const valid = normalizeHex(val);
                          if (valid) onDocumentAccentChange(valid);
                        }}
                        onBlur={() => {
                          const valid = normalizeHex(docHexDraft);
                          if (valid) {
                            setDocHexDraft(valid);
                            onDocumentAccentChange(valid);
                          } else {
                            setDocHexDraft(documentAccentHex);
                          }
                        }}
                        maxLength={7}
                        spellCheck={false}
                        className="glass-input font-mono-nums flex-1 h-10 px-3 rounded-xl text-xs uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Glass Blur Intensity */}
              <div>
                <span className="block text-xs font-medium ui-text-secondary mb-2">
                  Glass Blur Intensity
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {BLUR_OPTIONS.map((opt) => {
                    const active = settings.glassBlurIntensity === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          onUpdateSettings((prev) => ({
                            ...prev,
                            glassBlurIntensity: opt.id,
                          }))
                        }
                        className={`min-h-[40px] px-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                          active ? activePillClass : 'ui-btn-soft'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 5: Privacy Lock & Data Backup */}
          <section className="space-y-3 pt-2 border-t ui-divider" aria-labelledby="settings-sec-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 ui-accent-text shrink-0" />
              <h3 id="settings-sec-5" className="font-display text-sm font-semibold ui-text-primary">
                05. Privacy Lock &amp; Data Backup
              </h3>
            </div>

            <div className="ui-subpanel rounded-2xl p-4 space-y-4">
              {/* 4-Digit Privacy PIN Lock */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold ui-text-primary">
                      4-Digit Privacy PIN Lock
                    </div>
                    <div className="text-[11px] ui-text-muted mt-0.5">
                      {settings.privacyPinEnabled
                        ? 'Workspace locks automatically when reloaded'
                        : 'Protect local invoices & client records with a 4-digit PIN'}
                    </div>
                  </div>
                  <IosSwitch
                    checked={settings.privacyPinEnabled}
                    onChange={handleTogglePin}
                    ariaLabel="Toggle 4-Digit Privacy PIN Lock"
                    isLightTheme={isLightTheme}
                  />
                </div>

                {(settings.privacyPinEnabled || isEditingPin) && (
                  <div className="pt-2.5 border-t ui-divider space-y-2">
                    {isEditingPin ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={4}
                          value={pinDraft}
                          onChange={(e) => {
                            setPinDraft(e.target.value.replace(/\D/g, '').slice(0, 4));
                            setPinError(null);
                          }}
                          placeholder="Enter 4-digit PIN"
                          aria-label="4-digit Privacy PIN"
                          className="glass-input font-mono-nums flex-1 min-w-[140px] h-10 px-3 rounded-xl text-sm tracking-[0.35em]"
                        />
                        <button
                          type="button"
                          onClick={handleSavePin}
                          className="min-h-[40px] px-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Save PIN
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingPin(false);
                            setPinError(null);
                          }}
                          className="ui-btn-soft min-h-[40px] px-3 rounded-xl text-xs font-medium cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs ui-text-secondary font-mono-nums">
                          PIN Set: ••••
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPinDraft('');
                              setIsEditingPin(true);
                            }}
                            className="ui-btn-soft min-h-[36px] px-3 rounded-xl text-xs font-medium cursor-pointer"
                          >
                            Change PIN
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onLockWorkspaceNow();
                            }}
                            className="min-h-[36px] px-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Lock Now
                          </button>
                        </div>
                      </div>
                    )}
                    {pinError && (
                      <p className="text-[11px] text-rose-400 font-medium">{pinError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Backup, PWA Install & Reset All Settings */}
              <div className="pt-3 border-t ui-divider space-y-2.5">
                <input
                  ref={backupInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onImportBackup(file);
                    e.target.value = '';
                  }}
                  className="hidden"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onExportBackup}
                    className="ui-btn-soft min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 ui-accent-text" />
                    Export Backup (.json)
                  </button>

                  <button
                    type="button"
                    onClick={() => backupInputRef.current?.click()}
                    className="ui-btn-soft min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-500" />
                    Import Backup
                  </button>

                  <button
                    type="button"
                    onClick={handleInstallPwaClick}
                    className="ui-btn-soft min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    <DownloadCloud className="w-3.5 h-3.5 ui-accent-text" />
                    {isInstalled ? 'Invoqor App Installed' : 'Install Invoqor App (PWA)'}
                  </button>

                  {confirmReset ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onResetAllSettings();
                          setConfirmReset(false);
                        }}
                        className="flex-1 min-h-[42px] px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Confirm Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmReset(false)}
                        className="ui-btn-soft min-h-[42px] px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmReset(true)}
                      className="min-h-[42px] px-3.5 py-2 rounded-xl border border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset All Settings
                    </button>
                  )}
                </div>

                {pwaNotice && (
                  <p className="text-[11px] ui-text-secondary text-center pt-1">
                    {pwaNotice}
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
