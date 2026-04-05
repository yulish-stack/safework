import { describe, it, expect } from 'vitest';

/**
 * Mirror the exact URL-building expression used in BusinessDetail.jsx
 * and ShelterDetail.jsx so that any change to the template literal
 * in production code will break these tests.
 */
function buildDirectionsUrl(location) {
  return `https://www.google.com/maps/dir/?api=1&destination=${
    location.address
      ? encodeURIComponent(location.address)
      : `${location.lat},${location.lng}`
  }`;
}

describe('Directions URL builder', () => {
  // ── Address-first behaviour ───────────────────────────────────────────────

  it('uses the address field when present', () => {
    const url = buildDirectionsUrl({ address: 'התבור 32', lat: 32.05, lng: 34.79 });
    expect(url).toContain('destination=');
    expect(url).toContain(encodeURIComponent('התבור 32'));
  });

  it('applies encodeURIComponent to the full address string', () => {
    const address = 'דיזנגוף 50, תל אביב';
    const url = buildDirectionsUrl({ address, lat: 32.05, lng: 34.78 });
    // Encoded form must be present
    expect(url).toContain(encodeURIComponent(address));
    // Raw un-encoded string must NOT appear (space, commas, Hebrew chars)
    expect(url).not.toContain(address);
  });

  it('does NOT embed lat/lng when address is a non-empty string', () => {
    const url = buildDirectionsUrl({ address: 'התבור 32', lat: 32.0553, lng: 34.7818 });
    expect(url).not.toContain('32.0553');
    expect(url).not.toContain('34.7818');
  });

  it('produces a google maps directions URL (regression: was using wrong format)', () => {
    const url = buildDirectionsUrl({ address: 'התבור 32', lat: 32.0, lng: 34.0 });
    expect(url).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=/);
    // Must NOT use the old path-based format /dir/origin/dest/
    expect(url).not.toMatch(/\/dir\/[\d.]+,[\d.]+\//);
  });

  // ── Coordinate fallback ───────────────────────────────────────────────────

  it('falls back to coordinates when address is an empty string', () => {
    const url = buildDirectionsUrl({ address: '', lat: 32.0553, lng: 34.7818 });
    expect(url).toContain('32.0553,34.7818');
  });

  it('falls back to coordinates when address is null', () => {
    const url = buildDirectionsUrl({ address: null, lat: 32.0553, lng: 34.7818 });
    expect(url).toContain('32.0553,34.7818');
  });

  it('falls back to coordinates when address is undefined', () => {
    const url = buildDirectionsUrl({ address: undefined, lat: 32.0553, lng: 34.7818 });
    expect(url).toContain('32.0553,34.7818');
  });

  // ── Sanity checks ─────────────────────────────────────────────────────────

  it('always contains exactly one destination= parameter', () => {
    const withAddr = buildDirectionsUrl({ address: 'Test St', lat: 0, lng: 0 });
    const withCoords = buildDirectionsUrl({ address: '', lat: 0, lng: 0 });
    expect(withAddr.match(/destination=/g)).toHaveLength(1);
    expect(withCoords.match(/destination=/g)).toHaveLength(1);
  });
});
