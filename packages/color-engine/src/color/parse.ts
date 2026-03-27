export type RgbColor = { r: number; g: number; b: number; a?: number };

/**
 * Parses a hex string into an RGB object.
 * Supports #RRGGBB, #RGB.
 */
export function parseHex(hex: string): RgbColor | null {
  let cleaned = hex.trim();
  if (cleaned.startsWith('#')) {
    cleaned = cleaned.slice(1);
  }

  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return { r, g, b, a: 1 };
  }

  if (cleaned.length === 6) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return { r, g, b, a: 1 };
  }

  if (cleaned.length === 8) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    const a = parseInt(cleaned.slice(6, 8), 16) / 255;
    if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) return null;
    return { r, g, b, a };
  }

  return null;
}

/**
 * Converts an RGB object to a hex string.
 */
export function toHex({ r, g, b }: RgbColor): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  return (
    '#' +
    [r, g, b]
      .map((c) => clamp(c).toString(16).padStart(2, '0'))
      .join('')
  ).toLowerCase();
}
