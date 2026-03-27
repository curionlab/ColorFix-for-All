export * from './models/types';
export * from './color/parse';
export * from './color/contrast';
export * from './color/convert';
export * from './color/distance';
export * from './analysis/roles';
export * from './analysis/pairs';
export * from './analysis/issues';
export * from './recommendation/strategies';
export * from './recommendation/search';
export * from './recommendation/explain';
export * from './scoring/accessibility';
export * from './scoring/brand';
export * from './scoring/overall';
import { inferRoles } from './analysis/roles';
import { buildColorPairs } from './analysis/pairs';
import { detectContrastIssues } from './analysis/issues';
import { getStrategy } from './recommendation/strategies';
import { generateRecommendations } from './recommendation/search';
import { parseHex } from './color/parse';
export function analyzeDesignInput(input) {
    const elements = inferRoles(input.elements);
    const pairs = buildColorPairs(elements);
    const issues = detectContrastIssues(pairs);
    return {
        url: input.url,
        timestamp: new Date().toISOString(),
        elements,
        issues
    };
}
export function recommendFixes(result, mode) {
    const strategy = getStrategy(mode);
    const recommendations = [];
    for (const issue of result.issues) {
        const element = result.elements.find((e) => e.id === issue.targetElementId);
        if (!element)
            continue;
        const baseColor = parseHex(element.foreground || '#000000');
        const bgColor = parseHex(element.background || '#ffffff');
        if (!baseColor || !bgColor)
            continue;
        const targetContrast = element.importance === 'high' ? 7.0 : 4.5;
        const context = {
            baseColor,
            backgroundColor: bgColor, // Mapping to againstColor if needed or adding to context
            againstColor: bgColor,
            targetContrast,
            importance: element.importance || 'medium'
        };
        const recs = generateRecommendations(issue, context, strategy);
        recommendations.push(...recs);
    }
    return recommendations;
}
