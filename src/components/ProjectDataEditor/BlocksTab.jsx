import { useState, useMemo } from 'react';
import { Database, Plus, Trash2, Edit2, Save, LayoutTemplate } from 'lucide-react';
import useDocumentStore from '../../store';
import BlockTemplateEditorModal from './BlockTemplateEditorModal';

function normalizeVariableId(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_');
}

export default function BlocksTab({ projectId }) {
  const coverConfig = useDocumentStore((state) => state.coverConfig[projectId] || {});
  const projectVariables = coverConfig.projectVariables || [];
  const projectData = coverConfig.projectData || {};
  const updateCoverConfig = useDocumentStore((state) => state.updateCoverConfig);
  const updatePreviewFormDataBulk = useDocumentStore((state) => state.updatePreviewFormDataBulk);

  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [activeBlockKey, setActiveBlockKey] = useState(null);
  const [activeBlockData, setActiveBlockData] = useState(null);

  const [addingNewBlock, setAddingNewBlock] = useState(false);
  const [draftBlock, setDraftBlock] = useState({ label: '', blockType: 'table' });

  const list = useMemo(() => {
    return projectVariables.map(v => ({
      ...v,
      value: projectData[v.key] ?? v.value ?? ''
    }));
  }, [projectVariables, projectData]);

  const blockVariables = list.filter(v => v.type === 'block');

  const commitVariableChange = (nextVars, nextData) => {
    updateCoverConfig(projectId, {
      projectVariables: nextVars,
      projectData: nextData
    });
    updatePreviewFormDataBulk(nextData);
  };

  const startNewBlock = () => {
    setDraftBlock({ label: '', blockType: 'table' });
    setAddingNewBlock(true);
  };

  const handleSaveBlockHeader = () => {
    // Generate a random ID under the hood
    const baseKey = normalizeVariableId(draftBlock.label) || 'bloque';
    const key = `var_${baseKey}_${Math.random().toString(36).substring(2, 6)}`;

    let nextVars = [...projectVariables];
    nextVars.push({ key, label: draftBlock.label || 'Bloque sin nombre', type: 'block', value: '' });
    
    // Create default block schema
    const initialSchema = {
      type: draftBlock.blockType,
      nodeProps: { label: draftBlock.label || 'Bloque sin nombre', id: key },
      formData: draftBlock.blockType === 'table' ? { rows: [] } : {}
    };
    
    const nextData = { ...projectData, [key]: JSON.stringify(initialSchema) };
    commitVariableChange(nextVars, nextData);
    
    setAddingNewBlock(false);
    
    // Auto-open the editor
    setActiveBlockKey(key);
    setActiveBlockData(initialSchema);
    setEditorModalOpen(true);
  };

  const openBlockEditor = (v) => {
    setActiveBlockKey(v.key);
    // Use 'text' as a safer fallback than 'table' if parsing fails
    let parsed = { type: 'text', nodeProps: { label: v.label, id: v.key } };
    try {
      if (typeof v.value === 'string' && (v.value.trim().startsWith('{') || v.value.trim().startsWith('['))) {
        const result = JSON.parse(v.value);
        if (result && result.type) {
          parsed = result;
        }
      }
    } catch (e) {
      console.error('Error parsing block data:', e);
    }
    
    setActiveBlockData(parsed);
    setEditorModalOpen(true);
  };

  const handleDelete = (key) => {
    const nextVars = projectVariables.filter(v => v.key !== key);
    const nextData = { ...projectData };
    delete nextData[key];
    commitVariableChange(nextVars, nextData);
  };

  const handleSaveModalBlock = (blockSchema) => {
    const key = activeBlockKey;
    if (!key) return;
    
    const jsonString = JSON.stringify(blockSchema);
    
    let nextVars = [...projectVariables];
    const isExisting = nextVars.some(v => v.key === key);
    if (!isExisting) {
       nextVars.push({ key, label: blockSchema.nodeProps?.label || key, type: 'block', value: '' });
    } else {
       nextVars = nextVars.map(v => v.key === key ? { ...v, label: blockSchema.nodeProps?.label || v.label } : v);
    }
    
    const nextData = { ...projectData, [key]: jsonString };
    commitVariableChange(nextVars, nextData);
    setEditorModalOpen(false);
  };

  return (
    <div className='space-y-6'>
      <div className='overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)]'>
        <div className='flex items-center justify-between px-5 py-4 border-b border-slate-200'>
          <div>
            <h2 className='flex items-center gap-2 text-base font-semibold text-slate-900'>
              <LayoutTemplate className='h-4 w-4 text-emerald-500' />
              Biblioteca de Bloques Reutilizables
            </h2>
            <p className='mt-1 text-sm text-slate-500'>
              Plantillas maestras (Tablas, Imágenes, Gráficos) que puedes importar en los párrafos tantas veces quieras usando el menú de Importar.
            </p>
          </div>
          <button
            onClick={startNewBlock}
            className='flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50'
          >
            <Plus className='h-4 w-4' />
            Crear Bloque Estructural
          </button>
        </div>

        <table className='w-full text-left text-sm text-slate-500'>
          <thead className='bg-slate-50 text-xs font-semibold uppercase text-slate-600'>
            <tr>
              <th className='px-5 py-3 w-1/3'>Nombre del bloque</th>
              <th className='px-5 py-3 w-1/4'>Tipo de Estructura</th>
              <th className='px-5 py-3 text-right'>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {addingNewBlock && (
              <tr className='border-b border-slate-100 bg-emerald-50/50'>
                <td className='px-5 py-3'>
                  <input
                    type='text'
                    placeholder='Ej: Tabla Comparativa Mensual'
                    value={draftBlock.label}
                    autoFocus
                    onChange={(e) => setDraftBlock({ ...draftBlock, label: e.target.value })}
                    className='w-full rounded border-slate-200 px-2 py-1 text-sm outline-none ring-emerald-100 focus:border-emerald-300 focus:ring-2'
                  />
                </td>
                <td className='px-5 py-3'>
                  <select
                    value={draftBlock.blockType}
                    onChange={(e) => setDraftBlock({ ...draftBlock, blockType: e.target.value })}
                    className='w-full rounded border-slate-200 px-2 py-1 text-sm outline-none ring-emerald-100 focus:border-emerald-300 focus:ring-2'
                  >
                    <option value='table'>Tabla</option>
                    <option value='image'>Imagen</option>
                    <option value='latex_graph'>Fórmula / LaTeX</option>
                    <option value='rich_text'>Texto Enriquecido Grande</option>
                  </select>
                </td>
                <td className='px-5 py-3 text-right'>
                  <button onClick={handleSaveBlockHeader} className='text-emerald-700 hover:text-emerald-900 font-medium px-3 py-1.5 rounded bg-emerald-200 hover:bg-emerald-300 transition-colors'>
                    Configurar Contenido
                  </button>
                  <button onClick={() => setAddingNewBlock(false)} className='text-slate-400 hover:text-slate-600 p-1 ml-2'>
                    <Trash2 className='h-4 w-4' />
                  </button>
                </td>
              </tr>
            )}

            {blockVariables.map((v) => {
              let typeLabel = 'Bloque';
              try {
                if (typeof v.value === 'string' && (v.value.startsWith('{') || v.value.startsWith('['))) {
                  const mParsed = JSON.parse(v.value);
                  typeLabel = mParsed.type === 'table' ? 'Tabla' : 
                              mParsed.type === 'image' ? 'Imagen' : 
                              mParsed.type === 'latex_graph' ? 'Fórmula' : 
                              mParsed.type === 'rich_text' ? 'Multimedia' : 'Bloque Estructural';
                }
              } catch(e) {}

              return (
                <tr key={v.key} className='border-b border-slate-100 transition hover:bg-slate-50'>
                  <td className='px-5 py-3 font-medium text-slate-900'>
                    {v.label}
                  </td>
                  <td className='px-5 py-3'>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                      {typeLabel}
                    </span>
                  </td>
                  <td className='px-5 py-3 text-right'>
                    <button 
                      onClick={() => openBlockEditor(v)} 
                      className='text-sky-600 hover:text-sky-800 transition-colors font-medium text-sm mr-4'
                    >
                      Editar Estructura
                    </button>
                    <button onClick={() => handleDelete(v.key)} className='text-rose-400 hover:text-rose-600 p-1'>
                      <Trash2 className='h-4 w-4' />
                    </button>
                  </td>
                </tr>
              );
            })}

            {blockVariables.length === 0 && !addingNewBlock && (
              <tr>
                <td colSpan={3} className='px-5 py-8 text-center text-slate-400'>
                  No hay bloques guardados en la biblioteca global. Añade uno para comenzar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <BlockTemplateEditorModal
        open={editorModalOpen}
        onClose={() => setEditorModalOpen(false)}
        blockKey={activeBlockKey}
        initialBlock={activeBlockData}
        onSave={handleSaveModalBlock}
      />
    </div>
  );
}
