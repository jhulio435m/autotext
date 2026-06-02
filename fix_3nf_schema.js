import { appPool } from './server/db.js';

const SCHEMA_SQL = `
-- 1. Cabecera de Bloques Reutilizables
CREATE TABLE IF NOT EXISTS app_project_blocks (
  id TEXT PRIMARY KEY, 
  project_id TEXT NOT NULL REFERENCES app_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  block_type TEXT NOT NULL, 
  config JSONB DEFAULT '{}'::jsonb, 
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Estructura de Tablas (Columnas)
CREATE TABLE IF NOT EXISTS app_block_table_columns (
  id BIGSERIAL PRIMARY KEY,
  block_id TEXT NOT NULL REFERENCES app_project_blocks(id) ON DELETE CASCADE,
  column_key TEXT NOT NULL, 
  label TEXT NOT NULL,
  column_type TEXT DEFAULT 'text',
  ordinal_position INTEGER NOT NULL,
  UNIQUE(block_id, column_key)
);

-- 3. Filas de la Tabla
CREATE TABLE IF NOT EXISTS app_block_table_rows (
  id BIGSERIAL PRIMARY KEY,
  block_id TEXT NOT NULL REFERENCES app_project_blocks(id) ON DELETE CASCADE,
  ordinal_position INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Celdas de la Tabla (Dato Atómico)
CREATE TABLE IF NOT EXISTS app_block_table_cells (
  row_id BIGINT NOT NULL REFERENCES app_block_table_rows(id) ON DELETE CASCADE,
  column_key TEXT NOT NULL,
  cell_value TEXT,
  PRIMARY KEY (row_id, column_key)
);

CREATE INDEX IF NOT EXISTS idx_block_table_cols_block ON app_block_table_columns(block_id);
CREATE INDEX IF NOT EXISTS idx_block_table_rows_block ON app_block_table_rows(block_id);
`;

async function migrate() {
  console.log('[MIGRATE] Iniciando migración a 3NF para bloques...');
  
  try {
    // 1. Crear Tablas
    await appPool.query(SCHEMA_SQL);
    console.log('[MIGRATE] Esquema 3NF creado correctamente.');

    // 2. Buscar bloques actuales en app_project_variables
    const { rows: vars } = await appPool.query(
      "SELECT project_id, variable_key, variable_value, variable_label FROM app_project_variables WHERE variable_type = 'block'"
    );

    console.log(`[MIGRATE] Encontrados ${vars.length} bloques para migrar.`);

    for (const v of vars) {
      console.log(`[MIGRATE] Migrando bloque: ${v.variable_key} (${v.variable_label})`);
      
      let data = {};
      try {
        data = JSON.parse(v.variable_value);
      } catch (e) {
        console.error(`[MIGRATE] Error parseando JSON para bloque ${v.variable_key}:`, e.message);
        continue;
      }

      const blockType = data.type || 'table';
      const config = { ...data.nodeProps };
      if (blockType !== 'table') {
        config.formData = data.formData;
      }

      // Insertar Cabecera
      await appPool.query(
        `INSERT INTO app_project_blocks (id, project_id, name, block_type, config, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           block_type = EXCLUDED.block_type,
           config = EXCLUDED.config,
           updated_at = NOW()`,
        [v.variable_key, v.project_id, v.variable_label || config.label || v.variable_key, blockType, JSON.stringify(config)]
      );

      // Si es tabla, migrar celdas
      if (blockType === 'table' && data.formData && Array.isArray(data.formData.rows)) {
        const rows = data.formData.rows;
        
        // Determinar columnas (de la primera fila con datos)
        const allKeys = new Set();
        rows.forEach(r => Object.keys(r).forEach(k => { if(k !== 'id') allKeys.add(k); }));
        const sortedKeys = Array.from(allKeys).sort();

        // Insertar Columnas
        for (let i = 0; i < sortedKeys.length; i++) {
          const k = sortedKeys[i];
          await appPool.query(
            `INSERT INTO app_block_table_columns (block_id, column_key, label, ordinal_position)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (block_id, column_key) DO UPDATE SET label = EXCLUDED.label`,
            [v.variable_key, k, k.replace('col_', 'Columna '), i]
          );
        }

        // Insertar Filas y Celdas
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const rowRes = await appPool.query(
            `INSERT INTO app_block_table_rows (block_id, ordinal_position)
             VALUES ($1, $2)
             RETURNING id`,
            [v.variable_key, i]
          );
          const rowId = rowRes.rows[0].id;

          for (const k of sortedKeys) {
            const val = r[k] !== undefined ? String(r[k]) : '';
            await appPool.query(
              `INSERT INTO app_block_table_cells (row_id, column_key, cell_value)
               VALUES ($1, $2, $3)`,
              [rowId, k, val]
            );
          }
        }
      }
    }

    console.log('[MIGRATE] Migración completada exitosamente.');
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATE_ERROR]', err);
    process.exit(1);
  }
}

migrate();
