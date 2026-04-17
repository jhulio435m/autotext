import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: './server/.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const res = await pool.query('SELECT user_id, data FROM app_workspaces');
  console.log(JSON.stringify(res.rows, null, 2));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
