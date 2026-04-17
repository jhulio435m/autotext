import { DndContext } from '@dnd-kit/core';
import { useMemo, useState } from 'react';
import useDocumentStore from '../../store';
import NodeRow from '../NodeRow';
import ConfirmDialog from '../ui/ConfirmDialog';
import BlockImportModal from '../ui/BlockImportModal';
import TemplateLibraryDialog from '../TemplateLibraryDialog';
import CanvasToolbar from './Toolbar';
import { flattenVisible, getDropPosition, getEventPointerY } from './helpers';

function DragDropCanvas() {
  const [compact, setCompact] = useState(false);
  const [overId, setOverId] = useState(null);
  const [dropPosition, setDropPosition] = useState(null);
  const [pendingDeleteNodeId, setPendingDeleteNodeId] = useState(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [importTargetId, setImportTargetId] = useState(null);

  const structure = useDocumentStore((state) => state.structure);
  const selectedId = useDocumentStore((state) => state.selectedId);
  const setSelectedId = useDocumentStore((state) => state.setSelectedId);
  const addNode = useDocumentStore((state) => state.addNode);
  const importNode = useDocumentStore((state) => state.importNode);
  const removeNode = useDocumentStore((state) => state.removeNode);
  const moveNode = useDocumentStore((state) => state.moveNode);
  const undo = useDocumentStore((state) => state.undo);
  const redo = useDocumentStore((state) => state.redo);
  const importJSON = useDocumentStore((state) => state.importJSON);
  const exportJSON = useDocumentStore((state) => state.exportJSON);
  const applyStructure = useDocumentStore((state) => state.applyStructure);
  const toggleCanvasExpanded = useDocumentStore((state) => state.toggleCanvasExpanded);
  const pushToast = useDocumentStore((state) => state.pushToast);

  const rows = useMemo(() => flattenVisible(structure), [structure]);
  const selectedRow = useMemo(() => rows.find((item) => item.node.id === selectedId) || null, [rows, selectedId]);
  const selectedNode = selectedRow?.node || null;

  const setAllExpanded = (value) => {
    const walk = (nodes) =>
      (nodes || []).map((node) => {
        if (!node.isStructure) return node;
        return {
          ...node,
          expanded: value,
          canvasExpanded: value,
          children: walk(node.children)
        };
      });

    applyStructure(walk(structure), { pushHistory: false });
  };

  const validateStructure = () => {
    const invalid = [];
    const walk = (nodes) => {
      (nodes || []).forEach((node) => {
        if (node.isStructure && (node.level < 1 || node.level > 5)) {
          invalid.push(node.id);
        }
        if (node.children?.length) walk(node.children);
      });
    };
    walk(structure);

    if (!invalid.length) {
      pushToast('Estructura válida para LaTeX.', 'success');
      return;
    }

    pushToast('Se detectaron niveles fuera del rango permitido (1-5).', 'warning');
  };

  const handleExport = () => {
    const content = exportJSON();
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'techdoc-structure.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (payload) => {
    importJSON(typeof payload === 'string' ? payload : JSON.stringify(payload));
    setTemplateDialogOpen(false);
  };

  const handleImportFile = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        importJSON(reader.result);
        setTemplateDialogOpen(false);
      }
    };
    reader.readAsText(file);
  };

  const handleInsert = (parentId, type) => {
    if (type === 'import_block') {
      setImportTargetId(parentId);
    } else {
      addNode(parentId, type);
    }
  };

  return (
    <section className='flex min-h-[calc(100vh-230px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]'>
      <CanvasToolbar
        rowsCount={rows.length}
        selectedNode={selectedNode}
        compact={compact}
        onUndo={undo}
        onRedo={redo}
        onCollapseAll={() => setAllExpanded(false)}
        onExpandAll={() => setAllExpanded(true)}
        onToggleCompact={() => setCompact((prev) => !prev)}
        onValidate={validateStructure}
        onExport={handleExport}
        onImport={() => setTemplateDialogOpen(true)}
      />

      <div className={`flex-1 overflow-auto bg-slate-50/70 p-3 ${compact ? 'text-xs' : 'text-sm'}`}>
        {rows.length ? (
          <div className='mx-auto max-w-[980px]'>
            <DndContext
              onDragMove={(event) => {
                if (!event.over) {
                  setOverId(null);
                  setDropPosition(null);
                  return;
                }

                const pointerY = getEventPointerY(event);
                const isStructure = Boolean(event.over.data.current?.node?.isStructure);
                const position = getDropPosition(pointerY, event.over.rect, isStructure);
                setOverId(event.over.id);
                setDropPosition(position);
              }}
              onDragEnd={(event) => {
                const { active, over } = event;
                if (!over || active.id === over.id) {
                  setOverId(null);
                  setDropPosition(null);
                  return;
                }

                const pointerY = getEventPointerY(event);
                const isStructure = Boolean(over.data.current?.node?.isStructure);
                const position = getDropPosition(pointerY, over.rect, isStructure);
                moveNode(active.id, over.id, position);
                setOverId(null);
                setDropPosition(null);
              }}
              onDragCancel={() => {
                setOverId(null);
                setDropPosition(null);
              }}
            >
              {rows.map(({ node, depth, numbering, sectionTrail, depthTrail, isFirstRoot }) => (
                <NodeRow
                  key={node.id}
                  node={node}
                  depth={depth}
                  numbering={numbering}
                  sectionTrail={sectionTrail}
                  depthTrail={depthTrail}
                  isFirstRoot={isFirstRoot}
                  selected={selectedId === node.id}
                  overId={overId}
                  dropPosition={dropPosition}
                  onSelect={setSelectedId}
                  onToggle={toggleCanvasExpanded}
                  onRequestDelete={setPendingDeleteNodeId}
                  onInsert={handleInsert}
                />
              ))}
            </DndContext>
          </div>
        ) : (
          <div className='grid min-h-[360px] place-items-center rounded-2xl border border-dashed border-slate-300 bg-white text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]'>
            <div className='max-w-sm px-6 py-8'>
              <h4 className='text-base font-semibold text-slate-900'>No hay bloques para editar.</h4>
              <p className='mt-2 text-sm text-slate-500'>
                Inserta una sección desde el panel de estructura para empezar a construir el documento.
              </p>
            </div>
          </div>
        )}
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

      <TemplateLibraryDialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        onImport={handleImport}
        onImportFile={handleImportFile}
        currentStructure={structure}
      />

      <BlockImportModal
        open={Boolean(importTargetId)}
        onClose={() => setImportTargetId(null)}
        structure={structure}
        onImport={(block) => {
          importNode(importTargetId, block);
          setImportTargetId(null);
        }}
      />
    </section>
  );
}

export default DragDropCanvas;
