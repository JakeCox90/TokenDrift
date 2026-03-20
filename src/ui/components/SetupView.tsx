import { useState } from 'preact/hooks';
import type { FileReference, ComparisonConfig, MatchStrategy } from '../../types';
import { extractFileKey } from '../utils/figma-url';
import * as s from '../styles';

interface SetupViewProps {
  config: ComparisonConfig;
  pat: string | null;
  onConfigChange: (config: ComparisonConfig) => void;
  onPatChange: (pat: string) => void;
  onRunComparison: () => void;
  loading: boolean;
}

export function SetupView({
  config,
  pat,
  onConfigChange,
  onPatChange,
  onRunComparison,
  loading,
}: SetupViewProps) {
  const [fileInput, setFileInput] = useState('');
  const [patInput, setPatInput] = useState('');
  const [error, setError] = useState('');

  const showPatField = !pat;

  const handleAddFile = () => {
    const key = extractFileKey(fileInput);
    if (!key) {
      setError('Enter a valid Figma file URL or key');
      return;
    }
    if (config.comparisonFiles.some(f => f.fileKey === key)) {
      setError('File already added');
      return;
    }
    setError('');
    const newFile: FileReference = { fileKey: key, label: key };
    onConfigChange({
      ...config,
      comparisonFiles: [...config.comparisonFiles, newFile],
    });
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
            <button
              style={s.buttonGhost}
              onClick={() => onPatChange('')}
            >
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
          <button
            onClick={() => onConfigChange({ ...config, sourceType: 'current', sourceFileKey: undefined })}
            style={{
              flex: 1,
              padding: '7px 12px',
              background: config.sourceType === 'current' ? s.colors.bg : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: config.sourceType === 'current' ? 600 : 400,
              color: config.sourceType === 'current' ? s.colors.text : s.colors.textMuted,
              boxShadow: config.sourceType === 'current' ? s.shadows.sm : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Current file
          </button>
          <button
            onClick={() => onConfigChange({ ...config, sourceType: 'external' })}
            style={{
              flex: 1,
              padding: '7px 12px',
              background: config.sourceType === 'external' ? s.colors.bg : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: config.sourceType === 'external' ? 600 : 400,
              color: config.sourceType === 'external' ? s.colors.text : s.colors.textMuted,
              boxShadow: config.sourceType === 'external' ? s.shadows.sm : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            External file
          </button>
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

      {/* Comparison files */}
      <div style={s.section}>
        <label style={s.label}>Compare against</label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <input
            style={{ ...s.input, flex: 1 }}
            placeholder="Paste Figma file URL or key..."
            value={fileInput}
            onInput={(e) => {
              setFileInput((e.target as HTMLInputElement).value);
              setError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleAddFile()}
          />
          <button
            style={{ ...s.button, width: 'auto', whiteSpace: 'nowrap', padding: '9px 14px' }}
            onClick={handleAddFile}
          >
            Add
          </button>
        </div>

        {error && (
          <div style={{
            padding: '8px 10px',
            background: s.colors.errorBg,
            border: `1px solid ${s.colors.errorBorder}`,
            borderRadius: '6px',
            fontSize: '10px',
            color: s.colors.error,
            marginBottom: '10px',
          }}>
            {error}
          </div>
        )}

        {config.comparisonFiles.length === 0 && (
          <div style={{
            padding: '20px 16px',
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
              <span style={{
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                fontSize: '10px',
                color: s.colors.textSecondary,
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
          <option value="ignore_first_segment">Ignore first path segment (recommended)</option>
          <option value="full_name">Exact full name</option>
        </select>
        <p style={{ fontSize: '10px', color: s.colors.textMuted, marginTop: '6px', lineHeight: 1.4 }}>
          Strips the theme prefix so colour/primary matches thesun/primary.
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
