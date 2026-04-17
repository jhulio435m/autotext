import { appPool } from '../db.js';

async function run() {
  try {
    await appPool.query(`
      ALTER TABLE app_project_variables 
      ADD COLUMN IF NOT EXISTS variable_label TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS variable_type TEXT DEFAULT 'text';
    `);
    console.log('Migracion exitosa: columnas añadidas a app_project_variables');
  } catch (err) {
    console.error('Error en migracion:', err);
  } finally {
    await appPool.end();
  }
}

run();
