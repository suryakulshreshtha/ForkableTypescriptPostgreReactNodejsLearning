import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { CreateTaskInput, UpdateTaskInput } from '../types/task';

/**
 * Controller factory. Accepting the pool as a parameter (rather than importing
 * the singleton directly) is what makes these handlers trivial to unit test —
 * tests can inject a mocked Pool instead of touching a real database.
 */
export function createTasksController(pool: Pool) {
  return {
    async getAllTasks(_req: Request, res: Response, next: NextFunction) {
      try {
        const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
        res.status(200).json(result.rows);
      } catch (err) {
        next(err);
      }
    },

    async getTaskById(req: Request, res: Response, next: NextFunction) {
      try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
        if (result.rows.length === 0) {
          res.status(404).json({ error: `Task ${id} not found` });
          return;
        }
        res.status(200).json(result.rows[0]);
      } catch (err) {
        next(err);
      }
    },

    async createTask(req: Request, res: Response, next: NextFunction) {
      try {
        const { title, description }: CreateTaskInput = req.body;

        if (!title || typeof title !== 'string' || title.trim().length === 0) {
          res.status(400).json({ error: 'title is required and must be a non-empty string' });
          return;
        }

        const result = await pool.query(
          'INSERT INTO tasks (title, description) VALUES ($1, $2) RETURNING *',
          [title.trim(), description ?? null]
        );
        res.status(201).json(result.rows[0]);
      } catch (err) {
        next(err);
      }
    },

    async updateTask(req: Request, res: Response, next: NextFunction) {
      try {
        const { id } = req.params;
        const { title, description, is_complete }: UpdateTaskInput = req.body;

        const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
          res.status(404).json({ error: `Task ${id} not found` });
          return;
        }

        const current = existing.rows[0];
        const result = await pool.query(
          `UPDATE tasks
           SET title = $1, description = $2, is_complete = $3, updated_at = NOW()
           WHERE id = $4
           RETURNING *`,
          [
            title ?? current.title,
            description ?? current.description,
            is_complete ?? current.is_complete,
            id,
          ]
        );
        res.status(200).json(result.rows[0]);
      } catch (err) {
        next(err);
      }
    },

    async deleteTask(req: Request, res: Response, next: NextFunction) {
      try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
          res.status(404).json({ error: `Task ${id} not found` });
          return;
        }
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  };
}
