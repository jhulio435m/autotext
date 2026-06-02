import express from 'express';
import cors from 'cors';
import compression from 'compression';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { appPool, checkPlaneDbConnection } from './db.js';
import { seedSystemTemplates } from './templates.js';
import { registerAppRoutes } from './routes/app.js';
import { registerPlaneRoutes } from './routes/plane.js';
import { registerIntegrationRoutes } from './routes/integration.js';
import { registerAiRoutes } from './routes/ai.js';
import { canUsePlaneApi } from './infrastructure/plane-client.js';
import { startPlaneSyncInterval } from './features/sync/sync-projects.js';
import { createInMemoryRateLimiter } from './services/rate-limit.js';
import { AUTH_COOKIE_NAME, createAccessToken, findActiveSession, hashJwtId } from './services/auth-security.js';
import { runMigrations } from './db/migrate.js';
import { openApiSpec } from './docs/openapi.js';
import swaggerUi from 'swagger-ui-express';
import fs from 'node:fs';
import path from 'node:path';

const app = express();
app.disable('x-powered-by');

if (config.jwtSecret === 'change-me-before-production') {
  throw new Error('JWT_SECRET inseguro o no configurado. Define un secreto real antes de iniciar la API.');
}

const crashLog = path.join(process.cwd(), 'crash.log');
process.on('uncaughtException', (err) => {
  const msg = `[${new Date().toISOString()}] UNCAUGHT EXCEPTION: ${err.message}\n${err.stack}\n`;
  fs.appendFileSync(crashLog, msg);
  console.error(msg);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  const msg = `[${new Date().toISOString()}] UNHANDLED REJECTION: ${reason}\n`;
  fs.appendFileSync(crashLog, msg);
  console.error(msg);
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.allowAllCors) {
        callback(null, true);
        return;
      }

      if (config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin not allowed: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' https://static.cloudflareinsights.com; script-src-elem 'self' https://static.cloudflareinsights.com; connect-src 'self' https:"
  );
  next();
});

app.use(
  compression({
    threshold: 1024
  })
);

app.use(express.json({ limit: `${config.requestBodyLimitMb}mb` }));

function createToken(userId, email) {
  return createAccessToken({
    jwtSecret: config.jwtSecret,
    jwtExpiresIn: config.jwtExpiresIn,
    userId,
    email
  });
}

function normalizeUserRow(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    avatar: row.avatar || null
  };
}

function parseBearerToken(headerValue) {
  if (!headerValue) return null;
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function parseCookieToken(headerValue) {
  if (!headerValue) return null;
  const cookies = String(headerValue)
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
  for (const cookie of cookies) {
    const separator = cookie.indexOf('=');
    if (separator === -1) continue;
    const name = cookie.slice(0, separator);
    if (name !== AUTH_COOKIE_NAME) continue;
    return decodeURIComponent(cookie.slice(separator + 1));
  }
  return null;
}

async function authRequired(req, res, next) {
  const token = parseBearerToken(req.headers.authorization) || parseCookieToken(req.headers.cookie);
  if (!token) {
    res.status(401).json({ error: 'No autorizado. Falta token.' });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (!payload.jti) {
      res.status(401).json({ error: 'Token invalido o expirado.' });
      return;
    }

    const session = await findActiveSession(appPool, payload.jti);
    if (!session) {
      res.status(401).json({ error: 'Token invalido o expirado.' });
      return;
    }

    await appPool.query(
      'UPDATE app_user_sessions SET last_seen_at = NOW() WHERE jti_hash = $1',
      [hashJwtId(payload.jti)]
    );

    const userResult = await appPool.query(
      'SELECT role FROM app_users WHERE id = $1 LIMIT 1',
      [Number(payload.sub)]
    );

    req.auth = {
      userId: Number(payload.sub),
      email: payload.email,
      jti: payload.jti,
      role: userResult.rows[0]?.role || 'Usuario'
    };
    next();
  } catch {
    res.status(401).json({ error: 'Token invalido o expirado.' });
  }
}

function requireAdmin(req, res, next) {
  authRequired(req, res, () => {
    if (req.auth?.role !== 'Senior') {
      res.status(403).json({ error: 'Acceso no autorizado. Se requiere rol de administrador.' });
      return;
    }
    next();
  });
}

function authOptionalInDev(req, res, next) {
  if (!config.apiAuthEnabled) {
    next();
    return;
  }
  authRequired(req, res, next);
}

const authRateLimit = createInMemoryRateLimiter({
  maxRequests: config.authLoginEmailRateLimitMax,
  windowMs: config.authLoginRateLimitWindowMs,
  keyFn: (req) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    return `email:${email || 'anonymous'}`;
  }
});
const authIpRateLimit = createInMemoryRateLimiter({
  maxRequests: config.authLoginIpRateLimitMax,
  windowMs: config.authLoginRateLimitWindowMs,
  keyFn: (req) => {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    return `ip:${forwarded || req.ip || 'anonymous'}`;
  }
});
const apiRateLimit = createInMemoryRateLimiter({
  maxRequests: config.apiRateLimitMax,
  windowMs: config.apiRateLimitWindowMs,
  keyFn: (req) => req.auth?.userId || req.ip || req.headers['x-forwarded-for'] || 'anonymous'
});

const aiRateLimit = createInMemoryRateLimiter({
  maxRequests: config.aiRateLimitMaxRequests,
  windowMs: config.aiRateLimitWindowMs,
  keyFn: (req) => req.auth?.userId || req.ip || req.headers['x-forwarded-for'] || 'anonymous'
});

app.use('/api/auth/login', authIpRateLimit, authRateLimit);
app.use('/api/auth/register', authIpRateLimit, authRateLimit);

const apiRateLimitedAuth = [apiRateLimit];
const apiRateLimited = [authRequired, apiRateLimit];
const apiRateLimitedOptional = [authOptionalInDev, apiRateLimit];

app.use('/api/auth/forgot-password', ...apiRateLimitedAuth);
app.use('/api/auth/reset-password', ...apiRateLimitedAuth);
app.use('/api/auth/me', ...apiRateLimited);
app.use('/api/auth/sessions', ...apiRateLimited);
app.use('/api/auth/logout', ...apiRateLimited);
app.use('/api/auth/change-password', ...apiRateLimited);
app.use('/api/admin', ...apiRateLimited);
app.use('/api/workspace', ...apiRateLimitedOptional);
app.use('/api/projects', ...apiRateLimitedOptional);
app.use('/api/documents', ...apiRateLimitedOptional);
app.use('/api/templates', ...apiRateLimitedOptional);
app.use('/api/integration', ...apiRateLimitedOptional);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  customSiteTitle: 'Autotext API Docs',
  customCss: '.swagger-ui .topbar { display: none }'
}));

registerAppRoutes(app, { appPool, config, authRequired, authOptionalInDev, requireAdmin, createToken, normalizeUserRow });
registerIntegrationRoutes(app, { appPool, config, authRequired, authOptionalInDev });
registerPlaneRoutes(app, { config });
registerAiRoutes(app, { config, authRequired, authOptionalInDev, aiRateLimit }); // IA — siempre activo

const distDir = path.join(process.cwd(), 'dist');
const distIndex = path.join(distDir, 'index.html');
if (fs.existsSync(distIndex)) {
  app.use(
    express.static(distDir, {
      index: false,
      etag: false,
      lastModified: false,
      maxAge: 0,
      setHeaders(res) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    })
  );

  app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(distIndex);
  });
}

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Ruta API no encontrada.' });
});

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
    await runMigrations(appPool);
    console.log('db_migrations_ok');
  } catch (error) {
    console.error('db_migrations_failed', error);
    process.exit(1);
  }

  app.listen(config.apiPort, config.apiHost, () => {
    console.log(`API running on http://${config.apiHost}:${config.apiPort}`);
  });

  try {
    await seedSystemTemplates(appPool);
    console.log('system_templates_ready');
  } catch (error) {
    console.error('system_templates_seed_error', error);
  }

  try {
    if (canUsePlaneApi(config)) {
      console.log('plane_api_mode_enabled');
    } else {
      await checkPlaneDbConnection();
      console.log('plane_db_startup_check_ok');
    }
    startPlaneSyncInterval(); // Start background sync regardless of provider
  } catch (error) {
    // Keep API running so health endpoints can report DB availability.
    console.warn('plane_sync_interval_start_warning', error.message);
  }
}

start();
