export const INTEGRATION_PROFILE_OPTIONS = [
  {
    value: 'local',
    label: 'Local',
    description: 'Trabaja sin depender de Plane ni de la base remota.'
  },
  {
    value: 'plane-db',
    label: 'Plane DB',
    description: 'Lee proyectos e issues desde PostgreSQL en modo bridge.'
  },
  {
    value: 'plane-api',
    label: 'Plane API',
    description: 'Consulta Plane por API con workspace y API key.'
  }
];

export function formatIntegrationMode(mode) {
  const option = INTEGRATION_PROFILE_OPTIONS.find((item) => item.value === mode);
  return option?.label || String(mode || 'Sin definir');
}

export function getSelectableIntegrationProfiles(profiles = []) {
  const allowed = new Set(INTEGRATION_PROFILE_OPTIONS.map((item) => item.value));
  return profiles.filter((profile) => allowed.has(profile));
}

function getProviderForMode(status, mode) {
  const providers = status?.providers || {};
  if (mode === 'plane-db') return providers.database || null;
  if (mode === 'plane-api') return providers.planeApi || null;
  if (mode === 'local') return providers.appDatabase || null;
  return null;
}

export function getIntegrationHealth(status, mode = status?.mode) {
  if (!status) {
    return {
      tone: 'neutral',
      shortLabel: 'Sin datos',
      detail: 'No se pudo leer el estado de integración.',
      ok: false
    };
  }

  if (mode === 'local') {
    return {
      tone: 'ok',
      shortLabel: 'Local listo',
      detail: 'El modo local no depende de Plane para operar.',
      ok: true
    };
  }

  const provider = getProviderForMode(status, mode);
  if (!provider) {
    return {
      tone: 'warn',
      shortLabel: 'Modo sin soporte',
      detail: 'No hay un proveedor registrado para este modo.',
      ok: false
    };
  }

  if (provider.ok) {
    return {
      tone: 'ok',
      shortLabel: 'Conectado',
      detail: `La conexión de ${formatIntegrationMode(mode)} está activa.`,
      ok: true
    };
  }

  if (provider.enabled === false) {
    return {
      tone: 'warn',
      shortLabel: 'Configuración incompleta',
      detail: provider.reason || `Faltan credenciales para ${formatIntegrationMode(mode)}.`,
      ok: false
    };
  }

  return {
    tone: 'error',
    shortLabel: 'Error de conexión',
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
      title: `Cambio solicitado a ${formatIntegrationMode(pendingProfile)}`,
      message: 'El perfil fue escrito en los archivos de entorno. Reinicia web y api para activarlo.'
    });
  }

  if (mode === 'plane-api' && health.tone === 'warn') {
    alerts.push({
      tone: 'warn',
      title: 'Credenciales de Plane API incompletas',
      message: health.detail
    });
  } else if (mode !== 'local' && !health.ok) {
    alerts.push({
      tone: health.tone === 'warn' ? 'warn' : 'error',
      title: `Verificación pendiente para ${formatIntegrationMode(mode)}`,
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
      enabled: providers.database?.enabled !== false,
      detail: providers.database?.error || providers.database?.database || providers.database?.reason || 'Sin datos'
    },
    {
      key: 'planeApi',
      label: 'Plane API',
      ok: Boolean(providers.planeApi?.ok),
      enabled: providers.planeApi?.enabled !== false,
      detail: providers.planeApi?.error || providers.planeApi?.workspaceSlug || providers.planeApi?.reason || 'Sin datos'
    },
    {
      key: 'appDatabase',
      label: 'App DB',
      ok: Boolean(providers.appDatabase?.ok),
      enabled: providers.appDatabase?.enabled !== false,
      detail: providers.appDatabase?.error || providers.appDatabase?.database || providers.appDatabase?.reason || 'Sin datos'
    }
  ];
}
