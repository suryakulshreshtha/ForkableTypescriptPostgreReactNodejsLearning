import { Router } from 'express';
import { Pool } from 'pg';
import { createTasksController } from '../controllers/tasks.controller';

export function createTasksRouter(pool: Pool): Router {
  const router = Router();
  const controller = createTasksController(pool);

  router.get('/', controller.getAllTasks);
  router.get('/:id', controller.getTaskById);
  router.post('/', controller.createTask);
  router.put('/:id', controller.updateTask);
  router.delete('/:id', controller.deleteTask);

  return router;
}
