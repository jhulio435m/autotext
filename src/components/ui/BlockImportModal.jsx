import { useMemo } from 'react';
import Modal from './Modal';
import { AlignLeft, Table, ImageIcon, Bookmark, Sigma, Radical, Sparkles } from 'lucide-react';
import useDocumentStore from '../../store';

const TYPE_CONFIG = {
  text: { label: 'Texto', Icon: AlignLeft },
  rich_text: { label: 'Texto enriquecido', Icon: AlignLeft },
  table: { label: 'Tabla', Icon: Table },
  advanced_table: { label: 'Tabla', Icon: Table },
  image: { label: 'Imagen', Icon: ImageIcon },
  latex_graph: { label: 'Gráfico', Icon: Sigma },
  formula: { label: 'Fórmula', Icon: Radical },
  ai_text: { label: 'IA', Icon: Sparkles },
  variable: { label: 'Variable', Icon: Bookmark },
  template_text: { label: 'Plantilla', Icon: AlignLeft },
};

function getAllBlocks(nodes, acc = []) {
  (nodes || []).forEach(node => {
    if (node.isStructure) {
      acc.push(node);
      getAllBlocks(node.children, acc);
    } else {
      acc.push(node);
    }
  });
  return acc;
}

function BlockImportModal({ open, onClose, structure, onImport }) {
  const currentProjectId = useDocumentStore(state => state.currentProjectId);
  const coverConfig = useDocumentStore(state => state.coverConfig);

  const variableBlocks = useMemo(() => {
    if (!open) return [];
    
    // 1. Local document reusable blocks
    const all = getAllBlocks(structure);
    const documentBlocks = all.filter(n => !n.isStructure && n.isVariable).map(b => ({
       ...b,
       _importSource: 'local'
    }));

    // 2. Project Library blocks
    const libraryBlocks = [];
    if (currentProjectId && coverConfig[currentProjectId]) {
      const pVars = coverConfig[currentProjectId].projectVariables || [];
      const pData = coverConfig[currentProjectId].projectData || {};
      
      const blockVars = pVars.filter(v => v.type === 'block');
      for (const bv of blockVars) {
        try {
          const val = pData[bv.key] || bv.value;
          if (typeof val === 'string' && val.startsWith('{')) {
            const parsed = JSON.parse(val);
            libraryBlocks.push({
               ...parsed.nodeProps, // Bring properties like width, columnCount, mathType
               type: parsed.type,
               id: `${bv.key}_${Date.now()}_${Math.floor(Math.random()*1000)}`,
               isVariable: false, 
               label: bv.label || parsed.nodeProps?.label || bv.key,
               _templateFormData: parsed.formData,
               _importSource: 'library'
            });
          }
        } catch(e) {}
      }
    }

    return [...libraryBlocks, ...documentBlocks];
  }, [open, structure, currentProjectId, coverConfig]);

  if (!open) return null;

  return (
    <Modal title='Importar bloque guardado' onClose={onClose} width='max-w-md'>
      <div className='flex flex-col gap-3'>
        <p className='text-sm text-slate-500 mb-2'>
          Selecciona un bloque que hayas guardado previamente como variable para insertarlo aquí.
        </p>

        {variableBlocks.length === 0 ? (
          <div className='py-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200'>
            <p className='text-sm text-slate-400'>No hay bloques guardados en este proyecto.</p>
            <p className='text-xs text-slate-400 mt-1'>Marca la casilla "Guardar como variable" en cualquier bloque.</p>
          </div>
        ) : (
          <div className='max-h-64 overflow-y-auto pr-1 space-y-2'>
            {variableBlocks.map((block) => {
              const conf = TYPE_CONFIG[block.type] || TYPE_CONFIG.text;
              const Icon = conf.Icon;
              return (
                <button
                  key={block.id}
                  onClick={() => onImport(block)}
                  className='w-full text-left flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500'
                >
                  <div className='flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-500 relative'>
                    <Icon className='h-4 w-4' />
                    {block._importSource === 'library' && (
                      <span className='absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full ring-2 ring-white bg-emerald-500' title="Biblioteca Global"></span>
                    )}
                  </div>
                  <div>
                    <h4 className='text-sm font-medium text-slate-800 line-clamp-1'>
                      {block.label || 'Bloque sin nombre'}
                    </h4>
                    <p className='text-xs text-slate-500 mt-0.5'>{conf.label}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default BlockImportModal;
