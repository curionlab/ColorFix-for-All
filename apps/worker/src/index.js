import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { analyzeRoute } from './routes/analyze';
const app = new Hono();
app.use('*', cors());
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.route('/api', analyzeRoute);
export default app;
