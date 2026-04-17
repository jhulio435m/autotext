function createSelectorSlice(get) {
  return {
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
  };
}

export { createSelectorSlice };
