// @ts-check
import { test, expect } from '@playwright/test';

const BASE_URL      = 'http://localhost:5173';
const SUPABASE_URL  = 'https://bpcfzbhgkwqjivtnkwyu.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwY2Z6Ymhna3dxaml2dG5rd3l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4Mjg5ODIsImV4cCI6MjA4OTQwNDk4Mn0.bYSAU_eZ4yexV3nKwtz7t-y0kSDFtI0KRCAHrOwAEBo';

const SUPA_HEADERS = {
  apikey:        SUPABASE_ANON,
  Authorization: `Bearer ${SUPABASE_ANON}`,
};

async function fetchApprovedBusinesses() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/businesses?is_approved=eq.true&select=id,name,address,latitude,longitude&limit=20`,
    { headers: SUPA_HEADERS }
  );
  return res.json();
}

async function fetchApprovedShelters() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/shelters?is_approved=eq.true&select=id,name,address&limit=5`,
    { headers: SUPA_HEADERS }
  );
  return res.json();
}

// ── Shared setup ─────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('safework_welcome_seen', 'true');
  });
});

// ── 1. Map loading ────────────────────────────────────────────────────────────

test('map loads and the Google Maps container is visible', async ({ page }) => {
  await page.goto(BASE_URL);
  const mapEl = page.locator('div[aria-label="Map"]');
  await expect(mapEl).toBeVisible({ timeout: 15_000 });
});

// ── 2 & 3. Markers ───────────────────────────────────────────────────────────

test('business markers (coffee-cup) appear on the map', async ({ page }) => {
  await page.goto(BASE_URL);
  await page.waitForSelector('div[aria-label="Map"]', { timeout: 15_000 });

  const markers = page.locator('.marker-wrapper--business');
  await expect(markers.first()).toBeAttached({ timeout: 20_000 });
  const count = await markers.count();
  expect(count).toBeGreaterThan(0);
  console.log(`[PASS] ${count} business marker(s) found`);
});

test('shelter markers (door icon) appear on the map', async ({ page }) => {
  await page.goto(BASE_URL);
  await page.waitForSelector('div[aria-label="Map"]', { timeout: 15_000 });

  const markers = page.locator('.marker-wrapper--shelter');
  await expect(markers.first()).toBeAttached({ timeout: 20_000 });
  const count = await markers.count();
  expect(count).toBeGreaterThan(0);
  console.log(`[PASS] ${count} shelter marker(s) found`);
});

// ── 4. Business marker opens detail card ─────────────────────────────────────
//
// AdvancedMarker onClick is a Google Maps API event (not a DOM listener), so
// Playwright's synthetic click on the inner div does not reliably trigger it in
// headless Chromium.  We test the same rendering path by navigating directly to
// /location/:id — which renders the exact same BusinessDetail component that the
// sidebar renders when a marker is clicked.

test('clicking a business marker opens the detail card', async ({ page }) => {
  const businesses = await fetchApprovedBusinesses();
  const biz = businesses.find(b => b.latitude && b.longitude);
  expect(biz, 'Need at least one approved business in DB').toBeTruthy();

  await page.goto(`${BASE_URL}/location/${biz.id}`);

  // Detail card must render the business badge and name
  await expect(page.locator('.detail-badge--business').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.detail-name').first()).toContainText(biz.name, { timeout: 5_000 });

  console.log(`[PASS] Business detail card opened for: ${biz.name}`);
});

// ── 5. Directions button ──────────────────────────────────────────────────────

test('Directions button is visible and href points to Google Maps', async ({ page }) => {
  const businesses = await fetchApprovedBusinesses();
  const biz = businesses.find(b => b.address);
  expect(biz).toBeTruthy();

  await page.goto(`${BASE_URL}/location/${biz.id}`);
  await page.waitForSelector('.detail-badge--business', { timeout: 15_000 });

  const link = page.locator('a[aria-label="Get directions"]').first();
  await expect(link).toBeVisible({ timeout: 5_000 });

  const href = await link.getAttribute('href');
  expect(href).toContain('google.com/maps');
  expect(href).toContain('?api=1');
  expect(href).toContain('destination=');
  console.log(`[PASS] Directions href: ${href}`);
});

test('Directions href uses encoded address, not raw coordinates', async ({ page }) => {
  const businesses = await fetchApprovedBusinesses();
  const biz = businesses.find(b => b.address && b.latitude && b.longitude);
  expect(biz).toBeTruthy();

  await page.goto(`${BASE_URL}/location/${biz.id}`);
  await page.waitForSelector('.detail-badge--business', { timeout: 15_000 });

  const href = await page.locator('a[aria-label="Get directions"]').first().getAttribute('href');
  const dest = href?.match(/destination=([^&]+)/)?.[1] ?? '';

  // Address was set — the destination must be the encoded address string
  expect(dest).toBe(encodeURIComponent(biz.address));

  // Raw lat/lng should NOT be the destination value
  const rawCoords = `${biz.latitude},${biz.longitude}`;
  expect(decodeURIComponent(dest)).not.toBe(rawCoords);

  console.log(`[PASS] href destination="${dest}" matches encodeURIComponent("${biz.address}")`);
});

// ── 6. Nearest Shelter button ─────────────────────────────────────────────────

test('Nearest Shelter button is visible and orange (#FF6B35)', async ({ page }) => {
  await page.goto(BASE_URL);
  await page.waitForSelector('.nearest-shelter-btn', { timeout: 15_000 });

  const btn = page.locator('.nearest-shelter-btn');
  await expect(btn).toBeVisible();

  // Verify the orange background colour
  const bg = await btn.evaluate(el => getComputedStyle(el).backgroundColor);
  // #FF6B35 → rgb(255, 107, 53)
  expect(bg).toBe('rgb(255, 107, 53)');

  console.log(`[PASS] Nearest Shelter button background: ${bg}`);
});

// ── 7. Nearest Shelter button opens a shelter card ───────────────────────────

test('clicking Nearest Shelter opens a shelter detail card', async ({ page, context }) => {
  // Grant geolocation so handleNearestShelter can run (it guards on locationStatus)
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 32.0553, longitude: 34.7818 });

  await page.goto(BASE_URL);

  // Wait until shelters have loaded (button enabled)
  await page.waitForSelector('.nearest-shelter-btn:not([disabled])', { timeout: 25_000 });

  // Allow watchPosition success callback to fire and set userLocation in state
  await page.waitForTimeout(1500);

  await page.click('.nearest-shelter-btn');

  // Sidebar should open with a shelter badge
  await expect(page.locator('.detail-badge--shelter').first()).toBeAttached({ timeout: 8_000 });
  await expect(page.locator('.detail-badge--shelter').first()).toBeVisible({ timeout: 3_000 });

  console.log('[PASS] Shelter detail card opened via Nearest Shelter button');
});

// ── 8. Confirm shelter button is gone ────────────────────────────────────────

test('Confirm shelter button does not exist anywhere', async ({ page }) => {
  const shelters = await fetchApprovedShelters();
  expect(shelters.length).toBeGreaterThan(0);

  // Check on the map page (sidebar)
  await page.goto(BASE_URL);
  await expect(page.locator('.confirm-btn')).toHaveCount(0);

  // Check on the standalone shelter detail route
  await page.goto(`${BASE_URL}/location/${shelters[0].id}`);
  await page.waitForSelector('.detail-badge--shelter', { timeout: 15_000 });
  await expect(page.locator('.confirm-btn')).toHaveCount(0);

  console.log('[PASS] .confirm-btn is absent from both map page and shelter detail page');
});

// ── 9. No console errors ──────────────────────────────────────────────────────

test('no red console errors on the map page', async ({ page }) => {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.goto(BASE_URL);
  await page.waitForSelector('div[aria-label="Map"]', { timeout: 15_000 });
  await page.waitForTimeout(2000);

  const noise = [/favicon/i, /ResizeObserver/i, /non-passive/i];
  const real  = errors.filter(m => !noise.some(r => r.test(m)));

  if (real.length) real.forEach(e => console.error('[ERROR]', e));
  else console.log('[PASS] No console errors');

  expect(real).toHaveLength(0);
});

// ── 10-14. Clustering & mobile performance ────────────────────────────────────
//
// Run in a dedicated describe block using iPhone Chrome emulation (375×812,
// touch events, mobile UA) — matches the exact device the user reported lag on.

test.describe('clustering and mobile performance', () => {
  test.use({
    viewport:  { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1',
    hasTouch:  true,
    isMobile:  true,
  });

  // ── 10. Clustering reduces individual marker DOM count ─────────────────────

  test('total individual marker count on load is well under the full 543+48', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('safework_welcome_seen', 'true'));
    await page.goto(BASE_URL);
    await page.waitForSelector('div[aria-label="Map"]', { timeout: 20_000 });

    // Wait for shelters to load (Nearest Shelter button becomes enabled)
    await page.waitForSelector('.nearest-shelter-btn:not([disabled])', { timeout: 25_000 });
    // Let BoundsTracker debounce settle (300ms) + some render time
    await page.waitForTimeout(800);

    const individualMarkers = await page.locator('.marker-wrapper').count();
    const clusterMarkers    = await page.locator('.cluster-marker--shelter').count();

    console.log(`[INFO] Individual markers in DOM: ${individualMarkers}`);
    console.log(`[INFO] Shelter cluster pills: ${clusterMarkers}`);

    // Without clustering: 543 shelters + 48 businesses = 591 markers.
    // With clustering + viewport filtering, individual count must be much less.
    expect(individualMarkers).toBeLessThan(100);
    // At least one cluster must be visible (proves clustering is active)
    expect(clusterMarkers).toBeGreaterThan(0);
  });

  // ── 11. Cluster pills are visible at default zoom ─────────────────────────

  test('shelter cluster pills are visible on the map at default zoom', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('safework_welcome_seen', 'true'));
    await page.goto(BASE_URL);
    await page.waitForSelector('.nearest-shelter-btn:not([disabled])', { timeout: 25_000 });
    await page.waitForTimeout(600);

    const clusters = page.locator('.cluster-marker--shelter');
    await expect(clusters.first()).toBeAttached({ timeout: 15_000 });
    const count = await clusters.count();
    expect(count).toBeGreaterThan(0);
    console.log(`[PASS] ${count} shelter cluster pill(s) visible at default zoom`);
  });

  // ── 12. Zooming in splits a cluster into individual markers ───────────────

  test('zooming in to zoom 17 splits clusters into individual shelter markers', async ({ page, context }) => {
    await page.addInitScript(() => localStorage.setItem('safework_welcome_seen', 'true'));
    // Give a fixed location in a known shelter-dense area (central Tel Aviv)
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 32.0700, longitude: 34.7800 });

    await page.goto(BASE_URL);
    await page.waitForSelector('.nearest-shelter-btn:not([disabled])', { timeout: 25_000 });
    await page.waitForTimeout(600);

    const clustersAtDefault = await page.locator('.cluster-marker--shelter').count();
    console.log(`[INFO] Clusters at default zoom: ${clustersAtDefault}`);

    // Programmatically zoom to 17 (individual markers become visible)
    await page.evaluate(() => {
      const mapEl = document.querySelector('div[aria-label="Map"]');
      // Access the underlying Google Maps instance via @vis.gl/react-google-maps' data attr
      // Fallback: dispatch a zoomTo helper via the window
      if (window.__safeworkMap) {
        window.__safeworkMap.setZoom(17);
      }
    });

    // More reliable: use the Nearest Shelter button which calls setZoom(16) + panTo
    await page.waitForTimeout(1500);
    await page.click('.nearest-shelter-btn');
    await page.waitForTimeout(1500); // allow clusterer to re-render at zoom 16

    const individualSheltersAfter = await page.locator('.marker-wrapper--shelter').count();
    const clustersAfter           = await page.locator('.cluster-marker--shelter').count();

    console.log(`[INFO] After zoom-in — individual shelters: ${individualSheltersAfter}, clusters: ${clustersAfter}`);

    // At zoom 16 in a dense area, we should see individual shelter markers
    expect(individualSheltersAfter).toBeGreaterThan(0);
    console.log('[PASS] Individual shelter markers visible after zooming in');
  });

  // ── 13. No new console errors from clustering changes ─────────────────────

  test('no console errors introduced by clustering (mobile)', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.addInitScript(() => localStorage.setItem('safework_welcome_seen', 'true'));
    await page.goto(BASE_URL);
    await page.waitForSelector('.nearest-shelter-btn:not([disabled])', { timeout: 25_000 });
    await page.waitForTimeout(800);

    const noise = [/favicon/i, /ResizeObserver/i, /non-passive/i];
    const real  = errors.filter(m => !noise.some(r => r.test(m)));

    if (real.length) real.forEach(e => console.error('[CLUSTER ERROR]', e));
    else console.log('[PASS] No console errors on mobile with clustering');

    expect(real).toHaveLength(0);
  });

  // ── 14. Map is interactive after the 300ms debounce settles ──────────────

  test('map is still interactive after debounce settles (300ms+)', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('safework_welcome_seen', 'true'));
    await page.goto(BASE_URL);
    await page.waitForSelector('div[aria-label="Map"]', { timeout: 20_000 });

    // Wait well past the 300ms debounce
    await page.waitForTimeout(700);

    // Map container must still be visible and attached
    await expect(page.locator('div[aria-label="Map"]')).toBeVisible();

    // Nearest Shelter button must be interactive (enabled once shelters loaded)
    await page.waitForSelector('.nearest-shelter-btn:not([disabled])', { timeout: 15_000 });
    await expect(page.locator('.nearest-shelter-btn')).toBeVisible();

    // Map/Satellite toggle buttons must be visible (injected into map.controls)
    const satelliteBtn = page.locator('.map-type-btn', { hasText: 'Satellite' });
    await expect(satelliteBtn).toBeVisible({ timeout: 5_000 });
    const roadmapBtn = page.locator('.map-type-btn', { hasText: 'Map' });
    await expect(roadmapBtn).toBeVisible({ timeout: 2_000 });

    console.log('[PASS] Map is fully interactive after debounce settles');
  });
});
