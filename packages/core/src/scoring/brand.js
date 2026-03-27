import { weightedBrandDistance } from '../color/distance';
export function scoreBrandPreservation(before, after) {
    const distance = weightedBrandDistance(before, after);
    // Distance usually ranges from 0 to ~100+ for very different colors.
    // We want a score from 0 to 1, where 1 means identical (distance 0).
    const maxAcceptableDistance = 100.0;
    if (distance === 0)
        return 1.0;
    if (distance >= maxAcceptableDistance)
        return 0.0;
    return 1.0 - (distance / maxAcceptableDistance);
}
