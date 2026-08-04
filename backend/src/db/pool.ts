import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const isTestEnv = process.env.NODE_ENV === 'test';

export const pool = new Pool({
  host: isTestEnv ? process.env.TEST_PGHOST : process.env.PGHOST,
  port: Number(isTestEnv ? process.env.TEST_PGPORT : process.env.PGPORT) || 5432,
  user: isTestEnv ? process.env.TEST_PGUSER : process.env.PGUSER,
  password: isTestEnv ? process.env.TEST_PGPASSWORD : process.env.PGPASSWORD,
  database: isTestEnv ? process.env.TEST_PGDATABASE : process.env.PGDATABASE,
});

export default pool;
