import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { LogSessionInput } from '../types/practiceSession';
import { calculateCurrentStreak, sumMinutes } from '../utils/streak';

export function createSessionsController(pool: Pool) {
  return {
    async logSession(req: Request, res: Response, next: NextFunction) {
      try {
        const { meditation_id, practiced_by, duration_minutes, coherence_rating }: LogSessionInput = req.body;

        if (!practiced_by || typeof practiced_by !== 'string' || practiced_by.trim().length === 0) {
          res.status(400).json({ error: 'practiced_by is required and must be a non-empty string' });
          return;
        }
        if (!Number.isInteger(meditation_id)) {
          res.status(400).json({ error: 'meditation_id is required and must be an integer' });
          return;
        }
        if (!Number.isInteger(duration_minutes) || duration_minutes <= 0) {
          res.status(400).json({ error: 'duration_minutes must be a positive integer' });
          return;
        }
        if (
          coherence_rating !== undefined &&
          (!Number.isInteger(coherence_rating) || coherence_rating < 1 || coherence_rating > 5)
        ) {
          res.status(400).json({ error: 'coherence_rating must be an integer between 1 and 5' });
          return;
        }

        const meditation = await pool.query('SELECT id FROM meditations WHERE id = $1', [meditation_id]);
        if (meditation.rows.length === 0) {
          res.status(404).json({ error: `Meditation ${meditation_id} not found` });
          return;
        }

        const result = await pool.query(
          `INSERT INTO practice_sessions (meditation_id, practiced_by, duration_minutes, coherence_rating)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [meditation_id, practiced_by.trim(), duration_minutes, coherence_rating ?? null]
        );
        res.status(201).json(result.rows[0]);
      } catch (err) {
        next(err);
      }
    },

    async getSessionsForUser(req: Request, res: Response, next: NextFunction) {
      try {
        const { practicedBy } = req.params;
        const result = await pool.query(
          'SELECT * FROM practice_sessions WHERE practiced_by = $1 ORDER BY completed_at DESC',
          [practicedBy]
        );
        res.status(200).json(result.rows);
      } catch (err) {
        next(err);
      }
    },

    async getStreakForUser(req: Request, res: Response, next: NextFunction) {
      try {
        const { practicedBy } = req.params;
        const result = await pool.query(
          'SELECT duration_minutes, completed_at FROM practice_sessions WHERE practiced_by = $1',
          [practicedBy]
        );

        const sessions = result.rows;
        const currentStreakDays = calculateCurrentStreak(sessions.map((s) => s.completed_at));

        res.status(200).json({
          practiced_by: practicedBy,
          current_streak_days: currentStreakDays,
          total_sessions: sessions.length,
          total_minutes: sumMinutes(sessions),
        });
      } catch (err) {
        next(err);
      }
    },
  };
}
