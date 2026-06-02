import {
  getPlaneBridgeHealth,
  listPlaneTables
} from '../providers/plane-db.js';
import { fetchWithSafeRedirects } from '../infrastructure/plane-client.js';
import {
  toAbsolutePlaneUrl
} from '../core/plane-mapper.js';
import { clampLimit, isDbConnectivityError, isSafeIdentifier, isUuid, parseBooleanQuery } from '../services/request-utils.js';
import { createDataProvider } from '../features/data-provider.js';

export function registerPlaneRoutes(app, deps) {
  const { config } = deps;
  const dataProvider = createDataProvider(config);

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
    const schema = String(req.query?.schema || config.planeProjectSchema || 'public');
    if (!isSafeIdentifier(schema)) {
      res.status(400).json({ ok: false, error: 'Schema invalido.' });
      return;
    }

    try {
      const result = await dataProvider.listProjects({
        schema,
        limit: clampLimit(req.query?.limit, config.planeProjectsLimit),
        workspaceId: String(req.query?.workspaceId || '').trim(),
        includeDeleted: parseBooleanQuery(req.query?.includeDeleted),
        includeArchived: parseBooleanQuery(req.query?.includeArchived)
      });
      res.json(result);
    } catch (error) {
      console.error('plane_projects_error', error);
      if (error?.status && error?.body) {
        res.status(error.status).json(error.body);
        return;
      }
      if (isDbConnectivityError(error)) {
        res.status(503).json({
          ok: false,
          error: 'No se pudo conectar a la BD de Plane. Revisa DB_HOST/DB_PORT o el tunel SSH.'
        });
        return;
      }
      res.status(500).json({ ok: false, error: 'No se pudo leer proyectos de Plane.' });
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

    try {
      const result = await dataProvider.listProjectIssues({
        projectId,
        label,
        limit,
        includeDeleted,
        includeArchived
      });
      res.json(result);
    } catch (error) {
      console.error('plane_project_issues_error', error);
      if (error?.status && error?.body) {
        res.status(error.status).json(error.body);
        return;
      }
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
