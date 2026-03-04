import { useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

function MathEditor({ value, onChange, variables = [], onVariableChange }) {
  const [error, setError] = useState('');

  let html = '';
  try {
    html = katex.renderToString(value || '', { throwOnError: false, displayMode: true });
    if (error) setError('');
  } catch {
    html = '';
    if (!error) setError('Expresion invalida');
  }

  return (
    <div className='space-y-2'>
      <textarea
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className='w-full rounded-md border border-slate-200 px-2 py-1 text-sm'
        placeholder='Escribe expresion LaTeX'
      />

      <div className='rounded-md border border-slate-200 bg-white p-2'>
        {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <p className='text-xs text-slate-500'>Sin expresion</p>}
      </div>

      {error ? <p className='text-xs text-rose-600'>{error}</p> : null}

      {variables.length ? (
        <div className='grid gap-2 sm:grid-cols-2'>
          {variables.map((variable) => (
            <label key={variable} className='text-xs text-slate-600'>
              {variable}
              <input
                value={onVariableChange?.values?.[variable] || ''}
                onChange={(event) => onVariableChange?.set(variable, event.target.value)}
                className='mt-1 w-full rounded border border-slate-200 px-2 py-1 text-xs'
              />
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default MathEditor;
