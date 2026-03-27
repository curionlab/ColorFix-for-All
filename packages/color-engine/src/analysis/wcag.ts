import { RgbColor } from '../color/parse';
import { getContrastRatio } from '../color/contrast';

export interface WcagResult {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  passesAALarge: boolean;
  passesAAALarge: boolean;
}

export function checkWcagCompliance(fg: RgbColor, bg: RgbColor): WcagResult {
  const ratio = getContrastRatio(fg, bg);
  
  return {
    ratio,
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7.0,
    passesAALarge: ratio >= 3.0,
    passesAAALarge: ratio >= 4.5,
  };
}
