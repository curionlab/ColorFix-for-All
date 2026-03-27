import { RgbColor } from '../models/types';
import { weightedBrandDistance } from '../color/distance';

export function scoreBrandPreservation(before: RgbColor, after: RgbColor, brandColor?: RgbColor): number {
  const distanceToBefore = weightedBrandDistance(before, after);
  let distance = distanceToBefore;
  
  if (brandColor) {
    const distanceToBrand = weightedBrandDistance(brandColor, after);
    // If it's closer to the picked brand color than the original color, that's also good for brand identity.
    // We'll take the minimum distance as the "deviation from identity".
    distance = Math.min(distanceToBefore, distanceToBrand);
  }
  
  // Distance usually ranges from 0 to ~100+ for very different colors.
  // We want a score from 0 to 1, where 1 means identical (distance 0).
  const maxAcceptableDistance = 100.0;
  if (distance === 0) return 1.0;
  if (distance >= maxAcceptableDistance) return 0.0;
  
  return 1.0 - (distance / maxAcceptableDistance);
}
