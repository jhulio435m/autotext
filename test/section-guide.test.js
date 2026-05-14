import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSectionGuide, getBlockCompletionState, getCompletionState } from '../src/utils/section-guide.js';

test('buildSectionGuide summarizes required progress by section', () => {
  const structure = [
    {
      id: 'sec-1',
      isStructure: true,
      title: 'Resumen',
      children: [
        { id: 'var-1', isStructure: false, type: 'variable', required: true, label: 'Nombre' },
        {
          id: 'sec-2',
          isStructure: true,
          title: 'Detalle',
          children: [{ id: 'var-2', isStructure: false, type: 'variable', required: true, label: 'Ubicación' }]
        }
      ]
    }
  ];

  const guide = buildSectionGuide(structure, { 'var-1': 'Proyecto Demo' });

  assert.deepEqual(guide, [
    {
      id: 'sec-1',
      title: 'Resumen',
      depth: 0,
      prefix: [1],
      trail: ['Resumen'],
      required: 2,
      completed: 1,
      pending: 1
    },
    {
      id: 'sec-2',
      title: 'Detalle',
      depth: 1,
      prefix: [1, 2],
      trail: ['Resumen', 'Detalle'],
      required: 1,
      completed: 0,
      pending: 1
    }
  ]);
});

test('completion helpers classify section and block states consistently', () => {
  assert.deepEqual(getCompletionState({ required: 0, completed: 0 }), {
    tone: 'neutral',
    label: 'Sin obligatorios'
  });
  assert.deepEqual(getCompletionState({ required: 3, completed: 3 }), {
    tone: 'complete',
    label: 'Completo'
  });
  assert.deepEqual(getCompletionState({ required: 3, completed: 1 }), {
    tone: 'progress',
    label: 'En progreso'
  });
  assert.deepEqual(getCompletionState({ required: 2, completed: 0 }), {
    tone: 'pending',
    label: 'Pendiente'
  });

  assert.deepEqual(getBlockCompletionState({ required: false }, ''), {
    tone: 'neutral',
    label: 'Opcional'
  });
  assert.deepEqual(getBlockCompletionState({ required: true, type: 'variable' }, ''), {
    tone: 'pending',
    label: 'Obligatorio'
  });
  assert.deepEqual(getBlockCompletionState({ required: true, type: 'variable' }, 'ok'), {
    tone: 'complete',
    label: 'Completo'
  });
});
