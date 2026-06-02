import { ChevronLeft, Plus } from 'lucide-react';

export default function TreePanelHeader({ query, setQuery, onToggleCollapsed, onAddSection }) {
  return (
    <header className='border-b border-slate-200 px-3 py-2'>
      <div className='flex items-center justify-between'>
        <h3 className='text-xs font-semibold text-slate-700'>Secciones del documento</h3>
        <div className='flex items-center gap-0.5'>
          <button
            type='button'
            aria-label='Agregar sección'
            title='Agregar sección'
            className='inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 transition-colors hover:text-slate-600'
            onClick={onAddSection}
          >
            <Plus className='h-3.5 w-3.5' />
          </button>
          <button
            type='button'
            aria-label='Colapsar panel'
            title='Colapsar panel'
            className='inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 transition-colors hover:text-slate-600'
            onClick={() => onToggleCollapsed?.(true)}
          >
            <ChevronLeft className='h-3.5 w-3.5' />
          </button>
        </div>
      </div>

      <div className='mt-2'>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Buscar...'
          className='w-full rounded-md border border-slate-200 px-2 py-1 text-xs outline-none transition focus:border-slate-300'
        />
      </div>
    </header>
  );
}
