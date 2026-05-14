import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import TreePanel from '../../components/TreePanel';
import DragDropCanvas from '../../components/DragDropCanvas';
import PropertyPanelModal from '../../components/PropertyPanel';
import Preview from '../../components/Preview';
import useDocumentStore from '../../store';
import ProjectDataEditor from '../../components/ProjectDataEditor';
import DocumentBuilder from '../../components/DocumentBuilder';
import DocumentPreview from '../../components/DocumentPreview';
import { useDocumentRouteState } from './useDocumentRouteState';

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
    return <ProjectDataEditor projectId={id} docId={docId} />;
  }

  if (mode === 'constructor') {
    return <DocumentBuilder />;
  }

  if (mode === 'preview') {
    return <DocumentPreview />;
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
    <section className='relative'>
      <div
        className='grid grid-cols-1 gap-3 xl:[grid-template-columns:var(--editor-left)_var(--editor-center)_var(--editor-right)]'
        style={{ ...editorLayoutStyle, height: 'calc(100vh - 120px)' }}
      >
        {/* Left panel – independent hover-scroll */}
        <div className='panel-scroll min-h-0'>
          <TreePanel collapsed={leftCollapsed} onToggleCollapsed={setLeftCollapsed} />
        </div>
        {/* Center panel – independent hover-scroll */}
        <div className='panel-scroll min-h-0'>
          <DragDropCanvas />
        </div>
        {/* Right panel – sticky toolbar + independent scroll for document */}
        <div className='flex min-h-0 flex-col'>
          <Preview embedded={true} editableText={false} />
        </div>
      </div>
      <PropertyPanelModal open={propertyModalOpen} onClose={() => setPropertyModalOpen(false)} />
    </section>
  );
}

export default Document;
