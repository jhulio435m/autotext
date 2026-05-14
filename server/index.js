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
import fs from 'node:fs';
import path from 'node:path';

const app = express();

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
      // Allow all origins in dev for now to unblock
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(
  compression({
    threshold: 1024
  })
);

app.use(express.json({ limit: '200mb' }));

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

function authOptionalInDev(req, res, next) {
  if (!config.apiAuthEnabled) {
    next();
    return;
  }
  authRequired(req, res, next);
}

registerAppRoutes(app, { appPool, config, authRequired, authOptionalInDev, createToken, normalizeUserRow });
registerIntegrationRoutes(app, { appPool, config });
registerPlaneRoutes(app, { config });
registerAiRoutes(app, { config }); // IA — siempre activo

const distDir = path.join(process.cwd(), 'dist');
const distIndex = path.join(distDir, 'index.html');
if (fs.existsSync(distIndex)) {
  app.use(
    express.static(distDir, {
      index: false,
      maxAge: '1h'
    })
  );

  app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(distIndex);
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
      startPlaneSyncInterval(); // Start background sync
    } else {
      await checkPlaneDbConnection();
      console.log('plane_db_startup_check_ok');
    }
  } catch (error) {
    // Keep API running so health endpoints can report DB availability.
    console.error('plane_db_startup_check_failed', error);
  }
}

start();
