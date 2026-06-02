import { useMemo, useState } from 'react';
import useDocumentStore from '../../store';
import { createNode, deepClone } from '../../utils/document';
import ConfirmDialog from '../ui/ConfirmDialog';
import TreePanelHeader from './TreePanelHeader';
import TreePanelNode from './TreePanelNode';
import { filterStructureTree } from './helpers';
import { ChevronRight } from 'lucide-react';

function TreePanel({ collapsed = false, onToggleCollapsed }) {
  const structure = useDocumentStore((state) => state.structure);
  const selectedId = useDocumentStore((state) => state.selectedId);
  const setSelectedId = useDocumentStore((state) => state.setSelectedId);
  const toggleNodeExpanded = useDocumentStore((state) => state.toggleNodeExpanded);
  const removeNode = useDocumentStore((state) => state.removeNode);
  const moveNode = useDocumentStore((state) => state.moveNode);
  const updateNodeProps = useDocumentStore((state) => state.updateNodeProps);
  const applyStructure = useDocumentStore((state) => state.applyStructure);

  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [query, setQuery] = useState('');
  const [draggedId, setDraggedId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [dropPosition, setDropPosition] = useState(null);
  const [pendingDeleteNodeId, setPendingDeleteNodeId] = useState(null);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredStructure = useMemo(() => filterStructureTree(structure, normalizedQuery), [normalizedQuery, structure]);

  const addRootSection = () => {
    const base = deepClone(structure || []);
    const newSection = createNode('section', 1);
    base.push(newSection);
    applyStructure(base, { selectedId: newSection.id });
  };

  return (
    <aside className='relative flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition-opacity duration-300'>
      <button
        type='button'
        aria-label='Expandir panel estructura'
        className={`absolute inset-0 z-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-opacity ${
          collapsed ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        title='Expandir panel'
        onClick={() => onToggleCollapsed?.(false)}
      >
        <ChevronRight className='h-4 w-4' />
      </button>

      <div className={`flex h-full flex-col transition-all ${collapsed ? 'pointer-events-none scale-[0.985] opacity-0' : 'scale-100 opacity-100'}`}>
        <TreePanelHeader query={query} setQuery={setQuery} onToggleCollapsed={onToggleCollapsed} onAddSection={addRootSection} />

        <div className='flex-1 overflow-auto p-2'>
          {filteredStructure.length ? (
            filteredStructure.map((node, index, arr) => (
              <TreePanelNode
                key={node.id}
                node={node}
                depth={0}
                isFirst={index === 0}
                depthTrail={[index === arr.length - 1]}
                selectedId={selectedId}
                editingId={editingId}
                editingTitle={editingTitle}
                setEditingId={setEditingId}
                setEditingTitle={setEditingTitle}
                setSelectedId={setSelectedId}
                toggleNodeExpanded={toggleNodeExpanded}
                updateNodeProps={updateNodeProps}
                moveNode={moveNode}
                setDraggedId={setDraggedId}
                draggedId={draggedId}
                overId={overId}
                setOverId={setOverId}
                dropPosition={dropPosition}
                setDropPosition={setDropPosition}
                setPendingDeleteNodeId={setPendingDeleteNodeId}
              />
            ))
          ) : (
            <p className='px-1 py-2 text-xs text-slate-500'>Sin resultados para la búsqueda.</p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDeleteNodeId)}
        title='Eliminar elemento'
        message='Esta acción eliminará el elemento seleccionado y sus hijos.'
        onCancel={() => setPendingDeleteNodeId(null)}
        onConfirm={() => {
          if (pendingDeleteNodeId) removeNode(pendingDeleteNodeId);
          setPendingDeleteNodeId(null);
        }}
      />
    </aside>
  );
}

export default TreePanel;
