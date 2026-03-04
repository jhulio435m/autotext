import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useDocumentStore from '../../store';
import TreePanel from '../../components/TreePanel';
import DragDropCanvas from '../../components/DragDropCanvas';
import PropertyPanel from '../../components/PropertyPanel';
import DynamicForm from '../../components/DynamicForm';
import Preview from '../../components/Preview';
import { apiGetPlaneProjectIssues, apiGetPlaneProjects } from '../../api/client';

function Document() {
  const usePlaneProjects = import.meta.env.VITE_USE_PLANE_PROJECTS === 'true';
  const usePlaneProjectIssues = import.meta.env.VITE_USE_PLANE_PROJECT_ISSUES === 'true';
  const navigate = useNavigate();
  const { id, docId, mode } = useParams();

  const setCurrentDocument = useDocumentStore((state) => state.setCurrentDocument);
  const setActiveMode = useDocumentStore((state) => state.setActiveMode);
  const getDocumentById = useDocumentStore((state) => state.getDocumentById);
  const setProjectsFromPlane = useDocumentStore((state) => state.setProjectsFromPlane);
  const setDocumentsFromPlaneIssues = useDocumentStore((state) => state.setDocumentsFromPlaneIssues);
  const pushToast = useDocumentStore((state) => state.pushToast);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [resolvedDocument, setResolvedDocument] = useState(false);

  useEffect(() => {
    if (mode === 'editor') setActiveMode('editor');
    else if (mode === 'formulario') setActiveMode('form');
    else setActiveMode('preview');
  }, [mode, setActiveMode]);

  const doc = getDocumentById(docId);

  useEffect(() => {
    setResolvedDocument(false);
    setLoadingDocument(false);
  }, [docId, id]);

  useEffect(() => {
    if (!id || !docId || doc || resolvedDocument) return undefined;
    if (!usePlaneProjects && !usePlaneProjectIssues) {
      setResolvedDocument(true);
      return undefined;
    }

    let cancelled = false;
    const resolveDocument = async () => {
      setLoadingDocument(true);
      try {
        if (usePlaneProjects) {
          const projectsResponse = await apiGetPlaneProjects({ limit: 200 });
          if (!cancelled && projectsResponse?.ok && Array.isArray(projectsResponse.projects)) {
            setProjectsFromPlane(projectsResponse.projects);
          }
        }

        if (usePlaneProjectIssues) {
          const issuesResponse = await apiGetPlaneProjectIssues(id, {
            label: 'Automatizable',
            limit: 300
          });
          if (!cancelled && issuesResponse?.ok) {
            setDocumentsFromPlaneIssues(id, issuesResponse.issues || []);
          }
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
    doc,
    docId,
    id,
    pushToast,
    resolvedDocument,
    setDocumentsFromPlaneIssues,
    setProjectsFromPlane,
    usePlaneProjectIssues,
    usePlaneProjects
  ]);

  useEffect(() => {
    if (!id || !docId || !doc) return;
    setCurrentDocument(id, docId);
  }, [doc, docId, id, setCurrentDocument]);

  const isFormMode = mode === 'formulario';
  const editorLayoutStyle = useMemo(
    () => ({
      '--editor-left': leftCollapsed ? '44px' : 'minmax(260px, 24%)',
      '--editor-right': rightCollapsed ? '44px' : 'minmax(280px, 24%)'
    }),
    [leftCollapsed, rightCollapsed]
  );

  if (!doc) {
    if (loadingDocument || (!resolvedDocument && (usePlaneProjects || usePlaneProjectIssues))) {
      return (
        <div className='soft-panel p-6'>
          <p className='text-sm text-slate-600'>Cargando documento...</p>
        </div>
      );
    }

    return (
      <div className='soft-panel p-6'>
        <p className='text-sm text-slate-600'>Documento no encontrado.</p>
        <button type='button' className='btn-primary mt-3 px-3 py-2 text-sm' onClick={() => navigate(`/proyecto/${id}/documentos`)}>
          Volver
        </button>
      </div>
    );
  }

  if (mode === 'preview') {
    return <Preview projectId={id} />;
  }

  return (
  <section className='space-y-3'>
    <div className='editor-doc-header soft-panel px-4 py-3'>
      <div className='min-w-0'>
        <h2 className='truncate text-sm font-semibold text-slate-900'>{doc.name}</h2>
        <p className='mt-0.5 text-[11px] text-slate-500'>
          {isFormMode ? 'Modo formulario para captura de datos' : 'Modo editor para estructura y bloques'}
        </p>
      </div>
    </div>

    <div className='editor-layout min-h-[calc(100vh-220px)] gap-3' style={editorLayoutStyle}>
      <TreePanel collapsed={leftCollapsed} onToggleCollapsed={setLeftCollapsed} />
      {isFormMode ? <DynamicForm /> : <DragDropCanvas />}
      <PropertyPanel collapsed={rightCollapsed} onToggleCollapsed={setRightCollapsed} />
    </div>
  </section>
);
}

export default Document;
