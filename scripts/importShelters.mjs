/**
 * One-time import: fetches real Tel Aviv shelter data from the municipality
 * GIS API and upserts it into Supabase, then removes the old hardcoded rows.
 *
 * Usage:  node scripts/importShelters.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bpcfzbhgkwqjivtnkwyu.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwY2Z6Ymhna3dxaml2dG5rd3l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4Mjg5ODIsImV4cCI6MjA4OTQwNDk4Mn0.bYSAU_eZ4yexV3nKwtz7t-y0kSDFtI0KRCAHrOwAEBo';

const GIS_URL =
  'https://gisn.tel-aviv.gov.il/GisOpenData/service.asmx/GetLayer' +
  '?layerCode=592&layerWhere=&projection=&xmax=&xmin=&ymax=&ymin=';

const BATCH_SIZE = 100;

// t_sug values that indicate the shelter is wheelchair accessible
const ACCESSIBLE_TYPES = new Set(['מקלט ציבורי נגיש']);

// Old hardcoded shelter names to remove after import
const HARDCODED_NAMES = [
  'Shelter – Dizengoff Center',
  'Shelter – Azrieli Mall',
  'Shelter – HaShalom Station',
];

const supabase = createClient(SUPABASE_URL, ANON_KEY);

// ── Fetch ────────────────────────────────────────────────────────────────────

async function fetchGIS() {
  console.log('Fetching Tel Aviv GIS shelter data…');
  const res = await fetch(GIS_URL);
  if (!res.ok) throw new Error(`GIS API returned ${res.status}`);
  const json = await res.json();
  const features = json.features ?? [];
  console.log(`  Got ${features.length} raw features`);
  return features;
}

// ── Map to Supabase schema ───────────────────────────────────────────────────

function toRow(feature) {
  const a = feature.attributes;

  // Build a human-readable name
  const baseName = (a.shem ?? '').trim();
  const address  = (a.Full_Address ?? '').trim();
  const typeName = (a.t_sug ?? '').trim();
  const name = baseName
    ? `${baseName} – ${address}`
    : `${typeName} – ${address}`;

  return {
    name,
    address,
    latitude:      a.lat,
    longitude:     a.lon,
    is_accessible: ACCESSIBLE_TYPES.has(a.t_sug),
    is_public:     true,
    is_approved:   true,
  };
}

// ── Insert in batches ────────────────────────────────────────────────────────

async function insertBatches(rows) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('shelters').insert(batch);
    if (error) throw new Error(`Batch ${i / BATCH_SIZE + 1} insert failed: ${error.message}`);
    inserted += batch.length;
    process.stdout.write(`  Inserted ${inserted}/${rows.length}\r`);
  }
  console.log(`\n  ✅ Inserted ${inserted} shelters.`);
}

// ── Remove old hardcoded shelters ────────────────────────────────────────────

async function removeHardcoded() {
  const { data, error } = await supabase
    .from('shelters')
    .delete()
    .in('name', HARDCODED_NAMES)
    .select('name');

  if (error) {
    console.warn('  ⚠️  Could not remove hardcoded shelters:', error.message);
    return;
  }
  const removed = data?.length ?? 0;
  if (removed > 0) {
    console.log(`  🗑  Removed ${removed} hardcoded shelter(s): ${data.map(r => r.name).join(', ')}`);
  } else {
    console.log('  ℹ️  No hardcoded shelters found to remove (already clean).');
  }
}

// ── Verify ───────────────────────────────────────────────────────────────────

async function verify() {
  const { count, error } = await supabase
    .from('shelters')
    .select('*', { count: 'exact', head: true })
    .eq('is_approved', true);

  if (error) throw new Error(`Verify failed: ${error.message}`);
  console.log(`  ✅ Total approved shelters in DB: ${count}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

const features = await fetchGIS();

// Filter: usable only (all 543 currently pass, but keep the guard future-proof)
const usable = features.filter(f => f.attributes?.pail === 'כשיר לשימוש');
console.log(`  Usable shelters (pail=כשיר לשימוש): ${usable.length}`);

// Skip rows with missing coordinates
const rows = usable
  .map(toRow)
  .filter(r => r.latitude != null && r.longitude != null);
console.log(`  Rows with valid coordinates: ${rows.length}`);

console.log('\nInserting into Supabase…');
await insertBatches(rows);

console.log('\nRemoving old hardcoded shelters…');
await removeHardcoded();

console.log('\nVerifying…');
await verify();

console.log('\nDone.');
