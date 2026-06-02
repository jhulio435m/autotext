const options = [
  { key: 'rich_text', label: 'Texto', icon: 'Tx' },
  { key: 'template_text', label: 'Texto plantilla', icon: 'Tp' },
  { key: 'table', label: 'Tabla', icon: 'Tb' },
  { key: 'image', label: 'Imagen', icon: 'Im' },
  { key: 'diagram', label: 'Diagrama', icon: 'Dg' },
  { key: 'input', label: 'Variable', icon: 'Vr' },
  { key: 'math', label: 'Formula matematica', icon: 'Fx' },
  { key: 'section', label: 'Sub-seccion', icon: 'Sc' }
];

function InsertMenu({ onSelect }) {
  return (
    <div className='absolute right-0 top-8 z-20 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl'>
      <p className='px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500'>Agregar elemento</p>
      <div className='space-y-1'>
        {options.map((option) => (
          <button
            key={option.key}
            type='button'
            className='flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-700 transition hover:bg-slate-100'
            onClick={() => onSelect(option.key)}
          >
            <span className='inline-flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-500'>{option.icon}</span>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default InsertMenu;
