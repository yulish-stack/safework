import { supabase } from './supabase';
import {
  businesses as fallbackBusinesses,
  shelters as fallbackShelters,
  allLocations as fallbackAll,
} from '../data/locations';

// ── Normalization (DB row → app shape) ──────────────────────────────────────

function normalizeBusinesses(rows) {
  return rows.map((b) => ({
    id: b.id,
    type: 'business',
    name: b.name,
    lat: b.latitude,
    lng: b.longitude,
    address: b.address || '',
    category: b.type || 'café',
    hours: (() => {
      if (!b.opening_hours) return [];
      try {
        const parsed = JSON.parse(b.opening_hours);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        // Plain-text format: lines separated by \n (e.g. "א׳-ה׳ 7:30-21:00\nו׳ 8:00-18:00")
        return b.opening_hours.split('\n').filter(Boolean).map(line => ({ days: line, time: '' }));
      }
    })(),
    wifi:      { available: b.wifi ?? false, quality: b.wifi_quality || 'ok' },
    outlets:   b.power_outlets ?? false,
    website:   b.website   || null,
    instagram: b.instagram || null,
  }));
}

function normalizeShelters(rows) {
  return rows.map((s) => ({
    id: s.id,
    type: 'shelter',
    name: s.name,
    lat: s.latitude,
    lng: s.longitude,
    address: s.address || '',
    accessible: s.is_accessible ?? false,
    designation: s.is_public ? 'public' : 'private',
  }));
}

// ── Public fetch functions (with fallback) ───────────────────────────────────

export async function fetchBusinesses() {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('is_approved', true)
    .order('created_at');

  if (error) {
    console.warn('[SafeWork] Supabase businesses fetch failed, using fallback:', error.message);
    return fallbackBusinesses;
  }
  return normalizeBusinesses(data);
}

export async function fetchShelters() {
  const { data, error } = await supabase
    .from('shelters')
    .select('*')
    .eq('is_approved', true)
    .order('created_at');

  if (error) {
    console.warn('[SafeWork] Supabase shelters fetch failed, using fallback:', error.message);
    return fallbackShelters;
  }
  return normalizeShelters(data);
}

export async function fetchLocationById(id) {
  // Try businesses first
  const { data: bData, error: bErr } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', id)
    .single();

  if (!bErr && bData) return normalizeBusinesses([bData])[0];

  // Try shelters
  const { data: sData, error: sErr } = await supabase
    .from('shelters')
    .select('*')
    .eq('id', id)
    .single();

  if (!sErr && sData) return normalizeShelters([sData])[0];

  // Fallback: search hardcoded data by id (covers old short IDs like 'b1')
  return fallbackAll.find((l) => l.id === id) ?? null;
}
