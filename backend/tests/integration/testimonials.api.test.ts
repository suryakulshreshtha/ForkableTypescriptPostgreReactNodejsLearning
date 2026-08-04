import request from 'supertest';
import { Pool } from 'pg';
import { createApp } from '../../src/app';

describe('Testimonials API (integration, real PostgreSQL)', () => {
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
    await pool.query('TRUNCATE TABLE testimonials RESTART IDENTITY CASCADE');
  });

  describe('POST /api/testimonials', () => {
    it('submits a testimonial and persists it', async () => {
      const res = await request(app)
        .post('/api/testimonials')
        .send({ name: 'Morgan', story: 'This practice changed my mornings entirely.', category: 'consistency' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ name: 'Morgan', category: 'consistency' });

      const dbRow = await pool.query('SELECT * FROM testimonials WHERE id = $1', [res.body.id]);
      expect(dbRow.rows).toHaveLength(1);
    });

    it('returns 400 when story is missing', async () => {
      const res = await request(app).post('/api/testimonials').send({ name: 'Morgan' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(app).post('/api/testimonials').send({ story: 'A story with no author.' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/testimonials', () => {
    it('returns testimonials newest first', async () => {
      await pool.query("INSERT INTO testimonials (name, story) VALUES ('First', 'Older story')");
      await pool.query("INSERT INTO testimonials (name, story) VALUES ('Second', 'Newer story')");

      const res = await request(app).get('/api/testimonials');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('Second');
    });
  });
});
