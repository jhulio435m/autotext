import {
  getPlaneBridgeHealth,
  getPlaneProjectIssuesFromDb,
  getPlaneProjectsFromDb,
  listPlaneTables
} from '../providers/plane-db.js';
import {
  fetchPlaneApiJson,
  fetchWithSafeRedirects,
  canUsePlaneApi
} from '../infrastructure/plane-client.js';
import {
  normalizeIssueFromPlaneApi,
  normalizePlaneApiListResponse,
  normalizeProjectFromPlaneApi,
  resolveProjectCoverUrl,
  toAbsolutePlaneUrl
} from '../core/plane-mapper.js';
import { clampLimit, isDbConnectivityError, isSafeIdentifier, isUuid, parseBooleanQuery } from '../services/request-utils.js';

export function registerPlaneRoutes(app, deps) {
  const { config } = deps;

  app.get('/api/plane/assets/:assetId', async (req, res) => {
    const assetId = String(req.params?.assetId || '').trim();
    if (!isUuid(assetId)) {
      res.status(400).json({ ok: false, error: 'assetId invalido.' });
      return;
    }

    const upstreamUrl = toAbsolutePlaneUrl(config, `/api/assets/v2/static/${assetId}/`);
    if (!upstreamUrl) {
      res.status(503).json({ ok: false, error: 'PLANE_BASE_URL no configurado.' });
      return;
    }

    try {
      const upstream = await fetchWithSafeRedirects(config, upstreamUrl, 6);

      if (!upstream.ok) {
        res.status(upstream.status || 502).json({ ok: false, error: 'No se pudo obtener asset de Plane.' });
        return;
      }

      const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
      const cacheControl = upstream.headers.get('cache-control') || 'public, max-age=300';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', cacheControl);

      const bytes = await upstream.arrayBuffer();
      res.status(200).send(Buffer.from(bytes));
    } catch (error) {
      console.error('plane_asset_proxy_error', error);
      res.status(502).json({ ok: false, error: 'Fallo el proxy de assets de Plane.' });
    }
  });

  app.get('/api/bridge/health', async (_req, res) => {
    try {
      const row = await getPlaneBridgeHealth();
      res.json({
        ok: true,
        bridge: {
          mode: config.bridgeOnly ? 'bridge_only' : 'full',
          serverTime: row?.server_time || null,
          database: row?.database_name || null,
          dbUser: row?.db_user || null
        }
      });
    } catch (error) {
      console.error('bridge_health_error', error);
      res.status(500).json({ ok: false, error: 'No se pudo validar conexion con la BD.' });
    }
  });

  app.get('/api/bridge/tables', async (req, res) => {
    const schema = String(req.query?.schema || 'public');

    if (!isSafeIdentifier(schema)) {
      res.status(400).json({ ok: false, error: 'Schema invalido.' });
      return;
    }

    try {
      const tables = await listPlaneTables(schema);
      res.json({
        ok: true,
        schema,
        count: tables.length,
        tables
      });
    } catch (error) {
      console.error('bridge_tables_error', error);
      res.status(500).json({ ok: false, error: 'No se pudo listar tablas.' });
    }
  });

  app.get('/api/plane/projects', async (req, res) => {
    if (canUsePlaneApi(config)) {
      try {
        const limit = clampLimit(req.query?.limit, config.planeProjectsLimit);
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

        res.json({
          ok: true,
          source: 'plane_api',
          workspaceSlug: config.planeWorkspaceSlug,
          count: projects.length,
          projects
        });
        return;
      } catch (error) {
        console.error('plane_projects_api_error', error);
        res.status(502).json({ ok: false, error: 'No se pudo leer proyectos desde Plane API.' });
        return;
      }
    }

    const schema = String(req.query?.schema || config.planeProjectSchema || 'public');
    if (!isSafeIdentifier(schema)) {
      res.status(400).json({ ok: false, error: 'Schema invalido.' });
      return;
    }

    const configuredCandidates = (config.planeProjectTables || []).filter(isSafeIdentifier);
    const candidateTables = configuredCandidates.length > 0 ? configuredCandidates : ['project_project', 'projects'];

    try {
      const result = await getPlaneProjectsFromDb({
        schema,
        candidateTables,
        limit: clampLimit(req.query?.limit, config.planeProjectsLimit),
        workspaceId: String(req.query?.workspaceId || '').trim(),
        includeDeleted: parseBooleanQuery(req.query?.includeDeleted),
        includeArchived: parseBooleanQuery(req.query?.includeArchived)
      });

      if (!result.found) {
        res.status(404).json({
          ok: false,
          error: 'No se encontro tabla de proyectos de Plane con los candidatos configurados.',
          schema,
          candidates: candidateTables
        });
        return;
      }

      if (result.selectedColumns.length === 0) {
        res.status(422).json({
          ok: false,
          error: 'La tabla encontrada no tiene columnas esperadas de proyectos.',
          schema,
          table: result.table
        });
        return;
      }

      const includeDeleted = parseBooleanQuery(req.query?.includeDeleted);
      const includeArchived = parseBooleanQuery(req.query?.includeArchived);
      const projects = (result.rows || []).map((row) => ({
        ...row,
        cover_image_url: resolveProjectCoverUrl(config, row)
      }));

      res.json({
        ok: true,
        schema: result.schema,
        table: result.table,
        columns: result.selectedColumns,
        includeDeleted,
        includeArchived,
        count: projects.length,
        projects
      });
    } catch (error) {
      console.error('plane_projects_error', error);
      if (isDbConnectivityError(error)) {
        res.status(503).json({
          ok: false,
          error: 'No se pudo conectar a la BD de Plane. Revisa DB_HOST/DB_PORT o el tunel SSH.'
        });
        return;
      }
      res.status(500).json({ ok: false, error: 'No se pudo leer proyectos de Plane desde la BD.' });
    }
  });

  app.get('/api/plane/projects/:projectId/issues', async (req, res) => {
    const projectId = String(req.params?.projectId || '').trim();
    if (!isUuid(projectId)) {
      res.status(400).json({ ok: false, error: 'projectId invalido.' });
      return;
    }

    const label = String(req.query?.label || 'Automatizable').trim();
    if (!label) {
      res.status(400).json({ ok: false, error: 'label es obligatorio.' });
      return;
    }

    const limit = clampLimit(req.query?.limit, 200);
    const includeDeleted = parseBooleanQuery(req.query?.includeDeleted);
    const includeArchived = parseBooleanQuery(req.query?.includeArchived);

    if (canUsePlaneApi(config)) {
      try {
        const labelLower = label.toLowerCase();
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

        res.json({
          ok: true,
          source: 'plane_api',
          workspaceSlug: config.planeWorkspaceSlug,
          projectId,
          label,
          includeDeleted,
          includeArchived,
          count: issues.length,
          issues
        });
        return;
      } catch (error) {
        console.error('plane_project_issues_api_error', error);
        res.status(502).json({ ok: false, error: 'No se pudo leer issues desde Plane API.' });
        return;
      }
    }

    try {
      const issues = await getPlaneProjectIssuesFromDb({
        projectId,
        label,
        limit,
        includeDeleted,
        includeArchived
      });

      res.json({
        ok: true,
        projectId,
        label,
        includeDeleted,
        includeArchived,
        count: issues.length,
        issues
      });
    } catch (error) {
      console.error('plane_project_issues_error', error);
      if (isDbConnectivityError(error)) {
        res.status(503).json({
          ok: false,
          error: 'No se pudo conectar a la BD de Plane. Revisa DB_HOST/DB_PORT o el tunel SSH.'
        });
        return;
      }
      res.status(500).json({ ok: false, error: 'No se pudo leer issues filtrados por label.' });
    }
  });
}
