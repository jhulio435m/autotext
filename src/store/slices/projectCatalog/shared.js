import { nanoid } from 'nanoid';
import { deepClone, normalizeDocumentNodes, reassignAllIds } from '../../../utils/document';
import {
  createBlankStructure,
  createDefaultCover,
  createVersionSnapshot,
  normalizeDocumentRecord,
  nowISO,
  cloneTemplateFromDocument
} from '../../helpers';

export function buildEditorStateFromDocument(doc, projectData = {}) {
  const structure = normalizeDocumentNodes(deepClone(doc.structure || createBlankStructure()));
  return {
    structure,
    formData: {
      ...deepClone(projectData || {}),
      ...deepClone(doc.formData || {})
    },
    selectedId: null,
    history: [deepClone(structure)],
    historyIndex: 0
  };
}

export function createDocumentFromTemplate({ state, projectId, name, type, description, templateMode, sourceDocId, systemTemplateId }) {
  const sourceDoc = Object.values(state.documents)
    .flat()
    .find((doc) => doc.id === sourceDocId);

  const systemTemplate = (state.templates || []).find((tpl) => tpl.id === systemTemplateId || tpl.slug === systemTemplateId);

  let initialStructure = createBlankStructure();
  let initialFormData = {};

  if (templateMode === 'reuse' && sourceDoc) {
    const cloned = cloneTemplateFromDocument(sourceDoc);
    initialStructure = cloned.structure;
    initialFormData = cloned.formData;
  }

  if (templateMode === 'system' && systemTemplate) {
    initialStructure = reassignAllIds(normalizeDocumentNodes(deepClone(systemTemplate.data || [])));
    initialFormData = {};
  }

  return {
    id: `doc_${nanoid(12)}`,
    name,
    type,
    description,
    version: 'v0.1',
    updatedAt: nowISO(),
    structure: normalizeDocumentNodes(initialStructure),
    formData: initialFormData,
    contentLoaded: true,
    coverData: {
      ...createDefaultCover(),
      ...(state.coverConfig[projectId] || {}),
      title: name
    },
    versionHistory: [],
    lock: null
  };
}

export function createDuplicatedDocument(doc) {
  const cloned = cloneTemplateFromDocument(doc);

  return {
    ...doc,
    id: `doc_${nanoid(12)}`,
    name: `${doc.name} (Copia)`,
    version: 'v0.1',
    updatedAt: nowISO(),
    structure: normalizeDocumentNodes(cloned.structure),
    formData: {},
    contentLoaded: true,
    coverData: {
      ...(doc.coverData || {}),
      title: `${doc.name} (Copia)`
    },
    versionHistory: [],
    lock: null
  };
}

export function createDuplicatedProject(state, project, projectId) {
  const nextProjectId = `proj_${nanoid(12)}`;
  const sourceDocs = state.documents[projectId] || [];

  const duplicatedDocs = sourceDocs.map((doc) => {
    const template = cloneTemplateFromDocument(doc);
    return {
      ...doc,
      id: `doc_${nanoid(12)}`,
      name: `${doc.name} (Copia)`,
      version: 'v0.1',
      updatedAt: nowISO(),
      structure: template.structure,
      formData: {},
      contentLoaded: true
    };
  });

  return {
    nextProject: {
      ...project,
      id: nextProjectId,
      name: `${project.name} (Copia)`,
      updatedAt: nowISO()
    },
    nextProjectId,
    duplicatedDocs,
    nextCover: deepClone(state.coverConfig[projectId] || {})
  };
}

export function createProjectRecord({ name, description, code, accentColor }) {
  return {
    id: `proj_${nanoid(12)}`,
    name,
    description: description || '',
    code: code || '',
    accentColor: accentColor || '#006399',
    updatedAt: nowISO()
  };
}

export function createSnapshotEntry(doc, label) {
  return [createVersionSnapshot(doc, label), ...(doc.versionHistory || [])].slice(0, 3);
}

export function normalizeUpdatedDocument(doc, patch = {}) {
  return normalizeDocumentRecord({
    ...doc,
    ...patch,
    updatedAt: nowISO()
  });
}
