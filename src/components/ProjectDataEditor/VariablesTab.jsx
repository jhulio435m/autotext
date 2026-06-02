import { useState, useMemo } from 'react';
import { Database, Plus, Trash2, Edit2, Save } from 'lucide-react';
import useDocumentStore from '../../store';

function normalizeVariableId(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_');
}

export default function VariablesTab({ projectId }) {
  const coverConfig = useDocumentStore((state) => state.coverConfig[projectId] || {});
  const projectVariables = coverConfig.projectVariables || [];
  const projectData = coverConfig.projectData || {};
  const updateCoverConfig = useDocumentStore((state) => state.updateCoverConfig);
  const updatePreviewFormDataBulk = useDocumentStore((state) => state.updatePreviewFormDataBulk);

  const [isEditing, setIsEditing] = useState(null);
  const [draftVar, setDraftVar] = useState({ key: '', label: '', value: '', type: 'text' });
  const [addingNew, setAddingNew] = useState(false);

  // Sync variables list combining projectVariables meta and projectData true values
  const list = useMemo(() => {
    return projectVariables.map(v => ({
      ...v,
      value: projectData[v.key] ?? v.value ?? ''
    }));
  }, [projectVariables, projectData]);

  const textVariables = list.filter(v => v.type !== 'block');

  const commitVariableChange = (nextVars, nextData) => {
    updateCoverConfig(projectId, {
      projectVariables: nextVars,
      projectData: nextData
    });
    updatePreviewFormDataBulk(nextData);
  };

  const handleSave = () => {
    const key = normalizeVariableId(draftVar.key);
    if (!key) return;

    const isExisting = projectVariables.some(v => v.key === key) && !addingNew;

    let nextVars = [...projectVariables];
    if (isExisting) {
      nextVars = nextVars.map(v => v.key === key ? { ...v, label: draftVar.label, type: draftVar.type } : v);
    } else {
      nextVars = nextVars.filter(v => v.key !== key);
      nextVars.push({ key, label: draftVar.label, type: draftVar.type, value: '' });
    }

    const nextData = { ...projectData, [key]: draftVar.value };
    commitVariableChange(nextVars, nextData);

    setAddingNew(false);
    setIsEditing(null);
  };

  const handleDelete = (key) => {
    const nextVars = projectVariables.filter(v => v.key !== key);
    const nextData = { ...projectData };
    delete nextData[key];
    commitVariableChange(nextVars, nextData);
  };

  const startEdit = (v) => {
    setDraftVar({ key: v.key, label: v.label, value: v.value, type: v.type || 'text' });
    setIsEditing(v.key);
    setAddingNew(false);
  };

  const startNew = () => {
    setDraftVar({ key: '', label: '', value: '', type: 'text' });
    setAddingNew(true);
    setIsEditing(null);
  };

  return (
    <div className='space-y-6'>
      <div className='overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)]'>
        <div className='flex items-center justify-between px-5 py-4 border-b border-slate-200'>
          <div>
            <h2 className='flex items-center gap-2 text-base font-semibold text-slate-900'>
              <Database className='h-4 w-4 text-sky-500' />
              Variables globales
            </h2>
            <p className='mt-1 text-sm text-slate-500'>Valores de texto inyectables en los párrafos usando `{'{{clave}}'}`.</p>
          </div>
          <button
            onClick={startNew}
            className='flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50'
          >
            <Plus className='h-4 w-4' />
            Añadir variable
          </button>
        </div>

        <table className='w-full text-left text-sm text-slate-500'>
          <thead className='bg-slate-50 text-xs font-semibold uppercase text-slate-600'>
            <tr>
              <th className='px-5 py-3'>Etiqueta visible</th>
              <th className='px-5 py-3'>Clave técnica</th>
              <th className='px-5 py-3'>Valor</th>
              <th className='px-5 py-3 text-right'>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {addingNew && (
              <tr className='border-b border-slate-100 bg-sky-50/50'>
                <td className='px-5 py-3'>
                  <input
                    type='text'
                    placeholder='Ej: Nombre proveedor'
                    value={draftVar.label}
                    onChange={(e) => setDraftVar({ ...draftVar, label: e.target.value })}
                    className='w-full rounded border-slate-200 px-2 py-1 text-sm outline-none ring-sky-100 focus:border-sky-300 focus:ring-2'
                  />
                </td>
                <td className='px-5 py-3'>
                  <input
                    type='text'
                    placeholder='Ej: var_proveedor'
                    value={draftVar.key}
                    onChange={(e) => setDraftVar({ ...draftVar, key: normalizeVariableId(e.target.value) })}
                    className='w-full rounded border-slate-200 px-2 py-1 text-sm outline-none ring-sky-100 focus:border-sky-300 focus:ring-2 font-mono'
                  />
                </td>
                <td className='px-5 py-3'>
                  <input
                    type='text'
                    placeholder='Valor...'
                    value={draftVar.value}
                    onChange={(e) => setDraftVar({ ...draftVar, value: e.target.value })}
                    className='w-full rounded border-slate-200 px-2 py-1 text-sm outline-none ring-sky-100 focus:border-sky-300 focus:ring-2'
                  />
                </td>
                <td className='px-5 py-3 text-right'>
                  <button onClick={handleSave} className='text-sky-600 hover:text-sky-800 p-1'>
                    <Save className='h-4 w-4' />
                  </button>
                  <button onClick={() => setAddingNew(false)} className='text-slate-400 hover:text-slate-600 p-1 ml-2'>
                    <Trash2 className='h-4 w-4' />
                  </button>
                </td>
              </tr>
            )}
            
            {textVariables.map((v) => {
              const editing = isEditing === v.key;
              return (
                <tr key={v.key} className='border-b border-slate-100 transition hover:bg-slate-50'>
                  <td className='px-5 py-3 font-medium text-slate-900'>
                    {editing ? (
                      <input
                        type='text'
                        value={draftVar.label}
                        onChange={(e) => setDraftVar({ ...draftVar, label: e.target.value })}
                        className='w-full rounded border-slate-200 px-2 py-1 text-sm outline-none ring-sky-100 focus:border-sky-300 focus:ring-2'
                      />
                    ) : (
                      v.label || <span className='text-slate-400 italic'>Sin etiqueta</span>
                    )}
                  </td>
                  <td className='px-5 py-3 font-mono text-[11px] text-sky-600 bg-sky-50/50 rounded inline-block mt-3 mb-2 ml-5 tracking-tight border border-sky-100'>
                    {`{{${v.key}}}`}
                  </td>
                  <td className='px-5 py-3'>
                    {editing ? (
                      <input
                        type='text'
                        value={draftVar.value}
                        onChange={(e) => setDraftVar({ ...draftVar, value: e.target.value })}
                        className='w-full rounded border-slate-200 px-2 py-1 text-sm outline-none ring-sky-100 focus:border-sky-300 focus:ring-2'
                      />
                    ) : (
                      <span className='line-clamp-2 text-slate-700'>{v.value || <span className='text-slate-300'>Vacío</span>}</span>
                    )}
                  </td>
                  <td className='px-5 py-3 text-right'>
                    {editing ? (
                      <>
                        <button onClick={handleSave} className='text-sky-600 hover:text-sky-800 p-1'>
                          <Save className='h-4 w-4' />
                        </button>
                        <button onClick={() => setIsEditing(null)} className='text-slate-400 hover:text-slate-600 p-1 ml-2'>
                          <Trash2 className='h-4 w-4' />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(v)} className='text-slate-400 hover:text-slate-600 p-1'>
                          <Edit2 className='h-4 w-4' />
                        </button>
                        <button onClick={() => handleDelete(v.key)} className='text-rose-400 hover:text-rose-600 p-1 ml-2'>
                          <Trash2 className='h-4 w-4' />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            
            {textVariables.length === 0 && !addingNew && (
              <tr>
                <td colSpan={4} className='px-5 py-8 text-center text-slate-400'>
                  No hay variables de texto. Introduce {'{{var_nombre}}'} directamente en el editor de documentos para crear la primera.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
