import { nowISO } from '../../helpers';
import { createDuplicatedProject, createProjectRecord } from './shared';

export function createProjectActions(set, get) {
  return {
    setCurrentProject: (projectId) => {
      set({ currentProjectId: projectId });
    },

    addProject: ({ name, description, code, accentColor }) => {
      const project = createProjectRecord({ name, description, code, accentColor });

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

      const { nextProject, nextProjectId, duplicatedDocs, nextCover } = createDuplicatedProject(state, project, projectId);

      set({
        projects: [nextProject, ...state.projects],
        documents: { ...state.documents, [nextProjectId]: duplicatedDocs },
        coverConfig: { ...state.coverConfig, [nextProjectId]: nextCover },
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
    }
  };
}
