import { memo } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import {
  ChevronRight,
  GripVertical,
  Trash2,
  Bookmark,
  AlignLeft,
  Braces,
  Table,
  Image as ImageIcon,
  Sigma,
  Radical,
  Sparkles,
  Download,
  Settings,
  Database
} from 'lucide-react';
import Badge from './ui/Badge';
import useDocumentStore from '../store';

const TYPE_LABEL = {
  text: 'Texto',
  rich_text: 'Texto',
  template_text: 'Texto plantilla',
  table: 'Tabla',
  advanced_table: 'Tabla',
  image: 'Imagen',
  variable: 'Variable',
  latex_graph: 'Gráfico LaTeX',
  ai_text: 'Texto IA'
};

function NodeRow({
  node,
  depth,
  sectionTrail = [],
  depthTrail = [],
  isFirstRoot = false,
  selected,
  overId,
  dropPosition,
  onSelect,
  onToggle,
  onRequestDelete,
  onInsert
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
  const hasStructureChildren = (node.children || []).some((child) => child?.isStructure);
  const nodeTitle = node.isStructure ? node.title || 'Sección' : node.label || 'Bloque';
  const nodeSubtitle = node.isStructure ? `Nivel ${node.level || 1}` : TYPE_LABEL[node.type] || 'Bloque';
  const parentSection = !node.isStructure && sectionTrail.length ? sectionTrail[sectionTrail.length - 1] : '';
  const trailBeforeCurrent = node.isStructure ? sectionTrail.slice(0, -1) : sectionTrail;
  const canInsertSection = node.isStructure ? (node.level || 1) < 5 : sectionTrail.length < 5;
  const quickInsertItems = [
    { type: 'section', label: 'Subsección', Icon: Bookmark },
    { type: 'rich_text', label: 'Texto', Icon: AlignLeft },
    { type: 'table', label: 'Tabla', Icon: Table },
    { type: 'image', label: 'Imagen', Icon: ImageIcon },
    { type: 'latex_graph', label: 'Gráfico', Icon: Sigma },
    { type: 'formula', label: 'Fórmula', Icon: Radical },
    { type: 'import_block', label: 'Importar bloque', Icon: Download }
  ].filter((item) => item.type !== 'section' || canInsertSection);
  
  const isLast = depthTrail[depthTrail.length - 1];
  const showChildren = node.isStructure && node.canvasExpanded && (node.children || []).length > 0;
  const paddingLeft = depth * 16 + 24;

  return (
    <div className='relative group'>
      {showAbove ? <div className='absolute left-0 right-0 top-0 z-[2] h-0.5 rounded-full bg-sky-500' /> : null}

      <div
        ref={setRefs}
        data-is-structure={node.isStructure ? 'true' : 'false'}
        className={`group relative flex items-center rounded-sm py-1 pr-2 transition-colors ${
          isDragging ? 'opacity-50 z-[99]' : ''
        }`}
        style={{ paddingLeft: `${paddingLeft}px`, ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}) }}
        onClick={() => onSelect(node.id)}
      >
        {/* Baldosas de líneas estructurales (idénticas al panel izquierdo) */}
        {depthTrail.slice(0, -1).map((isLastAncestor, i) => (
          !isLastAncestor && <div key={`anc-${i}`} className="pointer-events-none absolute top-0 bottom-0 z-[1] w-px border-l border-dotted border-slate-400" style={{ left: `${i * 16 + 8}px` }} />
        ))}
        {/* Tronco Central */}
        <div
          className="pointer-events-none absolute z-[1] w-px border-l border-dotted border-slate-400"
          style={{ left: `${depth * 16 + 8}px`, top: isFirstRoot ? '50%' : '0', bottom: '50%' }}
        />
        {/* Tronco Inferior: nace desde el centro del icono hacia los hijos */}
        {showChildren ? (
          <div
            className="pointer-events-none absolute z-[1] w-px border-l border-dotted border-slate-400"
            style={{ left: `${depth * 16 + 8}px`, top: '50%', bottom: '0' }}
          />
        ) : null}
        {/* Rama Horizontal */}
        <div className="pointer-events-none absolute top-1/2 z-[1] h-px border-t border-dotted border-slate-400" style={{ left: `${depth * 16 + 8}px`, width: '16px' }} />
        
        {/* Caja de Expansión [+] / [-] */}
        {node.isStructure && hasStructureChildren && (
          <button
            type='button'
            aria-label='Expandir o colapsar'
            className='absolute z-10 grid h-[9px] w-[9px] cursor-pointer place-items-center border border-slate-400 bg-white text-slate-800 transition-colors hover:border-slate-500'
            style={{ left: `${depth * 16 + 8}px`, top: '50%', transform: 'translate(-50%, -50%)' }}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(node.id);
            }}
          >
            <span className='block text-[9px] font-bold leading-none' style={{ marginTop: '-1px' }}>{node.canvasExpanded ? '−' : '+'}</span>
          </button>
        )}
        <div 
          className='min-w-0 flex-1 cursor-pointer'
          onDoubleClick={(event) => {
            event.stopPropagation();
            onSelect(node.id);
            useDocumentStore.getState().setPropertyModalOpen(true);
          }}
        >
          <div className='flex min-w-0 flex-1 items-center'>
            {(() => {
              const NodeIcon = node.isStructure ? Bookmark : (
                { 
                  text: AlignLeft, rich_text: AlignLeft, template_text: Braces, 
                  table: Table, advanced_table: Table, image: ImageIcon, 
                  variable: Braces, latex_graph: Sigma, formula: Radical, ai_text: Sparkles 
                }[node.type] || AlignLeft
              );
              return <NodeIcon className={`h-[14px] w-[14px] mr-1.5 shrink-0 ${selected ? 'text-orange-500' : 'text-slate-400 group-hover:text-slate-500'}`} />;
            })()}
            <p className={`truncate text-[13px] leading-5 ${selected ? 'bg-sky-600 text-white px-1.5 rounded-[3px] -ml-1.5 font-normal' : 'text-slate-700 group-hover:text-slate-900 font-normal'}`} title={nodeTitle}>
              {(() => {
                if (typeof nodeTitle !== 'string') return nodeTitle;
                const parts = nodeTitle.split(/(\{\{[a-zA-Z0-9_]+\}\})/);
                if (parts.length === 1) return nodeTitle;
                
                return parts.map((part, i) => {
                  const match = part.match(/^\{\{([a-zA-Z0-9_]+)\}\}$/);
                  if (match) {
                    const key = match[1];
                    let friendly = key;
                    if (friendly.startsWith('var_')) {
                      friendly = friendly.replace(/^var_/, '').replace(/_/g, ' ');
                      friendly = friendly.charAt(0).toUpperCase() + friendly.slice(1);
                    }
                    const state = useDocumentStore.getState();
                    const projectId = state.currentProjectId;
                    if (projectId && state.coverConfig[projectId]) {
                      const pVars = state.coverConfig[projectId].projectVariables || [];
                      const f = pVars.find(v => v.key === key);
                      if (f?.label) friendly = f.label;
                    }

                    return (
                      <span 
                        key={i} 
                        className={`inline-flex items-center px-1 mx-0.5 rounded-[4px] border text-[11px] font-medium align-baseline shadow-sm ${selected ? 'bg-sky-800 text-sky-100 border-sky-700' : 'bg-sky-50 text-sky-800 border-sky-200'}`}
                      >
                        <Database className="w-3 h-3 opacity-60 shrink-0 mr-0.5" />
                        <span className="truncate max-w-[120px]">{friendly}</span>
                      </span>
                    );
                  }
                  return <span key={i}>{part}</span>;
                });
              })()}
            </p>
          </div>
        </div>

        <div className='inline-flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100'>
          {quickInsertItems.map(({ type, label, Icon }) => (
            <button
              key={`${node.id}-${type}`}
              type='button'
              aria-label={`Insertar ${label}`}
              title={`Insertar ${label}`}
              className='inline-flex h-5 w-5 items-center justify-center rounded-md border border-transparent p-0 text-[12px] text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800'
              onClick={(event) => {
                event.stopPropagation();
                onInsert(node.id, type);
              }}
            >
              <Icon className='h-4 w-4' />
            </button>
          ))}
        </div>

        <div className='flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100'>
          <button
            type='button'
            aria-label='Arrastrar para mover'
            title='Mover'
            className='inline-flex h-6 w-6 shrink-0 cursor-grab items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing'
            {...listeners}
            {...attributes}
            onClick={(event) => event.stopPropagation()}
          >
            <GripVertical className='h-[15px] w-[15px]' />
          </button>

          <button
            type='button'
            aria-label='Propiedades'
            title='Ajustes'
            className='inline-flex h-6 w-6 items-center justify-center rounded-md text-[15px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600'
            onClick={(event) => {
              event.stopPropagation();
              onSelect(node.id);
              useDocumentStore.getState().setPropertyModalOpen(true);
            }}
          >
            <Settings className='h-[14px] w-[14px]' />
          </button>

          <button
            type='button'
            aria-label='Eliminar elemento'
            title='Eliminar bloque'
            className='inline-flex h-6 w-6 items-center justify-center rounded-md text-[15px] text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600'
            onClick={(event) => {
              event.stopPropagation();
              onRequestDelete(node.id);
            }}
          >
            <Trash2 className='h-[15px] w-[15px]' />
          </button>
        </div>

        {showInside ? <div className='pointer-events-none absolute inset-1 rounded-lg border border-dashed border-sky-300 bg-sky-50/40' /> : null}
      </div>

      {showBelow ? <div className='absolute bottom-0 left-0 right-0 z-[2] h-0.5 rounded-full bg-sky-500' /> : null}
      {isOver && !showAbove && !showBelow && !showInside ? <div className='absolute inset-0 rounded-xl border border-sky-300' /> : null}
    </div>
  );
}

export default memo(NodeRow, (prev, next) => {
  return (
    prev.node === next.node &&
    prev.depth === next.depth &&
    prev.selected === next.selected &&
    prev.overId === next.overId &&
    prev.dropPosition === next.dropPosition &&
    prev.sectionTrail.join('///') === next.sectionTrail.join('///') &&
    prev.depthTrail.join('-') === next.depthTrail.join('-') &&
    prev.isFirstRoot === next.isFirstRoot
  );
});
