import { registerAuthRoutes } from './auth.js';
import { registerWorkspaceRoutes } from './workspace.js';
import { registerDocumentRoutes } from './documents.js';
import { registerTemplateRoutes } from './templates.js';

export function registerAppRoutes(app, deps) {
  const { config } = deps;

  if (!config.enableAppEndpoints || config.bridgeOnly) {
    return;
  }

  registerAuthRoutes(app, deps);
  registerWorkspaceRoutes(app, deps);
  registerDocumentRoutes(app, deps);
  registerTemplateRoutes(app, deps);
}
