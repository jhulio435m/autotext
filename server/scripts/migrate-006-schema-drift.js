import { appPool } from '../db.js';

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS app_document_nodes (
    id TEXT NOT NULL,
    document_id TEXT NOT NULL REFERENCES app_documents(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES app_document_nodes(id) ON DELETE CASCADE,
    node_type TEXT NOT NULL DEFAULT 'paragraph',
    content TEXT DEFAULT '',
    config JSONB DEFAULT '{}'::jsonb,
    ordinal_position INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, document_id)
  )`,
  `CREATE INDEX IF NOT EXISTS app_document_nodes_doc_idx ON app_document_nodes (document_id)`,
  `CREATE INDEX IF NOT EXISTS app_document_nodes_parent_idx ON app_document_nodes (parent_id)`,
  `CREATE TABLE IF NOT EXISTS app_document_values (
    document_id TEXT NOT NULL REFERENCES app_documents(id) ON DELETE CASCADE,
    field_key TEXT NOT NULL,
    field_value TEXT DEFAULT '',
    PRIMARY KEY (document_id, field_key)
  )`,
  `CREATE TABLE IF NOT EXISTS app_project_blocks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES app_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    block_type TEXT NOT NULL DEFAULT 'table',
    config JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS app_project_blocks_project_idx ON app_project_blocks (project_id)`,
  `CREATE TABLE IF NOT EXISTS app_block_table_columns (
    block_id TEXT NOT NULL REFERENCES app_project_blocks(id) ON DELETE CASCADE,
    column_key TEXT NOT NULL,
    label TEXT DEFAULT '',
    ordinal_position INT NOT NULL DEFAULT 0,
    PRIMARY KEY (block_id, column_key)
  )`,
  `CREATE TABLE IF NOT EXISTS app_block_table_rows (
    id BIGSERIAL PRIMARY KEY,
    block_id TEXT NOT NULL REFERENCES app_project_blocks(id) ON DELETE CASCADE,
    ordinal_position INT NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS app_block_table_rows_block_idx ON app_block_table_rows (block_id)`,
  `CREATE TABLE IF NOT EXISTS app_block_table_cells (
    id BIGSERIAL PRIMARY KEY,
    row_id BIGINT NOT NULL REFERENCES app_block_table_rows(id) ON DELETE CASCADE,
    column_key TEXT NOT NULL,
    cell_value TEXT DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS app_block_table_cells_row_idx ON app_block_table_cells (row_id)`
];

async function run() {
  try {
    for (let i = 0; i < MIGRATIONS.length; i++) {
      await appPool.query(MIGRATIONS[i]);
      console.log(`Migracion ${i + 1}/${MIGRATIONS.length} aplicada.`);
    }
    console.log('Migracion 006-schema-drift completada exitosamente.');
  } catch (err) {
    console.error('Error en migracion 006-schema-drift:', err);
  } finally {
    await appPool.end();
  }
}

run();
