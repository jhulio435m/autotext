import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatIntegrationMode,
  getIntegrationAlerts,
  getIntegrationHealth,
  getProviderCards,
  getSelectableIntegrationProfiles
} from '../src/utils/integrationStatus.js';

test('formatIntegrationMode returns readable labels for supported modes', () => {
  assert.equal(formatIntegrationMode('local'), 'Local');
  assert.equal(formatIntegrationMode('plane-db'), 'Plane DB');
  assert.equal(formatIntegrationMode('plane-api'), 'Plane API');
});

test('getSelectableIntegrationProfiles keeps only the UI-supported profiles', () => {
  assert.deepEqual(
    getSelectableIntegrationProfiles(['local', 'plane-db', 'plane-api', 'frappe']),
    ['local', 'plane-db', 'plane-api']
  );
});

test('getIntegrationHealth derives status from the active provider', () => {
  const status = {
    mode: 'plane-api',
    providers: {
      planeApi: { enabled: true, ok: true, workspaceSlug: 'demo' }
    }
  };

  assert.deepEqual(getIntegrationHealth(status), {
    tone: 'ok',
    shortLabel: 'Conectado',
    detail: 'La conexión de Plane API está activa.',
    ok: true
  });
});

test('getIntegrationAlerts reports pending restart and missing Plane API credentials', () => {
  const status = {
    mode: 'local',
    providers: {
      planeApi: { enabled: false, ok: false, reason: 'PLANE_WORKSPACE_SLUG o PLANE_API_KEY faltante' }
    }
  };

  const alerts = getIntegrationAlerts(status, 'plane-api', 'plane-api');

  assert.equal(alerts.length, 2);
  assert.equal(alerts[0].tone, 'info');
  assert.match(alerts[0].message, /Reinicia web y api/);
  assert.equal(alerts[1].tone, 'warn');
  assert.match(alerts[1].message, /PLANE_WORKSPACE_SLUG o PLANE_API_KEY faltante/);
});

test('getProviderCards summarizes provider state for the dashboard monitor', () => {
  const cards = getProviderCards({
    providers: {
      database: { ok: true, database: 'plane' },
      planeApi: { ok: false, enabled: false, reason: 'missing' },
      appDatabase: { ok: false, enabled: true, error: 'offline' }
    }
  });

  assert.deepEqual(cards, [
    { key: 'database', label: 'Plane DB', ok: true, enabled: true, detail: 'plane' },
    { key: 'planeApi', label: 'Plane API', ok: false, enabled: false, detail: 'missing' },
    { key: 'appDatabase', label: 'App DB', ok: false, enabled: true, detail: 'offline' }
  ]);
});
