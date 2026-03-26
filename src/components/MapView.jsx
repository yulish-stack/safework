import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from '@vis.gl/react-google-maps';
import { useLocations } from '../hooks/useLocations';
import Sidebar from './Sidebar';
import SubmitModal from './SubmitModal';
import WelcomeModal from './WelcomeModal';
import './MapView.css';

const ISRAEL_CENTER = { lat: 32.0553, lng: 34.7818 };
const API_KEY   = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const MOBILE_BP = 768;

const ICON = {
  business: '/icons/coffee-cup.png',
  shelter:  '/icons/shelter-door.png',
};

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
  isMobile, onMapTypeChange, onSubmit,
}) {
  const map = useMap();
  const pushed      = useRef(false);
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;

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

  const mapRef         = useRef(null);
  const sheetHeightRef = useRef(0);
  const allMarkers     = [...businesses, ...shelters];

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

      <APIProvider apiKey={API_KEY}>
        <Map
          defaultCenter={ISRAEL_CENTER}
          defaultZoom={13}
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
          />
          {userLocation && <UserLocationMarker location={userLocation} />}
          {allMarkers.map((loc) => (
            <Marker
              key={loc.id}
              loc={loc}
              isActive={selected?.id === loc.id}
              onClick={(e) => { e.stop(); handleSelectLocation(loc); }}
            />
          ))}
        </Map>
      </APIProvider>

      {locationMsg && <div className="location-msg">{locationMsg}</div>}

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

      {submitOpen  && <SubmitModal  onClose={() => setSubmitOpen(false)} />}
      {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
    </div>
  );
}
