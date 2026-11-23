import React, { useEffect, useRef, useState } from 'react';
import { Check, Download, History, Loader2, Settings } from 'lucide-react';
import { A4Document } from './components/A4Document';
import { EditorPanel } from './components/EditorPanel';
import { HistoryModal } from './components/HistoryModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PrivacyLockScreen } from './components/PrivacyLockScreen';
import { PWAInstallButton } from './components/PWAInstallButton';
import { QRZoomModal } from './components/QRZoomModal';
import { ScaledA4Preview } from './components/ScaledA4Preview';
import { SettingsModal } from './components/SettingsModal';
import { ThemeMenu } from './components/ThemeMenu';
import { createBlankDocument, createDemoDocument } from './data/demoDocument';
import {
  AppSettings,
  calculateDueDateFromTerms,
  CURRENCIES,
  CurrencyCode,
  DefaultBusinessProfile,
  DocumentData,
  DocumentMode,
  LineItem,
  PAPER_DIMENSIONS,
  PaymentTermsOption,
  SavedClientRecord,
  SavedDocumentRecord,
  SavedServiceRecord,
} from './types/billing';
import {
  computeUiTheme,
  normalizeHex,
  resolveA4AccentPalette,
} from './utils/colorTheme';
import { exportDocumentToPdf } from './utils/pdfExport';
import {
  createBackupPayload,
  deleteFromHistory,
  deleteSavedClient,
  deleteSavedService,
  duplicateDocumentData,
  generateDocumentNumberFromSettings,
  importBackupPayload,
  loadCustomA4Color,
  loadDefaultProfile,
  loadDraft,
  loadHistory,
  loadSavedClients,
  loadSavedServices,
  loadSettings,
  loadUiBackgroundColor,
  resetAllSettings,
  saveCustomA4Color,
  saveDefaultProfile,
  saveDraft,
  saveSettings,
  saveToHistory,
  saveUiBackgroundColor,
  upsertSavedClient,
  upsertSavedService,
} from './utils/storage';

type MobileTab = 'edit' | 'preview';

export default function App() {
  const [doc, setDoc] = useState<DocumentData>(() => loadDraft() ?? createDemoDocument());
  const [history, setHistory] = useState<SavedDocumentRecord[]>(() => loadHistory());
  const [defaultProfile, setDefaultProfile] = useState<DefaultBusinessProfile | null>(() =>
    loadDefaultProfile()
  );
  const [savedClients, setSavedClients] = useState<SavedClientRecord[]>(() =>
    loadSavedClients()
  );
  const [savedServices, setSavedServices] = useState<SavedServiceRecord[]>(() =>
    loadSavedServices()
  );
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [uiBackgroundColor, setUiBackgroundColor] = useState<string>(() =>
    loadUiBackgroundColor()
  );
  const [customA4Color, setCustomA4Color] = useState<string>(() => loadCustomA4Color());
  const [mobileTab, setMobileTab] = useState<MobileTab>('edit');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQrZoomOpen, setIsQrZoomOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const initial = loadSettings();
    return Boolean(initial.privacyPinEnabled && /^\d{4}$/.test(initial.privacyPinCode));
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const exportContainerRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<number | null>(null);

  const uiTheme = computeUiTheme(uiBackgroundColor);
  const activePaper = PAPER_DIMENSIONS[settings.paperSize] ?? PAPER_DIMENSIONS.a4;
  const docBrandAccentHex =
    doc.accentColor === 'custom'
      ? doc.customAccentHex || customA4Color
      : resolveA4AccentPalette(doc.accentColor, doc.customAccentHex).swatch;

  // Auto-save active draft to localStorage
  useEffect(() => {
    saveDraft(doc);
  }, [doc]);

  // Persist settings Control Center preferences to localStorage
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Persist custom UI background color and sync document background for overscroll
  useEffect(() => {
    saveUiBackgroundColor(uiTheme.baseHex);
    document.documentElement.style.backgroundColor = uiTheme.baseHex;
    document.body.style.backgroundColor = uiTheme.baseHex;
  }, [uiTheme.baseHex]);

  // Persist custom A4 color preference
  useEffect(() => {
    saveCustomA4Color(customA4Color);
  }, [customA4Color]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  };

  const handleModeToggle = (nextMode: DocumentMode) => {
    setDoc((prev) => {
      if (prev.mode === nextMode) return prev;
      let nextNumber = prev.details.documentNumber;
      if (nextMode === 'proposal' && nextNumber.startsWith('INV-')) {
        nextNumber = nextNumber.replace(/^INV-/, 'PROP-');
      } else if (nextMode === 'invoice' && nextNumber.startsWith('PROP-')) {
        nextNumber = nextNumber.replace(/^PROP-/, 'INV-');
      }
      return {
        ...prev,
        mode: nextMode,
        details: {
          ...prev.details,
          documentNumber: nextNumber,
        },
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleSaveCurrentClient = () => {
    if (doc.client.name.trim().length >= 2) {
      setSavedClients(upsertSavedClient(doc.client));
    }
  };

  const handleDeleteSavedClient = (id: string) => {
    setSavedClients(deleteSavedClient(id));
  };

  const handleSaveServiceFromItem = (item: LineItem) => {
    if (!item.description.trim()) {
      showToast('Enter a service description before saving');
      return;
    }
    setSavedServices(upsertSavedService(item.description, item.unitPrice, item.quantity));
    showToast('Saved service for quick insert');
  };

  const handleDeleteSavedService = (id: string) => {
    setSavedServices(deleteSavedService(id));
  };

  const handleSaveDefaultProfile = () => {
    const profile = saveDefaultProfile(doc);
    setDefaultProfile(profile);
    showToast('Default business profile saved');
  };

  const handleDownloadPdf = async () => {
    if (!exportContainerRef.current || isExporting) return;
    handleSaveCurrentClient();
    setIsExporting(true);
    try {
      await exportDocumentToPdf(exportContainerRef.current, doc.mode, settings.paperSize);
      showToast(
        doc.mode === 'invoice' ? 'Invoice PDF downloaded' : 'Proposal PDF downloaded'
      );
    } catch (err) {
      console.error('PDF export failed:', err);
      showToast('Export failed — opening print view');
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveToHistory = () => {
    handleSaveCurrentClient();
    const updated = saveToHistory(doc);
    setHistory(updated);
    showToast('Saved snapshot to History');
  };

  const handleLoadRecord = (record: SavedDocumentRecord) => {
    setDoc({
      ...record.data,
      updatedAt: new Date().toISOString(),
    });
    showToast(`Loaded ${record.documentNumber}`);
  };

  const handleDuplicateRecord = (record: SavedDocumentRecord) => {
    const existingNums = [
      doc.details.documentNumber,
      ...history.map((h) => h.documentNumber),
    ];
    const cloned = duplicateDocumentData(record.data, existingNums);
    setDoc(cloned);
    showToast(`Duplicated as ${cloned.details.documentNumber}`);
  };

  const handleDeleteRecord = (id: string) => {
    const updated = deleteFromHistory(id);
    setHistory(updated);
  };

  const handleNewBlank = () => {
    handleSaveCurrentClient();
    const latestDefault = loadDefaultProfile();
    setDefaultProfile(latestDefault);
    const existingNums = [
      doc.details.documentNumber,
      ...history.map((h) => h.documentNumber),
    ];
    const nextNumber = generateDocumentNumberFromSettings(
      doc.mode,
      settings,
      existingNums
    );
    setDoc({
      ...createBlankDocument(doc.mode, latestDefault, settings, nextNumber),
      customAccentHex: customA4Color,
    });
    showToast(
      latestDefault
        ? 'New document pre-filled with default profile'
        : 'Started a blank document'
    );
  };

  const handlePaymentTermsChange = (terms: PaymentTermsOption) => {
    setSettings((prev) => ({
      ...prev,
      defaultPaymentTerms: terms,
    }));
    setDoc((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        dueDate: calculateDueDateFromTerms(prev.details.issueDate, terms),
      },
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleResetAllSettings = () => {
    const fresh = resetAllSettings();
    setSettings(fresh);
    setUiBackgroundColor('#0B0F19');
    setCustomA4Color('#6366F1');
    showToast('All settings reset to defaults');
  };

  const handleRestoreDemo = () => {
    setDoc(createDemoDocument());
    showToast('Demo data restored');
  };

  const handleExportBackup = () => {
    const payload = createBackupPayload(doc);
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `invoqor-backup-${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Backup exported (.json)');
  };

  const handleUiBackgroundChange = (nextHex: string) => {
    const valid = normalizeHex(nextHex);
    if (valid) {
      setUiBackgroundColor(valid);
    }
  };

  const handleCustomA4ColorChange = (nextHex: string) => {
    const valid = normalizeHex(nextHex);
    if (!valid) return;
    setCustomA4Color(valid);
    setDoc((prev) => ({
      ...prev,
      accentColor: 'custom',
      customAccentHex: valid,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = typeof reader.result === 'string' ? reader.result : '';
        const restored = importBackupPayload(text);
        setHistory(restored.history);
        setDefaultProfile(restored.defaultProfile);
        setSavedClients(restored.savedClients);
        setSavedServices(restored.savedServices);
        if (restored.draft) {
          setDoc(restored.draft);
          if (restored.draft.customAccentHex) {
            setCustomA4Color(restored.draft.customAccentHex);
          }
        }
        if (restored.uiBackgroundColor) {
          setUiBackgroundColor(restored.uiBackgroundColor);
        }
        if (restored.settings) {
          setSettings(restored.settings);
        }
        showToast('Backup imported successfully');
      } catch {
        showToast('Invalid backup JSON file');
      }
    };
    reader.readAsText(file);
  };

  const isInvoice = doc.mode === 'invoice';

  return (
    <div
      data-ui-theme={uiTheme.isLight ? 'light' : 'dark'}
      data-glass-blur={settings.glassBlurIntensity}
      style={{ background: uiTheme.backgroundGradient }}
      className="klyra-theme-root min-h-screen relative overflow-x-hidden flex flex-col transition-colors duration-300"
    >
      {/* Dynamic Ambient Glow Orbs behind Frosted Glass */}
      <div
        className="no-print pointer-events-none fixed inset-0 overflow-hidden z-0"
        aria-hidden="true"
      >
        <div
          className="absolute -top-32 left-[-8%] w-[460px] h-[460px] rounded-full blur-[130px] transition-colors duration-500"
          style={{ backgroundColor: uiTheme.orbPrimary }}
        />
        <div
          className="absolute top-[28%] left-[24%] w-[380px] h-[380px] rounded-full blur-[130px] transition-colors duration-500"
          style={{ backgroundColor: uiTheme.orbAccent }}
        />
        <div
          className="absolute top-[16%] right-[6%] w-[440px] h-[440px] rounded-full blur-[135px] transition-colors duration-500"
          style={{ backgroundColor: uiTheme.orbSecondary }}
        />
        <div
          className="absolute -bottom-28 right-[26%] w-[420px] h-[420px] rounded-full blur-[130px] transition-colors duration-500"
          style={{ backgroundColor: uiTheme.orbPrimary }}
        />
      </div>

      {/* Top Frosted-Glass Header */}
      <header className="no-print glass-header sticky top-0 z-30 h-13 md:h-16">
        <div className="max-w-[1440px] mx-auto h-full px-4 md:px-6 flex items-center justify-between gap-2.5 md:gap-4">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-2.5 shrink-0">
            <img
              src="/assets/aistudio/1795432022265_df673f25.png"
              alt="Invoqor logo"
              className={`w-8 h-8 md:w-9 md:h-9 rounded-lg object-cover ring-1 shadow-md shadow-indigo-500/20 shrink-0 ${
                uiTheme.isLight ? 'ring-slate-900/15' : 'ring-white/15'
              }`}
            />
            <span className="font-display text-lg md:text-xl font-bold tracking-tight ui-text-primary whitespace-nowrap shrink-0">
              Invoqor
            </span>
          </div>

          {/* Desktop Controls: Invoice/Proposal Toggle + Currency Pills */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6">
            {/* Invoice / Proposal Segmented Toggle Switch */}
            <div className="flex items-center gap-2.5" role="group" aria-label="Document mode">
              <button
                type="button"
                onClick={() => handleModeToggle('invoice')}
                className={`text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isInvoice ? 'ui-text-primary font-semibold' : 'ui-text-muted hover:opacity-80'
                }`}
              >
                Invoice
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={!isInvoice}
                aria-label="Toggle between Invoice and Proposal"
                onClick={() => handleModeToggle(isInvoice ? 'proposal' : 'invoice')}
                className={`relative w-12 h-6 rounded-full border p-0.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                  uiTheme.isLight
                    ? 'bg-slate-900/15 border-slate-900/20'
                    : 'bg-white/15 border-white/15'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    isInvoice ? 'translate-x-0' : 'translate-x-6'
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => handleModeToggle('proposal')}
                className={`text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  !isInvoice ? 'ui-text-primary font-semibold' : 'ui-text-muted hover:opacity-80'
                }`}
              >
                Proposal
              </button>
            </div>

            {/* Currency Selector Pills */}
            <div
              className="ui-subpanel flex items-center gap-1 p-1 rounded-full"
              role="group"
              aria-label="Currency selector"
            >
              {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
                const active = doc.currency === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setDoc((prev) => ({ ...prev, currency: code }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? uiTheme.isLight
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-white/18 text-white shadow-sm border border-white/15'
                        : 'ui-text-secondary hover:opacity-85 border border-transparent'
                    }`}
                  >
                    {CURRENCIES[code].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Header Actions: Theme Picker + PWA Install + History + Settings */}
          <div className="flex items-center gap-2 shrink-0">
            <ThemeMenu
              currentHex={uiTheme.baseHex}
              onChange={handleUiBackgroundChange}
              isLightTheme={uiTheme.isLight}
            />
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              aria-label="Open document history"
              className="ui-btn-soft min-h-[38px] md:min-h-[40px] px-3 md:px-3.5 py-1.5 rounded-xl text-xs md:text-sm font-medium inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <History className="w-4 h-4 ui-text-secondary" />
              <span className="hidden sm:inline">History</span>
              {history.length > 0 && (
                <span className="font-mono-nums text-[11px] ui-accent-text">
                  {history.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Open settings"
              className="ui-btn-soft min-h-[38px] md:min-h-[40px] px-2.5 md:px-3 py-1.5 rounded-xl text-xs md:text-sm font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Settings className="w-4 h-4 ui-text-secondary" />
              <span className="hidden lg:inline">Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Split-Screen Workspace (Desktop 50/50) & Single-Column Tabs (Mobile) */}
      <main className="no-print relative z-10 flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-28 md:pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start">
          {/* Left Half: Scrollable Input Editor */}
          <div
            className={`${
              mobileTab === 'edit' ? 'block' : 'hidden md:block'
            } w-full`}
          >
            <EditorPanel
              doc={doc}
              settings={settings}
              onChange={setDoc}
              onResetDocument={handleNewBlank}
              onSaveToHistory={handleSaveToHistory}
              hasDefaultProfile={Boolean(defaultProfile)}
              onSaveDefaultProfile={handleSaveDefaultProfile}
              savedClients={savedClients}
              onSaveCurrentClient={handleSaveCurrentClient}
              onDeleteSavedClient={handleDeleteSavedClient}
              savedServices={savedServices}
              onSaveServiceFromItem={handleSaveServiceFromItem}
              onDeleteSavedService={handleDeleteSavedService}
              customA4Color={customA4Color}
              onCustomA4ColorChange={handleCustomA4ColorChange}
              isLightTheme={uiTheme.isLight}
            />
          </div>

          {/* Right Half: Sticky Live Document Preview + Download PDF Button */}
          <div
            className={`${
              mobileTab === 'preview' ? 'block' : 'hidden md:block'
            } w-full md:sticky md:top-22`}
          >
            <div className="glass-card rounded-2xl p-4 sm:p-5 lg:p-6 flex flex-col items-center gap-4 lg:gap-5">
              {/* Live Scaled White Paper Document */}
              <div className="w-full max-w-[540px]">
                <ScaledA4Preview
                  doc={doc}
                  settings={settings}
                  onQrClick={() => setIsQrZoomOpen(true)}
                />
              </div>

              {/* Prominent Blue-Purple Gradient Download PDF Button */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isExporting}
                className="btn-pdf-gradient w-full max-w-[540px] min-h-[48px] px-6 py-3 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      Generating {settings.paperSize === 'letter' ? 'Letter' : 'A4'} PDF...
                    </span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Floating Frosted-Glass Bottom Navigation Bar (< 768px) */}
      <nav
        className="no-print md:hidden fixed bottom-3 left-4 right-4 max-w-xs mx-auto z-40 glass-floating-nav rounded-full p-1 grid grid-cols-2 gap-1"
        aria-label="Mobile workspace view switcher"
      >
        <button
          type="button"
          onClick={() => setMobileTab('edit')}
          className={`min-h-[40px] rounded-full text-xs font-semibold transition-all cursor-pointer ${
            mobileTab === 'edit'
              ? uiTheme.isLight
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white/20 text-white shadow-sm'
              : 'ui-text-secondary hover:opacity-85'
          }`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`min-h-[40px] rounded-full text-xs font-semibold transition-all cursor-pointer ${
            mobileTab === 'preview'
              ? uiTheme.isLight
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white/20 text-white shadow-sm'
              : 'ui-text-secondary hover:opacity-85'
          }`}
        >
          Preview
        </button>
      </nav>

      {/* Offline Status Indicator */}
      <OfflineIndicator />

      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="no-print ui-modal-surface fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium inline-flex items-center gap-2"
        >
          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* History Modal / Drawer */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        records={history}
        fallbackCurrency={doc.currency}
        onSaveCurrent={handleSaveToHistory}
        onLoadRecord={handleLoadRecord}
        onDuplicateRecord={handleDuplicateRecord}
        onDeleteRecord={handleDeleteRecord}
        onNewBlank={handleNewBlank}
        onRestoreDemo={handleRestoreDemo}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />

      {/* Settings Control Center Modal / Bottom Sheet */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onPaymentTermsChange={handlePaymentTermsChange}
        onResetAllSettings={handleResetAllSettings}
        onSaveDefaultProfile={handleSaveDefaultProfile}
        hasDefaultProfile={Boolean(defaultProfile)}
        uiBackgroundColor={uiTheme.baseHex}
        onUiBackgroundChange={handleUiBackgroundChange}
        documentAccentHex={docBrandAccentHex}
        onDocumentAccentChange={handleCustomA4ColorChange}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onLockWorkspaceNow={() => setIsLocked(true)}
        isLightTheme={uiTheme.isLight}
      />

      {/* Interactive Tap-to-Zoom QR Modal */}
      <QRZoomModal
        isOpen={isQrZoomOpen}
        onClose={() => setIsQrZoomOpen(false)}
        paymentLink={doc.business.paymentQrLink ?? ''}
        businessName={doc.business.name}
      />

      {/* 4-Digit Privacy PIN Lock Overlay */}
      {isLocked && settings.privacyPinEnabled && /^\d{4}$/.test(settings.privacyPinCode) && (
        <PrivacyLockScreen
          expectedPin={settings.privacyPinCode}
          onUnlock={() => setIsLocked(false)}
          isLightTheme={uiTheme.isLight}
        />
      )}

      {/* Offscreen 1:1 White Paper Capture Source for html2pdf.js & Print Fallback */}
      <div
        id="a4-print-root"
        className="fixed left-[-10000px] top-0 pointer-events-none"
        aria-hidden="true"
      >
        <div
          ref={exportContainerRef}
          style={{
            width: `${activePaper.width}px`,
            height: `${activePaper.height}px`,
            backgroundColor: '#FFFFFF',
          }}
        >
          <A4Document doc={doc} settings={settings} />
        </div>
      </div>
    </div>
  );
}
