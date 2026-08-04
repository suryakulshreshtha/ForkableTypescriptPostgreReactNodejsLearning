import request from 'supertest';
import { Pool } from 'pg';
import { createApp } from '../../src/app';

/**
 * These tests use real, relative Postgres timestamps (`NOW() - INTERVAL`)
 * rather than hardcoded dates, so the suite stays correct indefinitely and
 * never goes stale the way a fixed date like '2026-06-15' eventually would.
 * The pure day-boundary edge cases (month/year rollovers, grace periods,
 * etc.) are already covered deterministically in tests/unit/streak.test.ts —
 * this file's job is to prove the real DB + HTTP + streak-utility wiring
 * behaves correctly together, not to re-litigate every calendar edge case.
 */
describe('Sessions API (integration, real PostgreSQL)', () => {
  let pool: Pool;
  let app: ReturnType<typeof createApp>;
  let meditationId: number;

  beforeAll(async () => {
    pool = new Pool({
      host: process.env.TEST_PGHOST,
      port: Number(process.env.TEST_PGPORT) || 5432,
      user: process.env.TEST_PGUSER,
      password: process.env.TEST_PGPASSWORD,
      database: process.env.TEST_PGDATABASE,
    });
    app = createApp(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE practice_sessions, meditations RESTART IDENTITY CASCADE');
    const inserted = await pool.query(
      "INSERT INTO meditations (title, category, duration_minutes) VALUES ('Test Meditation', 'sitting', 10) RETURNING id"
    );
    meditationId = inserted.rows[0].id;
  });

  describe('POST /api/sessions', () => {
    it('logs a session and persists it', async () => {
      const res = await request(app).post('/api/sessions').send({
        meditation_id: meditationId,
        practiced_by: 'Alex',
        duration_minutes: 12,
        coherence_rating: 4,
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ practiced_by: 'Alex', duration_minutes: 12, coherence_rating: 4 });

      const dbRow = await pool.query('SELECT * FROM practice_sessions WHERE id = $1', [res.body.id]);
      expect(dbRow.rows).toHaveLength(1);
    });

    it('returns 404 when the meditation does not exist', async () => {
      const res = await request(app).post('/api/sessions').send({
        meditation_id: 999999,
        practiced_by: 'Alex',
        duration_minutes: 12,
      });
      expect(res.status).toBe(404);
    });

    it('returns 400 when practiced_by is missing', async () => {
      const res = await request(app).post('/api/sessions').send({
        meditation_id: meditationId,
        duration_minutes: 12,
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when coherence_rating is out of range', async () => {
      const res = await request(app).post('/api/sessions').send({
        meditation_id: meditationId,
        practiced_by: 'Alex',
        duration_minutes: 12,
        coherence_rating: 9,
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/sessions/user/:practicedBy', () => {
    it('lists sessions for a specific user, newest first', async () => {
      await pool.query(
        `INSERT INTO practice_sessions (meditation_id, practiced_by, duration_minutes, completed_at)
         VALUES ($1, 'Jordan', 10, NOW() - INTERVAL '1 day')`,
        [meditationId]
      );
      await pool.query(
        `INSERT INTO practice_sessions (meditation_id, practiced_by, duration_minutes, completed_at)
         VALUES ($1, 'Jordan', 15, NOW())`,
        [meditationId]
      );

      const res = await request(app).get('/api/sessions/user/Jordan');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].duration_minutes).toBe(15); // most recent first
    });
  });

  describe('GET /api/sessions/user/:practicedBy/streak', () => {
    it('returns a streak of 1 with a single session logged today', async () => {
      await request(app).post('/api/sessions').send({
        meditation_id: meditationId,
        practiced_by: 'Sam',
        duration_minutes: 10,
      });

      const res = await request(app).get('/api/sessions/user/Sam/streak');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ practiced_by: 'Sam', current_streak_days: 1, total_sessions: 1, total_minutes: 10 });
    });

    it('returns a streak of 3 for three consecutive days including today', async () => {
      for (const daysAgo of [2, 1, 0]) {
        await pool.query(
          `INSERT INTO practice_sessions (meditation_id, practiced_by, duration_minutes, completed_at)
           VALUES ($1, 'Riley', 10, NOW() - ($2 || ' days')::interval)`,
          [meditationId, daysAgo]
        );
      }

      const res = await request(app).get('/api/sessions/user/Riley/streak');

      expect(res.status).toBe(200);
      expect(res.body.current_streak_days).toBe(3);
      expect(res.body.total_sessions).toBe(3);
      expect(res.body.total_minutes).toBe(30);
    });

    it('returns a streak of 0 when the last session was 3+ days ago', async () => {
      await pool.query(
        `INSERT INTO practice_sessions (meditation_id, practiced_by, duration_minutes, completed_at)
         VALUES ($1, 'Casey', 10, NOW() - INTERVAL '3 days')`,
        [meditationId]
      );

      const res = await request(app).get('/api/sessions/user/Casey/streak');

      expect(res.status).toBe(200);
      expect(res.body.current_streak_days).toBe(0);
      expect(res.body.total_sessions).toBe(1); // history is preserved even though the streak is broken
    });

    it('returns zeroed-out values for a user with no sessions', async () => {
      const res = await request(app).get('/api/sessions/user/NoOne/streak');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ current_streak_days: 0, total_sessions: 0, total_minutes: 0 });
    });
  });
});
