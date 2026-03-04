function ProgressBar({ value, total, percent }) {
  return (
    <div className='rounded-md border border-slate-200 bg-white p-3'>
      <div className='mb-2 flex items-center justify-between text-xs text-slate-600'>
        <span className='font-semibold'>Progreso de campos obligatorios</span>
        <span>{percent}% ({value}/{total})</span>
      </div>
      <div className='h-2 rounded-sm bg-slate-200'>
        <div
          className='h-2 rounded-sm bg-blue-600'
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
