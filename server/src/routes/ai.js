import { Router } from 'express';
import db from '../config/database.js';
import { nlQueryToColumns, suggestFields } from '../services/claudeService.js';

const router = Router();

// Natural language to report columns
router.post('/nl-query', async (req, res) => {
  try {
    const { query, connectorIds } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });

    // Get available fields from selected connectors
    let fieldQuery = `
      SELECT f.*, c.name as connector_name
      FROM field_catalog f
      JOIN connectors c ON c.id = f.connector_id
      WHERE f.is_active = true
    `;
    const vals = [];
    if (connectorIds?.length) {
      fieldQuery += ` AND f.connector_id = ANY($1)`;
      vals.push(connectorIds);
    }

    const fieldsResult = await db.query(fieldQuery, vals);
    const result = await nlQueryToColumns(query, fieldsResult.rows);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Field suggestions based on current columns
router.post('/suggest-fields', async (req, res) => {
  try {
    const { currentColumns, connectorIds } = req.body;
    if (!currentColumns?.length) {
      return res.status(400).json({ error: 'currentColumns required' });
    }

    let fieldQuery = `
      SELECT f.*, c.name as connector_name
      FROM field_catalog f
      JOIN connectors c ON c.id = f.connector_id
      WHERE f.is_active = true
    `;
    const vals = [];
    if (connectorIds?.length) {
      fieldQuery += ` AND f.connector_id = ANY($1)`;
      vals.push(connectorIds);
    }

    const fieldsResult = await db.query(fieldQuery, vals);
    const suggestions = await suggestFields(currentColumns, fieldsResult.rows);
    res.json({ suggestions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
