import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/wealth_race',
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    process.stdout.write('[Migrations] Connecting to PostgreSQL database...\n');
    await client.query('BEGIN');

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      process.stdout.write(`[Migrations] Applying ${file}...\n`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await client.query(sql);
      process.stdout.write(`[Migrations] Applied ${file} successfully.\n`);
    }

    await client.query('COMMIT');
    process.stdout.write('[Migrations] All migration scripts executed successfully.\n');
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[Migrations] Fatal error executing migrations: ${message}\n`);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations();
}
