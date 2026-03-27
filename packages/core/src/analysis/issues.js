import { contrastRatio } from '../color/contrast';
import { toHex } from '../color/parse';
export function detectContrastIssues(pairs) {
    const issues = [];
    for (const pair of pairs) {
        if (!pair.elementId)
            continue;
        const ratio = contrastRatio(pair.foreground, pair.background);
        const passes = ratio >= 4.5;
        if (!passes) {
            issues.push({
                id: `contrast-${pair.elementId}`,
                kind: 'contrast',
                severity: ratio < 3.0 ? 'high' : 'medium',
                targetElementId: pair.elementId,
                currentColors: [toHex(pair.foreground), toHex(pair.background)],
                message: `Contrast ratio is ${ratio.toFixed(2)}, below the WCAG AA requirement of 4.5.`,
                metrics: {
                    contrastRatio: ratio,
                    targetContrast: 4.5
                }
            });
        }
    }
    return issues;
}
// MVP stubs for other issue types
export function detectAmbiguousPairs(pairs) {
    return [];
}
export function detectColorOnlyMeaning(elements) {
    return [];
}
