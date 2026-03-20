import { useState, useEffect, useCallback } from 'preact/hooks';
import type { SandboxToUIMessage } from '../../types';

/** Post a message to the plugin sandbox */
function postToSandbox(msg: unknown): void {
  parent.postMessage({ pluginMessage: msg }, '*');
}

/**
 * Read/write a value in Figma clientStorage via the plugin sandbox.
 * Returns [value, setValue, isLoading].
 * Times out after 2s so the UI never gets stuck on "Loading".
 */
export function useStorage(
  key: string,
): [string | null, (value: string) => void, boolean] {
  const [value, setValueState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let settled = false;

    const handler = (event: MessageEvent) => {
      // Figma wraps messages in event.data.pluginMessage
      const msg = event.data?.pluginMessage as SandboxToUIMessage | undefined;
      if (!msg) return;

      if (msg.type === 'storage-result' && msg.key === key) {
        settled = true;
        setValueState(msg.value);
        setLoading(false);
      }
    };

    window.addEventListener('message', handler);
    postToSandbox({ type: 'get-storage', key });

    // Timeout — don't block the UI forever if sandbox doesn't respond
    const timeout = setTimeout(() => {
      if (!settled) {
        setLoading(false);
      }
    }, 2000);

    return () => {
      window.removeEventListener('message', handler);
      clearTimeout(timeout);
    };
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
