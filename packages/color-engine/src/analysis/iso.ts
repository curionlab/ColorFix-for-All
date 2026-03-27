import { RgbColor } from '../color/parse';
import { rgbToLab, simulateCVD } from '../color/convert';

export interface IsoResult {
  deltaL: number;
  normalDeltaE: number;
  deltaE_PD: number;
  deltaE_T: number;
  luminanceContrastPasses: boolean;
  isProblematicPairing: boolean; // Color difference relies almost entirely on hue instead of lightness
  hueClashDescription: string | null;
  passesIso24505: boolean;
}

export function checkIsoCompliance(fg: RgbColor, bg: RgbColor): IsoResult {
  const fgLab = rgbToLab(fg);
  const bgLab = rgbToLab(bg);

  const deltaL = Math.abs(fgLab.l - bgLab.l);
  const da = Math.abs(fgLab.a - bgLab.a);
  const db = Math.abs(fgLab.b - bgLab.b);

  const normalDeltaE = Math.sqrt(deltaL * deltaL + da * da + db * db);

  // Physiologically accurate CVD Simulation (Gamma -> Linear RGB -> CVD Matrix -> Gamma)
  // Re-evaluating the Delta E in CIELAB on the simulated colors
  const fgP = simulateCVD(fg, 'protanopia');
  const bgP = simulateCVD(bg, 'protanopia');
  const labP_fg = rgbToLab(fgP);
  const labP_bg = rgbToLab(bgP);
  const deltaE_P = Math.sqrt(Math.pow(labP_fg.l - labP_bg.l, 2) + Math.pow(labP_fg.a - labP_bg.a, 2) + Math.pow(labP_fg.b - labP_bg.b, 2));

  const fgD = simulateCVD(fg, 'deuteranopia');
  const bgD = simulateCVD(bg, 'deuteranopia');
  const labD_fg = rgbToLab(fgD);
  const labD_bg = rgbToLab(bgD);
  const deltaE_D = Math.sqrt(Math.pow(labD_fg.l - labD_bg.l, 2) + Math.pow(labD_fg.a - labD_bg.a, 2) + Math.pow(labD_fg.b - labD_bg.b, 2));

  // Worst case of Protanopia or Deuteranopia models the Red-Green impairment
  const deltaE_PD = Math.min(deltaE_P, deltaE_D);

  const fgT = simulateCVD(fg, 'tritanopia');
  const bgT = simulateCVD(bg, 'tritanopia');
  const labT_fg = rgbToLab(fgT);
  const labT_bg = rgbToLab(bgT);
  const deltaE_T = Math.sqrt(Math.pow(labT_fg.l - labT_bg.l, 2) + Math.pow(labT_fg.a - labT_bg.a, 2) + Math.pow(labT_fg.b - labT_bg.b, 2));

  const luminanceContrastPasses = deltaL >= 40.0;

  // Problematic pairings
  const failsPD = normalDeltaE >= 30.0 && deltaE_PD < 30.0;
  const failsT = normalDeltaE >= 30.0 && deltaE_T < 30.0;

  const isProblematicPairing = failsPD || failsT;

  let hueClashDescription: string | null = null;
  if (failsPD && failsT) {
    hueClashDescription = 'P/D型・T型双方が見分けにくい色';
  } else if (failsPD) {
    hueClashDescription = 'P/D型(赤緑等)が見分けにくい色';
  } else if (failsT) {
    hueClashDescription = 'T型(青黄等)が見分けにくい色';
  }

  return {
    deltaL,
    normalDeltaE,
    deltaE_PD,
    deltaE_T,
    luminanceContrastPasses,
    isProblematicPairing,
    hueClashDescription,
    passesIso24505: luminanceContrastPasses && !isProblematicPairing && deltaE_PD >= 30.0 && deltaE_T >= 30.0
  };
}
