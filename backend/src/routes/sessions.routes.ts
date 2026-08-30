import { Router } from 'express';
import { Pool } from 'pg';
import { createSessionsController } from '../controllers/sessions.controller';
import { validate } from '../middleware/validate';
import {
  logSessionSchema,
  listSessionsQuerySchema,
  practicedByParamsSchema,
} from '../schemas/session.schemas';

export function createSessionsRouter(pool: Pool): Router {
  const router = Router();
  const controller = createSessionsController(pool);

  // Validation runs before the handler, so a controller never sees a request it
  // would have to defend against.
  router.post('/', validate(logSessionSchema), controller.logSession);

  router.get(
    '/user/:practicedBy',
    validate(practicedByParamsSchema, 'params'),
    validate(listSessionsQuerySchema, 'query'),
    controller.getSessionsForUser
  );

  router.get(
    '/user/:practicedBy/streak',
    validate(practicedByParamsSchema, 'params'),
    controller.getStreakForUser
  );

  return router;
}
