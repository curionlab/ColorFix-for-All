import { Issue, SemanticElement } from '@colorfix/schemas';
import { ColorPair } from '../models/types';
import { contrastRatio } from '../color/contrast';
import { toHex } from '../color/parse';

export function detectContrastIssues(pairs: ColorPair[]): Issue[] {
  const issues: Issue[] = [];
  
  for (const pair of pairs) {
    if (!pair.elementId) continue;
    
    const targetContrast = getThreshold(pair);
    const ratio = contrastRatio(pair.foreground, pair.background);
    
    if (ratio >= targetContrast) continue;

    const roleLabel = pair.role === 'border-on-bg' ? 'UI components'
                    : pair.isLargeText               ? 'large text'
                    :                                  'normal text';

    issues.push({
      id:              `contrast-${pair.elementId}-${pair.role ?? 'default'}`,
      kind:            'contrast',
      severity:        getSeverity(ratio, targetContrast),
      targetElementId: pair.elementId!,
      selectorHint:    pair.selectorHint,
      actualColors: {
        foreground: toHex(pair.foreground),
        background: toHex(pair.background),
      },
      message: `Contrast ratio is ${ratio.toFixed(2)}, below the WCAG AA requirement of ${targetContrast} for ${roleLabel}.`,
      metrics: {
        contrastRatio: ratio,
        targetContrast,
      },
    });
  }
  
  return issues;
}

// role × isLargeText で WCAG 正確な閾値を決定
function getThreshold(pair: ColorPair): number {
  if (pair.role === 'border-on-bg') return 3.0;           // WCAG 1.4.11
  if (pair.isLargeText)            return 3.0;            // WCAG 1.4.3 大テキスト
  return 4.5;                                             // WCAG 1.4.3 通常テキスト
}

function getSeverity(ratio: number, threshold: number): 'high' | 'medium' {
  // threshold の 2/3 未満を high（例: 4.5 なら 3.0 未満、3.0 なら 2.0 未満）
  return ratio < (threshold * (2 / 3)) ? 'high' : 'medium';
}

// MVP stubs for other issue types
export function detectAmbiguousPairs(pairs: ColorPair[]): Issue[] {
  return [];
}

export function detectColorOnlyMeaning(elements: SemanticElement[]): Issue[] {
  return [];
}
