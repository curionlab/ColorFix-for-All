import { RgbColor } from '../models/types';
import { rgbToHsl } from '../color/convert';

export function buildRecommendationReason(
  before: RgbColor,
  after: RgbColor,
  scores: { accessibility: number; brandPreservation: number }
): string {
  const hslBefore = rgbToHsl(before);
  const hslAfter = rgbToHsl(after);
  
  const reasons: string[] = [];
  
  const lDiff = hslAfter.l - hslBefore.l;
  if (Math.abs(lDiff) > 5) {
    if (lDiff > 0) reasons.push('明るさを上げて背景との差を広げました');
    else reasons.push('明るさを少し下げて背景との差を広げました');
  }
  
  const sDiff = hslAfter.s - hslBefore.s;
  if (Math.abs(sDiff) > 10) {
    if (sDiff > 0) reasons.push('彩度を上げて色を鮮やかにしました');
    else reasons.push('彩度を抑えて近い色との混同を減らしました');
  }
  
  if (reasons.length === 0) {
    reasons.push('元の色味を大きく変えずに見やすく調整しました');
  }
  
  return reasons.join('。') + '。';
}
