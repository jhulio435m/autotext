import { appPool, queryPlaneDb } from '../db.js';

export async function getProjectsFromPlaneDb(schema, limit = 500) {
  const safeSchema = String(schema || 'public');
  const result = await queryPlaneDb(`
    SELECT id, name, description, identifier, 
           cover_image, cover_image_asset_id,
           updated_at
    FROM ${safeSchema}.projects
    LIMIT $1
  `, [limit]);
  return result.rows || [];
}

export async function getLocalProjectById(id) {
  const result = await appPool.query(
    'SELECT updated_at, logo, cover_photo FROM app_projects WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function upsertLocalProject(projectData) {
  const {
    id,
    userId = 1,
    name,
    description = '',
    code = '',
    accentColor = '#006399',
    coverPhoto = '',
    updatedAt
  } = projectData;

  await appPool.query(
    `INSERT INTO app_projects (id, user_id, name, description, code, accent_color, cover_photo, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       code = EXCLUDED.code,
       cover_photo = COALESCE(NULLIF(EXCLUDED.cover_photo, ''), app_projects.cover_photo),
       updated_at = EXCLUDED.updated_at`,
    [id, userId, name, description, code, accentColor, coverPhoto, updatedAt]
  );
}
