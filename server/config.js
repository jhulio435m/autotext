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

function parseInteger(value, fallback, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function parseOrigins(raw) {
  if (!raw) return ['http://127.0.0.1:5173', 'http://localhost:5173', 'https://autotext.urriburuleon.com'];
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
  allowAllCors: parseBoolean(process.env.ALLOW_ALL_CORS, false),
  requestBodyLimitMb: parseInteger(process.env.REQUEST_BODY_LIMIT_MB, 25, { min: 1, max: 200 }),
  integrationProfileWriteEnabled: parseBoolean(process.env.INTEGRATION_PROFILE_WRITE_ENABLED, false),
  bridgeOnly: parseBoolean(process.env.BRIDGE_ONLY, true),
  enableAppEndpoints: parseBoolean(process.env.ENABLE_APP_ENDPOINTS, false),
  planeProjectSchema: process.env.PLANE_PROJECT_SCHEMA || 'public',
  planeProjectTables: parseList(process.env.PLANE_PROJECT_TABLES, ['project_project', 'projects']),
  planeProjectsLimit: Number(process.env.PLANE_PROJECTS_LIMIT || 200),
  planeBaseUrl: normalizeBaseUrl(process.env.PLANE_BASE_URL || ''),
  planeWorkspaceSlug: String(process.env.PLANE_WORKSPACE_SLUG || '').trim(),
  planeApiKey: String(process.env.PLANE_API_KEY || '').trim(),
  planeApiTimeoutMs: Number(process.env.PLANE_API_TIMEOUT_MS || 10000),
  jwtSecret: process.env.JWT_SECRET || 'change-me-before-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30m',
  apiAuthEnabled: parseBoolean(process.env.API_AUTH_ENABLED ?? process.env.VITE_USE_API_AUTH, true),
  authBcryptCost: parseInteger(process.env.AUTH_BCRYPT_COST, 12, { min: 12, max: 15 }),
  authPasswordMinLength: parseInteger(process.env.AUTH_PASSWORD_MIN_LENGTH, 12, { min: 8, max: 128 }),
  authLoginIpRateLimitMax: parseInteger(process.env.AUTH_LOGIN_IP_RATE_LIMIT_MAX, 30, { min: 1, max: 1000 }),
  authLoginEmailRateLimitMax: parseInteger(process.env.AUTH_LOGIN_EMAIL_RATE_LIMIT_MAX, 10, { min: 1, max: 1000 }),
  authLoginRateLimitWindowMs: parseInteger(process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000, {
    min: 1000,
    max: 24 * 60 * 60 * 1000
  }),
  authFailedLoginMax: parseInteger(process.env.AUTH_FAILED_LOGIN_MAX, 5, { min: 1, max: 100 }),
  authLockoutMs: parseInteger(process.env.AUTH_LOCKOUT_MS, 15 * 60 * 1000, {
    min: 1000,
    max: 24 * 60 * 60 * 1000
  }),
  apiRateLimitMax: parseInteger(process.env.API_RATE_LIMIT_MAX, 60, { min: 1, max: 1000 }),
  apiRateLimitWindowMs: parseInteger(process.env.API_RATE_LIMIT_WINDOW_MS, 60000, { min: 1000, max: 3600000 }),
  authSessionCookieEnabled: parseBoolean(process.env.AUTH_SESSION_COOKIE_ENABLED, false),
  authSessionCookieSecure: parseBoolean(process.env.AUTH_SESSION_COOKIE_SECURE, false),
  planeDb: buildDbConfig('PLANE_DB', legacyDb),
  appDb: buildDbConfig('APP_DB', legacyDb),
  appDbDockerContainer: String(process.env.APP_DB_DOCKER_CONTAINER || 'expedientes-db').trim(),
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || '',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || '',
  seedAdminName: process.env.SEED_ADMIN_NAME || 'Ing. Carlos Rivera',
  seedAdminRole: process.env.SEED_ADMIN_ROLE || 'Senior',
  // ── IA / OpenAI ──────────────────────────────────────────────────
  aiRequireAuth: parseBoolean(process.env.AI_REQUIRE_AUTH, true),
  aiRateLimitWindowMs: parseInteger(process.env.AI_RATE_LIMIT_WINDOW_MS, 60000, { min: 1000, max: 3600000 }),
  aiRateLimitMaxRequests: parseInteger(process.env.AI_RATE_LIMIT_MAX_REQUESTS, 12, { min: 1, max: 1000 }),
  aiMaxPromptChars: parseInteger(process.env.AI_MAX_PROMPT_CHARS, 4000, { min: 100, max: 20000 }),
  aiMaxContextEntries: parseInteger(process.env.AI_MAX_CONTEXT_ENTRIES, 30, { min: 1, max: 200 }),
  aiMaxContextValueChars: parseInteger(process.env.AI_MAX_CONTEXT_VALUE_CHARS, 400, { min: 20, max: 4000 }),
  aiMaxBlocksPerRequest: parseInteger(process.env.AI_MAX_BLOCKS_PER_REQUEST, 20, { min: 1, max: 200 }),
  openaiApiKey: String(process.env.OPENAI_API_KEY || '').trim(),
  openaiModel: String(process.env.OPENAI_MODEL || 'gpt-4o-mini').trim(),
  openaiTimeoutMs: parseInteger(process.env.OPENAI_TIMEOUT_MS, 30000, { min: 1000, max: 180000 })
};
