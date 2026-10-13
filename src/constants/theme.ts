/**
 * Jay AI design system.
 *
 * Brand: Jay AI
 * A premium, futuristic, video-first AI creation platform.
 *
 * Palette is monochromatic blue (navy → azure → white), matching the
 * "Jay AI UI/UX Design System Showcase":
 *   #0284C7 · #3880F8 · #0F172A · #020617 · #94A3B8 · #F8FAFC
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Palette = {
  /** Deepest canvas background (#020617) */
  deepNavy: '#020617',
  /** Secondary navy used for headers, elevated surfaces (#0F172A) */
  navy: '#0f172a',
  /** Card surface */
  card: '#0b1327',
  /** Slightly lighter card for nested content */
  cardElevated: '#111c33',
  /** Hairline borders */
  border: '#1e293b',
  borderSoft: 'rgba(148, 163, 184, 0.14)',

  /** Primary brand blue (#0284C7) */
  primary: '#0284c7',
  /** Bright accent blue for highlights, icons and glow (#3880F8) */
  primaryBright: '#3880f8',
  primaryDeep: '#075985',

  /** Semantic colors */
  success: '#34d399',
  warning: '#f59e0b',
  danger: '#f87171',
  info: '#60a5fa',

  /** Text (#F8FAFC / #94A3B8) */
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  white: '#ffffff',
  black: '#000000',
} as const;

/** Linear gradient color stops used throughout the app. */
export const Gradients = {
  brand: ['#0284c7', '#3880f8'] as const,
  brandSoft: ['rgba(2, 132, 199, 0.45)', 'rgba(56, 128, 248, 0.30)'] as const,
  videoCard: ['#0284c7', '#3880f8'] as const,
  screen: ['#020617', '#0b1327', '#020617'] as const,
  glow: ['rgba(56, 128, 248, 0.25)', 'rgba(56, 128, 248, 0)'] as const,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 48,
  seven: 64,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

/**
 * Serif typeface used across the app: Tinos, a metric-compatible substitute
 * for Times New Roman (which is not present on Android). Keys match the names
 * registered with expo-font in `src/app/_layout.tsx`.
 */
export const Serif = {
  regular: 'Tinos_400Regular',
  italic: 'Tinos_400Italic',
  bold: 'Tinos_700Bold',
  boldItalic: 'Tinos_700BoldItalic',
} as const;

export const Typography = {
  display: { fontSize: 34, lineHeight: 40, fontFamily: Serif.bold },
  title: { fontSize: 26, lineHeight: 32, fontFamily: Serif.bold },
  heading: { fontSize: 20, lineHeight: 26, fontFamily: Serif.bold },
  body: { fontSize: 16, lineHeight: 24, fontFamily: Serif.regular },
  label: { fontSize: 15, lineHeight: 20, fontFamily: Serif.bold },
  small: { fontSize: 13, lineHeight: 18, fontFamily: Serif.regular },
  tiny: { fontSize: 11, lineHeight: 15, fontFamily: Serif.bold },
  code: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const, fontFamily: 'monospace' },
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: Serif.regular,
    serif: Serif.regular,
    rounded: Serif.regular,
    mono: 'ui-monospace',
  },
  default: {
    sans: Serif.regular,
    serif: Serif.regular,
    rounded: Serif.regular,
    mono: 'monospace',
  },
  web: {
    sans: Serif.regular,
    serif: Serif.regular,
    rounded: Serif.regular,
    mono: 'var(--font-mono)',
  },
});

/** Safe bottom inset so scroll content clears the floating tab bar. */
export const BottomTabInset = Platform.select({ ios: 78, android: 92, default: 78 }) ?? 78;
export const MaxContentWidth = 720;

export type ThemeColor = keyof typeof Palette;
