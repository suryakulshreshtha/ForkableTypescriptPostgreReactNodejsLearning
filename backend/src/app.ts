import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Pool } from 'pg';
import { createMeditationsRouter } from './routes/meditations.routes';
import { createSessionsRouter } from './routes/sessions.routes';
import { createRetreatsRouter } from './routes/retreats.routes';
import { createTestimonialsRouter } from './routes/testimonials.routes';
import { errorHandler } from './middleware/errorHandler';

/**
 * Allowed browser origins, comma-separated.
 *
 * `cors()` with no options answers every request with
 * `Access-Control-Allow-Origin: *`, so any page on the internet can call this
 * API from a visitor's browser. Acceptable for a public read-only API, wrong
 * the moment writes or credentials exist -- and this API accepts writes.
 *
 * Defaults to the Vite dev server so a fresh clone still works with no .env.
 */
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

/**
 * Builds the Express app without starting a listener. Kept separate from
 * index.ts so integration tests can exercise real HTTP handling (via
 * supertest) without binding to a port.
 */
export function createApp(pool: Pool): Express {
  const app = express();

  // Standard security headers (nosniff, frameguard, HSTS, referrer policy).
  // contentSecurityPolicy is disabled because this process serves JSON, not
  // HTML -- the frontend sets its own.
  app.use(helmet({ contentSecurityPolicy: false }));

  app.use(cors({ origin: allowedOrigins }));

  // A body limit is a denial-of-service control: without one a single request
  // can make the process allocate until it dies. 100kb is generous for the
  // largest payload here (a testimonial).
  app.use(express.json({ limit: '100kb' }));

  // Blunt but effective. Skipped under test so the suite is not rate-limited
  // by its own speed.
  if (process.env.NODE_ENV !== 'test') {
    app.use(
      rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 1000,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { error: 'Too many requests, please retry shortly.' },
      })
    );
  }

  // Liveness: is the process running at all? Never touches a dependency, so a
  // dead database cannot cause an orchestrator to restart a healthy process.
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Readiness: can this instance actually serve traffic? This used to be
  // conflated with /health, which returned ok unconditionally -- so a load
  // balancer would happily route to a process whose Postgres connection was
  // dead, and every request 500ed.
  app.get('/ready', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.status(200).json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'degraded', dependency: 'postgres' });
    }
  });

  app.use('/api/meditations', createMeditationsRouter(pool));
  app.use('/api/sessions', createSessionsRouter(pool));
  app.use('/api/retreats', createRetreatsRouter(pool));
  app.use('/api/testimonials', createTestimonialsRouter(pool));

  app.use(errorHandler);

  return app;
}
