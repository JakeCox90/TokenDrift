import type { NormalisedToken, VariableResolvedType } from '../../types';

const FIGMA_API_BASE = 'https://api.figma.com/v1';

export class FigmaApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fileKey: string,
  ) {
    super(message);
    this.name = 'FigmaApiError';
  }
}

/** Fetch and normalise variables from an external Figma file */
export async function fetchFileVariables(
  fileKey: string,
  token: string,
): Promise<NormalisedToken[]> {
  const data = await figmaFetch<FigmaVariablesResponse>(
    `/files/${fileKey}/variables/local`,
    token,
    fileKey,
  );

  const collections = data.meta.variableCollections;
  const variables = data.meta.variables;
  const tokens: NormalisedToken[] = [];

  // Build a set of mode names per collection so we can filter them out.
  // Figma collections have modes (e.g. "Light", "Dark", "Mode 1") that
  // appear in the API response but aren't real design tokens.
  const modeNames = new Set<string>();
  for (const collection of Object.values(collections)) {
    if (collection.modes) {
      for (const mode of collection.modes) {
        modeNames.add(mode.name);
      }
    }
  }

  // Build a set of valid (non-remote, non-deleted) collection IDs
  const validCollections = new Set<string>();
  for (const [id, collection] of Object.entries(collections)) {
    if (!collection.remote) {
      validCollections.add(id);
    }
  }

  for (const variable of Object.values(variables)) {
    // Skip deleted, remote, or mode-named variables
    if (variable.deletedButReferenced) continue;
    if (variable.remote) continue;
    if (modeNames.has(variable.name)) continue;
    // Skip variables from remote/library collections
    if (!validCollections.has(variable.variableCollectionId)) continue;

    const collection = collections[variable.variableCollectionId];
    tokens.push({
      name: variable.name,
      type: 'VARIABLE',
      collection: collection?.name,
      resolvedType: variable.resolvedType as VariableResolvedType,
      sourceFile: fileKey,
    });
  }

  return tokens;
}

/** Fetch and normalise styles from an external Figma file */
export async function fetchFileStyles(
  fileKey: string,
  token: string,
): Promise<NormalisedToken[]> {
  const data = await figmaFetch<FigmaStylesResponse>(
    `/files/${fileKey}/styles`,
    token,
    fileKey,
  );

  return data.meta.styles.map(style => ({
    name: style.name,
    type: mapStyleType(style.style_type),
    sourceFile: fileKey,
  }));
}

/** Fetch file metadata (name + thumbnail) for a given file key */
export async function fetchFileInfo(
  fileKey: string,
  token: string,
): Promise<{ name: string; thumbnailUrl?: string }> {
  const data = await figmaFetch<{ name: string; thumbnailUrl?: string }>(
    `/files/${fileKey}?depth=1`,
    token,
    fileKey,
  );
  return { name: data.name, thumbnailUrl: data.thumbnailUrl };
}

/** Fetch both variables and styles, returning a combined token list */
export async function fetchFileTokens(
  fileKey: string,
  token: string,
): Promise<NormalisedToken[]> {
  const [variables, styles] = await Promise.all([
    fetchFileVariables(fileKey, token),
    fetchFileStyles(fileKey, token),
  ]);
  return [...variables, ...styles];
}

async function figmaFetch<T>(
  path: string,
  token: string,
  fileKey: string,
): Promise<T> {
  const response = await fetch(`${FIGMA_API_BASE}${path}`, {
    headers: { 'X-Figma-Token': token },
  });

  if (!response.ok) {
    const message = await errorMessage(response);
    throw new FigmaApiError(message, response.status, fileKey);
  }

  return response.json() as Promise<T>;
}

async function errorMessage(response: Response): Promise<string> {
  switch (response.status) {
    case 403:
      return 'Invalid or expired access token';
    case 404:
      return 'File not found — check the file key';
    case 429:
      return 'Rate limited — please wait and try again';
    default:
      try {
        const body = await response.text();
        return `Figma API error (${response.status}): ${body}`;
      } catch {
        return `Figma API error (${response.status})`;
      }
  }
}

function mapStyleType(figmaType: string): NormalisedToken['type'] {
  switch (figmaType) {
    case 'FILL':
      return 'PAINT_STYLE';
    case 'TEXT':
      return 'TEXT_STYLE';
    case 'EFFECT':
      return 'EFFECT_STYLE';
    case 'GRID':
      return 'GRID_STYLE';
    default:
      return 'PAINT_STYLE';
  }
}

// ─── Figma API Response Types ────────────────────────────────────────────────

interface FigmaVariablesResponse {
  meta: {
    variableCollections: Record<
      string,
      {
        name: string;
        modes: Array<{ modeId: string; name: string }>;
        remote?: boolean;
        hiddenFromPublishing?: boolean;
      }
    >;
    variables: Record<
      string,
      {
        name: string;
        variableCollectionId: string;
        resolvedType: string;
        /** True if the variable was deleted but is still referenced somewhere */
        deletedButReferenced?: boolean;
        /** True if hidden from library publishing */
        hiddenFromPublishing?: boolean;
        /** True if this is a remote (library) variable, not local */
        remote?: boolean;
      }
    >;
  };
}

interface FigmaStylesResponse {
  meta: {
    styles: Array<{
      name: string;
      style_type: string;
    }>;
  };
}
