import { RgbColor } from './parse';
import { getRelativeLuminance } from './convert';

/**
 * Calculates the WCAG contrast ratio between two colors.
 * Standard formula: (L1 + 0.05) / (L2 + 0.05) where L1 > L2.
 */
export function getContrastRatio(fg: RgbColor, bg: RgbColor): number {
  const l1 = getRelativeLuminance(fg);
  const l2 = getRelativeLuminance(bg);

  const lightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);

  return (lightest + 0.05) / (darkest + 0.05);
}
