import { describe, it, expect } from 'vitest';
import { compareTokens } from './engine';
import type { NormalisedToken } from '../../types';

const SOURCE = 'source-file';
const COMP = 'comp-file';

function variable(name: string, collection: string, sourceFile = SOURCE): NormalisedToken {
  return { name, type: 'VARIABLE', collection, resolvedType: 'COLOR', sourceFile };
}

function style(name: string, type: NormalisedToken['type'] = 'PAINT_STYLE', sourceFile = SOURCE): NormalisedToken {
  return { name, type, sourceFile };
}

describe('compareTokens', () => {
  describe('edge cases', () => {
    it('returns no issues when both lists are empty', () => {
      expect(compareTokens([], [], SOURCE, COMP)).toEqual([]);
    });

    it('returns no issues when tokens are identical', () => {
      const source = [variable('color/primary', 'Brand')];
      const comp = [variable('color/primary', 'Brand', COMP)];
      expect(compareTokens(source, comp, SOURCE, COMP)).toEqual([]);
    });

    it('handles empty source (all tokens missing in source)', () => {
      const comp = [variable('color/primary', 'Brand', COMP)];
      const issues = compareTokens([], comp, SOURCE, COMP);
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('missing_in_source');
      expect(issues[0].comparisonName).toBe('color/primary');
    });

    it('handles empty comparison (all tokens missing in comparison)', () => {
      const source = [variable('color/primary', 'Brand')];
      const issues = compareTokens(source, [], SOURCE, COMP);
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('missing_in_comparison');
      expect(issues[0].sourceName).toBe('color/primary');
    });
  });

  describe('variables — matched by collection + name', () => {
    it('detects variable missing in comparison', () => {
      const source = [
        variable('color/primary', 'Brand'),
        variable('color/secondary', 'Brand'),
      ];
      const comp = [variable('color/primary', 'Brand', COMP)];
      const issues = compareTokens(source, comp, SOURCE, COMP);

      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        type: 'missing_in_comparison',
        tokenType: 'VARIABLE',
        sourceName: 'color/secondary',
        collection: 'Brand',
        sourceFile: SOURCE,
        comparisonFile: COMP,
      });
    });

    it('detects variable missing in source', () => {
      const source = [variable('color/primary', 'Brand')];
      const comp = [
        variable('color/primary', 'Brand', COMP),
        variable('color/accent', 'Brand', COMP),
      ];
      const issues = compareTokens(source, comp, SOURCE, COMP);

      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        type: 'missing_in_source',
        tokenType: 'VARIABLE',
        comparisonName: 'color/accent',
        collection: 'Brand',
      });
    });

    it('same name in different collections are treated as different tokens', () => {
      const source = [variable('primary', 'Light')];
      const comp = [variable('primary', 'Dark', COMP)];
      const issues = compareTokens(source, comp, SOURCE, COMP);

      expect(issues).toHaveLength(2);
      expect(issues.find(i => i.type === 'missing_in_comparison')).toBeDefined();
      expect(issues.find(i => i.type === 'missing_in_source')).toBeDefined();
    });

    it('handles multiple collections', () => {
      const source = [
        variable('primary', 'Light'),
        variable('primary', 'Dark'),
        variable('spacing/sm', 'Layout'),
      ];
      const comp = [
        variable('primary', 'Light', COMP),
        variable('primary', 'Dark', COMP),
        variable('spacing/sm', 'Layout', COMP),
      ];
      expect(compareTokens(source, comp, SOURCE, COMP)).toEqual([]);
    });

    it('handles completely disjoint variable sets', () => {
      const source = [variable('a', 'X'), variable('b', 'X')];
      const comp = [variable('c', 'Y', COMP), variable('d', 'Y', COMP)];
      const issues = compareTokens(source, comp, SOURCE, COMP);

      expect(issues).toHaveLength(4);
      expect(issues.filter(i => i.type === 'missing_in_comparison')).toHaveLength(2);
      expect(issues.filter(i => i.type === 'missing_in_source')).toHaveLength(2);
    });
  });

  describe('styles — matched by name', () => {
    it('detects missing paint style in comparison', () => {
      const source = [style('Brand/Primary', 'PAINT_STYLE')];
      const issues = compareTokens(source, [], SOURCE, COMP);

      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        type: 'missing_in_comparison',
        tokenType: 'PAINT_STYLE',
        sourceName: 'Brand/Primary',
      });
    });

    it('detects missing text style in source', () => {
      const comp = [style('Heading/H1', 'TEXT_STYLE', COMP)];
      const issues = compareTokens([], comp, SOURCE, COMP);

      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        type: 'missing_in_source',
        tokenType: 'TEXT_STYLE',
        comparisonName: 'Heading/H1',
      });
    });

    it('handles all four style types', () => {
      const source = [
        style('fill', 'PAINT_STYLE'),
        style('heading', 'TEXT_STYLE'),
        style('shadow', 'EFFECT_STYLE'),
        style('grid-12', 'GRID_STYLE'),
      ];
      const comp = [
        style('fill', 'PAINT_STYLE', COMP),
        style('heading', 'TEXT_STYLE', COMP),
        style('shadow', 'EFFECT_STYLE', COMP),
        style('grid-12', 'GRID_STYLE', COMP),
      ];
      expect(compareTokens(source, comp, SOURCE, COMP)).toEqual([]);
    });

    it('same name across different style types are independent', () => {
      const source = [style('Primary', 'PAINT_STYLE')];
      const comp = [style('Primary', 'TEXT_STYLE', COMP)];
      const issues = compareTokens(source, comp, SOURCE, COMP);

      // Paint style missing in comparison, text style missing in source
      expect(issues).toHaveLength(2);
    });
  });

  describe('mixed tokens', () => {
    it('handles variables and styles together', () => {
      const source = [
        variable('color/primary', 'Brand'),
        style('Brand/Fill', 'PAINT_STYLE'),
        style('Heading/H1', 'TEXT_STYLE'),
      ];
      const comp = [
        variable('color/primary', 'Brand', COMP),
        variable('color/accent', 'Brand', COMP),
        style('Brand/Fill', 'PAINT_STYLE', COMP),
      ];
      const issues = compareTokens(source, comp, SOURCE, COMP);

      expect(issues).toHaveLength(2);
      expect(issues.find(i => i.comparisonName === 'color/accent')).toBeDefined();
      expect(issues.find(i => i.sourceName === 'Heading/H1')).toBeDefined();
    });

    it('partial overlap across all token types', () => {
      const source = [
        variable('a', 'C1'),
        variable('b', 'C1'),
        style('fill-1', 'PAINT_STYLE'),
        style('text-1', 'TEXT_STYLE'),
        style('shadow-1', 'EFFECT_STYLE'),
        style('grid-1', 'GRID_STYLE'),
      ];
      const comp = [
        variable('a', 'C1', COMP),
        variable('c', 'C1', COMP),
        style('fill-1', 'PAINT_STYLE', COMP),
        style('text-2', 'TEXT_STYLE', COMP),
        style('shadow-1', 'EFFECT_STYLE', COMP),
        style('grid-2', 'GRID_STYLE', COMP),
      ];
      const issues = compareTokens(source, comp, SOURCE, COMP);

      // Missing in comparison: variable b, text-1, grid-1
      // Missing in source: variable c, text-2, grid-2
      expect(issues).toHaveLength(6);
    });
  });
});
