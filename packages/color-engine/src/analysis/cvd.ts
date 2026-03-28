import { RgbColor } from '../color/parse';
import { simulateCVD } from '../color/convert';
import { checkWcagCompliance } from './wcag';

export interface CvdContrastResult {
  normalRatio: number;
  protanRatio: number;
  deutanRatio: number;
  tritanRatio: number;
  passesAll: boolean;
}

/**
 * Checks if a color pair satisfies a specific contrast threshold across normal and CVD simulations.
 */
export function checkCvdContrast(
  fg: RgbColor,
  bg: RgbColor,
  threshold: number = 4.5
): CvdContrastResult {
  const normal = checkWcagCompliance(fg, bg).ratio;
  
  const protanFg = simulateCVD(fg, 'protanopia');
  const protanBg = simulateCVD(bg, 'protanopia');
  const protan = checkWcagCompliance(protanFg, protanBg).ratio;

  const deutanFg = simulateCVD(fg, 'deuteranopia');
  const deutanBg = simulateCVD(bg, 'deuteranopia');
  const deutan = checkWcagCompliance(deutanFg, deutanBg).ratio;

  const tritanFg = simulateCVD(fg, 'tritanopia');
  const tritanBg = simulateCVD(bg, 'tritanopia');
  const tritan = checkWcagCompliance(tritanFg, tritanBg).ratio;

  return {
    normalRatio: normal,
    protanRatio: protan,
    deutanRatio: deutan,
    tritanRatio: tritan,
    passesAll: normal >= threshold && protan >= threshold && deutan >= threshold && tritan >= threshold
  };
}
