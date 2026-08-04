import { Router } from 'express';
import { Pool } from 'pg';
import { createRetreatsController } from '../controllers/retreats.controller';

export function createRetreatsRouter(pool: Pool): Router {
  const router = Router();
  const controller = createRetreatsController(pool);

  router.get('/', controller.getAllRetreats);
  router.get('/:id', controller.getRetreatById);
  router.post('/', controller.createRetreat);
  router.post('/:id/register', controller.registerForRetreat);

  return router;
}
