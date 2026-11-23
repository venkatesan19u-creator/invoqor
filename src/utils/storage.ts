import { DEMO_BANK_DETAILS, createEmptyBankDetails } from '../data/demoDocument';
import {
  AppSettings,
  calculateDocumentTotals,
  ClientInfo,
  DEFAULT_APP_SETTINGS,
  DefaultBusinessProfile,
  DocumentData,
  DocumentMode,
  InvoqorBackupPayload,
  SavedClientRecord,
  SavedDocumentRecord,
  SavedServiceRecord,
} from '../types/billing';

const DRAFT_STORAGE_KEY = 'aurabill_draft_v1';
const HISTORY_STORAGE_KEY = 'aurabill_history_v1';
const DEFAULT_PROFILE_KEY = 'klyra_default_profile_v1';
const SAVED_CLIENTS_KEY = 'klyra_saved_clients_v1';
const SAVED_SERVICES_KEY = 'invoqor_saved_services_v1';
const UI_BG_STORAGE_KEY = 'klyra_ui_bg_v1';
const CUSTOM_A4_COLOR_KEY = 'klyra_custom_a4_color_v1';
const SETTINGS_STORAGE_KEY = 'klyra_settings_v1';

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_APP_SETTINGS, features: { ...DEFAULT_APP_SETTINGS.features } };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_APP_SETTINGS,
      ...parsed,
      features: {
        ...DEFAULT_APP_SETTINGS.features,
        ...(parsed.features || {}),
      },
    };
  } catch {
    return { ...DEFAULT_APP_SETTINGS, features: { ...DEFAULT_APP_SETTINGS.features } };
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

export function resetAllSettings(): AppSettings {
  const fresh: AppSettings = {
    ...DEFAULT_APP_SETTINGS,
    features: { ...DEFAULT_APP_SETTINGS.features },
  };
  saveSettings(fresh);
  return fresh;
}

export function generateDocumentNumberFromSettings(
  mode: DocumentMode,
  settings: AppSettings,
  existingNumbers: string[]
): string {
  const rawPrefix = settings.documentPrefix?.trim() || 'INV-2026-';
  const effectivePrefix =
    mode === 'proposal' && /^INV-/i.test(rawPrefix)
      ? rawPrefix.replace(/^INV-/i, 'PROP-')
      : mode === 'invoice' && /^PROP-/i.test(rawPrefix)
        ? rawPrefix.replace(/^PROP-/i, 'INV-')
        : rawPrefix;

  if (!settings.autoIncrementNumber) {
    return `${effectivePrefix}001`;
  }

  let maxNum = 0;
  let width = 3;
  const escaped = effectivePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(`^${escaped}(\\d+)$`, 'i');

  for (const numStr of existingNumbers) {
    const m = numStr.trim().match(matcher);
    if (m) {
      width = Math.max(width, m[1].length);
      const val = parseInt(m[1], 10);
      if (!Number.isNaN(val) && val > maxNum) {
        maxNum = val;
      }
    }
  }

  return `${effectivePrefix}${String(maxNum + 1).padStart(width, '0')}`;
}

export function loadUiBackgroundColor(): string {
  try {
    const raw = localStorage.getItem(UI_BG_STORAGE_KEY);
    if (raw && /^#[0-9a-fA-F]{6}$/.test(raw)) {
      return raw.toUpperCase();
    }
  } catch {
    // Ignore
  }
  return '#0B0F19';
}

export function saveUiBackgroundColor(hex: string): void {
  try {
    localStorage.setItem(UI_BG_STORAGE_KEY, hex.toUpperCase());
  } catch {
    // Ignore
  }
}

export function loadCustomA4Color(): string {
  try {
    const raw = localStorage.getItem(CUSTOM_A4_COLOR_KEY);
    if (raw && /^#[0-9a-fA-F]{6}$/.test(raw)) {
      return raw.toUpperCase();
    }
  } catch {
    // Ignore
  }
  return '#6366F1';
}

export function saveCustomA4Color(hex: string): void {
  try {
    localStorage.setItem(CUSTOM_A4_COLOR_KEY, hex.toUpperCase());
  } catch {
    // Ignore
  }
}

export function loadDraft(): DocumentData | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DocumentData;
    if (!parsed || !parsed.business || !parsed.client || !Array.isArray(parsed.items)) {
      return null;
    }
    if (!parsed.business.bankDetails) {
      parsed.business.bankDetails =
        parsed.id === 'demo-doc-1' ? { ...DEMO_BANK_DETAILS } : createEmptyBankDetails();
    }
    if (parsed.id === 'demo-doc-1' && parsed.business.paymentQrLink === undefined) {
      parsed.business.paymentQrLink = 'https://paypal.me/studionova';
      parsed.business.showPaymentQr = true;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveDraft(doc: DocumentData): void {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function loadHistory(): SavedDocumentRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveToHistory(doc: DocumentData): SavedDocumentRecord[] {
  const history = loadHistory();
  const totals = calculateDocumentTotals(doc);
  const recordId = `hist-${Date.now()}`;
  const docNumber =
    doc.details.documentNumber.trim() ||
    (doc.mode === 'invoice' ? 'Draft Invoice' : 'Draft Proposal');
  const clientName = doc.client.name.trim() || 'Unnamed Client';

  const newRecord: SavedDocumentRecord = {
    id: recordId,
    title: `${docNumber} · ${clientName}`,
    mode: doc.mode,
    documentNumber: docNumber,
    clientName,
    currency: doc.currency,
    grandTotal: totals.grandTotal,
    savedAt: new Date().toISOString(),
    data: {
      ...doc,
      updatedAt: new Date().toISOString(),
    },
  };

  const next = [newRecord, ...history].slice(0, 50);
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
  return next;
}

export function deleteFromHistory(recordId: string): SavedDocumentRecord[] {
  const history = loadHistory().filter((item) => item.id !== recordId);
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Ignore
  }
  return history;
}

export function loadDefaultProfile(): DefaultBusinessProfile | null {
  try {
    const raw = localStorage.getItem(DEFAULT_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DefaultBusinessProfile;
    if (!parsed || !parsed.business) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDefaultProfile(doc: DocumentData): DefaultBusinessProfile {
  const profile: DefaultBusinessProfile = {
    business: {
      name: doc.business.name,
      email: doc.business.email,
      address: doc.business.address,
      logoDataUrl: doc.business.logoDataUrl,
      bankDetails: doc.business.bankDetails
        ? { ...doc.business.bankDetails }
        : createEmptyBankDetails(),
      paymentDetails: doc.business.paymentDetails || '',
      paymentQrLink: doc.business.paymentQrLink || '',
      showPaymentQr: Boolean(doc.business.showPaymentQr),
    },
    signatureDataUrl: doc.signatureDataUrl,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(DEFAULT_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore
  }
  return profile;
}

export function loadSavedClients(): SavedClientRecord[] {
  try {
    const raw = localStorage.getItem(SAVED_CLIENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function upsertSavedClient(client: ClientInfo): SavedClientRecord[] {
  const trimmedName = client.name.trim();
  const trimmedCompany = client.companyOrEmail.trim();
  const trimmedAddress = client.address.trim();

  if (trimmedName.length < 2) {
    return loadSavedClients();
  }

  const existing = loadSavedClients();
  const key = `${trimmedName.toLowerCase()}::${trimmedCompany.toLowerCase()}`;

  const matchIdx = existing.findIndex(
    (c) => `${c.name.trim().toLowerCase()}::${c.companyOrEmail.trim().toLowerCase()}` === key
  );

  const entry: SavedClientRecord = {
    id: matchIdx >= 0 ? existing[matchIdx].id : `client-${Date.now()}`,
    name: trimmedName,
    companyOrEmail: trimmedCompany,
    address: trimmedAddress,
    updatedAt: new Date().toISOString(),
  };

  const filtered = existing.filter((_, idx) => idx !== matchIdx);
  const next = [entry, ...filtered].slice(0, 30);

  try {
    localStorage.setItem(SAVED_CLIENTS_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  return next;
}

export function deleteSavedClient(clientId: string): SavedClientRecord[] {
  const next = loadSavedClients().filter((c) => c.id !== clientId);
  try {
    localStorage.setItem(SAVED_CLIENTS_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  return next;
}

export function loadSavedServices(): SavedServiceRecord[] {
  try {
    const raw = localStorage.getItem(SAVED_SERVICES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function upsertSavedService(
  description: string,
  unitPrice: number,
  defaultQty = 1
): SavedServiceRecord[] {
  const trimmedDesc = description.trim();
  if (!trimmedDesc) {
    return loadSavedServices();
  }

  const safePrice = Number.isFinite(unitPrice) ? Math.max(0, unitPrice) : 0;
  const safeQty = Number.isFinite(defaultQty) && defaultQty > 0 ? defaultQty : 1;
  const existing = loadSavedServices();
  const key = trimmedDesc.toLowerCase();

  const matchIdx = existing.findIndex(
    (s) => s.description.trim().toLowerCase() === key
  );

  const entry: SavedServiceRecord = {
    id: matchIdx >= 0 ? existing[matchIdx].id : `svc-${Date.now()}`,
    description: trimmedDesc,
    unitPrice: safePrice,
    defaultQty: safeQty,
    updatedAt: new Date().toISOString(),
  };

  const filtered = existing.filter((_, idx) => idx !== matchIdx);
  const next = [entry, ...filtered].slice(0, 40);

  try {
    localStorage.setItem(SAVED_SERVICES_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  return next;
}

export function deleteSavedService(serviceId: string): SavedServiceRecord[] {
  const next = loadSavedServices().filter((s) => s.id !== serviceId);
  try {
    localStorage.setItem(SAVED_SERVICES_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  return next;
}

function generateNextDocumentNumber(baseNumber: string, existingNumbers: string[]): string {
  const trimmed = baseNumber.trim() || 'INV-2026-001';
  const taken = new Set(existingNumbers.map((n) => n.trim().toUpperCase()));

  const match = trimmed.match(/^(.*?)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const numStr = match[2];
    const width = numStr.length;
    let num = parseInt(numStr, 10) + 1;
    let candidate = `${prefix}${String(num).padStart(width, '0')}`;
    while (taken.has(candidate.toUpperCase())) {
      num += 1;
      candidate = `${prefix}${String(num).padStart(width, '0')}`;
    }
    return candidate;
  }

  let suffix = 2;
  let candidate = `${trimmed}-COPY`;
  while (taken.has(candidate.toUpperCase())) {
    candidate = `${trimmed}-COPY-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export function duplicateDocumentData(
  source: DocumentData,
  existingNumbers: string[]
): DocumentData {
  const today = new Date().toISOString().split('T')[0];
  const due = new Date();
  due.setDate(due.getDate() + 14);
  const dueIso = due.toISOString().split('T')[0];

  return {
    ...source,
    id: `doc-${Date.now()}`,
    status: 'draft',
    details: {
      ...source.details,
      documentNumber: generateNextDocumentNumber(
        source.details.documentNumber,
        existingNumbers
      ),
      issueDate: today,
      dueDate: dueIso,
    },
    items: source.items.map((item, idx) => ({
      ...item,
      id: `item-${Date.now()}-${idx}`,
    })),
    updatedAt: new Date().toISOString(),
  };
}

export function createBackupPayload(currentDraft: DocumentData): InvoqorBackupPayload {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    draft: currentDraft,
    history: loadHistory(),
    defaultProfile: loadDefaultProfile(),
    savedClients: loadSavedClients(),
    savedServices: loadSavedServices(),
    uiBackgroundColor: loadUiBackgroundColor(),
    settings: loadSettings(),
  };
}

export function importBackupPayload(rawJson: string): {
  history: SavedDocumentRecord[];
  defaultProfile: DefaultBusinessProfile | null;
  savedClients: SavedClientRecord[];
  savedServices: SavedServiceRecord[];
  draft: DocumentData | null;
  uiBackgroundColor: string | null;
  settings: AppSettings | null;
} {
  const parsed = JSON.parse(rawJson) as Partial<InvoqorBackupPayload>;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid backup file format.');
  }

  if (
    !Array.isArray(parsed.history) &&
    !parsed.draft &&
    !parsed.defaultProfile &&
    !Array.isArray(parsed.savedClients) &&
    !Array.isArray(parsed.savedServices) &&
    !parsed.settings
  ) {
    throw new Error('Backup file does not contain Invoqor data.');
  }

  const nextHistory = Array.isArray(parsed.history)
    ? parsed.history.filter(
        (rec): rec is SavedDocumentRecord =>
          Boolean(rec && rec.id && rec.data && rec.data.business && rec.data.client)
      )
    : loadHistory();

  const nextClients = Array.isArray(parsed.savedClients)
    ? parsed.savedClients.filter(
        (c): c is SavedClientRecord => Boolean(c && c.id && c.name)
      )
    : loadSavedClients();

  const nextServices = Array.isArray(parsed.savedServices)
    ? parsed.savedServices.filter(
        (s): s is SavedServiceRecord => Boolean(s && s.id && s.description)
      )
    : loadSavedServices();

  const nextProfile =
    parsed.defaultProfile && parsed.defaultProfile.business
      ? parsed.defaultProfile
      : loadDefaultProfile();

  const nextDraft =
    parsed.draft && parsed.draft.business && parsed.draft.client && Array.isArray(parsed.draft.items)
      ? parsed.draft
      : null;

  const nextUiBg =
    typeof parsed.uiBackgroundColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsed.uiBackgroundColor)
      ? parsed.uiBackgroundColor.toUpperCase()
      : null;

  const nextSettings: AppSettings | null =
    parsed.settings && typeof parsed.settings === 'object'
      ? {
          ...DEFAULT_APP_SETTINGS,
          ...parsed.settings,
          features: {
            ...DEFAULT_APP_SETTINGS.features,
            ...(parsed.settings.features || {}),
          },
        }
      : null;

  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory.slice(0, 50)));
    localStorage.setItem(SAVED_CLIENTS_KEY, JSON.stringify(nextClients.slice(0, 30)));
    localStorage.setItem(SAVED_SERVICES_KEY, JSON.stringify(nextServices.slice(0, 40)));
    if (nextProfile) {
      localStorage.setItem(DEFAULT_PROFILE_KEY, JSON.stringify(nextProfile));
    }
    if (nextDraft) {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextDraft));
    }
    if (nextUiBg) {
      saveUiBackgroundColor(nextUiBg);
    }
    if (nextSettings) {
      saveSettings(nextSettings);
    }
  } catch {
    // Ignore storage quota issues
  }

  return {
    history: nextHistory,
    defaultProfile: nextProfile,
    savedClients: nextClients,
    savedServices: nextServices,
    draft: nextDraft,
    uiBackgroundColor: nextUiBg,
    settings: nextSettings,
  };
}
