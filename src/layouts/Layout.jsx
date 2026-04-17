import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Toast from '../components/ui/Toast';
import useDocumentStore from '../store';
import { STORAGE_KEYS } from '../constants/storage';
import { apiGetPlaneProjects, apiGetWorkspace, apiSaveWorkspace } from '../api/client';
import { AUTH_EXPIRED_EVENT, getSessionToken } from '../api/session';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

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
  const currentDocument = getCurrentDocument();
  const sessionToken = getSessionToken();

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

  if (!currentUser) {
    return <Navigate to='/' replace />;
  }

  return (
    <div className='min-h-screen bg-slate-100'>
      <Header />
      <main key={location.pathname} className='mx-auto max-w-[1460px] px-4 py-4'>
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
