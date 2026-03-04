import { useMemo, useState } from 'react';
import useDocumentStore from '../../store';
import { calculateProgress, getRequiredBlocks, isValueEmpty } from '../../utils/latex';
import FormField from '../FormField';
import ProgressBar from '../ProgressBar';

function DynamicForm() {
  const structure = useDocumentStore((state) => state.structure);
  const formData = useDocumentStore((state) => state.formData);
  const getCurrentDocument = useDocumentStore((state) => state.getCurrentDocument);

  const [expanded, setExpanded] = useState({});

  const doc = getCurrentDocument();

  const required = useMemo(() => getRequiredBlocks(structure), [structure]);
  const filled = required.filter((node) => !isValueEmpty(formData[node.id]));
  const percent = calculateProgress(structure, formData);

  const toggle = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNode = (node, numbering = []) => {
    if (node.isStructure) {
      const open = expanded[node.id] ?? true;
      const title = [...numbering].join('.');
      const missingInside = (node.children || []).some((child) => {
        if (child.isStructure) return false;
        return child.required && isValueEmpty(formData[child.id]);
      });

      return (
        <section key={node.id} className='soft-panel overflow-hidden'>
          <button
            type='button'
            className='flex w-full items-center justify-between bg-white px-4 py-3 text-left'
            onClick={() => toggle(node.id)}
          >
            <div>
              <h3 className='text-sm font-bold text-slate-800'>
                {title ? `${title}. ` : ''}
                {node.title}
              </h3>
              <p className='text-[11px] text-slate-500'>{(node.children || []).length} elementos</p>
            </div>
            <div className='flex items-center gap-2'>
              {missingInside ? <span className='rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700'>pendiente</span> : null}
              <span className={`text-xs text-slate-500 transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
            </div>
          </button>

          <div className={`overflow-hidden border-t border-slate-200 transition-[max-height,opacity] duration-200 ${open ? 'max-h-[999px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className='space-y-4 bg-slate-50 p-4'>
              {(node.children || []).map((child, index) => renderNode(child, [...numbering, index + 1]))}
            </div>
          </div>
        </section>
      );
    }

    const missingRequired = node.required && isValueEmpty(formData[node.id]);

    return (
      <article key={node.id} className='rounded-lg border border-slate-200 bg-white p-3'>
        <div className='mb-2 flex items-center justify-between gap-2'>
          <h4 className='text-sm font-semibold text-slate-800'>
            {node.label || node.id}
            {node.required ? <span className='ml-1 text-rose-600'>*</span> : null}
          </h4>
          <span className='rounded-full bg-slate-100 px-2 py-0.5 text-[11px] uppercase text-slate-500'>{node.type || 'text'}</span>
        </div>

        {node.content ? <p className='mb-2 text-xs text-slate-500'>{node.content}</p> : null}

        <FormField block={node} value={formData[node.id]} readOnlyMobile />

        {missingRequired ? <p className='mt-2 text-xs text-rose-600'>Campo obligatorio pendiente.</p> : null}
      </article>
    );
  };

  return (
    <section className='space-y-4'>
      <header className='soft-panel p-4'>
        <h1 className='text-lg font-bold text-slate-900'>Formulario: {doc?.name || 'Documento'}</h1>
        <p className='mt-1 text-xs text-slate-500'>Completa bloques obligatorios para habilitar exportacion sin advertencias LaTeX.</p>
        <div className='mt-3'>
          <ProgressBar value={filled.length} total={required.length || 0} percent={percent} />
        </div>
      </header>

      <div className='space-y-3'>
        {structure.map((node, index) => renderNode(node, [index + 1]))}
      </div>

      <footer className='sticky bottom-4 flex justify-end'>
        <p className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600'>
          El progreso se guarda automaticamente.
        </p>
      </footer>
    </section>
  );
}

export default DynamicForm;
