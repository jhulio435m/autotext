import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { NodeTypeProperties } from '../PropertyPanel/NodeTypeProperties';
import TableEditor from '../TableEditor';
import ImageUploader from '../ImageUploader';
import MathEditor from '../MathEditor';
import AutoTextarea from '../ui/AutoTextarea';
import RichTextEditor from '../ui/RichTextEditor';
import { deepClone } from '../../utils/document';

export default function BlockTemplateEditorModal({ open, onClose, blockKey, initialBlock, onSave }) {
  const [nodeProps, setNodeProps] = useState({});
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (open && initialBlock) {
      setNodeProps({ id: blockKey, type: initialBlock.type, ...deepClone(initialBlock.nodeProps || {}) });
      setFormData(deepClone(initialBlock.formData || {}));
    }
  }, [open, initialBlock, blockKey]);

  if (!open) return null;

  const handleUpdateProps = (patch) => setNodeProps(prev => ({ ...prev, ...patch }));
  const handleUpdateData = (next) => setFormData(next);

  const blockType = nodeProps.type || 'text';

  return (
    <Modal title={`Configurar Bloque: ${blockKey}`} onClose={onClose} width='max-w-4xl'>
      <div className='flex flex-col gap-6 md:flex-row'>
        {/* Lado izquierdo: Editor de Contenido */}
        <div className='flex-1 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5 overflow-auto max-h-[70vh]'>
           <h3 className='text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>
             Contenido del Bloque ({blockType})
           </h3>
           <div className='bg-white p-4 rounded-lg border border-slate-200 shadow-sm'>
             {blockType === 'table' && <TableEditor block={nodeProps} value={formData} onChange={handleUpdateData} onUpdateProps={handleUpdateProps} />}
             {blockType === 'image' && <ImageUploader block={nodeProps} value={formData} onChange={handleUpdateData} />}
             {blockType === 'latex_graph' && (
               <MathEditor 
                 value={typeof formData === 'string' ? formData : ''} 
                 onChange={handleUpdateData} 
                 variables={nodeProps.mathVariables || []} 
                 onVariableChange={{ values: {}, set: ()=>{} }} 
               />
             )}
             {blockType === 'text' && (
               <AutoTextarea 
                 minRows={3}
                 value={typeof formData === 'string' ? formData : ''} 
                 onChange={e => handleUpdateData(e.target.value)} 
                 className='w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100' 
                 placeholder='Escribe el contenido de texto...'
               />
             )}
             {blockType === 'rich_text' && (
               <RichTextEditor 
                 value={typeof formData === 'string' ? formData : ''} 
                 onChange={handleUpdateData} 
               />
             )}
           </div>
        </div>
        
        {/* Lado derecho: Propiedades Avanzadas */}
        <div className='w-full space-y-4 md:w-80 md:border-l md:border-slate-200 md:pl-6 max-h-[70vh] overflow-y-auto'>
           <h3 className='text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>
             Propiedades visuales
           </h3>
           <NodeTypeProperties 
             selectedNode={nodeProps} 
             update={handleUpdateProps} 
             tableValue={formData} 
             updateTableValue={handleUpdateData} 
           />
        </div>
      </div>
      
      <div className='mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5'>
         <button 
           onClick={onClose} 
           className='px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors'
         >
           Cancelar
         </button>
         <button 
           onClick={() => onSave({ type: blockType, nodeProps, formData })} 
           className='bg-sky-600 text-white px-5 py-2 text-sm font-medium rounded-lg hover:bg-sky-700 transition-colors shadow-sm'
         >
           Guardar Bloque en Biblioteca
         </button>
      </div>
    </Modal>
  );
}
