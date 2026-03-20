import { describe, it, expect } from 'vitest';
import { extractFileKey } from './figma-url';

describe('extractFileKey', () => {
  it('extracts key from figma.com/file URL', () => {
    expect(extractFileKey('https://www.figma.com/file/ABC123defGHI456/My-File')).toBe('ABC123defGHI456');
  });

  it('extracts key from figma.com/design URL', () => {
    expect(extractFileKey('https://www.figma.com/design/XYZ789abcDEF012/Design-System')).toBe('XYZ789abcDEF012');
  });

  it('accepts raw file key', () => {
    expect(extractFileKey('ABC123defGHI456')).toBe('ABC123defGHI456');
  });

  it('trims whitespace', () => {
    expect(extractFileKey('  ABC123defGHI456  ')).toBe('ABC123defGHI456');
  });

  it('returns null for empty input', () => {
    expect(extractFileKey('')).toBeNull();
    expect(extractFileKey('   ')).toBeNull();
  });

  it('returns null for short strings', () => {
    expect(extractFileKey('abc')).toBeNull();
  });

  it('returns null for invalid URLs', () => {
    expect(extractFileKey('https://example.com/file/ABC123')).toBeNull();
  });
});
