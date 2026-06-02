export const INTEGRATION_PROFILE_OPTIONS = [
  {
    value: 'local',
    label: 'Local',
    description: 'Trabaja con el almacenamiento interno de documentos y configuraciones.'
  },
  {
    value: 'plane-db',
    label: 'Plane DB',
    description: 'Conecta directamente con la base de datos de Plane para leer proyectos.'
  },
  {
    value: 'plane-api',
    label: 'Plane API',
    description: 'Conecta con Plane mediante la API oficial configurada.'
  }
];

export function formatIntegrationMode(mode) {
  if (mode === 'plane_db' || mode === 'plane-db') return 'Plane DB';
  if (mode === 'plane-api') return 'Plane API';
  if (mode === 'local') return 'Local';
  const option = INTEGRATION_PROFILE_OPTIONS.find((item) => item.value === mode);
  return option?.label || String(mode || 'Sin definir');
}

export function getSelectableIntegrationProfiles(profiles = []) {
  const allowed = new Set(['local', 'plane-db', 'plane-api']);
  return profiles.filter((profile) => allowed.has(profile));
}

function getProviderForMode(status, mode) {
  const providers = status?.providers || {};
  if (mode === 'plane_db' || mode === 'plane-db') return providers.database || null;
  if (mode === 'plane-api') return providers.planeApi || null;
  if (mode === 'local') return providers.appDatabase || null;
  return null;
}

export function getIntegrationHealth(status, mode = status?.mode) {
  if (!status) {
    return { tone: 'neutral', shortLabel: 'Cargando...', detail: 'Obteniendo estado...', ok: false };
  }

  const provider = getProviderForMode(status, mode);
  if (!provider) {
    return { tone: 'ok', shortLabel: 'Activo', detail: 'Modo operativo.', ok: true };
  }

  if (provider.ok) {
    return { tone: 'ok', shortLabel: 'Conectado', detail: `La conexión de ${formatIntegrationMode(mode)} está activa.`, ok: true };
  }

  return {
    tone: 'error',
    shortLabel: 'Error',
    detail: provider.error || `No se pudo validar ${formatIntegrationMode(mode)}.`,
    ok: false
  };
}

export function getIntegrationAlerts(status, selectedMode, pendingProfile = null) {
  const alerts = [];
  const mode = selectedMode || status?.mode || 'local';
  const health = getIntegrationHealth(status, mode);

  if (pendingProfile && pendingProfile !== status?.mode) {
    alerts.push({
      tone: 'info',
      title: 'Reinicio requerido',
      message: `Se ha solicitado el cambio a ${formatIntegrationMode(pendingProfile)}. Reinicia web y api para aplicar.`
    });
  }

  const planeApi = status?.providers?.planeApi;
  if (mode === 'plane-api' && planeApi && !planeApi.enabled) {
    alerts.push({
      tone: 'warn',
      title: 'Credenciales Plane API incompletas',
      message: planeApi.reason || planeApi.error || 'Faltan credenciales para Plane API.'
    });
    return alerts;
  }

  if (!health.ok && mode !== 'local') {
    alerts.push({
      tone: 'error',
      title: 'Error de conexión',
      message: health.detail
    });
  }

  return alerts;
}

export function getProviderCards(status) {
  const providers = status?.providers || {};
  return [
    {
      key: 'database',
      label: 'Plane DB',
      ok: Boolean(providers.database?.ok),
      enabled: true,
      detail: providers.database?.database || providers.database?.error || (providers.database?.ok ? 'Conexión SQL exitosa' : 'Error de conexión')
    },
    {
      key: 'planeApi',
      label: 'Plane API',
      ok: Boolean(providers.planeApi?.ok),
      enabled: providers.planeApi?.enabled !== false,
      detail: providers.planeApi?.workspaceSlug || providers.planeApi?.reason || providers.planeApi?.error || (providers.planeApi?.ok ? 'Activa' : 'No configurada')
    },
    {
      key: 'appDatabase',
      label: 'App DB',
      ok: Boolean(providers.appDatabase?.ok),
      enabled: true,
      detail: providers.appDatabase?.database || providers.appDatabase?.error || (providers.appDatabase?.ok ? 'Base de datos interna lista' : 'Error de base de datos')
    }
  ];
}
