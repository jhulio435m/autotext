import { createProjectActions } from './projectCatalog/projectActions';
import { createDocumentActions } from './projectCatalog/documentActions';

function createProjectCatalogSlice(set, get) {
  return {
    ...createProjectActions(set, get),
    ...createDocumentActions(set, get)
  };
}

export { createProjectCatalogSlice };
