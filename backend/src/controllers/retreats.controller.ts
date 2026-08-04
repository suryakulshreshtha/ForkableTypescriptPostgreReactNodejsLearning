import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { CreateRetreatInput, RETREAT_TYPES } from '../types/retreat';

export function createRetreatsController(pool: Pool) {
  return {
    async getAllRetreats(_req: Request, res: Response, next: NextFunction) {
      try {
        const result = await pool.query('SELECT * FROM retreats ORDER BY start_date ASC');
        res.status(200).json(result.rows);
      } catch (err) {
        next(err);
      }
    },

    async getRetreatById(req: Request, res: Response, next: NextFunction) {
      try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM retreats WHERE id = $1', [id]);
        if (result.rows.length === 0) {
          res.status(404).json({ error: `Retreat ${id} not found` });
          return;
        }
        res.status(200).json(result.rows[0]);
      } catch (err) {
        next(err);
      }
    },

    async createRetreat(req: Request, res: Response, next: NextFunction) {
      try {
        const { title, location, retreat_type, start_date, end_date, capacity }: CreateRetreatInput = req.body;

        if (!title || typeof title !== 'string' || title.trim().length === 0) {
          res.status(400).json({ error: 'title is required and must be a non-empty string' });
          return;
        }
        if (!RETREAT_TYPES.includes(retreat_type)) {
          res.status(400).json({ error: `retreat_type must be one of: ${RETREAT_TYPES.join(', ')}` });
          return;
        }
        if (!Number.isInteger(capacity) || capacity <= 0) {
          res.status(400).json({ error: 'capacity must be a positive integer' });
          return;
        }

        const result = await pool.query(
          `INSERT INTO retreats (title, location, retreat_type, start_date, end_date, capacity)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [title.trim(), location, retreat_type, start_date, end_date, capacity]
        );
        res.status(201).json(result.rows[0]);
      } catch (err) {
        next(err);
      }
    },

    /**
     * Registers one attendee for a retreat.
     *
     * The capacity check and the increment happen in a single atomic UPDATE
     * (`WHERE registered_count < capacity`) rather than a separate
     * SELECT-then-UPDATE. That matters under concurrency: two simultaneous
     * requests racing a SELECT-then-UPDATE could both read "9 of 10 spots
     * taken" and both succeed, overselling the retreat. The atomic form lets
     * Postgres's row-level locking serialize the two UPDATEs, so only one
     * can claim the last spot — the other reliably gets 0 rows back.
     */
    async registerForRetreat(req: Request, res: Response, next: NextFunction) {
      try {
        const { id } = req.params;

        const existing = await pool.query('SELECT * FROM retreats WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
          res.status(404).json({ error: `Retreat ${id} not found` });
          return;
        }

        const result = await pool.query(
          `UPDATE retreats
           SET registered_count = registered_count + 1
           WHERE id = $1 AND registered_count < capacity
           RETURNING *`,
          [id]
        );

        if (result.rows.length === 0) {
          res.status(409).json({ error: `Retreat ${id} is at full capacity` });
          return;
        }

        res.status(200).json(result.rows[0]);
      } catch (err) {
        next(err);
      }
    },
  };
}
