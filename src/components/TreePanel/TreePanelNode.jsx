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
  const level = node.isStructure ? Math.max(1, Number(node.level) || depth + 1) : null;
  const blockMeta = BLOCK_META[node.type] || { label: 'Contenido', Icon: AlignLeft };
  const RowIcon = node.isStructure ? Bookmark : blockMeta.Icon;
  const title = node.isStructure ? node.title || 'Sección' : node.label || 'Campo';
  const badgeLabel = node.isStructure ? `Sección nivel ${level}` : blockMeta.label;
  const badgeClassName = node.isStructure
    ? selected
      ? 'border-white/15 bg-white/15 text-white'
      : 'border-sky-100 bg-sky-50 text-sky-700'
    : selected
      ? 'border-white/15 bg-white/15 text-white'
      : 'border-slate-200 bg-slate-50 text-slate-600';

  const isLast = depthTrail[depthTrail.length - 1];
  const isFirstRoot = depth === 0 && isFirst;
  const rowClassName = selected
    ? node.isStructure
      ? 'bg-sky-700 text-white shadow-[0_10px_20px_rgba(14,116,144,0.18)]'
      : 'bg-slate-900 text-white shadow-[0_10px_20px_rgba(15,23,42,0.16)]'
    : node.isStructure
      ? 'bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] text-slate-700 hover:bg-sky-50/70'
      : 'bg-white text-slate-600 hover:bg-slate-50';
  const titleClassName = selected ? 'text-white' : node.isStructure ? 'text-slate-900' : 'text-slate-700';
  const subtitleClassName = selected ? 'text-white/75' : 'text-slate-400';
  const guideColorClass = selected ? 'border-white/35' : node.isStructure ? 'border-sky-300/80' : 'border-slate-300/90';

  return (
    <div key={node.id} className='relative group'>
      {showAbove ? <div className='absolute left-0 right-0 top-0 z-[2] h-0.5 rounded-full bg-sky-500' /> : null}

      <div
        className={`group relative flex items-center gap-2 rounded-2xl py-2 pr-2 transition-all ${rowClassName}`}
        style={{ paddingLeft: `${depth * 18 + 24}px` }}
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
        {/* Baldosas de líneas estructurales (absolutas a la fila de alto fijo) */}
        {depthTrail.slice(0, -1).map((isLastAncestor, i) => (
          !isLastAncestor && <div key={`anc-${i}`} className={`pointer-events-none absolute top-0 bottom-0 z-[1] w-px border-l border-dashed ${guideColorClass}`} style={{ left: `${i * 18 + 8}px` }} />
        ))}
        <div 
          className={`pointer-events-none absolute z-[1] w-px border-l border-dashed ${guideColorClass}`}
          style={{ left: `${depth * 18 + 8}px`, top: isFirstRoot ? '50%' : '0', bottom: isLast ? '50%' : '0' }}
        />
        <div className={`pointer-events-none absolute top-1/2 z-[1] h-px border-t border-dashed ${guideColorClass}`} style={{ left: `${depth * 18 + 8}px`, width: '18px' }} />
        
        {node.isStructure && hasChildren && (
          <button
            type='button'
            aria-label='Expandir o colapsar'
            className='absolute z-10 grid h-4 w-4 cursor-pointer place-items-center rounded-full border border-slate-300 bg-white text-slate-700 transition-colors hover:border-slate-400'
            style={{ left: `${depth * 18 + 8}px`, top: '50%', transform: 'translate(-50%, -50%)' }}
            onClick={(event) => {
              event.stopPropagation();
              toggleNodeExpanded(node.id);
            }}
          >
            <span className='block text-[10px] font-bold leading-none' style={{ marginTop: '-1px' }}>{node.expanded ? '−' : '+'}</span>
          </button>
        )}

        <div className={`relative z-[2] flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${selected ? 'border-white/15 bg-white/10' : node.isStructure ? 'border-sky-100 bg-sky-50' : 'border-slate-200 bg-slate-50'}`}>
          <RowIcon className={`h-[15px] w-[15px] ${selected ? 'text-white' : node.isStructure ? 'text-sky-700' : 'text-slate-500'}`} />
        </div>

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
            <div className='min-w-0'>
              <div className='flex min-w-0 items-center gap-2'>
                <p className={`truncate text-[13px] font-semibold leading-5 ${titleClassName}`}>{title}</p>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${badgeClassName}`}>
                  {badgeLabel}
                </span>
              </div>
              <p className={`mt-0.5 truncate text-[11px] ${subtitleClassName}`}>
                {node.isStructure
                  ? `Dentro del documento · profundidad ${depth + 1}`
                  : node.required
                    ? 'Campo obligatorio'
                    : 'Contenido opcional'}
              </p>
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
