import { logger } from '../infrastructure/logger.js';
import { sanitizeAuthLog } from '../services/auth-security.js';

export function registerAdminRoutes(app, deps) {
  const { appPool, config, requireAdmin } = deps;

  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const result = await appPool.query(
        `SELECT id, email, name, role, failed_login_count,
                locked_until, created_at, updated_at
         FROM app_users
         ORDER BY created_at DESC`
      );

      const users = result.rows.map((row) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        failedLoginCount: row.failed_login_count,
        lockedUntil: row.locked_until,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      res.json({ users });
    } catch (error) {
      logger.error('admin', 'users_list_error', sanitizeAuthLog({
        userId: req.auth?.userId,
        error: error?.message || error
      }));
      res.status(500).json({ error: 'No se pudieron listar los usuarios.' });
    }
  });
}
