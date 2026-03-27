export function relativeLuminance(rgb) {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
        const sRGB = c / 255;
        return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrastRatio(fg, bg) {
    const l1 = relativeLuminance(fg);
    const l2 = relativeLuminance(bg);
    const max = Math.max(l1, l2);
    const min = Math.min(l1, l2);
    return (max + 0.05) / (min + 0.05);
}
export function passesAA(ratio, largeText = false) {
    return largeText ? ratio >= 3.0 : ratio >= 4.5;
}
export function passesAAA(ratio, largeText = false) {
    return largeText ? ratio >= 4.5 : ratio >= 7.0;
}
