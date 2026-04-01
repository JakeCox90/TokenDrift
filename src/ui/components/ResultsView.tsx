import { useState, useCallback } from 'preact/hooks';
import type { DriftIssue, DriftIssueType, TokenType } from '../../types';
import * as s from '../styles';

interface ResultsViewProps {
  issues: DriftIssue[];
  sourceCollections: string[];
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
    case 'PAINT_STYLE': return 'Colour Styles';
    case 'TEXT_STYLE': return 'Text Styles';
    case 'EFFECT_STYLE': return 'Effect Styles';
    case 'GRID_STYLE': return 'Layout Grid Styles';
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
  missing_in_source: 'Extension',
  missing_in_comparison: 'Missing',
  naming_mismatch: 'Name mismatch',
};

const tokenTypeIcons: Record<TokenType, string> = {
  VARIABLE: 'V',
  PAINT_STYLE: 'C',
  TEXT_STYLE: 'T',
  EFFECT_STYLE: 'E',
  GRID_STYLE: 'G',
};

const tokenTypeColors: Record<TokenType, string> = {
  VARIABLE: '#7695EF',
  PAINT_STYLE: '#D03A5C',
  TEXT_STYLE: '#008767',
  EFFECT_STYLE: '#8B6914',
  GRID_STYLE: '#0984E3',
};

export function ResultsView({ issues, sourceCollections, onBack, onRefresh, loading }: ResultsViewProps) {
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<DriftIssueType>>(new Set());

  const toggleFilter = (type: DriftIssueType) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const filtered = issues.filter(issue => {
    if (activeFilters.size > 0 && !activeFilters.has(issue.type)) return false;
    if (search) {
      const q = search.toLowerCase();
      const src = (issue.sourceName ?? '').toLowerCase();
      const comp = (issue.comparisonName ?? '').toLowerCase();
      if (!src.includes(q) && !comp.includes(q)) return false;
    }
    return true;
  });

  const missingInSource = issues.filter(i => i.type === 'missing_in_source').length;
  const missingInComparison = issues.filter(i => i.type === 'missing_in_comparison').length;
  const namingMismatches = issues.filter(i => i.type === 'naming_mismatch').length;
  const isFiltered = activeFilters.size > 0;
  const tree = buildTree(filtered);

  // Collections with drift (top-level tree group names)
  const driftedCollections = new Set(tree.children.keys());
  // Collections with no issues at all
  const alignedCollections = sourceCollections.filter(c => !driftedCollections.has(c));

  return (
    <div style={{ padding: '20px', animation: 'fadeIn 0.2s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={onBack}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.15s ease',
            padding: 0,
          }}
          title="Back to setup"
          dangerouslySetInnerHTML={{
            __html: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${s.colors.text}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
          }}
        />
        <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: s.colors.text, letterSpacing: '-0.01em' }}>
          Results
        </h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            onClick={() => parent.postMessage({ pluginMessage: { type: 'restart' } }, '*')}
            style={{
              ...s.buttonGhost,
              fontSize: '10px',
              color: s.colors.textMuted,
              borderRadius: '999px',
            }}
            title="Close and reopen plugin to clear Figma's library cache"
          >
            Restart
          </button>
          <button
            onClick={loading ? undefined : onRefresh}
            disabled={loading}
            style={{
              padding: '5px 12px',
              background: loading ? s.colors.bgSecondary : s.colors.brand,
              color: loading ? s.colors.textMuted : '#fff',
              border: 'none',
              borderRadius: '999px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '11px',
              fontWeight: 600,
              boxShadow: loading ? 'none' : `0 1px 3px rgba(118, 149, 239, 0.3)`,
              transition: 'all 0.15s ease',
            }}
            title="Re-run comparison"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
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
          {/* Filter tabs + search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '14px',
            position: 'relative',
          }}>
            {/* Tabs — fade out when search is open */}
            <div style={{
              display: 'flex',
              gap: '8px',
              flex: 1,
              flexWrap: 'wrap',
              opacity: searchOpen ? 0 : 1,
              pointerEvents: searchOpen ? 'none' : 'auto',
              transition: 'opacity 0.2s ease',
            }}>
              <FilterTab
                label="All"
                count={issues.length}
                active={activeFilters.size === 0}
                color={s.colors.textMuted}
                bg={s.colors.bgTertiary}
                onClick={() => setActiveFilters(new Set())}
              />
              {missingInComparison > 0 && (
                <FilterTab
                  label="Missing"
                  count={missingInComparison}
                  active={activeFilters.has('missing_in_comparison')}
                  color={s.colors.error}
                  bg={s.colors.errorBg}
                  borderColor={s.colors.errorBorder}
                  onClick={() => toggleFilter('missing_in_comparison')}
                />
              )}
              {missingInSource > 0 && (
                <FilterTab
                  label={`Extension${missingInSource !== 1 ? 's' : ''}`}
                  count={missingInSource}
                  active={activeFilters.has('missing_in_source')}
                  color={s.colors.brand}
                  bg="rgba(118, 149, 239, 0.08)"
                  borderColor="rgba(118, 149, 239, 0.2)"
                  onClick={() => toggleFilter('missing_in_source')}
                />
              )}
              {namingMismatches > 0 && (
                <FilterTab
                  label={`Mismatch${namingMismatches !== 1 ? 'es' : ''}`}
                  count={namingMismatches}
                  active={activeFilters.has('naming_mismatch')}
                  color="#0984E3"
                  bg="rgba(9, 132, 227, 0.08)"
                  borderColor="rgba(9, 132, 227, 0.2)"
                  onClick={() => toggleFilter('naming_mismatch')}
                />
              )}
            </div>

            {/* Search — expands over tabs when open */}
            {searchOpen ? (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                animation: 'fadeIn 0.2s ease',
              }}>
                <input
                  ref={(el) => el?.focus()}
                  style={{ ...s.input, flex: 1, margin: 0 }}
                  placeholder="Search tokens..."
                  value={search}
                  onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearch('');
                      setSearchOpen(false);
                    }
                  }}
                />
                <button
                  onClick={() => { setSearch(''); setSearchOpen(false); }}
                  style={{
                    padding: '6px 8px',
                    background: s.colors.bgTertiary,
                    border: `1px solid ${s.colors.borderLight}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    color: s.colors.textMuted,
                    fontWeight: 500,
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                style={{
                  padding: '6px',
                  background: s.colors.bgTertiary,
                  border: `1px solid ${s.colors.borderLight}`,
                  borderRadius: '999px',
                  cursor: 'pointer',
                  lineHeight: 0,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
                title="Search tokens"
                dangerouslySetInnerHTML={{
                  __html: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${s.colors.textMuted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
                }}
              />
            )}
          </div>

          {filtered.length !== issues.length && (
            <p style={{ fontSize: '10px', color: s.colors.textMuted, marginBottom: '10px' }}>
              Showing {filtered.length} of {issues.length}
            </p>
          )}

          {/* Results — flat rows when filtered, tree when showing all */}
          {isFiltered ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filtered.map((issue, i) => (
                <FlatIssueRow key={`flat-${i}`} issue={issue} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Array.from(tree.children.entries()).map(([name, node]) => (
                <CollectionSection key={name} node={node} depth={0} />
              ))}
            </div>
          )}

          {/* Aligned collections */}
          {alignedCollections.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h3 style={{
                fontSize: '11px',
                fontWeight: 600,
                color: s.colors.textMuted,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}>
                Aligned
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {alignedCollections.map(name => (
                  <div
                    key={name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: s.colors.bgSecondary,
                      borderRadius: '10px',
                      border: `1px solid ${s.colors.borderLight}`,
                      fontSize: '12px',
                      fontWeight: 500,
                      color: s.colors.textSecondary,
                    }}
                  >
                    <span style={{ color: s.colors.success, fontSize: '12px' }}>&#10003;</span>
                    <span style={{ flex: 1 }}>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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

function FilterTab({
  label, count, active, color, bg, borderColor, onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  color: string;
  bg: string;
  borderColor?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 10px',
        fontSize: '10px',
        fontWeight: 600,
        color: active ? '#fff' : color,
        background: active ? color : bg,
        border: `1px solid ${active ? color : (borderColor ?? 'transparent')}`,
        borderRadius: '999px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      <span style={{
        fontSize: '9px',
        fontWeight: 700,
        opacity: active ? 0.85 : 0.7,
      }}>
        {count}
      </span>
    </button>
  );
}

function FlatIssueRow({ issue }: { issue: DriftIssue }) {
  const fullName = issue.sourceName ?? issue.comparisonName ?? 'Unknown';
  const isNamingMismatch = issue.type === 'naming_mismatch';
  const isMissingInComp = issue.type === 'missing_in_comparison';
  const isExtension = issue.type === 'missing_in_source';

  const accentColor = isNamingMismatch
    ? '#0984E3'
    : isExtension ? s.colors.brand
    : isMissingInComp ? s.colors.error : s.colors.warning;
  const bgColor = isNamingMismatch
    ? 'rgba(9, 132, 227, 0.06)'
    : isExtension ? 'rgba(118, 149, 239, 0.06)'
    : isMissingInComp ? s.colors.errorBg : s.colors.warningBg;
  const borderColor = isNamingMismatch
    ? 'rgba(9, 132, 227, 0.15)'
    : isExtension ? 'rgba(118, 149, 239, 0.15)'
    : isMissingInComp ? s.colors.errorBorder : s.colors.warningBorder;

  const compFullName = issue.comparisonName ?? '';
  const isRelocated = issue.hint?.includes('different groups');
  const displaySource = isRelocated ? fullName : fullName;
  const displayComp = isRelocated ? compFullName : compFullName;

  const collectionLabel = issue.collection ?? styleTypeGroupLabel(issue.tokenType);

  return (
    <div style={{
      padding: '8px 10px',
      borderRadius: '8px',
      background: bgColor,
      border: `1px solid ${borderColor}`,
      fontSize: '11px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        {/* Token type icon */}
        <span style={{
          width: '18px',
          height: '18px',
          borderRadius: '5px',
          background: tokenTypeColors[issue.tokenType] + '14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '8px',
          fontWeight: 700,
          color: tokenTypeColors[issue.tokenType],
          flexShrink: 0,
          border: `1px solid ${tokenTypeColors[issue.tokenType]}20`,
        }}>
          {tokenTypeIcons[issue.tokenType]}
        </span>

        {/* Token name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: s.colors.text,
          }}>
            {fullName}
          </div>
          <div style={{
            fontSize: '9px',
            color: s.colors.textMuted,
            marginTop: '1px',
          }}>
            {collectionLabel}
          </div>
        </div>

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

      {/* Naming mismatch detail */}
      {isNamingMismatch && issue.sourceName && issue.comparisonName && (
        <div style={{
          marginTop: '4px',
          marginLeft: '26px',
          fontSize: '10px',
          lineHeight: 1.5,
          color: s.colors.textSecondary,
        }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'baseline' }}>
            <span style={{ color: s.colors.textMuted, fontWeight: 500, flexShrink: 0 }}>Source:</span>
            <span style={{ fontFamily: 'monospace', fontSize: '9px', color: s.colors.text }}>{displaySource}</span>
          </div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'baseline' }}>
            <span style={{ color: s.colors.textMuted, fontWeight: 500, flexShrink: 0 }}>Comparison:</span>
            <span style={{ fontFamily: 'monospace', fontSize: '9px', color: s.colors.text }}>{displayComp}</span>
          </div>
          {issue.hint && (
            <div style={{
              marginTop: '2px',
              fontSize: '9px',
              color: accentColor,
              fontWeight: 500,
            }}>
              {issue.hint}
            </div>
          )}
        </div>
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
          paddingLeft: isTopLevel ? 12 : 10 + depth * 14,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: isTopLevel ? '12px' : '11px',
          fontWeight: isTopLevel ? 600 : 500,
          color: s.colors.text,
          textAlign: 'left',
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
          paddingLeft: 10 + depth * 14,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 500,
          color: s.colors.text,
          textAlign: 'left',
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

  const isNamingMismatch = issue.type === 'naming_mismatch';
  const isMissingInComp = issue.type === 'missing_in_comparison';
  const isExtension = issue.type === 'missing_in_source';

  const accentColor = isNamingMismatch
    ? '#0984E3'
    : isExtension ? s.colors.brand
    : isMissingInComp ? s.colors.error : s.colors.warning;
  const bgColor = isNamingMismatch
    ? 'rgba(9, 132, 227, 0.06)'
    : isExtension ? 'rgba(118, 149, 239, 0.06)'
    : isMissingInComp ? s.colors.errorBg : s.colors.warningBg;
  const borderColor = isNamingMismatch
    ? 'rgba(9, 132, 227, 0.15)'
    : isExtension ? 'rgba(118, 149, 239, 0.15)'
    : isMissingInComp ? s.colors.errorBorder : s.colors.warningBorder;

  // For naming mismatches, show full paths if relocated, leaf names otherwise
  const compFullName = issue.comparisonName ?? '';
  const compSegments = compFullName.split(compFullName.includes('/') ? '/' : '.');
  const compLeafName = compSegments[compSegments.length - 1];
  const isRelocated = issue.hint?.includes('different groups');
  const displaySource = isRelocated ? fullName : leafName;
  const displayComp = isRelocated ? compFullName : compLeafName;

  return (
    <div style={{
      padding: '5px 10px',
      paddingLeft: 10 + indent,
      borderRadius: '6px',
      marginBottom: '2px',
      marginRight: '8px',
      background: bgColor,
      border: `1px solid ${borderColor}`,
      fontSize: '11px',
      transition: 'all 0.1s ease',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        {/* Token type icon */}
        <span style={{
          width: '18px',
          height: '18px',
          borderRadius: '5px',
          background: tokenTypeColors[issue.tokenType] + '14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '8px',
          fontWeight: 700,
          color: tokenTypeColors[issue.tokenType],
          flexShrink: 0,
          border: `1px solid ${tokenTypeColors[issue.tokenType]}20`,
        }}>
          {tokenTypeIcons[issue.tokenType]}
        </span>

        {/* Token name */}
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

      {/* Naming mismatch detail — show both names and why */}
      {isNamingMismatch && issue.sourceName && issue.comparisonName && (
        <div style={{
          marginTop: '4px',
          marginLeft: '26px',
          fontSize: '10px',
          lineHeight: 1.5,
          color: s.colors.textSecondary,
        }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'baseline' }}>
            <span style={{ color: s.colors.textMuted, fontWeight: 500, flexShrink: 0 }}>Source:</span>
            <span style={{ fontFamily: 'monospace', fontSize: '9px', color: s.colors.text }}>{displaySource}</span>
          </div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'baseline' }}>
            <span style={{ color: s.colors.textMuted, fontWeight: 500, flexShrink: 0 }}>Comparison:</span>
            <span style={{ fontFamily: 'monospace', fontSize: '9px', color: s.colors.text }}>{displayComp}</span>
          </div>
          {issue.hint && (
            <div style={{
              marginTop: '2px',
              fontSize: '9px',
              color: accentColor,
              fontWeight: 500,
            }}>
              {issue.hint}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
