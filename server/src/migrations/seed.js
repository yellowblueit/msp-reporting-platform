import pg from 'pg';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  try {
    // Create admin user with proper bcrypt hash
    const passwordHash = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
      ['admin@nexusmsp.local', passwordHash, 'Admin', 'admin']
    );
    console.log('Admin user seeded: admin@nexusmsp.local / admin123');
    console.log('IMPORTANT: Change this password immediately in production!');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
