import { useMemo, useState } from 'react';
import { Link, useLocation, useMatch, useNavigate, useParams } from 'react-router-dom';
import useDocumentStore from '../../store';
import Breadcrumb from '../Breadcrumb';
import SaveIndicator from '../SaveIndicator';

const modeLabel = {
  editor: 'Editor',
  formulario: 'Formulario',
  preview: 'Vista previa'
};

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const [menuOpen, setMenuOpen] = useState(false);

  const setActiveMode = useDocumentStore((state) => state.setActiveMode);
  const saveStatus = useDocumentStore((state) => state.saveStatus);
  const currentUser = useDocumentStore((state) => state.currentUser);
  const projects = useDocumentStore((state) => state.projects);
  const documents = useDocumentStore((state) => state.documents);
  const logout = useDocumentStore((state) => state.logout);

  const docMatch = useMatch('/proyecto/:id/documento/:docId/:mode');
  const isDocumentRoute = Boolean(docMatch);

  const breadcrumbItems = useMemo(() => {
    if (location.pathname === '/dashboard') return [{ label: 'Proyectos' }];

    const projectId = params.id;
    const project = projects.find((item) => item.id === projectId);

    if (docMatch) {
      const doc = (documents[projectId] || []).find((item) => item.id === params.docId);
      return [
        { label: 'Proyectos' },
        { label: project?.name || 'Proyecto' },
        { label: doc?.name || 'Documento' },
        { label: modeLabel[params.mode] || 'Editor' }
      ];
    }

    if (location.pathname.includes('/caratula')) {
      return [{ label: 'Proyectos' }, { label: project?.name || 'Proyecto' }, { label: 'Caratula' }];
    }

    if (location.pathname.includes('/documentos')) {
      return [{ label: 'Proyectos' }, { label: project?.name || 'Proyecto' }];
    }

    return [{ label: 'Proyectos' }];
  }, [docMatch, documents, location.pathname, params.docId, params.id, params.mode, projects]);

  const goMode = (mode) => {
    if (!isDocumentRoute) return;
    setActiveMode(mode === 'formulario' ? 'form' : mode);
    navigate(`/proyecto/${params.id}/documento/${params.docId}/${mode}`);
  };

  const initials = (currentUser?.name || 'U')
    .split(' ')
    .map((piece) => piece[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className='glass-panel sticky top-0 z-30 border-b border-slate-200'>
      <div className='mx-auto flex min-h-16 max-w-[1460px] flex-wrap items-center gap-3 px-4 py-2'>
        <Link to='/dashboard' className='group inline-flex items-center gap-2'>
          <span className='inline-flex h-8 w-8 items-center justify-center rounded-md bg-[var(--brand-600)] text-sm font-black text-white'>
            T
          </span>
          <span className='text-xs font-black uppercase tracking-[0.2em] text-slate-800'>TechDoc Studio</span>
        </Link>

        <div className='min-w-0 flex-1'>
          <Breadcrumb items={breadcrumbItems} />
        </div>

        {isDocumentRoute ? (
          <div className='flex max-w-full items-center gap-1 overflow-auto rounded-md border border-slate-200 bg-white p-1'>
            <button
              type='button'
              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                params.mode === 'editor'
                  ? 'border border-[var(--brand-600)] bg-[var(--brand-600)] text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              onClick={() => goMode('editor')}
            >
              Editor
            </button>
            <button
              type='button'
              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                params.mode === 'formulario'
                  ? 'border border-[var(--brand-600)] bg-[var(--brand-600)] text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              onClick={() => goMode('formulario')}
            >
              Formulario
            </button>
            <button
              type='button'
              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                params.mode === 'preview'
                  ? 'border border-[var(--brand-600)] bg-[var(--brand-600)] text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              onClick={() => goMode('preview')}
            >
              Vista previa
            </button>
          </div>
        ) : null}

        <SaveIndicator status={saveStatus} />

        <div className='relative'>
          <button
            type='button'
            aria-label='Abrir menu de usuario'
            className='inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700'
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span className='inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--brand-600)] text-[11px] font-black text-white'>{initials}</span>
            <span className='hidden lg:inline'>{currentUser?.name || 'Usuario'}</span>
          </button>

          {menuOpen ? (
            <div className='animate-pop-in absolute right-0 mt-2 w-52 rounded-md border border-slate-200 bg-white p-2 text-sm shadow-xl'>
              <p className='px-2 pb-2 text-xs text-slate-500'>Sesion: {currentUser?.role || 'Usuario'}</p>
              <button
                type='button'
                className='w-full rounded-md px-3 py-2 text-left text-slate-700 hover:bg-slate-100'
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/dashboard');
                }}
              >
                Ir a Dashboard
              </button>
              <button
                type='button'
                className='w-full rounded-md px-3 py-2 text-left text-rose-600 hover:bg-rose-50'
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                Cerrar sesion
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default Header;
