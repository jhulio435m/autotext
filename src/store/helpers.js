import { nanoid } from 'nanoid';
import { createNode, deepClone, flattenNodes, normalizeDocumentNodes, reassignAllIds } from '../utils/document';
import { STORAGE_KEYS } from '../constants/storage';
import { createDefaultCover } from '../data/defaults';

const MAX_LEVEL = 5;
const hasStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const HIDDEN_PLANE_PROJECT_NAMES = new Set(['soporte ul', 'aymlang']);

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

function createVersionSnapshot(doc, label = 'Autosave') {
  return {
    id: `ver_${nanoid(12)}`,
    label,
    createdAt: nowISO(),
    structure: deepClone(doc.structure || []),
    formData: deepClone(doc.formData || {}),
    coverData: deepClone(doc.coverData || {})
  };
}

function cloneTemplateFromDocument(doc) {
  if (!doc?.structure) {
    return { structure: [createNode('section', 1)], formData: {} };
  }
  return {
    structure: reassignAllIds(normalizeDocumentNodes(deepClone(doc.structure))),
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
  return [createNode('section', 1)];
}

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeDocumentRecord(doc) {
  if (!isRecord(doc)) return null;
  const contentLoaded = doc.contentLoaded !== false;
  const coverData = isRecord(doc.coverData)
    ? doc.coverData
    : isRecord(doc.cover)
      ? doc.cover
      : {};
  return {
    ...doc,
    structure: contentLoaded ? normalizeDocumentNodes(deepClone(doc.structure || createBlankStructure())) : [],
    formData: contentLoaded && isRecord(doc.formData) ? doc.formData : {},
    coverData: contentLoaded ? coverData : {},
    contentLoaded,
    versionHistory: Array.isArray(doc.versionHistory) ? doc.versionHistory.slice(0, 3) : [],
    lock: isRecord(doc.lock) ? doc.lock : null
  };
}

function normalizeDocumentsMap(documents) {
  if (!isRecord(documents)) return {};

  return Object.fromEntries(
    Object.entries(documents).map(([projectId, docs]) => [
      projectId,
      Array.isArray(docs) ? docs.map(normalizeDocumentRecord).filter(Boolean) : []
    ])
  );
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

function shouldHidePlaneProject(project) {
  const name = String(project?.name || '').trim().toLowerCase();
  return HIDDEN_PLANE_PROJECT_NAMES.has(name);
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
  const projects = [];
  const documents = {};
  const coverConfig = {};
  const useApiAuth = import.meta.env.VITE_USE_API_AUTH === 'true';
  const storedToken = hasStorage
    ? window.localStorage.getItem(STORAGE_KEYS.authToken) || window.sessionStorage.getItem(STORAGE_KEYS.authToken)
    : '';
  const currentUser = hasStorage && (!useApiAuth || storedToken)
    ? safeParse(window.localStorage.getItem(STORAGE_KEYS.user), null)
    : null;

  return {
    projects,
    documents,
    coverConfig,
    currentUser
  };
}

function syncCurrentDocumentInMap(state, structure, formData) {
  const { currentProjectId, currentDocumentId } = state;
  if (!currentProjectId || !currentDocumentId) return state.documents;

  return {
    ...state.documents,
    [currentProjectId]: (state.documents[currentProjectId] || []).map((doc) =>
      doc.id === currentDocumentId
        ? {
            ...doc,
            structure: normalizeDocumentNodes(deepClone(structure)),
            formData,
            coverData: isRecord(doc.coverData) ? doc.coverData : {},
            updatedAt: nowISO()
          }
        : doc
    )
  };
}

export {
  MAX_LEVEL,
  STORAGE_KEYS,
  hasStorage,
  safeParse,
  nowISO,
  createVersionSnapshot,
  cloneTemplateFromDocument,
  findNodeInfo,
  updateNodeRecursive,
  removeNodeRecursive,
  isAncestor,
  normalizeLevel,
  createBlankStructure,
  createDefaultCover,
  isRecord,
  normalizeDocumentRecord,
  normalizeDocumentsMap,
  colorFromString,
  normalizePlaneProject,
  shouldHidePlaneProject,
  normalizePlaneIssueDocument,
  loadInitialState,
  syncCurrentDocumentInMap
};
