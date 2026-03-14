-- Integration Templates: pre-built connector definitions
CREATE TABLE IF NOT EXISTS integration_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  auth_type VARCHAR(50) NOT NULL,
  base_url TEXT NOT NULL,
  icon VARCHAR(10) DEFAULT '🔌',
  color VARCHAR(20) DEFAULT '#00d4ff',
  auth_fields JSONB NOT NULL DEFAULT '[]',
  field_definitions JSONB NOT NULL DEFAULT '[]',
  docs_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed: Huntress
INSERT INTO integration_templates (slug, name, description, category, auth_type, base_url, icon, color, auth_fields, field_definitions, docs_url)
VALUES (
  'huntress',
  'Huntress',
  'Managed security platform — agents, incident reports, organizations, escalations, and signals.',
  'Security',
  'basic',
  'https://api.huntress.io/v1',
  '🛡️',
  '#00b4d8',
  '[
    {"key": "username", "label": "API Key", "type": "text", "placeholder": "hk_..."},
    {"key": "password", "label": "API Secret", "type": "password", "placeholder": "hs_..."}
  ]'::jsonb,
  '[
    {"name": "agent_id",              "displayLabel": "Agent ID",              "dataType": "number",   "endpoint": "/agents",           "jsonPath": "$.agents[*].id"},
    {"name": "agent_organization_id", "displayLabel": "Agent Org ID",          "dataType": "number",   "endpoint": "/agents",           "jsonPath": "$.agents[*].organization_id"},
    {"name": "agent_hostname",        "displayLabel": "Hostname",              "dataType": "string",   "endpoint": "/agents",           "jsonPath": "$.agents[*].hostname"},
    {"name": "agent_platform",        "displayLabel": "Platform",              "dataType": "string",   "endpoint": "/agents",           "jsonPath": "$.agents[*].platform"},
    {"name": "agent_status",          "displayLabel": "Agent Status",          "dataType": "string",   "endpoint": "/agents",           "jsonPath": "$.agents[*].status"},
    {"name": "agent_version",         "displayLabel": "Agent Version",         "dataType": "string",   "endpoint": "/agents",           "jsonPath": "$.agents[*].version"},
    {"name": "agent_last_seen",       "displayLabel": "Last Seen",             "dataType": "datetime", "endpoint": "/agents",           "jsonPath": "$.agents[*].last_seen"},

    {"name": "org_id",                "displayLabel": "Organization ID",       "dataType": "number",   "endpoint": "/organizations",    "jsonPath": "$.organizations[*].id"},
    {"name": "org_name",              "displayLabel": "Organization Name",     "dataType": "string",   "endpoint": "/organizations",    "jsonPath": "$.organizations[*].name"},
    {"name": "org_account_id",        "displayLabel": "Org Account ID",        "dataType": "number",   "endpoint": "/organizations",    "jsonPath": "$.organizations[*].account_id"},
    {"name": "org_created_at",        "displayLabel": "Org Created At",        "dataType": "datetime", "endpoint": "/organizations",    "jsonPath": "$.organizations[*].created_at"},

    {"name": "incident_id",           "displayLabel": "Incident ID",           "dataType": "number",   "endpoint": "/incident_reports", "jsonPath": "$.incident_reports[*].id"},
    {"name": "incident_type",         "displayLabel": "Indicator Type",        "dataType": "string",   "endpoint": "/incident_reports", "jsonPath": "$.incident_reports[*].indicator_type"},
    {"name": "incident_status",       "displayLabel": "Incident Status",       "dataType": "string",   "endpoint": "/incident_reports", "jsonPath": "$.incident_reports[*].status"},
    {"name": "incident_severity",     "displayLabel": "Severity",              "dataType": "string",   "endpoint": "/incident_reports", "jsonPath": "$.incident_reports[*].severity"},
    {"name": "incident_platform",     "displayLabel": "Incident Platform",     "dataType": "string",   "endpoint": "/incident_reports", "jsonPath": "$.incident_reports[*].platform"},
    {"name": "incident_org_id",       "displayLabel": "Incident Org ID",       "dataType": "number",   "endpoint": "/incident_reports", "jsonPath": "$.incident_reports[*].organization_id"},
    {"name": "incident_agent_id",     "displayLabel": "Incident Agent ID",     "dataType": "number",   "endpoint": "/incident_reports", "jsonPath": "$.incident_reports[*].agent_id"},
    {"name": "incident_created_at",   "displayLabel": "Incident Created",      "dataType": "datetime", "endpoint": "/incident_reports", "jsonPath": "$.incident_reports[*].created_at"},
    {"name": "incident_updated_at",   "displayLabel": "Incident Updated",      "dataType": "datetime", "endpoint": "/incident_reports", "jsonPath": "$.incident_reports[*].updated_at"},

    {"name": "escalation_id",         "displayLabel": "Escalation ID",         "dataType": "number",   "endpoint": "/escalations",      "jsonPath": "$.escalations[*].id"},
    {"name": "escalation_status",     "displayLabel": "Escalation Status",     "dataType": "string",   "endpoint": "/escalations",      "jsonPath": "$.escalations[*].status"},
    {"name": "escalation_severity",   "displayLabel": "Escalation Severity",   "dataType": "string",   "endpoint": "/escalations",      "jsonPath": "$.escalations[*].severity"},
    {"name": "escalation_type",       "displayLabel": "Escalation Type",       "dataType": "string",   "endpoint": "/escalations",      "jsonPath": "$.escalations[*].escalation_type"},
    {"name": "escalation_created_at", "displayLabel": "Escalation Created",    "dataType": "datetime", "endpoint": "/escalations",      "jsonPath": "$.escalations[*].created_at"},

    {"name": "signal_id",             "displayLabel": "Signal ID",             "dataType": "number",   "endpoint": "/signals",          "jsonPath": "$.signals[*].id"},
    {"name": "signal_type",           "displayLabel": "Signal Type",           "dataType": "string",   "endpoint": "/signals",          "jsonPath": "$.signals[*].type"},
    {"name": "signal_status",         "displayLabel": "Signal Status",         "dataType": "string",   "endpoint": "/signals",          "jsonPath": "$.signals[*].status"},
    {"name": "signal_entity_type",    "displayLabel": "Signal Entity Type",    "dataType": "string",   "endpoint": "/signals",          "jsonPath": "$.signals[*].entity_type"},
    {"name": "signal_entity_id",      "displayLabel": "Signal Entity ID",      "dataType": "string",   "endpoint": "/signals",          "jsonPath": "$.signals[*].entity_id"},
    {"name": "signal_org_id",         "displayLabel": "Signal Org ID",         "dataType": "number",   "endpoint": "/signals",          "jsonPath": "$.signals[*].organization_id"},
    {"name": "signal_investigated_at","displayLabel": "Signal Investigated At","dataType": "datetime", "endpoint": "/signals",          "jsonPath": "$.signals[*].investigated_at"},

    {"name": "report_id",             "displayLabel": "Report ID",             "dataType": "number",   "endpoint": "/reports",          "jsonPath": "$.reports[*].id"},
    {"name": "report_period",         "displayLabel": "Report Period",         "dataType": "datetime", "endpoint": "/reports",          "jsonPath": "$.reports[*].period"},
    {"name": "report_type",           "displayLabel": "Report Type",           "dataType": "string",   "endpoint": "/reports",          "jsonPath": "$.reports[*].type"},
    {"name": "report_org_id",         "displayLabel": "Report Org ID",         "dataType": "number",   "endpoint": "/reports",          "jsonPath": "$.reports[*].organization_id"},
    {"name": "report_created_at",     "displayLabel": "Report Created At",     "dataType": "datetime", "endpoint": "/reports",          "jsonPath": "$.reports[*].created_at"},

    {"name": "invoice_id",            "displayLabel": "Invoice ID",            "dataType": "number",   "endpoint": "/invoices",         "jsonPath": "$.invoices[*].id"},
    {"name": "invoice_status",        "displayLabel": "Invoice Status",        "dataType": "string",   "endpoint": "/invoices",         "jsonPath": "$.invoices[*].status"},
    {"name": "invoice_amount",        "displayLabel": "Invoice Amount",        "dataType": "number",   "endpoint": "/invoices",         "jsonPath": "$.invoices[*].amount"},
    {"name": "invoice_created_at",    "displayLabel": "Invoice Created",       "dataType": "datetime", "endpoint": "/invoices",         "jsonPath": "$.invoices[*].created_at"},
    {"name": "invoice_due_date",      "displayLabel": "Invoice Due Date",      "dataType": "datetime", "endpoint": "/invoices",         "jsonPath": "$.invoices[*].due_date"},

    {"name": "account_id",            "displayLabel": "Account ID",            "dataType": "number",   "endpoint": "/account",          "jsonPath": "$.account.id"},
    {"name": "account_name",          "displayLabel": "Account Name",          "dataType": "string",   "endpoint": "/account",          "jsonPath": "$.account.name"},
    {"name": "account_subdomain",     "displayLabel": "Account Subdomain",     "dataType": "string",   "endpoint": "/account",          "jsonPath": "$.account.subdomain"},
    {"name": "account_status",        "displayLabel": "Account Status",        "dataType": "string",   "endpoint": "/account",          "jsonPath": "$.account.status"}
  ]'::jsonb,
  'https://api.huntress.io/docs'
) ON CONFLICT (slug) DO NOTHING;
