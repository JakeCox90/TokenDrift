import type { JSX } from 'preact';

type CSSProperties = JSX.CSSProperties;

export const colors = {
  // Brand
  brand: '#6C5CE7',
  brandHover: '#5A4BD1',
  brandSubtle: 'rgba(108, 92, 231, 0.08)',
  brandLight: 'rgba(108, 92, 231, 0.12)',

  // Neutrals
  text: '#1A1A2E',
  textSecondary: '#5C5C7A',
  textMuted: '#9C9CB5',
  bg: '#FFFFFF',
  bgSecondary: '#F8F8FC',
  bgTertiary: '#F0F0F7',
  border: '#E8E8F0',
  borderLight: '#F0F0F7',

  // Semantic
  error: '#E74C6F',
  errorBg: 'rgba(231, 76, 111, 0.08)',
  errorBorder: 'rgba(231, 76, 111, 0.2)',
  success: '#00B894',
  successBg: 'rgba(0, 184, 148, 0.08)',
  successBorder: 'rgba(0, 184, 148, 0.2)',
  warning: '#E8A317',
  warningBg: 'rgba(232, 163, 23, 0.08)',
  warningBorder: 'rgba(232, 163, 23, 0.2)',
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
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 600,
  width: '100%',
  letterSpacing: '0.01em',
  boxShadow: `0 1px 3px rgba(108, 92, 231, 0.3)`,
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
