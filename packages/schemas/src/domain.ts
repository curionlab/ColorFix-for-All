import { z } from 'zod';

export const BoundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number()
});
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

export const ExtractedTextElementSchema = z.object({
  id: z.string(),
  text: z.string(),
  bounds: BoundingBoxSchema,
  fontSize: z.number().optional(),
  fontFamily: z.string().optional(),
  foregroundColor: z.string(), // Extracted hex or rgb
  backgroundColor: z.string()  // Sampled hex or rgb
});
export type ExtractedTextElement = z.infer<typeof ExtractedTextElementSchema>;

export const IssueSchema = z.object({
  id: z.string(),
  elementId: z.string(),
  message: z.string(),
  metrics: z.object({
    contrastRatio: z.number(),
    passesWcagAA: z.boolean(),
    passesIso24505: z.boolean(),
    isoDetails: z.any().optional()
  })
});
export type Issue = z.infer<typeof IssueSchema>;

export const RecommendationSchema = z.object({
  issueId: z.string(),
  originalFg: z.string(),
  originalBg: z.string(),
  suggestedFg: z.string(),
  reason: z.string()
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

export const AnalysisReportSchema = z.object({
  fileName: z.string(),
  elements: z.array(ExtractedTextElementSchema),
  issues: z.array(IssueSchema),
  recommendations: z.array(RecommendationSchema)
});
export type AnalysisReport = z.infer<typeof AnalysisReportSchema>;
