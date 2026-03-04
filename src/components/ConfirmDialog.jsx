import Modal from './Modal';

function ConfirmDialog({ open, title, message, onCancel, onConfirm, confirmLabel = 'Eliminar' }) {
  if (!open) return null;

  return (
    <Modal title={title} onClose={onCancel} width='max-w-md'>
      <p className='text-sm text-slate-600'>{message}</p>
      <div className='mt-5 flex justify-end gap-2'>
        <button
          type='button'
          className='rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50'
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          type='button'
          className='rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700'
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
