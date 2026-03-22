import { useState } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
} from '@vis.gl/react-google-maps';
import { useLocations } from '../hooks/useLocations';
import Sidebar from './Sidebar';
import SubmitModal from './SubmitModal';
import './MapView.css';

const ISRAEL_CENTER = { lat: 32.0553, lng: 34.7818 };
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

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

export default function MapView() {
  const { businesses, shelters, loading } = useLocations();
  const [selected, setSelected]   = useState(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const allMarkers = [...businesses, ...shelters];

  return (
    <div className="map-container">
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
          {allMarkers.map((loc) => (
            <Marker
              key={loc.id}
              loc={loc}
              isActive={selected?.id === loc.id}
              onClick={(e) => { e.stop(); setSelected(loc); }}
            />
          ))}
        </Map>
      </APIProvider>

      <button className="map-submit-btn" onClick={() => setSubmitOpen(true)}>
        + Submit a location
      </button>

      {selected && (
        <Sidebar
          location={selected}
          shelters={shelters}
          onClose={() => setSelected(null)}
          onSelectLocation={(loc) => setSelected(loc)}
        />
      )}

      {submitOpen && <SubmitModal onClose={() => setSubmitOpen(false)} />}
    </div>
  );
}
