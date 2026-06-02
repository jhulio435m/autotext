import { Suspense, lazy } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import useDocumentStore from '../../store';
import { useDocumentRouteState } from './useDocumentRouteState';

const TreePanel = lazy(() => import('../../components/TreePanel'));
const DragDropCanvas = lazy(() => import('../../components/DragDropCanvas'));
const PropertyPanelModal = lazy(() => import('../../components/PropertyPanel'));
const Preview = lazy(() => import('../../components/Preview'));
const ProjectDataEditor = lazy(() => import('../../components/ProjectDataEditor'));
const DocumentBuilder = lazy(() => import('../../components/DocumentBuilder'));
const DocumentPreview = lazy(() => import('../../components/DocumentPreview'));

function ContentFallback({ message = 'Cargando editor...' }) {
  return (
    <div className='rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'>
      <p className='text-sm text-slate-600'>{message}</p>
    </div>
  );
}

function Document() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id, docId, mode: paramMode } = useParams();
  const mode = paramMode || (location.pathname.endsWith('/preview') ? 'preview' : 'constructor');
  const {
    doc,
    leftCollapsed,
    setLeftCollapsed,
    rightCollapsed,
    setRightCollapsed,
    loadingView,
    notFoundView,
    lockState,
    contentPending,
    isFormMode,
    editorLayoutStyle,
    isLockedByAnotherUser
  } = useDocumentRouteState({ id, docId, mode, navigate });

  const propertyModalOpen = useDocumentStore((state) => state.propertyModalOpen);
  const setPropertyModalOpen = useDocumentStore((state) => state.setPropertyModalOpen);

  if (!doc) {
    if (loadingView) {
      return (
        <div className='rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'>
          <p className='text-sm text-slate-600'>Cargando documento...</p>
        </div>
      );
    }

    if (notFoundView) {
      return (
      <div className='rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'>
        <p className='text-sm text-slate-600'>Documento no encontrado.</p>
        <button
          type='button'
          className='mt-3 rounded-lg border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800'
          onClick={() => navigate(`/proyecto/${id}/documentos`)}
        >
          Volver
        </button>
      </div>
      );
    }
  }

  if (contentPending) {
    return (
      <div className='rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'>
        <p className='text-sm text-slate-600'>Cargando contenido del documento...</p>
      </div>
    );
  }

  if (mode === 'datos') {
    return (
      <Suspense fallback={<ContentFallback message='Cargando datos del proyecto...' />}>
        <ProjectDataEditor projectId={id} docId={docId} />
      </Suspense>
    );
  }

  if (mode === 'constructor') {
    return (
      <Suspense fallback={<ContentFallback message='Cargando constructor...' />}>
        <DocumentBuilder />
      </Suspense>
    );
  }

  if (mode === 'preview') {
    return (
      <Suspense fallback={<ContentFallback message='Cargando preview...' />}>
        <DocumentPreview />
      </Suspense>
    );
  }

  if (isLockedByAnotherUser) {
    return (
      <div className='rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'>
        <h2 className='text-base font-semibold text-amber-900'>Documento bloqueado</h2>
        <p className='mt-2 text-sm text-amber-800'>
          {lockState?.userName || 'Otro usuario'} está editando este documento.
          {lockState?.expiresAt ? ` Lock válido hasta ${new Date(lockState.expiresAt).toLocaleTimeString('es-PE')}.` : ''}
        </p>
        <button
          type='button'
          className='mt-4 rounded-lg border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800'
          onClick={() => navigate(`/proyecto/${id}/documento/${docId}/constructor`)}
        >
          Abrir constructor
        </button>
      </div>
    );
  }






  return (
    <section className='flex flex-1 min-h-0 flex-col relative'>
      <Suspense fallback={<ContentFallback />}>
        <div
          className='grid min-h-0 flex-1 grid-cols-1 gap-3 xl:[grid-template-columns:var(--editor-left)_var(--editor-center)_var(--editor-right)]'
          style={editorLayoutStyle}
        >
          <div className='panel-scroll min-h-0'>
            <TreePanel collapsed={leftCollapsed} onToggleCollapsed={setLeftCollapsed} />
          </div>
          <div className='panel-scroll min-h-0'>
            <DragDropCanvas />
          </div>
          <div className='flex min-h-0 flex-col'>
            <Preview embedded={true} editableText={false} />
          </div>
        </div>
        <PropertyPanelModal open={propertyModalOpen} onClose={() => setPropertyModalOpen(false)} />
      </Suspense>
    </section>
  );
}

export default Document;
