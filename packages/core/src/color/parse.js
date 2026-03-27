export function parseHex(input) {
    const hex = input.replace(/^#/, '');
    if (hex.length === 3) {
        return {
            r: parseInt(hex[0] + hex[0], 16),
            g: parseInt(hex[1] + hex[1], 16),
            b: parseInt(hex[2] + hex[2], 16),
        };
    }
    if (hex.length === 6) {
        return {
            r: parseInt(hex.slice(0, 2), 16),
            g: parseInt(hex.slice(2, 4), 16),
            b: parseInt(hex.slice(4, 6), 16),
        };
    }
    return null;
}
export function parseRgbString(input) {
    const match = input.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
        return {
            r: parseInt(match[1], 10),
            g: parseInt(match[2], 10),
            b: parseInt(match[3], 10),
        };
    }
    return null;
}
export function normalizeColorString(input) {
    const hex = parseHex(input);
    if (hex)
        return toHex(hex);
    const rgb = parseRgbString(input);
    if (rgb)
        return toHex(rgb);
    return null; // Might need more robust parsing for names, rgba, etc. later
}
export function toHex(rgb) {
    const r = Math.round(Math.max(0, Math.min(255, rgb.r))).toString(16).padStart(2, '0');
    const g = Math.round(Math.max(0, Math.min(255, rgb.g))).toString(16).padStart(2, '0');
    const b = Math.round(Math.max(0, Math.min(255, rgb.b))).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}
