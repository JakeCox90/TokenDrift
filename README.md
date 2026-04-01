# TokenDrift

A Figma plugin that detects design token drift across theme files. Compare variables and styles between your source file and linked libraries or external files to surface missing tokens, naming mismatches, and relocated tokens.

## Features

- **Source selection** — compare from the current Figma file or an external file via URL
- **Library comparison** — compare against linked Figma libraries with automatic collection detection
- **REST API integration** — paste a library's file URL to always fetch fresh data via the Figma REST API, bypassing Plugin API caching
- **Smart matching** — three match strategies: ignore top-level group (default), ignore top two groups, or exact full name
- **Near-match detection** — detects naming issues across files:
  - Case differences (`Primary/Resting` vs `primary/resting`)
  - Separator differences (`fill-primary` vs `fill_primary`)
  - Number padding (`border-width-00` vs `border-width-0`)
  - Spelling variants (`colour` vs `color`, `grey` vs `gray`)
  - Relocated tokens (same token in different folder paths)
- **Filterable results** — clickable filter tabs (Missing, Extensions, Mismatches) with multi-select support; flat row view when filtered, tree view for browsing all
- **Search** — expandable search to find specific tokens
- **Aligned collections** — collections with zero drift shown at the bottom for quick confirmation

## Issue Types

| Type | Description |
|------|-------------|
| **Missing** | Token exists in the source but not in the comparison file |
| **Extension** | Token exists in the comparison file but not in the source |
| **Name mismatch** | Token exists in both files but with a naming discrepancy |

## Setup

### Prerequisites

- Node.js 18+
- A Figma Personal Access Token (PAT) for comparing external files or libraries via REST API

### Install

```bash
npm install
```

### Build

```bash
npm run build
```

This outputs `dist/code.js` (plugin sandbox) and `dist/ui.js` (UI iframe).

### Development

```bash
npm run watch
```

### Load in Figma

1. Open a Figma file
2. Go to **Plugins > Development > Import plugin from manifest...**
3. Select the `manifest.json` file from this repo
4. Run the plugin from the Plugins menu

### Test

```bash
npm test
```

## Usage

1. **Set your access token** — click the settings icon next to "Run Comparison" and paste your Figma PAT
2. **Choose a source** — "Current file" uses the open Figma file; "External file" lets you paste a URL
3. **Select a comparison file** — pick a linked library from the Libraries tab, a recent file, or paste a URL
4. **Link library file URLs** (optional) — for libraries, paste the Figma file URL inside the selected library row to enable always-fresh REST API data
5. **Configure matching** — open settings to choose a match strategy
6. **Run Comparison** — review results grouped by collection, or use filter tabs to focus on specific issue types

## Architecture

- **`src/code.ts`** — Plugin sandbox: extracts local tokens/styles, fetches linked libraries via Plugin API
- **`src/ui/App.tsx`** — Main UI: orchestrates comparison flow, manages state and config persistence
- **`src/ui/diff/engine.ts`** — Pure diff engine: compares token sets, detects near-matches (no Figma dependencies)
- **`src/ui/api/figma-rest.ts`** — REST API client: fetches variables and styles from external files with cache busting
- **`src/ui/components/SetupView.tsx`** — Setup UI: source/comparison selection, library linking, settings
- **`src/ui/components/ResultsView.tsx`** — Results UI: tree view, flat filtered view, filter tabs, search
- **`src/ui/styles.ts`** — Design tokens for the plugin UI (brand colour `#7695EF`, WCAG AA compliant)
- **`src/types.ts`** — Shared types for tokens, drift issues, config, and sandbox/UI messages

## Token Storage

- **Personal Access Token** — stored in Figma `clientStorage`, never transmitted beyond Figma API calls
- **Comparison config** — persisted in `clientStorage` between sessions
- **Library file key mappings** — persisted in `clientStorage` so you don't need to re-enter URLs
- **Recent files** — last 5 compared files stored in `clientStorage`
