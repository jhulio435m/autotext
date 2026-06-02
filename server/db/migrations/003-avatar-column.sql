-- Migration 003: add avatar column to app_users

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '';
