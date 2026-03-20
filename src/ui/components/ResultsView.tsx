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

/**
 * Build a tree from issues:
 *   Collection (or style type) → path segment → ... → leaf issue
 */
function buildTree(issues: DriftIssue[]): TreeNode {
  const root = createNode('root');

  for (const issue of issues) {
    const name = issue.sourceName ?? issue.comparisonName ?? 'Unknown';

    // Top-level group: collection for variables, style type label for styles
    const groupName = issue.collection
      ? issue.collection
      : styleTypeGroupLabel(issue.tokenType);

    // Get or create the group node
    if (!root.children.has(groupName)) {
      root.children.set(groupName, createNode(groupName));
    }
    const groupNode = root.children.get(groupName)!;

    // Split name into path segments using / or .
    const separator = name.includes('/') ? '/' : '.';
    const segments = name.split(separator);

    // Walk down the tree, creating intermediate nodes
    let current = groupNode;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (!current.children.has(seg)) {
        current.children.set(seg, createNode(seg));
      }
      current = current.children.get(seg)!;
    }

    // Attach the issue at the leaf
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

/** Count all issues under a node (recursively) */
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

export function ResultsView({ issues, onBack, onRefresh, loading }: ResultsViewProps) {
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

  // Summary counts
  const missingInSource = issues.filter(i => i.type === 'missing_in_source').length;
  const missingInComparison = issues.filter(i => i.type === 'missing_in_comparison').length;

  // Build tree from filtered issues
  const tree = buildTree(filtered);

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
        <button
          onClick={loading ? undefined : onRefresh}
          disabled={loading}
          style={{
            marginLeft: 'auto',
            padding: '4px 10px',
            background: loading ? s.colors.bgSecondary : s.colors.brand,
            color: loading ? s.colors.textMuted : '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '11px',
            fontWeight: 500,
          }}
          title="Re-run comparison"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 16px',
          gap: '12px',
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: `3px solid ${s.colors.border}`,
            borderTopColor: s.colors.brand,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ fontSize: '12px', color: s.colors.textMuted }}>
            Comparing tokens...
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* No drift */}
      {!loading && issues.length === 0 && (
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

      {!loading && issues.length > 0 && (
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
                {missingInSource} missing in this file
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
              <option value="missing_in_source">Missing in this file</option>
            </select>
          </div>

          {/* Filtered count */}
          {filtered.length !== issues.length && (
            <p style={{ fontSize: '10px', color: s.colors.textMuted, marginBottom: '8px' }}>
              Showing {filtered.length} of {issues.length} issues
            </p>
          )}

          {/* Tree */}
          {Array.from(tree.children.entries()).map(([name, node]) => (
            <CollectionSection key={name} node={node} depth={0} />
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

/** Expandable section for a tree node (collection or path segment) */
function CollectionSection({ node, depth }: { node: TreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const total = countIssues(node);
  const isTopLevel = depth === 0;

  return (
    <div style={{ marginBottom: isTopLevel ? '8px' : '0' }}>
      {/* Section header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: '100%',
          padding: isTopLevel ? '8px 8px' : '4px 8px',
          background: isTopLevel ? s.colors.bgSecondary : 'transparent',
          border: 'none',
          borderRadius: isTopLevel ? '6px' : '0',
          cursor: 'pointer',
          fontSize: isTopLevel ? '12px' : '11px',
          fontWeight: isTopLevel ? 600 : 500,
          color: s.colors.text,
          textAlign: 'left',
          marginLeft: isTopLevel ? 0 : depth * 12,
        }}
      >
        <span style={{
          fontSize: '9px',
          color: s.colors.textMuted,
          width: '10px',
          display: 'inline-block',
          transition: 'transform 0.15s ease',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
        }}>
          ▶
        </span>
        <span>{node.segment}</span>
        <span style={{
          fontSize: '10px',
          color: s.colors.textMuted,
          fontWeight: 400,
          marginLeft: 'auto',
        }}>
          {total}
        </span>
      </button>

      {/* Children */}
      {expanded && (
        <div>
          {/* Sub-sections for child nodes */}
          {Array.from(node.children.entries()).map(([name, child]) => {
            const childCount = countIssues(child);
            // If this child only has direct issues and no sub-children, render inline
            if (child.children.size === 0) {
              return (
                <LeafSection key={name} node={child} depth={depth + 1} />
              );
            }
            return (
              <CollectionSection key={name} node={child} depth={depth + 1} />
            );
          })}

          {/* Direct issues at this level */}
          {node.issues.map((issue, i) => (
            <IssueRow
              key={`issue-${i}`}
              issue={issue}
              indent={(depth + 1) * 12 + 16}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** A leaf section — expandable segment that contains only issues (no deeper nesting) */
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
          gap: '6px',
          width: '100%',
          padding: '4px 8px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 500,
          color: s.colors.text,
          textAlign: 'left',
          marginLeft: depth * 12,
        }}
      >
        <span style={{
          fontSize: '9px',
          color: s.colors.textMuted,
          width: '10px',
          display: 'inline-block',
          transition: 'transform 0.15s ease',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
        }}>
          ▶
        </span>
        <span>{node.segment}</span>
        <span style={{
          fontSize: '10px',
          color: s.colors.textMuted,
          fontWeight: 400,
          marginLeft: 'auto',
        }}>
          {total}
        </span>
      </button>

      {expanded && node.issues.map((issue, i) => (
        <IssueRow
          key={`leaf-${i}`}
          issue={issue}
          indent={(depth + 1) * 12 + 16}
        />
      ))}
    </div>
  );
}

function IssueRow({ issue, indent }: { issue: DriftIssue; indent: number }) {
  const fullName = issue.sourceName ?? issue.comparisonName ?? 'Unknown';
  // Show only the leaf segment of the name
  const separator = fullName.includes('/') ? '/' : '.';
  const segments = fullName.split(separator);
  const leafName = segments[segments.length - 1];

  const isMissingInComp = issue.type === 'missing_in_comparison';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '4px 8px',
      borderRadius: '4px',
      marginBottom: '1px',
      marginLeft: indent,
      marginRight: '4px',
      background: isMissingInComp ? s.colors.errorBg : s.colors.warningBg,
      fontSize: '11px',
    }}>
      {/* Token type icon */}
      <span style={{
        width: '16px',
        height: '16px',
        borderRadius: '3px',
        background: s.colors.bgSecondary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '8px',
        fontWeight: 700,
        color: s.colors.textSecondary,
        flexShrink: 0,
      }}>
        {tokenTypeIcons[issue.tokenType]}
      </span>

      {/* Leaf name */}
      <span style={{ flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {leafName}
      </span>

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
