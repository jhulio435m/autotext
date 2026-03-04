import { useDraggable, useDroppable } from '@dnd-kit/core';
import Badge from './Badge';
import InsertMenu from './InsertMenu';

const TYPE_ICON = {
  text: 'Tx',
  table: 'Tb',
  image: 'Im',
  input: 'In',
  math: 'Fx'
};

function NodeRow({
  node,
  depth,
  selected,
  overId,
  dropPosition,
  insertOpen,
  onSelect,
  onToggle,
  onDelete,
  onOpenInsert,
  onInsert,
  onCloseInsert
}) {
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: node.id,
    data: { node }
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: node.id, data: { node } });

  const setRefs = (el) => {
    setDragRef(el);
    setDropRef(el);
  };

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`
      }
    : undefined;

  const showAbove = overId === node.id && dropPosition === 'above';
  const showBelow = overId === node.id && dropPosition === 'below';
  const showInside = overId === node.id && dropPosition === 'inside';
  const nodeTitle = node.isStructure ? node.title || 'Seccion' : node.label || 'Bloque';
  const nodeSubtitle = node.isStructure ? `Nivel ${node.level || 1}` : `Tipo: ${node.type || 'text'}`;

  return (
    <div className='relative'>
      {showAbove ? <div className='absolute left-0 right-0 top-0 h-0.5 bg-blue-500' /> : null}

      <div
        ref={setRefs}
        style={style}
        data-is-structure={node.isStructure ? 'true' : 'false'}
        className={`group relative flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm transition ${
          selected ? 'border-slate-300 bg-slate-50 shadow-sm' : 'border-transparent bg-white hover:border-slate-200 hover:bg-white'
        } ${isDragging ? 'opacity-60' : ''}`}
        onClick={() => onSelect(node.id)}
      >
        <button
          type='button'
          aria-label='Arrastrar elemento'
          className='cursor-grab rounded px-1 text-slate-400 active:cursor-grabbing hover:bg-slate-100'
          {...listeners}
          {...attributes}
          onClick={(event) => event.stopPropagation()}
        >
          ::
        </button>

        <div style={{ width: depth * 16 }} />

        {node.isStructure ? (
          <button
            type='button'
            aria-label='Expandir o colapsar'
            className='inline-flex h-5 w-5 items-center justify-center rounded text-xs text-slate-500 hover:bg-slate-200'
            onClick={(event) => {
              event.stopPropagation();
              onToggle(node.id);
            }}
          >
            <span className={`transition-transform ${node.canvasExpanded ? 'rotate-90' : ''}`}>▶</span>
          </button>
        ) : (
          <span className='inline-flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-500'>
            {TYPE_ICON[node.type] || 'Tx'}
          </span>
        )}

        <div className='min-w-0 flex-1'>
          <p className='truncate text-xs font-semibold text-slate-800' title={nodeTitle}>
            {nodeTitle}
          </p>
          <p className='text-[11px] text-slate-500'>{nodeSubtitle}</p>
        </div>

        {!node.isStructure ? (
          <div className='hidden items-center gap-1 md:flex'>
            {node.promptIA ? <Badge tone='purple'>IA</Badge> : null}
            {node.hasCaption ? <Badge>T</Badge> : null}
            {node.hasDescription ? <Badge>D</Badge> : null}
            {node.hasSource ? <Badge>F</Badge> : null}
            {node.required ? <Badge tone='red'>!</Badge> : null}
            {node.type === 'table' && node.columnCount ? <Badge tone='blue'>{node.columnCount} cols</Badge> : null}
          </div>
        ) : (
          <Badge tone='slate'>{(node.children || []).length} hijos</Badge>
        )}

        <button
          type='button'
          aria-label='Insertar elemento'
          className={`rounded px-1 text-slate-500 transition hover:bg-slate-200 ${
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          onClick={(event) => {
            event.stopPropagation();
            if (insertOpen) onCloseInsert();
            else onOpenInsert(node.id);
          }}
        >
          +
        </button>

        <button
          type='button'
          aria-label='Eliminar elemento'
          className={`rounded px-1 text-rose-500 transition hover:bg-rose-50 ${
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(node.id);
          }}
        >
          x
        </button>

        {insertOpen ? <InsertMenu onSelect={(type) => onInsert(node.id, type)} /> : null}
      </div>

      {showInside ? <div className='rounded-b-lg bg-blue-50 px-4 py-1 text-[11px] text-blue-700'>Insertar dentro</div> : null}
      {showBelow ? <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500' /> : null}
      {isOver && !showAbove && !showBelow && !showInside ? <div className='absolute inset-0 rounded-lg border border-blue-300' /> : null}
    </div>
  );
}

export default NodeRow;
