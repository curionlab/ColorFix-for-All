import { LabColor, RgbColor } from '../models/types';
import { rgbToLab, rgbToHsl } from './convert';

export function deltaE76(color1: LabColor, color2: LabColor): number {
  const dL = color1.L - color2.L;
  const da = color1.a - color2.a;
  const db = color1.b - color2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

export function weightedBrandDistance(before: RgbColor, after: RgbColor): number {
  const lab1 = rgbToLab(before);
  const lab2 = rgbToLab(after);
  const diffE = deltaE76(lab1, lab2);
  
  const hslBefore = rgbToHsl(before);
  const hslAfter = rgbToHsl(after);
  let hDiff = Math.abs(hslBefore.h - hslAfter.h);
  if (hDiff > 180) hDiff = 360 - hDiff;
  
  // Heavily penalize hue shifting to preserve brand identity,
  // while allowing L and S shifts more freely.
  return diffE + (hDiff * 2.0);
}

export function colorDistance(c1: RgbColor, c2: RgbColor): number {
  return deltaE76(rgbToLab(c1), rgbToLab(c2));
}
