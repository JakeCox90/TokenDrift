# TokenDrift — MVP
**Status:** Draft
**Last updated:** 2026-03-17

## Problem
Design systems teams maintain multiple theme files in Figma (e.g., brand variants, sub-themes, white-label configs). Over time, these files drift apart — variables get renamed, styles diverge, tokens go missing from one file but not another. There is no built-in way to detect this drift. Teams discover it late, usually when a component breaks in production.

## Solution
A Figma plugin that lets you designate one theme file as the **source of truth**, link one or more comparison files, and run a diff to surface every discrepancy. The plugin reports:
- Variables present in source but missing from a comparison file (and vice versa)
- Variables with different names across files (potential renames)
- Styles present in source but missing from a comparison file (and vice versa)
- Styles with different names across files

The user sees a clear, filterable issue list showing what drifted, in which file, and what the source of truth expects.

## User Stories
1. As a design systems lead, I want to select my canonical theme file as the source of truth so that all comparisons are measured against it.
2. As a design systems lead, I want to link additional theme files for comparison so that I can audit multiple brands/themes at once.
3. As a designer, I want to see which variables exist in the source but are missing from a linked file so that I can add them.
4. As a designer, I want to see which variables exist in a linked file but not in the source so that I can decide whether to promote or remove them.
5. As a designer, I want to see which styles are missing or have different names so that I can align them.
6. As a designer, I want to filter issues by severity/type so that I can triage what to fix first.

## Acceptance Criteria
- [ ] User can select a Figma file as the source of truth (current file or via file key/URL)
- [ ] User can add one or more comparison files (via file key/URL)
- [ ] Plugin reads all variables (all types) from source and comparison files
- [ ] Plugin reads all styles (paint, text, effect, grid) from source and comparison files
- [ ] Plugin detects variables present in source but missing from comparison file
- [ ] Plugin detects variables present in comparison file but missing from source
- [ ] Plugin detects styles present in source but missing from comparison file
- [ ] Plugin detects styles present in comparison file but missing from source
- [ ] Issues displayed in a list grouped by file, with type (missing variable, missing style, name mismatch) clearly labelled
- [ ] User can filter/search the issue list
- [ ] Plugin handles API errors gracefully (invalid file key, auth failure, rate limit)
- [ ] Plugin persists linked files between sessions (via `clientStorage`)

## Architecture

### Hybrid Plugin API + REST API

**Why hybrid:** The Figma Plugin API gives full access to the *current* file's variables and styles. But for external files, the library API only returns name/key/type — no values, no modes, no style properties. Importing variables via `importVariableByKeyAsync()` is slow (~2s per collection) and creates references in the current file (unwanted side effect for a read-only comparison tool).

**Solution:** Use the **Figma REST API** from the plugin's UI iframe to fetch full variable and style data from external files. This is read-only, fast, and has no side effects.

| Data | Current File | External Files |
|------|-------------|----------------|
| Variables | Plugin API: `figma.variables.getLocalVariablesAsync()` | REST API: `GET /v1/files/:key/variables/local` |
| Styles | Plugin API: `figma.getLocalPaintStylesAsync()` etc. | REST API: `GET /v1/files/:key/styles` |

**Auth:** The REST API requires a Personal Access Token. The plugin will prompt for this on first run and store it in `figma.clientStorage`.

### Plugin Structure

```
tokendrift/
  manifest.json
  src/
    code.ts          # Sandbox — reads current file data via Plugin API
    ui/
      App.tsx        # React UI
      components/    # UI components
      api/           # REST API client for external files
      diff/          # Comparison/diff engine (pure logic, no Figma deps)
      types.ts       # Shared type definitions
  dist/
    code.js
    ui.html
  package.json
  tsconfig.json
```

### Data Flow

1. User opens plugin → UI loads → reads persisted config from `clientStorage`
2. User sets source of truth (current file or external file key)
3. User adds comparison files (file keys)
4. User clicks "Run Comparison"
5. **If source is current file:** sandbox reads local variables/styles via Plugin API, posts to UI
6. **For all external files:** UI iframe calls REST API directly (requires PAT + `networkAccess` in manifest)
7. Diff engine normalises data from both sources into a common shape and runs comparison
8. Results displayed in UI

### Diff Engine (Core Logic)

The diff engine operates on normalised token lists. It is a pure function with no Figma dependencies — fully unit-testable.

**Normalised Token shape:**
```typescript
interface NormalisedToken {
  name: string           // e.g., "Colour/Content/Text/Default"
  type: 'VARIABLE' | 'PAINT_STYLE' | 'TEXT_STYLE' | 'EFFECT_STYLE' | 'GRID_STYLE'
  collection?: string    // variable collection name (variables only)
  resolvedType?: string  // BOOLEAN | FLOAT | STRING | COLOR (variables only)
  sourceFile: string     // file key or "local"
}
```

**Diff output:**
```typescript
interface DriftIssue {
  type: 'missing_in_source' | 'missing_in_comparison' | 'name_mismatch'
  tokenType: NormalisedToken['type']
  sourceName?: string
  comparisonName?: string
  sourceFile: string
  comparisonFile: string
  collection?: string
}
```

**Comparison rules (MVP):**
- Match by `collection + name` for variables, by `name` for styles
- If a token exists in source but not in comparison → `missing_in_comparison`
- If a token exists in comparison but not in source → `missing_in_source`
- Name mismatch detection deferred to post-MVP (requires fuzzy matching or key-based matching)

## Execution Order
1. Project scaffolding — manifest, build tooling, TypeScript config
2. Type definitions — normalised token shapes, diff issue types
3. REST API client — fetch variables and styles from external files by key
4. Plugin sandbox code — read current file variables and styles, post to UI
5. Diff engine — pure comparison logic, fully unit-tested
6. UI shell — React app with file management (add/remove source and comparison files)
7. UI results view — issue list with grouping, filtering, search
8. Persistence — save/load linked files and PAT via `clientStorage`
9. Error handling — invalid keys, auth failures, rate limits, empty files
10. Polish — loading states, empty states, edge case messaging

## Out of Scope (MVP)
- Value comparison (detecting same-named tokens with different values)
- Fuzzy/rename detection (e.g., "color.primary" vs "colour.primary")
- Auto-fix / sync capabilities
- Figma REST API OAuth flow (MVP uses Personal Access Token)
- Mode comparison (e.g., Light vs Dark mode value differences)
- Publishing status checks
- Export/report generation

## Open Questions
- Should we support "current file as source" AND "external file as source", or only current file? **Decision: support both — external file via REST API, current file via Plugin API.**
- Rate limiting: Figma REST API has rate limits. For MVP, show a clear error. Post-MVP, add queuing. **Decision: MVP shows error, no retry logic.**

## Tech Stack
- **Language:** TypeScript (strict mode)
- **UI Framework:** Preact (lighter than React, standard for Figma plugins)
- **Build:** esbuild (fast, handles both sandbox and UI bundles)
- **Testing:** Vitest (for diff engine unit tests)
- **Styling:** CSS Modules or inline styles (plugin iframe constraints)
