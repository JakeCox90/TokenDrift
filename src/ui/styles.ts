import type { JSX } from 'preact';

type CSSProperties = JSX.CSSProperties;

export const colors = {
  brand: '#18A0FB',
  brandHover: '#0C8CE9',
  text: '#333333',
  textSecondary: '#666666',
  textMuted: '#999999',
  bg: '#FFFFFF',
  bgSecondary: '#F5F5F5',
  border: '#E5E5E5',
  error: '#F24822',
  errorBg: '#FFF0ED',
  success: '#1BC47D',
  successBg: '#EDFCF5',
  warning: '#FFBE0B',
  warningBg: '#FFF8E6',
} as const;

export const button: CSSProperties = {
  padding: '8px 16px',
  background: colors.brand,
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 500,
  width: '100%',
};

export const buttonDisabled: CSSProperties = {
  ...button,
  opacity: 0.5,
  cursor: 'not-allowed',
};

export const buttonSecondary: CSSProperties = {
  ...button,
  background: 'transparent',
  color: colors.text,
  border: `1px solid ${colors.border}`,
};

export const input: CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: `1px solid ${colors.border}`,
  borderRadius: '6px',
  fontSize: '12px',
  outline: 'none',
  boxSizing: 'border-box',
};

export const label: CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: colors.textSecondary,
  marginBottom: '4px',
};

export const section: CSSProperties = {
  marginBottom: '16px',
};

export const badge = (bg: string, color: string): CSSProperties => ({
  display: 'inline-block',
  padding: '2px 6px',
  borderRadius: '4px',
  fontSize: '10px',
  fontWeight: 600,
  background: bg,
  color,
});
