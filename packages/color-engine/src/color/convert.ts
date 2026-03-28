import { RgbColor } from './parse';

export type HslColor = { h: number; s: number; l: number };
export type LabColor = { l: number; a: number; b: number };
export type XyzColor = { x: number; y: number; z: number };
export type OklabColor = { l: number; a: number; b: number };
export type OklchColor = { l: number; c: number; h: number };

/**
 * Calculates the relative luminance of an RGB color (WCAG definition).
 * Components should be in 0-255 range.
 */
export function getRelativeLuminance({ r, g, b }: RgbColor): number {
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rLine =
    rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLine =
    gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLine =
    bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * rLine + 0.7152 * gLine + 0.0722 * bLine;
}

/**
 * Converts RGB (0-255) to HSL (h: 0-360, s: 0-1, l: 0-1)
 */
export function rgbToHsl({ r, g, b }: RgbColor): HslColor {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
    switch (max) {
      case r: h = (g - b) / diff + (g < b ? 6 : 0); break;
      case g: h = (b - r) / diff + 2; break;
      case b: h = (r - g) / diff + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s, l };
}

/**
 * Converts HSL (h: 0-360, s: 0-1, l: 0-1) to RGB (0-255)
 */
export function hslToRgb({ h, s, l }: HslColor): RgbColor {
  h /= 360;
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

/**
 * Converts RGB to CIEXYZ
 */
export function rgbToXyz({ r, g, b }: RgbColor): XyzColor {
  let [rL, gL, bL] = [r / 255, g / 255, b / 255];

  rL = rL > 0.04045 ? Math.pow((rL + 0.055) / 1.055, 2.4) : rL / 12.92;
  gL = gL > 0.04045 ? Math.pow((gL + 0.055) / 1.055, 2.4) : gL / 12.92;
  bL = bL > 0.04045 ? Math.pow((bL + 0.055) / 1.055, 2.4) : bL / 12.92;

  rL *= 100;
  gL *= 100;
  bL *= 100;

  return {
    x: rL * 0.4124 + gL * 0.3576 + bL * 0.1805,
    y: rL * 0.2126 + gL * 0.7152 + bL * 0.0722,
    z: rL * 0.0193 + gL * 0.1192 + bL * 0.9505
  };
}

/**
 * Converts CIEXYZ to CIELAB
 */
export function xyzToLab({ x, y, z }: XyzColor): LabColor {
  // Reference White (D65)
  const Xn = 95.047;
  const Yn = 100.000;
  const Zn = 108.883;

  let xR = x / Xn;
  let yR = y / Yn;
  let zR = z / Zn;

  const f = (t: number) => t > 0.008856 ? Math.pow(t, 1 / 3) : (7.787 * t) + (16 / 116);

  return {
    l: (116 * f(yR)) - 16,
    a: 500 * (f(xR) - f(yR)),
    b: 200 * (f(yR) - f(zR))
  };
}

/**
 * Converts RGB to CIELAB
 */
export function rgbToLab(rgb: RgbColor): LabColor {
  return xyzToLab(rgbToXyz(rgb));
}

export type LinearRgbColor = { r: number; g: number; b: number };

export function rgbToLinear({ r, g, b }: RgbColor): LinearRgbColor {
  const srgbToLinear = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return { r: srgbToLinear(r), g: srgbToLinear(g), b: srgbToLinear(b) };
}

export function linearToRgb({ r, g, b }: LinearRgbColor): RgbColor {
  const linearToSrgb = (v: number) => {
    const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(c * 255)));
  };
  return { r: linearToSrgb(r), g: linearToSrgb(g), b: linearToSrgb(b) };
}

function applyMatrix(matrix: number[][], color: LinearRgbColor): LinearRgbColor {
  return {
    r: Math.max(0, Math.min(1, matrix[0][0] * color.r + matrix[0][1] * color.g + matrix[0][2] * color.b)),
    g: Math.max(0, Math.min(1, matrix[1][0] * color.r + matrix[1][1] * color.g + matrix[1][2] * color.b)),
    b: Math.max(0, Math.min(1, matrix[2][0] * color.r + matrix[2][1] * color.g + matrix[2][2] * color.b)),
  };
}

const PROTANOPIA_MATRIX = [
  [ 0.152286,  1.052583, -0.204868 ],
  [ 0.114503,  0.786281,  0.099216 ],
  [-0.003882, -0.048116,  1.051998 ]
];

const DEUTERANOPIA_MATRIX = [
  [ 0.367322,  0.860646, -0.227968 ],
  [ 0.280085,  0.672501,  0.047413 ],
  [-0.011820,  0.042940,  0.968881 ]
];

const TRITANOPIA_MATRIX = [
  [ 1.255528, -0.076749, -0.178779 ],
  [-0.078411,  0.930809,  0.147602 ],
  [ 0.004733,  0.691367,  0.303900 ]
];

export function simulateCVD(color: RgbColor, type: 'protanopia' | 'deuteranopia' | 'tritanopia'): RgbColor {
  const linear = rgbToLinear(color);
  let simulatedLinear: LinearRgbColor;
  
  if (type === 'protanopia') {
    simulatedLinear = applyMatrix(PROTANOPIA_MATRIX, linear);
  } else if (type === 'deuteranopia') {
    simulatedLinear = applyMatrix(DEUTERANOPIA_MATRIX, linear);
  } else {
    simulatedLinear = applyMatrix(TRITANOPIA_MATRIX, linear);
  }

  return linearToRgb(simulatedLinear);
}

/**
 * Converts Linear RGB (0-1) to Oklab
 */
export function linearRgbToOklab(c: LinearRgbColor): OklabColor {
  const l = 0.4122214708 * c.r + 0.5363320363 * c.g + 0.0514459929 * c.b;
  const m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  const s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;

  const l_ = Math.pow(l, 1 / 3);
  const m_ = Math.pow(m, 1 / 3);
  const s_ = Math.pow(s, 1 / 3);

  return {
    l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  };
}

/**
 * Converts Oklab to Linear RGB (0-1)
 */
export function oklabToLinearRgb(c: OklabColor): LinearRgbColor {
  const l_ = c.l + 0.3963377774 * c.a + 0.2158037573 * c.b;
  const m_ = c.l - 0.1055613458 * c.a - 0.0638541728 * c.b;
  const s_ = c.l - 0.0894841775 * c.a - 1.291485548 * c.b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return {
    r: +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  };
}

/**
 * Converts RGB to OKLCH
 */
export function rgbToOklch(rgb: RgbColor): OklchColor {
  const lab = linearRgbToOklab(rgbToLinear(rgb));
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let h = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: lab.l, c, h };
}

/**
 * Converts OKLCH to RGB
 */
export function oklchToRgb(oklch: OklchColor): RgbColor {
  const hRad = (oklch.h * Math.PI) / 180;
  const lab: OklabColor = {
    l: oklch.l,
    a: oklch.c * Math.cos(hRad),
    b: oklch.c * Math.sin(hRad)
  };
  return linearToRgb(oklabToLinearRgb(lab));
}
