import { rgbToHsl, hslToRgb } from '../color/convert';
import { toHex } from '../color/parse';
import { rankRecommendations } from '../scoring/overall';
import { buildRecommendationReason } from './explain';
export function searchNearbyAccessibleColors(baseColor, context, strategy) {
    const candidates = [];
    const baseHsl = rgbToHsl(baseColor);
    const lSteps = [-40, -30, -20, -10, 0, 10, 20, 30, 40];
    const sSteps = [-20, -10, 0, 10, 20];
    const hSteps = [-15, 0, 15];
    for (const dl of lSteps) {
        for (const ds of sSteps) {
            for (const dh of hSteps) {
                if (dl === 0 && ds === 0 && dh === 0)
                    continue; // Skip exact same color
                let newL = baseHsl.l + dl;
                let newS = baseHsl.s + ds;
                let newH = baseHsl.h + dh;
                newL = Math.max(0, Math.min(100, newL));
                newS = Math.max(0, Math.min(100, newS));
                if (newH < 0)
                    newH += 360;
                if (newH >= 360)
                    newH -= 360;
                candidates.push({
                    value: hslToRgb({ h: newH, s: newS, l: newL }),
                    sourceIssueId: ''
                });
            }
        }
    }
    return candidates;
}
export function generateRecommendations(issue, context, strategy) {
    const candidates = searchNearbyAccessibleColors(context.baseColor, context, strategy);
    const ranked = rankRecommendations(candidates, context, {
        accessibility: strategy.weightAccessibility,
        brand: strategy.weightBrand
    });
    // Filter candidates that don't improve accessibility enough
    const validCandidates = ranked.filter(r => r.scores.accessibility > 0.6);
    const best = validCandidates.slice(0, 3);
    if (best.length === 0) {
        return []; // Could fall back to a safe color if no candidates found
    }
    return best.map(b => ({
        issueId: issue.id,
        mode: strategy.mode,
        replacements: [
            { from: toHex(context.baseColor), to: toHex(b.candidate) }
        ],
        scores: {
            accessibility: Math.round(b.scores.accessibility * 100) / 100,
            brandPreservation: Math.round(b.scores.brandPreservation * 100) / 100,
            overall: Math.round(b.scores.overall * 100) / 100
        },
        reason: buildRecommendationReason(context.baseColor, b.candidate, b.scores),
        cssPatch: `#${issue.targetElementId} {\n  color: ${toHex(b.candidate)};\n}`
    }));
}
