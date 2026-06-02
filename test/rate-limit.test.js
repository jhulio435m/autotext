import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryRateLimiter } from '../server/services/rate-limit.js';

function createMockRes() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test('rate limiter allows requests until the limit and then returns 429', () => {
  const middleware = createInMemoryRateLimiter({
    maxRequests: 2,
    windowMs: 60000
  });

  const req = { ip: '127.0.0.1' };
  let nextCalls = 0;

  middleware(req, createMockRes(), () => { nextCalls += 1; });
  middleware(req, createMockRes(), () => { nextCalls += 1; });

  const limitedRes = createMockRes();
  middleware(req, limitedRes, () => { nextCalls += 1; });

  assert.equal(nextCalls, 2);
  assert.equal(limitedRes.statusCode, 429);
  assert.equal(typeof limitedRes.headers['Retry-After'], 'string');
  assert.deepEqual(limitedRes.body, {
    error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.'
  });
});
