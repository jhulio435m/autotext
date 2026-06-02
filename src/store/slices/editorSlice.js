import { createNode, deepClone, normalizeDocumentNodes, cloneDocumentNode } from '../../utils/document';
import { insertNodeImmutably, moveNodeImmutably } from '../../utils/document/tree-operations';
import {
  MAX_LEVEL,
  findNodeInfo,
  isAncestor,
  normalizeLevel,
  removeNodeRecursive,
  syncCurrentDocumentInMap,
  updateNodeRecursive
} from '../helpers';

function createEditorSlice(set, get) {
  return {
    setSelectedId: (id) => set({ selectedId: id }),

    applyStructure: (nextStructure, options = {}) => {
      set((state) => {
        const normalizedStructure = nextStructure;
        const historyBase = options.pushHistory === false ? state.history : state.history.slice(0, state.historyIndex + 1);
        const nextHistory = options.pushHistory === false ? historyBase : [...historyBase, normalizedStructure];
        const nextHistoryIndex = options.pushHistory === false ? state.historyIndex : nextHistory.length - 1;
        const nextDocuments = syncCurrentDocumentInMap(state, normalizedStructure, state.formData);

        return {
          structure: normalizedStructure,
          documents: nextDocuments,
          history: nextHistory,
          historyIndex: nextHistoryIndex,
          selectedId: options.selectedId ?? state.selectedId,
          saveStatus: 'unsaved'
        };
      });
    },

    toggleNodeExpanded: (nodeId) => {
      const next = updateNodeRecursive(get().structure, nodeId, (node) => ({ ...node, expanded: !node.expanded }));
      get().applyStructure(next, { pushHistory: false });
    },

    toggleCanvasExpanded: (nodeId) => {
      const next = updateNodeRecursive(get().structure, nodeId, (node) => ({ ...node, canvasExpanded: !node.canvasExpanded }));
      get().applyStructure(next, { pushHistory: false });
    },

    updateNodeProps: (nodeId, patch) => {
      const next = updateNodeRecursive(get().structure, nodeId, (node) => ({ ...node, ...patch }));
      get().applyStructure(next);
    },

    createVariableFromTemplateSelection: (nodeId, selectedText, placeholder) => {
      const text = String(selectedText || '').trim();
      if (!text) return;

      const structure = get().structure;
      const target = findNodeInfo(structure, nodeId);
      if (!target) return;

      const variableNode = createNode('variable', target.parentNode?.level ? target.parentNode.level + 1 : 1);
      const slug = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 32) || 'campo';
      const variableKey = `var_${slug}`;

      Object.assign(variableNode, {
        label: text,
        variableKey,
        inputPlaceholder: placeholder || text
      });

      const nextStructure = insertNodeImmutably(structure, target.node.id, variableNode, 'below');

      get().applyStructure(nextStructure, { selectedId: variableNode.id });
      return variableNode;
    },

    addNode: (targetId, newItemType) => {
      const structure = get().structure;
      const target = findNodeInfo(structure, targetId);
      if (!target) return;

      const wantsSection = newItemType === 'section';
      const siblingBaseLevel = target.parentNode?.level ? target.parentNode.level + 1 : 1;
      const insideLevel = target.node.level ? target.node.level + 1 : 2;

      let targetLevel = target.node.isStructure ? insideLevel : siblingBaseLevel;
      if (wantsSection && targetLevel > MAX_LEVEL) {
        get().pushToast('Limite de jerarquia LaTeX alcanzado (max. nivel 5).', 'warning');
        return;
      }

      const newNode = createNode(newItemType, targetLevel);

      let nextStructure;
      if (target.node.isStructure) {
        nextStructure = insertNodeImmutably(structure, target.node.id, newNode, 'inside');
      } else {
        nextStructure = insertNodeImmutably(structure, target.node.id, newNode, 'below');
      }

      get().applyStructure(nextStructure, { selectedId: newNode.id });
    },

    importNode: (targetId, sourceNode) => {
      const structure = get().structure;
      const target = findNodeInfo(structure, targetId);
      if (!target || !sourceNode) return;

      const newNode = cloneDocumentNode(sourceNode);

      let nextStructure;
      if (target.node.isStructure) {
        nextStructure = insertNodeImmutably(structure, target.node.id, newNode, 'inside');
      } else {
        nextStructure = insertNodeImmutably(structure, target.node.id, newNode, 'below');
      }

      get().applyStructure(nextStructure, { selectedId: newNode.id });

      if (sourceNode._templateFormData) {
        set((state) => ({
          formData: { ...state.formData, [newNode.id]: deepClone(sourceNode._templateFormData) }
        }));
      }
    },

    removeNode: (nodeId) => {
      const state = get();
      const removed = removeNodeRecursive(state.structure, nodeId);
      if (!removed.removed) return;
      get().applyStructure(removed.next, { selectedId: state.selectedId === nodeId ? null : state.selectedId });
    },

    moveNode: (dragId, targetId, position) => {
      if (!dragId || !targetId || dragId === targetId) return;

      const state = get();
      if (isAncestor(state.structure, dragId, targetId)) return;

      const structure = state.structure;
      const dragInfo = findNodeInfo(structure, dragId);
      if (!dragInfo?.parentArray) return;
      const draggedNode = dragInfo.node;

      const targetInfo = findNodeInfo(structure, targetId);
      if (!targetInfo) return;

      let finalPosition = position;
      if (finalPosition === 'inside' && !targetInfo.node.isStructure) {
        finalPosition = 'below';
      }

      if (finalPosition === 'inside' && targetInfo.node.level >= MAX_LEVEL && draggedNode.isStructure) {
        finalPosition = 'below';
      }

      if (finalPosition === 'inside') {
        const desiredLevel = (targetInfo.node.level || 1) + 1;
        if (draggedNode.isStructure && desiredLevel > MAX_LEVEL) {
          get().pushToast('Limite de jerarquia LaTeX alcanzado (max. nivel 5).', 'warning');
          return;
        }
      } else {
        const desiredLevel = targetInfo.node.isStructure
          ? targetInfo.node.level || 1
          : (targetInfo.parentNode?.level || 1) + 1;

        if (draggedNode.isStructure && desiredLevel > MAX_LEVEL) {
          get().pushToast('Limite de jerarquia LaTeX alcanzado (max. nivel 5).', 'warning');
          return;
        }
      }

      const nextStructure = moveNodeImmutably(structure, dragId, targetId, finalPosition, normalizeLevel);
      get().applyStructure(nextStructure, { selectedId: dragId });
    }
  };
}

export { createEditorSlice };
