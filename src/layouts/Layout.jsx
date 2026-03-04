import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Toast from '../components/Toast';
import useDocumentStore from '../store';
import { STORAGE_KEYS } from '../constants/storage';
import { apiGetWorkspace, apiSaveWorkspace } from '../api/client';
import { getSessionToken } from '../api/session';

function Layout() {
  const useApiWorkspace = import.meta.env.VITE_USE_API_WORKSPACE === 'true';
  const location = useLocation();
  const currentDocumentId = useDocumentStore((state) => state.currentDocumentId);
  const currentProjectId = useDocumentStore((state) => state.currentProjectId);
  const structure = useDocumentStore((state) => state.structure);
  const formData = useDocumentStore((state) => state.formData);
  const coverConfig = useDocumentStore((state) => state.coverConfig);
  const projects = useDocumentStore((state) => state.projects);
  const documents = useDocumentStore((state) => state.documents);
  const currentUser = useDocumentStore((state) => state.currentUser);
  const saveStatus = useDocumentStore((state) => state.saveStatus);
  const setSaveStatus = useDocumentStore((state) => state.setSaveStatus);
  const hydrateWorkspace = useDocumentStore((state) => state.hydrateWorkspace);
  const pushToast = useDocumentStore((state) => state.pushToast);
  const toasts = useDocumentStore((state) => state.toasts);
  const removeToast = useDocumentStore((state) => state.removeToast);
  const remoteLoadedRef = useRef(false);
  const syncErrorShownRef = useRef(false);

  useEffect(() => {
    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        removeToast(toast.id);
      }, 2800)
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [removeToast, toasts]);

  useEffect(() => {
    if (!useApiWorkspace) return undefined;
    if (!currentUser) {
      remoteLoadedRef.current = false;
      return undefined;
    }
    if (!getSessionToken()) return undefined;
    if (remoteLoadedRef.current) return undefined;

    remoteLoadedRef.current = true;
    let cancelled = false;

    const loadRemoteWorkspace = async () => {
      try {
        const payload = await apiGetWorkspace();
        if (!cancelled && payload?.workspace) {
          hydrateWorkspace(payload.workspace);
        }
      } catch (error) {
        if (!cancelled) {
          pushToast(`Sincronizacion inicial no disponible: ${error?.message || 'API no reachable'}`, 'warning');
        }
      }
    };

    loadRemoteWorkspace();

    return () => {
      cancelled = true;
    };
  }, [currentUser, hydrateWorkspace, pushToast, useApiWorkspace]);

  useEffect(() => {
    if (saveStatus !== 'unsaved') return undefined;

    setSaveStatus('saving');

    const timer = window.setTimeout(() => {
      const persist = async () => {
        localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects));
        localStorage.setItem(STORAGE_KEYS.docsIndex, JSON.stringify(documents));

        if (currentUser) {
          localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(currentUser));
        }

        if (currentDocumentId) {
          localStorage.setItem(`techdoc_doc_${currentDocumentId}`, JSON.stringify({ structure, formData }));
        }

        if (currentProjectId) {
          localStorage.setItem(`techdoc_cover_${currentProjectId}`, JSON.stringify(coverConfig[currentProjectId] || {}));
        }

        if (!useApiWorkspace || !getSessionToken()) {
          setSaveStatus('saved');
          return;
        }

        try {
          await apiSaveWorkspace({ projects, documents, coverConfig });
          syncErrorShownRef.current = false;
          setSaveStatus('saved');
        } catch (error) {
          if (!syncErrorShownRef.current) {
            pushToast(`No se pudo guardar en servidor: ${error?.message || 'error desconocido'}`, 'error');
          }
          syncErrorShownRef.current = true;
          setSaveStatus('unsaved');
        }
      };

      persist();
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [
    coverConfig,
    currentDocumentId,
    currentProjectId,
    currentUser,
    documents,
    formData,
    projects,
    pushToast,
    saveStatus,
    setSaveStatus,
    structure,
    useApiWorkspace
  ]);

  if (!currentUser) {
    return <Navigate to='/' replace />;
  }

  return (
    <div className='min-h-screen bg-slate-100'>
      <Header />
      <main key={location.pathname} className='animate-fade-up mx-auto max-w-[1460px] px-4 py-4'>
        <Outlet />
      </main>

      <div className='pointer-events-none fixed right-4 top-20 z-40 flex w-[330px] flex-col gap-2'>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </div>
  );
}

export default Layout;
