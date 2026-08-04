import express, { Express } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { createMeditationsRouter } from './routes/meditations.routes';
import { createSessionsRouter } from './routes/sessions.routes';
import { createRetreatsRouter } from './routes/retreats.routes';
import { createTestimonialsRouter } from './routes/testimonials.routes';
import { errorHandler } from './middleware/errorHandler';

/**
 * Builds the Express app without starting a listener. Kept separate from
 * index.ts so integration tests can exercise real HTTP handling (via
 * supertest) without binding to a port.
 */
export function createApp(pool: Pool): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/meditations', createMeditationsRouter(pool));
  app.use('/api/sessions', createSessionsRouter(pool));
  app.use('/api/retreats', createRetreatsRouter(pool));
  app.use('/api/testimonials', createTestimonialsRouter(pool));

  app.use(errorHandler);

  return app;
}
