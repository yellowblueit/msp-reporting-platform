import { Router } from 'express';
import db from '../config/database.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// Get all settings
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM platform_settings ORDER BY key');
    const settings = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update settings (admin only)
router.put('/', requireAdmin, async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await db.query(
        `INSERT INTO platform_settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, JSON.stringify(value)]
      );
    }
    res.json({ saved: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
