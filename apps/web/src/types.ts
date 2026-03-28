export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractedTextElement {
  id: string;
  text: string;
  bounds: BoundingBox;
  fontSize?: number;
  fontFamily?: string;
  foregroundColor: string; // Extracted hex or rgb
  backgroundColor: string; // Sampled hex or rgb
}

export interface Issue {
  id: string;
  elementId: string;
  message: string;
  metrics: {
    contrastRatio: number;
    passesWcagAA: boolean;
    passesIso24505: boolean;
    isoDetails?: any;
  };
}

export interface Recommendation {
  issueId: string;
  originalFg: string;
  originalBg: string;
  suggestedFg: string;
  suggestedBg: string;
  reason: string;
}

export interface AnalysisReport {
  fileName: string;
  elements: ExtractedTextElement[];
  issues: Issue[];
  recommendations: Recommendation[];
}
