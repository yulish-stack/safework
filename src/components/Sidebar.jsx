import { useEffect } from 'react';
import BusinessDetail from '../pages/BusinessDetail';
import ShelterDetail from '../pages/ShelterDetail';
import './Sidebar.css';

export default function Sidebar({ location, shelters, onClose, onSelectLocation }) {
  // Prevent background scroll on mobile while sidebar is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <>
      {/* Mobile backdrop */}
      <div className="sidebar-backdrop" onClick={onClose} />

      <aside className="sidebar" role="complementary" aria-label="Location details">
        <button className="sidebar-close" onClick={onClose} aria-label="Close sidebar">
          ✕
        </button>

        <div className="sidebar-scroll">
          {location.type === 'business' ? (
            <BusinessDetail
              location={location}
              shelters={shelters}
              onClose={onClose}
              onSelectLocation={onSelectLocation}
            />
          ) : (
            <ShelterDetail location={location} onClose={onClose} />
          )}
        </div>
      </aside>
    </>
  );
}
