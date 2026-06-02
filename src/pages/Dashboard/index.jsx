import { useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, RefreshCcw, Search, Settings2 } from 'lucide-react';
import useDocumentStore from '../../store';
import ProjectCard from '../../components/ProjectCard';
import {
  formatIntegrationMode,
  getIntegrationAlerts,
  getIntegrationHealth,
  getProviderCards,
  getSelectableIntegrationProfiles
} from '../../utils/integrationStatus';

function Dashboard() {
  const useApiWorkspace = import.meta.env.VITE_USE_API_WORKSPACE === 'true';
  const navigate = useNavigate();
  const integration = useOutletContext();
  const projects = useDocumentStore((state) => state.projects);
  const workspaceHydrated = useDocumentStore((state) => state.workspaceHydrated);
  const pushToast = useDocumentStore((state) => state.pushToast);

  const [query, setQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((project) => {
      const haystack = [project.name, project.code, project.description].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [projects, query]);

  const hasQuery = query.trim().length > 0;
  const waitingWorkspace = useApiWorkspace && !workspaceHydrated;
  const availableProfiles = useMemo(
    () => getSelectableIntegrationProfiles(integration?.profiles || []),
    [integration?.profiles]
  );
  const effectiveSelectedProfile = selectedProfile || integration?.pendingProfile || integration?.status?.mode || 'local';
  const integrationHealth = getIntegrationHealth(integration?.status, effectiveSelectedProfile);
  const integrationAlerts = getIntegrationAlerts(integration?.status, effectiveSelectedProfile, integration?.pendingProfile);
  const providerCards = getProviderCards(integration?.status);

  const applyProfileChange = async () => {
    try {
      const response = await integration.applyProfile(effectiveSelectedProfile);
      pushToast(response?.message || 'Perfil de integración aplicado.', 'success');
    } catch (error) {
      pushToast(`No se pudo aplicar el perfil: ${error?.message || 'error desconocido'}`, 'error');
    }
  };

  return (
    <section className='space-y-4'>
      <div className='grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]'>
        <div className='rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#fff_0%,#f7fafc_45%,#ecfeff_100%)] p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
            <div className='max-w-2xl'>
              <div className='inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700'>
                <Settings2 className='h-3.5 w-3.5' />
                Integración activa
              </div>
              <h2 className='mt-3 text-xl font-semibold tracking-[-0.03em] text-slate-950'>
                {formatIntegrationMode(integration?.status?.mode || 'local')}
              </h2>
              <p className='mt-2 max-w-xl text-sm leading-6 text-slate-600'>
                Cambia el origen de datos operativo y valida de inmediato si Plane o la base remota están listos antes de trabajar.
              </p>
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              <button
                type='button'
                onClick={() => integration.refresh().catch(() => {})}
                disabled={integration?.refreshing}
                className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
              >
                <RefreshCcw className={`h-3.5 w-3.5 ${integration?.refreshing ? 'animate-spin' : ''}`} />
                Actualizar estado
              </button>
              <div
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${
                  integrationHealth.tone === 'ok'
                    ? 'bg-emerald-100 text-emerald-800'
                    : integrationHealth.tone === 'warn'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                }`}
              >
                {integrationHealth.tone === 'ok' ? (
                  <CheckCircle2 className='h-3.5 w-3.5' />
                ) : (
                  <AlertTriangle className='h-3.5 w-3.5' />
                )}
                {integrationHealth.shortLabel}
              </div>
            </div>
          </div>

          <div className='mt-5 grid gap-3 md:grid-cols-3'>
            {availableProfiles.map((profile) => {
              const selected = effectiveSelectedProfile === profile;
              return (
                <button
                  key={profile}
                  type='button'
                  onClick={() => setSelectedProfile(profile)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)]'
                      : 'border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className='flex items-center justify-between gap-3'>
                    <span className='text-sm font-semibold'>{formatIntegrationMode(profile)}</span>
                    {integration?.status?.mode === profile ? (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${selected ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        Activo
                      </span>
                    ) : null}
                  </div>
                  <p className={`mt-2 text-sm leading-5 ${selected ? 'text-slate-200' : 'text-slate-500'}`}>
                    {profile === 'local'
                      ? 'Trabaja con el workspace interno y sin depender de proveedores externos.'
                      : profile === 'plane-db'
                        ? 'Consulta Plane desde PostgreSQL usando el bridge del backend.'
                        : 'Consume Plane por API para reducir dependencia del esquema SQL.'}
                  </p>
                </button>
              );
            })}
          </div>

          <div className='mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 lg:flex-row lg:items-center lg:justify-between'>
            <div>
              <p className='text-sm font-semibold text-slate-900'>
                Perfil seleccionado: {formatIntegrationMode(effectiveSelectedProfile)}
              </p>
              <p className='mt-1 text-sm text-slate-500'>
                {integration?.pendingProfile && integration?.pendingProfile !== integration?.status?.mode
                  ? `Cambio solicitado a ${formatIntegrationMode(integration.pendingProfile)}. Reinicia web y api para terminar la conmutación.`
                  : integrationHealth.detail}
              </p>
              {integration?.lastUpdatedAt ? (
                <p className='mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400'>
                  Última verificación: {new Date(integration.lastUpdatedAt).toLocaleTimeString()}
                </p>
              ) : null}
            </div>
            <button
              type='button'
              onClick={applyProfileChange}
              disabled={integration?.applying || effectiveSelectedProfile === integration?.pendingProfile}
              className='inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300'
            >
              {integration?.applying ? 'Aplicando...' : 'Aplicar perfil'}
            </button>
          </div>

          {integration?.error ? (
            <div className='mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
              {integration.error}
            </div>
          ) : null}

          {integrationAlerts.length ? (
            <div className='mt-4 space-y-3'>
              {integrationAlerts.map((alert) => (
                <div
                  key={`${alert.title}-${alert.message}`}
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    alert.tone === 'info'
                      ? 'border-sky-200 bg-sky-50 text-sky-700'
                      : alert.tone === 'warn'
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : 'border-rose-200 bg-rose-50 text-rose-700'
                  }`}
                >
                  <p className='font-semibold'>{alert.title}</p>
                  <p className='mt-1 leading-5'>{alert.message}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <aside className='rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400'>Monitoreo</p>
              <h3 className='mt-1 text-lg font-semibold tracking-[-0.02em] text-slate-950'>Estado de conexiones</h3>
            </div>
            <div className='rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500'>
              {integration?.loading ? 'Cargando...' : 'Al cargar y cada 30 s'}
            </div>
          </div>

          <div className='mt-4 space-y-3'>
            {providerCards.map((card) => (
              <div key={card.key} className='rounded-2xl border border-slate-200 bg-slate-50/70 p-4'>
                <div className='flex items-center justify-between gap-3'>
                  <p className='text-sm font-semibold text-slate-900'>{card.label}</p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                      !card.enabled
                        ? 'bg-amber-100 text-amber-700'
                        : card.ok
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {!card.enabled ? 'Sin configurar' : card.ok ? 'Conectado' : 'Error'}
                  </span>
                </div>
                <p className='mt-2 text-sm leading-5 text-slate-500'>{card.detail}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className='flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between'>
        <div className='inline-flex h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-600'>
          {filtered.length} de {projects.length} proyectos
        </div>

        <div className='flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center'>
          {hasQuery ? (
            <button
              type='button'
              className='order-2 text-left text-xs font-semibold text-slate-500 transition hover:text-slate-900 sm:order-1'
              onClick={() => setQuery('')}
            >
              Limpiar filtro
            </button>
          ) : null}
          <label className='order-1 flex h-10 min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 sm:order-2 sm:w-[320px]'>
            <Search className='w-4 h-4 text-slate-500' />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Buscar por nombre, código o descripción'
              className='w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400'
            />
          </label>
        </div>
      </div>

      {waitingWorkspace ? (
        <div className='flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]'>
          <h2 className='text-base font-semibold text-slate-900'>Cargando proyectos...</h2>
          <p className='mt-2 max-w-md text-sm text-slate-500'>
            Esperando la sincronización inicial del workspace desde la API.
          </p>
        </div>
      ) : !filtered.length ? (
        <div className='flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]'>
          <div className='mb-4 inline-flex size-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500'>
            <Search className='w-5 h-5' />
          </div>
          <h2 className='text-base font-semibold text-slate-900'>
            {hasQuery ? 'No hay coincidencias para esta búsqueda.' : 'No hay proyectos disponibles.'}
          </h2>
          <p className='mt-2 max-w-md text-sm text-slate-500'>
            {hasQuery
              ? 'Prueba con otro nombre, código o una parte de la descripción.'
              : 'Cuando cargues proyectos, aparecerán aquí con acceso directo a documentos y datos del proyecto.'}
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'>
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={() => navigate(`/proyecto/${project.id}/datos`)}
              onOpen={() => navigate(`/proyecto/${project.id}/documentos`)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default Dashboard;
