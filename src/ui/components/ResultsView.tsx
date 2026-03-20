import { useState } from 'preact/hooks';
import type { DriftIssue, DriftIssueType, TokenType } from '../../types';
import * as s from '../styles';

interface ResultsViewProps {
  issues: DriftIssue[];
  onBack: () => void;
}

const issueTypeLabels: Record<DriftIssueType, string> = {
  missing_in_source: 'Missing in source',
  missing_in_comparison: 'Missing in comparison',
};

const tokenTypeLabels: Record<TokenType, string> = {
  VARIABLE: 'Variable',
  PAINT_STYLE: 'Paint style',
  TEXT_STYLE: 'Text style',
  EFFECT_STYLE: 'Effect style',
  GRID_STYLE: 'Grid style',
};

const tokenTypeIcons: Record<TokenType, string> = {
  VARIABLE: 'V',
  PAINT_STYLE: 'P',
  TEXT_STYLE: 'T',
  EFFECT_STYLE: 'E',
  GRID_STYLE: 'G',
};

export function ResultsView({ issues, onBack }: ResultsViewProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<DriftIssueType | 'all'>('all');

  // Filter
  const filtered = issues.filter(issue => {
    if (filterType !== 'all' && issue.type !== filterType) return false;
    if (search) {
      const name = (issue.sourceName ?? issue.comparisonName ?? '').toLowerCase();
      if (!name.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  // Group by comparison file
  const grouped = new Map<string, DriftIssue[]>();
  for (const issue of filtered) {
    const key = issue.comparisonFile;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(issue);
  }

  // Summary counts
  const missingInSource = issues.filter(i => i.type === 'missing_in_source').length;
  const missingInComparison = issues.filter(i => i.type === 'missing_in_comparison').length;

  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0',
            color: s.colors.textSecondary,
          }}
          title="Back to setup"
        >
          ←
        </button>
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
          Results
        </h2>
      </div>

      {/* No drift */}
      {issues.length === 0 && (
        <div style={{
          padding: '24px 16px',
          textAlign: 'center',
          background: s.colors.successBg,
          borderRadius: '8px',
        }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: s.colors.success, margin: 0 }}>
            No drift detected
          </p>
          <p style={{ fontSize: '11px', color: s.colors.textMuted, marginTop: '4px' }}>
            All tokens match across the compared files.
          </p>
        </div>
      )}

      {issues.length > 0 && (
        <>
          {/* Summary bar */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '12px',
            flexWrap: 'wrap',
          }}>
            <span style={s.badge(s.colors.bgSecondary, s.colors.text)}>
              {issues.length} total
            </span>
            {missingInComparison > 0 && (
              <span style={s.badge(s.colors.errorBg, s.colors.error)}>
                {missingInComparison} missing in comparison
              </span>
            )}
            {missingInSource > 0 && (
              <span style={s.badge(s.colors.warningBg, '#996B00')}>
                {missingInSource} missing in source
              </span>
            )}
          </div>

          {/* Search and filter */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
            <input
              style={{ ...s.input, flex: 1 }}
              placeholder="Search by token name..."
              value={search}
              onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
            />
            <select
              style={{ ...s.input, width: 'auto', flex: 'none' }}
              value={filterType}
              onChange={(e) =>
                setFilterType((e.target as HTMLSelectElement).value as DriftIssueType | 'all')
              }
            >
              <option value="all">All types</option>
              <option value="missing_in_comparison">Missing in comparison</option>
              <option value="missing_in_source">Missing in source</option>
            </select>
          </div>

          {/* Filtered count */}
          {filtered.length !== issues.length && (
            <p style={{ fontSize: '10px', color: s.colors.textMuted, marginBottom: '8px' }}>
              Showing {filtered.length} of {issues.length} issues
            </p>
          )}

          {/* Grouped results */}
          {Array.from(grouped.entries()).map(([fileKey, fileIssues]) => (
            <div key={fileKey} style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: s.colors.textSecondary,
                padding: '4px 0',
                borderBottom: `1px solid ${s.colors.border}`,
                marginBottom: '4px',
                fontFamily: 'monospace',
              }}>
                {fileKey}
              </div>

              {fileIssues.map((issue, i) => (
                <IssueRow key={`${fileKey}-${i}`} issue={issue} />
              ))}
            </div>
          ))}

          {filtered.length === 0 && (
            <p style={{ fontSize: '11px', color: s.colors.textMuted, fontStyle: 'italic', textAlign: 'center', marginTop: '16px' }}>
              No issues match the current filter.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function IssueRow({ issue }: { issue: DriftIssue }) {
  const name = issue.sourceName ?? issue.comparisonName ?? 'Unknown';
  const isMissingInComp = issue.type === 'missing_in_comparison';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 8px',
      borderRadius: '4px',
      marginBottom: '2px',
      background: isMissingInComp ? s.colors.errorBg : s.colors.warningBg,
      fontSize: '11px',
    }}>
      {/* Token type icon */}
      <span style={{
        width: '18px',
        height: '18px',
        borderRadius: '4px',
        background: s.colors.bgSecondary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '9px',
        fontWeight: 700,
        color: s.colors.textSecondary,
        flexShrink: 0,
      }}>
        {tokenTypeIcons[issue.tokenType]}
      </span>

      {/* Token name and collection */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </div>
        {issue.collection && (
          <div style={{ fontSize: '9px', color: s.colors.textMuted }}>
            {issue.collection}
          </div>
        )}
      </div>

      {/* Issue type */}
      <span style={{
        fontSize: '9px',
        color: isMissingInComp ? s.colors.error : '#996B00',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        {issueTypeLabels[issue.type]}
      </span>
    </div>
  );
}
