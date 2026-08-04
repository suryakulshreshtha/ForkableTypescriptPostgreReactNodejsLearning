import { Router } from 'express';
import { Pool } from 'pg';
import { createMeditationsController } from '../controllers/meditations.controller';

export function createMeditationsRouter(pool: Pool): Router {
  const router = Router();
  const controller = createMeditationsController(pool);

  router.get('/', controller.getAllMeditations);
  router.get('/:id', controller.getMeditationById);
  router.post('/', controller.createMeditation);
  router.put('/:id', controller.updateMeditation);
  router.delete('/:id', controller.deleteMeditation);

  return router;
}
