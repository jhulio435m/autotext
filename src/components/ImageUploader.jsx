function ImageUploader({ value, onChange, block }) {
  const fileUrl = value?.file || '';

  const readFile = (file) => {
    const reader = new FileReader();
    reader.onload = () => onChange({ ...value, file: reader.result });
    reader.readAsDataURL(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  return (
    <div className='space-y-2'>
      <div
        className='rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500'
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <p>Arrastra una imagen o selecciona archivo (JPG/PNG/PDF/EPS, max 10MB)</p>
        <input
          type='file'
          accept='.jpg,.jpeg,.png,.pdf,.eps'
          className='mt-2 text-xs'
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) readFile(file);
          }}
        />
      </div>

      {fileUrl ? (
        <div className='space-y-2'>
          <img src={fileUrl} alt='preview' className='max-h-48 rounded-md border border-slate-200 object-contain' />
          <button type='button' className='text-xs text-rose-600' onClick={() => onChange({ ...value, file: '' })}>Eliminar imagen</button>
        </div>
      ) : null}

      {block.hasCaption ? (
        <input
          value={value?.caption || ''}
          onChange={(event) => onChange({ ...value, caption: event.target.value })}
          placeholder='Caption'
          className='w-full rounded border border-slate-200 px-2 py-1 text-xs'
        />
      ) : null}

      {block.hasSource ? (
        <input
          value={value?.source || ''}
          onChange={(event) => onChange({ ...value, source: event.target.value })}
          placeholder='Fuente'
          className='w-full rounded border border-slate-200 px-2 py-1 text-xs'
        />
      ) : null}

      {block.hasDescription ? (
        <textarea
          value={value?.description || ''}
          onChange={(event) => onChange({ ...value, description: event.target.value })}
          rows={2}
          placeholder='Descripcion'
          className='w-full rounded border border-slate-200 px-2 py-1 text-xs'
        />
      ) : null}
    </div>
  );
}

export default ImageUploader;
