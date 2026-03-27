import { describe, it, expect } from 'vitest';
import { parseHex, toHex } from '../color/parse';
import { getContrastRatio } from '../color/contrast';
import { checkWcagCompliance } from '../analysis/wcag';
import { checkIsoCompliance } from '../analysis/iso';
import { findAccessibleColor } from '../recommendation/search';
import { rgbToHsl } from '../color/convert';

describe('Color Engine', () => {
  describe('Parsing', () => {
    it('parses valid hex codes', () => {
      expect(parseHex('#ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
      expect(parseHex('00ff00')).toEqual({ r: 0, g: 255, b: 0, a: 1 });
      expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    });

    it('returns null for invalid hex', () => {
      expect(parseHex('invalid')).toBeNull();
    });

    it('serializes to hex', () => {
      expect(toHex({ r: 255, g: 0, b: 0 })).toBe('#ff0000');
    });
  });

  describe('Contrast & WCAG', () => {
    it('calculates contrast correctly (white on black)', () => {
      const white = { r: 255, g: 255, b: 255 };
      const black = { r: 0, g: 0, b: 0 };
      const ratio = getContrastRatio(white, black);
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('identifies failures', () => {
      const fg = { r: 128, g: 128, b: 128 };
      const bg = { r: 128, g: 128, b: 128 };
      const wg = checkWcagCompliance(fg, bg);
      expect(wg.passesAA).toBe(false);
    });
  });

  describe('Recommendation Search', () => {
    it('finds a passing color for light gray text on white background', () => {
      const fg = { r: 200, g: 200, b: 200 }; // Light gray
      const bg = { r: 255, g: 255, b: 255 }; // White
      
      const newFg = findAccessibleColor(fg, bg, { targetWcagRatio: 4.5, enforceIso: false })!;
      expect(newFg).toBeDefined();
      
      const ratio = getContrastRatio(newFg, bg);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      
      // Hue should be roughly preserved (achromatic in this case)
      const origHsl = rgbToHsl(fg);
      const newHsl = rgbToHsl(newFg);
      expect(newHsl.h).toBeCloseTo(origHsl.h, 1);
    });
  });
});
