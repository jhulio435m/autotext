import test from 'node:test';
import assert from 'node:assert/strict';
import { createDataProvider } from '../server/features/data-provider.js';
import { normalizeIssueFromPlaneDb, normalizeProjectFromPlaneDb } from '../server/core/plane-mapper.js';

test('data provider prioritizes Plane API when API config is available', async () => {
  const calls = [];
  const provider = createDataProvider(
    {
      planeBaseUrl: 'https://plane.local',
      planeWorkspaceSlug: 'demo',
      planeApiKey: 'secret',
      planeProjectSchema: 'public',
      planeProjectTables: ['projects']
    },
    {
      planeApi: {
        async listProjects(options) {
          calls.push({ source: 'api', options });
          return { ok: true, source: 'plane_api', projects: [] };
        },
        async listProjectIssues(options) {
          calls.push({ source: 'api_issues', options });
          return { ok: true, source: 'plane_api', issues: [] };
        }
      },
      planeDb: {
        async listProjects() {
          throw new Error('db should not be called');
        },
        async listProjectIssues() {
          throw new Error('db should not be called');
        }
      }
    }
  );

  await provider.listProjects({ limit: 10 });
  await provider.listProjectIssues({ projectId: '1', label: 'Automatizable', limit: 5 });

  assert.deepEqual(calls, [
    { source: 'api', options: { limit: 10 } },
    { source: 'api_issues', options: { projectId: '1', label: 'Automatizable', limit: 5 } }
  ]);
});

test('data provider falls back to Plane DB and injects DB defaults', async () => {
  const calls = [];
  const provider = createDataProvider(
    {
      planeBaseUrl: '',
      planeWorkspaceSlug: '',
      planeApiKey: '',
      planeProjectSchema: 'custom_schema',
      planeProjectTables: ['project_project', 'projects']
    },
    {
      planeDb: {
        async listProjects(options) {
          calls.push({ source: 'db', options });
          return { ok: true, source: 'plane_db', projects: [] };
        },
        async listProjectIssues(options) {
          calls.push({ source: 'db_issues', options });
          return { ok: true, source: 'plane_db', issues: [] };
        }
      }
    }
  );

  await provider.listProjects({ limit: 20, workspaceId: 'ws-1' });
  await provider.listProjectIssues({ projectId: '2', label: 'Automatizable', limit: 7 });

  assert.deepEqual(calls, [
    {
      source: 'db',
      options: {
        limit: 20,
        workspaceId: 'ws-1',
        workspaceSlug: '',
        schema: 'custom_schema',
        candidateTables: ['project_project', 'projects']
      }
    },
    {
      source: 'db_issues',
      options: { projectId: '2', label: 'Automatizable', limit: 7 }
    }
  ]);
});

test('db mappers produce the same normalized contract fields as API mappers expect', () => {
  const project = normalizeProjectFromPlaneDb({
    id: 'proj-1',
    name: 'Proyecto',
    identifier: 'PRJ',
    description: 'Descripcion',
    workspace_id: 'ws-1',
    created_at: '2026-01-01',
    updated_at: '2026-01-02',
    cover_image: '/cover.png',
    cover_image_asset_id: 'asset-1'
  });

  assert.deepEqual(Object.keys(project), [
    'id',
    'name',
    'identifier',
    'description',
    'workspace_id',
    'created_at',
    'updated_at',
    'cover_image',
    'cover_image_asset_id'
  ]);

  const issue = normalizeIssueFromPlaneDb({
    id: 'issue-1',
    name: 'Issue',
    description: 'Descripcion',
    updated_at: '2026-01-02',
    created_at: '2026-01-01',
    project_id: 'proj-1',
    workspace_id: 'ws-1',
    archived_at: null,
    deleted_at: null,
    labels: ['Automatizable', 'Backend']
  });

  assert.deepEqual(Object.keys(issue), [
    'id',
    'name',
    'description',
    'updated_at',
    'created_at',
    'project_id',
    'workspace_id',
    'automatable',
    'archived_at',
    'deleted_at',
    'labels'
  ]);
  assert.equal(issue.automatable, true);
});
