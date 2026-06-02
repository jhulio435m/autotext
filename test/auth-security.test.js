import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { registerAuthRoutes } from '../server/routes/auth.js';
import {
  AUTH_FAILURE_MESSAGE,
  createAccessToken,
  createPasswordResetToken,
  findActiveSession,
  getBcryptCost,
  hashJwtId,
  hashPassword,
  validatePasswordPolicy
} from '../server/services/auth-security.js';

function createMockApp() {
  const routes = new Map();
  return {
    get(path, ...handlers) {
      routes.set(`GET ${path}`, handlers);
    },
    post(path, ...handlers) {
      routes.set(`POST ${path}`, handlers);
    },
    put(path, ...handlers) {
      routes.set(`PUT ${path}`, handlers);
    },
    delete(path, ...handlers) {
      routes.set(`DELETE ${path}`, handlers);
    },
    handlers(path, method = 'POST') {
      return routes.get(`${method} ${path}`);
    }
  };
}

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    cookies: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    cookie(name, value, options) {
      this.cookies[name] = { value, options };
      return this;
    },
    clearCookie(name, options) {
      this.cookies[name] = { value: '', options, cleared: true };
      return this;
    }
  };
}

function createAuthPool(row) {
  const sessions = [];
  const resetTokens = [];
  return {
    sessions,
    resetTokens,
    async query(sql, params = []) {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('FROM app_password_reset_tokens')) {
        const token = resetTokens.find((item) => item.tokenHash === params[0] && !item.usedAt && new Date(item.expiresAt).getTime() > Date.now());
        return { rows: token && row ? [{ token_id: token.id, user_id: row.id, email: row.email, name: row.name, role: row.role }] : [] };
      }
      if (sql.includes('FROM app_users')) {
        return { rows: row ? [row] : [] };
      }
      if (sql.includes('SET name =')) {
        row.name = params[1];
        return { rows: [{ id: row.id, email: row.email, name: row.name, role: row.role }] };
      }
      if (sql.includes('failed_login_count = 0')) {
        row.failed_login_count = 0;
        row.locked_until = null;
        return { rows: [] };
      }
      if (sql.includes('failed_login_count')) {
        row.failed_login_count = params[1];
        row.locked_until = params[2];
        return { rows: [] };
      }
      if (sql.includes('SET password_hash')) {
        row.password_hash = params[1];
        return { rows: [] };
      }
      if (sql.includes('SELECT id, jti_hash')) {
        return { rows: sessions.filter((session) => session.userId === params[0] && !session.revokedAt).map((session, index) => ({ id: session.id || index + 1, jti_hash: session.jtiHash, ip_address: session.ipAddress || '', user_agent: session.userAgent || '', created_at: new Date(), last_seen_at: new Date(), expires_at: session.expiresAt || new Date(Date.now() + 1000 * 60).toISOString() })) };
      }
      if (sql.includes('WHERE id = $1') && sql.includes('jti_hash <>')) {
        sessions.forEach((session, index) => {
          if ((session.id || index + 1) === params[0] && session.userId === params[1] && session.jtiHash !== params[2] && !session.revokedAt) session.revokedAt = new Date();
        });
        return { rows: [] };
      }
      if (sql.includes('jti_hash <>')) {
        sessions.forEach((session) => {
          if (session.userId === params[0] && session.jtiHash !== params[1] && !session.revokedAt) {
            session.revokedAt = new Date();
          }
        });
        return { rows: [] };
      }
      if (sql.includes('UPDATE app_user_sessions') && sql.includes('WHERE user_id = $1') && !sql.includes('jti_hash <>')) {
        sessions.forEach((session) => {
          if (session.userId === params[0] && !session.revokedAt) session.revokedAt = new Date();
        });
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO app_password_reset_tokens')) {
        resetTokens.push({ id: resetTokens.length + 1, userId: params[0], tokenHash: params[1], expiresAt: params[2], usedAt: null });
        return { rows: [] };
      }
      if (sql.includes('UPDATE app_password_reset_tokens')) {
        const token = resetTokens.find((item) => item.id === params[0]);
        if (token) token.usedAt = new Date();
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO app_user_sessions')) {
        sessions.push({
          userId: params[0],
          jtiHash: params[1],
          expiresAt: params[4]
        });
        return { rows: [] };
      }
      if (sql.includes('FROM app_projects')) return { rows: [] };
      if (sql.includes('FROM app_documents')) return { rows: [] };
      if (sql.includes('FROM app_project_variables')) return { rows: [] };
      return { rows: [] };
    }
  };
}

function registerAuth(pool, configOverrides = {}) {
  const app = createMockApp();
  registerAuthRoutes(app, {
    appPool: pool,
    config: {
      authBcryptCost: 5,
      authFailedLoginMax: 2,
      authLockoutMs: 60000,
      authSessionCookieEnabled: false,
      authSessionCookieSecure: false,
      ...configOverrides
    },
    createToken: (userId, email) => createAccessToken({
      jwtSecret: 'test-secret-for-auth-route',
      jwtExpiresIn: '30m',
      userId,
      email
    }),
    normalizeUserRow: (row) => ({ id: row.id, email: row.email, name: row.name, role: row.role }),
    authRequired: (_req, _res, next) => next(),
    checkDbConnection: async () => ({ ok: true })
  });
  return app;
}

function registerLogin(pool, configOverrides = {}) {
  const app = registerAuth(pool, configOverrides);
  return app.handlers('/api/auth/login', 'POST')[0];
}

test('password policy rejects downloaded common passwords and email-derived passwords', () => {
  assert.equal(validatePasswordPolicy('letmein', { minLength: 4 }).ok, false);
  assert.equal(validatePasswordPolicy('ingeniero@empresa.com', { email: 'ingeniero@empresa.com' }).ok, false);
  assert.equal(validatePasswordPolicy('una-frase-larga-segura-2026', { email: 'ingeniero@empresa.com' }).ok, true);
});

test('hashPassword uses bcrypt cost 12 when requested', async () => {
  const hash = await hashPassword('una-frase-larga-segura-2026', 12);
  assert.equal(getBcryptCost(hash), 12);
});

test('login rehashes lower-cost bcrypt hashes and creates a JTI session', async () => {
  const row = {
    id: 7,
    email: 'user@example.com',
    password_hash: await hashPassword('correct-password-2026', 4),
    name: 'User',
    role: 'Admin',
    failed_login_count: 0,
    locked_until: null
  };
  const pool = createAuthPool(row);
  const login = registerLogin(pool, { authBcryptCost: 5 });
  const res = createMockRes();

  await login({
    body: { email: 'USER@example.com', password: 'correct-password-2026' },
    headers: {},
    ip: '127.0.0.1'
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(getBcryptCost(row.password_hash), 5);
  assert.equal(pool.sessions.length, 1);
  assert.equal(typeof res.body.token, 'string');
  assert.equal(typeof res.body.tokenExpiresAt, 'string');
});

test('login locks the user after consecutive failed attempts with generic responses', async () => {
  const row = {
    id: 8,
    email: 'user@example.com',
    password_hash: await hashPassword('correct-password-2026', 4),
    name: 'User',
    role: 'Admin',
    failed_login_count: 0,
    locked_until: null
  };
  const pool = createAuthPool(row);
  const login = registerLogin(pool);

  const first = createMockRes();
  await login({ body: { email: row.email, password: 'bad-password' }, headers: {}, ip: '127.0.0.1' }, first);
  const second = createMockRes();
  await login({ body: { email: row.email, password: 'bad-password' }, headers: {}, ip: '127.0.0.1' }, second);
  const third = createMockRes();
  await login({ body: { email: row.email, password: 'correct-password-2026' }, headers: {}, ip: '127.0.0.1' }, third);

  assert.equal(first.statusCode, 401);
  assert.deepEqual(first.body, { error: AUTH_FAILURE_MESSAGE });
  assert.equal(second.statusCode, 401);
  assert.deepEqual(second.body, { error: AUTH_FAILURE_MESSAGE });
  assert.equal(third.statusCode, 401);
  assert.deepEqual(third.body, { error: AUTH_FAILURE_MESSAGE });
  assert.ok(row.locked_until instanceof Date);
});

test('access tokens include jti and active-session lookup rejects revoked tokens', async () => {
  const token = createAccessToken({
    jwtSecret: 'test-secret-for-token',
    jwtExpiresIn: '30m',
    userId: 42,
    email: 'user@example.com'
  });
  const payload = jwt.verify(token.token, 'test-secret-for-token');

  assert.equal(payload.jti, token.jti);
  assert.equal(hashJwtId(token.jti).length, 64);

  const activePool = {
    async query() {
      return { rows: [{ user_id: 42 }] };
    }
  };
  const revokedPool = {
    async query() {
      return { rows: [] };
    }
  };

  assert.deepEqual(await findActiveSession(activePool, token.jti), { user_id: 42 });
  assert.equal(await findActiveSession(revokedPool, token.jti), null);
});

test('profile endpoints read and update the current user', async () => {
  const row = {
    id: 9,
    email: 'user@example.com',
    password_hash: await hashPassword('correct-password-2026', 5),
    name: 'Original User',
    role: 'Admin',
    failed_login_count: 0,
    locked_until: null
  };
  const pool = createAuthPool(row);
  const app = registerAuth(pool);
  const auth = { userId: row.id, email: row.email, jti: 'current-jti' };

  const getProfile = app.handlers('/api/auth/me', 'GET')[1];
  const getRes = createMockRes();
  await getProfile({ auth }, getRes);

  assert.equal(getRes.statusCode, 200);
  assert.deepEqual(getRes.body.user, { id: row.id, email: row.email, name: 'Original User', role: 'Admin' });

  const updateProfile = app.handlers('/api/auth/me', 'PUT')[1];
  const updateRes = createMockRes();
  await updateProfile({ auth, body: { name: '  Nuevo   Nombre  ' } }, updateRes);

  assert.equal(updateRes.statusCode, 200);
  assert.equal(updateRes.body.user.name, 'Nuevo Nombre');
  assert.equal(row.name, 'Nuevo Nombre');
});

test('password change validates current password and revokes other sessions only', async () => {
  const currentJti = 'current-jti';
  const currentHash = hashJwtId(currentJti);
  const row = {
    id: 10,
    email: 'user@example.com',
    password_hash: await hashPassword('correct-password-2026', 5),
    name: 'User',
    role: 'Admin',
    failed_login_count: 0,
    locked_until: null
  };
  const pool = createAuthPool(row);
  pool.sessions.push(
    { userId: row.id, jtiHash: currentHash, revokedAt: null },
    { userId: row.id, jtiHash: 'other-session-hash', revokedAt: null }
  );

  const app = registerAuth(pool);
  const changePassword = app.handlers('/api/auth/change-password', 'POST')[1];

  const invalid = createMockRes();
  await changePassword({
    auth: { userId: row.id, email: row.email, jti: currentJti },
    body: { currentPassword: 'wrong-password', newPassword: 'new-password-2026' }
  }, invalid);

  assert.equal(invalid.statusCode, 401);
  assert.deepEqual(invalid.body, { error: AUTH_FAILURE_MESSAGE });
  assert.equal(pool.sessions[1].revokedAt, null);

  const valid = createMockRes();
  await changePassword({
    auth: { userId: row.id, email: row.email, jti: currentJti },
    body: { currentPassword: 'correct-password-2026', newPassword: 'new-password-2026' }
  }, valid);

  assert.equal(valid.statusCode, 200);
  assert.equal(valid.body.ok, true);
  assert.equal(await validatePasswordPolicy('new-password-2026', { email: row.email, minLength: 12 }).ok, true);
  assert.equal(pool.sessions[0].revokedAt, null);
  assert.ok(pool.sessions[1].revokedAt instanceof Date);
  assert.equal(await validatePasswordPolicy('user@example.com', { email: row.email }).ok, false);
});


test('forgot password creates a hashed one-use reset token and reset revokes sessions', async () => {
  const row = {
    id: 11,
    email: 'reset@example.com',
    password_hash: await hashPassword('old-password-2026', 5),
    name: 'Reset User',
    role: 'Admin',
    failed_login_count: 0,
    locked_until: null
  };
  const pool = createAuthPool(row);
  pool.sessions.push({ id: 1, userId: row.id, jtiHash: 'active-session', revokedAt: null });
  const app = registerAuth(pool);

  const forgot = app.handlers('/api/auth/forgot-password', 'POST')[0];
  const forgotRes = createMockRes();
  await forgot({ body: { email: row.email }, headers: {}, ip: '127.0.0.1' }, forgotRes);

  assert.equal(forgotRes.statusCode, 200);
  assert.equal(pool.resetTokens.length, 1);
  assert.notEqual(pool.resetTokens[0].tokenHash, forgotRes.body.resetToken);

  const reset = app.handlers('/api/auth/reset-password', 'POST')[0];
  const resetRes = createMockRes();
  await reset({ body: { token: forgotRes.body.resetToken, newPassword: 'new-reset-password-2026' } }, resetRes);

  assert.equal(resetRes.statusCode, 200);
  assert.equal(resetRes.body.ok, true);
  assert.ok(pool.resetTokens[0].usedAt instanceof Date);
  assert.ok(pool.sessions[0].revokedAt instanceof Date);
  assert.equal(await validatePasswordPolicy('new-reset-password-2026', { email: row.email, minLength: 12 }).ok, true);
});

test('session endpoints list current session and refuse revoking it directly', async () => {
  const currentJti = 'current-jti';
  const currentHash = hashJwtId(currentJti);
  const row = {
    id: 12,
    email: 'sessions@example.com',
    password_hash: await hashPassword('correct-password-2026', 5),
    name: 'Session User',
    role: 'Admin',
    failed_login_count: 0,
    locked_until: null
  };
  const pool = createAuthPool(row);
  pool.sessions.push(
    { id: 1, userId: row.id, jtiHash: currentHash, revokedAt: null, ipAddress: '127.0.0.1' },
    { id: 2, userId: row.id, jtiHash: 'other-session-hash', revokedAt: null, ipAddress: '10.0.0.2' }
  );
  const app = registerAuth(pool);
  const auth = { userId: row.id, email: row.email, jti: currentJti };

  const listSessions = app.handlers('/api/auth/sessions', 'GET')[1];
  const listRes = createMockRes();
  await listSessions({ auth }, listRes);

  assert.equal(listRes.statusCode, 200);
  assert.equal(listRes.body.sessions.length, 2);
  assert.equal(listRes.body.sessions.find((item) => item.id === 1).current, true);

  const revoke = app.handlers('/api/auth/sessions/:sessionId', 'DELETE')[1];
  const revokeCurrentRes = createMockRes();
  await revoke({ auth, params: { sessionId: '1' } }, revokeCurrentRes);
  assert.equal(pool.sessions[0].revokedAt, null);

  const revokeOtherRes = createMockRes();
  await revoke({ auth, params: { sessionId: '2' } }, revokeOtherRes);
  assert.ok(pool.sessions[1].revokedAt instanceof Date);
});
