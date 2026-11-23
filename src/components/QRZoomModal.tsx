import React, { useEffect, useState } from 'react';
import { Check, Copy, QrCode, X } from 'lucide-react';
import { generateHighContrastQrDataUrl } from '../utils/qrCode';

interface QRZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentLink: string;
  businessName?: string;
}

export const QRZoomModal: React.FC<QRZoomModalProps> = ({
  isOpen,
  onClose,
  paymentLink,
  businessName,
}) => {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    generateHighContrastQrDataUrl(paymentLink, businessName, 480)
      .then((url) => {
        if (!cancelled) setQrUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, paymentLink, businessName]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(paymentLink.trim());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard errors gracefully
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-md p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Scan to Pay QR Code"
    >
      <div
        className="ui-modal-surface w-full max-w-sm rounded-3xl shadow-2xl p-6 flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 ui-accent-text" />
            <h2 className="font-display text-base font-semibold ui-text-primary">
              Scan to Pay
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close QR zoom modal"
            className="ui-btn-soft min-w-[38px] min-h-[38px] rounded-xl flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* High-Resolution 240x240 QR Code with Quiet-Zone White Frame */}
        <div className="p-4 bg-white rounded-2xl shadow-lg ring-1 ring-slate-900/10">
          {qrUrl ? (
            <img
              src={qrUrl}
              alt="Large scannable payment QR code"
              className="w-[240px] h-[240px] block"
            />
          ) : (
            <div className="w-[240px] h-[240px] flex items-center justify-center text-xs text-slate-500">
              Generating QR...
            </div>
          )}
        </div>

        {businessName?.trim() && (
          <div className="text-xs font-medium ui-text-secondary text-center">
            Pay {businessName.trim()}
          </div>
        )}

        {/* Payment Link / UPI Text + Copy */}
        <div className="ui-subpanel w-full rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2.5">
          <span className="font-mono-nums text-xs ui-text-primary truncate">
            {paymentLink.trim()}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="ui-btn-soft min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 ui-accent-text" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
