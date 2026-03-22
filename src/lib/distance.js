/**
 * Haversine distance between two lat/lng points, in metres.
 */
export function haversineMetres(lat1, lng1, lat2, lng2) {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Returns { shelter, metres } for the nearest shelter to a given business.
 */
export function nearestShelter(business, shelters) {
  let closest = null;
  let minMetres = Infinity;
  for (const s of shelters) {
    const d = haversineMetres(business.lat, business.lng, s.lat, s.lng);
    if (d < minMetres) {
      minMetres = d;
      closest = s;
    }
  }
  return { shelter: closest, metres: Math.round(minMetres) };
}

/**
 * Returns a proximity descriptor based on metres.
 */
export function proximityLabel(metres) {
  if (metres < 100) return { emoji: '🟢', label: 'Safe',             className: 'proximity--close'  };
  if (metres < 300) return { emoji: '🟠', label: 'Cutting it close', className: 'proximity--medium' };
  return               { emoji: '🔴', label: 'Too far',          className: 'proximity--far'    };
}
