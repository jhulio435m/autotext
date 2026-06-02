import test from 'node:test';
import assert from 'node:assert/strict';
import { detectIntegrationMode, getAvailableProfiles } from '../server/services/integration-profile.js';

test('getAvailableProfiles returns supported profile list', () => {
  assert.deepEqual(getAvailableProfiles(), ['local', 'plane-db', 'plane-api']);
});

test('detectIntegrationMode prioritizes plane api over other providers', () => {
  const mode = detectIntegrationMode({
    planeBaseUrl: 'https://plane.local',
    planeWorkspaceSlug: 'demo',
    planeApiKey: 'secret',
    planeDb: { database: 'plane' },
    frappeBaseUrl: 'https://frappe.local'
  });

  assert.equal(mode, 'plane_api');
});

test('detectIntegrationMode falls back from plane api to plane db to local', () => {
  assert.equal(
    detectIntegrationMode({
      planeBaseUrl: '',
      planeWorkspaceSlug: '',
      planeApiKey: '',
      planeDb: { database: 'plane' }
    }),
    'plane_db'
  );

  assert.equal(
    detectIntegrationMode({
      planeBaseUrl: '',
      planeWorkspaceSlug: '',
      planeApiKey: '',
      planeDb: { database: 'autotext' }
    }),
    'local'
  );
});
