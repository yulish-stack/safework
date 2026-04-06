import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  useMap,
} from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { useLocations } from '../hooks/useLocations';
import Sidebar from './Sidebar';
import SubmitModal from './SubmitModal';
import WelcomeModal from './WelcomeModal';
import { parseHours } from '../lib/parseHours';
import { haversineMetres } from '../lib/distance';
import './MapView.css';

const ISRAEL_CENTER = { lat: 32.0553, lng: 34.7818 };
const API_KEY   = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const MOBILE_BP = 768;

const ICON = {
  business: '/icons/coffee-cup.png',
  shelter:  '/icons/shelter-door.png',
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseShortAddress(formatted) {
  if (!formatted) return '';
  const parts = formatted.split(',').map(p => p.trim());
  const clean = parts.filter(p =>
    !/^\d{4,}$/.test(p) && !/^ישראל$/.test(p) && !/^Israel$/i.test(p)
  );
  return clean.slice(0, 2).join(', ');
}

// ── Business marker (React component — only rendered for viewport-visible businesses) ──

function Marker({ loc, isActive, onClick }) {
  return (
    <AdvancedMarker position={{ lat: loc.lat, lng: loc.lng }} onClick={onClick} zIndex={isActive ? 999 : 1}>
      <div className={`marker-wrapper marker-wrapper--${loc.type} ${isActive ? 'marker-wrapper--active' : ''}`}>
        <img src={ICON[loc.type]} alt={loc.type} className="marker-pin" />
        <span className="marker-label">{loc.name}</span>
      </div>
    </AdvancedMarker>
  );
}

function UserLocationMarker({ location }) {
  return (
    <AdvancedMarker position={location} zIndex={500}>
      <div className="user-dot">
        <div className="user-dot__pulse" />
        <div className="user-dot__core" />
      </div>
    </AdvancedMarker>
  );
}

// ── ShelterClusterer — imperative markers + MarkerClusterer (no per-shelter React component) ──
//
// Creates google.maps.marker.AdvancedMarkerElement instances directly so that
// React never reconciles 543 individual marker components. The MarkerClusterer
// handles show/hide per viewport and groups nearby shelters into cluster pills.

function ShelterClusterer({ shelters, selected, onSelect }) {
  const map          = useMap();
  const clustererRef = useRef(null);
  // Map of shelter.id → { marker: AdvancedMarkerElement, pin: HTMLElement }
  const markerMapRef = useRef(new Map());
  const onSelectRef  = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Build the clusterer once when map and shelters are available
  useEffect(() => {
    if (!map || !shelters.length) return;
    const AME = window.google?.maps?.marker?.AdvancedMarkerElement;
    if (!AME) return;

    // Tear down any previous clusterer
    clustererRef.current?.clearMarkers();
    markerMapRef.current.forEach(({ marker }) => { marker.map = null; });
    markerMapRef.current.clear();

    const markers = shelters.map(shelter => {
      const pin = document.createElement('div');
      pin.className = 'marker-wrapper marker-wrapper--shelter';
      pin.innerHTML =
        `<img src="/icons/shelter-door.png" alt="shelter" class="marker-pin">` +
        `<span class="marker-label">${escapeHtml(shelter.name)}</span>`;

      const marker = new AME({
        position: { lat: shelter.lat, lng: shelter.lng },
        content:  pin,
        title:    shelter.name,
      });
      marker.addListener('click', () => onSelectRef.current(shelter));

      markerMapRef.current.set(shelter.id, { marker, pin });
      return marker;
    });

    clustererRef.current = new MarkerClusterer({
      map,
      markers,
      renderer: {
        render({ count, position }) {
          const AME2 = window.google.maps.marker.AdvancedMarkerElement;
          const sizeClass = count >= 100 ? 'cluster-marker--lg'
                          : count >= 20  ? 'cluster-marker--md'
                          :                'cluster-marker--sm';
          const el = document.createElement('div');
          el.className = `cluster-marker cluster-marker--shelter ${sizeClass}`;
          el.textContent = count;
          return new AME2({ position, content: el, zIndex: 100 + count });
        },
      },
    });

    return () => {
      clustererRef.current?.clearMarkers();
      clustererRef.current = null;
      markerMapRef.current.forEach(({ marker }) => { marker.map = null; });
      markerMapRef.current.clear();
    };
  }, [map, shelters]); // eslint-disable-line

  // Update active class in-place without rebuilding markers
  useEffect(() => {
    markerMapRef.current.forEach(({ pin }, id) => {
      pin.classList.toggle('marker-wrapper--active', id === selected?.id);
    });
  }, [selected]);

  return null;
}

// ── BoundsTracker — debounced bounds_changed, no React state on every pixel ──

function BoundsTracker({ onBoundsChange }) {
  const map        = useMap();
  const callbackRef = useRef(onBoundsChange);
  callbackRef.current = onBoundsChange;

  useEffect(() => {
    if (!map) return;
    let timer;
    const update = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const b = map.getBounds();
        if (b) callbackRef.current(b);
      }, 300);
    };

    // Seed initial bounds once map has finished rendering
    const initTimer = setTimeout(() => {
      const b = map.getBounds();
      if (b) callbackRef.current(b);
    }, 100);

    const listener = map.addListener('bounds_changed', update);
    return () => {
      window.google.maps.event.removeListener(listener);
      clearTimeout(timer);
      clearTimeout(initTimer);
    };
  }, [map]);

  return null;
}

/**
 * Runs inside APIProvider.
 * Injects all custom controls into map.controls so they survive fullscreen.
 *
 * TOP_LEFT  → Map/Satellite toggle + Add place button (same on both platforms)
 * RIGHT_TOP → My Location button on desktop (stacks below fullscreen button)
 * RIGHT_BOTTOM → My Location button on mobile
 */
function MapController({
  onReady, mapType,
  locationStatus, onMyLocation,
  isMobile, onMapTypeChange, onSubmit, onPlaceAdd,
}) {
  const map = useMap();
  const pushed          = useRef(false);
  const isMobileRef     = useRef(isMobile);
  isMobileRef.current   = isMobile;
  const onPlaceAddRef   = useRef(onPlaceAdd);
  onPlaceAddRef.current = onPlaceAdd;
  const infoWindowRef   = useRef(null);

  // Stable DOM containers — pushed to map.controls once on mount
  const [elTopLeft]  = useState(() => document.createElement('div'));
  const [elLocation] = useState(() => document.createElement('div'));

  useEffect(() => {
    if (!map) return;
    onReady(map);
    // Always use our custom toggle — disable the native one
    map.setOptions({ mapTypeControl: false });

    if (pushed.current) return;
    pushed.current = true;

    const CP = window.google.maps.ControlPosition;
    // Map/Satellite + Add place — top-left on all screen sizes
    map.controls[CP.TOP_LEFT].push(elTopLeft);
    // My Location — below fullscreen (RIGHT_TOP) on desktop, bottom-right on mobile
    map.controls[isMobileRef.current ? CP.RIGHT_BOTTOM : CP.RIGHT_TOP].push(elLocation);

    // POI click → custom SafeWork info window
    map.addListener('click', async (e) => {
      if (!e.placeId) return;
      e.stop(); // prevent the default Google info window

      const iw = infoWindowRef.current ??
        (infoWindowRef.current = new window.google.maps.InfoWindow());

      const loadEl = document.createElement('div');
      loadEl.className = 'siw';
      loadEl.innerHTML = '<p class="siw__loading">Loading…</p>';
      iw.setContent(loadEl);
      iw.setPosition(e.latLng);
      iw.open(map);

      try {
        const place = new window.google.maps.places.Place({ id: e.placeId });
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'regularOpeningHours', 'websiteURI', 'location'],
        });

        const name      = place.displayName || '';
        const shortAddr = parseShortAddress(place.formattedAddress || '');
        const lat       = place.location?.lat() ?? null;
        const lng       = place.location?.lng() ?? null;

        const el = document.createElement('div');
        el.className = 'siw';
        el.innerHTML = `
          <p class="siw__name">${escapeHtml(name)}</p>
          ${shortAddr ? `<p class="siw__addr">${escapeHtml(shortAddr)}</p>` : ''}
          <button class="siw__btn" type="button">+ Add to SafeWork</button>
        `;
        el.querySelector('.siw__btn').addEventListener('click', () => {
          iw.close();
          onPlaceAddRef.current({
            name,
            address: shortAddr,
            coords:  lat != null && lng != null ? { lat, lng } : null,
            hours:   parseHours(place.regularOpeningHours?.periods ?? []),
            website: place.websiteURI || '',
          });
        });
        iw.setContent(el);
      } catch {
        iw.close();
      }
    });

  }, [map]); // eslint-disable-line

  useEffect(() => {
    if (map) map.setMapTypeId(mapType);
  }, [map, mapType]);

  return (
    <>
      {/* TOP_LEFT: Map/Satellite toggle + Add place */}
      {createPortal(
        <div className="map-ctrl-row">
          <div className="map-type-toggle">
            <button
              className={`map-type-btn ${mapType === 'roadmap' ? 'map-type-btn--active' : ''}`}
              onClick={() => onMapTypeChange('roadmap')}
            >Map</button>
            <button
              className={`map-type-btn ${mapType === 'satellite' ? 'map-type-btn--active' : ''}`}
              onClick={() => onMapTypeChange('satellite')}
            >Satellite</button>
          </div>
          <button className="map-add-btn" onClick={onSubmit}>
            + Add place
          </button>
        </div>,
        elTopLeft
      )}

      {/* RIGHT_TOP / RIGHT_BOTTOM: My Location button */}
      {createPortal(
        <button
          className="map-location-btn"
          onClick={onMyLocation}
          aria-label="My location"
        >
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            style={{ color: locationStatus === 'granted' ? '#2979ff' : '#555' }}
          >
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2"  x2="12" y2="7"  />
            <line x1="12" y1="17" x2="12" y2="22" />
            <line x1="2"  y1="12" x2="7"  y2="12" />
            <line x1="17" y1="12" x2="22" y2="12" />
          </svg>
        </button>,
        elLocation
      )}
    </>
  );
}

export default function MapView() {
  const { businesses, shelters, loading } = useLocations();
  const [selected,       setSelected]      = useState(null);
  const [submitOpen,     setSubmitOpen]     = useState(false);
  const [mapType,        setMapType]        = useState('roadmap');
  const [isMobile,       setIsMobile]       = useState(() => window.innerWidth <= MOBILE_BP);
  const [showWelcome,    setShowWelcome]    = useState(
    () => localStorage.getItem('safework_welcome_seen') !== 'true'
  );

  const [userLocation,   setUserLocation]   = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [locationMsg,    setLocationMsg]    = useState('');

  const [prefill, setPrefill] = useState(null);

  const [mapReady,      setMapReady]      = useState(false);
  const [initialCenter, setInitialCenter] = useState(ISRAEL_CENTER);
  const [initialZoom,   setInitialZoom]   = useState(13);

  // Debounced viewport bounds — used to filter visible businesses
  const [mapBounds, setMapBounds] = useState(null);
  const handleBoundsChange = useCallback(b => setMapBounds(b), []);

  // Only render businesses that are inside the current viewport bounds.
  // Falls back to all businesses before bounds are available (first render).
  const visibleBusinesses = useMemo(() => {
    if (!mapBounds) return businesses;
    return businesses.filter(b => mapBounds.contains({ lat: b.lat, lng: b.lng }));
  }, [businesses, mapBounds]);

  // Probe for already-granted location before rendering the map so there's no jump.
  useEffect(() => {
    if (!navigator?.permissions) { setMapReady(true); return; }
    navigator.permissions.query({ name: 'geolocation' }).then(perm => {
      if (perm.state !== 'granted') { setMapReady(true); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setInitialCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setInitialZoom(14);
          setMapReady(true);
        },
        () => setMapReady(true),
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 2_000 }
      );
    }).catch(() => setMapReady(true));
  }, []);

  const mapRef         = useRef(null);
  const sheetHeightRef = useRef(0);

  useEffect(() => {
    const mq      = window.matchMedia(`(max-width: ${MOBILE_BP}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) { setLocationStatus('unavailable'); return; }
    setLocationStatus('prompting');
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('granted');
      },
      () => {
        setLocationStatus('denied');
        setTimeout(() => setLocationStatus('dismissed'), 4000);
      },
      { enableHighAccuracy: false, maximumAge: 30_000, timeout: 15_000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleMapReady = useCallback((map) => { mapRef.current = map; }, []);

  function handleSheetHeightChange(h) { sheetHeightRef.current = h; }

  function handleSelectLocation(loc) {
    setSelected(loc);
    const map = mapRef.current;
    if (!map) return;
    map.panTo({ lat: loc.lat, lng: loc.lng });
    if (isMobile) {
      const offset = Math.round(sheetHeightRef.current * 0.35);
      if (offset > 0) map.panBy(0, offset);
    }
  }

  function handleNearestShelter() {
    if (locationStatus !== 'granted' || !userLocation) {
      setLocationMsg('Enable location in your browser settings to use this feature.');
      setTimeout(() => setLocationMsg(''), 3000);
      return;
    }
    if (!shelters.length) return;
    let nearest = null, minDist = Infinity;
    for (const s of shelters) {
      const d = haversineMetres(userLocation.lat, userLocation.lng, s.lat, s.lng);
      if (d < minDist) { minDist = d; nearest = s; }
    }
    if (nearest) {
      mapRef.current?.setZoom(16);
      handleSelectLocation(nearest);
    }
  }

  function handleMyLocation() {
    if (locationStatus === 'granted' && userLocation) {
      mapRef.current?.panTo(userLocation);
      mapRef.current?.setZoom(15);
    } else {
      setLocationMsg('Enable location in your browser settings to use this feature.');
      setTimeout(() => setLocationMsg(''), 3000);
    }
  }

  return (
    <div className="map-container">
      {locationStatus === 'prompting' && (
        <div className="location-banner location-banner--prompt">
          SafeWork works best with your location — we use it to show how far shelters are from you 📍
        </div>
      )}
      {locationStatus === 'denied' && (
        <div className="location-banner location-banner--denied">
          Location access denied — distance to shelters won't be available
        </div>
      )}

      {loading && (
        <div className="map-loading">
          <span className="map-loading__spinner" />
          Loading locations…
        </div>
      )}

      {mapReady && <APIProvider apiKey={API_KEY} libraries={['places']}>
        <GoogleMap
          defaultCenter={initialCenter}
          defaultZoom={initialZoom}
          mapId="safework-map"
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ width: '100%', height: '100%' }}
          onClick={() => setSelected(null)}
        >
          <MapController
            onReady={handleMapReady}
            mapType={mapType}
            locationStatus={locationStatus}
            onMyLocation={handleMyLocation}
            isMobile={isMobile}
            onMapTypeChange={setMapType}
            onSubmit={() => setSubmitOpen(true)}
            onPlaceAdd={(data) => { setPrefill(data); setSubmitOpen(true); }}
          />

          {/* Debounced bounds tracker — drives visibleBusinesses */}
          <BoundsTracker onBoundsChange={handleBoundsChange} />

          {/* Imperative shelter markers + clustering (no React per-shelter component) */}
          <ShelterClusterer
            shelters={shelters}
            selected={selected}
            onSelect={handleSelectLocation}
          />

          {/* Business markers — only those in the current viewport */}
          {userLocation && <UserLocationMarker location={userLocation} />}
          {visibleBusinesses.map((loc) => (
            <Marker
              key={loc.id}
              loc={loc}
              isActive={selected?.id === loc.id}
              onClick={(e) => { e.stop(); handleSelectLocation(loc); }}
            />
          ))}
        </GoogleMap>
      </APIProvider>}

      {locationMsg && <div className="location-msg">{locationMsg}</div>}

      <button
        className={`nearest-shelter-btn${!shelters.length ? ' nearest-shelter-btn--loading' : ''}`}
        onClick={handleNearestShelter}
        disabled={!shelters.length}
        aria-label="Find nearest shelter"
      >
        <img src="/icons/shelter-door.png" alt="" className="nearest-shelter-btn__icon" />
        Nearest Shelter
      </button>

      {selected && (
        <Sidebar
          location={selected}
          shelters={shelters}
          onClose={() => setSelected(null)}
          onSelectLocation={handleSelectLocation}
          onSheetHeightChange={handleSheetHeightChange}
          userLocation={userLocation}
        />
      )}

      {submitOpen && <SubmitModal onClose={() => { setSubmitOpen(false); setPrefill(null); }} prefill={prefill} />}
      {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
    </div>
  );
}
