import { appPool, queryPlaneDb } from '../db.js';
import { quoteIdentifier } from '../services/request-utils.js';

export async function getProjectsFromPlaneDb(schema, limit = 500, workspaceSlug = '') {
  const safeSchema = quoteIdentifier(String(schema || 'public'));
  const params = [];
  const filters = [];
  let query = `
    SELECT p.id, p.name, p.description, p.identifier, 
           p.cover_image, p.cover_image_asset_id,
           p.updated_at
    FROM ${safeSchema}.projects p
  `;
  if (workspaceSlug) {
    query += ` JOIN ${safeSchema}.workspaces w ON w.id = p.workspace_id`;
    params.push(workspaceSlug);
    filters.push(`w.slug = $${params.length}`);
  }
  filters.push(`p.deleted_at IS NULL`);
  if (filters.length > 0) {
    query += ` WHERE ${filters.join(' AND ')}`;
  }
  params.push(limit);
  query += ` LIMIT $${params.length}`;
  const result = await queryPlaneDb(query, params);
  return result.rows || [];
}

export async function getLocalProjectById(id) {
  const result = await appPool.query(
    'SELECT updated_at, logo, cover_photo FROM app_projects WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function deleteLocalProjectsNotIn(ids) {
  if (!ids || ids.length === 0) return;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
  await appPool.query(
    `DELETE FROM app_projects WHERE id NOT IN (${placeholders})`,
    ids
  );
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
