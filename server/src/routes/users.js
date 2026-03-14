import { Router } from 'express';
import bcrypt from 'bcrypt';
import db from '../config/database.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// List all users (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single user (admin only)
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create user (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password, and name required' });
    }

    const validRoles = ['admin', 'viewer'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}` });
    }

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
      [email, passwordHash, name, role || 'viewer']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { email, name, role } = req.body;

    const validRoles = ['admin', 'viewer'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}` });
    }

    // Prevent removing the last admin
    if (role && role !== 'admin') {
      const adminCount = await db.query(
        "SELECT COUNT(*) FROM users WHERE role = 'admin' AND id != $1",
        [req.params.id]
      );
      if (parseInt(adminCount.rows[0].count) === 0) {
        return res.status(400).json({ error: 'Cannot remove the last admin user' });
      }
    }

    const result = await db.query(
      `UPDATE users SET
        email = COALESCE($1, email),
        name = COALESCE($2, name),
        role = COALESCE($3, role)
       WHERE id = $4
       RETURNING id, email, name, role, created_at`,
      [email, name, role, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Reset password (admin only — set password for any user)
router.put('/:id/password', requireAdmin, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id',
      [passwordHash, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ updated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change own password (any authenticated user)
router.put('/me/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!user.rows[0]) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.user.id]);
    res.json({ updated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get own profile (any authenticated user)
router.get('/me/profile', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update own profile (any authenticated user)
router.put('/me/profile', async (req, res) => {
  try {
    const { name, email } = req.body;
    const result = await db.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        email = COALESCE($2, email)
       WHERE id = $3
       RETURNING id, email, name, role, created_at`,
      [name, email, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Delete user (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Prevent removing the last admin
    const user = await db.query('SELECT role FROM users WHERE id = $1', [req.params.id]);
    if (user.rows[0]?.role === 'admin') {
      const adminCount = await db.query(
        "SELECT COUNT(*) FROM users WHERE role = 'admin' AND id != $1",
        [req.params.id]
      );
      if (parseInt(adminCount.rows[0].count) === 0) {
        return res.status(400).json({ error: 'Cannot delete the last admin user' });
      }
    }

    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
