function TableEditor({ block, value, onChange }) {
  const rows = value?.rows || [];
  const headers = block.columnHeaders || [];

  const updateCell = (rowIndex, colIndex, cellValue) => {
    const nextRows = rows.map((row, rIndex) =>
      rIndex === rowIndex ? row.map((cell, cIndex) => (cIndex === colIndex ? cellValue : cell)) : row
    );
    onChange({ ...value, rows: nextRows });
  };

  const addRow = () => {
    const newRow = Array.from({ length: block.columnCount || headers.length || 1 }, () => '');
    onChange({ ...value, rows: [...rows, newRow] });
  };

  const removeRow = (index) => {
    onChange({ ...value, rows: rows.filter((_, rowIndex) => rowIndex !== index) });
  };

  return (
    <div className='space-y-2'>
      <div className='overflow-auto rounded-md border border-slate-200'>
        <table className='min-w-full border-collapse text-xs'>
          <thead className='bg-slate-50'>
            <tr>
              {headers.map((header) => (
                <th key={`${block.id}-${header}`} className='border border-slate-200 px-2 py-1 text-left'>{header}</th>
              ))}
              <th className='border border-slate-200 px-2 py-1'>Accion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${block.id}-row-${rowIndex}`}>
                {row.map((cell, colIndex) => (
                  <td key={`${block.id}-cell-${rowIndex}-${colIndex}`} className='border border-slate-200 p-1'>
                    <input
                      value={cell}
                      onChange={(event) => updateCell(rowIndex, colIndex, event.target.value)}
                      className='w-full rounded border border-slate-200 px-2 py-1 text-xs'
                    />
                  </td>
                ))}
                <td className='border border-slate-200 px-2 py-1 text-center'>
                  <button type='button' className='text-rose-600' onClick={() => removeRow(rowIndex)}>x</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type='button' className='rounded border border-slate-200 px-2 py-1 text-xs' onClick={addRow}>+ Agregar fila</button>

      {block.hasCaption ? (
        <input
          value={value?.caption || ''}
          onChange={(event) => onChange({ ...value, caption: event.target.value })}
          placeholder='Titulo / caption'
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
          placeholder='Descripcion'
          rows={2}
          className='w-full rounded border border-slate-200 px-2 py-1 text-xs'
        />
      ) : null}
    </div>
  );
}

export default TableEditor;
