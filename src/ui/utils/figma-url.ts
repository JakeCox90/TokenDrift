/**
 * Extract a Figma file key from a full URL or raw key.
 * Supports formats:
 *   - https://www.figma.com/file/ABC123/File-Name
 *   - https://www.figma.com/design/ABC123/File-Name
 *   - ABC123 (raw key)
 */
export function extractFileKey(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try URL patterns
  const urlMatch = trimmed.match(
    /figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/,
  );
  if (urlMatch) return urlMatch[1];

  // Raw key — alphanumeric, typically 20+ chars
  if (/^[a-zA-Z0-9]+$/.test(trimmed) && trimmed.length >= 10) {
    return trimmed;
  }

  return null;
}
