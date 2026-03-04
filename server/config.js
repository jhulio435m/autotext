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
  jwtSecret: process.env.JWT_SECRET || 'change-me-before-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  dbHost: process.env.DB_HOST || '127.0.0.1',
  dbPort: Number(process.env.DB_PORT || 5432),
  dbUser: process.env.DB_USER || 'postgres',
  dbPassword: process.env.DB_PASSWORD || 'postgres',
  dbName: process.env.DB_NAME || 'autotext',
  dbSsl: parseBoolean(process.env.DB_SSL, false),
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || '',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || '',
  seedAdminName: process.env.SEED_ADMIN_NAME || 'Ing. Carlos Rivera',
  seedAdminRole: process.env.SEED_ADMIN_ROLE || 'Senior'
};
