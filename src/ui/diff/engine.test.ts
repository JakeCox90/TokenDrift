import { describe, it, expect } from 'vitest';
import { compareTokens, stripFirstSegment } from './engine';
import type { NormalisedToken } from '../../types';

const SOURCE = 'source-file';
const COMP = 'comp-file';

function variable(name: string, collection: string, sourceFile = SOURCE): NormalisedToken {
  return { name, type: 'VARIABLE', collection, resolvedType: 'COLOR', sourceFile };
}

function style(name: string, type: NormalisedToken['type'] = 'PAINT_STYLE', sourceFile = SOURCE): NormalisedToken {
  return { name, type, sourceFile };
}

describe('stripFirstSegment', () => {
  it('strips first slash-separated segment', () => {
    expect(stripFirstSegment('colour/primary/resting')).toBe('primary/resting');
  });

  it('strips first dot-separated segment', () => {
    expect(stripFirstSegment('thesun.primary.resting')).toBe('primary.resting');
  });

  it('prefers slash over dot', () => {
    expect(stripFirstSegment('colour/primary.resting')).toBe('primary.resting');
  });

  it('returns as-is when no separator', () => {
    expect(stripFirstSegment('primary')).toBe('primary');
  });

  it('handles trailing separator', () => {
    expect(stripFirstSegment('colour/')).toBe('colour/');
  });
});

describe('compareTokens — ignore_first_segment (default)', () => {
  it('matches tokens with different first segments', () => {
    const source = [variable('colour/primary/resting', 'Tokens')];
    const comp = [variable('thesun/primary/resting', 'Tokens', COMP)];
    const issues = compareTokens(source, comp, SOURCE, COMP);
    expect(issues).toEqual([]);
  });

  it('matches dot-separated tokens with different prefixes', () => {
    const source = [variable('brand.primary.default', 'Tokens')];
    const comp = [variable('theme.primary.default', 'Tokens', COMP)];
    const issues = compareTokens(source, comp, SOURCE, COMP);
    expect(issues).toEqual([]);
  });

  it('detects genuinely missing tokens after stripping', () => {
    const source = [
      variable('colour/primary/resting', 'Tokens'),
      variable('colour/secondary/resting', 'Tokens'),
    ];
    const comp = [variable('thesun/primary/resting', 'Tokens', COMP)];
    const issues = compareTokens(source, comp, SOURCE, COMP);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      type: 'missing_in_comparison',
      sourceName: 'colour/secondary/resting',
    });
  });

  it('matches styles with different first segments', () => {
    const source = [style('brand/fill/primary', 'PAINT_STYLE')];
    const comp = [style('theme/fill/primary', 'PAINT_STYLE', COMP)];
    const issues = compareTokens(source, comp, SOURCE, COMP);
    expect(issues).toEqual([]);
  });
});

describe('compareTokens — full_name', () => {
  const opts = { matchStrategy: 'full_name' as const };

  it('detects tokens with different first segments as relocated', () => {
    const source = [variable('colour/primary/resting', 'Tokens')];
    const comp = [variable('thesun/primary/resting', 'Tokens', COMP)];
    const issues = compareTokens(source, comp, SOURCE, COMP, opts);

    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('naming_mismatch');
    expect(issues[0].hint).toContain('different groups');
  });

  it('matches when names are identical', () => {
    const source = [variable('colour/primary', 'Brand')];
    const comp = [variable('colour/primary', 'Brand', COMP)];
    expect(compareTokens(source, comp, SOURCE, COMP, opts)).toEqual([]);
  });

  it('same name in different collections are treated as different tokens', () => {
    const source = [variable('primary', 'Light')];
    const comp = [variable('primary', 'Dark', COMP)];
    const issues = compareTokens(source, comp, SOURCE, COMP, opts);

    expect(issues).toHaveLength(2);
  });
});

describe('compareTokens — naming mismatch detection', () => {
  it('detects number padding difference ("00" vs "0")', () => {
    const source = [variable('brand/border-width-00', 'Tokens')];
    const comp = [variable('theme/border-width-0', 'Tokens', COMP)];
    const issues = compareTokens(source, comp, SOURCE, COMP);

    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('naming_mismatch');
    expect(issues[0].sourceName).toBe('brand/border-width-00');
    expect(issues[0].comparisonName).toBe('theme/border-width-0');
    expect(issues[0].hint).toContain('numbers are written differently');
  });

  it('detects case difference', () => {
    const source = [variable('brand/Primary/Resting', 'Tokens')];
    const comp = [variable('theme/primary/resting', 'Tokens', COMP)];
    const issues = compareTokens(source, comp, SOURCE, COMP);

    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('naming_mismatch');
    expect(issues[0].hint).toContain('capitalisation');
  });

  it('detects separator style difference', () => {
    const source = [style('brand/fill-primary', 'PAINT_STYLE')];
    const comp = [style('theme/fill_primary', 'PAINT_STYLE', COMP)];
    const issues = compareTokens(source, comp, SOURCE, COMP);

    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('naming_mismatch');
    expect(issues[0].hint).toContain('different separators');
  });

  it('detects colour vs color spelling', () => {
    const source = [variable('brand/colour/primary', 'Tokens')];
    const comp = [variable('theme/color/primary', 'Tokens', COMP)];
    const issues = compareTokens(source, comp, SOURCE, COMP);

    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('naming_mismatch');
    expect(issues[0].hint).toContain('different spelling');
  });

  it('detects grey vs gray spelling', () => {
    const source = [style('brand/grey-500', 'PAINT_STYLE')];
    const comp = [style('theme/gray-500', 'PAINT_STYLE', COMP)];
    const issues = compareTokens(source, comp, SOURCE, COMP);

    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('naming_mismatch');
    expect(issues[0].hint).toContain('different spelling');
  });

  it('detects relocated tokens (same name, different folder)', () => {
    const source = [variable('palette/Yellow/100', 'Primitives')];
    const comp = [variable('palette/Unused/Yellow/100', 'Primitives', COMP)];
    const issues = compareTokens(source, comp, SOURCE, COMP);

    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('naming_mismatch');
    expect(issues[0].hint).toContain('different groups');
    expect(issues[0].hint).toContain('Unused');
  });

  it('detects relocated tokens with deeper nesting', () => {
    const source = [variable('tokens/core/Yellow/100', 'Primitives')];
    const comp = [variable('tokens/archive/old/Yellow/100', 'Primitives', COMP)];
    const issues = compareTokens(source, comp, SOURCE, COMP);

    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('naming_mismatch');
    expect(issues[0].hint).toContain('different groups');
  });

  it('does not false-positive on genuinely different tokens', () => {
    const source = [variable('brand/primary/resting', 'Tokens')];
    const comp = [variable('theme/secondary/hover', 'Tokens', COMP)];
    const issues = compareTokens(source, comp, SOURCE, COMP);

    expect(issues).toHaveLength(2);
    expect(issues.every(i => i.type !== 'naming_mismatch')).toBe(true);
  });

  it('pairs mismatches correctly and leaves genuinely missing tokens', () => {
    const source = [
      variable('brand/border-width-00', 'Tokens'),
      variable('brand/unique-source', 'Tokens'),
    ];
    const comp = [
      variable('theme/border-width-0', 'Tokens', COMP),
      variable('theme/unique-comp', 'Tokens', COMP),
    ];
    const issues = compareTokens(source, comp, SOURCE, COMP);

    const mismatches = issues.filter(i => i.type === 'naming_mismatch');
    const missing = issues.filter(i => i.type !== 'naming_mismatch');

    expect(mismatches).toHaveLength(1);
    expect(missing).toHaveLength(2);
  });
});

describe('compareTokens — edge cases', () => {
  it('returns no issues when both lists are empty', () => {
    expect(compareTokens([], [], SOURCE, COMP)).toEqual([]);
  });

  it('returns no issues when tokens are identical', () => {
    const source = [variable('color/primary', 'Brand')];
    const comp = [variable('color/primary', 'Brand', COMP)];
    expect(compareTokens(source, comp, SOURCE, COMP)).toEqual([]);
  });

  it('handles empty source', () => {
    const comp = [variable('color/primary', 'Brand', COMP)];
    const issues = compareTokens([], comp, SOURCE, COMP);
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('missing_in_source');
  });

  it('handles empty comparison', () => {
    const source = [variable('color/primary', 'Brand')];
    const issues = compareTokens(source, [], SOURCE, COMP);
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('missing_in_comparison');
  });

  it('handles completely disjoint variable sets', () => {
    const source = [variable('a/x', 'X'), variable('a/y', 'X')];
    const comp = [variable('b/z', 'Y', COMP), variable('b/w', 'Y', COMP)];
    const issues = compareTokens(source, comp, SOURCE, COMP);

    expect(issues).toHaveLength(4);
  });

  it('handles all four style types', () => {
    const source = [
      style('a/fill', 'PAINT_STYLE'),
      style('a/heading', 'TEXT_STYLE'),
      style('a/shadow', 'EFFECT_STYLE'),
      style('a/grid-12', 'GRID_STYLE'),
    ];
    const comp = [
      style('b/fill', 'PAINT_STYLE', COMP),
      style('b/heading', 'TEXT_STYLE', COMP),
      style('b/shadow', 'EFFECT_STYLE', COMP),
      style('b/grid-12', 'GRID_STYLE', COMP),
    ];
    // Default strategy strips first segment, so these match
    expect(compareTokens(source, comp, SOURCE, COMP)).toEqual([]);
  });

  it('same name across different style types are independent', () => {
    const source = [style('a/Primary', 'PAINT_STYLE')];
    const comp = [style('b/Primary', 'TEXT_STYLE', COMP)];
    const issues = compareTokens(source, comp, SOURCE, COMP);
    expect(issues).toHaveLength(2);
  });

  it('mixed variables and styles together', () => {
    const source = [
      variable('brand/primary', 'Tokens'),
      style('brand/Fill', 'PAINT_STYLE'),
      style('brand/H1', 'TEXT_STYLE'),
    ];
    const comp = [
      variable('theme/primary', 'Tokens', COMP),
      variable('theme/accent', 'Tokens', COMP),
      style('theme/Fill', 'PAINT_STYLE', COMP),
    ];
    const issues = compareTokens(source, comp, SOURCE, COMP);

    expect(issues).toHaveLength(2);
    expect(issues.find(i => i.comparisonName === 'theme/accent')).toBeDefined();
    expect(issues.find(i => i.sourceName === 'brand/H1')).toBeDefined();
  });
});
