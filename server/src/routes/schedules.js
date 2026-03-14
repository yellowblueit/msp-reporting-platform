import { Router } from 'express';
import db from '../config/database.js';
import { loadSchedules } from '../services/scheduler.js';

const router = Router();

// List all schedules
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.*, t.name as template_name
      FROM report_schedules s
      JOIN report_templates t ON t.id = s.template_id
      ORDER BY s.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create or update schedule
router.post('/', async (req, res) => {
  try {
    const { templateId, cronExpr, clientIds, outputTypes, recipients, emailSubjectTemplate } = req.body;
    if (!templateId || !cronExpr) {
      return res.status(400).json({ error: 'templateId and cronExpr required' });
    }

    const result = await db.query(
      `INSERT INTO report_schedules (template_id, cron_expr, client_ids, output_types, recipients, email_subject_template)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        templateId,
        cronExpr,
        clientIds || [],
        outputTypes || ['pdf'],
        recipients || [],
        emailSubjectTemplate || '{{reportName}} — {{clientName}} — {{date}}',
      ]
    );

    // Reload schedules in the job queue
    await loadSchedules();

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update schedule
router.put('/:id', async (req, res) => {
  try {
    const { cronExpr, clientIds, outputTypes, recipients, emailSubjectTemplate, isActive } = req.body;

    const result = await db.query(
      `UPDATE report_schedules SET
        cron_expr = COALESCE($1, cron_expr),
        client_ids = COALESCE($2, client_ids),
        output_types = COALESCE($3, output_types),
        recipients = COALESCE($4, recipients),
        email_subject_template = COALESCE($5, email_subject_template),
        is_active = COALESCE($6, is_active),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [cronExpr, clientIds, outputTypes, recipients, emailSubjectTemplate, isActive, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Schedule not found' });

    await loadSchedules();
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete schedule
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM report_schedules WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Schedule not found' });
    await loadSchedules();
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
