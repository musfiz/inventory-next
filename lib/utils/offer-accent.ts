import type { CSSProperties } from 'react';

/**
 * Offer slide "accent" values are stored in the database as strings.
 *
 * Two formats are supported:
 *  1. Legacy: Tailwind gradient stops, e.g. "from-indigo-600/85 to-purple-700/85"
 *     (the original ACCENT_PRESETS values).
 *  2. Custom: "#rrggbb|#rrggbb|intensity", e.g. "#4f46e5|#9333ea|85" where
 *     intensity is 0-100 overlay strength picked by the user in the admin UI.
 *
 * Display rules: the overlay must stay readable behind the left-aligned text
 * but fade out toward the right so the banner image remains visible.
 */

export const DEFAULT_ACCENT_CLASS =
  'from-indigo-600/70 via-purple-700/50 to-transparent';

/** Legacy DB values -> image-friendly display gradient (literal classes so Tailwind compiles them) */
const LEGACY_ACCENT_DISPLAY: Record<string, string> = {
  'from-indigo-600/85 to-purple-700/85':
    'from-indigo-600/90 via-indigo-900/40 to-transparent',
  'from-rose-600/85 to-pink-700/85':
    'from-rose-600/90 via-rose-900/40 to-transparent',
  'from-emerald-600/85 to-teal-700/85':
    'from-emerald-600/90 via-emerald-900/40 to-transparent',
  'from-amber-600/85 to-orange-700/85':
    'from-amber-600/90 via-amber-900/40 to-transparent',
  'from-fuchsia-600/85 to-purple-700/85':
    'from-fuchsia-600/90 via-fuchsia-900/40 to-transparent',
  'from-blue-600/85 to-cyan-700/85':
    'from-blue-600/90 via-blue-900/40 to-transparent',
  'from-red-600/85 to-rose-700/85':
    'from-red-600/90 via-red-900/40 to-transparent',
  'from-violet-600/85 to-fuchsia-700/85':
    'from-violet-600/90 via-violet-900/40 to-transparent',
};

const CUSTOM_ACCENT_RE = /^#[0-9a-fA-F]{6}\|#[0-9a-fA-F]{6}\|(\d{1,3})$/;

export const isCustomAccent = (value?: string | null): boolean =>
  CUSTOM_ACCENT_RE.test(value || '');

export interface CustomAccentParts {
  from: string;
  to: string;
  intensity: number;
}

export const parseCustomAccent = (
  value?: string | null
): CustomAccentParts | null => {
  if (!value || !CUSTOM_ACCENT_RE.test(value)) return null;
  const [from, to, intensity] = value.split('|');
  return { from, to, intensity: Math.min(100, parseInt(intensity, 10)) };
};

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
};

/** Inline style for custom accents; undefined when the value is not custom */
export const accentOverlayStyle = (
  value?: string | null
): CSSProperties | undefined => {
  const parts = parseCustomAccent(value);
  if (!parts) return undefined;

  const alpha = parts.intensity / 100;
  const [r1, g1, b1] = hexToRgb(parts.from);
  const [r2, g2, b2] = hexToRgb(parts.to);

  return {
    background: `linear-gradient(to right, rgba(${r1},${g1},${b1},${alpha}) 0%, rgba(${r2},${g2},${b2},${(alpha * 0.45).toFixed(3)}) 55%, transparent 100%)`,
  };
};

/**
 * Gradient classes for rendering; empty string when a custom inline style
 * applies instead. Unknown legacy values fall back to the safe default.
 */
export const accentDisplayClass = (value?: string | null): string => {
  if (isCustomAccent(value)) return '';
  if (!value) return DEFAULT_ACCENT_CLASS;
  return LEGACY_ACCENT_DISPLAY[value] ?? DEFAULT_ACCENT_CLASS;
};

/** Swatch style for custom accents; empty object for legacy/class values */
export const accentSwatchStyle = (value?: string | null): CSSProperties => {
  const parts = parseCustomAccent(value);
  if (!parts) return {};
  return { background: `linear-gradient(to right, ${parts.from}, ${parts.to})` };
};
