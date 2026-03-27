import { CandidateColor, RankedRecommendation, RecommendationContext } from '../models/types';
import { scoreAccessibility } from './accessibility';
import { scoreBrandPreservation } from './brand';

export function rankRecommendations(
  candidates: CandidateColor[],
  context: RecommendationContext,
  weights: { accessibility: number; brand: number }
): RankedRecommendation[] {
  const scored = candidates.map(candidate => {
    const accScore = scoreAccessibility(candidate.value, context);
    const brandScore = scoreBrandPreservation(context.baseColor, candidate.value, context.brandColor);
    
    // Weighted sum
    const overall = (accScore * weights.accessibility) + (brandScore * weights.brand);
    
    return {
      candidate: candidate.value,
      scores: {
        accessibility: accScore,
        brandPreservation: brandScore,
        overall
      }
    };
  });
  
  // Sort descending by overall score
  return scored.sort((a, b) => b.scores.overall - a.scores.overall);
}

export function totalScore(parts: {
  accessibility: number;
  brandPreservation: number;
}, weights: { accessibility: number; brand: number }): number {
  return (parts.accessibility * weights.accessibility) + (parts.brandPreservation * weights.brand);
}
