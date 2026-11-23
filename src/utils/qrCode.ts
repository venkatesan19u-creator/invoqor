import QRCode from 'qrcode';

export function buildPaymentQrPayload(rawLink: string, businessName?: string): string {
  const trimmed = rawLink.trim();
  if (!trimmed) return '';

  const isBareUpi =
    !trimmed.includes('://') && /^[\w.-]+@[a-zA-Z0-9]+$/.test(trimmed);

  return isBareUpi
    ? `upi://pay?pa=${trimmed}&pn=${encodeURIComponent(
        businessName?.trim() || 'Payment'
      )}`
    : trimmed;
}

export async function generateHighContrastQrDataUrl(
  rawLink: string,
  businessName?: string,
  pixelWidth = 360
): Promise<string | null> {
  const payload = buildPaymentQrPayload(rawLink, businessName);
  if (!payload) return null;

  return QRCode.toDataURL(payload, {
    width: pixelWidth,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}
