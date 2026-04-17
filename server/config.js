import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const projectRoot = process.cwd();
const serverEnv = path.join(projectRoot, 'server', '.env');
const rootEnv = path.join(projectRoot, '.env');

if (fs.existsSync(serverEnv)) {
  dotenv.config({ path: serverEnv });
}
if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv, override: false });
}

function parseBoolean(value, fallback = false) {
  if (value == null) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseOrigins(raw) {
  if (!raw) return ['http://127.0.0.1:5173', 'http://localhost:5173'];
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseList(raw, fallback = []) {
  if (!raw) return fallback;
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBaseUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  return value.replace(/\/+$/, '');
}

function buildDbConfig(prefix, fallback = {}) {
  return {
    host: process.env[`${prefix}_HOST`] || fallback.host || '127.0.0.1',
    port: Number(process.env[`${prefix}_PORT`] || fallback.port || 5432),
    user: process.env[`${prefix}_USER`] || fallback.user || 'postgres',
    password: process.env[`${prefix}_PASSWORD`] || fallback.password || 'postgres',
    database: process.env[`${prefix}_NAME`] || fallback.database || 'autotext',
    ssl: parseBoolean(process.env[`${prefix}_SSL`], fallback.ssl || false)
  };
}

const legacyDb = buildDbConfig('DB');

export const config = {
  apiHost: process.env.API_HOST || '127.0.0.1',
  apiPort: Number(process.env.API_PORT || 4000),
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
  bridgeOnly: parseBoolean(process.env.BRIDGE_ONLY, true),
  enableAppEndpoints: parseBoolean(process.env.ENABLE_APP_ENDPOINTS, false),
  planeProjectSchema: process.env.PLANE_PROJECT_SCHEMA || 'public',
  planeProjectTables: parseList(process.env.PLANE_PROJECT_TABLES, ['project_project', 'projects']),
  planeProjectsLimit: Number(process.env.PLANE_PROJECTS_LIMIT || 200),
  planeBaseUrl: normalizeBaseUrl(process.env.PLANE_BASE_URL || ''),
  planeWorkspaceSlug: String(process.env.PLANE_WORKSPACE_SLUG || '').trim(),
  planeApiKey: String(process.env.PLANE_API_KEY || '').trim(),
  planeApiTimeoutMs: Number(process.env.PLANE_API_TIMEOUT_MS || 10000),
  frappeBaseUrl: normalizeBaseUrl(process.env.FRAPPE_BASE_URL || ''),
  frappeApiKey: String(process.env.FRAPPE_API_KEY || '').trim(),
  frappeApiSecret: String(process.env.FRAPPE_API_SECRET || '').trim(),
  jwtSecret: process.env.JWT_SECRET || 'change-me-before-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  apiAuthEnabled: parseBoolean(process.env.VITE_USE_API_AUTH, true),
  planeDb: buildDbConfig('PLANE_DB', legacyDb),
  appDb: buildDbConfig('APP_DB', legacyDb),
  appDbDockerContainer: String(process.env.APP_DB_DOCKER_CONTAINER || 'expedientes-db').trim(),
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || '',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || '',
  seedAdminName: process.env.SEED_ADMIN_NAME || 'Ing. Carlos Rivera',
  seedAdminRole: process.env.SEED_ADMIN_ROLE || 'Senior',
  // ── IA / OpenAI ──────────────────────────────────────────────────
  openaiApiKey: String(process.env.OPENAI_API_KEY || '').trim(),
  openaiModel:  String(process.env.OPENAI_MODEL  || 'gpt-4o-mini').trim()
};
