import { RgbColor } from '../color/parse';
import { rgbToHsl, hslToRgb, HslColor, rgbToLab, LabColor } from '../color/convert';
import { checkWcagCompliance } from '../analysis/wcag';
import { checkIsoCompliance } from '../analysis/iso';

export interface SearchOptions {
  targetWcagRatio?: number; // Default 4.5
  enforceIso?: boolean; // Default true
  maxAttempts?: number; // Default 100
}

function calculateDeltaE(lab1: LabColor, lab2: LabColor): number {
  const dl = lab1.l - lab2.l;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

/**
 * Searches for the closest accessible color by adjusting lightness/saturation,
 * preserving hue as much as possible to maintain brand identity.
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
  // Scans both L and S to find the perceptible best match avoiding the "fall to black" trap
  for (let l = 0; l <= 100; l += 10) {
    for (let s = 0; s <= 100; s += 10) {
      const testHsl = { ...currentHsl, l: l / 100, s: s / 100 };
      const testRgb = hslToRgb(testHsl);
      
      const wcag = checkWcagCompliance(testRgb, bg);
      const iso = checkIsoCompliance(testRgb, bg);

      if (wcag.ratio >= targetRatio && (!enforceIso || iso.passesIso24505)) {
        const testLab = rgbToLab(testRgb);
        const deltaE = calculateDeltaE(currentLab, testLab);
        if (deltaE < minDeltaE) {
          minDeltaE = deltaE;
          bestPass = testRgb;
        }
      }
    }
  }

  // 2. Fine search around the best coarse candidate
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
          const deltaE = calculateDeltaE(currentLab, testLab);
          if (deltaE < minDeltaE) {
            minDeltaE = deltaE;
            bestPass = testRgb;
          }
        }
      }
    }
  }

  // If no color passes both criteria across the coarse grid
  // (e.g., standard hue causes CVD failure everywhere, or WCAG 4.5 ratio is mathematically impossible on this BG)
  // Fall back to the absolute highest contrasting color along this hue (testing only Lightness)
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
