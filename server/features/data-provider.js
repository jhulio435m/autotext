import { canUsePlaneApi } from '../infrastructure/plane-client.js';
import { getPlaneProjectTableCandidates, listPlaneProjectIssuesFromDb, listPlaneProjectsFromDb } from '../infrastructure/plane-db-provider.js';
import { listPlaneProjectIssuesFromApi, listPlaneProjectsFromApi } from '../infrastructure/plane-api-provider.js';

export function createDataProvider(config, overrides = {}) {
  const planeApi = overrides.planeApi || {
    listProjects: (options) => listPlaneProjectsFromApi(config, options),
    listProjectIssues: (options) => listPlaneProjectIssuesFromApi(config, options)
  };
  const planeDb = overrides.planeDb || {
    listProjects: (options) => listPlaneProjectsFromDb(config, options),
    listProjectIssues: (options) => listPlaneProjectIssuesFromDb(config, options)
  };

  return {
    async listProjects(options = {}) {
      if (canUsePlaneApi(config)) {
        return planeApi.listProjects(options);
      }

      const workspaceSlug = config.planeWorkspaceSlug || '';
      return planeDb.listProjects({
        ...options,
        schema: options.schema || config.planeProjectSchema || 'public',
        workspaceSlug,
        candidateTables: options.candidateTables || getPlaneProjectTableCandidates(config)
      });
    },

    async listProjectIssues(options = {}) {
      if (canUsePlaneApi(config)) {
        return planeApi.listProjectIssues(options);
      }

      return planeDb.listProjectIssues(options);
    }
  };
}
