import { RgbColor } from '../color/parse';
import { rgbToLab, simulateCVD, xyzToLab, rgbToXyz } from '../color/convert';
import { ciede2000 } from '../color/distance';
import { getContrastRatio } from '../color/contrast';

export interface IsoResult {
  deltaL: number;
  /** Normal-vision CIEDE2000 color difference */
  normalDeltaE: number;
  /** Worst-case P/D-type (red-green) CVD simulated CIEDE2000 */
  deltaE_PD: number;
  /** T-type (blue-yellow) CVD simulated CIEDE2000 */
  deltaE_T: number;
  /** WCAG contrast ratio after CVD simulation (text legibility) */
  minCvdContrastRatio: number;
  luminanceContrastPasses: boolean;
  isProblematicPairing: boolean;
  hueClashDescription: string | null;
  passesIso24505: boolean;
}

/**
 * Checks ISO 24505-2 inspired compliance using:
 * - Primary metric: CVD-simulated CIEDE2000 color difference (≥ 18)
 * - Secondary text metric: CVD-simulated WCAG contrast ratio (≥ 4.5)
 * - Low vision metric: CIELAB lightness difference ΔL* (≥ 20)
 *
 * Thresholds are research-based estimates for RGB display usage;
 * they do not constitute a formal ISO 24505-2 conformance declaration.
 */
export function checkIsoCompliance(fg: RgbColor, bg: RgbColor): IsoResult {
  const fgLab = rgbToLab(fg);
  const bgLab = rgbToLab(bg);

  const deltaL = Math.abs(fgLab.l - bgLab.l);

  // Normal-vision CIEDE2000
  const normalDeltaE = ciede2000(fgLab, bgLab);

  // CVD Simulation — P-type (Protanopia): L-cone absence
  const fgP = simulateCVD(fg, 'protanopia');
  const bgP = simulateCVD(bg, 'protanopia');
  const deltaE_P = ciede2000(rgbToLab(fgP), rgbToLab(bgP));

  // CVD Simulation — D-type (Deuteranopia): M-cone absence
  const fgD = simulateCVD(fg, 'deuteranopia');
  const bgD = simulateCVD(bg, 'deuteranopia');
  const deltaE_D = ciede2000(rgbToLab(fgD), rgbToLab(bgD));

  // P/D worst-case: models red-green confusion axis
  const deltaE_PD = Math.min(deltaE_P, deltaE_D);

  // CVD Simulation — T-type (Tritanopia): S-cone absence
  const fgT = simulateCVD(fg, 'tritanopia');
  const bgT = simulateCVD(bg, 'tritanopia');
  const deltaE_T = ciede2000(rgbToLab(fgT), rgbToLab(bgT));

  // WCAG contrast ratio after each CVD simulation (text legibility check)
  const contrastP = getContrastRatio(fgP, bgP);
  const contrastD = getContrastRatio(fgD, bgD);
  const contrastT = getContrastRatio(fgT, bgT);
  const minCvdContrastRatio = Math.min(contrastP, contrastD, contrastT);

  // ΔL* ≥ 20 ensures luminance difference for low vision / high-contrast need
  const luminanceContrastPasses = deltaL >= 20.0;

  // Problematic pairings: color is distinguishable in normal vision but not after CVD
  // CIEDE2000 threshold ≥ 18 corresponds to clearly perceptible color difference
  const DELTA_E_THRESHOLD = 18;
  const failsPD = normalDeltaE >= DELTA_E_THRESHOLD && deltaE_PD < DELTA_E_THRESHOLD;
  const failsT  = normalDeltaE >= DELTA_E_THRESHOLD && deltaE_T  < DELTA_E_THRESHOLD;

  const isProblematicPairing = failsPD || failsT;

  let hueClashDescription: string | null = null;
  if (failsPD && failsT) {
    hueClashDescription = 'P/D型・T型双方が見分けにくい色';
  } else if (failsPD) {
    hueClashDescription = 'P/D型(赤緑等)が見分けにくい色';
  } else if (failsT) {
    hueClashDescription = 'T型(青黄等)が見分けにくい色';
  }

  const passesIso24505 =
    luminanceContrastPasses &&
    !isProblematicPairing &&
    deltaE_PD >= DELTA_E_THRESHOLD &&
    deltaE_T  >= DELTA_E_THRESHOLD;

  return {
    deltaL,
    normalDeltaE,
    deltaE_PD,
    deltaE_T,
    minCvdContrastRatio,
    luminanceContrastPasses,
    isProblematicPairing,
    hueClashDescription,
    passesIso24505
  };
}
