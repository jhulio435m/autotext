import { useEffect, useState } from 'react';
import useDocumentStore from '../store';
import MathEditor from './MathEditor';
import ImageUploader from './ImageUploader';
import { apiGenerateDiagram, apiGenerateText } from '../api/client';
import { interpolate } from '../utils/latex';
import AutoTextarea from './ui/AutoTextarea';
import LazyRichTextEditor from './ui/LazyRichTextEditor';
import LazyTableEditor from './ui/LazyTableEditor';
import { getBlockCompletionState } from '../utils/section-guide';
import { sanitizeRichTextHtml, wrapPlainTextAsRichText } from '../utils/richText';

function useIsMobile() {
  const getMatches = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(max-width: 767px)').matches;
  };

  const [isMobile, setIsMobile] = useState(getMatches);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const query = window.matchMedia('(max-width: 767px)');
    const handler = (event) => setIsMobile(event.matches);

    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', handler);
      return () => query.removeEventListener('change', handler);
    }

    query.addListener(handler);
    return () => query.removeListener(handler);
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
  const blockState = getBlockCompletionState(block, value);
  const stateClassName =
    blockState.tone === 'complete'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : blockState.tone === 'pending'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-slate-200 bg-slate-50 text-slate-600';

  const fieldMeta = (
    <div className='flex flex-wrap items-center gap-2'>
      <span className='text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400'>
        {block.type === 'variable' ? 'Campo' : 'Contenido'}
      </span>
      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${stateClassName}`}>
        {blockState.label}
      </span>
    </div>
  );

  if (['text', 'rich_text', 'template_text', 'ai_text'].includes(block.type)) {
    const textValue = typeof value === 'string' && value !== '' ? value : (block.template || block.content || '');
    const aiPrompt = block.type === 'ai_text' ? interpolate(block.promptTemplate || '', formData) : '';
    const words = textValue.trim() ? textValue.trim().split(/\s+/).length : 0;

    return (
      <div className={`space-y-2 ${mobileReadonlyClass}`}>
        {fieldMeta}
        {block.type === 'ai_text' && (
          <div className='rounded-md border border-slate-200 bg-slate-50 px-3 py-2'>
            <p className='text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500'>Prompt resuelto</p>
            <p className='mt-1 text-xs leading-5 text-slate-600'>{aiPrompt || 'Define un prompt plantilla para este bloque.'}</p>
          </div>
        )}
        
        <LazyRichTextEditor
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
              onClick={async () => {
                setLoadingIA(true);
                try {
                  const prompt = block.type === 'ai_text' ? aiPrompt : block.promptIA;
                  const result = await apiGenerateText(prompt || block.label || '', {});
                  if (result?.html) {
                    updateFormData(block.id, sanitizeRichTextHtml(result.html));
                  } else {
                    updateFormData(block.id, sanitizeRichTextHtml(result?.text) || wrapPlainTextAsRichText(result?.text || 'Sin respuesta de IA'));
                  }
                } catch {
                  updateFormData(block.id, wrapPlainTextAsRichText('Error al generar con IA.'));
                } finally {
                  setLoadingIA(false);
                }
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
    return (
      <div className={`space-y-2 ${mobileReadonlyClass}`}>
        {fieldMeta}
        <LazyTableEditor block={block} value={value || { rows: [] }} onChange={(next) => updateFormData(block.id, next)} />
      </div>
    );
  }

  if (block.type === 'image') {
    return (
      <div className={`space-y-2 ${mobileReadonlyClass}`}>
        {fieldMeta}
        <ImageUploader block={block} value={value || {}} onChange={(next) => updateFormData(block.id, next)} />
      </div>
    );
  }


  if (block.type === 'diagram') {
    const diagramValue = value && typeof value === 'object' ? value : { code: value || block.content || '', format: block.diagramFormat || 'mermaid' };
    return (
      <div className={`space-y-2 ${mobileReadonlyClass}`}>
        {fieldMeta}
        <textarea
          rows={5}
          value={diagramValue.code || ''}
          disabled={disabled}
          onChange={(event) => updateFormData(block.id, { ...diagramValue, code: event.target.value })}
          className='w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs text-slate-800 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100'
        />
        <div className='flex flex-wrap items-center gap-2'>
          <input
            type='text'
            value={block.promptIA || ''}
            disabled={disabled}
            placeholder='Describe el diagrama para generarlo con IA'
            onChange={(event) => updateNodeProps(block.id, { promptIA: event.target.value })}
            className='w-full sm:min-w-[220px] flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300'
          />
          <button
            type='button'
            disabled={loadingIA || disabled}
            onClick={async () => {
              setLoadingIA(true);
              try {
                const result = await apiGenerateDiagram(block.promptIA || block.label || 'diagrama tecnico', diagramValue.format || 'mermaid');
                updateFormData(block.id, { ...diagramValue, code: result?.code || diagramValue.code || '', format: result?.format || diagramValue.format || 'mermaid' });
              } finally {
                setLoadingIA(false);
              }
            }}
            className='rounded-md border border-sky-700 bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50'
          >
            {loadingIA ? 'Generando...' : 'Generar'}
          </button>
        </div>
      </div>
    );
  }

  if (block.type === 'latex_graph') {
    return (
      <div className={`space-y-2 ${mobileReadonlyClass}`}>
        {fieldMeta}
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
        <div className={`space-y-2 ${mobileReadonlyClass}`}>
          {fieldMeta}
          <AutoTextarea
            minRows={1}
            value={value || ''}
            disabled={disabled}
            placeholder={block.inputPlaceholder || ''}
            onChange={(event) => updateFormData(block.id, event.target.value)}
            className='w-full rounded-md border border-slate-200 px-3 py-2 text-sm'
          />
        </div>
      );
    }

    if (block.inputType === 'boolean') {
      return (
        <div className={`space-y-2 ${mobileReadonlyClass}`}>
          {fieldMeta}
          <label className='flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700'>
            <input
              type='checkbox'
              checked={Boolean(value)}
              disabled={disabled}
              onChange={(event) => updateFormData(block.id, event.target.checked)}
            />
            {block.inputPlaceholder || 'Si / No'}
          </label>
        </div>
      );
    }

    if (block.inputType === 'number') {
      return (
        <div className={`space-y-2 ${mobileReadonlyClass}`}>
          {fieldMeta}
          <div className='flex items-center gap-2'>
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
        </div>
      );
    }

    if (block.inputType === 'date') {
      return (
        <div className={`space-y-2 ${mobileReadonlyClass}`}>
          {fieldMeta}
          <input
            type='date'
            value={value || ''}
            disabled={disabled}
            onChange={(event) => updateFormData(block.id, event.target.value)}
            className='w-full rounded-md border border-slate-200 px-3 py-2 text-sm'
          />
        </div>
      );
    }

    if (block.inputType === 'select') {
      return (
        <div className={`space-y-2 ${mobileReadonlyClass}`}>
          {fieldMeta}
          <select
            value={value || ''}
            disabled={disabled}
            onChange={(event) => updateFormData(block.id, event.target.value)}
            className='w-full rounded-md border border-slate-200 px-3 py-2 text-sm'
          >
            <option value=''>Seleccionar</option>
            {(block.inputOptions || []).map((option) => (
              <option key={`${block.id}-${option}`} value={option}>{option}</option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div className={`space-y-2 ${mobileReadonlyClass}`}>
        {fieldMeta}
        <input
          type='text'
          value={value || ''}
          disabled={disabled}
          placeholder={block.inputPlaceholder || ''}
          onChange={(event) => updateFormData(block.id, event.target.value)}
          className='w-full rounded-md border border-slate-200 px-3 py-2 text-sm'
        />
      </div>
    );
  }



  return (
    <div className={`space-y-2 ${mobileReadonlyClass}`}>
      {fieldMeta}
      <input
        type='text'
        value={value || ''}
        disabled={disabled}
        onChange={(event) => updateFormData(block.id, event.target.value)}
        placeholder={label}
        className='w-full rounded-md border border-slate-200 px-3 py-2 text-sm'
      />
    </div>
  );
}

export default FormField;
