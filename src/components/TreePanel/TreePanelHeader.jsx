import { ChevronLeft, Plus } from 'lucide-react';

export default function TreePanelHeader({ query, setQuery, onToggleCollapsed, onAddSection }) {
  return (
    <header className='border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-3 py-3'>
      <div className='flex items-start justify-between gap-2'>
        <div>
          <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400'>Navegación</p>
          <h3 className='mt-1 text-sm font-semibold text-slate-900'>Estructura</h3>
        </div>
        <div className='flex items-center gap-1.5'>
          <button
            type='button'
            aria-label='Agregar sección raíz'
            title='Agregar sección'
            className='inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50'
            onClick={onAddSection}
          >
            <Plus className='h-4 w-4' />
          </button>
          <button
            type='button'
            aria-label='Colapsar panel estructura'
            title='Colapsar panel'
            className='inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-[13px] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50'
            onClick={() => onToggleCollapsed?.(true)}
          >
            <ChevronLeft className='h-4 w-4' />
          </button>
        </div>
      </div>

      <div className='mt-3 flex items-center gap-2'>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder='Buscar sección'
          className='w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none transition focus:border-slate-300'
        />
        {query ? (
          <button
            type='button'
            className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50'
            onClick={() => setQuery('')}
            aria-label='Limpiar búsqueda'
          >
            ×
          </button>
        ) : null}
      </div>
    </header>
  );
}
