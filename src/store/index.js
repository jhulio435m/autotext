import { create } from 'zustand';
import { STORAGE_KEYS, loadInitialState } from './helpers';
import { createSessionSlice } from './slices/sessionSlice';
import { createPlaneWorkspaceSlice } from './slices/planeWorkspaceSlice';
import { createProjectCatalogSlice } from './slices/projectCatalogSlice';
import { createTemplateSlice } from './slices/templateSlice';
import { createEditorSlice } from './slices/editorSlice';
import { createFormHistorySlice } from './slices/formHistorySlice';
import { createSelectorSlice } from './slices/selectorSlice';

const seed = loadInitialState();

export { STORAGE_KEYS };

const useDocumentStore = create((set, get) => ({
  currentUser: seed.currentUser,
  projects: seed.projects,
  currentProjectId: seed.projects[0]?.id || null,
  documents: seed.documents,
  currentDocumentId: null,
  structure: [],
  selectedId: null,
  propertyModalOpen: false,
  setPropertyModalOpen: (open) => set({ propertyModalOpen: open }),
  activeMode: 'constructor',
  formData: {},
  coverConfig: seed.coverConfig,
  history: [],
  historyIndex: -1,
  saveStatus: 'saved',
  workspaceHydrated: false,
  toasts: [],
  templates: [],
  templatesLoaded: false,
  templatesLoadError: null,
  ...createSessionSlice(set, get),
  ...createTemplateSlice(set, get),
  ...createPlaneWorkspaceSlice(set, get),
  ...createProjectCatalogSlice(set, get),
  ...createEditorSlice(set, get),
  ...createFormHistorySlice(set, get),
  ...createSelectorSlice(get)
}));

export default useDocumentStore;
