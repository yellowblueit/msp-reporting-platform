-- NexusMSP Initial Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Connectors: SaaS integration definitions
CREATE TABLE connectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  auth_type VARCHAR(50) NOT NULL, -- oauth, apikey, bearer, basic
  base_url TEXT NOT NULL,
  auth_config_encrypted TEXT, -- AES-256-GCM encrypted JSON
  icon VARCHAR(10),
  color VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Field Catalog: discovered fields per connector
CREATE TABLE field_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  field_name VARCHAR(255) NOT NULL,
  display_label VARCHAR(255) NOT NULL,
  data_type VARCHAR(50) NOT NULL, -- string, number, boolean, datetime, array
  endpoint VARCHAR(500),
  example_value TEXT,
  json_path TEXT, -- JSONPath expression for extraction
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(connector_id, field_name)
);

-- Clients: MSP end-clients
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Client Contacts
CREATE TABLE client_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(100)
);

-- Client Credentials: per-client API credentials (encrypted)
CREATE TABLE client_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  credentials_encrypted TEXT NOT NULL, -- AES-256-GCM encrypted
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, connector_id)
);

-- Client-Connector assignments (which connectors are enabled per client)
CREATE TABLE client_connectors (
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  PRIMARY KEY (client_id, connector_id)
);

-- Report Templates: column layout, filters, grouping
CREATE TABLE report_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  column_layout JSONB NOT NULL DEFAULT '[]',
  filters JSONB NOT NULL DEFAULT '[]',
  settings JSONB NOT NULL DEFAULT '{}',
  connector_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Report Schedules: cron + delivery config
CREATE TABLE report_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
  cron_expr VARCHAR(100) NOT NULL,
  client_ids UUID[] NOT NULL DEFAULT '{}',
  output_types TEXT[] NOT NULL DEFAULT '{pdf}',
  recipients TEXT[] NOT NULL DEFAULT '{}',
  email_subject_template VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Report Runs: execution log
CREATE TABLE report_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES report_schedules(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  triggered_by VARCHAR(50) NOT NULL DEFAULT 'schedule', -- schedule, manual
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, running, success, failed, warning
  output_urls JSONB DEFAULT '{}', -- { pdf: "...", csv: "..." }
  insights_text TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users (MSP platform users)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer', -- admin, viewer
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Platform Settings (key-value store)
CREATE TABLE platform_settings (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_field_catalog_connector ON field_catalog(connector_id);
CREATE INDEX idx_client_credentials_client ON client_credentials(client_id);
CREATE INDEX idx_client_credentials_connector ON client_credentials(connector_id);
CREATE INDEX idx_report_runs_template ON report_runs(template_id);
CREATE INDEX idx_report_runs_client ON report_runs(client_id);
CREATE INDEX idx_report_runs_status ON report_runs(status);
CREATE INDEX idx_report_runs_created ON report_runs(created_at DESC);
CREATE INDEX idx_report_schedules_template ON report_schedules(template_id);

-- Seed default admin user (password: admin123 — change immediately)
-- Hash generated with bcrypt rounds=10 for "admin123"
INSERT INTO users (email, password_hash, name, role)
VALUES ('admin@nexusmsp.local', '$2b$10$8KzaNdKIMyOkASYit2TXxuLxMDVaqx/F5eXmKPBSF.4HfFLsmVhWq', 'Admin', 'admin')
ON CONFLICT DO NOTHING;

-- Seed default platform settings
INSERT INTO platform_settings (key, value) VALUES
  ('ai_model', '"claude-sonnet-4-20250514"'),
  ('ai_max_tokens', '4096'),
  ('ai_insights_enabled', 'true'),
  ('default_output_format', '"pdf+email"'),
  ('default_timezone', '"America/New_York"'),
  ('data_retention_days', '90'),
  ('pdf_branding', '"msp"');
