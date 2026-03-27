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
 * Calculates CIEDE2000 (ΔE₀₀) between two CIELAB colors.
 * This is the most perceptually uniform color difference formula.
 * Reference: Sharma et al. (2005), "The CIEDE2000 Color-Difference Formula"
 * https://doi.org/10.1002/col.20070
 */
export function ciede2000(lab1: LabColor, lab2: LabColor): number {
  const { l: L1, a: a1, b: b1 } = lab1;
  const { l: L2, a: a2, b: b2 } = lab2;

  const kL = 1, kC = 1, kH = 1;

  const C1ab = Math.sqrt(a1 * a1 + b1 * b1);
  const C2ab = Math.sqrt(a2 * a2 + b2 * b2);
  const CabAvg7 = Math.pow((C1ab + C2ab) / 2, 7);
  const root25_7 = Math.pow(25, 7);
  const G = 0.5 * (1 - Math.sqrt(CabAvg7 / (CabAvg7 + root25_7)));

  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  const h1p = (Math.atan2(b1, a1p) * 180 / Math.PI + 360) % 360;
  const h2p = (Math.atan2(b2, a2p) * 180 / Math.PI + 360) % 360;

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp: number;
  if (C1p * C2p === 0) {
    dhp = 0;
  } else if (Math.abs(h2p - h1p) <= 180) {
    dhp = h2p - h1p;
  } else if (h2p - h1p > 180) {
    dhp = h2p - h1p - 360;
  } else {
    dhp = h2p - h1p + 360;
  }

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * Math.PI / 360);

  const Lp_avg = (L1 + L2) / 2;
  const Cp_avg = (C1p + C2p) / 2;

  let Hp_avg: number;
  if (C1p * C2p === 0) {
    Hp_avg = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    Hp_avg = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    Hp_avg = (h1p + h2p + 360) / 2;
  } else {
    Hp_avg = (h1p + h2p - 360) / 2;
  }

  const T = 1
    - 0.17 * Math.cos((Hp_avg - 30) * Math.PI / 180)
    + 0.24 * Math.cos((2 * Hp_avg) * Math.PI / 180)
    + 0.32 * Math.cos((3 * Hp_avg + 6) * Math.PI / 180)
    - 0.20 * Math.cos((4 * Hp_avg - 63) * Math.PI / 180);

  const SL = 1 + 0.015 * Math.pow(Lp_avg - 50, 2) / Math.sqrt(20 + Math.pow(Lp_avg - 50, 2));
  const SC = 1 + 0.045 * Cp_avg;
  const SH = 1 + 0.015 * Cp_avg * T;

  const Cp_avg7 = Math.pow(Cp_avg, 7);
  const RC = 2 * Math.sqrt(Cp_avg7 / (Cp_avg7 + root25_7));
  const dTheta = 30 * Math.exp(-Math.pow((Hp_avg - 275) / 25, 2));
  const RT = -Math.sin(2 * dTheta * Math.PI / 180) * RC;

  return Math.sqrt(
    Math.pow(dLp / (kL * SL), 2) +
    Math.pow(dCp / (kC * SC), 2) +
    Math.pow(dHp / (kH * SH), 2) +
    RT * (dCp / (kC * SC)) * (dHp / (kH * SH))
  );
}

/**
 * Helper to calculate CIEDE2000 directly from RGB.
 */
export function deltaERgb(c1: RgbColor, c2: RgbColor): number {
  return ciede2000(rgbToLab(c1), rgbToLab(c2));
}

/**
 * Brand distance: perceptual difference between original and proposed color.
 * Uses CIEDE2000 as it best models human color perception.
 */
export function getBrandDistance(original: RgbColor, proposed: RgbColor): number {
  return deltaERgb(original, proposed);
}
