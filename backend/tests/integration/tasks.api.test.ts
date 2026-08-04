import request from 'supertest';
import { Pool } from 'pg';
import { createApp } from '../../src/app';

/**
 * Integration tests: exercise the full HTTP stack (Express routing, JSON
 * parsing, controller, real SQL) against the dedicated test database defined
 * by TEST_PG* env vars. The tasks table is truncated between tests so each
 * test starts from a clean, deterministic state.
 */
describe('Tasks API (integration, real PostgreSQL)', () => {
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
    await pool.query('TRUNCATE TABLE tasks RESTART IDENTITY CASCADE');
  });

  describe('GET /health', () => {
    it('reports ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('POST /api/tasks', () => {
    it('creates a task and persists it to Postgres', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Buy milk', description: 'Whole milk, 1 gallon' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        title: 'Buy milk',
        description: 'Whole milk, 1 gallon',
        is_complete: false,
      });

      const dbRow = await pool.query('SELECT * FROM tasks WHERE id = $1', [res.body.id]);
      expect(dbRow.rows).toHaveLength(1);
    });

    it('rejects a task with no title with 400', async () => {
      const res = await request(app).post('/api/tasks').send({ description: 'orphan' });
      expect(res.status).toBe(400);

      const dbRows = await pool.query('SELECT * FROM tasks');
      expect(dbRows.rows).toHaveLength(0);
    });
  });

  describe('GET /api/tasks', () => {
    it('returns all tasks ordered newest first', async () => {
      await pool.query("INSERT INTO tasks (title) VALUES ('First')");
      await pool.query("INSERT INTO tasks (title) VALUES ('Second')");

      const res = await request(app).get('/api/tasks');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Second');
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('returns 404 for a non-existent id', async () => {
      const res = await request(app).get('/api/tasks/999999');
      expect(res.status).toBe(404);
    });

    it('returns the task when it exists', async () => {
      const insert = await pool.query("INSERT INTO tasks (title) VALUES ('Findable') RETURNING id");
      const id = insert.rows[0].id;

      const res = await request(app).get(`/api/tasks/${id}`);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Findable');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('updates only the fields provided', async () => {
      const insert = await pool.query(
        "INSERT INTO tasks (title, description) VALUES ('Original', 'desc') RETURNING id"
      );
      const id = insert.rows[0].id;

      const res = await request(app).put(`/api/tasks/${id}`).send({ is_complete: true });

      expect(res.status).toBe(200);
      expect(res.body.is_complete).toBe(true);
      expect(res.body.title).toBe('Original');
      expect(res.body.description).toBe('desc');
    });

    it('returns 404 when updating a task that does not exist', async () => {
      const res = await request(app).put('/api/tasks/999999').send({ title: 'x' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('deletes an existing task and returns 204', async () => {
      const insert = await pool.query("INSERT INTO tasks (title) VALUES ('Doomed') RETURNING id");
      const id = insert.rows[0].id;

      const res = await request(app).delete(`/api/tasks/${id}`);
      expect(res.status).toBe(204);

      const dbRow = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
      expect(dbRow.rows).toHaveLength(0);
    });

    it('returns 404 when deleting a task that does not exist', async () => {
      const res = await request(app).delete('/api/tasks/999999');
      expect(res.status).toBe(404);
    });
  });
});
