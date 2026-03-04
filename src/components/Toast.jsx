function Toast({ toast, onClose }) {
  const tone = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
    info: 'border-blue-200 bg-blue-50 text-blue-900'
  };

  return (
    <div className={`animate-pop-in pointer-events-auto flex items-start justify-between gap-3 rounded-xl border px-3 py-2 shadow-lg ${tone[toast.type] || tone.info}`}>
      <p className='text-sm leading-snug'>{toast.message}</p>
      <button
        type='button'
        aria-label='Cerrar notificacion'
        className='rounded px-1.5 py-0.5 text-xs font-bold text-slate-500 hover:bg-white/70 hover:text-slate-800'
        onClick={() => onClose(toast.id)}
      >
        x
      </button>
    </div>
  );
}

export default Toast;
