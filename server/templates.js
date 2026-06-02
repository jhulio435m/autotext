import fs from 'node:fs/promises';
import path from 'node:path';

async function loadJson(relativePath) {
  const filePath = path.join(process.cwd(), relativePath);
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

export async function getSystemTemplates() {
  const formato6A = await loadJson('examples/formato-6a-completo.json');

  return [
    {
      slug: 'formato-6a-completo',
      name: 'Formato 6A Completo',
      description: 'Plantilla integral con todos los tipos de bloque soportados por TechDoc.',
      data: formato6A,
      isSystem: true
    }
  ];
}

export async function seedSystemTemplates(appPool) {
  const templates = await getSystemTemplates();

  for (const template of templates) {
    await appPool.query(
      `INSERT INTO app_templates (slug, name, description, data, is_system, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, NOW())
       ON CONFLICT (slug)
       DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         data = EXCLUDED.data,
         is_system = EXCLUDED.is_system,
         updated_at = NOW()`,
      [template.slug, template.name, template.description, JSON.stringify(template.data), template.isSystem]
    );
  }
}
