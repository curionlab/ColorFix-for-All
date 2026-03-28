import { RgbColor } from '../color/parse';
import { rgbToOklch, oklchToRgb, rgbToLab } from '../color/convert';
import { ciede2000 } from '../color/distance';
import { checkCvdContrast } from '../analysis/cvd';

export type SearchMode = 'fg-only' | 'bg-only' | 'both';

export interface SearchOptions {
  targetWcagRatio?: number; // Default 4.5
  mode?: SearchMode; // Default 'fg-only'
  bgWeight?: number; // Lambda for BG distance weight (default 1.0)
}

interface SearchCandidate {
  fg: RgbColor;
  bg: RgbColor;
  distance: number;
}

/**
 * Searches for the closest accessible color pairing using OKLCH and CIEDE2000 ΔE00.
 * Supports optimizing FG, BG, or both simultaneously.
 */
export function findAccessibleColor(
  fgOrig: RgbColor,
  bgOrig: RgbColor,
  options: SearchOptions = {}
): { fg: RgbColor; bg: RgbColor } | null {
  const targetRatio = options.targetWcagRatio ?? 4.5;
  const mode = options.mode ?? 'fg-only';
  const bgWeight = options.bgWeight ?? 1.0;

  const fgLab = rgbToLab(fgOrig);
  const bgLab = rgbToLab(bgOrig);
  const fgOklch = rgbToOklch(fgOrig);
  const bgOklch = rgbToOklch(bgOrig);

  /** Calculate weighted distance total delta-E00 */
  const calculateScore = (testFgRgb: RgbColor, testBgRgb: RgbColor): number => {
    const testFgLab = rgbToLab(testFgRgb);
    const testBgLab = rgbToLab(testBgRgb);
    const dE_FG = ciede2000(fgLab, testFgLab);
    const dE_BG = ciede2000(bgLab, testBgLab);
    return dE_FG + bgWeight * dE_BG;
  };

  /** Check if a pair passes all CVD and normal contrast requirements */
  const checkPass = (fg: RgbColor, bg: RgbColor): boolean => {
    return checkCvdContrast(fg, bg, targetRatio).passesAll;
  };

  // Check initial state
  if (checkPass(fgOrig, bgOrig)) {
    return { fg: fgOrig, bg: bgOrig };
  }

  let best: SearchCandidate | null = null;
  let minDistance = Infinity;

  // Grid steps (OKLCH - L: 0..1, C: 0..0.4)
  const coarseL = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  const coarseC = [0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4];

  /** Coarse Grid Search */
  const fgCandidates = mode === 'bg-only' ? [fgOrig] : coarseL.flatMap(l => coarseC.map(c => oklchToRgb({ l, c, h: fgOklch.h })));
  const bgCandidates = mode === 'fg-only' ? [bgOrig] : coarseL.flatMap(l => coarseC.map(c => oklchToRgb({ l, c, h: bgOklch.h })));

  for (const f of fgCandidates) {
    for (const b of bgCandidates) {
      if (checkPass(f, b)) {
        const d = calculateScore(f, b);
        if (d < minDistance) {
          minDistance = d;
          best = { fg: f, bg: b, distance: d };
        }
      }
    }
  }

  /** Refinement Search around best coarse candidate (Fine Grid) */
  if (best) {
    const bestFgLch = rgbToOklch(best.fg);
    const bestBgLch = rgbToOklch(best.bg);

    const refineL = [-0.05, -0.02, 0, 0.02, 0.05];
    const refineC = [-0.02, 0, 0.02];

    const fineFg = mode === 'bg-only' ? [best.fg] : refineL.flatMap(dl => refineC.map(dc => oklchToRgb({ 
      l: Math.max(0, Math.min(1, bestFgLch.l + dl)), 
      c: Math.max(0, Math.min(0.4, bestFgLch.c + dc)), 
      h: fgOklch.h 
    })));
    const fineBg = mode === 'fg-only' ? [best.bg] : refineL.flatMap(dl => refineC.map(dc => oklchToRgb({ 
      l: Math.max(0, Math.min(1, bestBgLch.l + dl)), 
      c: Math.max(0, Math.min(0.4, bestBgLch.c + dc)), 
      h: bgOklch.h 
    })));

    for (const f of fineFg) {
      for (const b of fineBg) {
        if (checkPass(f, b)) {
          const d = calculateScore(f, b);
          if (d < minDistance) {
            minDistance = d;
            best = { fg: f, bg: b, distance: d };
          }
        }
      }
    }
  }

  return best ? { fg: best.fg, bg: best.bg } : null;
}
