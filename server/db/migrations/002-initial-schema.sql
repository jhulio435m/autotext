-- Migration 002: initial schema (tables, indexes)

CREATE TABLE IF NOT EXISTS app_users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Usuario',
  failed_login_count INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  jti_hash TEXT NOT NULL UNIQUE,
  ip_address TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS app_user_sessions_user_idx ON app_user_sessions (user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS app_user_sessions_active_idx ON app_user_sessions (jti_hash) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS app_password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS app_password_reset_tokens_user_idx ON app_password_reset_tokens (user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS app_password_reset_tokens_active_idx ON app_password_reset_tokens (token_hash) WHERE used_at IS NULL;

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
  version_history JSONB NOT NULL DEFAULT '[]'::jsonb,
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

CREATE TABLE IF NOT EXISTS app_document_values (
  document_id TEXT NOT NULL REFERENCES app_documents(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_value TEXT DEFAULT '',
  PRIMARY KEY (document_id, field_key)
);

CREATE TABLE IF NOT EXISTS app_project_blocks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES app_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  block_type TEXT NOT NULL DEFAULT 'table',
  config JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_project_blocks_project_idx ON app_project_blocks (project_id);

CREATE TABLE IF NOT EXISTS app_block_table_columns (
  block_id TEXT NOT NULL REFERENCES app_project_blocks(id) ON DELETE CASCADE,
  column_key TEXT NOT NULL,
  label TEXT DEFAULT '',
  ordinal_position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (block_id, column_key)
);

CREATE TABLE IF NOT EXISTS app_block_table_rows (
  id BIGSERIAL PRIMARY KEY,
  block_id TEXT NOT NULL REFERENCES app_project_blocks(id) ON DELETE CASCADE,
  ordinal_position INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS app_block_table_rows_block_idx ON app_block_table_rows (block_id);

CREATE TABLE IF NOT EXISTS app_block_table_cells (
  id BIGSERIAL PRIMARY KEY,
  row_id BIGINT NOT NULL REFERENCES app_block_table_rows(id) ON DELETE CASCADE,
  column_key TEXT NOT NULL,
  cell_value TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS app_block_table_cells_row_idx ON app_block_table_cells (row_id);
