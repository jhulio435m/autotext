import { normalizeTemplateRow, parseTemplatePayload } from './app-helpers.js';

export function registerTemplateRoutes(app, deps) {
  const { appPool, authOptionalInDev } = deps;

  app.get('/api/templates', authOptionalInDev, async (_req, res) => {
    try {
      const result = await appPool.query(
        `SELECT id, slug, name, description, data, is_system, updated_at
         FROM app_templates
         ORDER BY is_system DESC, updated_at DESC, name ASC`
      );

      res.json({
        ok: true,
        templates: result.rows.map(normalizeTemplateRow)
      });
    } catch (error) {
      console.error('template_list_error', error);
      res.status(500).json({ error: 'No se pudieron cargar las plantillas.' });
    }
  });

  app.post('/api/templates', authOptionalInDev, async (req, res) => {
    const payload = parseTemplatePayload(req.body?.template);
    if (!payload) {
      res.status(400).json({ error: 'template invalida.' });
      return;
    }

    try {
      const result = await appPool.query(
        `INSERT INTO app_templates (slug, name, description, data, is_system, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, FALSE, NOW())
         ON CONFLICT (slug)
         DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           data = EXCLUDED.data,
           is_system = FALSE,
           updated_at = NOW()
         RETURNING id, slug, name, description, data, is_system, updated_at`,
        [payload.slug, payload.name, payload.description, JSON.stringify(payload.data)]
      );

      res.json({
        ok: true,
        template: normalizeTemplateRow(result.rows[0])
      });
    } catch (error) {
      console.error('template_save_error', error);
      res.status(500).json({ error: 'No se pudo guardar la plantilla.' });
    }
  });
}
