import { RgbColor } from '../models/types';

export function parseHex(input: string): RgbColor | null {
  const hex = input.replace(/^#/, '');

  if (hex.length === 3) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
    };
  }

  if (hex.length === 6) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  // 8桁(#RRGGBBAA)はWorker側でアルファ合成済みのHEXが来るため
  // ここでは上位6桁だけ読む
  if (hex.length === 8) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  return null;
}

export function parseRgbString(input: string): RgbColor | null {
  // Worker側でrgba→HEX変換済みのため、ここに来るのは稀だがフォールバックとして残す
  // 空白区切り記法(CSS Color Level 4)にも対応
  const match =
    input.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*[\d.]+)?\s*\)$/i) ??
    input.match(/^rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.%]+)?\s*\)$/i);
  if (match) {
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
    };
  }
  return null;
}

export function parseHslString(input: string): RgbColor | null {
  const match =
    input.match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*[\d.]+)?\s*\)$/i) ??
    input.match(/^hsla?\(\s*([\d.]+(?:deg)?)\s+([\d.]+)%\s+([\d.]+)%(?:\s*\/\s*[\d.%]+)?\s*\)$/i);
  if (!match) return null;

  const h = parseFloat(match[1]) % 360;
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if      (h < 60)  { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function normalizeColorString(input: string): string | null {
  if (!input) return null;
  // Worker側で全色をHEXに変換済みなのでparseHexが主経路
  const hex = parseHex(input);
  if (hex) return toHex(hex);
  const rgb = parseRgbString(input);
  if (rgb) return toHex(rgb);
  const hsl = parseHslString(input);
  if (hsl) return toHex(hsl);
  return null;
}

export function toHex(rgb: RgbColor): string {
  const r = Math.round(Math.max(0, Math.min(255, rgb.r))).toString(16).padStart(2, '0');
  const g = Math.round(Math.max(0, Math.min(255, rgb.g))).toString(16).padStart(2, '0');
  const b = Math.round(Math.max(0, Math.min(255, rgb.b))).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`.toUpperCase();
}
