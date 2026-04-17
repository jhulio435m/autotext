import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTemplateRow,
  parseDocumentPayload,
  parseTemplatePayload,
  parseWorkspace
} from '../server/routes/app-helpers.js';

test('parseWorkspace only accepts plain objects', () => {
  assert.equal(parseWorkspace(null), null);
  assert.equal(parseWorkspace([]), null);
  assert.deepEqual(parseWorkspace({ projects: [] }), { projects: [], documents: {}, coverConfig: {} });
});

test('parseDocumentPayload validates required identifiers and normalizes objects', () => {
  assert.equal(parseDocumentPayload({}), null);

  assert.deepEqual(parseDocumentPayload({ projectId: 'p1', documentId: 'd1' }), {
    projectId: 'p1',
    documentId: 'd1',
    documentName: '',
    structure: [],
    formData: {},
    coverData: {}
  });
});

test('template helpers validate payload and normalize db rows', () => {
  assert.equal(parseTemplatePayload({ slug: '', name: 'x', data: [] }), null);

  assert.deepEqual(
    parseTemplatePayload({ slug: 'tpl-a', name: 'Plantilla A', description: 'Base', data: [] }),
    {
      slug: 'tpl-a',
      name: 'Plantilla A',
      description: 'Base',
      data: []
    }
  );

  assert.deepEqual(
    normalizeTemplateRow({
      id: '7',
      slug: 'tpl-a',
      name: 'Plantilla A',
      description: null,
      data: [],
      is_system: 1,
      updated_at: '2026-03-14T00:00:00Z'
    }),
    {
      id: 7,
      slug: 'tpl-a',
      name: 'Plantilla A',
      description: '',
      data: [],
      isSystem: true,
      updatedAt: '2026-03-14T00:00:00Z'
    }
  );
});
