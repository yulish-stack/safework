/**
 * Nearest shelter calculation with Supabase caching.
 *
 * Required table:
 *   CREATE TABLE shelter_distances (
 *     business_id             uuid     NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
 *     shelter_id              uuid     NOT NULL REFERENCES shelters(id)   ON DELETE CASCADE,
 *     rank                    smallint NOT NULL CHECK (rank BETWEEN 1 AND 3),
 *     walking_time_minutes    float    NOT NULL,
 *     walking_distance_meters integer  NOT NULL,
 *     UNIQUE (business_id, rank)
 *   );
 */

import { supabase } from './supabase';
import { haversineMetres } from './distance';

const CANDIDATES = 10;
const API_KEY    = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

async function walkingRoute(origin, dest) {
  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type':     'application/json',
      'X-Goog-Api-Key':   API_KEY,
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
    },
    body: JSON.stringify({
      origin:      { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: dest.lat,   longitude: dest.lng   } } },
      travelMode:  'WALK',
    }),
  });
  if (!res.ok) throw new Error(`Routes API ${res.status}`);
  const json  = await res.json();
  const route = json.routes?.[0];
  if (!route) throw new Error('no route');
  // duration arrives as "123s"
  return {
    walkMins:   parseInt(route.duration, 10) / 60,
    walkMetres: route.distanceMeters,
  };
}

/**
 * Returns { top, rest } where:
 *   top  — { shelter, walkMins, walkMetres }   rank 1
 *   rest — [{ shelter, walkMins, walkMetres }] ranks 2 and 3 (never same shelter as top)
 *
 * Cache-first: if all 3 ranks are already stored in shelter_distances, returns them
 * immediately without making any API calls.
 */
export async function getTop3Shelters(business, allShelters) {
  if (!allShelters?.length) return { top: null, rest: [] };

  // ── 1. Read cache ──────────────────────────────────────────────────────────
  const { data: cached } = await supabase
    .from('shelter_distances')
    .select('shelter_id, rank, walking_time_minutes, walking_distance_meters')
    .eq('business_id', business.id)
    .order('rank')
    .limit(3);

  if (cached?.length >= 3) {
    const [r1, r2, r3] = cached;
    const uniqueIds = new Set([r1.shelter_id, r2.shelter_id, r3.shelter_id]);
    if (uniqueIds.size === 3) {
      const resolve = (row) => ({
        shelter:    allShelters.find(s => s.id === row.shelter_id),
        walkMins:   row.walking_time_minutes,
        walkMetres: row.walking_distance_meters,
      });
      const top  = resolve(r1);
      const rest = [resolve(r2), resolve(r3)].filter(r => r.shelter);
      if (top.shelter) return { top, rest };
    }
  }

  // ── 2. Narrow candidates by straight-line distance ────────────────────────
  const candidates = [...allShelters]
    .map(s => ({ shelter: s, hd: haversineMetres(business.lat, business.lng, s.lat, s.lng) }))
    .sort((a, b) => a.hd - b.hd)
    .slice(0, CANDIDATES);

  // ── 3. Fetch walking times from Routes API ────────────────────────────────
  const settled = await Promise.allSettled(
    candidates.map(({ shelter }) =>
      walkingRoute(business, shelter).then(({ walkMins, walkMetres }) => ({
        shelter, walkMins, walkMetres,
      }))
    )
  );

  const seen = new Set();
  let ranked = settled
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
    .sort((a, b) => a.walkMins - b.walkMins)
    .filter(r => { if (seen.has(r.shelter.id)) return false; seen.add(r.shelter.id); return true; })
    .slice(0, 3);

  // Fallback: straight-line estimate if Routes API is unavailable
  if (!ranked.length) {
    ranked = candidates.slice(0, 3).map(({ shelter, hd }) => ({
      shelter,
      walkMins:   hd / 80,
      walkMetres: Math.round(hd),
    }));
  }

  if (!ranked.length) return { top: null, rest: [] };

  // ── 4. Persist to cache (check-before-insert to avoid 409 conflicts) ────────
  for (let i = 0; i < ranked.length; i++) {
    const { shelter, walkMins, walkMetres } = ranked[i];
    try {
      const { count } = await supabase
        .from('shelter_distances')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('shelter_id', shelter.id);
      if (count === 0) {
        await supabase.from('shelter_distances').insert({
          business_id:             business.id,
          shelter_id:              shelter.id,
          rank:                    i + 1,
          walking_time_minutes:    walkMins,
          walking_distance_meters: Math.round(walkMetres),
        });
      }
    } catch { }
  }

  return {
    top:  ranked[0],
    rest: ranked.slice(1),
  };
}
