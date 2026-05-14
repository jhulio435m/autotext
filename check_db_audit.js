import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: './server/.env' });

async function check() {
  const pool = new pg.Pool({
    host: process.env.APP_DB_HOST || '127.0.0.1',
    port: process.env.APP_DB_PORT || 5432,
    user: process.env.APP_DB_USER || 'postgres',
    password: process.env.APP_DB_PASSWORD || 'postgres',
    database: process.env.APP_DB_NAME || 'autotext',
  });

  try {
    const constraints = await pool.query(`
      SELECT conname, contype, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND conrelid = 'app_document_locks'::regclass;
    `);
    console.log('--- CONSTRAINTS ---');
    console.table(constraints.rows);

    const indexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'app_document_locks';
    `);
    console.log('--- INDEXES ---');
    console.table(indexes.rows);
  } catch (err) {
    console.error('Audit failed:', err.message);
  } finally {
    await pool.end();
  }
}

check();
