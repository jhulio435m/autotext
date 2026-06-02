import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

export async function runMigrations(pool) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS app_schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows: applied } = await client.query(
      'SELECT version FROM app_schema_migrations ORDER BY version'
    );
    const appliedSet = new Set(applied.map((r) => r.version));

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const match = file.match(/^(\d+)-(.+)\.sql$/);
      if (!match) {
        console.warn(`[MIGRATE] skipping unrecognized file: ${file}`);
        continue;
      }

      const version = Number(match[1]);
      const name = match[2];

      if (appliedSet.has(version)) continue;

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
      console.log(`[MIGRATE] applying ${file}...`);
      await client.query(sql);
      await client.query(
        'INSERT INTO app_schema_migrations (version, name) VALUES ($1, $2)',
        [version, name]
      );
      console.log(`[MIGRATE] applied ${file}`);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
