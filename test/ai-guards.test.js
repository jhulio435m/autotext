import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAiGuardConfig,
  normalizeContext,
  validateBlocks,
  validatePrompt
} from '../server/services/ai-guards.js';

test('getAiGuardConfig clamps and normalizes config values', () => {
  assert.deepEqual(
    getAiGuardConfig({
      aiMaxPromptChars: 90000,
      aiMaxContextEntries: -1,
      aiMaxContextValueChars: 10,
      aiMaxBlocksPerRequest: 0
    }),
    {
      maxPromptChars: 20000,
      maxContextEntries: 1,
      maxContextValueChars: 20,
      maxBlocksPerRequest: 1
    }
  );
});

test('normalizeContext drops invalid entries and truncates values', () => {
  const normalized = normalizeContext(
    {
      keep: 'valor',
      blank: '',
      long: 'abcdefghij',
      nullish: null
    },
    {
      maxContextEntries: 3,
      maxContextValueChars: 4
    }
  );

  assert.deepEqual(normalized, {
    keep: 'valo',
    long: 'abcd'
  });
});

test('validatePrompt enforces required and maximum length', () => {
  assert.deepEqual(validatePrompt('', { maxPromptChars: 5 }), {
    ok: false,
    error: 'El campo "prompt" es requerido.'
  });
  assert.deepEqual(validatePrompt('abcdef', { maxPromptChars: 5 }), {
    ok: false,
    error: 'El prompt excede el máximo permitido de 5 caracteres.'
  });
  assert.deepEqual(validatePrompt('  hola  ', { maxPromptChars: 10 }), {
    ok: true,
    prompt: 'hola'
  });
});

test('validateBlocks enforces presence and upper bound', () => {
  assert.deepEqual(validateBlocks([], { maxBlocksPerRequest: 2 }), {
    ok: false,
    error: 'Se requiere un arreglo "blocks" no vacío.'
  });
  assert.deepEqual(validateBlocks([1, 2, 3], { maxBlocksPerRequest: 2 }), {
    ok: false,
    error: 'Se excedió el máximo de 2 bloques por solicitud.'
  });
  assert.deepEqual(validateBlocks([1], { maxBlocksPerRequest: 2 }), { ok: true });
});
