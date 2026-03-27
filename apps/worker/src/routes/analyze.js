import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { AnalyzeRequestSchema } from '@colorfix/schemas';
import { runAnalysis } from '../services/analyzer';
const analyzeRoute = new Hono();
analyzeRoute.post('/analyze', zValidator('json', AnalyzeRequestSchema), async (c) => {
    const { url, mode } = c.req.valid('json');
    try {
        const result = await runAnalysis(url, mode);
        return c.json(result);
    }
    catch (error) {
        console.error('Analysis failed:', error);
        return c.json({ error: 'Analysis failed', message: error.message }, 500);
    }
});
export { analyzeRoute };
