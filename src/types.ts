// ─── Token & Style Normalisation ─────────────────────────────────────────────

/** The unified shape for both variables and styles from any source */
export interface NormalisedToken {
  /** Human-readable name, e.g. "Colour/Content/Text/Default" */
  name: string;
  /** What kind of design token this is */
  type: TokenType;
  /** Variable collection name (variables only, undefined for styles) */
  collection?: string;
  /** Resolved variable type (variables only) */
  resolvedType?: VariableResolvedType;
  /** File key or "local" for the current file */
  sourceFile: string;
}

export type TokenType =
  | 'VARIABLE'
  | 'PAINT_STYLE'
  | 'TEXT_STYLE'
  | 'EFFECT_STYLE'
  | 'GRID_STYLE';

export type VariableResolvedType =
  | 'BOOLEAN'
  | 'FLOAT'
  | 'STRING'
  | 'COLOR';

// ─── Diff Engine ─────────────────────────────────────────────────────────────

/** A single drift issue found during comparison */
export interface DriftIssue {
  /** The kind of discrepancy */
  type: DriftIssueType;
  /** What kind of token is affected */
  tokenType: TokenType;
  /** Token name in the source file (undefined if missing_in_source) */
  sourceName?: string;
  /** Token name in the comparison file (undefined if missing_in_comparison) */
  comparisonName?: string;
  /** File key of the source */
  sourceFile: string;
  /** File key of the comparison file */
  comparisonFile: string;
  /** Collection name (variables only) */
  collection?: string;
  /** Human-readable explanation of what's wrong (for naming_mismatch issues) */
  hint?: string;
}

export type DriftIssueType =
  | 'missing_in_source'
  | 'missing_in_comparison'
  | 'naming_mismatch';

// ─── File & Config ───────────────────────────────────────────────────────────

/** A reference to a Figma file used in comparison */
export interface FileReference {
  /** Figma file key (extracted from URL or entered directly) */
  fileKey: string;
  /** Human-readable label (file name or user-provided) */
  label: string;
  /** Thumbnail URL from Figma API */
  thumbnailUrl?: string;
  /** If this came from a linked library, the collection keys to fetch via Plugin API */
  libraryCollectionKeys?: string[];
}

/** How tokens are matched across files */
export type MatchStrategy =
  | 'full_name'
  | 'ignore_first_segment'
  | 'ignore_first_two_segments';

/** Full comparison configuration persisted in clientStorage */
export interface ComparisonConfig {
  /** Whether the source is the current file or an external file */
  sourceType: 'current' | 'external';
  /** File key for external source (undefined if sourceType is 'current') */
  sourceFileKey?: string;
  /** Files to compare against the source */
  comparisonFiles: FileReference[];
  /** How to match token names across files (default: ignore_first_segment) */
  matchStrategy?: MatchStrategy;
}

// ─── Libraries ──────────────────────────────────────────────────────────────

/** A linked library visible to the current file */
export interface LinkedLibrary {
  /** Library display name */
  name: string;
  /** Figma file key for this library (if extractable or user-provided) */
  fileKey?: string;
  /** Variable collection keys belonging to this library */
  collectionKeys: string[];
}

/** Stored mapping of library name → Figma file key (user-provided) */
export type LibraryFileKeys = Record<string, string>;

// ─── Sandbox ↔ UI Messages ──────────────────────────────────────────────────

/** Messages sent from UI to sandbox */
export type UIToSandboxMessage =
  | { type: 'get-local-tokens' }
  | { type: 'get-linked-libraries' }
  | { type: 'get-library-tokens'; collectionKeys: string[]; libraryName: string }
  | { type: 'get-storage'; key: string }
  | { type: 'set-storage'; key: string; value: string }
  | { type: 'restart' };

/** Messages sent from sandbox to UI */
export type SandboxToUIMessage =
  | { type: 'local-tokens'; tokens: NormalisedToken[] }
  | { type: 'linked-libraries'; libraries: LinkedLibrary[]; error?: string }
  | { type: 'library-tokens'; libraryName: string; tokens: NormalisedToken[] }
  | { type: 'storage-result'; key: string; value: string | null }
  | { type: 'storage-set'; key: string; success: boolean }
  | { type: 'error'; message: string };
