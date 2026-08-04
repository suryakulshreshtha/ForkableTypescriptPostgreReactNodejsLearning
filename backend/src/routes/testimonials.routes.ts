import { Router } from 'express';
import { Pool } from 'pg';
import { createTestimonialsController } from '../controllers/testimonials.controller';

export function createTestimonialsRouter(pool: Pool): Router {
  const router = Router();
  const controller = createTestimonialsController(pool);

  router.get('/', controller.getAllTestimonials);
  router.post('/', controller.createTestimonial);

  return router;
}
