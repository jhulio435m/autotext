import { DndContext } from '@dnd-kit/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import useDocumentStore from '../store';
import NodeRow from './NodeRow';

function getPointerY(activatorEvent) {
  if (!activatorEvent) return null;
  if (typeof activatorEvent.clientY === 'number') return activatorEvent.clientY;
  if (activatorEvent.touches?.[0]?.clientY) return activatorEvent.touches[0].clientY;
  if (activatorEvent.changedTouches?.[0]?.clientY) return activatorEvent.changedTouches[0].clientY;
  return null;
}

function getDropPosition(pointerY, rect, isStructure) {
  if (pointerY == null || !rect) return 'below';
  const relY = (pointerY - rect.top) / rect.height;

  if (!isStructure) {
    return relY < 0.5 ? 'above' : 'below';
  }

  if (relY < 0.25) return 'above';
  if (relY > 0.75) return 'below';
  return 'inside';
}

function flattenVisible(nodes, depth = 0, acc = []) {
  (nodes || []).forEach((node) => {
    acc.push({ node, depth });
    if (node.isStructure && node.canvasExpanded && node.children?.length) {
      flattenVisible(node.children, depth + 1, acc);
    }
  });
  return acc;
}

function DragDropCanvas() {
  const containerRef = useRef(null);
  const [compact, setCompact] = useState(false);
  const [openInsertFor, setOpenInsertFor] = useState(null);
  const [overId, setOverId] = useState(null);
  const [dropPosition, setDropPosition] = useState(null);

  const structure = useDocumentStore((state) => state.structure);
  const selectedId = useDocumentStore((state) => state.selectedId);
  const setSelectedId = useDocumentStore((state) => state.setSelectedId);
  const addNode = useDocumentStore((state) => state.addNode);
  const removeNode = useDocumentStore((state) => state.removeNode);
  const moveNode = useDocumentStore((state) => state.moveNode);
  const undo = useDocumentStore((state) => state.undo);
  const redo = useDocumentStore((state) => state.redo);
  const importJSON = useDocumentStore((state) => state.importJSON);
  const exportJSON = useDocumentStore((state) => state.exportJSON);
  const toggleCanvasExpanded = useDocumentStore((state) => state.toggleCanvasExpanded);
  const applyStructure = useDocumentStore((state) => state.applyStructure);
  const pushToast = useDocumentStore((state) => state.pushToast);

  const rows = useMemo(() => flattenVisible(structure), [structure]);
  const selectedNode = useMemo(() => rows.find((item) => item.node.id === selectedId)?.node || null, [rows, selectedId]);

  useEffect(() => {
    const handler = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpenInsertFor(null);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
      pushToast('Estructura valida para LaTeX.', 'success');
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

  const handleImport = () => {
    const raw = window.prompt('Pega aqui el JSON de estructura');
    if (!raw) return;
    importJSON(raw);
  };

  return (
    <section ref={containerRef} className='animate-fade-up flex min-h-[calc(100vh-230px)] flex-col rounded-xl border border-slate-200 bg-slate-50'>
      <header className='editor-canvas-toolbar border-b border-slate-200 bg-white px-3 py-2'>
        <div className='editor-toolbar-group'>
          <button type='button' className='editor-icon-btn' title='Deshacer' aria-label='Deshacer' onClick={undo}>↶</button>
          <button type='button' className='editor-icon-btn' title='Rehacer' aria-label='Rehacer' onClick={redo}>↷</button>
          <button type='button' className='editor-icon-btn' title='Colapsar secciones' aria-label='Colapsar secciones' onClick={() => setAllExpanded(false)}>⊟</button>
          <button type='button' className='editor-icon-btn' title='Expandir secciones' aria-label='Expandir secciones' onClick={() => setAllExpanded(true)}>⊞</button>
          <button type='button' className='editor-icon-btn' title='Validar estructura' aria-label='Validar estructura' onClick={validateStructure}>✓</button>
        </div>

        <div className='editor-toolbar-group'>
          <button
            type='button'
            className='editor-icon-btn'
            title={compact ? 'Vista normal' : 'Vista compacta'}
            aria-label={compact ? 'Vista normal' : 'Vista compacta'}
            onClick={() => setCompact((prev) => !prev)}
          >
            {compact ? '▤' : '▥'}
          </button>
          <button type='button' className='editor-icon-btn' title='Exportar JSON' aria-label='Exportar JSON' onClick={handleExport}>⤓</button>
          <button type='button' className='editor-icon-btn' title='Importar JSON' aria-label='Importar JSON' onClick={handleImport}>⤒</button>
          <span className='editor-toolbar-chip'>{rows.length} bloques</span>
          {selectedNode ? <span className='editor-toolbar-chip truncate max-w-44'>Seleccionado: {selectedNode.label || selectedNode.title || selectedNode.id}</span> : null}
        </div>
      </header>

      <div className={`flex-1 space-y-1 overflow-auto p-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        {rows.length ? (
          <DndContext
            onDragMove={(event) => {
              if (!event.over) {
                setOverId(null);
                setDropPosition(null);
                return;
              }

              const pointerY = getPointerY(event.activatorEvent);
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

              const pointerY = getPointerY(event.activatorEvent);
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
            {rows.map(({ node, depth }) => (
              <NodeRow
                key={node.id}
                node={node}
                depth={depth}
                selected={selectedId === node.id}
                overId={overId}
                dropPosition={dropPosition}
                insertOpen={openInsertFor === node.id}
                onSelect={setSelectedId}
                onToggle={toggleCanvasExpanded}
                onDelete={removeNode}
                onOpenInsert={setOpenInsertFor}
                onCloseInsert={() => setOpenInsertFor(null)}
                onInsert={(targetId, type) => addNode(targetId, type)}
              />
            ))}
          </DndContext>
        ) : (
          <div className='rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500'>
            No hay bloques para editar. Inserta una seccion desde el panel de estructura.
          </div>
        )}
      </div>
    </section>
  );
}

export default DragDropCanvas;
