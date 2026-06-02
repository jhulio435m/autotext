import { fetchPlaneApiJson } from './plane-client.js';
import {
  normalizeIssueFromPlaneApi,
  normalizePlaneApiListResponse,
  normalizeProjectFromPlaneApi,
  resolveProjectCoverUrl
} from '../core/plane-mapper.js';

function createProviderError(status, body) {
  const error = new Error(body?.error || 'provider_error');
  error.status = status;
  error.body = body;
  return error;
}

export async function listPlaneProjectsFromApi(config, options = {}) {
  try {
    const limit = options.limit;
    const payload = await fetchPlaneApiJson(config, `/api/v1/workspaces/${config.planeWorkspaceSlug}/projects/`, {
      per_page: limit
    });

    const projects = normalizePlaneApiListResponse(payload)
      .map(normalizeProjectFromPlaneApi)
      .filter((row) => row.id && row.name)
      .slice(0, limit)
      .map((row) => ({
        ...row,
        cover_image_url: resolveProjectCoverUrl(config, row)
      }));

    return {
      ok: true,
      source: 'plane_api',
      workspaceSlug: config.planeWorkspaceSlug,
      count: projects.length,
      projects
    };
  } catch (error) {
    throw createProviderError(502, { ok: false, error: 'No se pudo leer proyectos desde Plane API.' });
  }
}

export async function listPlaneProjectsFlatFromApi(config) {
  const result = await listPlaneProjectsFromApi(config, { limit: 500 });
  return result.projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    identifier: p.identifier || '',
    cover_image: p.cover_image || '',
    cover_image_asset_id: p.cover_image_asset_id || '',
    updated_at: p.updated_at || p.created_at || null
  }));
}

export async function listPlaneProjectIssuesFromApi(config, options = {}) {
  try {
    const { projectId, label, limit, includeDeleted = false, includeArchived = false } = options;
    const labelLower = String(label || '').toLowerCase();
    const query = { per_page: limit };
    let payload = null;

    try {
      payload = await fetchPlaneApiJson(
        config,
        `/api/v1/workspaces/${config.planeWorkspaceSlug}/projects/${projectId}/work-items/`,
        query
      );
    } catch {
      payload = await fetchPlaneApiJson(
        config,
        `/api/v1/workspaces/${config.planeWorkspaceSlug}/projects/${projectId}/issues/`,
        query
      );
    }

    const issues = normalizePlaneApiListResponse(payload)
      .map((item) => normalizeIssueFromPlaneApi(item, projectId))
      .filter((item) => item.id && item.name)
      .filter((item) => item.labels.some((entry) => String(entry).toLowerCase() === labelLower))
      .slice(0, limit);

    return {
      ok: true,
      source: 'plane_api',
      workspaceSlug: config.planeWorkspaceSlug,
      projectId,
      label,
      includeDeleted,
      includeArchived,
      count: issues.length,
      issues
    };
  } catch (error) {
    throw createProviderError(502, { ok: false, error: 'No se pudo leer issues desde Plane API.' });
  }
}
