import { contrastRatio } from '../color/contrast';
import { RecommendationContext, RgbColor } from '../models/types';

export function scoreAccessibility(candidate: RgbColor, context: RecommendationContext): number {
  const currentRatio = contrastRatio(candidate, context.againstColor);
  if (currentRatio >= context.targetContrast) return 1.0;
  
  // Score drops as it gets further from target. Minimum acceptable is ~3.0 usually, but let's make it a curve.
  const diff = context.targetContrast - currentRatio;
  const penalty = diff / context.targetContrast; // 0 to 1
  return Math.max(0, 1.0 - penalty);
}

export function scoreByTier(candidate: RgbColor, context: RecommendationContext): number {
  const currentRatio = contrastRatio(candidate, context.againstColor);
  if (currentRatio >= 7.0) return 3; // 非常に識別しやすい
  if (currentRatio >= 4.5) return 2; // 識別しやすい
  if (currentRatio >= 3.0) return 1; // やや識別しやすい
  return 0;
}
