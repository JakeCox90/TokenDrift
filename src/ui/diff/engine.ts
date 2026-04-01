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
 * After finding unmatched tokens, attempts to pair near-matches
 * and explain what's different.
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

  // Collect unmatched tokens from each side
  const unmatchedSource: NormalisedToken[] = [];
  const unmatchedComparison: NormalisedToken[] = [];

  for (const [key, token] of sourceKeys) {
    if (!comparisonKeys.has(key)) {
      unmatchedSource.push(token);
    }
  }

  for (const [key, token] of comparisonKeys) {
    if (!sourceKeys.has(key)) {
      unmatchedComparison.push(token);
    }
  }

  // Try to pair near-matches before reporting as simply missing
  const pairedSource = new Set<number>();
  const pairedComparison = new Set<number>();

  for (let si = 0; si < unmatchedSource.length; si++) {
    if (pairedSource.has(si)) continue;
    const src = unmatchedSource[si];
    const srcKey = makeKey(src);

    let bestMatch: { ci: number; hint: string } | null = null;

    for (let ci = 0; ci < unmatchedComparison.length; ci++) {
      if (pairedComparison.has(ci)) continue;
      const comp = unmatchedComparison[ci];
      const compKey = makeKey(comp);

      const hint = detectNamingIssue(srcKey, compKey);
      if (hint) {
        bestMatch = { ci, hint };
        break; // take first match
      }
    }

    if (bestMatch) {
      pairedSource.add(si);
      pairedComparison.add(bestMatch.ci);
      const comp = unmatchedComparison[bestMatch.ci];
      issues.push({
        type: 'naming_mismatch',
        tokenType: src.type,
        sourceName: src.name,
        comparisonName: comp.name,
        sourceFile,
        comparisonFile,
        collection: src.collection ?? comp.collection,
        hint: bestMatch.hint,
      });
    }
  }

  // Remaining unmatched → missing issues
  for (let si = 0; si < unmatchedSource.length; si++) {
    if (pairedSource.has(si)) continue;
    const token = unmatchedSource[si];
    issues.push({
      type: 'missing_in_comparison',
      tokenType: token.type,
      sourceName: token.name,
      sourceFile,
      comparisonFile,
      collection: token.collection,
    });
  }

  for (let ci = 0; ci < unmatchedComparison.length; ci++) {
    if (pairedComparison.has(ci)) continue;
    const token = unmatchedComparison[ci];
    issues.push({
      type: 'missing_in_source',
      tokenType: token.type,
      comparisonName: token.name,
      sourceFile,
      comparisonFile,
      collection: token.collection,
    });
  }

  return issues;
}

// ─── Near-Match Detection Rules ──────────────────────────────────────────────

/**
 * Naming issue detection rules. Each rule normalises both names in a specific
 * way. If the normalised forms match but the originals don't, we've found the
 * issue. Rules are checked in order; the first match wins.
 */
const NAMING_RULES: { normalise: (s: string) => string; hint: string }[] = [
  {
    // "Border Width 00" vs "Border Width 0"
    hint: 'These look like the same token but the numbers are written differently',
    normalise: (s) => s.replace(/\b0*(\d+)\b/g, '$1'),
  },
  {
    // "border/width" vs "Border/Width"
    hint: 'Same name but different capitalisation',
    normalise: (s) => s.toLowerCase(),
  },
  {
    // "Border/Width" vs "Border.Width" vs "Border-Width"
    hint: 'Same name but using different separators (/ . - _)',
    normalise: (s) => s.replace(/[/.\-_]/g, '/'),
  },
  {
    // "BorderWidth" vs "Border Width" vs "border-width"
    hint: 'Same token but written in a different format',
    normalise: (s) => s.replace(/[/.\-_\s]/g, '').toLowerCase(),
  },
  {
    // "colour" vs "color", "grey" vs "gray"
    hint: 'Same token but using a different spelling (e.g. colour vs color)',
    normalise: (s) => s
      .replace(/colour/gi, 'color')
      .replace(/grey/gi, 'gray')
      .toLowerCase(),
  },
  {
    // "Border Width" vs "Border  Width"
    hint: 'Same name but with extra whitespace',
    normalise: (s) => s.replace(/\s+/g, ' ').trim(),
  },
];

/**
 * Detect if two unmatched keys are actually near-matches with a naming issue.
 * Returns a human-readable hint string, or null if they're genuinely different tokens.
 */
function detectNamingIssue(a: string, b: string): string | null {
  if (a === b) return null; // already identical, shouldn't happen

  for (const rule of NAMING_RULES) {
    if (rule.normalise(a) === rule.normalise(b)) {
      return rule.hint;
    }
  }

  // Check if tokens share the same trailing path segments (relocated to a different group)
  // e.g. "Yellow/100" vs "Unused/Yellow/100", or "core/Yellow/100" vs "archive/old/Yellow/100"
  const sep = a.includes('/') ? '/' : '.';
  const aParts = a.split(sep);
  const bParts = b.split(sep);

  // Compare from the end — find how many trailing segments match
  let matching = 0;
  for (let i = 1; i <= Math.min(aParts.length, bParts.length); i++) {
    if (aParts[aParts.length - i] === bParts[bParts.length - i]) {
      matching++;
    } else {
      break;
    }
  }

  // Need at least 2 matching trailing segments to avoid false positives on generic names like "10"
  if (matching >= 2 && (aParts.length > matching || bParts.length > matching)) {
    const aPrefix = aParts.slice(0, aParts.length - matching).join(sep);
    const bPrefix = bParts.slice(0, bParts.length - matching).join(sep);
    if (aPrefix !== bPrefix) {
      const from = aPrefix || '(root)';
      const to = bPrefix || '(root)';
      return `Same token but in different groups: ${from} → ${to}`;
    }
  }

  return null;
}

// ─── Match Key ───────────────────────────────────────────────────────────────

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
  let name: string;
  if (strategy === 'ignore_first_segment') {
    name = stripFirstSegment(token.name);
  } else if (strategy === 'ignore_first_two_segments') {
    name = stripFirstSegment(stripFirstSegment(token.name));
  } else {
    name = token.name;
  }

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
