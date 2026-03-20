import { useState } from 'preact/hooks';

export function App() {
  const [status, setStatus] = useState('Ready');

  const handleTest = () => {
    parent.postMessage({ pluginMessage: { type: 'get-local-tokens' } }, '*');
    setStatus('Requested local tokens...');
  };

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
        TokenDrift
      </h2>
      <p style={{ color: '#666', marginBottom: '16px' }}>
        Detect design token drift across theme files.
      </p>
      <button
        onClick={handleTest}
        style={{
          padding: '8px 16px',
          background: '#18A0FB',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 500,
        }}
      >
        Test Connection
      </button>
      <p style={{ marginTop: '12px', color: '#999', fontSize: '11px' }}>
        {status}
      </p>
    </div>
  );
}
