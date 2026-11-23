import React, { useRef } from 'react';
import {
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FilePlus2,
  FileText,
  Hourglass,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  calculateDocumentTotals,
  CurrencyCode,
  formatMoney,
  SavedDocumentRecord,
} from '../types/billing';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: SavedDocumentRecord[];
  fallbackCurrency?: CurrencyCode;
  onSaveCurrent: () => void;
  onLoadRecord: (record: SavedDocumentRecord) => void;
  onDuplicateRecord: (record: SavedDocumentRecord) => void;
  onDeleteRecord: (id: string) => void;
  onNewBlank: () => void;
  onRestoreDemo: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
}

function summarizeCurrencyAmounts(
  items: { currency: CurrencyCode; amount: number }[],
  fallbackCurrency: CurrencyCode
): string {
  if (items.length === 0) {
    return formatMoney(0, fallbackCurrency);
  }
  const byCurrency = new Map<CurrencyCode, number>();
  for (const item of items) {
    const prev = byCurrency.get(item.currency) ?? 0;
    byCurrency.set(item.currency, prev + item.amount);
  }
  const entries = Array.from(byCurrency.entries());
  if (entries.length === 1) {
    return formatMoney(entries[0][1], entries[0][0]);
  }
  return entries.map(([code, sum]) => formatMoney(sum, code)).join(' + ');
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  records,
  fallbackCurrency = 'USD',
  onSaveCurrent,
  onLoadRecord,
  onDuplicateRecord,
  onDeleteRecord,
  onNewBlank,
  onRestoreDemo,
  onExportBackup,
  onImportBackup,
}) => {
  const backupFileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const paidEntries: { currency: CurrencyCode; amount: number }[] = [];
  const pendingEntries: { currency: CurrencyCode; amount: number }[] = [];
  let invoiceCount = 0;
  let proposalCount = 0;

  for (const rec of records) {
    if (rec.mode === 'invoice') {
      invoiceCount += 1;
    } else {
      proposalCount += 1;
    }

    const status = rec.data?.status;
    if (status === 'paid') {
      paidEntries.push({
        currency: rec.currency,
        amount: Number.isFinite(rec.grandTotal) ? Math.max(0, rec.grandTotal) : 0,
      });
    } else if (status === 'pending') {
      const pendingAmt = rec.data
        ? calculateDocumentTotals(rec.data).balanceDue
        : Number.isFinite(rec.grandTotal)
          ? Math.max(0, rec.grandTotal)
          : 0;
      pendingEntries.push({
        currency: rec.currency,
        amount: pendingAmt,
      });
    }
  }

  const totalCollectedText = summarizeCurrencyAmounts(paidEntries, fallbackCurrency);
  const pendingBalanceText = summarizeCurrencyAmounts(pendingEntries, fallbackCurrency);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackup(file);
    }
    e.target.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Document History"
    >
      <div
        className="ui-modal-surface w-full sm:max-w-lg max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden w-10 h-1 bg-slate-400/35 rounded-full mx-auto mt-3" />

        {/* Header */}
        <div className="px-5 py-4 border-b ui-divider flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 ui-accent-text" />
            <h2 className="font-display text-base font-semibold ui-text-primary">
              Saved History &amp; Backups
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close history modal"
            className="ui-btn-soft min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mini Earnings & Insights Summary */}
        <div className="px-5 pt-3.5 pb-3 border-b ui-divider grid grid-cols-3 gap-2">
          <div className="ui-subpanel rounded-xl p-2.5 min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-medium ui-text-muted">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="truncate">Total Collected</span>
            </div>
            <div
              className="font-mono-nums text-xs sm:text-sm font-bold text-emerald-500 mt-1 truncate"
              title={totalCollectedText}
            >
              {totalCollectedText}
            </div>
            <div className="text-[10px] ui-text-muted mt-0.5 truncate">
              {paidEntries.length} {paidEntries.length === 1 ? 'paid doc' : 'paid docs'}
            </div>
          </div>

          <div className="ui-subpanel rounded-xl p-2.5 min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-medium ui-text-muted">
              <Hourglass className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">Pending Balance</span>
            </div>
            <div
              className="font-mono-nums text-xs sm:text-sm font-bold text-amber-500 mt-1 truncate"
              title={pendingBalanceText}
            >
              {pendingBalanceText}
            </div>
            <div className="text-[10px] ui-text-muted mt-0.5 truncate">
              {pendingEntries.length}{' '}
              {pendingEntries.length === 1 ? 'pending doc' : 'pending docs'}
            </div>
          </div>

          <div className="ui-subpanel rounded-xl p-2.5 min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-medium ui-text-muted">
              <FileText className="w-3.5 h-3.5 ui-accent-text shrink-0" />
              <span className="truncate">Total Documents</span>
            </div>
            <div className="font-mono-nums text-xs sm:text-sm font-bold ui-text-primary mt-1 truncate">
              {records.length}
            </div>
            <div className="text-[10px] ui-text-muted mt-0.5 truncate">
              {invoiceCount} Inv · {proposalCount} Prop
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-5 py-3.5 border-b ui-divider space-y-2.5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSaveCurrent}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Current Draft
            </button>
            <button
              type="button"
              onClick={() => {
                onNewBlank();
                onClose();
              }}
              className="ui-btn-soft min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              New Blank
            </button>
            <button
              type="button"
              onClick={() => {
                onRestoreDemo();
                onClose();
              }}
              className="ui-btn-soft min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Load Demo Data
            </button>
          </div>

          {/* JSON Backup Controls */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t ui-divider">
            <input
              ref={backupFileRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={onExportBackup}
              className="ui-btn-soft flex-1 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 ui-accent-text" />
              Export Backup (.json)
            </button>
            <button
              type="button"
              onClick={() => backupFileRef.current?.click()}
              className="ui-btn-soft flex-1 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-500" />
              Import Backup
            </button>
          </div>
        </div>

        {/* Saved Items List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-2.5">
          {records.length === 0 ? (
            <div className="ui-subpanel py-10 px-4 text-center rounded-2xl border-dashed">
              <p className="text-sm font-medium ui-text-primary">No saved snapshots yet</p>
              <p className="text-xs ui-text-muted mt-1.5 max-w-xs mx-auto leading-relaxed">
                Your active draft auto-saves automatically. Click &ldquo;Save Current Draft&rdquo; to
                archive an invoice or proposal here.
              </p>
            </div>
          ) : (
            records.map((rec) => {
              const dateLabel = new Date(rec.savedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              });

              return (
                <div
                  key={rec.id}
                  className="ui-subpanel rounded-xl p-3.5 flex items-center justify-between gap-2.5 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onLoadRecord(rec);
                      onClose();
                    }}
                    className="flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-xs ui-accent-text font-medium">
                      <span>{rec.mode === 'invoice' ? 'Invoice' : 'Proposal'}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-nums">{rec.documentNumber}</span>
                    </div>
                    <div className="text-sm font-semibold ui-text-primary truncate mt-0.5">
                      {rec.clientName}
                    </div>
                    <div className="flex items-center gap-2 text-xs ui-text-muted mt-0.5">
                      <span className="font-mono-nums ui-text-secondary font-medium">
                        {formatMoney(rec.grandTotal, rec.currency)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{dateLabel}</span>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onDuplicateRecord(rec);
                        onClose();
                      }}
                      title="Duplicate with new number"
                      aria-label={`Duplicate ${rec.title}`}
                      className="ui-btn-soft min-h-[40px] px-2.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Duplicate</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRecord(rec.id)}
                      aria-label={`Delete ${rec.title}`}
                      className="min-w-[40px] min-h-[40px] rounded-xl ui-text-muted hover:text-rose-500 hover:bg-rose-500/15 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
