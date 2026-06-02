import { deepClone, normalizeDocumentNodes } from '../../utils/document';
import { createDefaultCover } from '../../data/defaults';
import {
  createBlankStructure,
  isRecord,
  normalizeDocumentRecord,
  normalizeDocumentsMap,
  normalizePlaneIssueDocument,
  normalizePlaneProject,
  shouldHidePlaneProject
} from '../helpers';

function createPlaneWorkspaceSlice(set) {
  return {
    setProjectsFromPlane: (planeProjects) => {
      if (!Array.isArray(planeProjects)) return;

      const mapped = planeProjects.map(normalizePlaneProject).filter(Boolean).filter((project) => !shouldHidePlaneProject(project));
      if (!mapped.length) return;

      set((state) => {
        const currentProjectsById = new Map(state.projects.map(p => [p.id, p]));
        const incomingIds = new Set(mapped.map((project) => project.id));
        const merged = mapped.map(incoming => {
          const existing = currentProjectsById.get(incoming.id);
          if (!existing) return incoming;
          return {
            ...existing,
            ...incoming,
            // Plane a veces devuelve la portada vacia en refrescos parciales.
            // En ese caso conservamos la ultima URL valida ya cargada.
            coverImageUrl: incoming.coverImageUrl || existing.coverImageUrl || '',
            coverImageAssetId: incoming.coverImageAssetId || existing.coverImageAssetId || null,
            accentColor: incoming.accentColor || existing.accentColor || '#006399'
          };
        });
        const localOnly = state.projects.filter((project) => !incomingIds.has(project.id));
        const nextProjects = [...merged, ...localOnly];

        const nextDocuments = { ...state.documents };
        nextProjects.forEach((project) => {
          if (!Array.isArray(nextDocuments[project.id])) {
            nextDocuments[project.id] = [];
          }
        });

        const nextCurrentProjectId = nextProjects.some((project) => project.id === state.currentProjectId)
          ? state.currentProjectId
          : nextProjects[0]?.id || null;

        return {
          projects: nextProjects,
          documents: nextDocuments,
          currentProjectId: nextCurrentProjectId,
          saveStatus: 'unsaved'
        };
      });
    },

    setDocumentsFromPlaneIssues: (projectId, issues) => {
      if (!projectId || !Array.isArray(issues)) return;
      const mapped = issues.map(normalizePlaneIssueDocument).filter(Boolean).map(normalizeDocumentRecord);

      set((state) => {
        const currentDocs = Array.isArray(state.documents[projectId]) ? state.documents[projectId] : [];
        const currentById = new Map(currentDocs.map((doc) => [doc.id, doc]));
        const mappedIds = new Set(mapped.map((doc) => doc.id));

        const mergedMapped = mapped.map((incoming) => {
          const existing = currentById.get(incoming.id);
          if (!existing) return incoming;

          return normalizeDocumentRecord({
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
          });
        });

        const localOnly = currentDocs.filter((doc) => !mappedIds.has(doc.id));

        const nextDocuments = {
          ...state.documents,
          [projectId]: [...mergedMapped, ...localOnly]
        };

        const currentDocExists = nextDocuments[projectId].some((doc) => doc.id === state.currentDocumentId);
        return {
          documents: nextDocuments,
          currentDocumentId: currentDocExists ? state.currentDocumentId : null
        };
      });
    },

    hydrateWorkspace: (workspace) => {
      if (!isRecord(workspace)) return;

      set((state) => {
        const incomingProjects = Array.isArray(workspace.projects) ? workspace.projects : state.projects;
        const currentProjectsById = new Map(state.projects.map(p => [p.id, p]));
        
        const mergedProjects = incomingProjects.map(incoming => {
          const current = currentProjectsById.get(incoming.id);
          if (!current) return incoming;

          return {
            ...current,
            ...incoming,
            // Fallbacks for critical missing fields from DB if present in current (Plane) state
            coverImageUrl: incoming.coverImageUrl || current.coverImageUrl || '',
            accentColor: incoming.accentColor || current.accentColor || '#006399'
          };
        });

        const documents = isRecord(workspace.documents) ? normalizeDocumentsMap(workspace.documents) : state.documents;
        const incomingCoverConfig = isRecord(workspace.coverConfig) ? workspace.coverConfig : {};
        const coverConfig = { ...incomingCoverConfig };
        Object.keys(documents).forEach((projectId) => {
          if (!coverConfig[projectId]) {
            coverConfig[projectId] = createDefaultCover();
          }
          documents[projectId] = (documents[projectId] || []).map((doc) => normalizeDocumentRecord({
            ...doc,
            coverData: isRecord(doc.coverData) && Object.keys(doc.coverData).length
              ? doc.coverData
              : coverConfig[projectId] || createDefaultCover()
          }));
        });

        const nextCurrentProjectId = mergedProjects.some((project) => project.id === state.currentProjectId)
          ? state.currentProjectId
          : mergedProjects[0]?.id || null;

        const docsInCurrentProject = nextCurrentProjectId ? documents[nextCurrentProjectId] || [] : [];
        const nextCurrentDocumentId = docsInCurrentProject.some((doc) => doc.id === state.currentDocumentId)
          ? state.currentDocumentId
          : null;

        const selectedDoc = nextCurrentDocumentId ? docsInCurrentProject.find((doc) => doc.id === nextCurrentDocumentId) : null;
        const structure = selectedDoc ? normalizeDocumentNodes(deepClone(selectedDoc.structure || createBlankStructure())) : [];
        const formData = selectedDoc ? deepClone(selectedDoc.formData || {}) : {};

        return {
          projects: mergedProjects,
          documents,
          coverConfig,
          currentProjectId: nextCurrentProjectId,
          currentDocumentId: nextCurrentDocumentId,
          structure,
          formData,
          selectedId: null,
          history: structure.length ? [deepClone(structure)] : [],
          historyIndex: structure.length ? 0 : -1,
          saveStatus: 'saved',
          workspaceHydrated: true
        };
      });
    }
  };
}

export { createPlaneWorkspaceSlice };
