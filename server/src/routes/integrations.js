import { Router } from 'express';
import db from '../config/database.js';
import { encrypt } from '../services/encryption.js';

const router = Router();

// List all available integration templates
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, slug, name, description, category, auth_type, icon, color, auth_fields, docs_url FROM integration_templates WHERE is_active = true ORDER BY name'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single integration template
router.get('/:slug', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM integration_templates WHERE slug = $1 AND is_active = true',
      [req.params.slug]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Integration not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Activate an integration: creates connector + populates field_catalog
router.post('/:slug/activate', async (req, res) => {
  try {
    const { credentials } = req.body;

    const template = await db.query(
      'SELECT * FROM integration_templates WHERE slug = $1 AND is_active = true',
      [req.params.slug]
    );
    if (!template.rows[0]) return res.status(404).json({ error: 'Integration not found' });

    const t = template.rows[0];

    // Check if already activated
    const existing = await db.query(
      'SELECT id FROM connectors WHERE base_url = $1 AND name = $2',
      [t.base_url, t.name]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: `${t.name} is already activated`, connectorId: existing.rows[0].id });
    }

    // Encrypt credentials if provided
    const encryptedConfig = credentials ? encrypt(JSON.stringify(credentials)) : null;

    // Create connector
    const connector = await db.query(
      `INSERT INTO connectors (name, category, auth_type, base_url, auth_config_encrypted, icon, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [t.name, t.category, t.auth_type, t.base_url, encryptedConfig, t.icon, t.color]
    );

    const connectorId = connector.rows[0].id;

    // Populate field_catalog from template field_definitions
    const fields = t.field_definitions || [];
    const inserted = [];
    for (const f of fields) {
      const result = await db.query(
        `INSERT INTO field_catalog (connector_id, field_name, display_label, data_type, endpoint, json_path)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (connector_id, field_name) DO NOTHING
         RETURNING *`,
        [connectorId, f.name, f.displayLabel, f.dataType, f.endpoint, f.jsonPath]
      );
      if (result.rows[0]) inserted.push(result.rows[0]);
    }

    res.status(201).json({
      connector: connector.rows[0],
      fieldsCreated: inserted.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update credentials for an activated connector
router.put('/:connectorId/credentials', async (req, res) => {
  try {
    const { credentials } = req.body;
    if (!credentials) {
      return res.status(400).json({ error: 'credentials object required' });
    }

    const encryptedConfig = encrypt(JSON.stringify(credentials));
    const result = await db.query(
      'UPDATE connectors SET auth_config_encrypted = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, status',
      [encryptedConfig, req.params.connectorId]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Connector not found' });
    res.json({ updated: true, connector: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
