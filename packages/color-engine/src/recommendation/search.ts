import { RgbColor } from '../color/parse';
import { rgbToHsl, hslToRgb, rgbToLab } from '../color/convert';
import { ciede2000 } from '../color/distance';
import { checkWcagCompliance } from '../analysis/wcag';
import { checkIsoCompliance } from '../analysis/iso';

export interface SearchOptions {
  targetWcagRatio?: number; // Default 4.5
  enforceIso?: boolean; // Default true
  maxAttempts?: number; // Default 100
}

/**
 * Searches for the closest accessible color by adjusting lightness/saturation,
 * preserving hue as much as possible to maintain brand identity.
 * Uses CIEDE2000 to measure perceptual distance from the original color.
 */
export function findAccessibleColor(
  fg: RgbColor,
  bg: RgbColor,
  options: SearchOptions = {}
): RgbColor | null {
  const targetRatio = options.targetWcagRatio ?? 4.5;
  const enforceIso = options.enforceIso ?? true;

  const currentHsl = rgbToHsl(fg);
  const currentLab = rgbToLab(fg);

  // Check if it already passes
  const initialWcag = checkWcagCompliance(fg, bg);
  const initialIso = checkIsoCompliance(fg, bg);

  if (initialWcag.ratio >= targetRatio && (!enforceIso || initialIso.passesIso24505)) {
    return fg;
  }

  let bestPass: RgbColor | null = null;
  let minDeltaE = Infinity;

  // 1. Coarse search (stride 10)
  // Scans both L and S to find the perceptual best match, avoiding the "fall to black" trap
  for (let l = 0; l <= 100; l += 10) {
    for (let s = 0; s <= 100; s += 10) {
      const testHsl = { ...currentHsl, l: l / 100, s: s / 100 };
      const testRgb = hslToRgb(testHsl);

      const wcag = checkWcagCompliance(testRgb, bg);
      const iso = checkIsoCompliance(testRgb, bg);

      if (wcag.ratio >= targetRatio && (!enforceIso || iso.passesIso24505)) {
        const testLab = rgbToLab(testRgb);
        const deltaE = ciede2000(currentLab, testLab);
        if (deltaE < minDeltaE) {
          minDeltaE = deltaE;
          bestPass = testRgb;
        }
      }
    }
  }

  // 2. Fine search: refine around best coarse candidate (±9 steps)
  if (bestPass) {
    const bestCoarseHsl = rgbToHsl(bestPass);
    const coarseL = Math.round(bestCoarseHsl.l * 100);
    const coarseS = Math.round(bestCoarseHsl.s * 100);

    const minL = Math.max(0, coarseL - 9);
    const maxL = Math.min(100, coarseL + 9);
    const minS = Math.max(0, coarseS - 9);
    const maxS = Math.min(100, coarseS + 9);

    for (let l = minL; l <= maxL; l++) {
      for (let s = minS; s <= maxS; s++) {
        const testHsl = { ...currentHsl, l: l / 100, s: s / 100 };
        const testRgb = hslToRgb(testHsl);

        const wcag = checkWcagCompliance(testRgb, bg);
        const iso = checkIsoCompliance(testRgb, bg);

        if (wcag.ratio >= targetRatio && (!enforceIso || iso.passesIso24505)) {
          const testLab = rgbToLab(testRgb);
          const deltaE = ciede2000(currentLab, testLab);
          if (deltaE < minDeltaE) {
            minDeltaE = deltaE;
            bestPass = testRgb;
          }
        }
      }
    }
  }

  // 3. Fallback: if nothing passed both WCAG + ISO, find highest contrast along this hue
  if (!bestPass) {
    let maxRatio = -1;
    let fallbackRgb: RgbColor = fg;

    for (let l = 0; l <= 100; l++) {
      const testHsl = { ...currentHsl, l: l / 100 };
      const testRgb = hslToRgb(testHsl);
      const wcag = checkWcagCompliance(testRgb, bg);

      if (wcag.ratio > maxRatio) {
        maxRatio = wcag.ratio;
        fallbackRgb = testRgb;
      }
    }
    return fallbackRgb;
  }

  return bestPass;
}
