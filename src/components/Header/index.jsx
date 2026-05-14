import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useMatch, useNavigate, useParams } from 'react-router-dom';
import { LayoutDashboard, FileEdit, FileText, LogOut, FolderOpen } from 'lucide-react';
import useDocumentStore from '../../store';
import Breadcrumb from '../ui/Breadcrumb';
import SaveIndicator from '../ui/SaveIndicator';
import { formatIntegrationMode, getIntegrationHealth } from '../../utils/integrationStatus';

const modeLabel = {
  constructor: 'Constructor',
  editor: 'Avanzado',
  datos: 'Datos',
  preview: 'Vista previa'
};

function Header({ integration }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const setActiveMode = useDocumentStore((state) => state.setActiveMode);
  const saveStatus = useDocumentStore((state) => state.saveStatus);
  const currentUser = useDocumentStore((state) => state.currentUser);
  const projects = useDocumentStore((state) => state.projects);
  const documents = useDocumentStore((state) => state.documents);
  const logout = useDocumentStore((state) => state.logout);

  const docMatch = useMatch('/proyecto/:id/documento/:docId/:mode');
  const previewMatch = useMatch('/proyecto/:id/documento/:docId/preview');
  const isDocumentRoute = Boolean(docMatch || previewMatch);
  const docParams = (docMatch || previewMatch)?.params || params;
  const currentMode = docParams.mode || (previewMatch ? 'preview' : 'constructor');
  const activeProject = projects.find((project) => project.id === docParams.id);
  const activeDocument = (documents[docParams.id] || []).find((doc) => doc.id === docParams.docId);

  const breadcrumbItems = useMemo(() => {
    if (location.pathname === '/dashboard') return [{ label: 'Proyectos' }];

    if (docMatch) {
      return [
        { label: 'Proyectos' },
        { label: 'Documento' },
        { label: modeLabel[docParams.mode] || 'Editor' }
      ];
    }

    if (location.pathname.includes('/datos')) {
      return [{ label: 'Proyectos' }, { label: 'Proyecto' }, { label: 'Datos del proyecto' }];
    }

    if (location.pathname.includes('/documentos')) {
      return [{ label: 'Proyectos' }, { label: 'Proyecto' }];
    }

    return [{ label: 'Proyectos' }];
  }, [docMatch, docParams.mode, location.pathname]);

  const headerContent = useMemo(() => {
    if (location.pathname === '/dashboard') {
      return {
        eyebrow: '',
        title: 'Proyectos'
      };
    }

    if (docMatch) {
      return {
        eyebrow: activeProject?.code || 'Proyecto',
        title: activeDocument?.name || 'Documento'
      };
    }

    if (location.pathname.includes('/datos')) {
      return {
        eyebrow: activeProject?.code || 'Proyecto',
        title: activeProject?.name || 'Datos del proyecto'
      };
    }

    if (location.pathname.includes('/documentos')) {
      return {
        eyebrow: activeProject?.code || 'Proyecto',
        title: activeProject?.name || 'Documentos'
      };
    }

    return {
      eyebrow: '',
      title: 'TechDoc Studio'
    };
  }, [activeDocument?.name, activeProject?.code, activeProject?.name, docMatch, location.pathname]);

  const modeButtons = [
    { value: 'constructor', icon: <FileText className="w-3.5 h-3.5" />, label: 'Constructor' },
    { value: 'preview', icon: <FileText className="w-3.5 h-3.5" />, label: 'Vista previa' },
    { value: 'datos', icon: <FolderOpen className="w-3.5 h-3.5" />, label: 'Datos' },
    { value: 'editor', icon: <FileEdit className="w-3.5 h-3.5" />, label: 'Avanzado' }
  ];

  const initials = (currentUser?.name || 'U')
    .split(' ')
    .map((piece) => piece[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const integrationHealth = getIntegrationHealth(integration?.status);
  const healthClassName =
    integrationHealth.tone === 'ok'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : integrationHealth.tone === 'warn'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : integrationHealth.tone === 'error'
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : 'border-slate-200 bg-slate-50 text-slate-600';
  const healthDotClassName =
    integrationHealth.tone === 'ok'
      ? 'bg-emerald-500'
      : integrationHealth.tone === 'warn'
        ? 'bg-amber-500'
        : integrationHealth.tone === 'error'
          ? 'bg-rose-500'
          : 'bg-slate-400';

  // Handle clicking outside to close the dropdown menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <header className='sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md'>
      <div className='mx-auto flex min-h-[56px] max-w-[1460px] items-center justify-between gap-3 px-4 py-2'>
        <div className='flex min-w-0 flex-1 items-center gap-3'>
          <Link to='/dashboard' className='inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white/50 px-2 py-1 transition hover:border-slate-300 hover:bg-white shadow-sm'>
            <span className='inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-[10px] font-bold text-white'>
              T
            </span>
            <span className='hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 xl:inline'>
              TechDoc
            </span>
          </Link>

          <div className='hidden h-5 w-px bg-slate-200 sm:block' />

          <div className='min-w-0'>
            <div className='flex min-w-0 items-center gap-2'>
              <p className='truncate text-sm font-semibold tracking-[-0.02em] text-slate-900'>
                {headerContent.title}
              </p>
              {headerContent.eyebrow ? (
                <span className='hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 md:inline'>
                  {headerContent.eyebrow}
                </span>
              ) : null}
            </div>
            {location.pathname !== '/dashboard' ? (
              <div className='mt-0.5 hidden sm:block'>
                <Breadcrumb items={breadcrumbItems} />
              </div>
            ) : null}
          </div>
        </div>

        <div className='flex shrink-0 items-center gap-3'>
          <div
            className={`hidden lg:flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] ${healthClassName}`}
            title={integrationHealth.detail}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${healthDotClassName}`} />
            <span>{formatIntegrationMode(integration?.status?.mode || 'local')}</span>
            <span className='text-current/80'>{integrationHealth.shortLabel}</span>
          </div>

          {isDocumentRoute ? (
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-inner">
              {modeButtons.map((button) => {
                const active = currentMode === button.value;
                const href = `/proyecto/${docParams.id}/documento/${docParams.docId}/${button.value}`;
                return (
                  <Link
                    key={button.value}
                    to={href}
                    onClick={() => setActiveMode(button.value)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                      active
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 border border-transparent'
                    }`}
                  >
                    {button.icon}
                    <span className="hidden md:inline">{button.label}</span>
                  </Link>
                );
              })}
            </div>
          ) : null}

          <div className="hidden sm:block">
            <SaveIndicator status={saveStatus} />
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition shadow-sm outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-1"
              title={currentUser?.name || 'Usuario'}
            >
              <span className="text-[11px] font-bold text-slate-700">{initials}</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-slate-200 bg-white shadow-lg focus:outline-none overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Sesión</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">{currentUser?.role || 'Usuario'}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/dashboard');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition whitespace-nowrap"
                  >
                    <LayoutDashboard className="w-4 h-4 opacity-70" />
                    Ir a Dashboard
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                      navigate('/');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition whitespace-nowrap"
                  >
                    <LogOut className="w-4 h-4 opacity-70" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {location.pathname !== '/dashboard' ? (
        <div className='border-t border-slate-100 bg-slate-50/50 px-4 py-1.5 sm:hidden'>
          <div className='mx-auto max-w-[1460px] flex items-center justify-between'>
            <Breadcrumb items={breadcrumbItems} />
            <div className="scale-90 origin-right">
              <SaveIndicator status={saveStatus} />
            </div>
          </div>
        </div>
      ) : null}

      <div className='border-t border-slate-100 bg-slate-50/80 px-4 py-1.5 lg:hidden'>
        <div className='mx-auto flex max-w-[1460px] items-center justify-between gap-3 text-[11px] font-medium text-slate-600'>
          <div className='flex min-w-0 items-center gap-2'>
            <span className={`h-2.5 w-2.5 rounded-full ${healthDotClassName}`} />
            <span className='truncate'>
              {formatIntegrationMode(integration?.status?.mode || 'local')} · {integrationHealth.shortLabel}
            </span>
          </div>
          <span className='truncate text-slate-500'>{integration?.pendingProfile ? 'Reinicio pendiente' : 'Salud de integración'}</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
