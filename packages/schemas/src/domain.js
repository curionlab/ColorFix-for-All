import { z } from 'zod';
export const AnalyzeModeSchema = z.enum(["brand", "balanced", "readability"]);
export const ExtractedColorSchema = z.object({
    value: z.string(),
    source: z.enum(["inline", "style-tag", "computed-like"]),
    count: z.number()
});
export const SemanticRoleSchema = z.enum([
    "text", "background", "link", "button", "border", "accent", "unknown"
]);
export const SemanticElementSchema = z.object({
    id: z.string(),
    selectorHint: z.string(),
    tagName: z.string(),
    textSample: z.string().optional(),
    role: SemanticRoleSchema,
    foreground: z.string().optional(),
    background: z.string().optional(),
    importance: z.enum(["high", "medium", "low"])
});
export const DesignInputSchema = z.object({
    url: z.string().url(),
    elements: z.array(SemanticElementSchema),
    declaredColors: z.array(ExtractedColorSchema),
    sourceType: z.literal('web'),
    sourceUrl: z.string().url()
});
export const IssueSchema = z.object({
    id: z.string(),
    kind: z.enum(["contrast", "ambiguity", "color-only-meaning"]),
    severity: z.enum(["high", "medium", "low"]),
    targetElementId: z.string(),
    currentColors: z.array(z.string()),
    message: z.string(),
    metrics: z.object({
        contrastRatio: z.number().optional(),
        targetContrast: z.number().optional()
    }).optional()
});
export const RecommendationSchema = z.object({
    issueId: z.string(),
    mode: AnalyzeModeSchema,
    replacements: z.array(z.object({ from: z.string(), to: z.string() })),
    scores: z.object({
        accessibility: z.number(),
        brandPreservation: z.number(),
        overall: z.number()
    }),
    reason: z.string(),
    cssPatch: z.string()
});
