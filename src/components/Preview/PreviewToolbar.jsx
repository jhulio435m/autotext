import ProcessAllButton from './ProcessAllButton';

export default function PreviewToolbar({ zoom, setZoom, onExportTex, onExportPdf, compact = false }) {
  return (
    <header className={`sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${compact ? 'p-2' : 'p-3'}`}>
      <div className='flex flex-wrap gap-2'>
        {[50, 62, 75, 100].map((value) => (
          <button
            key={value}
            type='button'
            className={`rounded-md border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm'} ${zoom === value ? '!border-blue-300 !bg-blue-50 !text-blue-700' : ''}`}
            onClick={() => setZoom(value)}
          >
            {value}%
          </button>
        ))}
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        <ProcessAllButton compact={compact} />
        <button type='button' className={`rounded-md border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm'}`} onClick={onExportTex}>
          .tex
        </button>
        <button type='button' className={`rounded-md border border-sky-700 bg-sky-700 font-semibold text-white hover:border-sky-800 hover:bg-sky-800 ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm'}`} onClick={onExportPdf}>
          PDF
        </button>
      </div>
    </header>
  );
}
