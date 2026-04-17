import { useEffect, useState } from 'react';
import useDocumentStore from '../store';
import MathEditor from './MathEditor';
import TableEditor from './TableEditor';
import ImageUploader from './ImageUploader';
import { interpolate } from '../utils/latex';
import AutoTextarea from './ui/AutoTextarea';
import RichTextEditor from './ui/RichTextEditor';

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
  const formData = useDocumentStore((state) => state.formData);
  const updateNodeProps = useDocumentStore((state) => state.updateNodeProps);
  const [loadingIA, setLoadingIA] = useState(false);
  const [mathVars, setMathVars] = useState({});

  const isMobile = useIsMobile();
  const disabled = readOnlyMobile && isMobile;

  const label = block.label || block.id;
  const mobileReadonlyClass = disabled ? 'max-md:pointer-events-none max-md:opacity-80 max-md:grayscale-[0.08]' : '';

  if (['text', 'rich_text', 'template_text', 'ai_text'].includes(block.type)) {
    const textValue = typeof value === 'string' && value !== '' ? value : (block.template || block.content || '');
    const aiPrompt = block.type === 'ai_text' ? interpolate(block.promptTemplate || '', formData) : '';
    const words = textValue.trim() ? textValue.trim().split(/\s+/).length : 0;

    return (
      <div className={`space-y-2 ${mobileReadonlyClass}`}>
        {block.type === 'ai_text' && (
          <div className='rounded-md border border-slate-200 bg-slate-50 px-3 py-2'>
            <p className='text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500'>Prompt resuelto</p>
            <p className='mt-1 text-xs leading-5 text-slate-600'>{aiPrompt || 'Define un prompt plantilla para este bloque.'}</p>
          </div>
        )}
        
        <RichTextEditor
          value={textValue}
          onChange={(val) => updateFormData(block.id, val)}
          placeholder={block.label || 'Escribe aquí...'}
          savedPrompt={block.promptIA || ''}
          onSavePrompt={(prompt) => updateNodeProps(block.id, { promptIA: prompt })}
        />

        <div className='flex items-center justify-between text-xs text-slate-500'>
          <span>{words} palabras</span>
          {(block.promptIA || block.type === 'ai_text') && (
            <button
              type='button'
              disabled={loadingIA || disabled}
              className='rounded-md border border-slate-200 bg-white px-2 py-1 text-xs leading-4 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              onClick={() => {
                setLoadingIA(true);
                window.setTimeout(() => {
                  const prompt = block.type === 'ai_text' ? aiPrompt : block.promptIA;
                  updateFormData(block.id, `<p>Borrador IA generado desde: ${prompt || block.label || block.id}</p>`);
                  setLoadingIA(false);
                }, 700);
              }}
            >
              {loadingIA ? 'Generando...' : 'Generar con IA'}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (block.type === 'table') {
    return <div className={mobileReadonlyClass}><TableEditor block={block} value={value || { rows: [] }} onChange={(next) => updateFormData(block.id, next)} /></div>;
  }

  if (block.type === 'image') {
    return <div className={mobileReadonlyClass}><ImageUploader block={block} value={value || {}} onChange={(next) => updateFormData(block.id, next)} /></div>;
  }

  if (block.type === 'latex_graph') {
    return (
      <div className={mobileReadonlyClass}>
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

  if (block.type === 'variable') {
    if (block.inputType === 'textarea') {
      return (
        <AutoTextarea
          minRows={1}
          value={value || ''}
          disabled={disabled}
          placeholder={block.inputPlaceholder || ''}
          onChange={(event) => updateFormData(block.id, event.target.value)}
          className={`w-full rounded-md border border-slate-200 px-3 py-2 text-sm ${mobileReadonlyClass}`}
        />
      );
    }

    if (block.inputType === 'boolean') {
      return (
        <label className={`flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 ${mobileReadonlyClass}`}>
          <input
            type='checkbox'
            checked={Boolean(value)}
            disabled={disabled}
            onChange={(event) => updateFormData(block.id, event.target.checked)}
          />
          {block.inputPlaceholder || 'Si / No'}
        </label>
      );
    }

    if (block.inputType === 'number') {
      return (
        <div className={`flex items-center gap-2 ${mobileReadonlyClass}`}>
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
          className={`w-full rounded-md border border-slate-200 px-3 py-2 text-sm ${mobileReadonlyClass}`}
        />
      );
    }

    if (block.inputType === 'select') {
      return (
        <select
          value={value || ''}
          disabled={disabled}
          onChange={(event) => updateFormData(block.id, event.target.value)}
          className={`w-full rounded-md border border-slate-200 px-3 py-2 text-sm ${mobileReadonlyClass}`}
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
        className={`w-full rounded-md border border-slate-200 px-3 py-2 text-sm ${mobileReadonlyClass}`}
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
      className={`w-full rounded-md border border-slate-200 px-3 py-2 text-sm ${mobileReadonlyClass}`}
    />
  );
}

export default FormField;
