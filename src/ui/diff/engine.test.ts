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

  it('does NOT match tokens with different first segments', () => {
    const source = [variable('colour/primary/resting', 'Tokens')];
    const comp = [variable('thesun/primary/resting', 'Tokens', COMP)];
    const issues = compareTokens(source, comp, SOURCE, COMP, opts);

    expect(issues).toHaveLength(2);
    expect(issues.find(i => i.type === 'missing_in_comparison')).toBeDefined();
    expect(issues.find(i => i.type === 'missing_in_source')).toBeDefined();
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
