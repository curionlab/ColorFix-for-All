import { z } from 'zod';
import { AnalyzeModeSchema, SemanticElementSchema, IssueSchema } from './domain';
export const AnalyzeRequestSchema = z.object({
    url: z.string().url(),
    mode: AnalyzeModeSchema
});
export const AnalyzeResultSchema = z.object({
    url: z.string().url(),
    timestamp: z.string(),
    elements: z.array(SemanticElementSchema),
    issues: z.array(IssueSchema)
});
