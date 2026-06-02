import test from 'node:test';
import assert from 'node:assert/strict';
import { logger } from '../server/infrastructure/logger.js';

test('logger.info produces valid JSON', () => {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    logger.info('test-source', 'test message', { key: 'value' });
    assert.equal(logs.length, 1);
    const parsed = JSON.parse(logs[0]);
    assert.equal(parsed.level, 'info');
    assert.equal(parsed.source, 'test-source');
    assert.equal(parsed.message, 'test message');
    assert.equal(parsed.key, 'value');
    assert.ok(parsed.timestamp);
  } finally {
    console.log = originalLog;
  }
});

test('logger.warn produces valid JSON', () => {
  const logs = [];
  const originalWarn = console.warn;
  console.warn = (...args) => logs.push(args.join(' '));
  try {
    logger.warn('warn-source', 'warning', { code: 123 });
    const parsed = JSON.parse(logs[0]);
    assert.equal(parsed.level, 'warn');
    assert.equal(parsed.message, 'warning');
    assert.equal(parsed.code, 123);
  } finally {
    console.warn = originalWarn;
  }
});

test('logger.error produces valid JSON', () => {
  const logs = [];
  const originalError = console.error;
  console.error = (...args) => logs.push(args.join(' '));
  try {
    logger.error('err-source', 'error msg', { stack: 'line 1' });
    const parsed = JSON.parse(logs[0]);
    assert.equal(parsed.level, 'error');
    assert.equal(parsed.source, 'err-source');
    assert.equal(parsed.stack, 'line 1');
  } finally {
    console.error = originalError;
  }
});
