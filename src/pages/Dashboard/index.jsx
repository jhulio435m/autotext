import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import useDocumentStore from '../../store';
import ProjectCard from '../../components/ProjectCard';
import { apiGetPlaneProjects } from '../../api/client';

function Dashboard() {
  const usePlaneProjects = import.meta.env.VITE_USE_PLANE_PROJECTS === 'true';
  const useApiWorkspace = import.meta.env.VITE_USE_API_WORKSPACE === 'true';
  const navigate = useNavigate();
  const projects = useDocumentStore((state) => state.projects);
  const workspaceHydrated = useDocumentStore((state) => state.workspaceHydrated);
  const setProjectsFromPlane = useDocumentStore((state) => state.setProjectsFromPlane);
  const pushToast = useDocumentStore((state) => state.pushToast);

  const [query, setQuery] = useState('');

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

  return (
    <section className='space-y-4'>
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
