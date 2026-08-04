import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { CreateTestimonialInput } from '../types/testimonial';

export function createTestimonialsController(pool: Pool) {
  return {
    async getAllTestimonials(_req: Request, res: Response, next: NextFunction) {
      try {
        const result = await pool.query('SELECT * FROM testimonials ORDER BY submitted_at DESC');
        res.status(200).json(result.rows);
      } catch (err) {
        next(err);
      }
    },

    async createTestimonial(req: Request, res: Response, next: NextFunction) {
      try {
        const { name, story, category }: CreateTestimonialInput = req.body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
          res.status(400).json({ error: 'name is required and must be a non-empty string' });
          return;
        }
        if (!story || typeof story !== 'string' || story.trim().length === 0) {
          res.status(400).json({ error: 'story is required and must be a non-empty string' });
          return;
        }

        const result = await pool.query(
          'INSERT INTO testimonials (name, story, category) VALUES ($1, $2, $3) RETURNING *',
          [name.trim(), story.trim(), category ?? null]
        );
        res.status(201).json(result.rows[0]);
      } catch (err) {
        next(err);
      }
    },
  };
}
