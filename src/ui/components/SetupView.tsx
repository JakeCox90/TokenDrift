import { useState, useEffect, useRef } from 'preact/hooks';
import type { FileReference, ComparisonConfig, MatchStrategy, LinkedLibrary } from '../../types';
import { extractFileKey } from '../utils/figma-url';
import { fetchFileInfo } from '../api/figma-rest';
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
  const [activeTab, setActiveTab] = useState<CompareTab>('libraries');
  const handleTabChange = (tab: CompareTab) => {
    setActiveTab(tab);
    if (tab === 'libraries') {
      onRefreshLibraries();
    }
  };
  const [showSettings, setShowSettings] = useState(false);
  const [showMatchSettings, setShowMatchSettings] = useState(false);
  const [addingFile, setAddingFile] = useState(false);

  const handleAddFile = (file: FileReference) => {
    if (config.comparisonFiles.some(f => f.fileKey === file.fileKey)) {
      setError('File already added');
      return;
    }
    setError('');
    onConfigChange({
      ...config,
      comparisonFiles: [...config.comparisonFiles, file],
    });
  };

  const handleAddFromInput = async () => {
    const key = extractFileKey(fileInput);
    if (!key) {
      setError('Enter a valid Figma file URL or key');
      return;
    }

    if (!pat) {
      setError('Save an access token first');
      return;
    }

    setAddingFile(true);
    setError('');
    try {
      const info = await fetchFileInfo(key, pat);
      handleAddFile({ fileKey: key, label: info.name, thumbnailUrl: info.thumbnailUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch file info');
    } finally {
      setAddingFile(false);
      setFileInput('');
    }
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
    setShowSettings(false);
  };

  // Resolve file info for any entries that still have the key as label
  const resolvedRef = useRef(new Set<string>());
  useEffect(() => {
    if (!pat) return;
    const unresolved = config.comparisonFiles.filter(
      f => f.fileKey === f.label && !resolvedRef.current.has(f.fileKey),
    );
    if (unresolved.length === 0) return;

    for (const file of unresolved) {
      resolvedRef.current.add(file.fileKey);
      fetchFileInfo(file.fileKey, pat)
        .then(info => {
          onConfigChange({
            ...config,
            comparisonFiles: config.comparisonFiles.map(f =>
              f.fileKey === file.fileKey
                ? { ...f, label: info.name, thumbnailUrl: info.thumbnailUrl }
                : f,
            ),
          });
        })
        .catch(() => {
          // Leave as-is if fetch fails
        });
    }
  }, [config.comparisonFiles, pat]);

  const canRun = config.comparisonFiles.length > 0 && !!pat && !loading;

  const tabs: { key: CompareTab; label: string; count?: number }[] = [
    { key: 'libraries', label: 'Libraries', count: libraries.length },
    { key: 'recent', label: 'Recent', count: recentFiles.length },
    { key: 'url', label: 'URL' },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      animation: 'fadeIn 0.2s ease',
    }}>
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 20px 0' }}>
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
          {pat && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{
                marginLeft: 'auto',
                padding: '6px',
                background: showSettings ? s.colors.bgTertiary : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                lineHeight: 0,
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Settings"
              dangerouslySetInnerHTML={{
                __html: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${showSettings ? s.colors.text : s.colors.textMuted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
              }}
            />
          )}
        </div>
        <p style={{ color: s.colors.textMuted, fontSize: '11px', marginLeft: '32px' }}>
          Compare design tokens across Figma files
        </p>
      </div>

      {/* PAT input — shown when no PAT set */}
      {!pat && (
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

      {/* Settings dropdown — shown when gear is clicked */}
      {pat && showSettings && (
        <div style={{
          ...s.card,
          marginBottom: '16px',
          padding: '12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ ...s.label, margin: 0 }}>Access Token</label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span style={{ fontSize: '12px', color: s.colors.success }}>&#10003;</span>
              <span style={{ fontSize: '11px', fontWeight: 500, color: s.colors.textSecondary }}>
                Token saved
              </span>
            </div>
            <button
              style={{
                ...s.buttonGhost,
                fontSize: '11px',
                color: s.colors.error,
              }}
              onClick={() => { onPatChange(''); setShowSettings(false); }}
            >
              Remove
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
              onClick={() => handleTabChange(tab.key)}
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
                disabled={addingFile}
                onInput={(e) => {
                  setFileInput((e.target as HTMLInputElement).value);
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddFromInput()}
              />
              <button
                style={{ ...s.button, width: 'auto', whiteSpace: 'nowrap', padding: '9px 14px', opacity: addingFile ? 0.6 : 1 }}
                onClick={handleAddFromInput}
                disabled={addingFile}
              >
                {addingFile ? '...' : 'Add'}
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
                        if (alreadyAdded) {
                          handleRemoveFile(lib.name);
                        } else {
                          handleAddFile({ fileKey: lib.name, label: lib.name });
                        }
                      }}
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
            {recentFiles.length === 0 ? (
              <div style={{
                padding: '20px 16px',
                textAlign: 'center',
                background: s.colors.bgSecondary,
                borderRadius: '8px',
                border: `1px dashed ${s.colors.border}`,
              }}>
                <p style={{ fontSize: '11px', color: s.colors.textMuted }}>
                  No recent files yet
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {recentFiles.map(file => {
                  const alreadyAdded = config.comparisonFiles.some(f => f.fileKey === file.fileKey);
                  return (
                    <button
                      key={file.fileKey}
                      onClick={() => {
                        if (alreadyAdded) {
                          handleRemoveFile(file.fileKey);
                        } else {
                          handleAddFile(file);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        background: alreadyAdded ? s.colors.bgTertiary : s.colors.bgSecondary,
                        borderRadius: '8px',
                        border: `1px solid ${s.colors.borderLight}`,
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: alreadyAdded ? s.colors.textMuted : s.colors.text,
                        textAlign: 'left',
                        width: '100%',
                        transition: 'all 0.15s ease',
                        opacity: alreadyAdded ? 0.6 : 1,
                      }}
                    >
                      {file.thumbnailUrl ? (
                        <img
                          src={file.thumbnailUrl}
                          alt=""
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '6px',
                            objectFit: 'cover',
                            flexShrink: 0,
                            border: `1px solid ${s.colors.borderLight}`,
                          }}
                        />
                      ) : (
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
                      )}
                      <span style={{
                        flex: 1,
                        fontSize: '11px',
                        color: alreadyAdded ? s.colors.textMuted : s.colors.textSecondary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {file.label}
                      </span>
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

        {/* URL-added files (not visible in Libraries or Recent tabs) */}
        {(() => {
          const libraryNames = new Set(libraries.map(l => l.name));
          const recentKeys = new Set(recentFiles.map(r => r.fileKey));
          const urlOnly = config.comparisonFiles.filter(
            f => !libraryNames.has(f.fileKey) && !recentKeys.has(f.fileKey),
          );
          if (urlOnly.length === 0) return null;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px' }}>
              {urlOnly.map(file => (
                <div
                  key={file.fileKey}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    background: s.colors.bgTertiary,
                    borderRadius: '8px',
                    border: `1px solid ${s.colors.borderLight}`,
                    fontSize: '11px',
                  }}
                >
                  {file.thumbnailUrl ? (
                    <img
                      src={file.thumbnailUrl}
                      alt=""
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        objectFit: 'cover',
                        flexShrink: 0,
                        border: `1px solid ${s.colors.borderLight}`,
                      }}
                    />
                  ) : (
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
                      F
                    </span>
                  )}
                  <span style={{
                    flex: 1,
                    fontSize: '11px',
                    fontWeight: 500,
                    color: s.colors.text,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {file.label}
                  </span>
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
          );
        })()}
      </div>

      </div>

      {/* Footer — fixed to bottom */}
      <div style={{
        padding: '12px 20px 20px',
        background: s.colors.bg,
        borderTop: `1px solid ${s.colors.borderLight}`,
        flexShrink: 0,
      }}>
        {/* Match settings popover */}
        {showMatchSettings && (
          <div style={{
            ...s.card,
            marginBottom: '10px',
          }}>
            <label style={{ ...s.label, margin: '0 0 6px' }}>Matching</label>
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
              <option value="ignore_first_two_segments">Ignore top two groups</option>
              <option value="full_name">Exact full name</option>
            </select>
            <p style={{ fontSize: '10px', color: s.colors.textMuted, marginTop: '6px', lineHeight: 1.4 }}>
              {config.matchStrategy === 'full_name'
                ? 'Tokens must have identical names to match. Brand/primary/resting will not match TheSun/primary/resting.'
                : config.matchStrategy === 'ignore_first_two_segments'
                ? 'Ignores the first two variable groups when matching. e.g. Brand/Colour/primary/resting and TheSun/Colors/primary/resting both match on primary/resting.'
                : 'Ignores the top-level variable group when matching. e.g. Brand/primary/resting and TheSun/primary/resting both match on primary/resting.'
              }
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setShowMatchSettings(!showMatchSettings)}
            style={{
              padding: '9px',
              background: showMatchSettings ? s.colors.bgTertiary : s.colors.bgSecondary,
              border: `1px solid ${s.colors.borderLight}`,
              borderRadius: '8px',
              cursor: 'pointer',
              lineHeight: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
            title="Match settings"
            dangerouslySetInnerHTML={{
              __html: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${showMatchSettings ? s.colors.text : s.colors.textMuted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
            }}
          />
          <button
            style={{ ...(canRun ? s.button : s.buttonDisabled), flex: 1 }}
            onClick={canRun ? onRunComparison : undefined}
            disabled={!canRun}
          >
            {loading ? 'Comparing...' : 'Run Comparison'}
          </button>
        </div>
      </div>
    </div>
  );
}
