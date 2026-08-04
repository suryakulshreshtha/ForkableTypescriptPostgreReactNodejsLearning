import { Router } from 'express';
import { Pool } from 'pg';
import { createSessionsController } from '../controllers/sessions.controller';

export function createSessionsRouter(pool: Pool): Router {
  const router = Router();
  const controller = createSessionsController(pool);

  router.post('/', controller.logSession);
  router.get('/user/:practicedBy', controller.getSessionsForUser);
  router.get('/user/:practicedBy/streak', controller.getStreakForUser);

  return router;
}
