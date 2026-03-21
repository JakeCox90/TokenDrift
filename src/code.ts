/// <reference types="@figma/plugin-typings" />
import type { UIToSandboxMessage, SandboxToUIMessage, NormalisedToken, LinkedLibrary } from './types';

figma.showUI(__html__, { width: 480, height: 600 });

figma.ui.onmessage = async (msg: UIToSandboxMessage) => {
  switch (msg.type) {
    case 'get-local-tokens': {
      try {
        const tokens = await getLocalTokens();
        sendToUI({ type: 'local-tokens', tokens });
      } catch (err) {
        sendToUI({ type: 'error', message: String(err) });
      }
      break;
    }
    case 'get-linked-libraries': {
      try {
        const libraries = await getLinkedLibraries();
        sendToUI({ type: 'linked-libraries', libraries });
      } catch (err) {
        // Always respond with linked-libraries so the UI doesn't hang
        sendToUI({ type: 'linked-libraries', libraries: [], error: String(err) });
      }
      break;
    }
    case 'get-storage': {
      const value = await figma.clientStorage.getAsync(msg.key);
      sendToUI({ type: 'storage-result', key: msg.key, value: value ?? null });
      break;
    }
    case 'set-storage': {
      try {
        await figma.clientStorage.setAsync(msg.key, msg.value);
        sendToUI({ type: 'storage-set', key: msg.key, success: true });
      } catch {
        sendToUI({ type: 'storage-set', key: msg.key, success: false });
      }
      break;
    }
  }
};

function sendToUI(msg: SandboxToUIMessage): void {
  figma.ui.postMessage(msg);
}

async function getLocalTokens(): Promise<NormalisedToken[]> {
  const tokens: NormalisedToken[] = [];

  // Variables
  const variables = await figma.variables.getLocalVariablesAsync();
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const collectionMap = new Map(collections.map(c => [c.id, c.name]));

  // Collect mode names so we can filter them out — these aren't real tokens
  const modeNames = new Set<string>();
  for (const c of collections) {
    for (const mode of c.modes) {
      modeNames.add(mode.name);
    }
  }

  for (const v of variables) {
    if (modeNames.has(v.name)) continue;
    tokens.push({
      name: v.name,
      type: 'VARIABLE',
      collection: collectionMap.get(v.variableCollectionId),
      resolvedType: v.resolvedType,
      sourceFile: 'local',
    });
  }

  // Paint styles
  const paintStyles = await figma.getLocalPaintStylesAsync();
  for (const s of paintStyles) {
    tokens.push({ name: s.name, type: 'PAINT_STYLE', sourceFile: 'local' });
  }

  // Text styles
  const textStyles = await figma.getLocalTextStylesAsync();
  for (const s of textStyles) {
    tokens.push({ name: s.name, type: 'TEXT_STYLE', sourceFile: 'local' });
  }

  // Effect styles
  const effectStyles = await figma.getLocalEffectStylesAsync();
  for (const s of effectStyles) {
    tokens.push({ name: s.name, type: 'EFFECT_STYLE', sourceFile: 'local' });
  }

  // Grid styles
  const gridStyles = await figma.getLocalGridStylesAsync();
  for (const s of gridStyles) {
    tokens.push({ name: s.name, type: 'GRID_STYLE', sourceFile: 'local' });
  }

  return tokens;
}

async function getLinkedLibraries(): Promise<LinkedLibrary[]> {
  const libraryMap = new Map<string, string[]>();

  // Variable collections
  if (figma.teamLibrary && typeof figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync === 'function') {
    try {
      const collections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
      for (const c of collections) {
        if (!libraryMap.has(c.libraryName)) {
          libraryMap.set(c.libraryName, []);
        }
        libraryMap.get(c.libraryName)!.push(c.key);
      }
    } catch (_) {
      // API not available in this context
    }
  }

  const libraries: LinkedLibrary[] = [];
  for (const _ref of libraryMap) {
    libraries.push({ name: _ref[0], collectionKeys: _ref[1] });
  }

  return libraries;
}
