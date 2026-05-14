import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

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
    const vars = await pool.query('SELECT * FROM app_project_variables');
    console.log('--- VARS ---');
    console.table(vars.rows);

    const projects = await pool.query('SELECT id, name FROM app_projects');
    console.log('--- PROJECTS ---');
    console.table(projects.rows);
  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    await pool.end();
  }
}

check();
