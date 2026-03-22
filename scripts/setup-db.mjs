/**
 * Runs the migration SQL via Supabase Management API.
 * Requires an access token – looks in:
 *   1. SUPABASE_ACCESS_TOKEN env var
 *   2. ~/.supabase/.token  (written by `supabase login`)
 *   3. ~/.supabase/token
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_REF = 'bpcfzbhgkwqjivtnkwyu';
const MIGRATION_FILE = join(__dirname, '..', 'supabase', 'migrations', '001_create_tables.sql');

function getAccessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  for (const p of [
    join(homedir(), '.supabase', '.token'),
    join(homedir(), '.supabase', 'token'),
    join(homedir(), '.config', 'supabase', '.token'),
  ]) {
    if (existsSync(p)) {
      try { return readFileSync(p, 'utf-8').trim(); } catch {}
    }
  }
  return null;
}

async function runMigration(token) {
  const sql = readFileSync(MIGRATION_FILE, 'utf-8');
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return text;
}

const token = getAccessToken();

if (!token) {
  console.log('\n⚠️  No Supabase access token found.');
  console.log('Run the migration manually in the Supabase SQL editor:\n');
  console.log('  https://supabase.com/dashboard/project/bpcfzbhgkwqjivtnkwyu/editor\n');
  console.log('--- SQL to paste ---');
  console.log(readFileSync(MIGRATION_FILE, 'utf-8'));
  console.log('--------------------\n');
  process.exit(0);
}

try {
  console.log('Running migration via Management API...');
  await runMigration(token);
  console.log('✅ Migration complete.');
} catch (e) {
  console.error('❌ Migration failed:', e.message);
  console.log('\nRun it manually in the SQL editor:');
  console.log('  https://supabase.com/dashboard/project/bpcfzbhgkwqjivtnkwyu/editor\n');
}
