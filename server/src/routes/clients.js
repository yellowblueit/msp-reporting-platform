import { Router } from 'express';
import db from '../config/database.js';
import { encrypt } from '../services/encryption.js';

const router = Router();

// List all clients
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM client_contacts WHERE client_id = c.id) as contact_count,
        COALESCE(
          (SELECT array_agg(connector_id) FROM client_connectors WHERE client_id = c.id),
          '{}'
        ) as connector_ids
      FROM clients c
      ORDER BY c.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single client
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Client not found' });

    const contacts = await db.query('SELECT * FROM client_contacts WHERE client_id = $1', [req.params.id]);
    const connectors = await db.query(
      `SELECT cc.connector_id, c.name, c.icon, c.color
       FROM client_connectors cc JOIN connectors c ON c.id = cc.connector_id
       WHERE cc.client_id = $1`,
      [req.params.id]
    );

    res.json({ ...result.rows[0], contacts: contacts.rows, connectors: connectors.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create client
router.post('/', async (req, res) => {
  try {
    const { name, industry, connectorIds, contactEmail, contactName } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const client = await db.query(
      'INSERT INTO clients (name, industry) VALUES ($1, $2) RETURNING *',
      [name, industry || null]
    );
    const clientId = client.rows[0].id;

    // Assign connectors
    if (connectorIds?.length) {
      for (const connId of connectorIds) {
        await db.query(
          'INSERT INTO client_connectors (client_id, connector_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [clientId, connId]
        );
      }
    }

    // Add primary contact
    if (contactEmail) {
      await db.query(
        'INSERT INTO client_contacts (client_id, name, email, role) VALUES ($1, $2, $3, $4)',
        [clientId, contactName || name, contactEmail, 'Primary']
      );
    }

    res.status(201).json(client.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update client
router.put('/:id', async (req, res) => {
  try {
    const { name, industry, status } = req.body;
    const result = await db.query(
      `UPDATE clients SET
        name = COALESCE($1, name),
        industry = COALESCE($2, industry),
        status = COALESCE($3, status),
        updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [name, industry, status, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Client not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete client
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM clients WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Client not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set client credentials for a connector
router.put('/:id/credentials', async (req, res) => {
  try {
    const { connectorId, credentials } = req.body;
    if (!connectorId || !credentials) {
      return res.status(400).json({ error: 'connectorId and credentials required' });
    }

    const encrypted = encrypt(JSON.stringify(credentials));

    const result = await db.query(
      `INSERT INTO client_credentials (client_id, connector_id, credentials_encrypted)
       VALUES ($1, $2, $3)
       ON CONFLICT (client_id, connector_id) DO UPDATE SET
         credentials_encrypted = EXCLUDED.credentials_encrypted,
         updated_at = NOW()
       RETURNING id`,
      [req.params.id, connectorId, encrypted]
    );

    // Ensure connector assignment exists
    await db.query(
      'INSERT INTO client_connectors (client_id, connector_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, connectorId]
    );

    res.json({ saved: true, id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add contact
router.post('/:id/contacts', async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const result = await db.query(
      'INSERT INTO client_contacts (client_id, name, email, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, name, email, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
