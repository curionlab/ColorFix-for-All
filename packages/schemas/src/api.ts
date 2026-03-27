import { z } from 'zod';
import { AnalysisReportSchema } from './domain';

// Since the new architecture is heavily client-side, the API schemas are minimal
// and might just be used for future telemetry or server-side fallback endpoints.

export const HealthResponseSchema = z.object({
  status: z.string(),
  version: z.string()
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const TelemetryRequestSchema = z.object({
  reportSummary: z.object({
    issueCount: z.number(),
    fileName: z.string()
  })
});
export type TelemetryRequest = z.infer<typeof TelemetryRequestSchema>;
