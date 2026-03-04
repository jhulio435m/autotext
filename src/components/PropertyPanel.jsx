import { useMemo, useState } from 'react';
import useDocumentStore from '../store';
import ConfirmDialog from './ConfirmDialog';

function findNode(nodes, id) {
  for (const node of nodes || []) {
    if (node.id === id) return node;
    if (node.children?.length) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function Field({ label, children }) {
  return (
    <div>
      <label className='mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500'>{label}</label>
      {children}
    </div>
  );
}

function PropertyPanel({ collapsed = false, onToggleCollapsed }) {
  const structure = useDocumentStore((state) => state.structure);
  const selectedId = useDocumentStore((state) => state.selectedId);
  const updateNodeProps = useDocumentStore((state) => state.updateNodeProps);
  const removeNode = useDocumentStore((state) => state.removeNode);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const selectedNode = useMemo(() => findNode(structure, selectedId), [selectedId, structure]);

  const update = (patch) => {
    if (!selectedNode) return;
    updateNodeProps(selectedNode.id, patch);
  };

  const copyId = () => {
    if (!selectedNode) return;
    navigator.clipboard.writeText(selectedNode.id);
  };

  return (
    <aside className='editor-side-panel relative min-h-[calc(100vh-230px)] overflow-hidden rounded-xl border border-slate-200 bg-white'>
      <button
        type='button'
        aria-label='Expandir panel propiedades'
        className={`editor-panel-strip ${collapsed ? '' : 'editor-panel-strip--hidden'}`}
        title='Expandir panel'
        onClick={() => onToggleCollapsed?.(false)}
      >
        &lt;
      </button>

      <div className={`editor-panel-content ${collapsed ? 'editor-panel-content--hidden' : ''}`}>
        <header className='flex items-center justify-between border-b border-slate-200 px-3 py-2'>
          <h3 className='text-xs font-semibold uppercase tracking-wide text-slate-600'>Propiedades</h3>
          <button
            type='button'
            aria-label='Colapsar panel propiedades'
            title='Colapsar panel'
            className='btn-ghost h-6 w-6 px-0 py-0 text-[11px] leading-none'
            onClick={() => onToggleCollapsed?.(true)}
          >
            &gt;
          </button>
        </header>

        <div className='flex-1 space-y-3 overflow-auto p-3 text-sm'>
          {!selectedNode ? (
            <p className='rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500'>
              Selecciona un elemento para editar sus propiedades.
            </p>
          ) : null}

          {selectedNode ? (
            <>
              <div className='rounded-md border border-slate-200 bg-slate-50 p-2.5'>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-slate-500'>Elemento seleccionado</p>
                <p className='mt-1 truncate text-xs font-semibold text-slate-800'>
                  {selectedNode.label || selectedNode.title || selectedNode.id}
                </p>
                <div className='mt-2 flex flex-wrap gap-1'>
                  <span className='editor-toolbar-chip'>{selectedNode.isStructure ? 'Seccion' : selectedNode.type || 'Bloque'}</span>
                  {selectedNode.required ? <span className='editor-toolbar-chip'>Obligatorio</span> : null}
                  {selectedNode.isStructure ? <span className='editor-toolbar-chip'>Nivel {selectedNode.level || 1}</span> : null}
                </div>
              </div>

              <Field label='ID'>
                <div className='mt-1 flex items-center gap-2'>
                  <input readOnly value={selectedNode.id} className='w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs' />
                  <button type='button' className='btn-ghost px-2 py-1 text-xs' onClick={copyId}>Copiar</button>
                </div>
              </Field>

              {selectedNode.isStructure ? (
                <>
                  <Field label='Titulo de seccion'>
                    <textarea
                      rows={2}
                      value={selectedNode.title || ''}
                      onChange={(event) => update({ title: event.target.value })}
                      className='w-full rounded-md border border-slate-200 px-2 py-1 text-sm'
                    />
                  </Field>

                  <Field label='Nivel LaTeX'>
                    <input
                      type='number'
                      min={1}
                      max={5}
                      value={selectedNode.level || 1}
                      onChange={(event) => update({ level: Number(event.target.value) || 1 })}
                      className='w-full rounded-md border border-slate-200 px-2 py-1 text-sm'
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label='Etiqueta'>
                    <input
                      value={selectedNode.label || ''}
                      onChange={(event) => update({ label: event.target.value })}
                      className='w-full rounded-md border border-slate-200 px-2 py-1 text-sm'
                    />
                  </Field>

                  <Field label='Instruccion para usuario'>
                    <textarea
                      rows={3}
                      value={selectedNode.content || ''}
                      onChange={(event) => update({ content: event.target.value })}
                      className='w-full rounded-md border border-slate-200 px-2 py-1 text-sm'
                    />
                  </Field>

                  <label className='flex items-center gap-2 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-700'>
                    <input
                      type='checkbox'
                      checked={Boolean(selectedNode.required)}
                      onChange={(event) => update({ required: event.target.checked })}
                    />
                    Campo obligatorio
                  </label>

                  {selectedNode.type === 'text' ? (
                    <Field label='Prompt IA'>
                      <textarea
                        rows={3}
                        value={selectedNode.promptIA || ''}
                        onChange={(event) => update({ promptIA: event.target.value })}
                        className='w-full rounded-md border border-slate-200 px-2 py-1 text-sm'
                      />
                    </Field>
                  ) : null}

                  {selectedNode.type === 'table' ? (
                    <>
                      <Field label='Numero de columnas'>
                        <input
                          type='number'
                          min={1}
                          max={20}
                          value={selectedNode.columnCount || 1}
                          onChange={(event) => {
                            const count = Number(event.target.value) || 1;
                            const headers = Array.from({ length: count }, (_, index) => selectedNode.columnHeaders?.[index] || `Col ${index + 1}`);
                            const align = Array.from({ length: count }, (_, index) => selectedNode.columnAlign?.[index] || 'L');
                            update({ columnCount: count, columnHeaders: headers, columnAlign: align });
                          }}
                          className='w-full rounded-md border border-slate-200 px-2 py-1 text-sm'
                        />
                      </Field>

                      {(selectedNode.columnHeaders || []).map((header, index) => (
                        <div key={`${selectedNode.id}-${index}`} className='grid grid-cols-2 gap-2'>
                          <input
                            value={header}
                            onChange={(event) => {
                              const next = [...(selectedNode.columnHeaders || [])];
                              next[index] = event.target.value;
                              update({ columnHeaders: next });
                            }}
                            className='rounded-md border border-slate-200 px-2 py-1 text-xs'
                          />
                          <select
                            value={selectedNode.columnAlign?.[index] || 'L'}
                            onChange={(event) => {
                              const next = [...(selectedNode.columnAlign || [])];
                              next[index] = event.target.value;
                              update({ columnAlign: next });
                            }}
                            className='rounded-md border border-slate-200 px-2 py-1 text-xs'
                          >
                            <option value='L'>L</option>
                            <option value='C'>C</option>
                            <option value='R'>R</option>
                          </select>
                        </div>
                      ))}

                      <select
                        value={selectedNode.tableStyle || 'simple'}
                        onChange={(event) => update({ tableStyle: event.target.value })}
                        className='w-full rounded-md border border-slate-200 px-2 py-1 text-sm'
                      >
                        <option value='simple'>Simple</option>
                        <option value='booktabs'>Booktabs</option>
                        <option value='colored'>Coloreada</option>
                      </select>
                    </>
                  ) : null}

                  {selectedNode.type === 'image' ? (
                    <>
                      <select
                        value={selectedNode.width || 'full'}
                        onChange={(event) => update({ width: event.target.value })}
                        className='w-full rounded-md border border-slate-200 px-2 py-1 text-sm'
                      >
                        <option value='full'>Completo</option>
                        <option value='half'>Medio</option>
                        <option value='third'>Tercio</option>
                      </select>
                      <label className='flex items-center gap-2 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-700'>
                        <input
                          type='checkbox'
                          checked={Boolean(selectedNode.float)}
                          onChange={(event) => update({ float: event.target.checked })}
                        />
                        Usar float (figure)
                      </label>
                    </>
                  ) : null}

                  {selectedNode.type === 'math' ? (
                    <>
                      <select
                        value={selectedNode.mathType || 'block'}
                        onChange={(event) => update({ mathType: event.target.value })}
                        className='w-full rounded-md border border-slate-200 px-2 py-1 text-sm'
                      >
                        <option value='inline'>Inline</option>
                        <option value='block'>Bloque</option>
                        <option value='align'>Alineado</option>
                      </select>
                      <input
                        value={(selectedNode.mathVariables || []).join(', ')}
                        onChange={(event) => {
                          const vars = event.target.value
                            .split(',')
                            .map((item) => item.trim())
                            .filter(Boolean);
                          update({ mathVariables: vars });
                        }}
                        className='w-full rounded-md border border-slate-200 px-2 py-1 text-sm'
                        placeholder='Variables separadas por coma'
                      />
                    </>
                  ) : null}

                  {selectedNode.type === 'input' ? (
                    <>
                      <select
                        value={selectedNode.inputType || 'text'}
                        onChange={(event) => update({ inputType: event.target.value })}
                        className='w-full rounded-md border border-slate-200 px-2 py-1 text-sm'
                      >
                        <option value='text'>Texto</option>
                        <option value='number'>Numero</option>
                        <option value='date'>Fecha</option>
                        <option value='select'>Opcion multiple</option>
                      </select>

                      <input
                        value={selectedNode.inputPlaceholder || ''}
                        onChange={(event) => update({ inputPlaceholder: event.target.value })}
                        className='w-full rounded-md border border-slate-200 px-2 py-1 text-sm'
                        placeholder='Placeholder'
                      />

                      {selectedNode.inputType === 'number' ? (
                        <div className='grid grid-cols-3 gap-2'>
                          <input
                            value={selectedNode.inputUnit || ''}
                            onChange={(event) => update({ inputUnit: event.target.value })}
                            className='rounded-md border border-slate-200 px-2 py-1 text-xs'
                            placeholder='Unidad'
                          />
                          <input
                            type='number'
                            value={selectedNode.inputMin ?? ''}
                            onChange={(event) => update({ inputMin: Number(event.target.value) })}
                            className='rounded-md border border-slate-200 px-2 py-1 text-xs'
                            placeholder='Min'
                          />
                          <input
                            type='number'
                            value={selectedNode.inputMax ?? ''}
                            onChange={(event) => update({ inputMax: Number(event.target.value) })}
                            className='rounded-md border border-slate-200 px-2 py-1 text-xs'
                            placeholder='Max'
                          />
                        </div>
                      ) : null}

                      {selectedNode.inputType === 'select' ? (
                        <input
                          value={(selectedNode.inputOptions || []).join(', ')}
                          onChange={(event) => {
                            const options = event.target.value
                              .split(',')
                              .map((item) => item.trim())
                              .filter(Boolean);
                            update({ inputOptions: options });
                          }}
                          className='w-full rounded-md border border-slate-200 px-2 py-1 text-sm'
                          placeholder='Opciones separadas por coma'
                        />
                      ) : null}
                    </>
                  ) : null}

                  <div className='grid grid-cols-2 gap-2 text-xs'>
                    {['hasCaption', 'hasDescription', 'hasSource', 'hasLabel'].map((key) => (
                      <label key={key} className='flex items-center gap-2 rounded-md bg-slate-50 px-2 py-1 text-slate-600'>
                        <input
                          type='checkbox'
                          checked={Boolean(selectedNode[key])}
                          onChange={(event) => update({ [key]: event.target.checked })}
                        />
                        {key}
                      </label>
                    ))}
                  </div>
                </>
              )}

              <button type='button' className='w-full rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700' onClick={() => setConfirmDelete(true)}>
                Eliminar elemento
              </button>
            </>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete && Boolean(selectedNode)}
        title='Eliminar elemento'
        message='Esta accion eliminara el nodo seleccionado y sus hijos.'
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          removeNode(selectedNode.id);
          setConfirmDelete(false);
        }}
      />
    </aside>
  );
}

export default PropertyPanel;
