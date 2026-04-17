function Modal({ title, onClose, children, width = 'max-w-2xl' }) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4'>
      <div className={`w-full ${width} overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl`}>
        <div className='flex items-center justify-between border-b border-slate-200 px-3 py-2'>
          <h3 className='text-base font-semibold text-slate-800'>{title}</h3>
          <button
            type='button'
            aria-label='Cerrar modal'
            className='rounded-md px-1.5 py-0.5 text-xs text-slate-500 transition hover:bg-slate-100'
            onClick={onClose}
          >
            x
          </button>
        </div>
        <div className='px-3 py-2.5'>{children}</div>
      </div>
    </div>
  );
}

export default Modal;
