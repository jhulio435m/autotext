import { isUuid } from '../services/request-utils.js';

export function normalizePlaneApiListResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export function toAbsolutePlaneUrl(config, rawPath) {
  const value = String(rawPath || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;

  const getPlaneProtocol = (cfg) => {
    try {
      if (!cfg.planeBaseUrl) return 'http:';
      const parsed = new URL(cfg.planeBaseUrl);
      return parsed.protocol || 'http:';
    } catch {
      return 'http:';
    }
  };

  const looksLikeHostPath = (val) => /^(?:\d{1,3}(?:\.\d{1,3}){3}|[A-Za-z0-9.-]+\.[A-Za-z]{2,})(?::\d+)?\//.test(val);

  if (value.startsWith('//')) return `${getPlaneProtocol(config)}${value}`;
  if (looksLikeHostPath(value)) return `${getPlaneProtocol(config)}//${value}`;
  if (!config.planeBaseUrl) return value;
  if (value.startsWith('/')) return `${config.planeBaseUrl}${value}`;
  return `${config.planeBaseUrl}/${value}`;
}

export function extractAssetIdFromStaticPath(rawPath) {
  const value = String(rawPath || '').trim();
  if (!value) return '';
  const match = value.match(/\/api\/assets\/v2\/static\/([0-9a-f-]{36})\/?/i);
  if (!match) return '';
  return isUuid(match[1]) ? match[1] : '';
}

export function buildPlaneAssetProxyUrl(assetId) {
  const safeId = String(assetId || '').trim();
  if (!isUuid(safeId)) return '';
  return `/api/plane/assets/${safeId}`;
}

export function resolveProjectCoverUrl(config, projectRow) {
  const assetId = String(projectRow?.cover_image_asset_id || '').trim();
  if (isUuid(assetId)) return buildPlaneAssetProxyUrl(assetId);

  const staticAssetId = extractAssetIdFromStaticPath(projectRow?.cover_image);
  if (staticAssetId) return buildPlaneAssetProxyUrl(staticAssetId);

  const directCover = toAbsolutePlaneUrl(config, projectRow?.cover_image);
  if (directCover) return directCover;

  return '';
}

export function normalizeProjectFromPlaneApi(raw) {
  return {
    id: raw?.id || raw?.project_id || null,
    name: raw?.name || '',
    identifier: raw?.identifier || raw?.project_identifier || '',
    description: raw?.description_stripped || raw?.description || '',
    workspace_id: raw?.workspace || raw?.workspace_id || null,
    created_at: raw?.created_at || null,
    updated_at: raw?.updated_at || null,
    cover_image: raw?.cover_image || '',
    cover_image_asset_id: raw?.cover_image_asset_id || ''
  };
}

export function normalizeIssueFromPlaneApi(raw, projectId) {
  const labels = Array.isArray(raw?.labels)
    ? raw.labels
        .map((item) => (typeof item === 'string' ? item : item?.name || item?.label || ''))
        .filter(Boolean)
    : [];

  return {
    id: raw?.id || null,
    name: raw?.name || raw?.title || '',
    description: raw?.description_stripped || raw?.description || '',
    updated_at: raw?.updated_at || null,
    created_at: raw?.created_at || null,
    project_id: raw?.project || raw?.project_id || projectId,
    workspace_id: raw?.workspace || raw?.workspace_id || null,
    automatable: labels.some((label) => String(label).toLowerCase() === 'automatizable'),
    archived_at: raw?.archived_at || null,
    deleted_at: raw?.deleted_at || null,
    labels
  };
}
