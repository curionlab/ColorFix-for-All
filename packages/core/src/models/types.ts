import { Issue, Recommendation, SemanticElement, ExtractedColor } from '@colorfix/schemas';

export type RgbColor = { r: number; g: number; b: number };
export type HslColor = { h: number; s: number; l: number };
export type LabColor = { L: number; a: number; b: number };

export type ColorPair = {
  foreground: RgbColor;
  background: RgbColor;
  elementId?: string;
  selectorHint?: string;
  role?: string;
  isLargeText?: boolean;
};

export type DesignInput = {
  sourceType: 'web';
  sourceUrl: string;
  elements: SemanticElement[];
  declaredColors: ExtractedColor[];
};

export type AnalysisResult = {
  issues: Issue[];
};

export type RecommendationSet = {
  recommendations: Recommendation[];
};

export type CandidateColor = {
  value: RgbColor;
  sourceIssueId: string;
};

export type RecommendationContext = {
  baseColor: RgbColor;
  targetContrast: number;
  againstColor: RgbColor;
  brandColor?: RgbColor;
  fixedProperty: 'color' | 'background-color';
};

export type RankedRecommendation = {
  candidate: RgbColor;
  scores: {
    accessibility: number;
    brandPreservation: number;
    overall: number;
  };
};

export type RecommendationStrategy = {
  mode: 'brand' | 'balanced' | 'readability';
  weightAccessibility: number;
  weightBrand: number;
};
