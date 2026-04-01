import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchFileVariables, fetchFileStyles, fetchFileTokens, FigmaApiError } from './figma-rest';

const TOKEN = 'figd_test-token';
const FILE_KEY = 'abc123';

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('fetchFileVariables', () => {
  it('normalises variables from API response', async () => {
    const apiResponse = {
      meta: {
        variableCollections: {
          'vc:1': { name: 'Brand', modes: [{ modeId: 'm:1', name: 'Default' }] },
          'vc:2': { name: 'Layout', modes: [{ modeId: 'm:2', name: 'Default' }] },
        },
        variables: {
          'v:1': { name: 'color/primary', variableCollectionId: 'vc:1', resolvedType: 'COLOR' },
          'v:2': { name: 'spacing/sm', variableCollectionId: 'vc:2', resolvedType: 'FLOAT' },
        },
      },
    };

    globalThis.fetch = mockFetch(apiResponse);
    const tokens = await fetchFileVariables(FILE_KEY, TOKEN);

    expect(tokens).toHaveLength(2);
    expect(tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'color/primary',
          type: 'VARIABLE',
          collection: 'Brand',
          resolvedType: 'COLOR',
          sourceFile: FILE_KEY,
        }),
        expect.objectContaining({
          name: 'spacing/sm',
          type: 'VARIABLE',
          collection: 'Layout',
          resolvedType: 'FLOAT',
          sourceFile: FILE_KEY,
        }),
      ]),
    );
  });

  it('returns empty array for file with no variables', async () => {
    globalThis.fetch = mockFetch({
      meta: { variableCollections: {}, variables: {} },
    });
    const tokens = await fetchFileVariables(FILE_KEY, TOKEN);
    expect(tokens).toEqual([]);
  });

  it('filters out variables whose name matches a mode name', async () => {
    const apiResponse = {
      meta: {
        variableCollections: {
          'vc:1': { name: 'Brand', modes: [{ modeId: 'm:1', name: 'Light' }, { modeId: 'm:2', name: 'Dark' }] },
        },
        variables: {
          'v:1': { name: 'color/primary', variableCollectionId: 'vc:1', resolvedType: 'COLOR' },
          'v:2': { name: 'Light', variableCollectionId: 'vc:1', resolvedType: 'STRING' },
          'v:3': { name: 'Dark', variableCollectionId: 'vc:1', resolvedType: 'STRING' },
        },
      },
    };
    globalThis.fetch = mockFetch(apiResponse);
    const tokens = await fetchFileVariables(FILE_KEY, TOKEN);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].name).toBe('color/primary');
  });

  it('filters out deleted and remote variables', async () => {
    const apiResponse = {
      meta: {
        variableCollections: {
          'vc:1': { name: 'Brand', modes: [{ modeId: 'm:1', name: 'Default' }] },
          'vc:2': { name: 'Old Library', modes: [{ modeId: 'm:2', name: 'Default' }], remote: true },
        },
        variables: {
          'v:1': { name: 'color/primary', variableCollectionId: 'vc:1', resolvedType: 'COLOR' },
          'v:2': { name: 'old/token', variableCollectionId: 'vc:1', resolvedType: 'COLOR', deletedButReferenced: true },
          'v:3': { name: 'remote/token', variableCollectionId: 'vc:1', resolvedType: 'COLOR', remote: true },
          'v:4': { name: 'library/token', variableCollectionId: 'vc:2', resolvedType: 'COLOR' },
        },
      },
    };
    globalThis.fetch = mockFetch(apiResponse);
    const tokens = await fetchFileVariables(FILE_KEY, TOKEN);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].name).toBe('color/primary');
  });

  it('sends X-Figma-Token header', async () => {
    const fetchMock = mockFetch({ meta: { variableCollections: {}, variables: {} } });
    globalThis.fetch = fetchMock;
    await fetchFileVariables(FILE_KEY, TOKEN);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/files/${FILE_KEY}/variables/local`),
      expect.objectContaining({
        headers: { 'X-Figma-Token': TOKEN },
      }),
    );
  });
});

describe('fetchFileStyles', () => {
  it('uses styles from file endpoint when available', async () => {
    const apiResponse = {
      name: 'Test File',
      styles: {
        '1:1': { name: 'Brand/Primary', styleType: 'FILL' },
        '1:2': { name: 'Heading/H1', styleType: 'TEXT' },
        '1:3': { name: 'Shadow/MD', styleType: 'EFFECT' },
        '1:4': { name: 'Grid/12col', styleType: 'GRID' },
      },
    };

    globalThis.fetch = mockFetch(apiResponse);
    const tokens = await fetchFileStyles(FILE_KEY, TOKEN);

    expect(tokens).toHaveLength(4);
    expect(tokens).toEqual(
      expect.arrayContaining([
        { name: 'Brand/Primary', type: 'PAINT_STYLE', sourceFile: FILE_KEY },
        { name: 'Heading/H1', type: 'TEXT_STYLE', sourceFile: FILE_KEY },
        { name: 'Shadow/MD', type: 'EFFECT_STYLE', sourceFile: FILE_KEY },
        { name: 'Grid/12col', type: 'GRID_STYLE', sourceFile: FILE_KEY },
      ]),
    );
  });

  it('falls back to published styles endpoint when file styles map is empty', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: /files/{key}?depth=1 — no styles
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ name: 'Test File' }),
        });
      }
      // Second call: /files/{key}/styles — published styles
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          meta: {
            styles: [
              { name: 'Brand/Primary', style_type: 'FILL' },
              { name: 'Heading/H1', style_type: 'TEXT' },
            ],
          },
        }),
      });
    });

    const tokens = await fetchFileStyles(FILE_KEY, TOKEN);

    expect(tokens).toHaveLength(2);
    expect(tokens).toEqual([
      { name: 'Brand/Primary', type: 'PAINT_STYLE', sourceFile: FILE_KEY },
      { name: 'Heading/H1', type: 'TEXT_STYLE', sourceFile: FILE_KEY },
    ]);
  });

  it('returns empty array for file with no styles at all', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ name: 'Empty File' }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ meta: { styles: [] } }),
      });
    });

    const tokens = await fetchFileStyles(FILE_KEY, TOKEN);
    expect(tokens).toEqual([]);
  });
});

describe('fetchFileTokens', () => {
  it('combines variables and styles', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('variables')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            meta: {
              variableCollections: { 'vc:1': { name: 'Brand', modes: [{ modeId: 'm:1', name: 'Default' }] } },
              variables: { 'v:1': { name: 'primary', variableCollectionId: 'vc:1', resolvedType: 'COLOR' } },
            },
          }),
        });
      }
      if (url.includes('depth=1')) {
        // /files/{key}?depth=1 — styles from file endpoint
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            name: 'Test File',
            styles: {
              '1:1': { name: 'Fill/Primary', styleType: 'FILL' },
            },
          }),
        });
      }
      // fallback styles endpoint (shouldn't be reached here)
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ meta: { styles: [] } }),
      });
    });

    const tokens = await fetchFileTokens(FILE_KEY, TOKEN);
    expect(tokens).toHaveLength(2);
    expect(tokens.find(t => t.type === 'VARIABLE')).toBeDefined();
    expect(tokens.find(t => t.type === 'PAINT_STYLE')).toBeDefined();
  });
});

describe('error handling', () => {
  it('throws FigmaApiError on 403', async () => {
    globalThis.fetch = mockFetch({}, 403);
    await expect(fetchFileVariables(FILE_KEY, TOKEN)).rejects.toThrow(FigmaApiError);
    await expect(fetchFileVariables(FILE_KEY, TOKEN)).rejects.toThrow('Invalid or expired access token');
  });

  it('throws FigmaApiError on 404', async () => {
    globalThis.fetch = mockFetch({}, 404);
    await expect(fetchFileVariables(FILE_KEY, TOKEN)).rejects.toThrow('File not found');
  });

  it('throws FigmaApiError on 429', async () => {
    globalThis.fetch = mockFetch({}, 429);
    await expect(fetchFileStyles(FILE_KEY, TOKEN)).rejects.toThrow('Rate limited');
  });

  it('includes status and fileKey on error', async () => {
    globalThis.fetch = mockFetch({}, 403);
    try {
      await fetchFileVariables(FILE_KEY, TOKEN);
    } catch (err) {
      expect(err).toBeInstanceOf(FigmaApiError);
      expect((err as FigmaApiError).status).toBe(403);
      expect((err as FigmaApiError).fileKey).toBe(FILE_KEY);
    }
  });
});
