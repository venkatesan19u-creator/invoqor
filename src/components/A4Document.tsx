import React, { useEffect, useState } from 'react';
import {
  AppSettings,
  calculateDocumentTotals,
  DateFormatOption,
  DEFAULT_APP_SETTINGS,
  DocumentData,
  DocumentFontOption,
  DocumentStatus,
  formatMoney,
  PAPER_DIMENSIONS,
} from '../types/billing';
import { resolveA4AccentPalette } from '../utils/colorTheme';
import { generateHighContrastQrDataUrl } from '../utils/qrCode';

interface A4DocumentProps {
  doc: DocumentData;
  settings?: AppSettings;
  id?: string;
  onQrClick?: () => void;
}

function formatDateByPreference(iso: string, dateFormat: DateFormatOption): string {
  if (!iso) return '—';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const year = parts[0];
  const month = parts[1].padStart(2, '0');
  const day = parts[2].padStart(2, '0');
  if (!year || !month || !day) return iso;
  return dateFormat === 'DD/MM/YYYY'
    ? `${day}/${month}/${year}`
    : `${month}/${day}/${year}`;
}

function getDocumentFontStack(font: DocumentFontOption): string {
  if (font === 'classic-serif') {
    return "'Source Serif 4', Georgia, 'Times New Roman', serif";
  }
  if (font === 'clean-mono') {
    return "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace";
  }
  return "'DM Sans', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";
}

const STAMP_STYLES: Record<
  Exclude<DocumentStatus, 'none'>,
  { label: string; color: string; bg: string }
> = {
  paid: {
    label: 'PAID',
    color: '#059669',
    bg: 'rgba(5, 150, 105, 0.06)',
  },
  pending: {
    label: 'PENDING',
    color: '#D97706',
    bg: 'rgba(217, 119, 6, 0.06)',
  },
  draft: {
    label: 'DRAFT',
    color: '#64748B',
    bg: 'rgba(100, 116, 139, 0.06)',
  },
};

export const A4Document: React.FC<A4DocumentProps> = ({
  doc,
  settings = DEFAULT_APP_SETTINGS,
  id,
  onQrClick,
}) => {
  const { features } = settings;
  const paper = PAPER_DIMENSIONS[settings.paperSize] ?? PAPER_DIMENSIONS.a4;
  const isLetter = settings.paperSize === 'letter';
  const totals = calculateDocumentTotals(doc, features.taxCalculator);
  const isInvoice = doc.mode === 'invoice';
  const theme = doc.template;
  const accent = resolveA4AccentPalette(doc.accentColor, doc.customAccentHex);
  const status = doc.status ?? 'none';
  const taxLabel = settings.taxLabel?.trim() || 'Tax';
  const fontStack = getDocumentFontStack(settings.documentFont);

  // Dynamic labels based on Invoice vs Proposal mode
  const docTitle = isInvoice ? 'INVOICE' : 'PROPOSAL';
  const numberLabel = isInvoice ? 'Invoice No.' : 'Proposal No.';
  const issueLabel = isInvoice ? 'Issue Date' : 'Date Prepared';
  const dueLabel = isInvoice ? 'Due Date' : 'Valid Until';
  const recipientLabel = isInvoice ? 'Bill To' : 'Prepared For';
  const totalLabel = isInvoice ? 'Amount Due' : 'Estimated Total';
  const notesHeading = isInvoice ? 'Notes & Terms' : 'Scope Notes & Terms';

  // Theme-specific pure hex palettes driven by selected accentColor (zero oklch)
  const isCorporate = theme === 'corporate';
  const isModern = theme === 'modern';

  const primaryAccent = accent.primary;
  const softSurface = accent.soft;
  const borderHairline = isModern ? accent.border : '#E2E8F0';
  const mutedText = '#64748B';
  const bodyText = '#1E293B';
  const headingText = '#0F172A';

  const businessInitial = (doc.business.name.trim()[0] || 'K').toUpperCase();
  const stampConfig =
    features.statusStamp && status !== 'none' ? STAMP_STYLES[status] : null;
  const legacyPaymentText = doc.business.paymentDetails?.trim() || '';
  const bank = doc.business.bankDetails;
  const bankRows = features.bankDetails
    ? [
        { label: 'Account Holder', value: bank?.accountHolder?.trim() || '', fullWidth: false },
        { label: 'Bank Name', value: bank?.bankName?.trim() || '', fullWidth: false },
        { label: 'Account / IBAN', value: bank?.accountNumber?.trim() || '', fullWidth: false },
        { label: 'Routing / SWIFT / IFSC', value: bank?.routingCode?.trim() || '', fullWidth: false },
        { label: 'PayPal / UPI', value: bank?.paypalOrUpi?.trim() || '', fullWidth: true },
      ]
        .filter((row) => row.value.length > 0)
        .map((row) => ({
          ...row,
          fullWidth: row.fullWidth || row.value.length > 22,
        }))
    : [];

  const rawQrLink = doc.business.paymentQrLink?.trim() || '';
  const showQr =
    features.paymentQr && Boolean(doc.business.showPaymentQr) && rawQrLink.length > 0;
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!showQr) {
      setQrDataUrl(null);
      return;
    }

    generateHighContrastQrDataUrl(rawQrLink, doc.business.name, 360)
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [showQr, rawQrLink, doc.business.name]);

  return (
    <div
      id={id}
      style={{
        width: `${paper.width}px`,
        minHeight: `${paper.height}px`,
        height: `${paper.height}px`,
        backgroundColor: '#FFFFFF',
        color: bodyText,
        fontFamily: fontStack,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Top Accent Bar for Modern Glass Accent */}
      {isModern && (
        <div
          style={{
            height: '8px',
            width: '100%',
            background: `linear-gradient(90deg, ${accent.primary} 0%, ${accent.gradientEnd} 100%)`,
            flexShrink: 0,
          }}
        />
      )}

      {/* Corporate Header Band */}
      {isCorporate && (
        <div
          style={{
            backgroundColor: primaryAccent,
            color: accent.corporateHeaderText,
            padding: '36px 48px 32px 48px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', maxWidth: '420px' }}>
            {doc.business.logoDataUrl ? (
              <img
                src={doc.business.logoDataUrl}
                alt="Business logo"
                style={{
                  width: '54px',
                  height: '54px',
                  objectFit: 'contain',
                  borderRadius: '10px',
                  backgroundColor: '#FFFFFF',
                  padding: '4px',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '10px',
                  backgroundColor:
                    accent.corporateHeaderText === '#0F172A'
                      ? 'rgba(15,23,42,0.08)'
                      : 'rgba(255,255,255,0.14)',
                  border:
                    accent.corporateHeaderText === '#0F172A'
                      ? '1px solid rgba(15,23,42,0.18)'
                      : '1px solid rgba(255,255,255,0.28)',
                  color: accent.corporateHeaderText,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {businessInitial}
              </div>
            )}
            <div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: accent.corporateHeaderText,
                  lineHeight: 1.2,
                }}
              >
                {doc.business.name || 'Your Business Name'}
              </div>
              {doc.business.email && (
                <div
                  style={{
                    fontSize: '12.5px',
                    color: accent.corporateHeaderMuted,
                    marginTop: '4px',
                  }}
                >
                  {doc.business.email}
                </div>
              )}
              {doc.business.address && (
                <div
                  style={{
                    fontSize: '12px',
                    color: accent.corporateHeaderMuted,
                    marginTop: '3px',
                    whiteSpace: 'pre-line',
                    lineHeight: 1.45,
                  }}
                >
                  {doc.business.address}
                </div>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: accent.corporateHeaderText,
                lineHeight: 1.1,
              }}
            >
              {docTitle}
            </div>
            <div
              style={{
                marginTop: '10px',
                fontSize: '13px',
                color: accent.corporateHeaderMuted,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {doc.details.documentNumber || '—'}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <div
        style={{
          padding: isCorporate
            ? isLetter
              ? '26px 46px 24px 46px'
              : '32px 48px 34px 48px'
            : isLetter
              ? '32px 46px 26px 46px'
              : '44px 48px 36px 48px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'space-between',
        }}
      >
        <div>
          {/* Header for Minimalist & Modern Themes */}
          {!isCorporate && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                paddingBottom: '24px',
                borderBottom: `1px solid ${borderHairline}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', maxWidth: '410px' }}>
                {doc.business.logoDataUrl ? (
                  <img
                    src={doc.business.logoDataUrl}
                    alt="Business logo"
                    style={{
                      width: '56px',
                      height: '56px',
                      objectFit: 'contain',
                      borderRadius: '12px',
                      border: `1px solid ${borderHairline}`,
                      backgroundColor: '#FFFFFF',
                      padding: '4px',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '12px',
                      backgroundColor: softSurface,
                      border: `1px solid ${accent.border}`,
                      color: primaryAccent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '21px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {businessInitial}
                  </div>
                )}

                <div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: headingText,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2,
                    }}
                  >
                    {doc.business.name || 'Your Business Name'}
                  </div>
                  {doc.business.email && (
                    <div style={{ fontSize: '12.5px', color: mutedText, marginTop: '4px' }}>
                      {doc.business.email}
                    </div>
                  )}
                  {doc.business.address && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: mutedText,
                        marginTop: '3px',
                        whiteSpace: 'pre-line',
                        lineHeight: 1.45,
                      }}
                    >
                      {doc.business.address}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    display: 'inline-block',
                    padding: isModern ? '6px 14px' : '0',
                    borderRadius: isModern ? '8px' : '0',
                    backgroundColor: isModern ? softSurface : 'transparent',
                    color: primaryAccent,
                    fontSize: isModern ? '22px' : '28px',
                    fontWeight: 800,
                    letterSpacing: '0.07em',
                    lineHeight: 1.15,
                  }}
                >
                  {docTitle}
                </div>
                <div
                  style={{
                    marginTop: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: headingText,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {doc.details.documentNumber || '—'}
                </div>
              </div>
            </div>
          )}

          {/* Client & Document Meta Grid */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'stretch',
              gap: '24px',
              marginTop: isCorporate ? '0px' : '24px',
              padding: isModern ? '18px 20px' : '0',
              borderRadius: isModern ? '12px' : '0',
              backgroundColor: isModern ? softSurface : 'transparent',
              border: isModern ? `1px solid ${borderHairline}` : 'none',
            }}
          >
            <div style={{ flex: 1, maxWidth: '380px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: primaryAccent,
                  marginBottom: '8px',
                }}
              >
                {recipientLabel}
              </div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: headingText,
                  lineHeight: 1.3,
                }}
              >
                {doc.client.name || 'Client Name'}
              </div>
              {doc.client.companyOrEmail && (
                <div style={{ fontSize: '13px', color: bodyText, marginTop: '4px' }}>
                  {doc.client.companyOrEmail}
                </div>
              )}
              {doc.client.address && (
                <div
                  style={{
                    fontSize: '12.5px',
                    color: mutedText,
                    marginTop: '4px',
                    whiteSpace: 'pre-line',
                    lineHeight: 1.45,
                  }}
                >
                  {doc.client.address}
                </div>
              )}
            </div>

            <div
              style={{
                minWidth: '230px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                borderLeft: isCorporate ? `1px solid ${borderHairline}` : 'none',
                paddingLeft: isCorporate ? '24px' : '0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: mutedText }}>{numberLabel}</span>
                <span
                  style={{
                    fontWeight: 600,
                    color: headingText,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {doc.details.documentNumber || '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: mutedText }}>{issueLabel}</span>
                <span style={{ fontWeight: 500, color: headingText }}>
                  {formatDateByPreference(doc.details.issueDate, settings.dateFormat)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: mutedText }}>{dueLabel}</span>
                <span style={{ fontWeight: 600, color: headingText }}>
                  {formatDateByPreference(doc.details.dueDate, settings.dateFormat)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: mutedText }}>Currency</span>
                <span style={{ fontWeight: 600, color: headingText }}>{doc.currency}</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div style={{ marginTop: '24px' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                tableLayout: 'fixed',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: softSurface,
                    borderTop: `1px solid ${accent.border}`,
                    borderBottom: `1px solid ${accent.border}`,
                  }}
                >
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '11px 14px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      color: accent.tableText,
                      width: '50%',
                    }}
                  >
                    Description
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '11px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      color: accent.tableText,
                      width: '12%',
                    }}
                  >
                    Qty
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '11px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      color: accent.tableText,
                      width: '19%',
                    }}
                  >
                    Unit Price
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '11px 14px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      color: accent.tableText,
                      width: '19%',
                    }}
                  >
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {doc.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: '22px 14px',
                        textAlign: 'center',
                        fontSize: '13px',
                        color: mutedText,
                        borderBottom: `1px solid ${borderHairline}`,
                      }}
                    >
                      No line items added yet.
                    </td>
                  </tr>
                ) : (
                  doc.items.map((item) => {
                    const qty = Number.isFinite(item.quantity) ? Math.max(0, item.quantity) : 0;
                    const price = Number.isFinite(item.unitPrice) ? Math.max(0, item.unitPrice) : 0;
                    const rowTotal = qty * price;
                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid #EDF2F7',
                        }}
                      >
                        <td
                          style={{
                            padding: '12px 14px',
                            fontSize: '13.5px',
                            fontWeight: 500,
                            color: headingText,
                            wordBreak: 'break-word',
                            lineHeight: 1.4,
                          }}
                        >
                          {item.description || 'Untitled service / deliverable'}
                        </td>
                        <td
                          style={{
                            padding: '12px 12px',
                            textAlign: 'right',
                            fontSize: '13px',
                            color: bodyText,
                            fontFamily: "'JetBrains Mono', monospace",
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {qty}
                        </td>
                        <td
                          style={{
                            padding: '12px 12px',
                            textAlign: 'right',
                            fontSize: '13px',
                            color: bodyText,
                            fontFamily: "'JetBrains Mono', monospace",
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatMoney(price, doc.currency)}
                        </td>
                        <td
                          style={{
                            padding: '12px 14px',
                            textAlign: 'right',
                            fontSize: '13.5px',
                            fontWeight: 600,
                            color: headingText,
                            fontFamily: "'JetBrains Mono', monospace",
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatMoney(rowTotal, doc.currency)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Totals Summary Row with Optional Angled Status Rubber Stamp */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '24px',
              marginTop: '22px',
            }}
          >
            {/* Status Stamp Area */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '90px',
              }}
            >
              {stampConfig && (
                <div
                  style={{
                    transform: 'rotate(-12deg)',
                    border: `3.5px solid ${stampConfig.color}`,
                    borderRadius: '10px',
                    padding: '6px 22px',
                    backgroundColor: stampConfig.bg,
                    boxShadow: `inset 0 0 0 2px #FFFFFF, inset 0 0 0 3.5px ${stampConfig.color}`,
                    color: stampConfig.color,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: '22px',
                    fontWeight: 800,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    opacity: 0.88,
                    userSelect: 'none',
                  }}
                >
                  {stampConfig.label}
                </div>
              )}
            </div>

            {/* Totals Box */}
            <div
              style={{
                width: '300px',
                padding: isModern ? '16px 18px' : '10px 0',
                borderRadius: isModern ? '12px' : '0',
                backgroundColor: isModern ? softSurface : 'transparent',
                border: isModern ? `1px solid ${borderHairline}` : 'none',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px 0',
                  fontSize: '13px',
                  color: mutedText,
                }}
              >
                <span>Subtotal</span>
                <span
                  style={{
                    fontWeight: 600,
                    color: headingText,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatMoney(totals.subtotal, doc.currency)}
                </span>
              </div>

              {features.taxCalculator && totals.discountAmount > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    fontSize: '13px',
                    color: '#059669',
                  }}
                >
                  <span>
                    Discount
                    {doc.discountType === 'percent' ? ` (${doc.discountValue}%)` : ''}
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    -{formatMoney(totals.discountAmount, doc.currency)}
                  </span>
                </div>
              )}

              {features.taxCalculator && doc.taxRate > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    fontSize: '13px',
                    color: mutedText,
                  }}
                >
                  <span>
                    {taxLabel} ({doc.taxRate}%)
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      color: headingText,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatMoney(totals.taxAmount, doc.currency)}
                  </span>
                </div>
              )}

              {features.taxCalculator && totals.depositPaid > 0 ? (
                <>
                  <div
                    style={{
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: `1px solid ${borderHairline}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingBottom: '4px',
                      fontSize: '13px',
                      color: headingText,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>Total</span>
                    <span
                      style={{
                        fontWeight: 700,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatMoney(totals.grandTotal, doc.currency)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '4px 0',
                      fontSize: '13px',
                      color: '#059669',
                    }}
                  >
                    <span>Deposit Paid (-)</span>
                    <span
                      style={{
                        fontWeight: 600,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      -{formatMoney(totals.depositPaid, doc.currency)}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: '8px',
                      paddingTop: '12px',
                      borderTop: `2px solid ${primaryAccent}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: headingText,
                      }}
                    >
                      Balance Due
                    </span>
                    <span
                      style={{
                        fontSize: '20px',
                        fontWeight: 800,
                        color: primaryAccent,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatMoney(totals.balanceDue, doc.currency)}
                    </span>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    marginTop: '10px',
                    paddingTop: '12px',
                    borderTop: `2px solid ${primaryAccent}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: headingText,
                    }}
                  >
                    {totalLabel}
                  </span>
                  <span
                    style={{
                      fontSize: '20px',
                      fontWeight: 800,
                      color: primaryAccent,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatMoney(totals.grandTotal, doc.currency)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Notes, Payment Instructions, QR Code & Signature Area */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '18px',
            borderTop: `1px solid ${borderHairline}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '22px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {features.bankDetails && bankRows.length > 0 ? (
              <div>
                <div
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color: primaryAccent,
                    marginBottom: '5px',
                  }}
                >
                  Bank &amp; Payment Details
                </div>
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    columnGap: '16px',
                    rowGap: '7px',
                  }}
                >
                  {bankRows.map((row) => (
                    <div
                      key={row.label}
                      style={{
                        minWidth: 0,
                        gridColumn: row.fullWidth ? '1 / -1' : 'auto',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '9.5px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: mutedText,
                        }}
                      >
                        {row.label}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: headingText,
                          fontFamily: "'JetBrains Mono', monospace",
                          wordBreak: 'normal',
                          overflowWrap: 'anywhere',
                          lineHeight: 1.35,
                        }}
                      >
                        {row.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : features.bankDetails && legacyPaymentText ? (
              <div>
                <div
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color: primaryAccent,
                    marginBottom: '4px',
                  }}
                >
                  Bank &amp; Payment Details
                </div>
                <div
                  style={{
                    fontSize: '11.5px',
                    color: bodyText,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-line',
                    fontFamily: "'JetBrains Mono', monospace",
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '8px 10px',
                  }}
                >
                  {legacyPaymentText}
                </div>
              </div>
            ) : null}

            <div>
              <div
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: primaryAccent,
                  marginBottom: '4px',
                }}
              >
                {notesHeading}
              </div>
              <div
                style={{
                  fontSize: '11.5px',
                  color: mutedText,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-line',
                }}
              >
                {doc.details.notes || 'Thank you for your business.'}
              </div>
            </div>
          </div>

          {/* Right Footer Group: High-Contrast Payment QR Card + Authorized Signature */}
          {(showQr && qrDataUrl) || features.digitalSignature ? (
            <div
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'flex-end',
                gap: '20px',
              }}
            >
              {showQr && qrDataUrl && (
                <div
                  role={onQrClick ? 'button' : undefined}
                  tabIndex={onQrClick ? 0 : undefined}
                  onClick={onQrClick}
                  onKeyDown={
                    onQrClick
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onQrClick();
                          }
                        }
                      : undefined
                  }
                  title={onQrClick ? 'Click to enlarge Payment QR Code' : undefined}
                  aria-label={onQrClick ? 'Enlarge Payment QR Code' : undefined}
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: onQrClick ? 'pointer' : 'default',
                  }}
                >
                  <div
                    style={{
                      width: '132px',
                      height: '132px',
                      padding: '8px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '10px',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box',
                    }}
                  >
                    <img
                      src={qrDataUrl}
                      alt="Scan to Pay QR Code"
                      style={{
                        width: '116px',
                        height: '116px',
                        display: 'block',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      color: primaryAccent,
                      textAlign: 'center',
                    }}
                  >
                    Scan to Pay
                  </div>
                </div>
              )}

              {features.digitalSignature && (
                <div style={{ width: '168px', textAlign: 'left', flexShrink: 0 }}>
                  <div
                    style={{
                      height: '64px',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      borderBottom: '1px solid #CBD5E1',
                      paddingBottom: '4px',
                      marginBottom: '6px',
                    }}
                  >
                    {doc.signatureDataUrl ? (
                      <img
                        src={doc.signatureDataUrl}
                        alt="Authorized signature"
                        style={{
                          maxHeight: '56px',
                          maxWidth: '160px',
                          objectFit: 'contain',
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#CBD5E1',
                          fontStyle: 'italic',
                          paddingBottom: '6px',
                        }}
                      >
                        Signature
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 600,
                      color: mutedText,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    Authorized Signature
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Optional Powered by Invoqor Footer */}
        {features.poweredByFooter && (
          <div
            style={{
              marginTop: '12px',
              paddingTop: '8px',
              borderTop: '1px solid #F1F5F9',
              textAlign: 'center',
              fontSize: '10px',
              fontWeight: 500,
              letterSpacing: '0.04em',
              color: '#94A3B8',
            }}
          >
            Powered by Invoqor
          </div>
        )}
      </div>
    </div>
  );
};
