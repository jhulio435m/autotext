import { ChevronRight, GripVertical, Trash2, Bookmark } from 'lucide-react';
import { getTreeDropPosition } from './helpers';

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
  if (!node.isStructure) return null;

  const hasStructureChildren = (node.children || []).some((child) => child?.isStructure);
  const isEditing = editingId === node.id;
  const selected = selectedId === node.id;
  const showAbove = overId === node.id && dropPosition === 'above';
  const showBelow = overId === node.id && dropPosition === 'below';
  const showInside = overId === node.id && dropPosition === 'inside';

  const isLast = depthTrail[depthTrail.length - 1];
  const isFirstRoot = depth === 0 && isFirst;

  return (
    <div key={node.id} className='relative group'>
      {showAbove ? <div className='absolute left-0 right-0 top-0 z-[2] h-0.5 rounded-full bg-sky-500' /> : null}

      <div
        className={`group relative flex items-center rounded-sm py-1 pr-2 transition-colors ${
          !selected && 'text-slate-700 hover:bg-slate-50'
        }`}
        style={{ paddingLeft: `${depth * 16 + 24}px` }}
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
        onDragOver={(event) => {
          if (!draggedId || draggedId === node.id) return;
          event.preventDefault();
          const position = getTreeDropPosition(event.clientY, event.currentTarget.getBoundingClientRect(), true);
          setOverId(node.id);
          setDropPosition(position);
        }}
        onDrop={(event) => {
          if (!draggedId || draggedId === node.id) return;
          event.preventDefault();
          const position = getTreeDropPosition(event.clientY, event.currentTarget.getBoundingClientRect(), true);
          moveNode(draggedId, node.id, position);
          setDraggedId(null);
          setOverId(null);
          setDropPosition(null);
        }}
      >
        {/* Baldosas de líneas estructurales (absolutas a la fila de alto fijo) */}
        {depthTrail.slice(0, -1).map((isLastAncestor, i) => (
          !isLastAncestor && <div key={`anc-${i}`} className="pointer-events-none absolute top-0 bottom-0 z-[1] w-px border-l border-dotted border-slate-400" style={{ left: `${i * 16 + 8}px` }} />
        ))}
        {/* Tronco Central */}
        <div 
          className="pointer-events-none absolute z-[1] w-px border-l border-dotted border-slate-400" 
          style={{ left: `${depth * 16 + 8}px`, top: isFirstRoot ? '50%' : '0', bottom: isLast ? '50%' : '0' }} 
        />
        {/* Rama Horizontal */}
        <div className="pointer-events-none absolute top-1/2 z-[1] h-px border-t border-dotted border-slate-400" style={{ left: `${depth * 16 + 8}px`, width: '16px' }} />
        
        {/* Caja de Expansión [+] / [-] */}
        {hasStructureChildren && (
          <button
            type='button'
            aria-label='Expandir o colapsar'
            className='absolute z-10 grid h-[9px] w-[9px] cursor-pointer place-items-center border border-slate-400 bg-white text-slate-800 transition-colors hover:border-slate-500'
            style={{ left: `${depth * 16 + 8}px`, top: '50%', transform: 'translate(-50%, -50%)' }}
            onClick={(event) => {
              event.stopPropagation();
              toggleNodeExpanded(node.id);
            }}
          >
            <span className='block text-[9px] font-bold leading-none' style={{ marginTop: '-1px' }}>{node.expanded ? '−' : '+'}</span>
          </button>
        )}

        <Bookmark className={`shrink-0 relative z-[2] mr-1.5 h-[14px] w-[14px] bg-transparent ${selected ? 'text-orange-500' : 'text-slate-600'}`} />

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
              className='w-full outline-none rounded bg-white border border-sky-300 px-1.5 py-0.5 text-[13px] shadow-sm focus:border-sky-500'
            />
          ) : (
            <div className='flex min-w-0 items-center'>
              <p className={`truncate text-[13px] leading-5 ${selected ? 'bg-sky-600 text-white px-1.5 rounded-[3px] -ml-1.5 font-normal' : 'text-slate-700 group-hover:text-slate-900 font-normal'}`}>{node.title}</p>
            </div>
          )}
        </div>

        <button
          type='button'
          draggable
          aria-label='Mover sección'
          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 transition-colors hover:bg-slate-200 hover:text-slate-700 active:cursor-grabbing group-hover:opacity-100 group-focus-within:opacity-100`}
          onClick={(event) => event.stopPropagation()}
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
          title='Mover sección'
        >
          <GripVertical className='h-3.5 w-3.5' />
        </button>

        <button
          type='button'
          aria-label='Eliminar sección'
          title='Eliminar sección'
          className='inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 transition-colors hover:bg-rose-100 hover:text-rose-600 group-hover:opacity-100 group-focus-within:opacity-100'
          onClick={(event) => {
            event.stopPropagation();
            setPendingDeleteNodeId(node.id);
          }}
        >
          <Trash2 className='h-3.5 w-3.5' />
        </button>

        {showInside ? <div className='pointer-events-none absolute inset-1 rounded-md border border-dashed border-sky-300 bg-sky-50/40' /> : null}
      </div>

      {showBelow ? <div className='absolute bottom-0 left-0 right-0 z-[2] h-0.5 rounded-full bg-sky-500' /> : null}

      <div className={`overflow-hidden transition-[max-height,opacity] duration-200 ${node.expanded ? 'max-h-[999px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className=''>
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
