import { parseHex, normalizeColorString } from '../color/parse';
export function buildColorPairs(elements) {
    const pairs = [];
    for (const el of elements) {
        const pair = inferForegroundBackground(el);
        if (pair)
            pairs.push(pair);
    }
    return pairs;
}
export function inferForegroundBackground(element) {
    if (!element.foreground || !element.background)
        return null;
    const fg = parseHex(normalizeColorString(element.foreground) || '');
    const bg = parseHex(normalizeColorString(element.background) || '');
    if (fg && bg) {
        return {
            foreground: fg,
            background: bg,
            elementId: element.id,
            role: element.role
        };
    }
    return null;
}
