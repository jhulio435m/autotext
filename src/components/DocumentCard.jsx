import { Trash2 } from 'lucide-react';

function formatUpdatedAt(value) {
  if (!value) return 'Sin fecha';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function DocumentCard({ doc, onOpen, onDelete }) {
  const sourceLabel = doc.source === 'plane_issue' ? 'Plane' : 'Local';

  return (
    <article className='group rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]'>
      <div className='space-y-4'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0 space-y-2'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600'>
                {doc.type || 'Documento'}
              </span>
              <span className='text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400'>{sourceLabel}</span>
            </div>
            <h4 className='line-clamp-2 text-sm font-semibold leading-5 tracking-[-0.01em] text-slate-900'>
              {doc.name}
            </h4>
          </div>

          <div className='flex items-center gap-2'>
            {onDelete ? (
              <button
                type='button'
                onClick={onDelete}
                className='inline-flex h-9 shrink-0 items-center rounded-lg border border-rose-200 bg-white px-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50'
              >
                <Trash2 className='w-4 h-4' />
              </button>
            ) : null}
            <button
              type='button'
              className='inline-flex h-9 shrink-0 items-center rounded-lg bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-800'
              onClick={onOpen}
            >
              Abrir
            </button>
          </div>
        </div>

        <p className='line-clamp-2 min-h-[40px] text-sm leading-5 text-slate-500'>
          {doc.description || 'Sin descripción disponible para este documento.'}
        </p>

        <div className='flex items-center justify-between gap-3 border-t border-slate-100 pt-3'>
          <div className='min-w-0'>
            <p className='text-[11px] uppercase tracking-[0.14em] text-slate-400'>Versión</p>
            <p className='truncate text-xs font-medium text-slate-600'>{doc.version || 'Sin versión'}</p>
          </div>
          <div className='min-w-0 text-right'>
            <p className='text-[11px] uppercase tracking-[0.14em] text-slate-400'>Actualizado</p>
            <p className='truncate text-xs font-medium text-slate-600'>{formatUpdatedAt(doc.updatedAt || doc.planeUpdatedAt)}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default DocumentCard;
