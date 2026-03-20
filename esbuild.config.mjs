import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

const isWatch = process.argv.includes('--watch');

// Build the plugin sandbox (code.ts → dist/code.js)
const sandboxConfig = {
  entryPoints: ['src/code.ts'],
  bundle: true,
  outfile: 'dist/code.js',
  target: 'es2017',
  format: 'iife',
  logLevel: 'info',
};

// Build the UI (ui/index.tsx → temporary JS, then wrap in HTML)
const uiConfig = {
  entryPoints: ['src/ui/index.tsx'],
  bundle: true,
  outfile: 'dist/ui.js',
  target: 'es2020',
  format: 'iife',
  jsxImportSource: 'preact',
  jsx: 'automatic',
  logLevel: 'info',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
};

function buildHtml() {
  mkdirSync('dist', { recursive: true });
  let js = '';
  try {
    js = readFileSync('dist/ui.js', 'utf8');
  } catch {
    // ui.js not built yet
  }
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px;
      color: var(--figma-color-text);
      background: var(--figma-color-bg);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    input:focus, select:focus {
      border-color: var(--figma-color-border-brand) !important;
      box-shadow: 0 0 0 3px var(--figma-color-bg-brand-tertiary), inset 0 1px 2px rgba(0,0,0,0.06) !important;
    }
    input::placeholder { color: var(--figma-color-text-tertiary); }
    button:hover:not(:disabled) { filter: brightness(0.95); }
    button:active:not(:disabled) { transform: scale(0.98); }
    select { -webkit-appearance: none; appearance: none; background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px !important; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--figma-color-border); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--figma-color-text-tertiary); }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>${js}</script>
</body>
</html>`;
  writeFileSync('dist/ui.html', html);
}

async function build() {
  await esbuild.build(sandboxConfig);
  await esbuild.build(uiConfig);
  buildHtml();
  console.log('Build complete');
}

async function watch() {
  const sandboxCtx = await esbuild.context(sandboxConfig);
  const uiCtx = await esbuild.context({
    ...uiConfig,
    plugins: [{
      name: 'html-wrapper',
      setup(build) {
        build.onEnd(() => buildHtml());
      },
    }],
  });
  await sandboxCtx.watch();
  await uiCtx.watch();
  console.log('Watching for changes...');
}

if (isWatch) {
  watch();
} else {
  build();
}
