import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { CreateMeditationInput, UpdateMeditationInput, MEDITATION_CATEGORIES } from '../types/meditation';

export function createMeditationsController(pool: Pool) {
  return {
    async getAllMeditations(req: Request, res: Response, next: NextFunction) {
      try {
        const { category } = req.query;
        if (category) {
          const result = await pool.query(
            'SELECT * FROM meditations WHERE category = $1 ORDER BY created_at DESC',
            [category]
          );
          res.status(200).json(result.rows);
          return;
        }
        const result = await pool.query('SELECT * FROM meditations ORDER BY created_at DESC');
        res.status(200).json(result.rows);
      } catch (err) {
        next(err);
      }
    },

    async getMeditationById(req: Request, res: Response, next: NextFunction) {
      try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM meditations WHERE id = $1', [id]);
        if (result.rows.length === 0) {
          res.status(404).json({ error: `Meditation ${id} not found` });
          return;
        }
        res.status(200).json(result.rows[0]);
      } catch (err) {
        next(err);
      }
    },

    async createMeditation(req: Request, res: Response, next: NextFunction) {
      try {
        const { title, category, duration_minutes, description, audio_url }: CreateMeditationInput = req.body;

        if (!title || typeof title !== 'string' || title.trim().length === 0) {
          res.status(400).json({ error: 'title is required and must be a non-empty string' });
          return;
        }
        if (!MEDITATION_CATEGORIES.includes(category)) {
          res.status(400).json({ error: `category must be one of: ${MEDITATION_CATEGORIES.join(', ')}` });
          return;
        }
        if (!Number.isInteger(duration_minutes) || duration_minutes <= 0) {
          res.status(400).json({ error: 'duration_minutes must be a positive integer' });
          return;
        }

        const result = await pool.query(
          `INSERT INTO meditations (title, category, duration_minutes, description, audio_url)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [title.trim(), category, duration_minutes, description ?? null, audio_url ?? null]
        );
        res.status(201).json(result.rows[0]);
      } catch (err) {
        next(err);
      }
    },

    async updateMeditation(req: Request, res: Response, next: NextFunction) {
      try {
        const { id } = req.params;
        const { title, category, duration_minutes, description, audio_url }: UpdateMeditationInput = req.body;

        const existing = await pool.query('SELECT * FROM meditations WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
          res.status(404).json({ error: `Meditation ${id} not found` });
          return;
        }

        if (category !== undefined && !MEDITATION_CATEGORIES.includes(category)) {
          res.status(400).json({ error: `category must be one of: ${MEDITATION_CATEGORIES.join(', ')}` });
          return;
        }

        const current = existing.rows[0];
        const result = await pool.query(
          `UPDATE meditations
           SET title = $1, category = $2, duration_minutes = $3, description = $4, audio_url = $5, updated_at = NOW()
           WHERE id = $6
           RETURNING *`,
          [
            title ?? current.title,
            category ?? current.category,
            duration_minutes ?? current.duration_minutes,
            description ?? current.description,
            audio_url ?? current.audio_url,
            id,
          ]
        );
        res.status(200).json(result.rows[0]);
      } catch (err) {
        next(err);
      }
    },

    async deleteMeditation(req: Request, res: Response, next: NextFunction) {
      try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM meditations WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
          res.status(404).json({ error: `Meditation ${id} not found` });
          return;
        }
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  };
}
