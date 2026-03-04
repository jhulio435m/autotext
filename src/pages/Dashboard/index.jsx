import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useDocumentStore from '../../store';
import ProjectCard from '../../components/ProjectCard';
import { apiGetPlaneProjects } from '../../api/client';

function Dashboard() {
  const usePlaneProjects = import.meta.env.VITE_USE_PLANE_PROJECTS === 'true';
  const navigate = useNavigate();
  const projects = useDocumentStore((state) => state.projects);
  const setProjectsFromPlane = useDocumentStore((state) => state.setProjectsFromPlane);
  const pushToast = useDocumentStore((state) => state.pushToast);

  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!usePlaneProjects) return undefined;

    let cancelled = false;
    const loadProjects = async () => {
      try {
        const response = await apiGetPlaneProjects({ limit: 200 });
        if (!cancelled && response?.ok && Array.isArray(response.projects)) {
          setProjectsFromPlane(response.projects);
        }
      } catch (error) {
        if (!cancelled) {
          pushToast(`No se pudo leer proyectos de Plane: ${error?.message || 'error desconocido'}`, 'warning');
        }
      }
    };

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, [pushToast, setProjectsFromPlane, usePlaneProjects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((project) => project.name.toLowerCase().includes(q));
  }, [projects, query]);

  return (
  <section className='space-y-4'>
    <header className='soft-panel p-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-xl font-black text-slate-900'>Proyectos</h1>
        </div>

        <div className='flex items-center gap-2'>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Buscar'
            className='w-56 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400'
          />
        </div>
      </div>
    </header>

    {!filtered.length ? (
      <div className='soft-panel p-8 text-center'>
        <p className='text-sm text-slate-500'>No hay proyectos.</p>
      </div>
    ) : (
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {filtered.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onEdit={() => navigate(`/proyecto/${project.id}/caratula`)}
            onOpen={() => navigate(`/proyecto/${project.id}/documentos`)}
          />
        ))}
      </div>
    )}
  </section>
);
}

export default Dashboard;
