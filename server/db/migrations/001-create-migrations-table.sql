-- Migration 001: create migrations tracking table

CREATE TABLE IF NOT EXISTS app_schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
