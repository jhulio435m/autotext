import { deepClone, normalizeDocumentNodes, reassignAllIds } from '../../utils/document';
import { getRequiredBlocks, isBlockValueEmpty } from '../../utils/latex';
import { syncCurrentDocumentInMap } from '../helpers';

function collectFirstSelectableId(nodes) {
  for (const node of nodes || []) {
    if (node?.id) return node.id;
    if (node?.children?.length) {
      const nested = collectFirstSelectableId(node.children);
      if (nested) return nested;
    }
  }
  return null;
}

function expandImportedNodes(nodes) {
  return (nodes || []).map((node) => {
    if (!node?.isStructure) return node;
    return {
      ...node,
      expanded: true,
      canvasExpanded: true,
      children: expandImportedNodes(node.children || [])
    };
  });
}

function findNodeById(nodes, id) {
  for (const node of nodes || []) {
    if (node?.id === id) return node;
    if (node?.children?.length) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function createFormHistorySlice(set, get) {
  return {
    updateFormData: (varId, value) => {
      set((state) => {
        const node = findNodeById(state.structure, varId);
        const nextForm = { ...state.formData, [varId]: value };
        if (node?.type === 'variable' && node.variableKey && node.variableKey !== varId) {
          nextForm[node.variableKey] = value;
        }
        const nextDocuments = syncCurrentDocumentInMap(state, state.structure, nextForm);
        return {
          formData: nextForm,
          documents: nextDocuments,
          saveStatus: 'unsaved'
        };
      });
    },

    updateFormDataBulk: (patch) => {
      set((state) => {
        const nextForm = { ...state.formData, ...(patch || {}) };
        const nextDocuments = syncCurrentDocumentInMap(state, state.structure, nextForm);
        return {
          formData: nextForm,
          documents: nextDocuments,
          saveStatus: 'unsaved'
        };
      });
    },

    updatePreviewFormDataBulk: (patch) => {
      set((state) => ({
        formData: { ...state.formData, ...(patch || {}) }
      }));
    },

    undo: () => {
      const state = get();
      if (state.historyIndex <= 0) return;
      const nextIndex = state.historyIndex - 1;
      const snapshot = deepClone(state.history[nextIndex]);
      set((prev) => ({
        historyIndex: nextIndex,
        structure: snapshot,
        documents: syncCurrentDocumentInMap(prev, snapshot, prev.formData),
        saveStatus: 'unsaved'
      }));
    },

    redo: () => {
      const state = get();
      if (state.historyIndex >= state.history.length - 1) return;
      const nextIndex = state.historyIndex + 1;
      const snapshot = deepClone(state.history[nextIndex]);
      set((prev) => ({
        historyIndex: nextIndex,
        structure: snapshot,
        documents: syncCurrentDocumentInMap(prev, snapshot, prev.formData),
        saveStatus: 'unsaved'
      }));
    },

    exportJSON: () => JSON.stringify(get().structure, null, 2),

    importJSON: (json) => {
      try {
        const parsed = JSON.parse(json);
        if (!Array.isArray(parsed)) throw new Error('Formato invalido');
        const normalized = normalizeDocumentNodes(reassignAllIds(expandImportedNodes(parsed)));
        const selectedId = collectFirstSelectableId(normalized);

        set((state) => {
          const nextDocuments = syncCurrentDocumentInMap(state, normalized, {});
          return {
            formData: {},
            documents: nextDocuments,
            selectedId
          };
        });

        get().applyStructure(normalized, { selectedId });
        get().pushToast('JSON importado correctamente.', 'success');
      } catch {
        get().pushToast('No se pudo importar JSON. Revisa el formato.', 'error');
      }
    },

    validateRequiredBeforeExport: () => {
      const state = get();
      const required = getRequiredBlocks(state.structure);
      const missing = required.filter((node) => isBlockValueEmpty(node, state.formData[node.id]));
      return {
        ok: missing.length === 0,
        missing
      };
    }
  };
}

export { createFormHistorySlice };
