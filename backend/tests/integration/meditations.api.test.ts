import request from 'supertest';
import { Pool } from 'pg';
import { createApp } from '../../src/app';

describe('Meditations API (integration, real PostgreSQL)', () => {
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
    await pool.query('TRUNCATE TABLE practice_sessions, meditations RESTART IDENTITY CASCADE');
  });

  describe('POST /api/meditations', () => {
    it('creates a meditation and persists it to Postgres', async () => {
      const res = await request(app)
        .post('/api/meditations')
        .send({ title: 'Morning Sit', category: 'sitting', duration_minutes: 15 });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ title: 'Morning Sit', category: 'sitting', duration_minutes: 15 });

      const dbRow = await pool.query('SELECT * FROM meditations WHERE id = $1', [res.body.id]);
      expect(dbRow.rows).toHaveLength(1);
    });

    it('rejects an invalid category at the database boundary check too', async () => {
      // Bypasses controller validation isn't possible via HTTP, but this proves
      // the CHECK constraint exists as defence-in-depth if the app layer ever regresses.
      await expect(
        pool.query(
          "INSERT INTO meditations (title, category, duration_minutes) VALUES ('x', 'floating', 5)"
        )
      ).rejects.toThrow();
    });

    it('rejects a meditation with no title with 400', async () => {
      const res = await request(app)
        .post('/api/meditations')
        .send({ category: 'sitting', duration_minutes: 10 });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/meditations', () => {
    it('returns all meditations when no filter is applied', async () => {
      await pool.query("INSERT INTO meditations (title, category, duration_minutes) VALUES ('A', 'sitting', 10)");
      await pool.query("INSERT INTO meditations (title, category, duration_minutes) VALUES ('B', 'walking', 20)");

      const res = await request(app).get('/api/meditations');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('filters by category', async () => {
      await pool.query("INSERT INTO meditations (title, category, duration_minutes) VALUES ('A', 'sitting', 10)");
      await pool.query("INSERT INTO meditations (title, category, duration_minutes) VALUES ('B', 'walking', 20)");

      const res = await request(app).get('/api/meditations?category=walking');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('B');
    });
  });

  describe('GET /api/meditations/:id', () => {
    it('returns 404 for a non-existent id', async () => {
      const res = await request(app).get('/api/meditations/999999');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/meditations/:id', () => {
    it('updates only the fields provided', async () => {
      const insert = await pool.query(
        "INSERT INTO meditations (title, category, duration_minutes) VALUES ('Original', 'sitting', 10) RETURNING id"
      );
      const id = insert.rows[0].id;

      const res = await request(app).put(`/api/meditations/${id}`).send({ duration_minutes: 25 });

      expect(res.status).toBe(200);
      expect(res.body.duration_minutes).toBe(25);
      expect(res.body.title).toBe('Original');
    });
  });

  describe('DELETE /api/meditations/:id', () => {
    it('deletes an existing meditation and returns 204', async () => {
      const insert = await pool.query(
        "INSERT INTO meditations (title, category, duration_minutes) VALUES ('Doomed', 'lying', 5) RETURNING id"
      );
      const id = insert.rows[0].id;

      const res = await request(app).delete(`/api/meditations/${id}`);
      expect(res.status).toBe(204);

      const dbRow = await pool.query('SELECT * FROM meditations WHERE id = $1', [id]);
      expect(dbRow.rows).toHaveLength(0);
    });
  });
});
