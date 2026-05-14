CREATE TABLE IF NOT EXISTS app_users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Usuario',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_projects (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  code TEXT DEFAULT '',
  accent_color TEXT DEFAULT '#006399',
  company_name TEXT DEFAULT '',
  logo TEXT DEFAULT '',
  month TEXT DEFAULT '',
  year TEXT DEFAULT '',
  cover_photo TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Separate project variables (3NF)
CREATE TABLE IF NOT EXISTS app_project_variables (
  project_id TEXT NOT NULL REFERENCES app_projects(id) ON DELETE CASCADE,
  variable_key TEXT NOT NULL,
  variable_value TEXT,
  variable_label TEXT DEFAULT '',
  variable_type TEXT DEFAULT 'text',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, variable_key)
);

CREATE TABLE IF NOT EXISTS app_documents (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES app_projects(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  description TEXT DEFAULT '',
  structure JSONB NOT NULL DEFAULT '[]'::jsonb,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  cover_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_documents_project_idx ON app_documents (project_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS app_documents_user_idx ON app_documents (user_id);

CREATE TABLE IF NOT EXISTS app_document_locks (
  document_id TEXT PRIMARY KEY REFERENCES app_documents(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS app_templates (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Document node tree for fine-grained sync
CREATE TABLE IF NOT EXISTS app_document_nodes (
  id TEXT NOT NULL,
  document_id TEXT NOT NULL REFERENCES app_documents(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES app_document_nodes(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL DEFAULT 'paragraph',
  content TEXT DEFAULT '',
  config JSONB DEFAULT '{}'::jsonb,
  ordinal_position INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, document_id)
);

CREATE INDEX IF NOT EXISTS app_document_nodes_doc_idx ON app_document_nodes (document_id);
CREATE INDEX IF NOT EXISTS app_document_nodes_parent_idx ON app_document_nodes (parent_id);

-- Document form values (key-value per document)
CREATE TABLE IF NOT EXISTS app_document_values (
  document_id TEXT NOT NULL REFERENCES app_documents(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_value TEXT DEFAULT '',
  PRIMARY KEY (document_id, field_key)
);

-- Reusable project blocks (tables, images, etc.)
CREATE TABLE IF NOT EXISTS app_project_blocks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES app_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  block_type TEXT NOT NULL DEFAULT 'table',
  config JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_project_blocks_project_idx ON app_project_blocks (project_id);

-- Block table column definitions
CREATE TABLE IF NOT EXISTS app_block_table_columns (
  block_id TEXT NOT NULL REFERENCES app_project_blocks(id) ON DELETE CASCADE,
  column_key TEXT NOT NULL,
  label TEXT DEFAULT '',
  ordinal_position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (block_id, column_key)
);

-- Block table rows
CREATE TABLE IF NOT EXISTS app_block_table_rows (
  id BIGSERIAL PRIMARY KEY,
  block_id TEXT NOT NULL REFERENCES app_project_blocks(id) ON DELETE CASCADE,
  ordinal_position INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS app_block_table_rows_block_idx ON app_block_table_rows (block_id);

-- Block table cells
CREATE TABLE IF NOT EXISTS app_block_table_cells (
  id BIGSERIAL PRIMARY KEY,
  row_id BIGINT NOT NULL REFERENCES app_block_table_rows(id) ON DELETE CASCADE,
  column_key TEXT NOT NULL,
  cell_value TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS app_block_table_cells_row_idx ON app_block_table_cells (row_id);

