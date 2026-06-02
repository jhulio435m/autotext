import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { appPool } from '../db.js';
import { seedSystemTemplates } from '../templates.js';
import { hashPassword, normalizeEmail, validatePasswordPolicy } from '../services/auth-security.js';

async function run() {
  const schemaPath = path.join(process.cwd(), 'server', 'db', 'schema.sql');
  const schemaSql = await fs.readFile(schemaPath, 'utf8');

  await appPool.query(schemaSql);
  console.log('Schema aplicado.');

  await seedSystemTemplates(appPool);
  console.log('Plantillas del sistema listas.');

  if (config.seedAdminEmail && config.seedAdminPassword) {
    const email = normalizeEmail(config.seedAdminEmail);
    const validation = validatePasswordPolicy(config.seedAdminPassword, {
      email,
      minLength: config.authPasswordMinLength
    });

    if (!validation.ok) {
      throw new Error(`SEED_ADMIN_PASSWORD insegura: ${validation.errors.join(' ')}`);
    }

    const passwordHash = await hashPassword(config.seedAdminPassword, config.authBcryptCost);

    await appPool.query(
      `INSERT INTO app_users (email, password_hash, name, role, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (email)
       DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         name = EXCLUDED.name,
         role = EXCLUDED.role,
         updated_at = NOW()`,
      [email, passwordHash, config.seedAdminName, config.seedAdminRole]
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
    await appPool.end();
  });
