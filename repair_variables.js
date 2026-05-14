import { appPool } from './server/db.js';

async function repair() {
  console.log('🛠️ Iniciando reparación de variables de proyecto...');
  try {
    const { rows } = await appPool.query("SELECT project_id, variable_key, variable_value, variable_type FROM app_project_variables");
    let repairedCount = 0;

    for (const row of rows) {
      if (row.variable_type === 'text' && row.variable_value && row.variable_value.includes('{"type":')) {
        try {
          const parsed = JSON.parse(row.variable_value);
          if (parsed.type === 'table' || parsed.type === 'image' || parsed.type === 'rich_text') {
            console.log(`✅ Reparando variable ${row.variable_key} en proyecto ${row.project_id} -> Cambiando a tipo 'block'`);
            await appPool.query(
              "UPDATE app_project_variables SET variable_type = 'block' WHERE project_id = $1 AND variable_key = $2",
              [row.project_id, row.variable_key]
            );
            repairedCount++;
          }
        } catch (e) {
          // No es un JSON válido, ignorar
        }
      }
    }

    console.log(`✨ Reparación completada. ${repairedCount} variables rescatadas.`);
    process.exit(0);
  } catch (err) {
    console.error('💥 Error durante la reparación:', err);
    process.exit(1);
  }
}

repair();
