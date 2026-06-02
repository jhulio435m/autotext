import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWorkspace } from '../server/routes/app-helpers.js';

test('parseWorkspace normalizes projects, cover config, and document summaries', () => {
  const workspace = parseWorkspace({
    projects: [
      {
        id: 'proj_1',
        name: 'Proyecto 1',
        accent_color: '#123456'
      }
    ],
    documents: {
      proj_1: [
        {
          id: 'doc_1',
          name: 'Doc 1',
          description: 'Resumen',
          contentLoaded: false
        }
      ]
    },
    coverConfig: {
      proj_1: {
        companyName: 'ACME',
        projectData: { foo: 'bar' },
        projectVariables: [{ key: 'foo', label: 'Foo', type: 'text', value: 'bar' }]
      }
    }
  });

  assert.equal(workspace.projects[0].accentColor, '#123456');
  assert.equal(workspace.documents.proj_1[0].contentLoaded, false);
  assert.deepEqual(workspace.documents.proj_1[0].structure, []);
  assert.deepEqual(workspace.coverConfig.proj_1.projectData, { foo: 'bar' });
  assert.equal(workspace.coverConfig.proj_1.projectVariables[0].key, 'foo');
});

test('parseWorkspace rejects invalid root payloads', () => {
  assert.equal(parseWorkspace(null), null);
  assert.equal(parseWorkspace([]), null);
});
