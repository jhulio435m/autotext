import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAuthRoutes } from '../server/routes/auth.js';
import { hashJwtId, hashPassword, validatePasswordPolicy } from '../server/services/auth-security.js';

function createMockDep(overrides = {}) {
  const mockRows = [];
  const mockPool = {
    query: async (sql, params) => {
      mockPool.lastSql = sql;
      mockPool.lastParams = params;
      if (sql.trim().startsWith('INSERT INTO app_users')) {
        const row = { id: 2, email: params[0], name: params[2], role: 'Usuario' };
        mockRows.push(row);
        return { rows: [row] };
      }
      if (sql.trim().startsWith('INSERT INTO app_user_sessions')) {
        return { rows: [] };
      }
      if (sql.trim().startsWith('SELECT id FROM app_users')) {
        const found = mockRows.find((r) => r.email === params[0]);
        return { rows: found ? [found] : [] };
      }
      return { rows: [] };
    }
  };

  return {
    appPool: mockPool,
    config: {
      authPasswordMinLength: 12,
      authBcryptCost: 12,
      authSessionCookieEnabled: false
    },
    createToken: (userId, email) => ({
      token: 'mock.jwt.token',
      jti: 'mock-jti',
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    }),
    normalizeUserRow: (row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role
    }),
    authRequired: (req, res, next) => {
      req.auth = { userId: 1, email: 'admin@test.com', role: 'Senior', jti: 'admin-jti' };
      next();
    },
    checkDbConnection: async () => {},
    ...overrides
  };
}

function createReqRes() {
  const req = { body: {}, headers: {} };
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return { req, res };
}

test('auth register - rejects missing fields', async () => {
  const routes = new Map();
  const app = {
    post: (path, ...handlers) => routes.set(`POST ${path}`, handlers),
    get: () => {},
    put: () => {},
    delete: () => {}
  };
  registerAuthRoutes(app, createMockDep());

  const { req, res } = createReqRes();
  req.body = { email: '', password: '', name: '' };
  const handlers = routes.get('POST /api/auth/register');
  await handlers[0](req, res);
  assert.equal(res.statusCode, 400);
  assert.ok(res.body.error.includes('obligatorios'));
});

test('auth register - rejects duplicate email', async () => {
  const routes = new Map();
  const app = {
    post: (path, ...handlers) => routes.set(`POST ${path}`, handlers),
    get: () => {},
    put: () => {},
    delete: () => {}
  };
  const dep = createMockDep();
  // Seed existing user
  dep.appPool.rows = [{ id: 1, email: 'existing@test.com', name: 'Existing', role: 'Usuario' }];
  dep.appPool.query = async (sql, params) => {
    dep.appPool.lastSql = sql;
    dep.appPool.lastParams = params;
    if (sql.trim().startsWith('SELECT id FROM app_users')) {
      const list = dep.appPool.rows || [];
      const found = list.find((r) => r.email === params[0]);
      return { rows: found ? [found] : [] };
    }
    if (sql.trim().startsWith('INSERT INTO app_user_sessions')) {
      return { rows: [] };
    }
    return { rows: [] };
  };
  registerAuthRoutes(app, dep);

  const { req, res } = createReqRes();
  req.body = { email: 'existing@test.com', password: 'super-secure-password-2024', name: 'Test User' };
  const handlers = routes.get('POST /api/auth/register');
  await handlers[0](req, res);
  assert.equal(res.statusCode, 409);
  assert.ok(res.body.error.includes('registrado'));
});

test('auth register - rejects weak password', async () => {
  const routes = new Map();
  const app = {
    post: (path, ...handlers) => routes.set(`POST ${path}`, handlers),
    get: () => {},
    put: () => {},
    delete: () => {}
  };
  const dep = createMockDep();
  dep.appPool.query = async (sql, params) => {
    dep.appPool.lastSql = sql;
    dep.appPool.lastParams = params;
    if (sql.trim().startsWith('SELECT id FROM app_users')) {
      return { rows: [] };
    }
    if (sql.trim().startsWith('INSERT INTO app_user_sessions')) {
      return { rows: [] };
    }
    return { rows: [] };
  };
  registerAuthRoutes(app, dep);

  const { req, res } = createReqRes();
  req.body = { email: 'new@test.com', password: '123', name: 'Test User' };
  const handlers = routes.get('POST /api/auth/register');
  await handlers[0](req, res);
  assert.equal(res.statusCode, 400);
  assert.ok(res.body.errors?.length > 0);
});

test('auth register - creates user successfully', async () => {
  const routes = new Map();
  const app = {
    post: (path, ...handlers) => routes.set(`POST ${path}`, handlers),
    get: () => {},
    put: () => {},
    delete: () => {}
  };
  const dep = createMockDep();
  dep.appPool.query = async (sql, params) => {
    dep.appPool.lastSql = sql;
    dep.appPool.lastParams = params;
    if (sql.trim().startsWith('SELECT id FROM app_users')) {
      return { rows: [] };
    }
    if (sql.trim().startsWith('INSERT INTO app_users')) {
      return { rows: [{ id: 3, email: params[0], name: params[2], role: 'Usuario' }] };
    }
    if (sql.trim().startsWith('INSERT INTO app_user_sessions')) {
      return { rows: [] };
    }
    return { rows: [] };
  };
  registerAuthRoutes(app, dep);

  const { req, res } = createReqRes();
  req.body = { email: 'newuser@test.com', password: 'correct-horse-battery-staple-2024', name: 'New User' };
  const handlers = routes.get('POST /api/auth/register');
  await handlers[0](req, res);
  assert.equal(res.statusCode, 201);
  assert.ok(res.body.token);
  assert.equal(res.body.user.email, 'newuser@test.com');
  assert.equal(res.body.user.name, 'New User');
  assert.equal(res.body.user.role, 'Usuario');
});
