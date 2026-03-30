import { useState, useEffect } from 'react';
import { fetchBusinesses, fetchShelters } from '../lib/api';
import { haversineMetres } from '../lib/distance';

async function validateBusinessCoords(businesses) {
  for (const biz of businesses) {
    if (!biz.address || biz.latitude == null || biz.longitude == null) continue;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=il&q=${encodeURIComponent(biz.address)}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (!data.length) continue;
      const gLat = parseFloat(data[0].lat);
      const gLng = parseFloat(data[0].lon);
      const dist = haversineMetres(biz.latitude, biz.longitude, gLat, gLng);
      if (dist > 500) {
        console.warn(
          `[SafeWork] Coord mismatch: "${biz.name}" — stored (${biz.latitude}, ${biz.longitude}), geocoded "${biz.address}" → (${gLat}, ${gLng}), Δ${Math.round(dist)}m`
        );
      }
    } catch { /* ignore network errors */ }
    // Nominatim rate limit: 1 req/s
    await new Promise(r => setTimeout(r, 1100));
  }
}

export function useLocations() {
  const [businesses, setBusinesses] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchBusinesses(), fetchShelters()])
      .then(([b, s]) => {
        setBusinesses(b);
        setShelters(s);
        validateBusinessCoords(b);
      })
      .finally(() => setLoading(false));
  }, []);

  return { businesses, shelters, loading };
}
