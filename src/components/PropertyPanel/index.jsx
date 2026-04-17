import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import useDocumentStore from '../../store';
import { findNode } from './shared';
import StructureProperties from './StructureProperties';
import BlockBaseProperties from './BlockBaseProperties';
import { NodeTypeProperties } from './NodeTypeProperties';
import FormField from '../FormField';

// Types rendered via FormField (content editor)
const CONTENT_TYPES = ['text', 'rich_text', 'template_text', 'ai_text', 'table', 'image', 'latex_graph'];

function modalWidth(node) {
  if (!node || node.isStructure) return 'max-w-lg';
  if (node.type === 'table') return 'max-w-5xl';
  if (['image', 'latex_graph'].includes(node.type)) return 'max-w-4xl';
  return 'max-w-2xl';
}

function blockTitle(node) {
  if (!node) return '';
  if (node.isStructure) return `Sección: ${node.title || 'sin nombre'}`;
  const labels = {
    table: 'Tabla', image: 'Imagen', variable: 'Variable',
    latex_graph: 'Fórmula', template_text: 'Plantilla', ai_text: 'Texto IA',
  };
  return labels[node.type] || node.label || 'Bloque';
}

function PropertyPanelModal({ open, onClose }) {
  const structure       = useDocumentStore((s) => s.structure);
  const formData        = useDocumentStore((s) => s.formData);
  const selectedId      = useDocumentStore((s) => s.selectedId);
  const updateNodeProps = useDocumentStore((s) => s.updateNodeProps);
  const updateFormData  = useDocumentStore((s) => s.updateFormData);
  const removeNode      = useDocumentStore((s) => s.removeNode);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const selectedNode = useMemo(() => findNode(structure, selectedId), [selectedId, structure]);

  const update = (patch) => { if (selectedNode) updateNodeProps(selectedNode.id, patch); };

  if (!open || !selectedNode) return null;

  const isContent = CONTENT_TYPES.includes(selectedNode.type);
  // TextProperties returns null so no point showing the right panel for pure text blocks
  const hasRightPanel = isContent && !['text', 'rich_text', 'template_text', 'ai_text'].includes(selectedNode.type);

  return (
    <Modal title={blockTitle(selectedNode)} onClose={onClose} width={modalWidth(selectedNode)}>
      <div className='flex max-h-[85vh] flex-col'>
        <div className='flex-1 overflow-auto text-sm'>

          {/* ── Structure ─────────────────────────────────────── */}
          {selectedNode.isStructure && (
            <StructureProperties selectedNode={selectedNode} update={update} />
          )}

          {/* ── Variable: single column config ────────────────── */}
          {!selectedNode.isStructure && selectedNode.type === 'variable' && (
            <>
              <BlockBaseProperties selectedNode={selectedNode} update={update} />
              <NodeTypeProperties selectedNode={selectedNode} update={update} />
            </>
          )}

          {/* ── All other block types: two-column layout ──────── */}
          {!selectedNode.isStructure && selectedNode.type !== 'variable' && (
            <div className={`flex gap-0 ${hasRightPanel ? 'md:flex-row' : 'flex-col'}`}>
              {/* Left: content editor */}
              <div className={`flex-1 overflow-auto ${selectedNode.type === 'table' ? 'p-0' : 'px-3 py-3'} ${hasRightPanel ? 'border-r border-slate-100' : ''}`}>
                {isContent
                  ? <FormField block={selectedNode} value={formData[selectedNode.id]} />
                  : null}
              </div>

              {/* Right: visual properties panel (same as BlockTemplateEditorModal) */}
              {hasRightPanel && (
                <div className='w-full shrink-0 space-y-0 overflow-y-auto md:w-72'>
                  <div className='sticky top-0 bg-white px-4 pb-2 pt-3'>
                    <h3 className='text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400'>
                      Propiedades visuales
                    </h3>
                  </div>
                  <div className='px-4 pb-4'>
                    <NodeTypeProperties
                      selectedNode={selectedNode}
                      update={update}
                      tableValue={formData[selectedNode.id]}
                      updateTableValue={(next) => updateFormData(selectedNode.id, next)}
                    />
                  </div>
                </div>
              )}

              {/* For pure-text blocks: show NodeTypeProperties inline below editor */}
              {!hasRightPanel && isContent && (
                <NodeTypeProperties selectedNode={selectedNode} update={update} />
              )}
            </div>
          )}

          {/* ── Delete button ─────────────────────────────────── */}
          <div className='border-t border-slate-100 px-3 py-2'>
            <button
              type='button'
              className='flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] text-slate-400 transition hover:bg-rose-50 hover:text-rose-600'
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className='h-3.5 w-3.5' />
              Eliminar
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete && Boolean(selectedNode)}
        title='Eliminar elemento'
        message='Esta acción eliminará el nodo seleccionado y sus hijos.'
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          removeNode(selectedNode.id);
          setConfirmDelete(false);
          onClose();
        }}
      />
    </Modal>
  );
}

export default PropertyPanelModal;
