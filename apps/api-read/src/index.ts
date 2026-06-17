import { Hono } from 'hono';
import type { Env } from './lib/env.js';
import healthRoute from './routes/health.js';
import totalsRoute from './routes/totals.js';
import donationsRoute from './routes/donations.js';
import disbursementsRoute from './routes/disbursements.js';
import ledgerEventsRoute from './routes/ledger-events.js';
import verifyRoute from './routes/verify.js';

const app = new Hono<{ Bindings: Env }>();

app.route('/', healthRoute);
app.route('/', totalsRoute);
app.route('/', donationsRoute);
app.route('/', disbursementsRoute);
app.route('/', ledgerEventsRoute);
app.route('/', verifyRoute);

export default app;
