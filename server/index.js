import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { checkDbConnection, pool } from './db.js';

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin not allowed: ${origin}`));
    }
  })
);
app.use(express.json({ limit: '5mb' }));

function createToken(userId, email) {
  return jwt.sign({ sub: String(userId), email }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function normalizeUserRow(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role
  };
}

function parseBearerToken(headerValue) {
  if (!headerValue) return null;
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function authRequired(req, res, next) {
  const token = parseBearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ error: 'No autorizado. Falta token.' });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.auth = {
      userId: Number(payload.sub),
      email: payload.email
    };
    next();
  } catch {
    res.status(401).json({ error: 'Token invalido o expirado.' });
  }
}

function parseWorkspace(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw;
}

function isSafeIdentifier(value) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value || '');
}

function quoteIdentifier(value) {
  if (!isSafeIdentifier(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }
  return `"${value}"`;
}

function clampLimit(rawLimit, fallback) {
  const value = Number(rawLimit);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(1000, Math.trunc(value)));
}

function parseBooleanQuery(value) {
  if (value == null) return false;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function getPlaneProtocol() {
  try {
    if (!config.planeBaseUrl) return 'http:';
    const parsed = new URL(config.planeBaseUrl);
    return parsed.protocol || 'http:';
  } catch {
    return 'http:';
  }
}

function looksLikeHostPath(value) {
  return /^(?:\d{1,3}(?:\.\d{1,3}){3}|[A-Za-z0-9.-]+\.[A-Za-z]{2,})(?::\d+)?\//.test(value);
}

function toAbsolutePlaneUrl(rawPath) {
  const value = String(rawPath || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('//')) return `${getPlaneProtocol()}${value}`;
  if (looksLikeHostPath(value)) return `${getPlaneProtocol()}//${value}`;
  if (!config.planeBaseUrl) return value;
  if (value.startsWith('/')) return `${config.planeBaseUrl}${value}`;
  return `${config.planeBaseUrl}/${value}`;
}

function extractAssetIdFromStaticPath(rawPath) {
  const value = String(rawPath || '').trim();
  if (!value) return '';
  const match = value.match(/\/api\/assets\/v2\/static\/([0-9a-f-]{36})\/?/i);
  if (!match) return '';
  return isUuid(match[1]) ? match[1] : '';
}

function buildPlaneAssetProxyUrl(assetId) {
  const safeId = String(assetId || '').trim();
  if (!isUuid(safeId)) return '';
  return `/api/plane/assets/${safeId}`;
}

function applyPreferredProtocol(urlString) {
  const preferred = getPlaneProtocol();
  if (!preferred) return urlString;
  try {
    const parsed = new URL(urlString);
    parsed.protocol = preferred;
    return parsed.toString();
  } catch {
    return urlString;
  }
}

async function fetchWithSafeRedirects(initialUrl, maxRedirects = 5) {
  let currentUrl = initialUrl;

  for (let index = 0; index <= maxRedirects; index += 1) {
    const response = await fetch(currentUrl, { redirect: 'manual' });
    const status = response.status || 0;
    const isRedirect = status >= 300 && status < 400;

    if (!isRedirect) {
      return response;
    }

    const location = response.headers.get('location');
    if (!location) return response;

    const nextUrl = new URL(location, currentUrl).toString();
    currentUrl = applyPreferredProtocol(nextUrl);
  }

  throw new Error('Demasiadas redirecciones al resolver asset de Plane.');
}

function resolveProjectCoverUrl(projectRow) {
  const assetId = String(projectRow?.cover_image_asset_id || '').trim();
  if (isUuid(assetId)) return buildPlaneAssetProxyUrl(assetId);

  const staticAssetId = extractAssetIdFromStaticPath(projectRow?.cover_image);
  if (staticAssetId) return buildPlaneAssetProxyUrl(staticAssetId);

  const directCover = toAbsolutePlaneUrl(projectRow?.cover_image);
  if (directCover) return directCover;

  return '';
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

app.get('/api/plane/assets/:assetId', async (req, res) => {
  const assetId = String(req.params?.assetId || '').trim();
  if (!isUuid(assetId)) {
    res.status(400).json({ ok: false, error: 'assetId invalido.' });
    return;
  }

  const upstreamUrl = toAbsolutePlaneUrl(`/api/assets/v2/static/${assetId}/`);
  if (!upstreamUrl) {
    res.status(503).json({ ok: false, error: 'PLANE_BASE_URL no configurado.' });
    return;
  }

  try {
    const upstream = await fetchWithSafeRedirects(upstreamUrl, 6);

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

app.get('/api/health', async (_req, res) => {
  try {
    await checkDbConnection();
    res.json({
      ok: true,
      service: 'autotext-api',
      bridgeOnly: config.bridgeOnly,
      appEndpointsEnabled: config.enableAppEndpoints && !config.bridgeOnly
    });
  } catch (error) {
    console.error('health_error', error);
    res.status(500).json({ ok: false, error: 'DB no disponible' });
  }
});

app.get('/api/bridge/health', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT NOW() AS server_time, current_database() AS database_name, current_user AS db_user'
    );
    const row = result.rows[0];
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

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
    res.status(400).json({ ok: false, error: 'Schema invalido.' });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = $1
       ORDER BY table_name ASC
       LIMIT 300`,
      [schema]
    );

    res.json({
      ok: true,
      schema,
      count: result.rows.length,
      tables: result.rows.map((row) => row.table_name)
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

  const configuredCandidates = (config.planeProjectTables || []).filter(isSafeIdentifier);
  const candidateTables = configuredCandidates.length > 0 ? configuredCandidates : ['project_project', 'projects'];

  try {
    const tableMatch = await pool.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = $1
         AND table_name = ANY($2::text[])
       ORDER BY array_position($2::text[], table_name)
       LIMIT 1`,
      [schema, candidateTables]
    );

    if (!tableMatch.rows[0]) {
      res.status(404).json({
        ok: false,
        error: 'No se encontro tabla de proyectos de Plane con los candidatos configurados.',
        schema,
        candidates: candidateTables
      });
      return;
    }

    const table = tableMatch.rows[0].table_name;

    const columnsResult = await pool.query(
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
      res.status(422).json({
        ok: false,
        error: 'La tabla encontrada no tiene columnas esperadas de proyectos.',
        schema,
        table
      });
      return;
    }

    const limit = clampLimit(req.query?.limit, config.planeProjectsLimit);
    const workspaceId = String(req.query?.workspaceId || '').trim();
    const hasWorkspaceColumn = columnSet.has('workspace_id');
    const includeDeleted = parseBooleanQuery(req.query?.includeDeleted);
    const includeArchived = parseBooleanQuery(req.query?.includeArchived);

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

    if (workspaceId && hasWorkspaceColumn) {
      params.push(workspaceId);
      filters.push(`${quoteIdentifier('workspace_id')}::text = $${params.length}`);
    }

    if (filters.length > 0) {
      sql += ` WHERE ${filters.join(' AND ')}`;
    }

    params.push(limit);
    sql += ` ORDER BY ${quoteIdentifier(orderColumn)} DESC NULLS LAST LIMIT $${params.length}`;

    const projectsResult = await pool.query(sql, params);
    const projects = projectsResult.rows.map((row) => ({
      ...row,
      cover_image_url: resolveProjectCoverUrl(row)
    }));

    res.json({
      ok: true,
      schema,
      table,
      columns: selectedColumns,
      includeDeleted,
      includeArchived,
      count: projects.length,
      projects
    });
  } catch (error) {
    console.error('plane_projects_error', error);
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

  try {
    const params = [projectId, label];
    const filters = ['i.project_id = $1'];

    if (!includeDeleted) {
      filters.push('i.deleted_at IS NULL');
    }
    if (!includeArchived) {
      filters.push('i.archived_at IS NULL');
    }

    params.push(limit);

    const result = await pool.query(
      `WITH filtered_issues AS (
         SELECT
           i.id,
           i.name,
           COALESCE(i.description_stripped, '') AS description,
           i.updated_at,
           i.created_at,
           i.project_id,
           i.workspace_id,
           i.automatable,
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
         fi.automatable,
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
         fi.project_id, fi.workspace_id, fi.automatable, fi.archived_at, fi.deleted_at
       ORDER BY fi.updated_at DESC NULLS LAST
       LIMIT $3`,
      params
    );

    res.json({
      ok: true,
      projectId,
      label,
      includeDeleted,
      includeArchived,
      count: result.rows.length,
      issues: result.rows
    });
  } catch (error) {
    console.error('plane_project_issues_error', error);
    res.status(500).json({ ok: false, error: 'No se pudo leer issues filtrados por label.' });
  }
});

if (config.enableAppEndpoints && !config.bridgeOnly) {
  app.post('/api/auth/login', async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      res.status(400).json({ error: 'Email y contrasena son obligatorios.' });
      return;
    }

    try {
      const result = await pool.query(
        'SELECT id, email, password_hash, name, role FROM app_users WHERE LOWER(email) = $1 LIMIT 1',
        [email]
      );

      const row = result.rows[0];
      if (!row) {
        res.status(401).json({ error: 'Credenciales invalidas.' });
        return;
      }

      const validPassword = row.password_hash.startsWith('$2')
        ? await bcrypt.compare(password, row.password_hash)
        : password === row.password_hash;

      if (!validPassword) {
        res.status(401).json({ error: 'Credenciales invalidas.' });
        return;
      }

      const workspaceResult = await pool.query(
        'SELECT data, updated_at FROM app_workspaces WHERE user_id = $1 LIMIT 1',
        [row.id]
      );

      const workspaceRow = workspaceResult.rows[0];

      res.json({
        token: createToken(row.id, row.email),
        user: normalizeUserRow(row),
        workspace: workspaceRow?.data || null,
        workspaceUpdatedAt: workspaceRow?.updated_at || null
      });
    } catch (error) {
      console.error('login_error', error);
      res.status(500).json({ error: 'No se pudo procesar el login.' });
    }
  });

  app.get('/api/workspace', authRequired, async (req, res) => {
    try {
      const result = await pool.query('SELECT data, updated_at FROM app_workspaces WHERE user_id = $1 LIMIT 1', [req.auth.userId]);
      const row = result.rows[0];

      res.json({
        workspace: row?.data || null,
        updatedAt: row?.updated_at || null
      });
    } catch (error) {
      console.error('workspace_get_error', error);
      res.status(500).json({ error: 'No se pudo leer el workspace.' });
    }
  });

  app.put('/api/workspace', authRequired, async (req, res) => {
    const workspace = parseWorkspace(req.body?.workspace);
    if (!workspace) {
      res.status(400).json({ error: 'workspace invalido.' });
      return;
    }

    try {
      const upsert = await pool.query(
        `INSERT INTO app_workspaces (user_id, data, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
         RETURNING updated_at`,
        [req.auth.userId, JSON.stringify(workspace)]
      );

      res.json({ ok: true, updatedAt: upsert.rows[0]?.updated_at || null });
    } catch (error) {
      console.error('workspace_put_error', error);
      res.status(500).json({ error: 'No se pudo guardar el workspace.' });
    }
  });
}

app.use((err, _req, res, _next) => {
  if (err?.message?.startsWith('Origin not allowed:')) {
    res.status(403).json({ error: err.message });
    return;
  }
  console.error('unhandled_error', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

async function start() {
  try {
    await checkDbConnection();
    app.listen(config.apiPort, config.apiHost, () => {
      console.log(`API running on http://${config.apiHost}:${config.apiPort}`);
    });
  } catch (error) {
    console.error('startup_error', error);
    process.exit(1);
  }
}

start();
