import { appPool } from './server/db.js';

async function checkFicha() {
  try {
    const res = await appPool.query(
      "SELECT id, name, structure, form_data, cover_data FROM app_documents WHERE name ILIKE '%ficha%'"
    );
    
    if (res.rows.length === 0) {
      console.log('No se encontró ningún documento con el nombre "ficha"');
      const allDocs = await appPool.query("SELECT id, name FROM app_documents");
      console.log('Documentos disponibles:', allDocs.rows);
      process.exit(0);
    }

    const ficha = res.rows[0];
    console.log('ID:', ficha.id);
    console.log('Nombre:', ficha.name);
    
    console.log('\n--- COVER DATA ---');
    console.log(JSON.stringify(ficha.cover_data, null, 2));

    // Buscar tablas en form_data
    console.log('\n--- TABLES IN FORM DATA ---');
    const formData = ficha.form_data;
    for (const [key, value] of Object.entries(formData)) {
      if (value && typeof value === 'object' && value.rows) {
        console.log(`\nTabla encontrada: ${key}`);
        // Ver primera celda con estilo
        const firstStyledCell = value.rows.flat().find(c => c && typeof c === 'object' && (c.bg || c.fc));
        if (firstStyledCell) {
          console.log('Muestra de celda con estilo:', JSON.stringify(firstStyledCell, null, 2));
        } else {
          console.log('No se encontraron estilos en esta tabla.');
        }
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Error querying DB:', err);
    process.exit(1);
  }
}

checkFicha();
