import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useMemo, useState } from 'react';
import useDocumentStore from '../../store';
import { generateLatex, isValueEmpty } from '../../utils/latex';

const EMPTY_COVER = Object.freeze({});

function renderMath(expression) {
  try {
    return katex.renderToString(expression || '', { throwOnError: false, displayMode: true });
  } catch {
    return '<span style="color:#dc2626">[Formula invalida]</span>';
  }
}

function Preview({ projectId }) {
  const [zoom, setZoom] = useState(100);

  const structure = useDocumentStore((state) => state.structure);
  const formData = useDocumentStore((state) => state.formData);
  const projectCoverConfig = useDocumentStore((state) => state.coverConfig[projectId]);
  const validateRequiredBeforeExport = useDocumentStore((state) => state.validateRequiredBeforeExport);
  const pushToast = useDocumentStore((state) => state.pushToast);
  const coverConfig = projectCoverConfig || EMPTY_COVER;

  const sections = useMemo(() => {
    const items = [];
    const walk = (nodes, prefix = []) => {
      (nodes || []).forEach((node, index) => {
        const current = [...prefix, index + 1];
        if (node.isStructure) {
          items.push({ id: node.id, title: node.title, number: current.join('.') });
          walk(node.children || [], current);
        }
      });
    };
    walk(structure, []);
    return items;
  }, [structure]);

  const renderBlock = (node) => {
    const value = formData[node.id];

    if (isValueEmpty(value)) {
      return <p className='rounded bg-rose-50 px-2 py-1 text-sm text-rose-700'>[PENDIENTE: {node.label || node.id}]</p>;
    }

    if (node.type === 'table') {
      const rows = value.rows || [];
      return (
        <div className='space-y-1'>
          {value.caption ? <p className='text-sm font-semibold'>Tabla: {value.caption}</p> : null}
          <table className='table-grid w-full border-collapse text-sm'>
            <thead>
              <tr>
                {(node.columnHeaders || []).map((header) => (
                  <th key={`${node.id}-${header}`} className='bg-slate-50 text-left'>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${node.id}-${rowIndex}`}>
                  {row.map((cell, colIndex) => (
                    <td key={`${node.id}-${rowIndex}-${colIndex}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {value.source ? <p className='text-xs text-slate-500'>Fuente: {value.source}</p> : null}
        </div>
      );
    }

    if (node.type === 'image') {
      return (
        <div className='space-y-2'>
          <img src={value.file} alt={node.label} className='max-h-72 rounded border border-slate-200 object-contain' />
          {value.caption ? <p className='text-sm'>{value.caption}</p> : null}
          {value.source ? <p className='text-xs text-slate-500'>Fuente: {value.source}</p> : null}
        </div>
      );
    }

    if (node.type === 'math') {
      return <div dangerouslySetInnerHTML={{ __html: renderMath(value || node.content) }} />;
    }

    return <p className='text-sm leading-relaxed'>{String(value)}</p>;
  };

  const renderNode = (node, prefix = []) => {
    if (node.isStructure) {
      return (
        <section key={node.id} className='mt-6'>
          <h2 className='text-xl font-bold text-slate-900'>
            {prefix.join('.')} {node.title}
          </h2>
          <div className='mt-3 space-y-3'>
            {(node.children || []).map((child, index) => renderNode(child, [...prefix, index + 1]))}
          </div>
        </section>
      );
    }

    return (
      <article key={node.id} className='space-y-2'>
        <h3 className='text-sm font-semibold text-slate-700'>{node.label || node.id}</h3>
        {renderBlock(node)}
      </article>
    );
  };

  const handleExportTex = () => {
    const validation = validateRequiredBeforeExport();
    if (!validation.ok) {
      pushToast('Hay campos obligatorios vacios. Revisa el formulario.', 'warning');
      return;
    }

    const tex = generateLatex(structure, formData, coverConfig);
    const blob = new Blob([tex], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'documento.tex';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    const validation = validateRequiredBeforeExport();
    if (!validation.ok) {
      pushToast('Completa los campos obligatorios antes de exportar PDF.', 'warning');
      return;
    }
    window.print();
  };

  return (
    <section className='space-y-3'>
      <header className='soft-panel flex flex-wrap items-center justify-between gap-2 p-3'>
        <div className='flex flex-wrap gap-2'>
          {[75, 100, 125].map((value) => (
            <button
              key={value}
              type='button'
              className={`btn-ghost px-3 py-1 text-sm ${zoom === value ? '!border-blue-300 !bg-blue-50 !text-blue-700' : ''}`}
              onClick={() => setZoom(value)}
            >
              {value}%
            </button>
          ))}
        </div>

        <div className='flex flex-wrap gap-2'>
          <button type='button' className='btn-ghost px-3 py-1 text-sm' onClick={() => window.print()}>Imprimir</button>
          <button type='button' className='btn-ghost px-3 py-1 text-sm' onClick={handleExportTex}>Exportar .tex</button>
          <button type='button' className='btn-primary px-3 py-1 text-sm' onClick={handleExportPdf}>Exportar PDF</button>
        </div>
      </header>

      <div className='soft-panel overflow-auto bg-slate-100 p-6'>
        <article
          className='mx-auto rounded-lg bg-white p-10 shadow-lg'
          style={{
            width: '210mm',
            minHeight: '297mm',
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            fontFamily: 'Georgia, serif'
          }}
        >
          <section className='border-b border-slate-200 pb-8 text-center'>
            <h1 className='text-3xl font-black'>{coverConfig.title || 'CARATULA'}</h1>
            <p className='mt-2 text-sm text-slate-500'>{coverConfig.companyName || 'Empresa'}</p>
            <p className='text-sm text-slate-500'>{coverConfig.docCode || 'Codigo'} | {coverConfig.version || 'Version'} | {coverConfig.date || '--'}</p>
          </section>

          <section className='mt-8'>
            <h2 className='text-lg font-bold'>Tabla de contenidos</h2>
            <ul className='mt-2 space-y-1 text-sm'>
              {sections.map((section) => (
                <li key={section.id}>{section.number}. {section.title}</li>
              ))}
            </ul>
          </section>

          <section className='mt-8 space-y-5'>
            {structure.map((node, index) => renderNode(node, [index + 1]))}
          </section>
        </article>
      </div>
    </section>
  );
}

export default Preview;
