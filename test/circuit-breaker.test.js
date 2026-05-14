import test from 'node:test';
import assert from 'node:assert/strict';
import { CircuitBreaker } from '../server/infrastructure/circuit-breaker.js';

test('circuit breaker starts closed', () => {
  const cb = new CircuitBreaker();
  assert.equal(cb.state, 'closed');
  assert.equal(cb.failureCount, 0);
});

test('circuit breaker opens after threshold failures', async () => {
  const cb = new CircuitBreaker({ failureThreshold: 2 });
  const fn = async () => { throw new Error('fail'); };
  await assert.rejects(() => cb.call(fn));
  await assert.rejects(() => cb.call(fn));
  assert.equal(cb.state, 'open');
});

test('circuit breaker rejects immediately when open', async () => {
  const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 5000 });
  const fn = async () => { throw new Error('fail'); };
  await assert.rejects(() => cb.call(fn));
  await assert.rejects(async () => {
    await cb.call(async () => 'should not reach');
  }, /Circuit breaker is OPEN/);
});

test('circuit breaker resets after success', async () => {
  const cb = new CircuitBreaker({ failureThreshold: 2 });
  const failFn = async () => { throw new Error('fail'); };
  await assert.rejects(() => cb.call(failFn));
  await cb.call(async () => 'ok');
  assert.equal(cb.state, 'closed');
  assert.equal(cb.failureCount, 0);
});

test('circuit breaker transitions half-open after timeout', async () => {
  const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 10 });
  const failFn = async () => { throw new Error('fail'); };
  await assert.rejects(() => cb.call(failFn));
  assert.equal(cb.state, 'open');
  await new Promise((r) => setTimeout(r, 20));
  const result = await cb.call(async () => 'recovered');
  assert.equal(result, 'recovered');
  assert.equal(cb.state, 'closed');
});

test('circuit breaker returns state info', () => {
  const cb = new CircuitBreaker({ failureThreshold: 5 });
  const info = cb.getState();
  assert.equal(info.state, 'closed');
  assert.equal(info.failureCount, 0);
  assert.equal(info.failureThreshold, 5);
});
