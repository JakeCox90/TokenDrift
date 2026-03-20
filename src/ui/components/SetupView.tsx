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
    <div style={{ padding: '16px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
        TokenDrift
      </h2>
      <p style={{ color: s.colors.textMuted, marginBottom: '16px', fontSize: '11px' }}>
        Compare design tokens across Figma files.
      </p>

      {/* PAT input */}
      {showPatField && (
        <div style={s.section}>
          <label style={s.label}>Figma Access Token</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="password"
              style={{ ...s.input, flex: 1 }}
              placeholder="figd_..."
              value={patInput}
              onInput={(e) => setPatInput((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSavePat()}
            />
            <button
              style={{ ...s.button, width: 'auto', whiteSpace: 'nowrap' }}
              onClick={handleSavePat}
            >
              Save
            </button>
          </div>
          <p style={{ fontSize: '10px', color: s.colors.textMuted, marginTop: '4px' }}>
            Stored locally in this plugin only. Never sent to third parties.
          </p>
        </div>
      )}

      {pat && (
        <div style={s.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: s.colors.success }}>
              Token saved
            </span>
            <button
              style={{ ...s.buttonSecondary, width: 'auto', padding: '4px 8px', fontSize: '10px' }}
              onClick={() => onPatChange('')}
            >
              Clear token
            </button>
          </div>
        </div>
      )}

      {/* Source selector */}
      <div style={s.section}>
        <label style={s.label}>Source</label>
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          fontSize: '12px',
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="sourceType"
              checked={config.sourceType === 'current'}
              onChange={() => onConfigChange({ ...config, sourceType: 'current', sourceFileKey: undefined })}
            />
            Current file
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="sourceType"
              checked={config.sourceType === 'external'}
              onChange={() => onConfigChange({ ...config, sourceType: 'external' })}
            />
            External file
          </label>
        </div>

        {config.sourceType === 'external' && (
          <input
            style={{ ...s.input, marginTop: '8px' }}
            placeholder="Figma file URL or key"
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
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          <input
            style={{ ...s.input, flex: 1 }}
            placeholder="Figma file URL or key"
            value={fileInput}
            onInput={(e) => {
              setFileInput((e.target as HTMLInputElement).value);
              setError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleAddFile()}
          />
          <button
            style={{ ...s.button, width: 'auto', whiteSpace: 'nowrap' }}
            onClick={handleAddFile}
          >
            Add
          </button>
        </div>

        {error && (
          <p style={{ fontSize: '10px', color: s.colors.error, marginBottom: '6px' }}>
            {error}
          </p>
        )}

        {config.comparisonFiles.length === 0 && (
          <p style={{ fontSize: '11px', color: s.colors.textMuted, fontStyle: 'italic' }}>
            No comparison files added yet.
          </p>
        )}

        {config.comparisonFiles.map(file => (
          <div
            key={file.fileKey}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 8px',
              background: s.colors.bgSecondary,
              borderRadius: '4px',
              marginBottom: '4px',
              fontSize: '11px',
            }}
          >
            <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>
              {file.label}
            </span>
            <button
              onClick={() => handleRemoveFile(file.fileKey)}
              style={{
                background: 'none',
                border: 'none',
                color: s.colors.textMuted,
                cursor: 'pointer',
                fontSize: '14px',
                lineHeight: 1,
                padding: '0 2px',
              }}
              title="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Match strategy */}
      <div style={s.section}>
        <label style={s.label}>Token matching</label>
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
        <p style={{ fontSize: '10px', color: s.colors.textMuted, marginTop: '4px' }}>
          "Ignore first segment" matches colour/primary/resting with thesun/primary/resting.
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
