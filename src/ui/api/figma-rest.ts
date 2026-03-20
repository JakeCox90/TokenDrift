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

  for (const variable of Object.values(variables)) {
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
    variableCollections: Record<string, { name: string }>;
    variables: Record<
      string,
      {
        name: string;
        variableCollectionId: string;
        resolvedType: string;
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
