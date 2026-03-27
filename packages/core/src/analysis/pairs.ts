import { SemanticElement } from '@colorfix/schemas';
import { ColorPair } from '../models/types';
import { parseHex, normalizeColorString } from '../color/parse';

function isLargeText(el: SemanticElement): boolean {
  const size   = parseFloat(el.fontSize   ?? '0');
  const weight = parseInt(el.fontWeight   ?? '400', 10);
  // px → pt 換算（1pt = 1.333px）
  const pt = el.fontSizeUnit === 'pt' ? size
           : el.fontSizeUnit === 'rem' || el.fontSizeUnit === 'em' ? size * 12  // 1rem≒16px≒12pt
           : size * 0.75;
  return pt >= 18 || (pt >= 14 && weight >= 700);
}

function toRgb(colorStr: string | undefined) {
  if (!colorStr) return null;
  return parseHex(normalizeColorString(colorStr) ?? '');
}

export function buildColorPairs(
  elements: SemanticElement[],
  bodyDefaults?: { foreground?: string; background?: string }
): ColorPair[] {
  const pairs: ColorPair[] = [];

  for (const el of elements) {
    const fgStr     = el.foreground  ?? bodyDefaults?.foreground;
    const bgStr     = el.background  ?? bodyDefaults?.background;
    const borderStr = el.borderColor;

    // 1. Text on Background
    if (fgStr && bgStr) {
      const fg = toRgb(fgStr);
      const bg = toRgb(bgStr);
      if (fg && bg) {
        pairs.push({
          foreground:  fg,
          background:  bg,
          elementId:   el.id,
          selectorHint: el.selectorHint,
          role:        'text-on-bg',
          isLargeText: isLargeText(el),
        });
      }
    }

    // 2. Border on Background
    if (borderStr && bgStr) {
      const fg = toRgb(borderStr);
      const bg = toRgb(bgStr);
      if (fg && bg) {
        pairs.push({
          foreground:  fg,
          background:  bg,
          elementId:   el.id,
          selectorHint: el.selectorHint,
          role:        'border-on-bg',
          isLargeText: false,
        });
      }
    }
  }

  return pairs;
}
