/**
 * Seeds businesses and shelters tables.
 * Uses the anon key — works as long as RLS is disabled on the tables.
 * Safe to run multiple times: skips seeding if rows already exist.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bpcfzbhgkwqjivtnkwyu.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwY2Z6Ymhna3dxaml2dG5rd3l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4Mjg5ODIsImV4cCI6MjA4OTQwNDk4Mn0.bYSAU_eZ4yexV3nKwtz7t-y0kSDFtI0KRCAHrOwAEBo';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

const BUSINESSES = [
  {
    name: 'P.O.C Cafe',
    address: 'Florentin, Tel Aviv',
    type: 'café',
    latitude: 32.0573445,
    longitude: 34.7703167,
    opening_hours: JSON.stringify([
      { days: 'Sun–Thu', time: '08:00–22:00' },
      { days: 'Fri',     time: '08:00–16:00' },
      { days: 'Sat',     time: '10:00–22:00' },
    ]),
    wifi: true,
    wifi_quality: 'good',
    power_outlets: true,
    is_approved: true,
  },
  {
    name: 'Easy Cafe Florentine',
    address: 'Florentin, Tel Aviv',
    type: 'café',
    latitude: 32.0561962,
    longitude: 34.7710167,
    opening_hours: JSON.stringify([
      { days: 'Sun–Thu', time: '07:30–21:00' },
      { days: 'Fri',     time: '07:30–14:00' },
      { days: 'Sat',     time: '09:00–21:00' },
    ]),
    wifi: true,
    wifi_quality: 'ok',
    power_outlets: false,
    is_approved: true,
  },
  {
    name: 'Cafe Xoho',
    address: 'Tel Aviv',
    type: 'café',
    latitude: 32.0809187,
    longitude: 34.7702554,
    opening_hours: JSON.stringify([
      { days: 'Sun–Thu', time: '08:00–23:00' },
      { days: 'Fri',     time: '08:00–15:00' },
      { days: 'Sat',     time: '10:00–23:00' },
    ]),
    wifi: true,
    wifi_quality: 'good',
    power_outlets: true,
    is_approved: true,
  },
];

const SHELTERS = [
  {
    name: 'Shelter – Dizengoff Center',
    address: 'Dizengoff Center, Tel Aviv',
    latitude: 32.0793,
    longitude: 34.7742,
    is_accessible: true,
    is_public: true,
    is_approved: true,
  },
  {
    name: 'Shelter – Azrieli Mall',
    address: 'Azrieli Center, Tel Aviv',
    latitude: 32.0698,
    longitude: 34.7812,
    is_accessible: true,
    is_public: true,
    is_approved: true,
  },
  {
    name: 'Shelter – HaShalom Station',
    address: 'HaShalom Train Station, Tel Aviv',
    latitude: 32.0668,
    longitude: 34.7922,
    is_accessible: false,
    is_public: true,
    is_approved: true,
  },
];

async function seedTable(table, rows) {
  const { count, error: countErr } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    console.error(`  ❌ Cannot read ${table}:`, countErr.message);
    console.error('     Make sure you ran the migration first (node scripts/setup-db.mjs)');
    return false;
  }

  if (count > 0) {
    console.log(`  ⏭  ${table}: already has ${count} row(s), skipping.`);
    return true;
  }

  const { error } = await supabase.from(table).insert(rows);
  if (error) {
    console.error(`  ❌ Insert into ${table} failed:`, error.message);
    return false;
  }
  console.log(`  ✅ ${table}: inserted ${rows.length} row(s).`);
  return true;
}

console.log('Seeding database...');
await seedTable('businesses', BUSINESSES);
await seedTable('shelters', SHELTERS);
console.log('Done.');
