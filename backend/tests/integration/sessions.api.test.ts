import request from 'supertest';
import { Pool } from 'pg';
import { createApp } from '../../src/app';
import { calculateCurrentStreak } from '../../src/utils/streak';

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
      expect(res.body.sessions).toHaveLength(2);
      expect(res.body.sessions[0].duration_minutes).toBe(15); // most recent first
      // Fewer rows than the limit means there is no next page.
      expect(res.body.next_cursor).toBeNull();
    });

    it('caps the page at the requested limit and hands back a usable cursor', async () => {
      for (let day = 0; day < 5; day += 1) {
        await pool.query(
          `INSERT INTO practice_sessions (meditation_id, practiced_by, duration_minutes, completed_at)
           VALUES ($1, 'Paged', 10, NOW() - ($2 || ' days')::interval)`,
          [meditationId, day]
        );
      }

      const first = await request(app).get('/api/sessions/user/Paged?limit=2');
      expect(first.status).toBe(200);
      expect(first.body.sessions).toHaveLength(2);
      expect(first.body.next_cursor).not.toBeNull();

      // Following the cursor must not repeat a row -- the whole reason for
      // keyset paging over OFFSET.
      const second = await request(app).get(
        `/api/sessions/user/Paged?limit=2&before=${encodeURIComponent(first.body.next_cursor)}`
      );
      expect(second.body.sessions).toHaveLength(2);
      const firstIds = first.body.sessions.map((s: { id: number }) => s.id);
      const secondIds = second.body.sessions.map((s: { id: number }) => s.id);
      expect(firstIds.filter((id: number) => secondIds.includes(id))).toEqual([]);

      const last = await request(app).get(
        `/api/sessions/user/Paged?limit=2&before=${encodeURIComponent(second.body.next_cursor)}`
      );
      expect(last.body.sessions).toHaveLength(1);
      expect(last.body.next_cursor).toBeNull();
    });

    it('rejects a limit outside the allowed range instead of trusting it', async () => {
      // Without a ceiling, ?limit=100000000 is a denial-of-service vector.
      const res = await request(app).get('/api/sessions/user/Jordan?limit=100000');
      expect(res.status).toBe(400);
      expect(res.body.details[0].field).toBe('limit');
    });
  });

  describe('Operational endpoints', () => {
    it('reports ready when Postgres answers', async () => {
      const res = await request(app).get('/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
    });

    it('reports degraded, not ok, when the pool is unusable', async () => {
      // /health used to return ok unconditionally, so a load balancer would
      // route traffic to a process whose database connection was dead.
      const brokenPool = new Pool({ host: '127.0.0.1', port: 1, connectionTimeoutMillis: 500 });
      const degraded = createApp(brokenPool);

      const health = await request(degraded).get('/health');
      expect(health.status).toBe(200); // liveness: the process itself is fine

      const ready = await request(degraded).get('/ready');
      expect(ready.status).toBe(503);
      expect(ready.body.dependency).toBe('postgres');

      await brokenPool.end().catch(() => undefined);
    });

    it('sets security headers and refuses an oversized body', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');

      const huge = await request(app)
        .post('/api/sessions')
        .send({ meditation_id: 1, practiced_by: 'x'.repeat(200_000), duration_minutes: 5 });
      expect(huge.status).toBe(413);
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

/**
 * The streak moved from Node into SQL for performance. The readable
 * implementation in utils/streak.ts stays as the reference, and this proves
 * the two agree -- otherwise "we kept the readable version" is a comment
 * rather than a guarantee.
 */
describe('Streak SQL agrees with the reference implementation', () => {
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
    const med = await pool.query(
      `INSERT INTO meditations (title, category, duration_minutes)
       VALUES ('Agreement', 'sitting', 10) RETURNING id`
    );
    meditationId = med.rows[0].id;
  });

  const shapes: Array<[string, number[]]> = [
    ['unbroken run including today', [0, 1, 2, 3, 4]],
    ['run ending yesterday (grace day)', [1, 2, 3]],
    ['broken three days ago', [3, 4, 5]],
    ['several sessions on the same day', [0, 0, 0, 1]],
    ['gap in the middle', [0, 1, 5, 6]],
    ['single session today', [0]],
  ];

  it.each(shapes)('%s', async (_label, daysAgo) => {
    for (const day of daysAgo) {
      await pool.query(
        `INSERT INTO practice_sessions (meditation_id, practiced_by, duration_minutes, completed_at)
         VALUES ($1, 'Agree', 10, NOW() - ($2 || ' days')::interval)`,
        [meditationId, day]
      );
    }

    const viaSql = await request(app).get('/api/sessions/user/Agree/streak');
    const rows = await pool.query(
      'SELECT completed_at FROM practice_sessions WHERE practiced_by = $1',
      ['Agree']
    );
    const viaNode = calculateCurrentStreak(rows.rows.map((r) => r.completed_at));

    expect(viaSql.body.current_streak_days).toBe(viaNode);
    expect(viaSql.body.total_sessions).toBe(daysAgo.length);
  });
});
