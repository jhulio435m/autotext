import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fetchPlaneApiJson, canUsePlaneApi } from '../infrastructure/plane-client.js';
import { normalizePlaneApiListResponse } from '../core/plane-mapper.js';

const execFileAsync = promisify(execFile);

export function detectIntegrationMode(config) {
  if (canUsePlaneApi(config)) return 'plane_api';
  if (String(config.planeDb.database || '').toLowerCase() === 'plane') return 'plane_db';
  if (config.frappeBaseUrl) return 'frappe';
  return 'local';
}

export function getAvailableProfiles() {
  return ['local', 'plane-db', 'plane-api', 'frappe'];
}

export async function applyIntegrationProfile(config, profile) {
  const allowed = new Set(getAvailableProfiles());
  if (!allowed.has(profile)) {
    throw new Error(`Perfil invalido: ${profile}`);
  }

  const root = process.cwd();
  const webSrc = path.join(root, 'env', 'profiles', `${profile}.web.env`);
  const apiSrc = path.join(root, 'env', 'profiles', `${profile}.api.env`);
  const webDst = path.join(root, '.env');
  const apiDst = path.join(root, 'server', '.env');

  const [webExists, apiExists] = await Promise.all([
    fs.stat(webSrc).then(() => true).catch(() => false),
    fs.stat(apiSrc).then(() => true).catch(() => false)
  ]);

  if (!webExists || !apiExists) {
    throw new Error(`No existe perfil ${profile} en env/profiles`);
  }

  const [webContent, apiContent] = await Promise.all([
    fs.readFile(webSrc, 'utf8'),
    fs.readFile(apiSrc, 'utf8')
  ]);

  let nextApiContent = apiContent;
  if (profile === 'plane-db') {
    const planeDbHost = await resolvePlaneDbHost();
    if (planeDbHost) {
      nextApiContent = replaceEnvValue(nextApiContent, 'PLANE_DB_HOST', planeDbHost);
      nextApiContent = replaceEnvValue(nextApiContent, 'DB_HOST', planeDbHost);
    }
  }

  await Promise.all([
    fs.writeFile(webDst, webContent, 'utf8'),
    fs.writeFile(apiDst, nextApiContent, 'utf8')
  ]);
}

async function resolvePlaneDbHost() {
  try {
    const { stdout } = await execFileAsync('docker', [
      'inspect',
      '-f',
      '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}',
      'plane-db'
    ]);
    const value = String(stdout || '').trim();
    return value || '';
  } catch {
    return '';
  }
}

function replaceEnvValue(content, key, value) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const line = `${key}=${value}`;
  if (new RegExp(`^${escapedKey}=`, 'm').test(content)) {
    return content.replace(new RegExp(`^${escapedKey}=.*$`, 'm'), line);
  }
  return `${content.trimEnd()}\n${line}\n`;
}

export async function checkPlaneApiStatus(config) {
  if (!canUsePlaneApi(config)) {
    return {
      enabled: false,
      ok: false,
      reason: 'PLANE_WORKSPACE_SLUG o PLANE_API_KEY faltante'
    };
  }

  try {
    const payload = await fetchPlaneApiJson(config, `/api/v1/workspaces/${config.planeWorkspaceSlug}/projects/`, {
      per_page: 1
    });
    const sample = normalizePlaneApiListResponse(payload);
    return {
      enabled: true,
      ok: true,
      workspaceSlug: config.planeWorkspaceSlug,
      sampleCount: sample.length
    };
  } catch (error) {
    return {
      enabled: true,
      ok: false,
      error: error?.message || 'plane_api_check_failed'
    };
  }
}

export async function checkFrappeStatus(config) {
  if (!config.frappeBaseUrl) {
    return {
      enabled: false,
      ok: false,
      reason: 'FRAPPE_BASE_URL no configurado'
    };
  }

  const headers = { Accept: 'application/json' };
  if (config.frappeApiKey && config.frappeApiSecret) {
    headers.Authorization = `token ${config.frappeApiKey}:${config.frappeApiSecret}`;
  }

  try {
    const target = new URL('/api/method/ping', `${config.frappeBaseUrl}/`).toString();
    const response = await fetch(target, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(Math.max(1000, config.planeApiTimeoutMs || 10000))
    });

    return {
      enabled: true,
      ok: response.ok,
      status: response.status,
      baseUrl: config.frappeBaseUrl
    };
  } catch (error) {
    return {
      enabled: true,
      ok: false,
      baseUrl: config.frappeBaseUrl,
      error: error?.message || 'frappe_check_failed'
    };
  }
}
