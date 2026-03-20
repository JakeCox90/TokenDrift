import type { NormalisedToken, DriftIssue, TokenType, MatchStrategy } from '../../types';

export interface CompareOptions {
  /** How to match token names. Default: 'ignore_first_segment' */
  matchStrategy?: MatchStrategy;
}

/**
 * Compare source tokens against comparison tokens and return drift issues.
 * Pure function — no side effects, no Figma dependencies.
 */
export function compareTokens(
  source: NormalisedToken[],
  comparison: NormalisedToken[],
  sourceFile: string,
  comparisonFile: string,
  options: CompareOptions = {},
): DriftIssue[] {
  const strategy = options.matchStrategy ?? 'ignore_first_segment';
  const issues: DriftIssue[] = [];

  const sourceVariables = source.filter(t => t.type === 'VARIABLE');
  const comparisonVariables = comparison.filter(t => t.type === 'VARIABLE');
  issues.push(
    ...diffTokens(sourceVariables, comparisonVariables, sourceFile, comparisonFile, strategy, true),
  );

  const styleTypes: TokenType[] = ['PAINT_STYLE', 'TEXT_STYLE', 'EFFECT_STYLE', 'GRID_STYLE'];
  for (const styleType of styleTypes) {
    const sourceStyles = source.filter(t => t.type === styleType);
    const comparisonStyles = comparison.filter(t => t.type === styleType);
    issues.push(
      ...diffTokens(sourceStyles, comparisonStyles, sourceFile, comparisonFile, strategy, false),
    );
  }

  return issues;
}

/**
 * Diff two sets of tokens using the given match strategy.
 * When isVariable=true, the collection is included in the match key (for full_name strategy).
 */
function diffTokens(
  source: NormalisedToken[],
  comparison: NormalisedToken[],
  sourceFile: string,
  comparisonFile: string,
  strategy: MatchStrategy,
  isVariable: boolean,
): DriftIssue[] {
  const issues: DriftIssue[] = [];

  const makeKey = (t: NormalisedToken) => matchKey(t, strategy, isVariable);

  const sourceKeys = new Map<string, NormalisedToken>();
  for (const t of source) {
    sourceKeys.set(makeKey(t), t);
  }

  const comparisonKeys = new Map<string, NormalisedToken>();
  for (const t of comparison) {
    comparisonKeys.set(makeKey(t), t);
  }

  // Missing in comparison
  for (const [key, token] of sourceKeys) {
    if (!comparisonKeys.has(key)) {
      issues.push({
        type: 'missing_in_comparison',
        tokenType: token.type,
        sourceName: token.name,
        sourceFile,
        comparisonFile,
        collection: token.collection,
      });
    }
  }

  // Missing in source
  for (const [key, token] of comparisonKeys) {
    if (!sourceKeys.has(key)) {
      issues.push({
        type: 'missing_in_source',
        tokenType: token.type,
        comparisonName: token.name,
        sourceFile,
        comparisonFile,
        collection: token.collection,
      });
    }
  }

  return issues;
}

/**
 * Produce the match key for a token based on the strategy.
 *
 * - full_name: match on the exact name (and collection for variables)
 *   e.g. "colour/primary/resting" !== "thesun/primary/resting"
 *
 * - ignore_first_segment: strip the first path segment before matching
 *   e.g. "colour/primary/resting" → "primary/resting"
 *        "thesun/primary/resting" → "primary/resting"  ← these match
 */
function matchKey(
  token: NormalisedToken,
  strategy: MatchStrategy,
  includeCollection: boolean,
): string {
  const name = strategy === 'ignore_first_segment'
    ? stripFirstSegment(token.name)
    : token.name;

  if (includeCollection && strategy === 'full_name') {
    return `${token.collection ?? ''}::${name}`;
  }

  return name;
}

/**
 * Strip the first segment from a path separated by `/` or `.`
 * "colour/primary/resting" → "primary/resting"
 * "thesun.primary.resting" → "primary.resting"
 * "single" → "single" (no separator, return as-is)
 */
export function stripFirstSegment(name: string): string {
  // Try `/` first (Figma variable convention), then `.`
  const slashIndex = name.indexOf('/');
  if (slashIndex !== -1 && slashIndex < name.length - 1) {
    return name.slice(slashIndex + 1);
  }

  const dotIndex = name.indexOf('.');
  if (dotIndex !== -1 && dotIndex < name.length - 1) {
    return name.slice(dotIndex + 1);
  }

  return name;
}
