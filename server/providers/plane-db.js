import { queryPlaneDb } from '../db.js';

export async function getPlaneBridgeHealth() {
  const result = await queryPlaneDb(
    'SELECT NOW() AS server_time, current_database() AS database_name, current_user AS db_user'
  );

  return result.rows[0] || null;
}

export async function listPlaneTables(schema) {
  const result = await queryPlaneDb(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = $1
     ORDER BY table_name ASC
     LIMIT 300`,
    [schema]
  );

  return result.rows.map((row) => row.table_name);
}
