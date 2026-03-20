import type { NormalisedToken, DriftIssue, DriftIssueType, TokenType } from '../../types';

/**
 * Compare source tokens against comparison tokens and return drift issues.
 * Pure function — no side effects, no Figma dependencies.
 */
export function compareTokens(
  source: NormalisedToken[],
  comparison: NormalisedToken[],
  sourceFile: string,
  comparisonFile: string,
): DriftIssue[] {
  const issues: DriftIssue[] = [];

  const sourceVariables = source.filter(t => t.type === 'VARIABLE');
  const comparisonVariables = comparison.filter(t => t.type === 'VARIABLE');
  issues.push(
    ...diffVariables(sourceVariables, comparisonVariables, sourceFile, comparisonFile),
  );

  const styleTypes: TokenType[] = ['PAINT_STYLE', 'TEXT_STYLE', 'EFFECT_STYLE', 'GRID_STYLE'];
  for (const styleType of styleTypes) {
    const sourceStyles = source.filter(t => t.type === styleType);
    const comparisonStyles = comparison.filter(t => t.type === styleType);
    issues.push(
      ...diffStyles(sourceStyles, comparisonStyles, styleType, sourceFile, comparisonFile),
    );
  }

  return issues;
}

/** Match variables by collection + name */
function diffVariables(
  source: NormalisedToken[],
  comparison: NormalisedToken[],
  sourceFile: string,
  comparisonFile: string,
): DriftIssue[] {
  const issues: DriftIssue[] = [];

  const sourceKeys = new Map<string, NormalisedToken>();
  for (const t of source) {
    sourceKeys.set(variableKey(t), t);
  }

  const comparisonKeys = new Map<string, NormalisedToken>();
  for (const t of comparison) {
    comparisonKeys.set(variableKey(t), t);
  }

  // Missing in comparison
  for (const [key, token] of sourceKeys) {
    if (!comparisonKeys.has(key)) {
      issues.push({
        type: 'missing_in_comparison',
        tokenType: 'VARIABLE',
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
        tokenType: 'VARIABLE',
        comparisonName: token.name,
        sourceFile,
        comparisonFile,
        collection: token.collection,
      });
    }
  }

  return issues;
}

/** Match styles by name */
function diffStyles(
  source: NormalisedToken[],
  comparison: NormalisedToken[],
  tokenType: TokenType,
  sourceFile: string,
  comparisonFile: string,
): DriftIssue[] {
  const issues: DriftIssue[] = [];

  const sourceNames = new Map<string, NormalisedToken>();
  for (const t of source) {
    sourceNames.set(t.name, t);
  }

  const comparisonNames = new Map<string, NormalisedToken>();
  for (const t of comparison) {
    comparisonNames.set(t.name, t);
  }

  for (const [name] of sourceNames) {
    if (!comparisonNames.has(name)) {
      issues.push({
        type: 'missing_in_comparison',
        tokenType,
        sourceName: name,
        sourceFile,
        comparisonFile,
      });
    }
  }

  for (const [name] of comparisonNames) {
    if (!sourceNames.has(name)) {
      issues.push({
        type: 'missing_in_source',
        tokenType,
        comparisonName: name,
        sourceFile,
        comparisonFile,
      });
    }
  }

  return issues;
}

function variableKey(token: NormalisedToken): string {
  return `${token.collection ?? ''}::${token.name}`;
}
