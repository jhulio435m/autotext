import { queryPlaneDb } from '../db.js';
import { normalizeIssueFromPlaneDb, normalizeProjectFromPlaneDb, resolveProjectCoverUrl } from '../core/plane-mapper.js';
import { isSafeIdentifier, quoteIdentifier } from '../services/request-utils.js';

function createProviderError(status, body) {
  const error = new Error(body?.error || 'provider_error');
  error.status = status;
  error.body = body;
  return error;
}

export async function listPlaneProjectsFromDb(config, options = {}) {
  const {
    schema,
    candidateTables,
    limit,
    workspaceId,
    workspaceSlug,
    includeDeleted = false,
    includeArchived = false
  } = options;
  const tableMatch = await queryPlaneDb(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = $1
       AND table_name = ANY($2::text[])
     ORDER BY array_position($2::text[], table_name)
     LIMIT 1`,
    [schema, candidateTables]
  );

  if (!tableMatch.rows[0]) {
    throw createProviderError(404, {
      ok: false,
      error: 'No se encontro tabla de proyectos de Plane con los candidatos configurados.',
      schema,
      candidates: candidateTables
    });
  }

  const table = tableMatch.rows[0].table_name;
  const columnsResult = await queryPlaneDb(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = $1
       AND table_name = $2`,
    [schema, table]
  );

  const columnSet = new Set(columnsResult.rows.map((row) => row.column_name));
  const preferredColumns = [
    'id',
    'name',
    'identifier',
    'description',
    'workspace_id',
    'created_at',
    'updated_at',
    'cover_image',
    'cover_image_asset_id',
    'deleted_at',
    'archived_at'
  ];
  const selectedColumns = preferredColumns.filter((column) => columnSet.has(column));

  if (selectedColumns.length === 0) {
    throw createProviderError(422, {
      ok: false,
      error: 'La tabla encontrada no tiene columnas esperadas de proyectos.',
      schema,
      table
    });
  }

  const hasWorkspaceColumn = columnSet.has('workspace_id');
  let resolvedWorkspaceId = workspaceId;
  if (workspaceSlug && !resolvedWorkspaceId) {
    const wsResult = await queryPlaneDb(
      `SELECT id FROM ${quoteIdentifier(schema)}.workspaces WHERE slug = $1 LIMIT 1`,
      [workspaceSlug]
    );
    if (wsResult.rows[0]) {
      resolvedWorkspaceId = wsResult.rows[0].id;
    }
  }
  const selectSql = selectedColumns.map((column) => quoteIdentifier(column)).join(', ');
  const fromSql = `${quoteIdentifier(schema)}.${quoteIdentifier(table)}`;
  const orderColumn = columnSet.has('updated_at')
    ? 'updated_at'
    : columnSet.has('created_at')
      ? 'created_at'
      : selectedColumns[0];

  let sql = `SELECT ${selectSql} FROM ${fromSql}`;
  const params = [];
  const filters = [];

  if (columnSet.has('deleted_at') && !includeDeleted) {
    filters.push(`${quoteIdentifier('deleted_at')} IS NULL`);
  }

  if (columnSet.has('archived_at') && !includeArchived) {
    filters.push(`${quoteIdentifier('archived_at')} IS NULL`);
  }

  if (resolvedWorkspaceId && hasWorkspaceColumn) {
    params.push(resolvedWorkspaceId);
    filters.push(`${quoteIdentifier('workspace_id')}::text = $${params.length}`);
  }

  if (filters.length > 0) {
    sql += ` WHERE ${filters.join(' AND ')}`;
  }

  params.push(limit);
  sql += ` ORDER BY ${quoteIdentifier(orderColumn)} DESC NULLS LAST LIMIT $${params.length}`;

  const projectsResult = await queryPlaneDb(sql, params);
  const projects = projectsResult.rows.map((row) => {
    const normalized = normalizeProjectFromPlaneDb(row);
    return {
      ...normalized,
      cover_image_url: resolveProjectCoverUrl(config, normalized)
    };
  });

  return {
    ok: true,
    source: 'plane_db',
    schema,
    table,
    columns: selectedColumns,
    includeDeleted,
    includeArchived,
    count: projects.length,
    projects
  };
}

export async function listPlaneProjectIssuesFromDb(_config, options = {}) {
  const { projectId, label, limit, includeDeleted = false, includeArchived = false } = options;
  const params = [projectId, label];
  const filters = ['i.project_id = $1'];

  if (!includeDeleted) {
    filters.push('i.deleted_at IS NULL');
  }
  if (!includeArchived) {
    filters.push('i.archived_at IS NULL');
  }

  params.push(limit);

  const result = await queryPlaneDb(
    `WITH filtered_issues AS (
       SELECT
         i.id,
         i.name,
         COALESCE(i.description_stripped, '') AS description,
         i.updated_at,
         i.created_at,
         i.project_id,
         i.workspace_id,
         i.archived_at,
         i.deleted_at
       FROM public.issues i
       WHERE ${filters.join(' AND ')}
         AND EXISTS (
           SELECT 1
           FROM public.issue_labels il_filter
           JOIN public.labels l_filter ON l_filter.id = il_filter.label_id
           WHERE il_filter.issue_id = i.id
             AND il_filter.deleted_at IS NULL
             AND l_filter.deleted_at IS NULL
             AND LOWER(l_filter.name) = LOWER($2)
         )
     )
     SELECT
       fi.id,
       fi.name,
       fi.description,
       fi.updated_at,
       fi.created_at,
       fi.project_id,
       fi.workspace_id,
       fi.archived_at,
       fi.deleted_at,
       COALESCE(ARRAY_REMOVE(ARRAY_AGG(DISTINCT l_all.name), NULL), ARRAY[]::text[]) AS labels
     FROM filtered_issues fi
     LEFT JOIN public.issue_labels il_all
       ON il_all.issue_id = fi.id
      AND il_all.deleted_at IS NULL
     LEFT JOIN public.labels l_all
       ON l_all.id = il_all.label_id
      AND l_all.deleted_at IS NULL
     GROUP BY
       fi.id, fi.name, fi.description, fi.updated_at, fi.created_at,
       fi.project_id, fi.workspace_id, fi.archived_at, fi.deleted_at
     ORDER BY fi.updated_at DESC NULLS LAST
     LIMIT $3`,
    params
  );

  const issues = result.rows.map((row) => normalizeIssueFromPlaneDb(row, projectId));
  return {
    ok: true,
    source: 'plane_db',
    projectId,
    label,
    includeDeleted,
    includeArchived,
    count: issues.length,
    issues
  };
}

export function getPlaneProjectTableCandidates(config) {
  const configuredCandidates = Array.isArray(config?.planeProjectTables) ? config.planeProjectTables : [];
  const safeCandidates = configuredCandidates.filter(isSafeIdentifier);
  return safeCandidates.length > 0 ? safeCandidates : ['project_project', 'projects'];
}
