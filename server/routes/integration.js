import { checkAppDbConnection, checkPlaneDbConnection, queryPlaneDb } from '../db.js';
import {
  applyIntegrationProfile,
  checkPlaneApiStatus,
  detectIntegrationMode,
  getAvailableProfiles
} from '../services/integration-profile.js';
import { canUsePlaneApi } from '../infrastructure/plane-client.js';

export function registerIntegrationRoutes(app, deps) {
  const { appPool, config } = deps;

  app.get('/api/integration/status', async (_req, res) => {
    const [planeApi] = await Promise.all([checkPlaneApiStatus(config)]);

    let db = {
      enabled: true,
      ok: false
    };

    try {
      const result = await queryPlaneDb('SELECT current_database() AS database_name, current_user AS db_user');
      db = {
        enabled: true,
        ok: true,
        host: config.planeDb.host,
        port: config.planeDb.port,
        database: result.rows[0]?.database_name || config.planeDb.database,
        dbUser: result.rows[0]?.db_user || config.planeDb.user,
        readOnly: true
      };
    } catch (error) {
      db = {
        enabled: true,
        ok: false,
        host: config.planeDb.host,
        port: config.planeDb.port,
        database: config.planeDb.database,
        readOnly: true,
        error: error?.message || 'db_check_failed'
      };
    }

    let appDatabase = {
      enabled: config.enableAppEndpoints && !config.bridgeOnly,
      ok: false
    };

    if (config.enableAppEndpoints && !config.bridgeOnly) {
      try {
        await checkAppDbConnection();
        const result = await appPool.query('SELECT current_database() AS database_name, current_user AS db_user');
        appDatabase = {
          enabled: true,
          ok: true,
          host: config.appDb.host,
          port: config.appDb.port,
          database: result.rows[0]?.database_name || config.appDb.database,
          dbUser: result.rows[0]?.db_user || config.appDb.user
        };
      } catch (error) {
        appDatabase = {
          enabled: true,
          ok: false,
          host: config.appDb.host,
          port: config.appDb.port,
          database: config.appDb.database,
          error: error?.message || 'app_db_check_failed'
        };
      }
    }

    res.json({
      ok: true,
      mode: detectIntegrationMode(config),
      bridgeOnly: config.bridgeOnly,
      appEndpointsEnabled: config.enableAppEndpoints && !config.bridgeOnly,
      frontendFlags: {
        useApiAuth: process.env.VITE_USE_API_AUTH === 'true',
        useApiWorkspace: process.env.VITE_USE_API_WORKSPACE === 'true',
        usePlaneProjects: process.env.VITE_USE_PLANE_PROJECTS === 'true',
        usePlaneProjectIssues: process.env.VITE_USE_PLANE_PROJECT_ISSUES === 'true'
      },
      providers: {
        database: db,
        appDatabase,
        planeApi
      }
    });
  });

  app.get('/api/integration/profiles', (_req, res) => {
    res.json({
      ok: true,
      activeMode: detectIntegrationMode(config),
      profiles: getAvailableProfiles()
    });
  });

  app.post('/api/integration/profile', async (req, res) => {
    const profile = String(req.body?.profile || '').trim();
    if (!profile) {
      res.status(400).json({ ok: false, error: 'profile es obligatorio.' });
      return;
    }

    try {
      await applyIntegrationProfile(config, profile);
      res.json({
        ok: true,
        profile,
        restartRequired: true,
        message: 'Perfil aplicado. Reinicia dev:web y dev:api para cargar nuevos .env.'
      });
    } catch (error) {
      res.status(400).json({ ok: false, error: error?.message || 'No se pudo aplicar perfil.' });
    }
  });

  app.get('/api/health', async (_req, res) => {
    try {
      if (!canUsePlaneApi(config)) {
        await checkPlaneDbConnection();
      }
      res.json({
        ok: true,
        service: 'autotext-api',
        bridgeOnly: config.bridgeOnly,
        appEndpointsEnabled: config.enableAppEndpoints && !config.bridgeOnly,
        dataSource: canUsePlaneApi(config) ? 'plane_api' : 'plane_db'
      });
    } catch (error) {
      console.error('health_error', error);
      res.status(500).json({ ok: false, error: 'Fuente de datos no disponible' });
    }
  });
}
