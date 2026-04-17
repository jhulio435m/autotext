import bcrypt from 'bcryptjs';
import { loadWorkspaceState } from '../workspace-store.js';
import { checkAppDbConnection } from '../db.js';

export function registerAuthRoutes(app, deps) {
  const { appPool, createToken, normalizeUserRow } = deps;

  app.post('/api/auth/login', async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      res.status(400).json({ error: 'Email y contrasena son obligatorios.' });
      return;
    }

    try {
      await checkAppDbConnection();
      const result = await appPool.query(
        'SELECT id, email, password_hash, name, role FROM app_users WHERE LOWER(email) = $1 LIMIT 1',
        [email]
      );

      const row = result.rows[0];
      if (!row) {
        res.status(401).json({ error: 'Credenciales invalidas.' });
        return;
      }

      const validPassword = row.password_hash.startsWith('$2')
        ? await bcrypt.compare(password, row.password_hash)
        : password === row.password_hash;

      if (!validPassword) {
        res.status(401).json({ error: 'Credenciales invalidas.' });
        return;
      }

      const workspaceState = await loadWorkspaceState(appPool, row.id, { includeDocumentContent: false });

      res.json({
        token: createToken(row.id, row.email),
        user: normalizeUserRow(row),
        workspace: workspaceState.workspace || null,
        workspaceUpdatedAt: workspaceState.updatedAt || null
      });
    } catch (error) {
      console.error('login_error', error);
      res.status(500).json({ error: 'No se pudo procesar el login.' });
    }
  });
}
