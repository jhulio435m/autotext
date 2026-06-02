import { useEffect, useRef, useState, useMemo } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Toast from '../components/ui/Toast';
import useDocumentStore from '../store';
import { STORAGE_KEYS } from '../constants/storage';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import {
  apiApplyIntegrationProfile,
  apiGetIntegrationProfiles,
  apiGetIntegrationStatus,
  apiGetPlaneProjects,
  apiGetWorkspace,
  apiSaveWorkspace
} from '../api/client';
import { AUTH_EXPIRED_EVENT, getSessionToken } from '../api/session';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const PENDING_INTEGRATION_PROFILE_KEY = 'autotext.integration.pendingProfile';

function buildWorkspacePayload(state, changedProjectId = null) {
  const serializeDocument = (doc) => {
    if (!doc?.id) return null;

    return {
      id: doc.id,
      name: doc.name || 'Documento',
      type: doc.type || '',
      description: doc.description || '',
      updatedAt: doc.updatedAt || null,
      structure: Array.isArray(doc.structure) ? doc.structure : [],
      formData: doc.formData && typeof doc.formData === 'object' ? doc.formData : {},
      coverData: doc.coverData && typeof doc.coverData === 'object' ? doc.coverData : {},
      contentLoaded: doc.contentLoaded !== false
    };
  };

  const filterImages = (config) => {
    const clean = { ...config };
    // Don't send back images that are already URLs or long base64 strings
    // the server already has them. Only send if they are new Plane URLs 
    // or newly uploaded files (which would be handled differently if needed).
    if (typeof clean.logo === 'string' && (clean.logo.startsWith('/api/') || clean.logo.startsWith('data:'))) {
      delete clean.logo;
    }
    if (typeof clean.coverPhoto === 'string' && (clean.coverPhoto.startsWith('/api/') || clean.coverPhoto.startsWith('data:'))) {
      delete clean.coverPhoto;
    }
    return clean;
  };

  if (!changedProjectId) {
    const cleanCoverConfig = {};
    Object.entries(state.coverConfig).forEach(([id, cfg]) => {
      cleanCoverConfig[id] = filterImages(cfg);
    });

    return {
      projects: state.projects,
      documents: Object.fromEntries(
        Object.entries(state.documents).map(([projectId, docs]) => [
          projectId,
          (Array.isArray(docs) ? docs : []).map(serializeDocument).filter(Boolean)
        ])
      ),
      coverConfig: cleanCoverConfig
    };
  }

  // Partial payload for better performance
  const currentProjectDocs = Array.isArray(state.documents[changedProjectId]) ? state.documents[changedProjectId] : [];

  return {
    projects: state.projects.filter(p => String(p.id) === String(changedProjectId)),
    documents: {
      [changedProjectId]: currentProjectDocs.map(serializeDocument).filter(Boolean)
    },
    coverConfig: { [changedProjectId]: filterImages(state.coverConfig[changedProjectId] || {}) }
  };
}

function flushWorkspaceToServer({ sessionToken, useApiWorkspace }) {
  if (!useApiWorkspace || !sessionToken) return;

  const latestState = useDocumentStore.getState();
  if (!['unsaved', 'retrying', 'saving', 'sync-error'].includes(latestState.saveStatus)) return;

  const changedProjectId = latestState.currentProjectId;
  const body = JSON.stringify({
    workspace: buildWorkspacePayload(latestState, changedProjectId),
    changedProjectId
  });

  fetch(`${API_BASE}/workspace`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`
    },
    body,
    keepalive: true
  }).catch(() => {});
}

function Layout() {
  const useApiWorkspace = import.meta.env.VITE_USE_API_WORKSPACE === 'true';
  const usePlaneProjects = import.meta.env.VITE_USE_PLANE_PROJECTS === 'true';
  const location = useLocation();
  const currentDocumentId = useDocumentStore((state) => state.currentDocumentId);
  const currentProjectId = useDocumentStore((state) => state.currentProjectId);
  const structure = useDocumentStore((state) => state.structure);
  const formData = useDocumentStore((state) => state.formData);
  const coverConfig = useDocumentStore((state) => state.coverConfig);
  const projects = useDocumentStore((state) => state.projects);
  const documents = useDocumentStore((state) => state.documents);
  const getCurrentDocument = useDocumentStore((state) => state.getCurrentDocument);
  const currentUser = useDocumentStore((state) => state.currentUser);
  const [offlineMode, setOfflineMode] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const logout = useDocumentStore((state) => state.logout);
  const saveStatus = useDocumentStore((state) => state.saveStatus);
  const workspaceHydrated = useDocumentStore((state) => state.workspaceHydrated);
  const setWorkspaceHydrated = useDocumentStore((state) => state.setWorkspaceHydrated);
  const setSaveStatus = useDocumentStore((state) => state.setSaveStatus);
  const hydrateWorkspace = useDocumentStore((state) => state.hydrateWorkspace);
  const setProjectsFromPlane = useDocumentStore((state) => state.setProjectsFromPlane);
  const commitDocumentVersionSnapshot = useDocumentStore((state) => state.commitDocumentVersionSnapshot);
  const pushToast = useDocumentStore((state) => state.pushToast);
  const toasts = useDocumentStore((state) => state.toasts);
  const removeToast = useDocumentStore((state) => state.removeToast);
  const remoteLoadedRef = useRef(false);
  const syncErrorShownRef = useRef(false);
  const syncRetryTimerRef = useRef(null);
  const syncFailureCountRef = useRef(0);
  const saveInFlightRef = useRef(false);
  const queuedSaveRef = useRef(false);
  const activeSaveHashRef = useRef('');
  const [integrationStatus, setIntegrationStatus] = useState(null);
  const [integrationProfiles, setIntegrationProfiles] = useState([]);
  const [integrationLoading, setIntegrationLoading] = useState(true);
  const [integrationRefreshing, setIntegrationRefreshing] = useState(false);
  const [integrationApplying, setIntegrationApplying] = useState(false);
  const [integrationError, setIntegrationError] = useState('');
  const [integrationLastUpdatedAt, setIntegrationLastUpdatedAt] = useState(null);
  const [pendingIntegrationProfile, setPendingIntegrationProfile] = useState(() => {
    try {
      const raw = localStorage.getItem(PENDING_INTEGRATION_PROFILE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.profile ? parsed.profile : '';
    } catch {
      return '';
    }
  });
  const currentDocument = getCurrentDocument();
  const sessionToken = getSessionToken();

  const [showShortcuts, setShowShortcuts] = useState(false);

  const keyboardHandlers = useMemo(() => [
    {
      key: 's',
      ctrl: true,
      handler: () => {
        const state = useDocumentStore.getState();
        if (state.saveStatus === 'unsaved' || state.saveStatus === 'retrying') {
          queueWorkspaceSave();
        }
      }
    },
    {
      key: 'z',
      ctrl: true,
      handler: () => {
        const state = useDocumentStore.getState();
        state.undo?.();
      }
    },
    {
      key: 'z',
      ctrl: true,
      shift: true,
      handler: () => {
        const state = useDocumentStore.getState();
        state.redo?.();
      }
    },
    {
      key: 'y',
      ctrl: true,
      handler: () => {
        const state = useDocumentStore.getState();
        state.redo?.();
      }
    },
    {
      key: '?',
      handler: () => setShowShortcuts((v) => !v)
    },
    {
      key: 'Escape',
      handler: () => setShowShortcuts(false)
    }
  ], []);
  useKeyboardShortcuts(keyboardHandlers);

  const queueWorkspaceSave = async () => {
    if (saveInFlightRef.current) {
      queuedSaveRef.current = true;
      return;
    }

    const latestState = useDocumentStore.getState();
    if (!latestState.workspaceHydrated || !['unsaved', 'retrying'].includes(latestState.saveStatus)) return;

    saveInFlightRef.current = true;
    queuedSaveRef.current = false;

    try {
      const changedProjectId = latestState.currentProjectId;
      
      // We don't want to save if there's no active project and it's a partial save
      if (!changedProjectId && useApiWorkspace) {
         saveInFlightRef.current = false;
         return;
      }

      if (latestState.currentProjectId && latestState.currentDocumentId) {
        commitDocumentVersionSnapshot(latestState.currentProjectId, latestState.currentDocumentId, 'Autosave');
      }

      // Re-get state after snapshot
      const saveSourceState = useDocumentStore.getState();
      const payload = buildWorkspacePayload(saveSourceState, changedProjectId);
      const payloadHash = JSON.stringify(payload);
      
      if (activeSaveHashRef.current === payloadHash) {
         setSaveStatus('saved');
         saveInFlightRef.current = false;
         return;
      }

      activeSaveHashRef.current = payloadHash;
      setSaveStatus('saving');

      if (useApiWorkspace && sessionToken) {
        await apiSaveWorkspace(payload, changedProjectId);
      }
      
      window.clearTimeout(syncRetryTimerRef.current);
      syncFailureCountRef.current = 0;
      syncErrorShownRef.current = false;

      // Check if state changed while saving
      const currentState = useDocumentStore.getState();
      const currentHash = JSON.stringify(buildWorkspacePayload(currentState, changedProjectId));
      setSaveStatus(currentHash === payloadHash ? 'saved' : 'unsaved');
    } catch (error) {
      syncFailureCountRef.current += 1;
      const retryDelay = Math.min(30000, 2000 * (2 ** (syncFailureCountRef.current - 1)));
      if (!syncErrorShownRef.current) {
        pushToast(`No se pudo guardar en servidor: ${error?.message || 'error desconocido'}`, 'error');
      }
      syncErrorShownRef.current = true;
      setSaveStatus('sync-error');
      window.clearTimeout(syncRetryTimerRef.current);
      syncRetryTimerRef.current = window.setTimeout(() => {
        setSaveStatus('retrying');
      }, retryDelay);
    } finally {
      saveInFlightRef.current = false;
      if (queuedSaveRef.current) {
        queuedSaveRef.current = false;
        window.setTimeout(queueWorkspaceSave, 100);
      }
    }
  };

  useEffect(() => {
    if (!useApiWorkspace) return undefined;

    if (!currentUser) {
      remoteLoadedRef.current = false;
      setWorkspaceHydrated(false);
      return undefined;
    }
    if (!sessionToken) return undefined;
    if (remoteLoadedRef.current) return undefined;

    remoteLoadedRef.current = true;
    let cancelled = false;

    const loadRemoteWorkspace = async () => {
      try {
        const payload = await apiGetWorkspace();
        if (cancelled) return;
        
        hydrateWorkspace(payload?.workspace || {
          projects: [],
          documents: {},
          coverConfig: {}
        });

        if (usePlaneProjects) {
          const response = await apiGetPlaneProjects({ limit: 200 });
          if (!cancelled && response?.ok && Array.isArray(response.projects)) {
            setProjectsFromPlane(response.projects);
          }
        }
      } catch (error) {
        if (!cancelled) {
          remoteLoadedRef.current = false;
          pushToast(`Sincronización inicial no disponible: ${error?.message || 'API no reachable'}`, 'warning');
        }
      }
    };

    loadRemoteWorkspace();
    return () => { cancelled = true; };
  }, [currentUser, sessionToken, useApiWorkspace, usePlaneProjects, hydrateWorkspace, setProjectsFromPlane, setWorkspaceHydrated, pushToast]);

  useEffect(() => {
    if (!['unsaved', 'retrying'].includes(saveStatus)) return undefined;
    
    const timer = window.setTimeout(queueWorkspaceSave, 2000);
    return () => window.clearTimeout(timer);
  }, [saveStatus]);

  useEffect(() => {
    if (!useApiWorkspace || !sessionToken) return undefined;

    const flush = () => flushWorkspaceToServer({ sessionToken, useApiWorkspace });
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    };

    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sessionToken, useApiWorkspace]);

  useEffect(() => () => window.clearTimeout(syncRetryTimerRef.current), []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.user);
    }
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;
    let pollTimer = null;

    const loadIntegration = async ({ silent = false } = {}) => {
      if (silent) {
        setIntegrationRefreshing(true);
      } else {
        setIntegrationLoading(true);
      }

      try {
        const [statusPayload, profilesPayload] = await Promise.all([
          apiGetIntegrationStatus(),
          apiGetIntegrationProfiles()
        ]);

        if (cancelled) return;

        setIntegrationStatus(statusPayload);
        setIntegrationProfiles(Array.isArray(profilesPayload?.profiles) ? profilesPayload.profiles : []);
        setIntegrationError('');
        setIntegrationLastUpdatedAt(Date.now());
      } catch (error) {
        if (cancelled) return;
        setIntegrationError(error?.message || 'No se pudo leer el estado de integración.');
      } finally {
        if (cancelled) return;
        setIntegrationLoading(false);
        setIntegrationRefreshing(false);
      }
    };

    loadIntegration();
    pollTimer = window.setInterval(() => {
      loadIntegration({ silent: true });
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
    };
  }, []);

  useEffect(() => {
    if (!integrationStatus?.mode || !pendingIntegrationProfile) return;
    if (integrationStatus.mode !== pendingIntegrationProfile) return;

    setPendingIntegrationProfile('');
    localStorage.removeItem(PENDING_INTEGRATION_PROFILE_KEY);
  }, [integrationStatus?.mode, pendingIntegrationProfile]);

  const refreshIntegrationStatus = async () => {
    setIntegrationRefreshing(true);
    try {
      const [statusPayload, profilesPayload] = await Promise.all([
        apiGetIntegrationStatus(),
        apiGetIntegrationProfiles()
      ]);
      setIntegrationStatus(statusPayload);
      setIntegrationProfiles(Array.isArray(profilesPayload?.profiles) ? profilesPayload.profiles : []);
      setIntegrationError('');
      setIntegrationLastUpdatedAt(Date.now());
      return statusPayload;
    } catch (error) {
      setIntegrationError(error?.message || 'No se pudo actualizar el estado de integración.');
      throw error;
    } finally {
      setIntegrationLoading(false);
      setIntegrationRefreshing(false);
    }
  };

  const applyIntegrationProfile = async (profile) => {
    setIntegrationApplying(true);
    try {
      const response = await apiApplyIntegrationProfile(profile);
      const pending = response?.profile || profile;
      setPendingIntegrationProfile(pending);
      localStorage.setItem(PENDING_INTEGRATION_PROFILE_KEY, JSON.stringify({ profile: pending, requestedAt: Date.now() }));
      await refreshIntegrationStatus();
      return response;
    } finally {
      setIntegrationApplying(false);
    }
  };

  const integrationContext = {
    status: integrationStatus,
    profiles: integrationProfiles,
    loading: integrationLoading,
    refreshing: integrationRefreshing,
    applying: integrationApplying,
    error: integrationError,
    lastUpdatedAt: integrationLastUpdatedAt,
    pendingProfile: pendingIntegrationProfile,
    refresh: refreshIntegrationStatus,
    applyProfile: applyIntegrationProfile
  };

  useEffect(() => {
    const updateOnlineState = () => setOfflineMode(!navigator.onLine);
    window.addEventListener('online', updateOnlineState);
    window.addEventListener('offline', updateOnlineState);
    return () => {
      window.removeEventListener('online', updateOnlineState);
      window.removeEventListener('offline', updateOnlineState);
    };
  }, []);

  if (!currentUser) {
    return <Navigate to='/' replace state={{ from: location }} />;
  }

  return (
    <div className='flex min-h-screen flex-col bg-slate-100'>
      <Header integration={integrationContext} />
      {offlineMode ? <div className='border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-semibold text-amber-800'>Modo Offline</div> : null}
      <main key={location.pathname} className='flex flex-1 flex-col w-full px-4 py-4'>
        <Outlet context={integrationContext} />
      </main>

      <div className='pointer-events-none fixed right-4 top-20 z-40 flex w-full max-w-sm sm:max-w-[330px] flex-col gap-2'>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>

      {showShortcuts ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30' onClick={() => setShowShortcuts(false)}>
          <div className='mx-4 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl' onClick={(e) => e.stopPropagation()}>
            <h2 className='text-base font-semibold text-slate-900'>Atajos de teclado</h2>
            <div className='mt-4 space-y-2 text-sm'>
              <div className='flex justify-between'><span className='text-slate-600'>Guardar</span><kbd className='rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500'>Ctrl+S</kbd></div>
              <div className='flex justify-between'><span className='text-slate-600'>Deshacer</span><kbd className='rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500'>Ctrl+Z</kbd></div>
              <div className='flex justify-between'><span className='text-slate-600'>Rehacer</span><kbd className='rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500'>Ctrl+Shift+Z</kbd></div>
              <div className='flex justify-between'><span className='text-slate-600'>Atajos</span><kbd className='rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500'>?</kbd></div>
            </div>
            <p className='mt-4 text-xs text-slate-400'>Los atajos funcionan en toda la aplicacion.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Layout;
