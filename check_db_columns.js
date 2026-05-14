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
    const tables = ['app_users', 'app_projects', 'app_project_variables', 'app_documents'];
    for (const table of tables) {
      const res = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);
      console.log(`--- Table: ${table} ---`);
      console.table(res.rows);
    }
  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    await pool.end();
  }
}

check();
