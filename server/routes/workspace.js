import fs from 'node:fs';
import { loadWorkspaceState, saveWorkspaceState } from '../workspace-store.js';
import { parseWorkspace } from './app-helpers.js';

export function registerWorkspaceRoutes(app, deps) {
  const { appPool, authRequired } = deps;

  app.get('/api/workspace', authRequired, async (req, res) => {
    const start = Date.now();
    try {
      const workspaceState = await loadWorkspaceState(appPool, req.auth.userId, { includeDocumentContent: false });
      const duration = Date.now() - start;
      console.log(`[PERF] GET /api/workspace took ${duration}ms user=${req.auth.userId}`);

      const version = workspaceState.updatedAt ? new Date(workspaceState.updatedAt).getTime() : 0;
      const etag = `W/"workspace-${req.auth.userId}-${version}"`;
      if (req.headers['if-none-match'] === etag) {
        res.status(304).end();
        return;
      }

      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'private, must-revalidate');

      res.json({
        workspace: workspaceState.workspace || null,
        updatedAt: workspaceState.updatedAt || null
      });
    } catch (error) {
      console.error('workspace_get_error', error);
      res.status(500).json({ error: 'No se pudo leer el workspace.' });
    }
  });

  app.get('/api/projects/:id/logo', async (req, res) => {
    try {
      const result = await appPool.query('SELECT logo FROM app_projects WHERE id = $1', [req.params.id]);
      const logo = result.rows[0]?.logo;
      if (!logo) return res.status(404).end();

      if (logo.startsWith('data:')) {
        const [meta, data] = logo.split(',');
        const mime = meta.match(/:(.*?);/)[1];
        res.setHeader('Content-Type', mime);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache por 1 año
        return res.send(Buffer.from(data, 'base64'));
      }
      res.redirect(logo);
    } catch (e) {
      res.status(500).end();
    }
  });

  app.get('/api/projects/:id/cover', async (req, res) => {
    try {
      const result = await appPool.query('SELECT cover_photo FROM app_projects WHERE id = $1', [req.params.id]);
      const cover = result.rows[0]?.cover_photo;
      if (!cover) return res.status(404).end();

      if (cover.startsWith('data:')) {
        const [meta, data] = cover.split(',');
        const mime = meta.match(/:(.*?);/)[1];
        res.setHeader('Content-Type', mime);
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        return res.send(Buffer.from(data, 'base64'));
      }
      res.redirect(cover);
    } catch (e) {
      res.status(500).end();
    }
  });

  app.put('/api/workspace', authRequired, async (req, res) => {
    const logPath = '/home/yeul/autotext/route_hits.log';
    try {
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] PUT /api/workspace user=${req.auth.userId}\n`);
    } catch (e) {}
    
    const workspace = parseWorkspace(req.body?.workspace);
    const options = {
      changedProjectId: req.body?.changedProjectId || null
    };

    if (!workspace) {
      res.status(400).json({ error: 'workspace invalido.' });
      return;
    }

    try {
      const upsert = await saveWorkspaceState(appPool, req.auth.userId, workspace, options);
      res.json({ ok: true, updatedAt: upsert.updatedAt || null });
    } catch (error) {
      console.error('workspace_put_error', error);
      res.status(500).json({ error: 'No se pudo guardar el workspace.' });
    }
  });
}
