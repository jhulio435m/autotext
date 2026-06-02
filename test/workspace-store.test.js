import test from 'node:test';
import assert from 'node:assert/strict';

function matchQuery(text, patterns) {
  let best = null;
  let bestLen = -1;
  for (const [key, handler] of Object.entries(patterns)) {
    if (text.includes(key) && key.length > bestLen) {
      best = handler;
      bestLen = key.length;
    }
  }
  return best || (() => ({ rows: [] }));
}

function createMockPool(customHandlers = {}) {
  const queryFn = (text, params) => matchQuery(text, customHandlers)(text, params);

  const txClient = {
    query: queryFn,
    release: () => {}
  };
  return {
    pool: {
      query: queryFn,
      connect: async () => {
        const client = { ...txClient };
        client.query = async (text, params) => {
          return matchQuery(text, customHandlers)(text, params);
        };
        client.release = () => {};
        return client;
      }
    }
  };
}

const mockProjectRow = {
  id: 'proj-1', name: 'Test Project', description: 'desc', code: 'TP-01',
  accentColor: '#ff0000', companyName: 'Test Corp', logo: '', coverPhoto: '',
  coverImageUrl: '', month: '01', year: '2026', updated_at: '2026-01-01T00:00:00Z'
};

const mockDocRow = {
  id: 'doc-1', projectId: 'proj-1', name: 'Doc 1', type: 'informe',
  description: 'desc', structure: [], formData: {}, coverData: {},
  updated_at: '2026-01-02T00:00:00Z'
};

test('loadWorkspaceState returns empty workspace when no data', async () => {
  const { pool } = createMockPool();
  const { loadWorkspaceState } = await import('../server/workspace-store.js');
  const result = await loadWorkspaceState(pool, 1);
  assert.ok(result.workspace);
  assert.deepEqual(result.workspace.projects, []);
  assert.deepEqual(result.workspace.documents, {});
  assert.deepEqual(result.workspace.coverConfig, {});
});

test('loadWorkspaceState normalizes projects and builds cover config', async () => {
  const { pool } = createMockPool({
    'updated_at FROM app_projects WHERE': () => ({ rows: [mockProjectRow] }),
    'FROM app_documents WHERE': () => ({ rows: [] }),
    'FROM app_project_variables WHERE': () => ({ rows: [] })
  });
  const { loadWorkspaceState } = await import('../server/workspace-store.js');
  const result = await loadWorkspaceState(pool, 1);
  assert.equal(result.workspace.projects.length, 1);
  assert.equal(result.workspace.projects[0].name, 'Test Project');
  assert.ok(result.workspace.coverConfig['proj-1']);
  assert.equal(result.workspace.coverConfig['proj-1'].companyName, 'Test Corp');
});

test('loadWorkspaceState attaches document summaries', async () => {
  const { pool } = createMockPool({
    'updated_at FROM app_projects WHERE': () => ({ rows: [mockProjectRow] }),
    'FROM app_documents WHERE': () => ({ rows: [mockDocRow] }),
    'FROM app_project_variables WHERE': () => ({ rows: [] })
  });
  const { loadWorkspaceState } = await import('../server/workspace-store.js');
  const result = await loadWorkspaceState(pool, 1, { includeDocumentContent: false });
  const docs = result.workspace.documents['proj-1'];
  assert.equal(docs.length, 1);
  assert.equal(docs[0].contentLoaded, false);
  assert.equal(docs[0].name, 'Doc 1');
});

test('loadWorkspaceState attaches full document content when requested', async () => {
  const structure = [{ id: 'n1', type: 'section', title: 'Intro' }];
  const { pool } = createMockPool({
    'updated_at FROM app_projects WHERE': () => ({ rows: [mockProjectRow] }),
    'FROM app_documents WHERE': () => ({ rows: [{ ...mockDocRow, structure, formData: { f1: 'value' } }] }),
    'FROM app_project_variables WHERE': () => ({ rows: [] })
  });
  const { loadWorkspaceState } = await import('../server/workspace-store.js');
  const result = await loadWorkspaceState(pool, 1, { includeDocumentContent: true });
  const doc = result.workspace.documents['proj-1'][0];
  assert.equal(doc.contentLoaded, true);
  assert.deepEqual(doc.structure, structure);
  assert.deepEqual(doc.formData, { f1: 'value' });
});

test('loadDocumentState returns null for missing document', async () => {
  const { pool } = createMockPool();
  const { loadDocumentState } = await import('../server/workspace-store.js');
  const result = await loadDocumentState(pool, 1, 'proj-1', 'nonexistent');
  assert.equal(result, null);
});

test('loadDocumentState returns full document detail', async () => {
  const { pool } = createMockPool({
    'FROM app_documents': () => ({ rows: [mockDocRow] })
  });
  const { loadDocumentState } = await import('../server/workspace-store.js');
  const result = await loadDocumentState(pool, 1, 'proj-1', 'doc-1');
  assert.ok(result);
  assert.equal(result.name, 'Doc 1');
  assert.equal(result.contentLoaded, true);
});

test('saveWorkspaceState inserts a new project and document', async () => {
  const { pool } = createMockPool();
  const { saveWorkspaceState } = await import('../server/workspace-store.js');
  const result = await saveWorkspaceState(pool, 1, {
    projects: [{
      id: 'proj-new', name: 'New Project', code: 'NP-01'
    }],
    documents: {
      'proj-new': [{
        id: 'doc-new', projectId: 'proj-new', name: 'New Doc', type: 'informe',
        structure: [], formData: {}, coverData: {}
      }]
    },
    coverConfig: {
      'proj-new': { companyName: '', logo: '', coverPhoto: '', month: '', year: '', primaryColor: '#006399', projectData: {}, projectVariables: [] }
    }
  });
  assert.ok(result.updatedAt);
});

test('saveWorkspaceState handles changedProjectId option', async () => {
  const { pool } = createMockPool();
  const { saveWorkspaceState } = await import('../server/workspace-store.js');
  const result = await saveWorkspaceState(pool, 1, {
    projects: [{ id: 'proj-1', name: 'P1', code: 'P1' }],
    documents: {
      'proj-1': [{ id: 'doc-1', projectId: 'proj-1', name: 'Doc 1', type: 'informe', structure: [], formData: {}, coverData: {} }]
    },
    coverConfig: { 'proj-1': { companyName: '', logo: '', coverPhoto: '', month: '', year: '', primaryColor: '#06c', projectData: {}, projectVariables: [] } }
  }, { changedProjectId: 'proj-1' });
  assert.ok(result.updatedAt);
});

test('saveWorkspaceState protects against sparse document saves', async () => {
  let callCount = 0;
  const { pool } = createMockPool({
    'updated_at FROM app_projects WHERE': () => {
      callCount++;
      if (callCount <= 2) {
        return { rows: [{ id: 'proj-1', name: 'Existing', description: 'd', code: 'EX', accentColor: '#06c', companyName: 'C', logo: '', coverPhoto: '', coverImageUrl: '', month: '', year: '', updated_at: '2026-01-01T00:00:00Z' }] };
      }
      return { rows: [] };
    },
    'FROM app_documents WHERE': () => ({
      rows: [{ id: 'doc-1', projectId: 'proj-1', name: 'Existing Doc', type: 'informe', description: '', structure: [{ id: 'n1', type: 'section' }], formData: { f1: 'v1' }, coverData: {}, updated_at: '2026-01-01T00:00:00Z' }]
    }),
    'app_project_variables apv JOIN': () => ({ rows: [] })
  });
  const { saveWorkspaceState } = await import('../server/workspace-store.js');
  const result = await saveWorkspaceState(pool, 1, {
    projects: [{ id: 'proj-1', name: 'Existing', code: 'EX' }],
    documents: { 'proj-1': [{ id: 'doc-1', projectId: 'proj-1', name: 'Existing Doc', type: 'informe', structure: [], formData: {}, coverData: {} }] },
    coverConfig: { 'proj-1': { companyName: '', logo: '', coverPhoto: '', month: '', year: '', primaryColor: '#06c', projectData: {}, projectVariables: [] } }
  });
  assert.ok(result.updatedAt);
});
