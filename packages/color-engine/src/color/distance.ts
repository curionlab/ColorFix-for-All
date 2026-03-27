import { LabColor, rgbToLab } from './convert';
import { RgbColor } from './parse';

/**
 * Calculates Delta E 76 (CIE76) between two CIELAB colors.
 * A value of ~2.3 corresponds to a JND (just noticeable difference).
 */
export function deltaE76(lab1: LabColor, lab2: LabColor): number {
  const dl = lab1.l - lab2.l;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

/**
 * Helper to calculate CIE76 directly from RGB.
 */
export function deltaERgb(c1: RgbColor, c2: RgbColor): number {
  return deltaE76(rgbToLab(c1), rgbToLab(c2));
}

/**
 * Brand distance heuristic:
 * heavily penalizes hue shifts, while tolerating lightness shifts more.
 */
export function getBrandDistance(original: RgbColor, proposed: RgbColor): number {
  // Using simple Delta E for now. Can be enhanced to penalize hue in Delta E 2000 if needed.
  return deltaERgb(original, proposed);
}
