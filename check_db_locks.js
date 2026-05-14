import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

async function checkLocks() {
  const pool = new pg.Pool({
    host: process.env.APP_DB_HOST || '127.0.0.1',
    port: process.env.APP_DB_PORT || 5432,
    user: process.env.APP_DB_USER || 'postgres',
    password: process.env.APP_DB_PASSWORD || 'postgres',
    database: process.env.APP_DB_NAME || 'autotext',
  });

  try {
    const res = await pool.query(`
      SELECT pid, state, query, wait_event, wait_event_type, backend_start, xact_start 
      FROM pg_stat_activity 
      WHERE datname = current_database() AND state != 'idle';
    `);
    console.log('--- ACTIVE QUERIES ---');
    console.table(res.rows);
  } catch (err) {
    console.error('Audit failed:', err.message);
  } finally {
    await pool.end();
  }
}

checkLocks();
