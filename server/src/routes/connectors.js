import { Router } from 'express';
import db from '../config/database.js';
import { encrypt } from '../services/encryption.js';
import { discoverFields } from '../services/claudeService.js';
import { fetchUrlContent } from '../services/urlFetcher.js';

const router = Router();

// List all connectors
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM field_catalog WHERE connector_id = c.id AND is_active = true) as field_count,
        (SELECT COUNT(*) FROM client_connectors WHERE connector_id = c.id) as client_count
      FROM connectors c
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single connector
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM connectors WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Connector not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create connector
router.post('/', async (req, res) => {
  try {
    const { name, category, authType, baseUrl, authConfig, icon, color } = req.body;
    if (!name || !category || !authType || !baseUrl) {
      return res.status(400).json({ error: 'name, category, authType, and baseUrl required' });
    }

    const encryptedConfig = authConfig ? encrypt(JSON.stringify(authConfig)) : null;

    const result = await db.query(
      `INSERT INTO connectors (name, category, auth_type, base_url, auth_config_encrypted, icon, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, category, authType, baseUrl, encryptedConfig, icon || '🔌', color || '#00d4ff']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update connector
router.put('/:id', async (req, res) => {
  try {
    const { name, category, authType, baseUrl, authConfig, icon, color, status } = req.body;
    const encryptedConfig = authConfig ? encrypt(JSON.stringify(authConfig)) : undefined;

    const sets = [];
    const vals = [];
    let i = 1;

    if (name) { sets.push(`name = $${i++}`); vals.push(name); }
    if (category) { sets.push(`category = $${i++}`); vals.push(category); }
    if (authType) { sets.push(`auth_type = $${i++}`); vals.push(authType); }
    if (baseUrl) { sets.push(`base_url = $${i++}`); vals.push(baseUrl); }
    if (encryptedConfig) { sets.push(`auth_config_encrypted = $${i++}`); vals.push(encryptedConfig); }
    if (icon) { sets.push(`icon = $${i++}`); vals.push(icon); }
    if (color) { sets.push(`color = $${i++}`); vals.push(color); }
    if (status) { sets.push(`status = $${i++}`); vals.push(status); }
    sets.push(`updated_at = NOW()`);

    vals.push(req.params.id);
    const result = await db.query(
      `UPDATE connectors SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Connector not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete connector
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM connectors WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Connector not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger AI field discovery
router.post('/:id/discover', async (req, res) => {
  try {
    const { apiDocsText, apiDocsUrl, sampleJson } = req.body;
    const connector = await db.query('SELECT * FROM connectors WHERE id = $1', [req.params.id]);
    if (!connector.rows[0]) return res.status(404).json({ error: 'Connector not found' });

    let resolvedDocsText = apiDocsText || '';

    if (apiDocsUrl) {
      try {
        const fetched = await fetchUrlContent(apiDocsUrl);
        resolvedDocsText = fetched.text;
      } catch (fetchErr) {
        return res.status(400).json({ error: `Failed to fetch documentation URL: ${fetchErr.message}` });
      }
    }

    if (!resolvedDocsText && !sampleJson) {
      return res.status(400).json({ error: 'Provide apiDocsUrl, apiDocsText, or sampleJson' });
    }

    const fields = await discoverFields(resolvedDocsText, sampleJson, connector.rows[0].base_url);

    // Store discovered fields
    const inserted = [];
    for (const field of fields) {
      const result = await db.query(
        `INSERT INTO field_catalog (connector_id, field_name, display_label, data_type, endpoint, example_value, json_path)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (connector_id, field_name) DO UPDATE SET
           display_label = EXCLUDED.display_label,
           data_type = EXCLUDED.data_type,
           endpoint = EXCLUDED.endpoint,
           discovered_at = NOW()
         RETURNING *`,
        [req.params.id, field.name, field.displayLabel, field.dataType, field.endpoint, field.description, field.jsonPath]
      );
      inserted.push(result.rows[0]);
    }

    res.json({ discovered: inserted.length, fields: inserted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get field catalog for a connector
router.get('/:id/fields', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM field_catalog WHERE connector_id = $1 AND is_active = true ORDER BY display_label',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle field active status
router.patch('/:connectorId/fields/:fieldId', async (req, res) => {
  try {
    const { isActive, displayLabel } = req.body;
    const sets = [];
    const vals = [];
    let i = 1;

    if (isActive !== undefined) { sets.push(`is_active = $${i++}`); vals.push(isActive); }
    if (displayLabel) { sets.push(`display_label = $${i++}`); vals.push(displayLabel); }

    vals.push(req.params.fieldId);
    const result = await db.query(
      `UPDATE field_catalog SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
