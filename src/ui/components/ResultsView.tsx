import { useState } from 'preact/hooks';
import type { DriftIssue, DriftIssueType, TokenType } from '../../types';
import * as s from '../styles';

interface ResultsViewProps {
  issues: DriftIssue[];
  onBack: () => void;
  onRefresh: () => void;
  loading: boolean;
}

// ─── Tree Structure ──────────────────────────────────────────────────────────

interface TreeNode {
  segment: string;
  children: Map<string, TreeNode>;
  issues: DriftIssue[];
}

function createNode(segment: string): TreeNode {
  return { segment, children: new Map(), issues: [] };
}

function buildTree(issues: DriftIssue[]): TreeNode {
  const root = createNode('root');

  for (const issue of issues) {
    const name = issue.sourceName ?? issue.comparisonName ?? 'Unknown';
    const groupName = issue.collection
      ? issue.collection
      : styleTypeGroupLabel(issue.tokenType);

    if (!root.children.has(groupName)) {
      root.children.set(groupName, createNode(groupName));
    }
    const groupNode = root.children.get(groupName)!;

    const separator = name.includes('/') ? '/' : '.';
    const segments = name.split(separator);

    let current = groupNode;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (!current.children.has(seg)) {
        current.children.set(seg, createNode(seg));
      }
      current = current.children.get(seg)!;
    }

    current.issues.push(issue);
  }

  return root;
}

function styleTypeGroupLabel(tokenType: TokenType): string {
  switch (tokenType) {
    case 'PAINT_STYLE': return 'Paint Styles';
    case 'TEXT_STYLE': return 'Text Styles';
    case 'EFFECT_STYLE': return 'Effect Styles';
    case 'GRID_STYLE': return 'Grid Styles';
    case 'VARIABLE': return 'Variables';
  }
}

function countIssues(node: TreeNode): number {
  let count = node.issues.length;
  for (const child of node.children.values()) {
    count += countIssues(child);
  }
  return count;
}

// ─── Components ──────────────────────────────────────────────────────────────

const issueTypeLabels: Record<DriftIssueType, string> = {
  missing_in_source: 'Missing in this file',
  missing_in_comparison: 'Missing in comparison',
};

const tokenTypeIcons: Record<TokenType, string> = {
  VARIABLE: 'V',
  PAINT_STYLE: 'P',
  TEXT_STYLE: 'T',
  EFFECT_STYLE: 'E',
  GRID_STYLE: 'G',
};

const tokenTypeColors: Record<TokenType, { text: string; bg: string; border: string }> = {
  VARIABLE: {
    text: 'var(--figma-color-text-brand)',
    bg: 'var(--figma-color-bg-brand-tertiary)',
    border: 'var(--figma-color-border-brand)',
  },
  PAINT_STYLE: {
    text: 'var(--figma-color-text-danger)',
    bg: 'var(--figma-color-bg-danger-tertiary)',
    border: 'var(--figma-color-border-danger)',
  },
  TEXT_STYLE: {
    text: 'var(--figma-color-text-success)',
    bg: 'var(--figma-color-bg-success-tertiary)',
    border: 'var(--figma-color-border-success)',
  },
  EFFECT_STYLE: {
    text: 'var(--figma-color-text-warning)',
    bg: 'var(--figma-color-bg-warning-tertiary)',
    border: 'var(--figma-color-border-warning)',
  },
  GRID_STYLE: {
    text: 'var(--figma-color-text-secondary)',
    bg: 'var(--figma-color-bg-tertiary)',
    border: 'var(--figma-color-border)',
  },
};

export function ResultsView({ issues, onBack, onRefresh, loading }: ResultsViewProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<DriftIssueType | 'all'>('all');

  const filtered = issues.filter(issue => {
    if (filterType !== 'all' && issue.type !== filterType) return false;
    if (search) {
      const name = (issue.sourceName ?? issue.comparisonName ?? '').toLowerCase();
      if (!name.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const missingInSource = issues.filter(i => i.type === 'missing_in_source').length;
  const missingInComparison = issues.filter(i => i.type === 'missing_in_comparison').length;
  const tree = buildTree(filtered);

  return (
    <div style={{ padding: '20px', animation: 'fadeIn 0.2s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={onBack}
          style={{
            ...s.buttonGhost,
            padding: '4px 8px',
            fontSize: '14px',
            borderRadius: '6px',
          }}
          title="Back to setup"
        >
          ←
        </button>
        <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: s.colors.text, letterSpacing: '-0.01em' }}>
          Results
        </h2>
        <button
          onClick={loading ? undefined : onRefresh}
          disabled={loading}
          style={{
            marginLeft: 'auto',
            padding: '5px 12px',
            background: loading ? s.colors.bgSecondary : s.colors.brand,
            color: loading ? s.colors.textMuted : s.colors.textOnBrand,
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '11px',
            fontWeight: 600,
            boxShadow: loading ? 'none' : 'var(--figma-shadow-floating, 0 1px 3px rgba(0,0,0,0.12))',
            transition: 'all 0.15s ease',
          }}
          title="Re-run comparison"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '56px 16px',
          gap: '16px',
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            border: `3px solid ${s.colors.borderLight}`,
            borderTopColor: s.colors.brand,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ fontSize: '12px', color: s.colors.textMuted, fontWeight: 500 }}>
            Comparing tokens...
          </p>
        </div>
      )}

      {/* No drift */}
      {!loading && issues.length === 0 && (
        <div style={{
          padding: '32px 16px',
          textAlign: 'center',
          background: s.colors.successBg,
          border: `1px solid ${s.colors.successBorder}`,
          borderRadius: '12px',
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>&#10003;</div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: s.colors.success, margin: 0 }}>
            No drift detected
          </p>
          <p style={{ fontSize: '11px', color: s.colors.textMuted, marginTop: '6px' }}>
            All tokens match across compared files.
          </p>
        </div>
      )}

      {!loading && issues.length > 0 && (
        <>
          {/* Summary */}
          <div style={{
            display: 'flex',
            gap: '6px',
            marginBottom: '14px',
            flexWrap: 'wrap',
          }}>
            <span style={s.badge(s.colors.bgTertiary, s.colors.text)}>
              {issues.length} total
            </span>
            {missingInComparison > 0 && (
              <span style={s.badge(s.colors.errorBg, s.colors.error, s.colors.errorBorder)}>
                {missingInComparison} missing in comparison
              </span>
            )}
            {missingInSource > 0 && (
              <span style={s.badge(s.colors.warningBg, s.colors.warning, s.colors.warningBorder)}>
                {missingInSource} missing in this file
              </span>
            )}
          </div>

          {/* Search and filter */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <input
              style={{ ...s.input, flex: 1 }}
              placeholder="Search tokens..."
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
              <option value="missing_in_source">Missing in this file</option>
            </select>
          </div>

          {filtered.length !== issues.length && (
            <p style={{ fontSize: '10px', color: s.colors.textMuted, marginBottom: '10px' }}>
              Showing {filtered.length} of {issues.length}
            </p>
          )}

          {/* Tree */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {Array.from(tree.children.entries()).map(([name, node]) => (
              <CollectionSection key={name} node={node} depth={0} />
            ))}
          </div>

          {filtered.length === 0 && (
            <p style={{
              fontSize: '11px',
              color: s.colors.textMuted,
              textAlign: 'center',
              marginTop: '24px',
              padding: '16px',
            }}>
              No issues match the current filter.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function CollectionSection({ node, depth }: { node: TreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const total = countIssues(node);
  const isTopLevel = depth === 0;

  return (
    <div style={{
      marginBottom: isTopLevel ? '2px' : '0',
      ...(isTopLevel ? {
        background: s.colors.bgSecondary,
        borderRadius: '10px',
        border: `1px solid ${s.colors.borderLight}`,
        overflow: 'hidden',
      } : {}),
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: isTopLevel ? '10px 12px' : '5px 10px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: isTopLevel ? '12px' : '11px',
          fontWeight: isTopLevel ? 600 : 500,
          color: s.colors.text,
          textAlign: 'left',
          marginLeft: isTopLevel ? 0 : depth * 14,
          transition: 'background 0.1s ease',
        }}
      >
        <span style={{
          fontSize: '8px',
          color: s.colors.textMuted,
          width: '12px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.15s ease',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
        }}>
          ▶
        </span>
        <span style={{ flex: 1 }}>{node.segment}</span>
        <span style={{
          fontSize: '10px',
          color: s.colors.textMuted,
          fontWeight: 500,
          background: isTopLevel ? s.colors.bgTertiary : 'transparent',
          padding: isTopLevel ? '1px 7px' : '0',
          borderRadius: '10px',
        }}>
          {total}
        </span>
      </button>

      {expanded && (
        <div style={{ paddingBottom: isTopLevel ? '4px' : '0' }}>
          {Array.from(node.children.entries()).map(([name, child]) => {
            if (child.children.size === 0) {
              return <LeafSection key={name} node={child} depth={depth + 1} />;
            }
            return <CollectionSection key={name} node={child} depth={depth + 1} />;
          })}

          {node.issues.map((issue, i) => (
            <IssueRow
              key={`issue-${i}`}
              issue={issue}
              indent={(depth + 1) * 14 + 20}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LeafSection({ node, depth }: { node: TreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(false);
  const total = node.issues.length;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: '5px 10px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 500,
          color: s.colors.text,
          textAlign: 'left',
          marginLeft: depth * 14,
          transition: 'background 0.1s ease',
        }}
      >
        <span style={{
          fontSize: '8px',
          color: s.colors.textMuted,
          width: '12px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.15s ease',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
        }}>
          ▶
        </span>
        <span style={{ flex: 1 }}>{node.segment}</span>
        <span style={{ fontSize: '10px', color: s.colors.textMuted, fontWeight: 500 }}>
          {total}
        </span>
      </button>

      {expanded && node.issues.map((issue, i) => (
        <IssueRow
          key={`leaf-${i}`}
          issue={issue}
          indent={(depth + 1) * 14 + 20}
        />
      ))}
    </div>
  );
}

function IssueRow({ issue, indent }: { issue: DriftIssue; indent: number }) {
  const fullName = issue.sourceName ?? issue.comparisonName ?? 'Unknown';
  const separator = fullName.includes('/') ? '/' : '.';
  const segments = fullName.split(separator);
  const leafName = segments[segments.length - 1];

  const isMissingInComp = issue.type === 'missing_in_comparison';
  const accentColor = isMissingInComp ? s.colors.error : s.colors.warning;
  const bgColor = isMissingInComp ? s.colors.errorBg : s.colors.warningBg;
  const borderColor = isMissingInComp ? s.colors.errorBorder : s.colors.warningBorder;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '5px 10px',
      borderRadius: '6px',
      marginBottom: '2px',
      marginLeft: indent,
      marginRight: '8px',
      background: bgColor,
      border: `1px solid ${borderColor}`,
      fontSize: '11px',
      transition: 'all 0.1s ease',
    }}>
      {/* Token type icon */}
      <span style={{
        width: '18px',
        height: '18px',
        borderRadius: '5px',
        background: tokenTypeColors[issue.tokenType].bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '8px',
        fontWeight: 700,
        color: tokenTypeColors[issue.tokenType].text,
        flexShrink: 0,
        border: `1px solid ${tokenTypeColors[issue.tokenType].border}`,
      }}>
        {tokenTypeIcons[issue.tokenType]}
      </span>

      {/* Leaf name */}
      <span style={{
        flex: 1,
        fontWeight: 500,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        color: s.colors.text,
      }}>
        {leafName}
      </span>

      {/* Issue type pill */}
      <span style={{
        fontSize: '9px',
        fontWeight: 600,
        color: accentColor,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        padding: '1px 6px',
        borderRadius: '4px',
        background: 'rgba(255,255,255,0.6)',
      }}>
        {issueTypeLabels[issue.type]}
      </span>
    </div>
  );
}
