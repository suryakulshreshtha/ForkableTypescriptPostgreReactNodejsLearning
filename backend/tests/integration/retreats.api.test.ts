import request from 'supertest';
import { Pool } from 'pg';
import { createApp } from '../../src/app';

describe('Retreats API (integration, real PostgreSQL)', () => {
  let pool: Pool;
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
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
    await pool.query('TRUNCATE TABLE retreats RESTART IDENTITY CASCADE');
  });

  describe('POST /api/retreats', () => {
    it('creates a retreat with registered_count defaulting to 0', async () => {
      const res = await request(app).post('/api/retreats').send({
        title: 'Autumn Week Long',
        location: 'Denver, Colorado',
        retreat_type: 'Week Long',
        start_date: '2026-10-04',
        end_date: '2026-10-10',
        capacity: 2,
      });

      expect(res.status).toBe(201);
      expect(res.body.registered_count).toBe(0);
      expect(res.body.capacity).toBe(2);
    });
  });

  describe('GET /api/retreats', () => {
    it('lists retreats ordered by start date', async () => {
      await pool.query(
        `INSERT INTO retreats (title, location, retreat_type, start_date, end_date, capacity)
         VALUES ('Later', 'X', 'Progressive', '2026-12-01', '2026-12-03', 50)`
      );
      await pool.query(
        `INSERT INTO retreats (title, location, retreat_type, start_date, end_date, capacity)
         VALUES ('Sooner', 'Y', 'Progressive', '2026-09-01', '2026-09-03', 50)`
      );

      const res = await request(app).get('/api/retreats');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Sooner');
    });
  });

  describe('POST /api/retreats/:id/register — capacity enforcement', () => {
    it('increments registered_count on a successful registration', async () => {
      const insert = await pool.query(
        `INSERT INTO retreats (title, location, retreat_type, start_date, end_date, capacity)
         VALUES ('Small Retreat', 'Z', 'Advanced', '2026-11-01', '2026-11-03', 3) RETURNING id`
      );
      const id = insert.rows[0].id;

      const res = await request(app).post(`/api/retreats/${id}/register`);

      expect(res.status).toBe(200);
      expect(res.body.registered_count).toBe(1);
    });

    it('fills a retreat to exactly capacity, then rejects the next registration with 409', async () => {
      const insert = await pool.query(
        `INSERT INTO retreats (title, location, retreat_type, start_date, end_date, capacity)
         VALUES ('Tiny Retreat', 'Z', 'Advanced', '2026-11-01', '2026-11-03', 2) RETURNING id`
      );
      const id = insert.rows[0].id;

      const first = await request(app).post(`/api/retreats/${id}/register`);
      const second = await request(app).post(`/api/retreats/${id}/register`);
      const third = await request(app).post(`/api/retreats/${id}/register`);

      expect(first.status).toBe(200);
      expect(first.body.registered_count).toBe(1);
      expect(second.status).toBe(200);
      expect(second.body.registered_count).toBe(2);
      expect(third.status).toBe(409);

      const dbRow = await pool.query('SELECT registered_count FROM retreats WHERE id = $1', [id]);
      expect(dbRow.rows[0].registered_count).toBe(2); // never exceeds capacity in the DB
    });

    it('handles a burst of concurrent registrations without overselling capacity', async () => {
      const insert = await pool.query(
        `INSERT INTO retreats (title, location, retreat_type, start_date, end_date, capacity)
         VALUES ('Concurrency Test Retreat', 'Z', 'Advanced', '2026-11-01', '2026-11-03', 5) RETURNING id`
      );
      const id = insert.rows[0].id;

      // Fire 10 concurrent registration requests at a retreat with only 5 spots.
      const responses = await Promise.all(
        Array.from({ length: 10 }, () => request(app).post(`/api/retreats/${id}/register`))
      );

      const successes = responses.filter((r) => r.status === 200);
      const conflicts = responses.filter((r) => r.status === 409);

      expect(successes).toHaveLength(5);
      expect(conflicts).toHaveLength(5);

      const dbRow = await pool.query('SELECT registered_count FROM retreats WHERE id = $1', [id]);
      expect(dbRow.rows[0].registered_count).toBe(5); // exactly at capacity, never over
    });

    it('returns 404 when registering for a retreat that does not exist', async () => {
      const res = await request(app).post('/api/retreats/999999/register');
      expect(res.status).toBe(404);
    });
  });
});
