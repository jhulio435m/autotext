import { useEffect, useMemo, useRef, useState } from 'react';
import useDocumentStore from '../../store';
import {
  apiAcquireDocumentLock,
  apiGetDocument,
  apiGetDocumentLock,
  apiGetPlaneProjectIssues,
  apiGetPlaneProjects,
  apiHeartbeatDocumentLock,
  apiReleaseDocumentLock
} from '../../api/client';
import { getSessionToken } from '../../api/session';

export function useDocumentRouteState({ id, docId, mode, navigate }) {
  const usePlaneProjects = import.meta.env.VITE_USE_PLANE_PROJECTS === 'true';
  const usePlaneProjectIssues = import.meta.env.VITE_USE_PLANE_PROJECT_ISSUES === 'true';

  const setCurrentDocument = useDocumentStore((state) => state.setCurrentDocument);
  const setActiveMode = useDocumentStore((state) => state.setActiveMode);
  const getDocumentById = useDocumentStore((state) => state.getDocumentById);
  const currentProjectId = useDocumentStore((state) => state.currentProjectId);
  const currentDocumentId = useDocumentStore((state) => state.currentDocumentId);
  const setDocumentLock = useDocumentStore((state) => state.setDocumentLock);
  const mergeDocumentDetail = useDocumentStore((state) => state.mergeDocumentDetail);
  const setProjectsFromPlane = useDocumentStore((state) => state.setProjectsFromPlane);
  const setDocumentsFromPlaneIssues = useDocumentStore((state) => state.setDocumentsFromPlaneIssues);
  const pushToast = useDocumentStore((state) => state.pushToast);
  const workspaceHydrated = useDocumentStore((state) => state.workspaceHydrated);

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [resolvedDocument, setResolvedDocument] = useState(false);
  const [lockState, setLockState] = useState(null);
  const lockTokenRef = useRef(null);
  const sessionToken = getSessionToken();
  const doc = getDocumentById(docId);

  useEffect(() => {
    if (mode === 'constructor') setActiveMode('constructor');
    else if (mode === 'editor') setActiveMode('editor');
    else if (mode === 'caratula' || mode === 'datos') setActiveMode('datos');
    else setActiveMode('constructor');
  }, [mode, setActiveMode]);

  useEffect(() => {
    setResolvedDocument(false);
    setLoadingDocument(false);
  }, [docId, id]);

  useEffect(() => {
    if (doc) {
      setResolvedDocument(true);
      setLoadingDocument(doc.contentLoaded === false);
    }
  }, [doc]);

  useEffect(() => {
    if (!id || !docId || !workspaceHydrated || !doc || doc.contentLoaded !== false) return undefined;

    let cancelled = false;
    const loadDocument = async () => {
      setLoadingDocument(true);
      try {
        const response = await apiGetDocument(id, docId);
        if (!cancelled && response?.document) {
          mergeDocumentDetail(id, response.document);
        }
      } catch (error) {
        if (!cancelled) {
          pushToast(`No se pudo cargar el contenido del documento: ${error?.message || 'error desconocido'}`, 'warning');
        }
      } finally {
        if (!cancelled) {
          setLoadingDocument(false);
        }
      }
    };

    loadDocument();
    return () => {
      cancelled = true;
    };
  }, [doc, docId, id, mergeDocumentDetail, pushToast, workspaceHydrated]);

  useEffect(() => {
    if (!id || !docId || resolvedDocument) return undefined;
    if (!workspaceHydrated) return undefined;
    if (!usePlaneProjectIssues) {
      setResolvedDocument(true);
      return undefined;
    }

    let cancelled = false;
    const resolveDocument = async () => {
      setLoadingDocument(true);
      try {
        const issuesResponse = await apiGetPlaneProjectIssues(id, {
          label: 'Automatizable',
          limit: 300
        });
        if (!cancelled && issuesResponse?.ok) {
          setDocumentsFromPlaneIssues(id, issuesResponse.issues || []);
        }
      } catch (error) {
        if (!cancelled) {
          pushToast(`No se pudo recargar el documento desde Plane: ${error?.message || 'error desconocido'}`, 'warning');
        }
      } finally {
        if (!cancelled) {
          setLoadingDocument(false);
          setResolvedDocument(true);
        }
      }
    };

    resolveDocument();

    return () => {
      cancelled = true;
    };
  }, [
    docId,
    id,
    pushToast,
    resolvedDocument,
    setDocumentsFromPlaneIssues,
    workspaceHydrated,
    usePlaneProjectIssues,
    usePlaneProjects
  ]);

  useEffect(() => {
    if (!id || !usePlaneProjects) return undefined;

    let cancelled = false;
    const refreshProjects = async () => {
      try {
        const projectsResponse = await apiGetPlaneProjects({ limit: 200 });
        if (!cancelled && projectsResponse?.ok && Array.isArray(projectsResponse.projects)) {
          setProjectsFromPlane(projectsResponse.projects);
        }
      } catch (error) {
        if (!cancelled) {
          pushToast(`No se pudo actualizar el proyecto desde Plane: ${error?.message || 'error desconocido'}`, 'warning');
        }
      }
    };

    refreshProjects();

    return () => {
      cancelled = true;
    };
  }, [id, pushToast, setProjectsFromPlane, usePlaneProjects]);

  useEffect(() => {
    if (!id || !docId || !doc || doc.contentLoaded === false) return;
    if (currentProjectId === id && currentDocumentId === docId) return;
    setCurrentDocument(id, docId);
  }, [currentDocumentId, currentProjectId, doc, docId, id, setCurrentDocument]);

  useEffect(() => {
    if (!id || !docId || !doc || mode === 'preview' || !sessionToken) {
      setLockState(null);
      return undefined;
    }

    let cancelled = false;
    const token =
      lockTokenRef.current || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `lock_${Date.now()}`);
    lockTokenRef.current = token;

    const acquire = async () => {
      try {
        const response = await apiAcquireDocumentLock(id, docId, token);
        if (cancelled) return;
        
        // Si el documento no esta en DB aun, simplemente salimos sin error.
        // El guardado automatico lo creara y el siguiente heartbeat lo bloqueara.
        if (response.notInDb) {
          console.log('Document not yet in DB, skipping initial lock.');
          return;
        }

        setLockState(response.lock || null);
        setDocumentLock(id, docId, {
          ...(response.lock || null),
          token,
          isLocked: Boolean(response.lock?.isLocked),
          ownedByCurrentUser: Boolean(response.lock?.ownedByCurrentUser)
        });
      } catch (error) {
        if (cancelled) return;
        if (error?.message?.includes('Token invalido') || error?.message?.includes('No autorizado')) {
          setLockState(null);
          return;
        }
        // Solo mostramos error si no es un problema de "no encontrado" persistente
        if (!error?.message?.includes('no existe') && !error?.message?.includes('404')) {
          pushToast(error?.message || 'No se pudo adquirir el lock del documento.', 'warning');
        }
        
        const current = await apiGetDocumentLock(id, docId).catch(() => null);
        if (current?.lock) {
          setLockState(current.lock);
          setDocumentLock(id, docId, current.lock);
        }
      }
    };

    acquire();

    const heartbeat = window.setInterval(async () => {
      try {
        const response = await apiHeartbeatDocumentLock(id, docId, token);
        if (cancelled) return;
        
        if (response.lost) {
          console.log('Lock lost on server, re-acquiring...');
          const reResponse = await apiAcquireDocumentLock(id, docId, token);
          if (cancelled) return;
          setLockState(reResponse.lock || null);
          setDocumentLock(id, docId, {
            ...(reResponse.lock || null),
            token
          });
          return;
        }

        setLockState(response.lock || null);
        setDocumentLock(id, docId, {
          ...(response.lock || null),
          token
        });
      } catch (error) {
        if (error?.message?.includes('Token invalido') || error?.message?.includes('No autorizado')) {
          window.clearInterval(heartbeat);
          setLockState(null);
          return;
        }
        // En caso de error de red o similar, intentamos re-adquirir por seguridad
        console.log('Heartbeat fatal error, attempting to re-acquire...', error.message);
        try {
          const reResponse = await apiAcquireDocumentLock(id, docId, token);
          if (cancelled) return;
          setLockState(reResponse.lock || null);
          setDocumentLock(id, docId, {
            ...(reResponse.lock || null),
            token
          });
        } catch (reError) {
          console.error('Failed to re-acquire lock:', reError.message);
        }
      }
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(heartbeat);
      // Solo liberamos si realmente teníamos un token y el componente se está desmontando de verdad
      // para este documento específico.
      apiReleaseDocumentLock(id, docId, token).catch(() => {});
    };
  }, [docId, id, mode, pushToast, sessionToken, setDocumentLock]);

  const editorLayoutStyle = useMemo(
    () => ({
      '--editor-left': leftCollapsed ? '44px' : 'minmax(240px, 16fr)',
      '--editor-center': 'minmax(0, 48fr)',
      '--editor-right': rightCollapsed ? '44px' : 'minmax(320px, 36fr)'
    }),
    [leftCollapsed, rightCollapsed]
  );

  const notFoundView = !doc && !loadingDocument && (resolvedDocument || (!usePlaneProjects && !usePlaneProjectIssues));
  const loadingView = !doc && (loadingDocument || (!resolvedDocument && (usePlaneProjects || usePlaneProjectIssues)));
  const isLockedByAnotherUser = Boolean(lockState?.isLocked && !lockState?.ownedByCurrentUser);
  const contentPending = Boolean(doc && doc.contentLoaded === false);

  return {
    doc,
    leftCollapsed,
    setLeftCollapsed,
    rightCollapsed,
    setRightCollapsed,
    loadingView,
    notFoundView,
    lockState,
    editorLayoutStyle,
    isLockedByAnotherUser,
    contentPending,
    navigate
  };
}
