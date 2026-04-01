import { useState, useEffect, useCallback } from 'preact/hooks';
import type { ComparisonConfig, DriftIssue, NormalisedToken, SandboxToUIMessage, LinkedLibrary, FileReference, LibraryFileKeys } from '../types';
import { compareTokens } from './diff/engine';
import { fetchFileTokens, FigmaApiError } from './api/figma-rest';
import { useStorage } from './hooks/use-storage';
import { SetupView } from './components/SetupView';
import { ResultsView } from './components/ResultsView';
import * as s from './styles';

type View = 'setup' | 'results';

const DEFAULT_CONFIG: ComparisonConfig = {
  sourceType: 'current',
  comparisonFiles: [],
};

const MAX_RECENT_FILES = 5;

function postToSandbox(msg: unknown): void {
  parent.postMessage({ pluginMessage: msg }, '*');
}

export function App() {
  const [view, setView] = useState<View>('setup');
  const [config, setConfig] = useState<ComparisonConfig>(DEFAULT_CONFIG);
  const [issues, setIssues] = useState<DriftIssue[]>([]);
  const [sourceCollections, setSourceCollections] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libraries, setLibraries] = useState<LinkedLibrary[]>([]);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [recentFiles, setRecentFilesState] = useState<FileReference[]>([]);

  // PAT stored in clientStorage
  const [pat, setPat, patLoading] = useStorage('figma-pat');

  // Persist config in clientStorage
  const [storedConfig, setStoredConfig] = useStorage('comparison-config');

  // Recent files stored in clientStorage
  const [storedRecent, setStoredRecent] = useStorage('recent-files');

  // Library file key mappings stored in clientStorage
  const [storedLibKeys, setStoredLibKeys] = useStorage('library-file-keys');
  const [libraryFileKeys, setLibraryFileKeys] = useState<LibraryFileKeys>({});

  // Load persisted config on mount
  useEffect(() => {
    if (storedConfig) {
      try {
        const parsed = JSON.parse(storedConfig) as ComparisonConfig;
        setConfig(parsed);
      } catch {
        // Invalid stored config, use default
      }
    }
  }, [storedConfig]);

  // Load recent files on mount
  useEffect(() => {
    if (storedRecent) {
      try {
        const parsed = JSON.parse(storedRecent) as FileReference[];
        setRecentFilesState(parsed);
      } catch {
        // Invalid stored recent files
      }
    }
  }, [storedRecent]);

  // Load library file key mappings on mount
  useEffect(() => {
    if (storedLibKeys) {
      try {
        setLibraryFileKeys(JSON.parse(storedLibKeys) as LibraryFileKeys);
      } catch {
        // Invalid stored keys
      }
    }
  }, [storedLibKeys]);

  // Fetch linked libraries on mount
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage as SandboxToUIMessage | undefined;
      if (msg && msg.type === 'linked-libraries') {
        setLibraries(msg.libraries);
        setLibraryError(msg.error ?? null);
      }
    };
    window.addEventListener('message', handler);
    postToSandbox({ type: 'get-linked-libraries' });
    return () => window.removeEventListener('message', handler);
  }, []);

  const refreshLibraries = useCallback(() => {
    setLibraryError(null);
    postToSandbox({ type: 'get-linked-libraries' });
  }, []);

  const handleConfigChange = useCallback((newConfig: ComparisonConfig) => {
    setConfig(newConfig);
    setStoredConfig(JSON.stringify(newConfig));
  }, [setStoredConfig]);

  const handlePatChange = useCallback((newPat: string) => {
    setPat(newPat);
  }, [setPat]);

  const handleLibraryFileKeyChange = useCallback((libraryName: string, fileKey: string | null) => {
    setLibraryFileKeys(prev => {
      const updated = { ...prev };
      if (fileKey) {
        updated[libraryName] = fileKey;
      } else {
        delete updated[libraryName];
      }
      setStoredLibKeys(JSON.stringify(updated));
      return updated;
    });
  }, [setStoredLibKeys]);

  /** Add a file to the recent files list (deduplicated, max 5) */
  const addToRecent = useCallback((file: FileReference) => {
    setRecentFilesState(prev => {
      const filtered = prev.filter(f => f.fileKey !== file.fileKey);
      const updated = [file, ...filtered].slice(0, MAX_RECENT_FILES);
      setStoredRecent(JSON.stringify(updated));
      return updated;
    });
  }, [setStoredRecent]);

  // Run comparison
  const handleRunComparison = useCallback(async () => {
    const hasRestFiles = config.comparisonFiles.some(f => !f.libraryCollectionKeys);
    const needsExternalSource = config.sourceType === 'external';

    // Only require PAT if we need REST API
    if ((hasRestFiles || needsExternalSource) && !pat) {
      setError('Access token required to compare external files. Save one in settings.');
      return;
    }

    setLoading(true);
    setError(null);
    setIssues([]);

    try {
      // Get source tokens
      let sourceTokens: NormalisedToken[];

      if (config.sourceType === 'current') {
        sourceTokens = await getLocalTokens();
      } else if (config.sourceFileKey && pat) {
        sourceTokens = await fetchFileTokens(config.sourceFileKey, pat);
      } else {
        throw new Error('No source file specified');
      }

      const sourceFile = config.sourceType === 'current'
        ? 'local'
        : config.sourceFileKey!;

      // Re-fetch library collection keys to pick up any republished changes
      const freshLibraries = await getLinkedLibraries();
      setLibraries(freshLibraries);
      const freshKeysByName = new Map(
        freshLibraries.map(lib => [lib.name, lib.collectionKeys]),
      );

      // Compare against each file
      const allIssues: DriftIssue[] = [];

      for (const compFile of config.comparisonFiles) {
        // Track in recent files (only non-library files)
        if (!compFile.libraryCollectionKeys) {
          addToRecent(compFile);
        }

        try {
          let compTokens: NormalisedToken[];

          if (compFile.libraryCollectionKeys) {
            // Library — use REST API when file key is known (always fresh, no cache)
            const libFileKey = libraryFileKeys[compFile.label];
            if (pat && libFileKey) {
              compTokens = await fetchFileTokens(libFileKey, pat);
            } else {
              // Fallback: Plugin API (may return cached/stale data)
              const keys = freshKeysByName.get(compFile.label) ?? compFile.libraryCollectionKeys;
              compTokens = await getLibraryTokens(keys, compFile.label);
            }
          } else {
            // External file — fetch via REST API
            compTokens = await fetchFileTokens(compFile.fileKey, pat!);
          }

          const fileIssues = compareTokens(
            sourceTokens,
            compTokens,
            sourceFile,
            compFile.libraryCollectionKeys ? compFile.label : compFile.fileKey,
            { matchStrategy: config.matchStrategy ?? 'ignore_first_segment' },
          );
          allIssues.push(...fileIssues);
        } catch (err) {
          if (err instanceof FigmaApiError) {
            allIssues.push({
              type: 'missing_in_comparison',
              tokenType: 'VARIABLE',
              sourceName: `[Error: ${err.message}]`,
              sourceFile,
              comparisonFile: compFile.fileKey,
            });
          } else {
            throw err;
          }
        }
      }

      // Extract unique collection/style-type group names from source tokens
      const collectionSet = new Set<string>();
      for (const t of sourceTokens) {
        if (t.type === 'VARIABLE' && t.collection) {
          collectionSet.add(t.collection);
        }
      }
      // Add style type groups if source has those token types
      const styleLabels: Record<string, string> = {
        PAINT_STYLE: 'Colour Styles',
        TEXT_STYLE: 'Text Styles',
        EFFECT_STYLE: 'Effect Styles',
        GRID_STYLE: 'Layout Grid Styles',
      };
      for (const t of sourceTokens) {
        if (t.type in styleLabels) {
          collectionSet.add(styleLabels[t.type]);
        }
      }
      setSourceCollections(Array.from(collectionSet));

      setIssues(allIssues);
      setView('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [config, pat, addToRecent, libraryFileKeys]);

  if (patLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 16px',
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
      </div>
    );
  }

  return (
    <>
      {error && (
        <div style={{
          padding: '10px 20px',
          background: s.colors.errorBg,
          color: s.colors.error,
          fontSize: '11px',
          fontWeight: 500,
          borderBottom: `1px solid ${s.colors.errorBorder}`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ flexShrink: 0 }}>!</span>
          <span>{error}</span>
        </div>
      )}

      {view === 'setup' && (
        <SetupView
          config={config}
          pat={pat}
          onConfigChange={handleConfigChange}
          onPatChange={handlePatChange}
          onRunComparison={handleRunComparison}
          onRefreshLibraries={refreshLibraries}
          loading={loading}
          libraries={libraries}
          libraryError={libraryError}
          recentFiles={recentFiles}
          libraryFileKeys={libraryFileKeys}
          onLibraryFileKeyChange={handleLibraryFileKeyChange}
        />
      )}

      {view === 'results' && (
        <ResultsView
          issues={issues}
          sourceCollections={sourceCollections}
          onBack={() => setView('setup')}
          onRefresh={handleRunComparison}
          loading={loading}
        />
      )}
    </>
  );
}

/** Request local tokens from the plugin sandbox and wait for the response */
function getLocalTokens(): Promise<NormalisedToken[]> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for local tokens'));
    }, 10000);

    const handler = (event: MessageEvent) => {
      const msg = event.data.pluginMessage as SandboxToUIMessage | undefined;
      if (!msg) return;

      if (msg.type === 'local-tokens') {
        cleanup();
        resolve(msg.tokens);
      }
      if (msg.type === 'error') {
        cleanup();
        reject(new Error(msg.message));
      }
    };

    const cleanup = () => {
      clearTimeout(timeout);
      window.removeEventListener('message', handler);
    };

    window.addEventListener('message', handler);
    postToSandbox({ type: 'get-local-tokens' });
  });
}

/** Re-fetch linked libraries from the plugin sandbox to get fresh collection keys */
function getLinkedLibraries(): Promise<LinkedLibrary[]> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out fetching linked libraries'));
    }, 15000);

    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage as SandboxToUIMessage | undefined;
      if (!msg) return;

      if (msg.type === 'linked-libraries') {
        cleanup();
        resolve(msg.libraries);
      }
      if (msg.type === 'error') {
        cleanup();
        reject(new Error(msg.message));
      }
    };

    const cleanup = () => {
      clearTimeout(timeout);
      window.removeEventListener('message', handler);
    };

    window.addEventListener('message', handler);
    postToSandbox({ type: 'get-linked-libraries' });
  });
}

/** Request library tokens from the plugin sandbox via Plugin API */
function getLibraryTokens(collectionKeys: string[], libraryName: string): Promise<NormalisedToken[]> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out fetching tokens from ${libraryName}`));
    }, 15000);

    const handler = (event: MessageEvent) => {
      const msg = event.data.pluginMessage as SandboxToUIMessage | undefined;
      if (!msg) return;

      if (msg.type === 'library-tokens' && msg.libraryName === libraryName) {
        cleanup();
        resolve(msg.tokens);
      }
      if (msg.type === 'error') {
        cleanup();
        reject(new Error(msg.message));
      }
    };

    const cleanup = () => {
      clearTimeout(timeout);
      window.removeEventListener('message', handler);
    };

    window.addEventListener('message', handler);
    postToSandbox({ type: 'get-library-tokens', collectionKeys, libraryName });
  });
}
