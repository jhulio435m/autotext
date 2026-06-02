import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampLimit,
  isDbConnectivityError,
  isSafeIdentifier,
  isTimeoutError,
  isUuid,
  parseBooleanQuery,
  quoteIdentifier
} from '../server/services/request-utils.js';

test('clampLimit bounds and fallback', () => {
  assert.equal(clampLimit(undefined, 25), 25);
  assert.equal(clampLimit('5', 25), 5);
  assert.equal(clampLimit('5000', 25), 1000);
  assert.equal(clampLimit('-3', 25), 1);
});

test('parseBooleanQuery parses common truthy values', () => {
  assert.equal(parseBooleanQuery('true'), true);
  assert.equal(parseBooleanQuery('YES'), true);
  assert.equal(parseBooleanQuery('0'), false);
  assert.equal(parseBooleanQuery(undefined), false);
});

test('identifier helpers accept only safe SQL identifiers', () => {
  assert.equal(isSafeIdentifier('public_table_01'), true);
  assert.equal(isSafeIdentifier('bad-name'), false);
  assert.equal(quoteIdentifier('issues'), '"issues"');
  assert.throws(() => quoteIdentifier('issues;drop table'), /Invalid SQL identifier/);
});

test('uuid and db connectivity helpers classify values correctly', () => {
  assert.equal(isUuid('8ba84ecc-7c30-48ac-b7d6-9801f47b830a'), true);
  assert.equal(isUuid('not-a-uuid'), false);
  assert.equal(isDbConnectivityError({ code: 'ECONNREFUSED' }), true);
  assert.equal(isDbConnectivityError({ code: '23505' }), false);
});


test('timeout helper classifies abort-like failures', () => {
  assert.equal(isTimeoutError({ code: 'ETIMEDOUT' }), true);
  assert.equal(isTimeoutError({ name: 'AbortError' }), true);
  assert.equal(isTimeoutError({ message: 'Request timed out after 10s' }), true);
  assert.equal(isTimeoutError({ code: 'ECONNREFUSED' }), false);
});
