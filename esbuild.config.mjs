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
    body { font-family: Inter, system-ui, -apple-system, sans-serif; font-size: 12px; color: #333; }
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
