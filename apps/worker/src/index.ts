import { Context, Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { analyzeRoute } from './routes/analyze';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.get('/api/health', (c: Context) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.route('/api', analyzeRoute);

export default app;
