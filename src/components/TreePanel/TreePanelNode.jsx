import { AlignLeft, Braces, GripVertical, Image as ImageIcon, Sigma, Table, Trash2, Bookmark } from 'lucide-react';
import { getTreeDropPosition } from './helpers';

const BLOCK_META = {
  text: { label: 'Texto', Icon: AlignLeft },
  rich_text: { label: 'Texto', Icon: AlignLeft },
  template_text: { label: 'Texto plantilla', Icon: Braces },
  variable: { label: 'Campo', Icon: Braces },
  table: { label: 'Tabla', Icon: Table },
  image: { label: 'Imagen', Icon: ImageIcon },
  latex_graph: { label: 'Fórmula', Icon: Sigma },
  ai_text: { label: 'Texto IA', Icon: AlignLeft }
};

export default function TreePanelNode({
  node,
  depth,
  isFirst = false,
  depthTrail = [],
  selectedId,
  editingId,
  editingTitle,
  setEditingId,
  setEditingTitle,
  setSelectedId,
  toggleNodeExpanded,
  updateNodeProps,
  moveNode,
  setDraggedId,
  draggedId,
  overId,
  setOverId,
  dropPosition,
  setDropPosition,
  setPendingDeleteNodeId
}) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isEditing = editingId === node.id;
  const selected = selectedId === node.id;
  const showAbove = overId === node.id && dropPosition === 'above';
  const showBelow = overId === node.id && dropPosition === 'below';
  const showInside = overId === node.id && dropPosition === 'inside';
  const blockMeta = BLOCK_META[node.type] || { label: 'Contenido', Icon: AlignLeft };
  const RowIcon = node.isStructure ? Bookmark : blockMeta.Icon;
  const title = node.isStructure ? node.title || 'Sección' : node.label || 'Campo';

  const isLast = depthTrail[depthTrail.length - 1];
  const isFirstRoot = depth === 0 && isFirst;

  return (
    <div key={node.id} className='relative group'>
      {showAbove ? <div className='absolute left-0 right-0 top-0 z-[2] h-px bg-sky-400' /> : null}

      <div
        className={`group relative flex items-center gap-1.5 py-1 pr-1 text-xs transition-colors ${
          selected
            ? 'bg-sky-50 text-sky-700'
            : 'text-slate-600 hover:bg-slate-50'
        }`}
        style={{ paddingLeft: `${depth * 16 + 20}px` }}
        tabIndex={0}
        onClick={() => setSelectedId(node.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') setSelectedId(node.id);
          if (event.key === 'Escape') setEditingId(null);
        }}
        onDoubleClick={() => {
          if (node.isStructure) {
            setEditingId(node.id);
            setEditingTitle(node.title || '');
          }
        }}
        onDragOver={(event) => {
          if (!draggedId || draggedId === node.id) return;
          event.preventDefault();
          const position = getTreeDropPosition(event.clientY, event.currentTarget.getBoundingClientRect(), node.isStructure);
          setOverId(node.id);
          setDropPosition(position);
        }}
        onDrop={(event) => {
          if (!draggedId || draggedId === node.id) return;
          event.preventDefault();
          const position = getTreeDropPosition(event.clientY, event.currentTarget.getBoundingClientRect(), node.isStructure);
          moveNode(draggedId, node.id, position);
          setDraggedId(null);
          setOverId(null);
          setDropPosition(null);
        }}
      >
        {depthTrail.slice(0, -1).map((isLastAncestor, i) => (
          !isLastAncestor && <div key={`anc-${i}`} className='pointer-events-none absolute top-0 bottom-0 w-px border-l border-slate-200' style={{ left: `${i * 16 + 8}px` }} />
        ))}
        <div
          className='pointer-events-none absolute w-px border-l border-slate-200'
          style={{ left: `${depth * 16 + 8}px`, top: isFirstRoot ? '50%' : '0', bottom: isLast ? '50%' : '0' }}
        />
        <div className='pointer-events-none absolute top-1/2 h-px border-t border-slate-200' style={{ left: `${depth * 16 + 8}px`, width: '16px' }} />

        {node.isStructure && hasChildren && (
          <button
            type='button'
            aria-label='Expandir o colapsar'
            className='absolute z-10 grid h-3.5 w-3.5 cursor-pointer place-items-center rounded border border-slate-300 bg-white text-[7px] font-bold text-slate-500 transition-colors hover:border-slate-400'
            style={{ left: `${depth * 16 + 8}px`, top: '50%', transform: 'translate(-50%, -50%)' }}
            onClick={(event) => {
              event.stopPropagation();
              toggleNodeExpanded(node.id);
            }}
          >
            <span className='block leading-none' style={{ marginTop: '-1px' }}>{node.expanded ? '−' : '+'}</span>
          </button>
        )}

        <RowIcon className={`h-3.5 w-3.5 shrink-0 ${selected ? 'text-sky-600' : 'text-slate-400'}`} />

        <div className='min-w-0 flex-1'>
          {isEditing ? (
            <input
              autoFocus
              value={editingTitle}
              onChange={(event) => setEditingTitle(event.target.value)}
              onBlur={() => {
                updateNodeProps(node.id, { title: editingTitle || 'Sección' });
                setEditingId(null);
              }}
              className='w-full rounded border border-sky-200 px-1 py-0.5 text-xs outline-none focus:border-sky-300'
            />
          ) : (
            <span className={`block truncate ${selected ? 'font-medium' : ''}`}>{title}</span>
          )}
        </div>

        <button
          type='button'
          draggable
          aria-label='Mover sección'
          className='inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-slate-300 opacity-0 transition-colors hover:text-slate-500 group-hover:opacity-100'
          onClick={(e) => e.stopPropagation()}
          onDragStart={(event) => {
            event.stopPropagation();
            setDraggedId(node.id);
            event.dataTransfer.effectAllowed = 'move';
          }}
          onDragEnd={() => {
            setDraggedId(null);
            setOverId(null);
            setDropPosition(null);
          }}
        >
          <GripVertical className='h-3 w-3' />
        </button>

        <button
          type='button'
          aria-label='Eliminar sección'
          className='inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-slate-300 opacity-0 transition-colors hover:text-rose-500 group-hover:opacity-100'
          onClick={(event) => {
            event.stopPropagation();
            setPendingDeleteNodeId(node.id);
          }}
        >
          <Trash2 className='h-3 w-3' />
        </button>

        {showInside ? <div className='pointer-events-none absolute inset-0 rounded border border-dashed border-sky-300 bg-sky-50/30' /> : null}
      </div>

      {showBelow ? <div className='absolute bottom-0 left-0 right-0 z-[2] h-px bg-sky-400' /> : null}

      <div className={`overflow-hidden transition-[max-height,opacity] duration-200 ${node.expanded ? 'max-h-[999px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div>
          {(node.children || []).map((child, index, arr) => (
            <TreePanelNode
              key={child.id}
              node={child}
              depth={depth + 1}
              isFirst={false}
              depthTrail={[...depthTrail, index === arr.length - 1]}
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
          ))}
        </div>
      </div>
    </div>
  );
}
