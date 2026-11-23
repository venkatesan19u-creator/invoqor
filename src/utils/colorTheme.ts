import { ACCENT_COLORS, AccentColorConfig, AccentColorId } from '../types/billing';

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface UiPreset {
  id: string;
  name: string;
  hex: string;
}

export const UI_BACKGROUND_PRESETS: UiPreset[] = [
  { id: 'midnight', name: 'Midnight Indigo', hex: '#0B0F19' },
  { id: 'obsidian', name: 'Obsidian Black', hex: '#050507' },
  { id: 'frosted', name: 'Frosted Light', hex: '#EEF2F9' },
];

export function normalizeHex(input: string): string | null {
  const cleaned = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    const r = cleaned[0] + cleaned[0];
    const g = cleaned[1] + cleaned[1];
    const b = cleaned[2] + cleaned[2];
    return `#${r}${g}${b}`.toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned}`.toUpperCase();
  }
  return null;
}

export function hexToRgb(hex: string): RgbColor {
  const norm = normalizeHex(hex) ?? '#0B0F19';
  return {
    r: parseInt(norm.slice(1, 3), 16),
    g: parseInt(norm.slice(3, 5), 16),
    b: parseInt(norm.slice(5, 7), 16),
  };
}

export function rgbToHex({ r, g, b }: RgbColor): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

export function mixRgb(a: RgbColor, b: RgbColor, weightB: number): RgbColor {
  const w = Math.max(0, Math.min(1, weightB));
  return {
    r: a.r * (1 - w) + b.r * w,
    g: a.g * (1 - w) + b.g * w,
    b: a.b * (1 - w) + b.b * w,
  };
}

export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function isColorLight(hex: string): boolean {
  return getRelativeLuminance(hex) > 0.36;
}

export interface ComputedUiTheme {
  baseHex: string;
  isLight: boolean;
  backgroundGradient: string;
  orbPrimary: string;
  orbSecondary: string;
  orbAccent: string;
}

export function computeUiTheme(rawHex: string): ComputedUiTheme {
  const baseHex = normalizeHex(rawHex) ?? '#0B0F19';
  const baseRgb = hexToRgb(baseHex);
  const isLight = isColorLight(baseHex);

  if (isLight) {
    // Rich frosted light glassmorphic gradient
    const coolTint: RgbColor = { r: 226, g: 234, b: 248 };
    const warmTint: RgbColor = { r: 244, g: 247, b: 252 };
    const stop1 = rgbToHex(mixRgb(baseRgb, warmTint, 0.14));
    const stop2 = baseHex;
    const stop3 = rgbToHex(mixRgb(baseRgb, coolTint, 0.26));

    return {
      baseHex,
      isLight: true,
      backgroundGradient: `linear-gradient(145deg, ${stop1} 0%, ${stop2} 52%, ${stop3} 100%)`,
      orbPrimary: `rgba(${Math.max(40, baseRgb.r - 80)}, ${Math.max(50, baseRgb.g - 70)}, ${Math.min(255, baseRgb.b + 20)}, 0.22)`,
      orbSecondary: 'rgba(99, 102, 241, 0.16)',
      orbAccent: 'rgba(14, 165, 233, 0.14)',
    };
  }

  // Deep rich dark glassmorphic gradient derived from user color
  const slateAnchor: RgbColor = { r: 19, g: 27, b: 46 };
  const deepAnchor: RgbColor = { r: 8, g: 12, b: 24 };
  const midHex = rgbToHex(mixRgb(baseRgb, slateAnchor, 0.28));
  const endHex = rgbToHex(mixRgb(baseRgb, deepAnchor, 0.18));

  const glowR = Math.min(255, baseRgb.r + 75);
  const glowG = Math.min(255, baseRgb.g + 65);
  const glowB = Math.min(255, baseRgb.b + 110);

  return {
    baseHex,
    isLight: false,
    backgroundGradient: `linear-gradient(145deg, ${baseHex} 0%, ${midHex} 52%, ${endHex} 100%)`,
    orbPrimary: `rgba(${glowR}, ${glowG}, ${glowB}, 0.26)`,
    orbSecondary: 'rgba(124, 58, 237, 0.18)',
    orbAccent: 'rgba(56, 189, 248, 0.14)',
  };
}

export interface ResolvedA4Palette extends AccentColorConfig {
  corporateHeaderText: string;
  corporateHeaderMuted: string;
}

export function resolveA4AccentPalette(
  accentColor?: AccentColorId | 'custom',
  customAccentHex?: string
): ResolvedA4Palette {
  if (accentColor !== 'custom') {
    const preset = ACCENT_COLORS[accentColor ?? 'purple'] ?? ACCENT_COLORS.purple;
    return {
      ...preset,
      corporateHeaderText: '#FFFFFF',
      corporateHeaderMuted: '#E2E8F0',
    };
  }

  const validHex = normalizeHex(customAccentHex || '') ?? '#6366F1';
  const rgb = hexToRgb(validHex);
  const white: RgbColor = { r: 255, g: 255, b: 255 };
  const darkSlate: RgbColor = { r: 15, g: 23, b: 42 };

  const softHex = rgbToHex(mixRgb(rgb, white, 0.91));
  const borderHex = rgbToHex(mixRgb(rgb, white, 0.76));
  const gradientEndHex = rgbToHex(
    mixRgb(rgb, isColorLight(validHex) ? darkSlate : white, 0.22)
  );

  // Ensure readable text on light table headers and white paper
  const isBright = isColorLight(validHex);
  const readablePrimary =
    getRelativeLuminance(validHex) > 0.65
      ? rgbToHex(mixRgb(rgb, darkSlate, 0.45))
      : validHex;
  const tableTextHex = isBright
    ? rgbToHex(mixRgb(rgb, darkSlate, 0.55))
    : validHex;

  return {
    id: 'purple',
    name: 'Custom',
    swatch: validHex,
    primary: readablePrimary,
    gradientEnd: gradientEndHex,
    soft: softHex,
    border: borderHex,
    tableText: tableTextHex,
    corporateHeaderText: isColorLight(validHex) ? '#0F172A' : '#FFFFFF',
    corporateHeaderMuted: isColorLight(validHex) ? '#334155' : '#E2E8F0',
  };
}
