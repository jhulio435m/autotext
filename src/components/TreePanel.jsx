import { useMemo, useState } from 'react';
import useDocumentStore from '../store';

function TreePanel({ collapsed = false, onToggleCollapsed }) {
  const structure = useDocumentStore((state) => state.structure);
  const selectedId = useDocumentStore((state) => state.selectedId);
  const setSelectedId = useDocumentStore((state) => state.setSelectedId);
  const toggleNodeExpanded = useDocumentStore((state) => state.toggleNodeExpanded);
  const addNode = useDocumentStore((state) => state.addNode);
  const removeNode = useDocumentStore((state) => state.removeNode);
  const updateNodeProps = useDocumentStore((state) => state.updateNodeProps);

  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [query, setQuery] = useState('');

  const normalizedQuery = query.trim().toLowerCase();

  const filteredStructure = useMemo(() => {
    if (!normalizedQuery) return structure;

    const filterTree = (nodes) => {
      const next = [];
      (nodes || []).forEach((node) => {
        if (!node.isStructure) return;
        const children = filterTree(node.children || []);
        const ownMatch = String(node.title || '').toLowerCase().includes(normalizedQuery);
        if (ownMatch || children.length) {
          next.push({ ...node, children });
        }
      });
      return next;
    };

    return filterTree(structure);
  }, [normalizedQuery, structure]);

  const renderNode = (node, depth = 0) => {
    if (!node.isStructure) return null;

    const isEditing = editingId === node.id;
    const selected = selectedId === node.id;

    return (
      <div key={node.id} className='pl-1' style={{ marginLeft: depth * 16 }}>
        <div
          className={`group relative flex items-center gap-1 rounded-lg border px-2 py-1.5 text-sm transition ${selected ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-transparent hover:bg-slate-100'}`}
          tabIndex={0}
          onClick={() => setSelectedId(node.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') setSelectedId(node.id);
            if (event.key === 'Escape') setEditingId(null);
          }}
          onDoubleClick={() => {
            setEditingId(node.id);
            setEditingTitle(node.title || '');
          }}
        >
          <button
            type='button'
            aria-label='Expandir o colapsar'
            className='inline-flex h-5 w-5 items-center justify-center rounded text-xs text-slate-500 hover:bg-slate-200'
            onClick={(event) => {
              event.stopPropagation();
              toggleNodeExpanded(node.id);
            }}
          >
            <span className={`transition-transform ${node.expanded ? 'rotate-90' : ''}`}>▶</span>
          </button>

          <span className='text-xs text-slate-400'>{node.level === 1 ? '▣' : node.level === 2 ? '◫' : '□'}</span>

          {isEditing ? (
            <input
              autoFocus
              value={editingTitle}
              onChange={(event) => setEditingTitle(event.target.value)}
              onBlur={() => {
                updateNodeProps(node.id, { title: editingTitle || 'Seccion' });
                setEditingId(null);
              }}
              className='w-full rounded border border-slate-300 px-1 py-0.5 text-xs'
            />
          ) : (
            <span className='flex-1 truncate'>{node.title}</span>
          )}

          <span className='rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500'>{(node.children || []).length}</span>

          <button
            type='button'
            aria-label='Agregar sub-seccion'
            className='invisible text-xs text-slate-500 group-hover:visible'
            onClick={(event) => {
              event.stopPropagation();
              addNode(node.id, 'section');
            }}
          >
            +
          </button>

          <button
            type='button'
            aria-label='Eliminar seccion'
            className='invisible text-xs text-rose-500 group-hover:visible'
            onClick={(event) => {
              event.stopPropagation();
              removeNode(node.id);
            }}
          >
            x
          </button>

          <div className='pointer-events-none absolute bottom-0 left-8 top-0 border-l border-slate-200/80' />
        </div>

        <div className={`overflow-hidden transition-[max-height,opacity] duration-200 ${node.expanded ? 'max-h-[999px] opacity-100' : 'max-h-0 opacity-0'}`}>
          {(node.children || []).map((child) => renderNode(child, depth + 1))}
        </div>
      </div>
    );
  };

  return (
    <aside className='editor-side-panel relative flex min-h-[calc(100vh-230px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white'>
      <button
        type='button'
        aria-label='Expandir panel estructura'
        className={`editor-panel-strip ${collapsed ? '' : 'editor-panel-strip--hidden'}`}
        title='Expandir panel'
        onClick={() => onToggleCollapsed?.(false)}
      >
        &gt;
      </button>

      <div className={`editor-panel-content ${collapsed ? 'editor-panel-content--hidden' : ''}`}>
        <header className='flex items-center justify-between border-b border-slate-200 px-3 py-2'>
          <div>
            <h3 className='text-xs font-semibold uppercase tracking-wide text-slate-600'>Estructura</h3>
            <p className='text-[11px] text-slate-500'>{filteredStructure.length} secciones visibles</p>
          </div>
          <button
            type='button'
            aria-label='Colapsar panel estructura'
            title='Colapsar panel'
            className='btn-ghost h-6 w-6 px-0 py-0 text-[11px] leading-none'
            onClick={() => onToggleCollapsed?.(true)}
          >
            &lt;
          </button>
        </header>

        <div className='border-b border-slate-200 px-2 py-2'>
          <div className='flex items-center gap-2'>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Buscar seccion'
              className='w-full rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-blue-400'
            />
            {query ? (
              <button
                type='button'
                className='btn-ghost h-6 w-6 px-0 py-0 text-[11px]'
                onClick={() => setQuery('')}
                aria-label='Limpiar busqueda'
              >
                x
              </button>
            ) : null}
          </div>
        </div>

        <div className='flex-1 space-y-1 overflow-auto p-2'>
          {filteredStructure.length ? (
            filteredStructure.map((node) => renderNode(node))
          ) : (
            <p className='rounded-md border border-dashed border-slate-300 p-2 text-xs text-slate-500'>Sin resultados para la busqueda.</p>
          )}
        </div>
      </div>
    </aside>
  );
}

export default TreePanel;
