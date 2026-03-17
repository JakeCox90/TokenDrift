# Phase 1 — MVP Build Plan

**PRD:** docs/prd/PRD-001-token-drift-mvp.md
**Status:** Not Started
**Target:** Functional plugin that compares variables and styles across Figma theme files

---

## Milestone 1: Project Scaffolding

### Task 1.1 — Initialise project
- `npm init`, install dev dependencies (typescript, esbuild, preact, vitest)
- Create `tsconfig.json` (strict mode, Preact JSX)
- Create `manifest.json` with `documentAccess: "dynamic-page"` and `networkAccess` for Figma API
- Create esbuild config (two entry points: `src/code.ts` → `dist/code.js`, `src/ui/index.tsx` → `dist/ui.html`)
- Add npm scripts: `build`, `watch`, `test`
- Verify plugin loads in Figma with a "Hello World" UI

**AC:**
- [ ] `npm run build` produces `dist/code.js` and `dist/ui.html`
- [ ] Plugin loads in Figma dev mode without errors
- [ ] UI iframe renders

### Task 1.2 — Type definitions
- Create `src/types.ts` with all shared types:
  - `NormalisedToken`, `DriftIssue`, `FileReference`, `ComparisonConfig`
  - Message types for sandbox ↔ UI communication
- These types are the contract between all modules — get them right first

**AC:**
- [ ] Types compile with no errors
- [ ] Types cover: tokens, issues, file references, messages

---

## Milestone 2: Data Extraction

### Task 2.1 — Plugin sandbox: read current file
- `src/code.ts`: on message from UI, read all local variables and styles
- Normalise into `NormalisedToken[]` shape
- Post normalised data back to UI
- Handle: empty file (no variables/styles), partial data (variables but no styles)

**AC:**
- [ ] Sandbox reads all variable types (COLOR, FLOAT, STRING, BOOLEAN)
- [ ] Sandbox reads all style types (paint, text, effect, grid)
- [ ] Data normalised to `NormalisedToken[]`
- [ ] Empty file handled gracefully

### Task 2.2 — REST API client: read external files
- `src/ui/api/figma-rest.ts`: functions to fetch variables and styles from external files
- `fetchFileVariables(fileKey, token)` → normalised tokens
- `fetchFileStyles(fileKey, token)` → normalised tokens
- Handle: invalid file key (404), bad token (403), rate limit (429), network error
- Unit tests for normalisation logic (mock API responses)

**AC:**
- [ ] Fetches variables from external file via REST API
- [ ] Fetches styles from external file via REST API
- [ ] Normalises to same `NormalisedToken[]` shape as sandbox output
- [ ] Error handling for 403, 404, 429
- [ ] Unit tests for normalisation

---

## Milestone 3: Diff Engine

### Task 3.1 — Core comparison logic
- `src/ui/diff/engine.ts`: pure function, no Figma dependencies
- Input: source `NormalisedToken[]`, comparison `NormalisedToken[]`
- Output: `DriftIssue[]`
- Logic:
  - Variables matched by `collection + name`
  - Styles matched by `name`
  - Missing in comparison → `missing_in_comparison`
  - Missing in source → `missing_in_source`
- Comprehensive unit tests with edge cases:
  - Empty source, empty comparison, both empty
  - Identical files (zero issues)
  - Completely disjoint files
  - Partial overlap
  - Multiple collections

**AC:**
- [ ] Detects missing variables (both directions)
- [ ] Detects missing styles (both directions)
- [ ] Matches variables by collection + name
- [ ] Matches styles by name
- [ ] Pure function, no side effects
- [ ] Unit tests: ≥90% coverage on diff engine

---

## Milestone 4: UI

### Task 4.1 — File management UI
- Source of truth selector: "Use current file" toggle OR paste file key/URL
- Comparison file list: add by file key/URL, remove, reorder
- PAT input: secure field, stored in `clientStorage`, shown only on first run or when invalid
- "Run Comparison" button
- Persist config via `figma.clientStorage`

**AC:**
- [ ] User can set source (current file or external)
- [ ] User can add/remove comparison files
- [ ] PAT stored securely in clientStorage
- [ ] Config persists between plugin sessions
- [ ] File key extracted from full Figma URLs

### Task 4.2 — Results view
- Issue list grouped by comparison file
- Each issue shows: type icon, token name, token type, which file
- Filter by issue type (missing variable, missing style)
- Search by token name
- Summary bar: total issues, breakdown by type
- Empty state: "No drift detected" or "No files linked yet"
- Loading state during comparison

**AC:**
- [ ] Issues grouped by file
- [ ] Each issue clearly labelled with type and token name
- [ ] Filter by issue type works
- [ ] Search by name works
- [ ] Summary counts displayed
- [ ] Loading, empty, and error states handled

---

## Milestone 5: Integration & Polish

### Task 5.1 — End-to-end wiring
- Connect all pieces: UI triggers comparison → sandbox reads local file → UI reads external files via REST → diff engine runs → results displayed
- Test with real Figma files (at least 2 theme files with known differences)

**AC:**
- [ ] Full flow works: configure → compare → view results
- [ ] Works with current file as source
- [ ] Works with external file as source
- [ ] Handles multiple comparison files

### Task 5.2 — Error handling & edge cases
- Invalid/expired PAT → clear error, prompt to re-enter
- File not found → mark file as invalid in UI, don't block other comparisons
- Rate limited → show message, suggest waiting
- File with no variables or styles → show info, not error
- Very large files → loading indicator, no timeout

**AC:**
- [ ] Every error state has a user-visible message
- [ ] One bad file doesn't block comparison of other files
- [ ] No unhandled promise rejections

---

## Dependency Graph

```
1.1 Scaffolding
 └─▶ 1.2 Types
      ├─▶ 2.1 Sandbox (current file)
      ├─▶ 2.2 REST client (external files)
      └─▶ 3.1 Diff engine
           └─▶ 4.1 File management UI
                └─▶ 4.2 Results view
                     └─▶ 5.1 Integration
                          └─▶ 5.2 Error handling
```

Tasks 2.1, 2.2, and 3.1 can run in parallel once types are defined.
Tasks 4.1 and 4.2 can be worked concurrently.

---

## Technical Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| UI framework | Preact | Lighter than React, standard for Figma plugins, same API |
| Build tool | esbuild | Sub-second builds, native TS support, no config bloat |
| External file access | REST API | Plugin API library access is read-only metadata only — no values, no modes. REST gives full data with no side effects |
| Token matching | Collection + name | Keys are internal IDs and not human-meaningful. Name-based matching is what designers think in |
| State management | Preact signals or simple useState | MVP doesn't need a state library |
| Testing | Vitest | Fast, native TS, ESM support, compatible with esbuild |

---

## GATE Items (require human decision before proceeding)
- None identified for MVP. PAT-based auth is standard for Figma plugins; no OAuth needed.

## Risks
- **Figma REST API rate limits**: 30 req/min for variables endpoint. For MVP with 2-3 comparison files this is fine. Post-MVP may need queuing.
- **Large files**: Files with 500+ variables could be slow to fetch and diff. MVP accepts this; post-MVP could add pagination or caching.
- **REST API access**: Requires a Figma access token with file read permissions. Enterprise orgs may restrict this.
