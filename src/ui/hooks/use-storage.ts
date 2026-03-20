import { useState, useEffect, useCallback } from 'preact/hooks';
import type { SandboxToUIMessage } from '../../types';

/** Post a message to the plugin sandbox */
function postToSandbox(msg: unknown): void {
  parent.postMessage({ pluginMessage: msg }, '*');
}

/**
 * Read/write a value in Figma clientStorage via the plugin sandbox.
 * Returns [value, setValue, isLoading].
 */
export function useStorage(
  key: string,
): [string | null, (value: string) => void, boolean] {
  const [value, setValueState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data.pluginMessage as SandboxToUIMessage | undefined;
      if (!msg) return;

      if (msg.type === 'storage-result' && msg.key === key) {
        setValueState(msg.value);
        setLoading(false);
      }
      if (msg.type === 'storage-set' && msg.key === key) {
        // Confirmed write
      }
    };

    window.addEventListener('message', handler);
    postToSandbox({ type: 'get-storage', key });

    return () => window.removeEventListener('message', handler);
  }, [key]);

  const setValue = useCallback(
    (newValue: string) => {
      setValueState(newValue);
      postToSandbox({ type: 'set-storage', key, value: newValue });
    },
    [key],
  );

  return [value, setValue, loading];
}
