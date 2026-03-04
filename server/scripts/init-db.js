import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { pool } from '../db.js';

async function run() {
  const schemaPath = path.join(process.cwd(), 'server', 'db', 'schema.sql');
  const schemaSql = await fs.readFile(schemaPath, 'utf8');

  await pool.query(schemaSql);
  console.log('Schema aplicado.');

  if (config.seedAdminEmail && config.seedAdminPassword) {
    const passwordHash = await bcrypt.hash(config.seedAdminPassword, 10);

    await pool.query(
      `INSERT INTO app_users (email, password_hash, name, role, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (email)
       DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         name = EXCLUDED.name,
         role = EXCLUDED.role,
         updated_at = NOW()`,
      [config.seedAdminEmail.toLowerCase(), passwordHash, config.seedAdminName, config.seedAdminRole]
    );

    console.log(`Usuario seed listo: ${config.seedAdminEmail}`);
  } else {
    console.log('Sin seed automatico: define SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD si lo necesitas.');
  }
}

run()
  .catch((error) => {
    console.error('db_init_error', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
