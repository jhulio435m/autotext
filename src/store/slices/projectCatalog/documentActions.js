import { deepClone } from '../../../utils/document';
import { createDefaultCover, nowISO, normalizeDocumentRecord } from '../../helpers';
import {
  buildEditorStateFromDocument,
  createDocumentFromTemplate,
  createDuplicatedDocument,
  createSnapshotEntry,
  normalizeUpdatedDocument
} from './shared';

export function createDocumentActions(set, get) {
  return {
    setCurrentDocument: (projectId, docId) => {
      const docs = get().documents[projectId] || [];
      const doc = docs.find((item) => item.id === docId);
      if (!doc) return;
      const projectData = get().coverConfig?.[projectId]?.projectData || {};

      set((state) => ({
        currentProjectId: projectId,
        currentDocumentId: docId,
        ...buildEditorStateFromDocument(doc, projectData),
        saveStatus: ['unsaved', 'retrying', 'saving', 'sync-error'].includes(state.saveStatus) ? state.saveStatus : 'saved'
      }));
    },

    mergeDocumentDetail: (projectId, incomingDoc) => {
      if (!projectId || !incomingDoc?.id) return;

      set((state) => ({
        documents: {
          ...state.documents,
          [projectId]: (state.documents[projectId] || []).map((doc) =>
            doc.id === incomingDoc.id
              ? normalizeDocumentRecord({
                  ...doc,
                  ...incomingDoc,
                  contentLoaded: true
                })
              : doc
          )
        }
      }));
    },

    commitDocumentVersionSnapshot: (projectId, docId, label = 'Autosave') => {
      set((state) => ({
        documents: {
          ...state.documents,
          [projectId]: (state.documents[projectId] || []).map((doc) =>
            doc.id === docId ? { ...doc, versionHistory: createSnapshotEntry(doc, label) } : doc
          )
        }
      }));
    },

    addDocument: ({ projectId, name, type, description, templateMode, sourceDocId, systemTemplateId }) => {
      const state = get();
      const document = createDocumentFromTemplate({
        state,
        projectId,
        name,
        type,
        description,
        templateMode,
        sourceDocId,
        systemTemplateId
      });

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
            doc.id === docId
              ? normalizeDocumentRecord({
                  ...doc,
                  ...patch,
                  coverData: {
                    ...(doc.coverData || {}),
                    ...(patch.name ? { title: patch.name } : {})
                  },
                  updatedAt: nowISO()
                })
              : doc
          )
        },
        saveStatus: 'unsaved'
      }));
    },

    duplicateDocument: (projectId, docId) => {
      const doc = (get().documents[projectId] || []).find((item) => item.id === docId);
      if (!doc) return;

      set((state) => ({
        documents: {
          ...state.documents,
          [projectId]: [createDuplicatedDocument(doc), ...(state.documents[projectId] || [])]
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
            ...createDefaultCover(),
            ...(state.coverConfig[projectId] || {}),
            ...patch
          }
        },
        saveStatus: 'unsaved'
      }));
    },

    updateDocumentCover: (projectId, docId, patch) => {
      set((state) => ({
        documents: {
          ...state.documents,
          [projectId]: (state.documents[projectId] || []).map((doc) =>
            doc.id === docId
              ? normalizeUpdatedDocument(doc, {
                  coverData: {
                    ...(doc.coverData || {}),
                    ...patch
                  }
                })
              : doc
          )
        },
        saveStatus: 'unsaved'
      }));
    },

    updateDocumentProjectData: (projectId, docId, patch) => {
      set((state) => ({
        documents: {
          ...state.documents,
          [projectId]: (state.documents[projectId] || []).map((doc) =>
            doc.id === docId
              ? normalizeUpdatedDocument(doc, {
                  coverData: {
                    ...(doc.coverData || {}),
                    projectData: {
                      ...((doc.coverData || {}).projectData || {}),
                      ...patch
                    }
                  }
                })
              : doc
          )
        },
        saveStatus: 'unsaved'
      }));
    },

    setDocumentLock: (projectId, docId, lock) => {
      set((state) => ({
        documents: {
          ...state.documents,
          [projectId]: (state.documents[projectId] || []).map((doc) => (doc.id === docId ? { ...doc, lock } : doc))
        }
      }));
    },

    restoreDocumentVersion: (projectId, docId, snapshotId) => {
      const doc = (get().documents[projectId] || []).find((item) => item.id === docId);
      const snapshot = doc?.versionHistory?.find((item) => item.id === snapshotId);
      if (!doc || !snapshot) return;

      const nextDoc = normalizeDocumentRecord({
        ...doc,
        structure: snapshot.structure,
        formData: snapshot.formData,
        coverData: snapshot.coverData,
        versionHistory: createSnapshotEntry(doc, 'Antes de restaurar'),
        updatedAt: nowISO()
      });

      set((state) => ({
        documents: {
          ...state.documents,
          [projectId]: (state.documents[projectId] || []).map((item) => (item.id === docId ? nextDoc : item))
        },
        currentProjectId: projectId,
        currentDocumentId: docId,
        ...buildEditorStateFromDocument(nextDoc),
        saveStatus: 'unsaved'
      }));
    }
  };
}
