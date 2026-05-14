import { appPool } from './server/db.js';

const SCHEMA_SQL = `
-- 1. BLOQUES REUTILIZABLES (Ya definido, consolidando)
CREATE TABLE IF NOT EXISTS app_project_blocks (
  id TEXT PRIMARY KEY, 
  project_id TEXT NOT NULL REFERENCES app_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  block_type TEXT NOT NULL, 
  config JSONB DEFAULT '{}'::jsonb, 
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_block_table_columns (
  id BIGSERIAL PRIMARY KEY,
  block_id TEXT NOT NULL REFERENCES app_project_blocks(id) ON DELETE CASCADE,
  column_key TEXT NOT NULL, 
  label TEXT NOT NULL,
  column_type TEXT DEFAULT 'text',
  ordinal_position INTEGER NOT NULL,
  UNIQUE(block_id, column_key)
);

CREATE TABLE IF NOT EXISTS app_block_table_rows (
  id BIGSERIAL PRIMARY KEY,
  block_id TEXT NOT NULL REFERENCES app_project_blocks(id) ON DELETE CASCADE,
  ordinal_position INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_block_table_cells (
  row_id BIGINT NOT NULL REFERENCES app_block_table_rows(id) ON DELETE CASCADE,
  column_key TEXT NOT NULL,
  cell_value TEXT,
  PRIMARY KEY (row_id, column_key)
);

-- 2. NODOS DE DOCUMENTO (Estructura jerárquica 3NF)
-- Esto reemplaza a app_documents.structure (JSONB)
CREATE TABLE IF NOT EXISTS app_document_nodes (
  id TEXT PRIMARY KEY, 
  document_id TEXT NOT NULL REFERENCES app_documents(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES app_document_nodes(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL, -- 'section', 'paragraph', 'table_import', etc.
  content TEXT, -- El texto plano o contenido principal
  config JSONB DEFAULT '{}'::jsonb, -- Estilos, alineación, ID de bloque importado
  ordinal_position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. VALORES DE FORMULARIO (EAV - Entity Attribute Value)
-- Esto reemplaza a app_documents.form_data (JSONB)
CREATE TABLE IF NOT EXISTS app_document_values (
  document_id TEXT NOT NULL REFERENCES app_documents(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_value TEXT,
  PRIMARY KEY (document_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_doc_nodes_doc_id ON app_document_nodes(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_nodes_parent ON app_document_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_doc_values_doc_id ON app_document_values(document_id);
`;

async function run() {
  console.log('[SCHEMA] Aplicando esquema 3NF extendido...');
  try {
    await appPool.query(SCHEMA_SQL);
    console.log('[SCHEMA] Tablas creadas/verificadas exitosamente.');
    process.exit(0);
  } catch (err) {
    console.error('[SCHEMA_ERROR]', err);
    process.exit(1);
  }
}

run();
