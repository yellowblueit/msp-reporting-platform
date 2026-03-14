import { Router } from 'express';
import db from '../config/database.js';
import { queueOnDemandRun } from '../services/scheduler.js';

const router = Router();

// List all report templates
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t.*,
        (SELECT COUNT(*) FROM report_schedules WHERE template_id = t.id AND is_active = true) as active_schedules,
        (SELECT MAX(created_at) FROM report_runs WHERE template_id = t.id AND status = 'success') as last_run
      FROM report_templates t
      ORDER BY t.updated_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single template
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM report_templates WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Template not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create template
router.post('/', async (req, res) => {
  try {
    const { name, description, columnLayout, filters, settings, connectorIds } = req.body;
    if (!name || !columnLayout) {
      return res.status(400).json({ error: 'name and columnLayout required' });
    }

    const result = await db.query(
      `INSERT INTO report_templates (name, description, column_layout, filters, settings, connector_ids)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        name,
        description || null,
        JSON.stringify(columnLayout),
        JSON.stringify(filters || []),
        JSON.stringify(settings || {}),
        connectorIds || [],
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update template
router.put('/:id', async (req, res) => {
  try {
    const { name, description, columnLayout, filters, settings, connectorIds } = req.body;

    const result = await db.query(
      `UPDATE report_templates SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        column_layout = COALESCE($3, column_layout),
        filters = COALESCE($4, filters),
        settings = COALESCE($5, settings),
        connector_ids = COALESCE($6, connector_ids),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [
        name,
        description,
        columnLayout ? JSON.stringify(columnLayout) : null,
        filters ? JSON.stringify(filters) : null,
        settings ? JSON.stringify(settings) : null,
        connectorIds,
        req.params.id,
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Template not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete template
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM report_templates WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Template not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger on-demand run
router.post('/:id/run', async (req, res) => {
  try {
    const { clientId, outputTypes, recipients } = req.body;
    if (!clientId) return res.status(400).json({ error: 'clientId required' });

    const jobId = await queueOnDemandRun({
      templateId: req.params.id,
      clientId,
      outputTypes: outputTypes || ['pdf'],
      recipients: recipients || [],
    });

    res.json({ queued: true, jobId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
