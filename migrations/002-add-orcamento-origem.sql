-- Migration 002: Add orcamento_origem_id to servicos
-- Adds a column to link a Service Order (OS) to its original Budget

ALTER TABLE servicos ADD COLUMN orcamento_origem_id INTEGER REFERENCES servicos(id) ON DELETE SET NULL;
