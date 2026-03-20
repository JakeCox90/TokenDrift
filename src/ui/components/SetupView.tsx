import { useState } from 'preact/hooks';
import type { FileReference, ComparisonConfig, MatchStrategy, LinkedLibrary } from '../../types';
import { extractFileKey } from '../utils/figma-url';
import * as s from '../styles';

type CompareTab = 'url' | 'libraries' | 'recent';

interface SetupViewProps {
  config: ComparisonConfig;
  pat: string | null;
  onConfigChange: (config: ComparisonConfig) => void;
  onPatChange: (pat: string) => void;
  onRunComparison: () => void;
  onRefreshLibraries: () => void;
  loading: boolean;
  libraries: LinkedLibrary[];
  libraryError: string | null;
  recentFiles: FileReference[];
}

export function SetupView({
  config,
  pat,
  onConfigChange,
  onPatChange,
  onRunComparison,
  onRefreshLibraries,
  loading,
  libraries,
  libraryError,
  recentFiles,
}: SetupViewProps) {
  const [fileInput, setFileInput] = useState('');
  const [patInput, setPatInput] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<CompareTab>('url');

  const showPatField = !pat;

  const handleAddFile = (fileKey: string, label: string) => {
    if (config.comparisonFiles.some(f => f.fileKey === fileKey)) {
      setError('File already added');
      return;
    }
    setError('');
    const newFile: FileReference = { fileKey, label };
    onConfigChange({
      ...config,
      comparisonFiles: [...config.comparisonFiles, newFile],
    });
  };

  const handleAddFromInput = () => {
    const key = extractFileKey(fileInput);
    if (!key) {
      setError('Enter a valid Figma file URL or key');
      return;
    }
    handleAddFile(key, key);
    setFileInput('');
  };

  const handleRemoveFile = (fileKey: string) => {
    onConfigChange({
      ...config,
      comparisonFiles: config.comparisonFiles.filter(f => f.fileKey !== fileKey),
    });
  };

  const handleSavePat = () => {
    const trimmed = patInput.trim();
    if (!trimmed) return;
    onPatChange(trimmed);
    setPatInput('');
  };

  const canRun = config.comparisonFiles.length > 0 && !!pat && !loading;

  // Filter recent files to exclude already-added ones
  const availableRecent = recentFiles.filter(
    f => !config.comparisonFiles.some(c => c.fileKey === f.fileKey),
  );

  const tabs: { key: CompareTab; label: string; count?: number }[] = [
    { key: 'url', label: 'URL' },
    { key: 'libraries', label: 'Libraries', count: libraries.length },
    { key: 'recent', label: 'Recent', count: availableRecent.length },
  ];

  return (
    <div style={{ padding: '20px', animation: 'fadeIn 0.2s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '7px',
            background: `linear-gradient(135deg, ${s.colors.brand}, #a29bfe)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: '#fff',
            fontWeight: 700,
          }}>
            T
          </div>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: s.colors.text, letterSpacing: '-0.01em' }}>
            TokenDrift
          </h2>
        </div>
        <p style={{ color: s.colors.textMuted, fontSize: '11px', marginLeft: '32px' }}>
          Compare design tokens across Figma files
        </p>
      </div>

      {/* PAT input */}
      {showPatField && (
        <div style={s.section}>
          <label style={s.label}>Access Token</label>
          <div style={s.card}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="password"
                style={{ ...s.input, flex: 1 }}
                placeholder="figd_..."
                value={patInput}
                onInput={(e) => setPatInput((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSavePat()}
              />
              <button
                style={{ ...s.button, width: 'auto', whiteSpace: 'nowrap', padding: '9px 14px' }}
                onClick={handleSavePat}
              >
                Save
              </button>
            </div>
            <p style={{ fontSize: '10px', color: s.colors.textMuted, marginTop: '8px', lineHeight: 1.4 }}>
              Your Personal Access Token is stored locally and never shared.
            </p>
          </div>
        </div>
      )}

      {pat && (
        <div style={s.section}>
          <div style={{
            ...s.card,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 12px',
            background: s.colors.successBg,
            border: `1px solid ${s.colors.successBorder}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px' }}>&#10003;</span>
              <span style={{ fontSize: '11px', fontWeight: 500, color: s.colors.success }}>
                Token saved
              </span>
            </div>
            <button style={s.buttonGhost} onClick={() => onPatChange('')}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Source selector */}
      <div style={s.section}>
        <label style={s.label}>Source</label>
        <div style={{
          display: 'flex',
          gap: '4px',
          padding: '3px',
          background: s.colors.bgSecondary,
          borderRadius: '8px',
          border: `1px solid ${s.colors.borderLight}`,
        }}>
          {(['current', 'external'] as const).map(type => (
            <button
              key={type}
              onClick={() => onConfigChange({
                ...config,
                sourceType: type,
                ...(type === 'current' ? { sourceFileKey: undefined } : {}),
              })}
              style={{
                flex: 1,
                padding: '7px 12px',
                background: config.sourceType === type ? s.colors.bg : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: config.sourceType === type ? 600 : 400,
                color: config.sourceType === type ? s.colors.text : s.colors.textMuted,
                boxShadow: config.sourceType === type ? s.shadows.sm : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {type === 'current' ? 'Current file' : 'External file'}
            </button>
          ))}
        </div>

        {config.sourceType === 'external' && (
          <input
            style={{ ...s.input, marginTop: '10px' }}
            placeholder="Paste Figma file URL or key..."
            value={config.sourceFileKey ?? ''}
            onInput={(e) => {
              const val = (e.target as HTMLInputElement).value;
              const key = extractFileKey(val);
              onConfigChange({ ...config, sourceFileKey: key ?? val });
            }}
          />
        )}
      </div>

      {/* Comparison files — tabbed */}
      <div style={s.section}>
        <label style={s.label}>Compare against</label>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '2px',
          padding: '3px',
          background: s.colors.bgSecondary,
          borderRadius: '8px',
          border: `1px solid ${s.colors.borderLight}`,
          marginBottom: '10px',
        }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: '6px 8px',
                background: activeTab === tab.key ? s.colors.bg : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: activeTab === tab.key ? 600 : 400,
                color: activeTab === tab.key ? s.colors.text : s.colors.textMuted,
                boxShadow: activeTab === tab.key ? s.shadows.sm : 'none',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span style={{
                  fontSize: '9px',
                  background: activeTab === tab.key ? s.colors.brandSubtle : s.colors.bgTertiary,
                  color: activeTab === tab.key ? s.colors.brand : s.colors.textMuted,
                  padding: '1px 5px',
                  borderRadius: '8px',
                  fontWeight: 600,
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content: URL */}
        {activeTab === 'url' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input
                style={{ ...s.input, flex: 1 }}
                placeholder="Paste Figma file URL or key..."
                value={fileInput}
                onInput={(e) => {
                  setFileInput((e.target as HTMLInputElement).value);
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddFromInput()}
              />
              <button
                style={{ ...s.button, width: 'auto', whiteSpace: 'nowrap', padding: '9px 14px' }}
                onClick={handleAddFromInput}
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Tab content: Libraries */}
        {activeTab === 'libraries' && (
          <div>
            {libraries.length === 0 ? (
              <div style={{
                padding: '20px 16px',
                textAlign: 'center',
                background: s.colors.bgSecondary,
                borderRadius: '8px',
                border: `1px dashed ${s.colors.border}`,
              }}>
                <p style={{ fontSize: '11px', color: s.colors.textMuted, margin: 0 }}>
                  No linked libraries found
                </p>
                <p style={{ fontSize: '10px', color: s.colors.textMuted, marginTop: '4px' }}>
                  {libraryError
                    ? libraryError
                    : 'Enable libraries in your Figma file first'}
                </p>
                <button
                  onClick={onRefreshLibraries}
                  style={{
                    ...s.buttonGhost,
                    marginTop: '10px',
                    fontSize: '11px',
                    color: s.colors.brand,
                    fontWeight: 600,
                  }}
                >
                  Refresh
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {libraries.map(lib => {
                  const alreadyAdded = config.comparisonFiles.some(f => f.label === lib.name);
                  return (
                    <button
                      key={lib.name}
                      onClick={() => {
                        if (!alreadyAdded) {
                          // Libraries don't have direct file keys via Plugin API.
                          // Use the library name as a placeholder key — user will
                          // need to have the PAT and the file accessible via REST.
                          // For now, we add it as a reference the user can identify.
                          handleAddFile(lib.name, lib.name);
                        }
                      }}
                      disabled={alreadyAdded}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        background: alreadyAdded ? s.colors.bgTertiary : s.colors.bgSecondary,
                        borderRadius: '8px',
                        border: `1px solid ${s.colors.borderLight}`,
                        cursor: alreadyAdded ? 'default' : 'pointer',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: alreadyAdded ? s.colors.textMuted : s.colors.text,
                        textAlign: 'left',
                        width: '100%',
                        transition: 'all 0.15s ease',
                        opacity: alreadyAdded ? 0.6 : 1,
                      }}
                    >
                      <span style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        background: s.colors.brandSubtle,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        color: s.colors.brand,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        L
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lib.name}
                        </div>
                        <div style={{ fontSize: '9px', color: s.colors.textMuted, marginTop: '1px' }}>
                          {lib.collectionKeys.length} collection{lib.collectionKeys.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      {alreadyAdded ? (
                        <span style={{ fontSize: '10px', color: s.colors.success }}>&#10003;</span>
                      ) : (
                        <span style={{ fontSize: '14px', color: s.colors.textMuted }}>+</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab content: Recent */}
        {activeTab === 'recent' && (
          <div>
            {availableRecent.length === 0 ? (
              <div style={{
                padding: '20px 16px',
                textAlign: 'center',
                background: s.colors.bgSecondary,
                borderRadius: '8px',
                border: `1px dashed ${s.colors.border}`,
              }}>
                <p style={{ fontSize: '11px', color: s.colors.textMuted }}>
                  {recentFiles.length === 0
                    ? 'No recent files yet'
                    : 'All recent files already added'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {availableRecent.map(file => (
                  <button
                    key={file.fileKey}
                    onClick={() => handleAddFile(file.fileKey, file.label)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      background: s.colors.bgSecondary,
                      borderRadius: '8px',
                      border: `1px solid ${s.colors.borderLight}`,
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 500,
                      color: s.colors.text,
                      textAlign: 'left',
                      width: '100%',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '6px',
                      background: s.colors.bgTertiary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: s.colors.textMuted,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}>
                      R
                    </span>
                    <span style={{
                      flex: 1,
                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                      fontSize: '10px',
                      color: s.colors.textSecondary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {file.label}
                    </span>
                    <span style={{ fontSize: '14px', color: s.colors.textMuted }}>+</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '8px 10px',
            background: s.colors.errorBg,
            border: `1px solid ${s.colors.errorBorder}`,
            borderRadius: '6px',
            fontSize: '10px',
            color: s.colors.error,
            marginTop: '10px',
          }}>
            {error}
          </div>
        )}

        {/* Added files list */}
        {config.comparisonFiles.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px' }}>
            <div style={{ fontSize: '10px', color: s.colors.textMuted, fontWeight: 600, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Selected ({config.comparisonFiles.length})
            </div>
            {config.comparisonFiles.map(file => (
              <div
                key={file.fileKey}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: s.colors.bgSecondary,
                  borderRadius: '8px',
                  border: `1px solid ${s.colors.borderLight}`,
                  fontSize: '11px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: s.colors.text,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {file.label}
                  </div>
                  {file.fileKey !== file.label && (
                    <div style={{
                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                      fontSize: '9px',
                      color: s.colors.textMuted,
                      marginTop: '1px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {file.fileKey}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveFile(file.fileKey)}
                  style={{
                    ...s.buttonGhost,
                    padding: '2px 6px',
                    fontSize: '14px',
                    lineHeight: 1,
                    color: s.colors.textMuted,
                    borderRadius: '4px',
                  }}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {config.comparisonFiles.length === 0 && activeTab === 'url' && (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            background: s.colors.bgSecondary,
            borderRadius: '8px',
            border: `1px dashed ${s.colors.border}`,
          }}>
            <p style={{ fontSize: '11px', color: s.colors.textMuted }}>
              No files added yet
            </p>
          </div>
        )}
      </div>

      {/* Match strategy */}
      <div style={s.section}>
        <label style={s.label}>Matching</label>
        <select
          style={s.input}
          value={config.matchStrategy ?? 'ignore_first_segment'}
          onChange={(e) =>
            onConfigChange({
              ...config,
              matchStrategy: (e.target as HTMLSelectElement).value as MatchStrategy,
            })
          }
        >
          <option value="ignore_first_segment">Ignore top-level group (recommended)</option>
          <option value="full_name">Exact full name</option>
        </select>
        <p style={{ fontSize: '10px', color: s.colors.textMuted, marginTop: '6px', lineHeight: 1.4 }}>
          {config.matchStrategy === 'full_name'
            ? 'Tokens must have identical names to match. Brand/primary/resting will not match TheSun/primary/resting.'
            : 'Ignores the top-level variable group when matching. e.g. Brand/primary/resting and TheSun/primary/resting both match on primary/resting.'
          }
        </p>
      </div>

      {/* Run button */}
      <button
        style={canRun ? s.button : s.buttonDisabled}
        onClick={canRun ? onRunComparison : undefined}
        disabled={!canRun}
      >
        {loading ? 'Comparing...' : 'Run Comparison'}
      </button>
    </div>
  );
}
