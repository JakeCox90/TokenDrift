import { useState, useEffect, useCallback } from 'preact/hooks';
import type { ComparisonConfig, DriftIssue, NormalisedToken, SandboxToUIMessage } from '../types';
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

function postToSandbox(msg: unknown): void {
  parent.postMessage({ pluginMessage: msg }, '*');
}

export function App() {
  const [view, setView] = useState<View>('setup');
  const [config, setConfig] = useState<ComparisonConfig>(DEFAULT_CONFIG);
  const [issues, setIssues] = useState<DriftIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PAT stored in clientStorage
  const [pat, setPat, patLoading] = useStorage('figma-pat');

  // Persist config in clientStorage
  const [storedConfig, setStoredConfig] = useStorage('comparison-config');

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

  const handleConfigChange = useCallback((newConfig: ComparisonConfig) => {
    setConfig(newConfig);
    setStoredConfig(JSON.stringify(newConfig));
  }, [setStoredConfig]);

  const handlePatChange = useCallback((newPat: string) => {
    setPat(newPat);
  }, [setPat]);

  // Run comparison
  const handleRunComparison = useCallback(async () => {
    if (!pat) return;

    setLoading(true);
    setError(null);
    setIssues([]);

    try {
      // Get source tokens
      let sourceTokens: NormalisedToken[];

      if (config.sourceType === 'current') {
        sourceTokens = await getLocalTokens();
      } else if (config.sourceFileKey) {
        sourceTokens = await fetchFileTokens(config.sourceFileKey, pat);
      } else {
        throw new Error('No source file specified');
      }

      const sourceFile = config.sourceType === 'current'
        ? 'local'
        : config.sourceFileKey!;

      // Compare against each file
      const allIssues: DriftIssue[] = [];

      for (const compFile of config.comparisonFiles) {
        try {
          const compTokens = await fetchFileTokens(compFile.fileKey, pat);
          const fileIssues = compareTokens(
            sourceTokens,
            compTokens,
            sourceFile,
            compFile.fileKey,
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

      setIssues(allIssues);
      setView('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [config, pat]);

  if (patLoading) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: s.colors.textMuted }}>
        Loading...
      </div>
    );
  }

  return (
    <>
      {error && (
        <div style={{
          padding: '8px 16px',
          background: s.colors.errorBg,
          color: s.colors.error,
          fontSize: '11px',
          borderBottom: `1px solid ${s.colors.error}`,
        }}>
          {error}
        </div>
      )}

      {view === 'setup' && (
        <SetupView
          config={config}
          pat={pat}
          onConfigChange={handleConfigChange}
          onPatChange={handlePatChange}
          onRunComparison={handleRunComparison}
          loading={loading}
        />
      )}

      {view === 'results' && (
        <ResultsView
          issues={issues}
          onBack={() => setView('setup')}
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
