import { Router } from 'express';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../config/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// List report runs
router.get('/', async (req, res) => {
  try {
    const { templateId, clientId, status, limit = 50 } = req.query;
    let query = `
      SELECT r.*, t.name as template_name, c.name as client_name
      FROM report_runs r
      JOIN report_templates t ON t.id = r.template_id
      JOIN clients c ON c.id = r.client_id
    `;
    const conditions = [];
    const vals = [];
    let i = 1;

    if (templateId) { conditions.push(`r.template_id = $${i++}`); vals.push(templateId); }
    if (clientId) { conditions.push(`r.client_id = $${i++}`); vals.push(clientId); }
    if (status) { conditions.push(`r.status = $${i++}`); vals.push(status); }

    if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;
    query += ` ORDER BY r.created_at DESC LIMIT $${i}`;
    vals.push(parseInt(limit, 10));

    const result = await db.query(query, vals);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single run
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.*, t.name as template_name, c.name as client_name
       FROM report_runs r
       JOIN report_templates t ON t.id = r.template_id
       JOIN clients c ON c.id = r.client_id
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Run not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download report output
router.get('/:id/download', async (req, res) => {
  try {
    const { type = 'pdf' } = req.query;
    const outputDir = join(__dirname, '../../reports-output');
    const filePath = join(outputDir, `${req.params.id}.${type}`);

    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Report file not found' });
    }

    const contentTypes = {
      pdf: 'application/pdf',
      csv: 'text/csv',
    };

    res.setHeader('Content-Type', contentTypes[type] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="report.${type}"`);

    const data = await readFile(filePath);
    res.send(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
