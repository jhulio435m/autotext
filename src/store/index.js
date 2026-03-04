import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { MOCK_PROJECTS } from '../data/projects';
import { MOCK_DOCUMENTS, DEFAULT_COVERS, SYSTEM_TEMPLATES } from '../data/documents';
import { createNode, deepClone, flattenNodes, reassignAllIds } from '../utils/document';
import { getRequiredBlocks, isValueEmpty } from '../utils/latex';
import { STORAGE_KEYS } from '../constants/storage';
import { clearSessionToken } from '../api/session';

const MAX_LEVEL = 5;
export { STORAGE_KEYS };

const hasStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function nowISO() {
  return new Date().toISOString();
}

function formatVersion(version) {
  return version || 'v0.1';
}

function cloneTemplateFromDocument(doc) {
  if (!doc?.structure) {
    return { structure: [createNode('section', 1)], formData: {} };
  }
  return {
    structure: reassignAllIds(deepClone(doc.structure)),
    formData: {}
  };
}

function findNodeInfo(nodes, id, parentArray = null, parentNode = null) {
  for (let i = 0; i < (nodes || []).length; i += 1) {
    const node = nodes[i];
    if (node.id === id) {
      return { node, index: i, parentArray: nodes, parentNode };
    }
    if (node.children?.length) {
      const found = findNodeInfo(node.children, id, node.children, node);
      if (found) return found;
    }
  }
  return null;
}

function updateNodeRecursive(nodes, id, updater) {
  return (nodes || []).map((node) => {
    if (node.id === id) {
      return updater(node);
    }
    if (node.children?.length) {
      return { ...node, children: updateNodeRecursive(node.children, id, updater) };
    }
    return node;
  });
}

function removeNodeRecursive(nodes, id) {
  let removed = null;
  const next = (nodes || [])
    .map((node) => {
      if (node.id === id) {
        removed = node;
        return null;
      }
      if (node.children?.length) {
        const inner = removeNodeRecursive(node.children, id);
        if (inner.removed) removed = inner.removed;
        return { ...node, children: inner.next };
      }
      return node;
    })
    .filter(Boolean);

  return { next, removed };
}

function isAncestor(nodes, ancestorId, targetId) {
  const ancestor = findNodeInfo(nodes, ancestorId)?.node;
  if (!ancestor?.children?.length) return false;
  const all = flattenNodes(ancestor.children);
  return all.some((node) => node.id === targetId);
}

function normalizeLevel(node, level) {
  if (!node.isStructure) return node;
  const safeLevel = Math.min(MAX_LEVEL, Math.max(1, level));
  return {
    ...node,
    level: safeLevel,
    children: (node.children || []).map((child) => normalizeLevel(child, child.isStructure ? safeLevel + 1 : safeLevel + 1))
  };
}

function createBlankStructure() {
  return [
    {
      id: `sec_${nanoid(8)}`,
      isStructure: true,
      level: 1,
      title: 'Nueva seccion',
      expanded: true,
      canvasExpanded: true,
      children: []
    }
  ];
}

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function colorFromString(value) {
  const palette = ['#006399', '#0e7490', '#2563eb', '#0f766e', '#4338ca', '#1d4ed8', '#0ea5a4', '#0369a1'];
  const text = String(value || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

function normalizePlaneProject(raw) {
  if (!raw?.id || !raw?.name) return null;
  return {
    id: String(raw.id),
    name: String(raw.name),
    description: raw.description ? String(raw.description) : '',
    code: raw.identifier ? String(raw.identifier) : 'Sin codigo',
    accentColor: colorFromString(raw.identifier || raw.name || raw.id),
    updatedAt: raw.updated_at || raw.created_at || nowISO(),
    coverImageUrl: raw.cover_image_url ? String(raw.cover_image_url) : '',
    coverImageAssetId: raw.cover_image_asset_id ? String(raw.cover_image_asset_id) : null,
    source: 'plane',
    workspaceId: raw.workspace_id || null
  };
}

function normalizePlaneIssueDocument(raw) {
  if (!raw?.id || !raw?.name) return null;
  return {
    id: String(raw.id),
    name: String(raw.name),
    type: 'Issue Plane',
    description: raw.description ? String(raw.description) : '',
    version: 'Plane',
    updatedAt: raw.updated_at || raw.created_at || nowISO(),
    structure: [],
    formData: {},
    source: 'plane_issue',
    labels: Array.isArray(raw.labels) ? raw.labels : [],
    issueProjectId: raw.project_id || null,
    workspaceId: raw.workspace_id || null,
    automatable: Boolean(raw.automatable)
  };
}

function loadInitialState() {
  const projects = hasStorage
    ? safeParse(window.localStorage.getItem(STORAGE_KEYS.projects), null) || deepClone(MOCK_PROJECTS)
    : deepClone(MOCK_PROJECTS);

  const documents = hasStorage
    ? safeParse(window.localStorage.getItem(STORAGE_KEYS.docsIndex), null) || deepClone(MOCK_DOCUMENTS)
    : deepClone(MOCK_DOCUMENTS);

  const coverConfig = deepClone(DEFAULT_COVERS);

  projects.forEach((project) => {
    const key = `techdoc_cover_${project.id}`;
    const savedCover = hasStorage ? safeParse(window.localStorage.getItem(key), null) : null;
    if (savedCover) {
      coverConfig[project.id] = { ...coverConfig[project.id], ...savedCover };
    }
  });

  Object.keys(documents).forEach((projectId) => {
    documents[projectId] = (documents[projectId] || []).map((doc) => {
      const saved = hasStorage ? safeParse(window.localStorage.getItem(`techdoc_doc_${doc.id}`), null) : null;
      if (!saved) return doc;
      return {
        ...doc,
        structure: saved.structure || doc.structure,
        formData: saved.formData || doc.formData || {}
      };
    });
  });

  const currentUser = hasStorage ? safeParse(window.localStorage.getItem(STORAGE_KEYS.user), null) : null;

  return {
    projects,
    documents,
    coverConfig,
    currentUser
  };
}

const seed = loadInitialState();

function syncCurrentDocumentInMap(state, structure, formData) {
  const { currentProjectId, currentDocumentId } = state;
  if (!currentProjectId || !currentDocumentId) return state.documents;

  return {
    ...state.documents,
    [currentProjectId]: (state.documents[currentProjectId] || []).map((doc) =>
      doc.id === currentDocumentId
        ? {
            ...doc,
            structure,
            formData,
            updatedAt: nowISO()
          }
        : doc
    )
  };
}

const useDocumentStore = create((set, get) => ({
  currentUser: seed.currentUser,
  projects: seed.projects,
  currentProjectId: seed.projects[0]?.id || null,
  documents: seed.documents,
  currentDocumentId: null,
  structure: [],
  selectedId: null,
  activeMode: 'editor',
  formData: {},
  coverConfig: seed.coverConfig,
  history: [],
  historyIndex: -1,
  saveStatus: 'saved',
  toasts: [],

  setCurrentUser: (user) => {
    if (hasStorage) {
      if (user) window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
      else window.localStorage.removeItem(STORAGE_KEYS.user);
    }
    set({ currentUser: user });
  },

  logout: () => {
    clearSessionToken();
    if (hasStorage) {
      window.localStorage.removeItem(STORAGE_KEYS.user);
    }
    set({ currentUser: null });
  },

  setProjectsFromPlane: (planeProjects) => {
    if (!Array.isArray(planeProjects)) return;

    const mapped = planeProjects.map(normalizePlaneProject).filter(Boolean);
    if (!mapped.length) return;

    set((state) => {
      const nextDocuments = { ...state.documents };
      mapped.forEach((project) => {
        if (!Array.isArray(nextDocuments[project.id])) {
          nextDocuments[project.id] = [];
        }
      });

      const nextCurrentProjectId = mapped.some((project) => project.id === state.currentProjectId)
        ? state.currentProjectId
        : mapped[0]?.id || null;

      return {
        projects: mapped,
        documents: nextDocuments,
        currentProjectId: nextCurrentProjectId,
        saveStatus: 'saved'
      };
    });
  },

  setDocumentsFromPlaneIssues: (projectId, issues) => {
    if (!projectId || !Array.isArray(issues)) return;
    const mapped = issues.map(normalizePlaneIssueDocument).filter(Boolean);

    set((state) => {
      const currentDocs = Array.isArray(state.documents[projectId]) ? state.documents[projectId] : [];
      const currentById = new Map(currentDocs.map((doc) => [doc.id, doc]));
      const mappedIds = new Set(mapped.map((doc) => doc.id));

      // Keep local edits (name/structure/formData/etc.) when the issue already exists.
      const mergedMapped = mapped.map((incoming) => {
        const existing = currentById.get(incoming.id);
        if (!existing) return incoming;

        return {
          ...incoming,
          ...existing,
          id: incoming.id,
          source: incoming.source,
          labels: incoming.labels,
          issueProjectId: incoming.issueProjectId,
          workspaceId: incoming.workspaceId,
          automatable: incoming.automatable,
          planeName: incoming.name,
          planeDescription: incoming.description,
          planeUpdatedAt: incoming.updatedAt
        };
      });

      // Preserve local-only docs (for independent workflow).
      const localOnly = currentDocs.filter((doc) => !mappedIds.has(doc.id));

      const nextDocuments = {
        ...state.documents,
        [projectId]: [...mergedMapped, ...localOnly]
      };

      const currentDocExists = nextDocuments[projectId].some((doc) => doc.id === state.currentDocumentId);
      return {
        documents: nextDocuments,
        currentDocumentId: currentDocExists ? state.currentDocumentId : null,
        saveStatus: 'saved'
      };
    });
  },

  hydrateWorkspace: (workspace) => {
    if (!isRecord(workspace)) return;

    set((state) => {
      const projects = Array.isArray(workspace.projects) ? workspace.projects : state.projects;
      const documents = isRecord(workspace.documents) ? workspace.documents : state.documents;
      const incomingCoverConfig = isRecord(workspace.coverConfig) ? workspace.coverConfig : {};
      const coverConfig = { ...deepClone(DEFAULT_COVERS), ...incomingCoverConfig };

      const nextCurrentProjectId = projects.some((project) => project.id === state.currentProjectId)
        ? state.currentProjectId
        : projects[0]?.id || null;

      const docsInCurrentProject = nextCurrentProjectId ? documents[nextCurrentProjectId] || [] : [];
      const nextCurrentDocumentId = docsInCurrentProject.some((doc) => doc.id === state.currentDocumentId)
        ? state.currentDocumentId
        : null;

      const selectedDoc = nextCurrentDocumentId ? docsInCurrentProject.find((doc) => doc.id === nextCurrentDocumentId) : null;
      const structure = selectedDoc ? deepClone(selectedDoc.structure || createBlankStructure()) : [];
      const formData = selectedDoc ? deepClone(selectedDoc.formData || {}) : {};

      return {
        projects,
        documents,
        coverConfig,
        currentProjectId: nextCurrentProjectId,
        currentDocumentId: nextCurrentDocumentId,
        structure,
        formData,
        selectedId: null,
        history: structure.length ? [deepClone(structure)] : [],
        historyIndex: structure.length ? 0 : -1,
        saveStatus: 'saved'
      };
    });
  },

  setCurrentProject: (projectId) => {
    set({ currentProjectId: projectId });
  },

  setCurrentDocument: (projectId, docId) => {
    const docs = get().documents[projectId] || [];
    const doc = docs.find((item) => item.id === docId);
    if (!doc) return;
    const structure = deepClone(doc.structure || createBlankStructure());
    set({
      currentProjectId: projectId,
      currentDocumentId: docId,
      structure,
      formData: deepClone(doc.formData || {}),
      selectedId: null,
      history: [deepClone(structure)],
      historyIndex: 0,
      saveStatus: 'saved'
    });
  },

  setActiveMode: (mode) => set({ activeMode: mode }),

  setSaveStatus: (status) => set({ saveStatus: status }),

  pushToast: (message, type = 'info') => {
    const id = `toast_${nanoid(8)}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    return id;
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },

  markUnsaved: () => set({ saveStatus: 'unsaved' }),

  addProject: ({ name, description, code, accentColor }) => {
    const project = {
      id: `proj_${nanoid(8)}`,
      name,
      description: description || '',
      code: code || '',
      accentColor: accentColor || '#006399',
      updatedAt: nowISO()
    };

    set((state) => ({
      projects: [project, ...state.projects],
      documents: { ...state.documents, [project.id]: [] },
      currentProjectId: project.id,
      saveStatus: 'unsaved'
    }));
  },

  updateProject: (projectId, patch) => {
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId ? { ...project, ...patch, updatedAt: nowISO() } : project
      ),
      saveStatus: 'unsaved'
    }));
  },

  duplicateProject: (projectId) => {
    const state = get();
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) return;

    const nextProjectId = `proj_${nanoid(8)}`;
    const sourceDocs = state.documents[projectId] || [];

    const duplicatedDocs = sourceDocs.map((doc) => {
      const nextDocId = `doc_${nanoid(8)}`;
      const template = cloneTemplateFromDocument(doc);
      return {
        ...doc,
        id: nextDocId,
        name: `${doc.name} (Copia)`,
        version: 'v0.1',
        updatedAt: nowISO(),
        structure: template.structure,
        formData: {}
      };
    });

    const nextProject = {
      ...project,
      id: nextProjectId,
      name: `${project.name} (Copia)`,
      updatedAt: nowISO()
    };

    const nextCovers = {
      ...state.coverConfig,
      [nextProjectId]: deepClone(state.coverConfig[projectId] || {})
    };

    set({
      projects: [nextProject, ...state.projects],
      documents: { ...state.documents, [nextProjectId]: duplicatedDocs },
      coverConfig: nextCovers,
      saveStatus: 'unsaved'
    });
  },

  removeProject: (projectId) => {
    set((state) => {
      const nextDocs = { ...state.documents };
      delete nextDocs[projectId];
      const nextCovers = { ...state.coverConfig };
      delete nextCovers[projectId];
      return {
        projects: state.projects.filter((project) => project.id !== projectId),
        documents: nextDocs,
        coverConfig: nextCovers,
        saveStatus: 'unsaved'
      };
    });
  },

  addDocument: ({ projectId, name, type, description, templateMode, sourceDocId, systemTemplateId }) => {
    const state = get();
    const sourceDoc = Object.values(state.documents)
      .flat()
      .find((doc) => doc.id === sourceDocId);

    const systemTemplate = SYSTEM_TEMPLATES.find((tpl) => tpl.id === systemTemplateId);

    let initialStructure = createBlankStructure();
    let initialFormData = {};

    if (templateMode === 'reuse' && sourceDoc) {
      const cloned = cloneTemplateFromDocument(sourceDoc);
      initialStructure = cloned.structure;
      initialFormData = cloned.formData;
    }

    if (templateMode === 'system' && systemTemplate) {
      initialStructure = reassignAllIds(deepClone(systemTemplate.structure));
      initialFormData = {};
    }

    const document = {
      id: `doc_${nanoid(8)}`,
      name,
      type,
      description,
      version: 'v0.1',
      updatedAt: nowISO(),
      structure: initialStructure,
      formData: initialFormData
    };

    set((prev) => ({
      documents: {
        ...prev.documents,
        [projectId]: [document, ...(prev.documents[projectId] || [])]
      },
      projects: prev.projects.map((project) =>
        project.id === projectId ? { ...project, updatedAt: nowISO() } : project
      ),
      saveStatus: 'unsaved'
    }));

    return document.id;
  },

  updateDocumentMeta: (projectId, docId, patch) => {
    set((state) => ({
      documents: {
        ...state.documents,
        [projectId]: (state.documents[projectId] || []).map((doc) =>
          doc.id === docId ? { ...doc, ...patch, updatedAt: nowISO() } : doc
        )
      },
      saveStatus: 'unsaved'
    }));
  },

  duplicateDocument: (projectId, docId) => {
    const doc = (get().documents[projectId] || []).find((item) => item.id === docId);
    if (!doc) return;

    const cloned = cloneTemplateFromDocument(doc);

    set((state) => ({
      documents: {
        ...state.documents,
        [projectId]: [
          {
            ...doc,
            id: `doc_${nanoid(8)}`,
            name: `${doc.name} (Copia)`,
            version: 'v0.1',
            updatedAt: nowISO(),
            structure: cloned.structure,
            formData: {}
          },
          ...(state.documents[projectId] || [])
        ]
      },
      saveStatus: 'unsaved'
    }));
  },

  removeDocument: (projectId, docId) => {
    set((state) => ({
      documents: {
        ...state.documents,
        [projectId]: (state.documents[projectId] || []).filter((doc) => doc.id !== docId)
      },
      currentDocumentId: state.currentDocumentId === docId ? null : state.currentDocumentId,
      saveStatus: 'unsaved'
    }));
  },

  updateCoverConfig: (projectId, patch) => {
    set((state) => ({
      coverConfig: {
        ...state.coverConfig,
        [projectId]: {
          ...(state.coverConfig[projectId] || {}),
          ...patch
        }
      },
      saveStatus: 'unsaved'
    }));
  },

  setSelectedId: (id) => set({ selectedId: id }),

  applyStructure: (nextStructure, options = {}) => {
    set((state) => {
      const historyBase = options.pushHistory === false ? state.history : state.history.slice(0, state.historyIndex + 1);
      const nextHistory = options.pushHistory === false ? historyBase : [...historyBase, deepClone(nextStructure)];
      const nextHistoryIndex = options.pushHistory === false ? state.historyIndex : nextHistory.length - 1;
      const nextDocuments = syncCurrentDocumentInMap(state, nextStructure, state.formData);

      return {
        structure: nextStructure,
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

  addNode: (targetId, newItemType) => {
    const structure = deepClone(get().structure);
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

    if (target.node.isStructure) {
      target.node.children = target.node.children || [];
      target.node.children.push(newNode);
      target.node.canvasExpanded = true;
    } else {
      const siblings = target.parentArray || structure;
      siblings.splice(target.index + 1, 0, newNode);
    }

    get().applyStructure(structure, { selectedId: newNode.id });
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

    const structure = deepClone(state.structure);
    const dragInfo = findNodeInfo(structure, dragId);
    if (!dragInfo?.parentArray) return;

    const [draggedNode] = dragInfo.parentArray.splice(dragInfo.index, 1);

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
      const fixed = draggedNode.isStructure ? normalizeLevel(draggedNode, desiredLevel) : draggedNode;
      targetInfo.node.children = targetInfo.node.children || [];
      targetInfo.node.children.push(fixed);
      targetInfo.node.canvasExpanded = true;
    } else {
      const siblings = targetInfo.parentArray || structure;
      const insertIndex = finalPosition === 'above' ? targetInfo.index : targetInfo.index + 1;
      const desiredLevel = targetInfo.node.isStructure
        ? targetInfo.node.level || 1
        : (targetInfo.parentNode?.level || 1) + 1;

      if (draggedNode.isStructure && desiredLevel > MAX_LEVEL) {
        get().pushToast('Limite de jerarquia LaTeX alcanzado (max. nivel 5).', 'warning');
        return;
      }

      const fixed = draggedNode.isStructure ? normalizeLevel(draggedNode, desiredLevel) : draggedNode;
      siblings.splice(insertIndex, 0, fixed);
    }

    get().applyStructure(structure, { selectedId: dragId });
  },

  updateFormData: (varId, value) => {
    set((state) => {
      const nextForm = { ...state.formData, [varId]: value };
      const nextDocuments = syncCurrentDocumentInMap(state, state.structure, nextForm);
      return {
        formData: nextForm,
        documents: nextDocuments,
        saveStatus: 'unsaved'
      };
    });
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
      get().applyStructure(parsed, { selectedId: null });
      get().pushToast('JSON importado correctamente.', 'success');
    } catch {
      get().pushToast('No se pudo importar JSON. Revisa el formato.', 'error');
    }
  },

  validateRequiredBeforeExport: () => {
    const state = get();
    const required = getRequiredBlocks(state.structure);
    const missing = required.filter((node) => isValueEmpty(state.formData[node.id]));
    return {
      ok: missing.length === 0,
      missing
    };
  },

  getDocumentById: (docId) => {
    return Object.values(get().documents)
      .flat()
      .find((doc) => doc.id === docId) || null;
  },

  getCurrentProject: () => {
    const state = get();
    return state.projects.find((project) => project.id === state.currentProjectId) || null;
  },

  getCurrentDocument: () => {
    const state = get();
    if (!state.currentProjectId || !state.currentDocumentId) return null;
    return (state.documents[state.currentProjectId] || []).find((doc) => doc.id === state.currentDocumentId) || null;
  }
}));

export default useDocumentStore;
