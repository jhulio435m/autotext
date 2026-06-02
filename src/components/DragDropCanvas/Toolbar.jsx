import {
  CheckCircle2,
  Download,
  Redo2,
  Undo2,
  Upload
} from 'lucide-react';

function ToolbarIconButton({ title, onClick, children }) {
  return (
    <button
      type='button'
      className='inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white p-0 text-[13px] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ToolbarGroup({ label, children }) {
  return (
    <div className='flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 px-1.5 py-0.5'>
      <span className='hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 xl:inline'>{label}</span>
      <div className='flex items-center gap-1'>{children}</div>
    </div>
  );
}

export default function CanvasToolbar({
  rowsCount,
  selectedNode,
  onUndo,
  onRedo,
  onValidate,
  onExport,
  onImport
}) {
  return (
    <header className='border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-3 py-3'>
      <div className='flex flex-col gap-3'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='min-w-0'>
            <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400'>Documento</p>
            <div className='mt-1 flex flex-wrap items-center gap-2'>
              <h3 className='text-sm font-semibold text-slate-950'>Estructura del documento</h3>
              <span className='inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-500'>
                {rowsCount} elementos
              </span>
              {selectedNode ? (
                <span className='inline-flex max-w-56 items-center truncate rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-500'>
                  {selectedNode.label || selectedNode.title || selectedNode.id}
                </span>
              ) : null}
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-1.5'>
            <ToolbarGroup label='Historial'>
              <ToolbarIconButton title='Deshacer' onClick={onUndo}>
                <Undo2 className='h-4 w-4' />
              </ToolbarIconButton>
              <ToolbarIconButton title='Rehacer' onClick={onRedo}>
                <Redo2 className='h-4 w-4' />
              </ToolbarIconButton>
            </ToolbarGroup>

            <ToolbarGroup label='Archivo'>
              <ToolbarIconButton title='Validar estructura' onClick={onValidate}>
                <CheckCircle2 className='h-4 w-4' />
              </ToolbarIconButton>
              <ToolbarIconButton title='Importar JSON' onClick={onImport}>
                <Download className='h-4 w-4' />
              </ToolbarIconButton>
              <ToolbarIconButton title='Exportar JSON' onClick={onExport}>
                <Upload className='h-4 w-4' />
              </ToolbarIconButton>
            </ToolbarGroup>
          </div>
        </div>
      </div>
    </header>
  );
}
