import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const res = await pool.query('SELECT user_id, data FROM app_workspaces');
console.log(JSON.stringify(res.rows, null, 2));
process.exit(0);
