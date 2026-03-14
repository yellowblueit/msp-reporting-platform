import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(join(__dirname, '001_initial.sql'), 'utf8');

  try {
    await pool.query(sql);
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
