import { useEffect, useState } from 'react';
import useDocumentStore from '../store';
import MathEditor from './MathEditor';
import TableEditor from './TableEditor';
import ImageUploader from './ImageUploader';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const handler = (event) => setIsMobile(event.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);

  return isMobile;
}

function FormField({ block, value, readOnlyMobile = false }) {
  const updateFormData = useDocumentStore((state) => state.updateFormData);
  const [loadingIA, setLoadingIA] = useState(false);
  const [mathVars, setMathVars] = useState({});

  const isMobile = useIsMobile();
  const disabled = readOnlyMobile && isMobile;

  const label = block.label || block.id;

  if (block.type === 'text') {
    const textValue = value || '';
    const words = textValue.trim() ? textValue.trim().split(/\s+/).length : 0;
    return (
      <div className={`space-y-2 ${disabled ? 'mobile-readonly' : ''}`}>
        <textarea
          rows={4}
          value={textValue}
          disabled={disabled}
          onChange={(event) => updateFormData(block.id, event.target.value)}
          className={`w-full rounded-md border px-3 py-2 text-sm ${block.required && !textValue ? 'border-rose-300' : 'border-slate-200'}`}
        />
        <div className='flex items-center justify-between text-xs text-slate-500'>
          <span>{words} palabras</span>
          {block.promptIA ? (
            <button
              type='button'
              disabled={loadingIA || disabled}
              className='btn-ghost px-2 py-1 text-xs'
              onClick={() => {
                setLoadingIA(true);
                window.setTimeout(() => {
                  updateFormData(block.id, `Borrador IA: ${block.promptIA}`);
                  setLoadingIA(false);
                }, 700);
              }}
            >
              {loadingIA ? 'Generando...' : 'Generar con IA'}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (block.type === 'table') {
    return <div className={disabled ? 'mobile-readonly' : ''}><TableEditor block={block} value={value || { rows: [] }} onChange={(next) => updateFormData(block.id, next)} /></div>;
  }

  if (block.type === 'image') {
    return <div className={disabled ? 'mobile-readonly' : ''}><ImageUploader block={block} value={value || {}} onChange={(next) => updateFormData(block.id, next)} /></div>;
  }

  if (block.type === 'math') {
    return (
      <div className={disabled ? 'mobile-readonly' : ''}>
        <MathEditor
          value={typeof value === 'string' ? value : ''}
          variables={block.mathVariables || []}
          onChange={(next) => updateFormData(block.id, next)}
          onVariableChange={{
            values: mathVars,
            set: (varName, varValue) => setMathVars((prev) => ({ ...prev, [varName]: varValue }))
          }}
        />
      </div>
    );
  }

  if (block.type === 'input') {
    if (block.inputType === 'number') {
      return (
        <div className={`flex items-center gap-2 ${disabled ? 'mobile-readonly' : ''}`}>
          <input
            type='number'
            value={value ?? ''}
            disabled={disabled}
            min={block.inputMin}
            max={block.inputMax}
            placeholder={block.inputPlaceholder || ''}
            onChange={(event) => updateFormData(block.id, event.target.value === '' ? '' : Number(event.target.value))}
            className='w-full rounded-md border border-slate-200 px-3 py-2 text-sm'
          />
          <span className='text-xs text-slate-500'>{block.inputUnit || ''}</span>
        </div>
      );
    }

    if (block.inputType === 'date') {
      return (
        <input
          type='date'
          value={value || ''}
          disabled={disabled}
          onChange={(event) => updateFormData(block.id, event.target.value)}
          className={`w-full rounded-md border border-slate-200 px-3 py-2 text-sm ${disabled ? 'mobile-readonly' : ''}`}
        />
      );
    }

    if (block.inputType === 'select') {
      return (
        <select
          value={value || ''}
          disabled={disabled}
          onChange={(event) => updateFormData(block.id, event.target.value)}
          className={`w-full rounded-md border border-slate-200 px-3 py-2 text-sm ${disabled ? 'mobile-readonly' : ''}`}
        >
          <option value=''>Seleccionar</option>
          {(block.inputOptions || []).map((option) => (
            <option key={`${block.id}-${option}`} value={option}>{option}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        type='text'
        value={value || ''}
        disabled={disabled}
        placeholder={block.inputPlaceholder || ''}
        onChange={(event) => updateFormData(block.id, event.target.value)}
        className={`w-full rounded-md border border-slate-200 px-3 py-2 text-sm ${disabled ? 'mobile-readonly' : ''}`}
      />
    );
  }

  return (
    <input
      type='text'
      value={value || ''}
      disabled={disabled}
      onChange={(event) => updateFormData(block.id, event.target.value)}
      placeholder={label}
      className={`w-full rounded-md border border-slate-200 px-3 py-2 text-sm ${disabled ? 'mobile-readonly' : ''}`}
    />
  );
}

export default FormField;
