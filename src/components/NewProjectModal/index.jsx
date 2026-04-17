import { useState } from 'react';
import Modal from '../ui/Modal';
import useDocumentStore from '../../store';

const COLORS = ['#006399', '#1d4ed8', '#4338ca', '#0f766e', '#15803d', '#b45309', '#be123c', '#374151'];

function NewProjectModal({ onClose }) {
  const addProject = useDocumentStore((state) => state.addProject);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [accentColor, setAccentColor] = useState(COLORS[0]);

  const disabled = !name.trim();

  return (
    <Modal title='Nuevo proyecto' onClose={onClose} width='max-w-lg'>
      <div className='space-y-4'>
        <p className='text-xs text-slate-500'>Define los metadatos iniciales del proyecto tecnico.</p>

        <div>
          <label className='mb-1 block text-xs font-semibold text-slate-600'>Nombre del proyecto</label>
          <input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500' />
        </div>

        <div>
          <label className='mb-1 block text-xs font-semibold text-slate-600'>Descripcion breve</label>
          <textarea value={description} maxLength={200} onChange={(event) => setDescription(event.target.value)} rows={3} className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500' />
        </div>

        <div>
          <label className='mb-1 block text-xs font-semibold text-slate-600'>Codigo interno</label>
          <input value={code} onChange={(event) => setCode(event.target.value)} className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500' />
        </div>

        <div>
          <label className='mb-2 block text-xs font-semibold text-slate-600'>Color de acento</label>
          <div className='flex flex-wrap gap-2'>
            {COLORS.map((color) => (
              <button
                type='button'
                key={color}
                aria-label={`Seleccionar color ${color}`}
                onClick={() => setAccentColor(color)}
                className={`h-8 w-8 rounded-full border-2 transition ${accentColor === color ? 'scale-110 border-sky-700' : 'border-transparent'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className='flex justify-end gap-2'>
          <button type='button' className='rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50' onClick={onClose}>Cancelar</button>
          <button
            type='button'
            disabled={disabled}
            className='rounded-md border border-sky-700 bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:border-sky-800 hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50'
            onClick={() => {
              addProject({ name: name.trim(), description: description.trim(), code: code.trim(), accentColor });
              onClose();
            }}
          >
            Crear proyecto
          </button>
        </div>
      </div>
   </Modal>
  );
}

export default NewProjectModal;
