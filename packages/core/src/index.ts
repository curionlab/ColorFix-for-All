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

import { colorDistance } from './color/distance';
import { DesignInput, AnalyzeResult, AnalyzeMode, Recommendation, SemanticElement } from '@colorfix/schemas';
import { inferRoles } from './analysis/roles';
import { buildColorPairs } from './analysis/pairs';
import { detectContrastIssues, detectAmbiguousPairs, detectColorOnlyMeaning } from './analysis/issues';
import { getStrategy } from './recommendation/strategies';
import { generateRecommendations } from './recommendation/search';
import { parseHex } from './color/parse';

export function analyzeDesignInput(input: DesignInput): AnalyzeResult {
  const elements = inferRoles(input.elements);

  // body要素からデフォルト色を抽出してフォールバック補完
  const bodyEl = elements.find(el => el.tagName.toLowerCase() === 'body');
  const bodyDefaults = {
    foreground: bodyEl?.foreground,
    background: bodyEl?.background,
  };

  // body以外の要素に undefined があれば body デフォルトで補完
  const filledElements = elements.map(el =>
    el.tagName.toLowerCase() === 'body' ? el : {
      ...el,
      foreground: el.foreground ?? bodyDefaults.foreground,
      background: el.background ?? bodyDefaults.background,
    } as SemanticElement
  );

  const pairs = buildColorPairs(filledElements, bodyDefaults);

  const issues = [
    ...detectContrastIssues(pairs),
    ...detectAmbiguousPairs(pairs),
    ...detectColorOnlyMeaning(filledElements),
  ];

  return {
    url:            input.url,
    timestamp:      new Date().toISOString(),
    elements:       filledElements,
    declaredColors: input.declaredColors,
    issues,
  };
}

export function recommendFixes(result: AnalyzeResult, mode: AnalyzeMode, brandColor?: string): Recommendation[] {
  const strategy = getStrategy(mode);
  const recommendations: Recommendation[] = [];
  
  const parsedBrandColor = brandColor ? (parseHex(brandColor) || undefined) : undefined;
  
  for (const issue of result.issues) {
    const element = result.elements.find((e: SemanticElement) => e.id === issue.targetElementId);
    if (!element) continue;
    
    const baseColor = parseHex(element.foreground || '#000000');
    const bgColor = parseHex(element.background || '#ffffff');
    if (!baseColor || !bgColor) continue;
    
    const targetContrast = element.importance === 'high' ? 7.0 : 4.5;
    
    const colorDist = parsedBrandColor ? colorDistance(bgColor, parsedBrandColor) : 100;
    const isBrandBg = colorDist < 30; // Close enough to be brand background
    
    const context = {
      baseColor: isBrandBg ? baseColor : bgColor,
      againstColor: isBrandBg ? bgColor : baseColor,
      targetContrast,
      brandColor: parsedBrandColor,
      fixedProperty: (isBrandBg ? 'color' : 'background-color') as 'color' | 'background-color'
    };
    
    const recs = generateRecommendations(issue, context, strategy);
    recommendations.push(...recs);
  }
  
  return recommendations;
}
