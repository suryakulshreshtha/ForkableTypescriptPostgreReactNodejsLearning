import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { LogSessionBody, ListSessionsQuery } from '../schemas/session.schemas';

/**
 * Streak, computed in the database.
 *
 * The previous implementation selected every session row for a user and counted
 * distinct days in Node. A user practising daily for three years ships ~1,100
 * rows across the wire to produce a single integer.
 *
 * This is the classic islands-and-gaps problem: number the distinct practice
 * days, subtract the row number from the date, and every consecutive run
 * collapses to the same anchor value. Counting the rows sharing the most recent
 * anchor gives the current streak, in one index scan.
 *
 * The grace period matches calculateCurrentStreak() in utils/streak.ts exactly:
 * practising yesterday keeps the streak alive, because today is not over yet.
 * That function stays as the unit-tested reference implementation and the
 * integration tests assert the two agree -- keeping a readable version beside
 * the fast one is the point, not duplication.
 */
const STREAK_SQL = `
  WITH days AS (
    SELECT DISTINCT (completed_at AT TIME ZONE 'UTC')::date AS day
    FROM practice_sessions
    WHERE practiced_by = $1
  ),
  anchored AS (
    SELECT day,
           day - (ROW_NUMBER() OVER (ORDER BY day))::int AS anchor
    FROM days
  ),
  totals AS (
    SELECT COUNT(*)::int AS total_sessions,
           COALESCE(SUM(duration_minutes), 0)::int AS total_minutes
    FROM practice_sessions
    WHERE practiced_by = $1
  )
  SELECT
    totals.total_sessions,
    totals.total_minutes,
    COALESCE((
      SELECT COUNT(*)::int
      FROM anchored
      WHERE anchor = (SELECT anchor FROM anchored ORDER BY day DESC LIMIT 1)
        AND (SELECT MAX(day) FROM days) >= (NOW() AT TIME ZONE 'UTC')::date - 1
    ), 0) AS current_streak_days
  FROM totals
`;

export function createSessionsController(pool: Pool) {
  return {
    async logSession(req: Request, res: Response, next: NextFunction) {
      try {
        // Already validated, trimmed and coerced by validate(logSessionSchema).
        // The controller's job is the database, not the shape of the request.
        const { meditation_id, practiced_by, duration_minutes, coherence_rating } =
          req.body as LogSessionBody;

        const meditation = await pool.query('SELECT id FROM meditations WHERE id = $1', [
          meditation_id,
        ]);
        if (meditation.rows.length === 0) {
          res.status(404).json({ error: `Meditation ${meditation_id} not found` });
          return;
        }

        const result = await pool.query(
          `INSERT INTO practice_sessions (meditation_id, practiced_by, duration_minutes, coherence_rating)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [meditation_id, practiced_by, duration_minutes, coherence_rating ?? null]
        );
        res.status(201).json(result.rows[0]);
      } catch (err) {
        next(err);
      }
    },

    async getSessionsForUser(req: Request, res: Response, next: NextFunction) {
      try {
        const { practicedBy } = req.params;
        const { limit, before } = req.query as unknown as ListSessionsQuery;

        // Keyset pagination. The previous query had no LIMIT at all, so the
        // response grew without bound as a user kept practising. `before` is a
        // cursor rather than an OFFSET: a session logged between page 1 and
        // page 2 shifts every OFFSET row, and the client silently sees a
        // duplicate. A timestamp cursor is stable under inserts.
        const result = await pool.query(
          `SELECT * FROM practice_sessions
           WHERE practiced_by = $1
             AND ($2::timestamptz IS NULL OR completed_at < $2)
           ORDER BY completed_at DESC
           LIMIT $3`,
          [practicedBy, before ?? null, limit]
        );

        const sessions = result.rows;
        const nextCursor =
          sessions.length === limit ? sessions[sessions.length - 1].completed_at : null;

        res.status(200).json({ sessions, next_cursor: nextCursor, limit });
      } catch (err) {
        next(err);
      }
    },

    async getStreakForUser(req: Request, res: Response, next: NextFunction) {
      try {
        const { practicedBy } = req.params;
        const { rows } = await pool.query(STREAK_SQL, [practicedBy]);
        const summary = rows[0] ?? {
          current_streak_days: 0,
          total_sessions: 0,
          total_minutes: 0,
        };

        res.status(200).json({
          practiced_by: practicedBy,
          current_streak_days: summary.current_streak_days,
          total_sessions: summary.total_sessions,
          total_minutes: summary.total_minutes,
        });
      } catch (err) {
        next(err);
      }
    },
  };
}
