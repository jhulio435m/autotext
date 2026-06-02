import { loadWorkspaceState } from '../workspace-store.js';
import { checkAppDbConnection } from '../db.js';
import { logger } from '../infrastructure/logger.js';
import { isDbConnectivityError } from '../services/request-utils.js';
import {
  AUTH_COOKIE_NAME,
  AUTH_FAILURE_MESSAGE,
  getClientIp,
  createPasswordResetToken,
  hashJwtId,
  hashPassword,
  isBcryptHash,
  normalizeEmail,
  passwordNeedsRehash,
  sanitizeAuthLog,
  validatePasswordPolicy,
  verifyPassword
} from '../services/auth-security.js';

function sendAuthFailure(res) {
  res.status(401).json({ error: AUTH_FAILURE_MESSAGE });
}

function isLocked(row, now = new Date()) {
  if (!row?.locked_until) return false;
  return new Date(row.locked_until).getTime() > now.getTime();
}

async function recordFailedLogin(appPool, row, config, logContext) {
  if (!row?.id) return;

  const failedCount = Number(row.failed_login_count || 0) + 1;
  const lockedUntil = failedCount >= config.authFailedLoginMax
    ? new Date(Date.now() + config.authLockoutMs)
    : null;

  await appPool.query(
    `UPDATE app_users
     SET failed_login_count = $2,
         locked_until = $3,
         updated_at = NOW()
     WHERE id = $1`,
    [row.id, failedCount, lockedUntil]
  );

  if (lockedUntil) {
    logger.warn('auth', 'login_lockout', sanitizeAuthLog({
      ...logContext,
      userId: row.id,
      lockedUntil: lockedUntil.toISOString()
    }));
  }
}

async function resetFailedLogins(appPool, userId) {
  await appPool.query(
    `UPDATE app_users
     SET failed_login_count = 0,
         locked_until = NULL,
         updated_at = NOW()
     WHERE id = $1`,
    [userId]
  );
}

function setSessionCookie(res, token, expiresAt, config) {
  if (!config.authSessionCookieEnabled) return;

  const maxAgeMs = Math.max(0, new Date(expiresAt).getTime() - Date.now());
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.authSessionCookieSecure,
    maxAge: maxAgeMs,
    path: '/'
  });
}

function cleanDisplayName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function validateDisplayName(value) {
  const name = cleanDisplayName(value);
  if (!name) {
    return { ok: false, name, error: 'El nombre es obligatorio.' };
  }
  if (name.length > 120) {
    return { ok: false, name, error: 'El nombre no puede superar 120 caracteres.' };
  }
  return { ok: true, name };
}

export function clearSessionCookie(res, config) {
  if (!config.authSessionCookieEnabled) return;
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.authSessionCookieSecure,
    path: '/'
  });
}

export function registerAuthRoutes(app, deps) {
  const {
    appPool,
    config,
    createToken,
    normalizeUserRow,
    authRequired,
    checkDbConnection = checkAppDbConnection
  } = deps;

  app.post('/api/auth/register', async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const name = cleanDisplayName(req.body?.name || '');
    const ip = getClientIp(req);
    const userAgent = String(req.headers['user-agent'] || '').slice(0, 500);
    const logContext = { email, ip };

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, contrasena y nombre son obligatorios.' });
      return;
    }

    if (name.length > 120) {
      res.status(400).json({ error: 'El nombre no puede superar 120 caracteres.' });
      return;
    }

    try {
      await checkDbConnection();

      const existing = await appPool.query(
        `SELECT id FROM app_users WHERE LOWER(email) = $1 LIMIT 1`,
        [email]
      );
      if (existing.rows[0]) {
        res.status(409).json({ error: 'El email ya esta registrado.' });
        return;
      }

      const policy = validatePasswordPolicy(password, { email, minLength: config.authPasswordMinLength });
      if (!policy.ok) {
        res.status(400).json({ error: 'La contrasena no cumple la politica.', errors: policy.errors });
        return;
      }

      const passwordHash = await hashPassword(password, config.authBcryptCost);
      const insertResult = await appPool.query(
        `INSERT INTO app_users (email, password_hash, name, role, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id, email, name, role`,
        [email, passwordHash, name, 'Usuario']
      );

      const row = insertResult.rows[0];
      const session = createToken(row.id, row.email);
      await appPool.query(
        `INSERT INTO app_user_sessions (user_id, jti_hash, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [row.id, hashJwtId(session.jti), ip, userAgent, session.expiresAt]
      );
      setSessionCookie(res, session.token, session.expiresAt, config);

      logger.info('auth', 'register_success', sanitizeAuthLog({ userId: row.id, email, ip }));
      res.status(201).json({
        token: session.token,
        tokenExpiresAt: session.expiresAt,
        user: normalizeUserRow(row)
      });
    } catch (error) {
      logger.error('auth', 'register_error', sanitizeAuthLog({ ...logContext, error: error?.message || error }));
      if (isDbConnectivityError(error)) {
        res.status(503).json({ error: 'La base de datos de la aplicacion no esta disponible.' });
        return;
      }
      res.status(500).json({ error: 'No se pudo completar el registro.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const ip = getClientIp(req);
    const userAgent = String(req.headers['user-agent'] || '').slice(0, 500);
    const logContext = { email, ip };

    if (!email || !password) {
      res.status(400).json({ error: 'Email y contrasena son obligatorios.' });
      return;
    }

    try {
      await checkDbConnection();
      const result = await appPool.query(
        `SELECT id, email, password_hash, name, role, failed_login_count, locked_until
         FROM app_users
         WHERE LOWER(email) = $1
         LIMIT 1`,
        [email]
      );

      const row = result.rows[0];
      if (!row) {
        logger.warn('auth', 'login_failed', sanitizeAuthLog({ ...logContext, reason: 'unknown_user' }));
        sendAuthFailure(res);
        return;
      }

      if (isLocked(row)) {
        logger.warn('auth', 'login_failed', sanitizeAuthLog({ ...logContext, userId: row.id, reason: 'locked' }));
        sendAuthFailure(res);
        return;
      }

      if (!isBcryptHash(row.password_hash)) {
        logger.warn('auth', 'login_failed', sanitizeAuthLog({ ...logContext, userId: row.id, reason: 'legacy_hash' }));
        await recordFailedLogin(appPool, row, config, logContext);
        sendAuthFailure(res);
        return;
      }

      const validPassword = await verifyPassword(password, row.password_hash);

      if (!validPassword) {
        logger.warn('auth', 'login_failed', sanitizeAuthLog({ ...logContext, userId: row.id, reason: 'bad_password' }));
        await recordFailedLogin(appPool, row, config, logContext);
        sendAuthFailure(res);
        return;
      }

      let passwordHash = row.password_hash;
      if (passwordNeedsRehash(row.password_hash, config.authBcryptCost)) {
        passwordHash = await hashPassword(password, config.authBcryptCost);
        await appPool.query(
          `UPDATE app_users
           SET password_hash = $2,
               updated_at = NOW()
           WHERE id = $1`,
          [row.id, passwordHash]
        );
        logger.info('auth', 'password_rehashed', sanitizeAuthLog({ userId: row.id, email }));
      }

      await resetFailedLogins(appPool, row.id);

      const session = createToken(row.id, row.email);
      await appPool.query(
        `INSERT INTO app_user_sessions (user_id, jti_hash, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [row.id, hashJwtId(session.jti), ip, userAgent, session.expiresAt]
      );
      setSessionCookie(res, session.token, session.expiresAt, config);

      const workspaceState = await loadWorkspaceState(appPool, row.id, { includeDocumentContent: false });
      logger.info('auth', 'login_success', sanitizeAuthLog({ userId: row.id, email, ip }));

      res.json({
        token: session.token,
        tokenExpiresAt: session.expiresAt,
        user: normalizeUserRow({ ...row, password_hash: passwordHash }),
        workspace: workspaceState.workspace || null,
        workspaceUpdatedAt: workspaceState.updatedAt || null
      });
    } catch (error) {
      logger.error('auth', 'login_error', sanitizeAuthLog({ ...logContext, error: error?.message || error }));
      if (isDbConnectivityError(error)) {
        res.status(503).json({ error: 'La base de datos de la aplicación no está disponible.' });
        return;
      }
      res.status(500).json({ error: 'No se pudo procesar el login.' });
    }
  });


  app.post('/api/auth/forgot-password', async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const generic = { ok: true, message: 'Si el email existe, recibiras instrucciones para restablecer la contrasena.' };

    if (!email) {
      res.json(generic);
      return;
    }

    try {
      await checkDbConnection();
      const result = await appPool.query(
        `SELECT id, email
         FROM app_users
         WHERE LOWER(email) = $1
         LIMIT 1`,
        [email]
      );

      const row = result.rows[0];
      if (row?.id) {
        const reset = createPasswordResetToken();
        await appPool.query(
          `INSERT INTO app_password_reset_tokens (user_id, token_hash, expires_at)
           VALUES ($1, $2, $3)`,
          [row.id, reset.tokenHash, reset.expiresAt]
        );
        logger.info('auth', 'password_reset_requested', sanitizeAuthLog({ userId: row.id, email: row.email }));
        res.json({ ...generic, resetToken: process.env.NODE_ENV === 'production' ? undefined : reset.token });
        return;
      }

      logger.warn('auth', 'password_reset_unknown_user', sanitizeAuthLog({ email }));
      res.json(generic);
    } catch (error) {
      logger.error('auth', 'password_reset_request_error', sanitizeAuthLog({ email, error: error?.message || error }));
      res.status(500).json({ error: 'No se pudo procesar la solicitud.' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const token = String(req.body?.token || '').trim();
    const newPassword = String(req.body?.newPassword || '');

    if (!token || !newPassword) {
      res.status(400).json({ error: 'Token y nueva contrasena son obligatorios.' });
      return;
    }

    try {
      const result = await appPool.query(
        `SELECT prt.id AS token_id, prt.user_id, u.email, u.name, u.role
         FROM app_password_reset_tokens prt
         JOIN app_users u ON u.id = prt.user_id
         WHERE prt.token_hash = $1
           AND prt.used_at IS NULL
           AND prt.expires_at > NOW()
         LIMIT 1`,
        [hashJwtId(token)]
      );

      const row = result.rows[0];
      if (!row) {
        res.status(400).json({ error: 'El enlace de recuperacion es invalido o expiro.' });
        return;
      }

      const policy = validatePasswordPolicy(newPassword, {
        email: row.email,
        minLength: config.authPasswordMinLength
      });
      if (!policy.ok) {
        res.status(400).json({ error: 'La nueva contrasena no cumple la politica.', errors: policy.errors });
        return;
      }

      const passwordHash = await hashPassword(newPassword, config.authBcryptCost);
      await appPool.query('BEGIN');
      try {
        await appPool.query(
          `UPDATE app_users
           SET password_hash = $2,
               failed_login_count = 0,
               locked_until = NULL,
               updated_at = NOW()
           WHERE id = $1`,
          [row.user_id, passwordHash]
        );
        await appPool.query(`UPDATE app_password_reset_tokens SET used_at = NOW() WHERE id = $1 AND used_at IS NULL`, [row.token_id]);
        await appPool.query(
          `UPDATE app_user_sessions
           SET revoked_at = NOW(),
               last_seen_at = NOW()
           WHERE user_id = $1
             AND revoked_at IS NULL`,
          [row.user_id]
        );
        await appPool.query('COMMIT');
      } catch (txError) {
        await appPool.query('ROLLBACK');
        throw txError;
      }

      logger.info('auth', 'password_reset_completed', sanitizeAuthLog({ userId: row.user_id, email: row.email }));
      res.json({ ok: true, user: normalizeUserRow({ id: row.user_id, email: row.email, name: row.name, role: row.role }) });
    } catch (error) {
      logger.error('auth', 'password_reset_error', sanitizeAuthLog({ error: error?.message || error }));
      res.status(500).json({ error: 'No se pudo restablecer la contrasena.' });
    }
  });

  app.post('/api/auth/logout', authRequired, async (req, res) => {
    try {
      await appPool.query(
        `UPDATE app_user_sessions
         SET revoked_at = NOW(),
             last_seen_at = NOW()
         WHERE jti_hash = $1
           AND revoked_at IS NULL`,
        [hashJwtId(req.auth.jti)]
      );
      clearSessionCookie(res, config);
      logger.info('auth', 'logout_success', sanitizeAuthLog({ userId: req.auth.userId, email: req.auth.email }));
      res.json({ ok: true });
    } catch (error) {
      logger.error('auth', 'logout_error', sanitizeAuthLog({
        userId: req.auth?.userId,
        email: req.auth?.email,
        error: error?.message || error
      }));
      res.status(500).json({ error: 'No se pudo cerrar la sesion.' });
    }
  });


  app.get('/api/auth/sessions', authRequired, async (req, res) => {
    try {
      const result = await appPool.query(
        `SELECT id, jti_hash, ip_address, user_agent, created_at, last_seen_at, expires_at
         FROM app_user_sessions
         WHERE user_id = $1
           AND revoked_at IS NULL
           AND expires_at > NOW()
         ORDER BY last_seen_at DESC`,
        [req.auth.userId]
      );
      const currentHash = hashJwtId(req.auth.jti);
      res.json({ sessions: result.rows.map((row) => ({ id: row.id, ipAddress: row.ip_address || '', userAgent: row.user_agent || '', createdAt: row.created_at, lastSeenAt: row.last_seen_at, expiresAt: row.expires_at, current: row.jti_hash === currentHash })) });
    } catch (error) {
      logger.error('auth', 'sessions_list_error', sanitizeAuthLog({ userId: req.auth?.userId, error: error?.message || error }));
      res.status(500).json({ error: 'No se pudieron listar las sesiones.' });
    }
  });

  app.delete('/api/auth/sessions/:sessionId', authRequired, async (req, res) => {
    const sessionId = Number(req.params.sessionId);
    if (!Number.isFinite(sessionId)) {
      res.status(400).json({ error: 'Sesion invalida.' });
      return;
    }

    try {
      await appPool.query(
        `UPDATE app_user_sessions
         SET revoked_at = NOW(),
             last_seen_at = NOW()
         WHERE id = $1
           AND user_id = $2
           AND jti_hash <> $3
           AND revoked_at IS NULL`,
        [sessionId, req.auth.userId, hashJwtId(req.auth.jti)]
      );
      res.json({ ok: true });
    } catch (error) {
      logger.error('auth', 'session_revoke_error', sanitizeAuthLog({ userId: req.auth?.userId, sessionId, error: error?.message || error }));
      res.status(500).json({ error: 'No se pudo cerrar la sesion.' });
    }
  });

  app.post('/api/auth/sessions/revoke-others', authRequired, async (req, res) => {
    try {
      await appPool.query(
        `UPDATE app_user_sessions
         SET revoked_at = NOW(),
             last_seen_at = NOW()
         WHERE user_id = $1
           AND jti_hash <> $2
           AND revoked_at IS NULL`,
        [req.auth.userId, hashJwtId(req.auth.jti)]
      );
      res.json({ ok: true });
    } catch (error) {
      logger.error('auth', 'sessions_revoke_others_error', sanitizeAuthLog({ userId: req.auth?.userId, error: error?.message || error }));
      res.status(500).json({ error: 'No se pudieron cerrar las otras sesiones.' });
    }
  });

  app.get('/api/auth/me', authRequired, async (req, res) => {
    try {
      const result = await appPool.query(
        `SELECT id, email, name, role
         FROM app_users
         WHERE id = $1
         LIMIT 1`,
        [req.auth.userId]
      );

      const row = result.rows[0];
      if (!row) {
        res.status(404).json({ error: 'Usuario no encontrado.' });
        return;
      }

      res.json({ user: normalizeUserRow(row) });
    } catch (error) {
      logger.error('auth', 'profile_read_error', sanitizeAuthLog({
        userId: req.auth?.userId,
        email: req.auth?.email,
        error: error?.message || error
      }));
      res.status(500).json({ error: 'No se pudo leer el perfil.' });
    }
  });

  app.put('/api/auth/me', authRequired, async (req, res) => {
    const validation = validateDisplayName(req.body?.name);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }

    try {
      const result = await appPool.query(
        `UPDATE app_users
         SET name = $2,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, email, name, role`,
        [req.auth.userId, validation.name]
      );

      const row = result.rows[0];
      if (!row) {
        res.status(404).json({ error: 'Usuario no encontrado.' });
        return;
      }

      logger.info('auth', 'profile_updated', sanitizeAuthLog({ userId: row.id, email: row.email }));
      res.json({ user: normalizeUserRow(row) });
    } catch (error) {
      logger.error('auth', 'profile_update_error', sanitizeAuthLog({
        userId: req.auth?.userId,
        email: req.auth?.email,
        error: error?.message || error
      }));
      res.status(500).json({ error: 'No se pudo actualizar el perfil.' });
    }
  });

  app.post('/api/auth/change-password', authRequired, async (req, res) => {
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'La contrasena actual y la nueva contrasena son obligatorias.' });
      return;
    }

    try {
      const result = await appPool.query(
        `SELECT id, email, password_hash, name, role
         FROM app_users
         WHERE id = $1
         LIMIT 1`,
        [req.auth.userId]
      );

      const row = result.rows[0];
      if (!row || !isBcryptHash(row.password_hash)) {
        sendAuthFailure(res);
        return;
      }

      const validPassword = await verifyPassword(currentPassword, row.password_hash);
      if (!validPassword) {
        logger.warn('auth', 'password_change_failed', sanitizeAuthLog({
          userId: req.auth.userId,
          email: req.auth.email,
          reason: 'bad_current_password'
        }));
        sendAuthFailure(res);
        return;
      }

      const policy = validatePasswordPolicy(newPassword, {
        email: row.email,
        minLength: config.authPasswordMinLength
      });
      if (!policy.ok) {
        res.status(400).json({ error: 'La nueva contrasena no cumple la politica.', errors: policy.errors });
        return;
      }

      const passwordHash = await hashPassword(newPassword, config.authBcryptCost);
      await appPool.query(
        `UPDATE app_users
         SET password_hash = $2,
             failed_login_count = 0,
             locked_until = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [row.id, passwordHash]
      );

      await appPool.query(
        `UPDATE app_user_sessions
         SET revoked_at = NOW(),
             last_seen_at = NOW()
         WHERE user_id = $1
           AND jti_hash <> $2
           AND revoked_at IS NULL`,
        [row.id, hashJwtId(req.auth.jti)]
      );

      logger.info('auth', 'password_changed', sanitizeAuthLog({ userId: row.id, email: row.email }));
      res.json({ ok: true, user: normalizeUserRow({ ...row, password_hash: passwordHash }) });
    } catch (error) {
      logger.error('auth', 'password_change_error', sanitizeAuthLog({
        userId: req.auth?.userId,
        email: req.auth?.email,
        error: error?.message || error
      }));
      res.status(500).json({ error: 'No se pudo cambiar la contrasena.' });
    }
  });
}
