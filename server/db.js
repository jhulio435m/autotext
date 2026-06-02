import pg from 'pg';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from './config.js';

const { Pool } = pg;
const execFileAsync = promisify(execFile);

function createPool(dbConfig) {
  return new Pool({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 20
  });
}

async function resolveDockerIp(containerName) {
  try {
    const { stdout } = await execFileAsync('docker', [
      'inspect',
      '-f',
      '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}',
      containerName
    ]);
    return String(stdout || '').trim();
  } catch {
    return '';
  }
}

export let planePool = createPool(config.planeDb);
export let appPool = createPool(config.appDb);

async function refreshPoolFromDockerIfNeeded({ currentPool, dbConfig, containerName, assignPool }, error) {
  const code = String(error?.code || '').toUpperCase();
  if (!['ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH'].includes(code)) return false;

  const dockerIp = await resolveDockerIp(containerName);
  if (!dockerIp || dockerIp === dbConfig.host) return false;

  console.log(`[DB_RECOVERY] Switching ${containerName} to IP: ${dockerIp}`);
  const nextPool = createPool({ ...dbConfig, host: dockerIp });
  
  try {
    await nextPool.query('SELECT 1');
    assignPool(nextPool);
    dbConfig.host = dockerIp;
    currentPool.end().catch(() => {});
    return true;
  } catch (e) {
    nextPool.end().catch(() => {});
    return false;
  }
}

export async function queryPlaneDb(text, params = []) {
  try {
    return await planePool.query(text, params);
  } catch (error) {
    const refreshed = await refreshPoolFromDockerIfNeeded({
      currentPool: planePool,
      dbConfig: config.planeDb,
      containerName: 'plane-db',
      assignPool: (nextPool) => { planePool = nextPool; }
    }, error);
    if (!refreshed) throw error;
    return planePool.query(text, params);
  }
}

export async function queryAppDb(text, params = []) {
  try {
    return await appPool.query(text, params);
  } catch (error) {
    const refreshed = await refreshPoolFromDockerIfNeeded({
      currentPool: appPool,
      dbConfig: config.appDb,
      containerName: config.appDbDockerContainer,
      assignPool: (nextPool) => { appPool = nextPool; }
    }, error);
    if (!refreshed) throw error;
    return appPool.query(text, params);
  }
}

export async function checkPlaneDbConnection() {
  try {
    return await queryPlaneDb('SELECT 1');
  } catch (error) {
    console.warn('[DB_CHECK] Plane DB not reachable', error?.message || error);
    throw error;
  }
}

export async function checkAppDbConnection() {
  try {
    return await queryAppDb('SELECT 1');
  } catch (error) {
    console.error('[DB_CHECK] App DB not reachable', error?.message || error);
    throw error;
  }
}
