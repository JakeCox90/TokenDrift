import type { JSX } from 'preact';

type CSSProperties = JSX.CSSProperties;

export const colors = {
  // Brand — uses Figma's built-in theme variables
  brand: 'var(--figma-color-bg-brand)',
  brandHover: 'var(--figma-color-bg-brand-hover)',
  brandSubtle: 'var(--figma-color-bg-brand-tertiary)',
  brandLight: 'var(--figma-color-bg-brand-tertiary)',

  // Neutrals — follows Figma's native theming (auto light/dark)
  text: 'var(--figma-color-text)',
  textSecondary: 'var(--figma-color-text-secondary)',
  textMuted: 'var(--figma-color-text-tertiary)',
  bg: 'var(--figma-color-bg)',
  bgSecondary: 'var(--figma-color-bg-secondary)',
  bgTertiary: 'var(--figma-color-bg-tertiary)',
  border: 'var(--figma-color-border)',
  borderLight: 'var(--figma-color-border)',

  // Semantic
  error: 'var(--figma-color-text-danger)',
  errorBg: 'var(--figma-color-bg-danger-tertiary)',
  errorBorder: 'var(--figma-color-border-danger)',
  success: 'var(--figma-color-text-success)',
  successBg: 'var(--figma-color-bg-success-tertiary)',
  successBorder: 'var(--figma-color-border-success)',
  warning: 'var(--figma-color-text-warning)',
  warningBg: 'var(--figma-color-bg-warning-tertiary)',
  warningBorder: 'var(--figma-color-border-warning)',

  // Text on brand backgrounds
  textOnBrand: 'var(--figma-color-text-onbrand)',
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.04)',
  md: '0 2px 8px rgba(0,0,0,0.06)',
  lg: '0 4px 16px rgba(0,0,0,0.08)',
  inset: 'inset 0 1px 2px rgba(0,0,0,0.06)',
} as const;

export const button: CSSProperties = {
  padding: '9px 16px',
  background: colors.brand,
  color: colors.textOnBrand,
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 600,
  width: '100%',
  letterSpacing: '0.01em',
  boxShadow: 'var(--figma-shadow-floating, 0 1px 3px rgba(0,0,0,0.12))',
  transition: 'all 0.15s ease',
};

export const buttonDisabled: CSSProperties = {
  ...button,
  opacity: 0.4,
  cursor: 'not-allowed',
  boxShadow: 'none',
};

export const buttonSecondary: CSSProperties = {
  ...button,
  background: colors.bgSecondary,
  color: colors.textSecondary,
  border: `1px solid ${colors.border}`,
  boxShadow: shadows.sm,
};

export const buttonGhost: CSSProperties = {
  padding: '5px 10px',
  background: 'transparent',
  color: colors.textSecondary,
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 500,
  transition: 'all 0.15s ease',
};

export const input: CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: `1px solid ${colors.border}`,
  borderRadius: '8px',
  fontSize: '12px',
  outline: 'none',
  boxSizing: 'border-box',
  background: colors.bg,
  color: colors.text,
  boxShadow: shadows.inset,
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
};

export const label: CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: colors.textSecondary,
  marginBottom: '6px',
  letterSpacing: '0.03em',
  textTransform: 'uppercase',
};

export const section: CSSProperties = {
  marginBottom: '20px',
};

export const card: CSSProperties = {
  padding: '12px',
  background: colors.bgSecondary,
  borderRadius: '10px',
  border: `1px solid ${colors.borderLight}`,
};

export const badge = (bg: string, color: string, borderColor?: string): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '3px 8px',
  borderRadius: '6px',
  fontSize: '10px',
  fontWeight: 600,
  background: bg,
  color,
  border: borderColor ? `1px solid ${borderColor}` : 'none',
  letterSpacing: '0.01em',
});

export const divider: CSSProperties = {
  height: '1px',
  background: colors.border,
  margin: '16px 0',
  border: 'none',
};
