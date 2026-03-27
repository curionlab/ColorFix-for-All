import { Context, Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { AnalyzeRequestSchema } from '@colorfix/schemas';
import { runAnalysis } from '../services/analyzer';

const analyzeRoute = new Hono();

analyzeRoute.post('/analyze', async (c: Context) => {
  const body = await c.req.json();
  const { url, mode, brandColor } = AnalyzeRequestSchema.parse(body);
  
  try {
    const result = await runAnalysis(url, mode, brandColor || undefined);
    return c.json(result);
  } catch (error: any) {
    console.error('Analysis failed:', error);
    return c.json({ error: 'Analysis failed', message: error.message }, 500);
  }
});

export { analyzeRoute };
