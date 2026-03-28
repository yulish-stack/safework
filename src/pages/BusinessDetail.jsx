import { Link } from 'react-router-dom';
import { shelters as fallbackShelters } from '../data/locations';
import { nearestShelter, proximityLabel } from '../lib/distance';
import { RatingsSection, CommentsSection } from '../components/SocialSection';
import './DetailPage.css';

const BUSINESS_CATEGORIES = [
  { label: 'WiFi Quality',   key: 'wifi_quality' },
  { label: 'Vibe',           key: 'vibe' },
  { label: 'Power Outlets',  key: 'power_outlets' },
  { label: 'Coffee Quality', key: 'coffee_quality' },
];

/**
 * onClose          — provided when rendered inside the Sidebar (hides back link)
 * onSelectLocation — provided by Sidebar to navigate to a shelter without leaving the map
 */
export default function BusinessDetail({ location, shelters, onClose, onSelectLocation, userLocation }) {
  const shelterList = shelters?.length ? shelters : fallbackShelters;
  // If user's GPS is available, find the shelter nearest to the user; otherwise nearest to the business
  const origin = userLocation ?? location;
  const { shelter, metres } = nearestShelter(origin, shelterList);
  const proximity = proximityLabel(metres);

  return (
    <div className="detail-page">
      {!onClose && <Link to="/" className="detail-back">← Back to map</Link>}

      {/* 1. Name + 2. Type badge */}
      <header className="detail-header">
        <h1 className="detail-name">{location.name}</h1>
        <span className="detail-badge detail-badge--business">{location.category}</span>
      </header>

      {/* 3. Address */}
      <p className="detail-address">📍 {location.address}</p>

      {/* 4. Opening Hours */}
      <section className="detail-section">
        <h2 className="detail-section__title">Opening Hours</h2>
        <ul className="hours-list">
          {(location.hours ?? []).map((h, i) => (
            <li key={i} className="hours-row">
              <span className="hours-row__days">{h.days}</span>
              {h.time && <span className="hours-row__time">{h.time}</span>}
            </li>
          ))}
        </ul>
        <p className="hours-disclaimer">* Hours may vary in light of current circumstances</p>
      </section>

      {/* 5. Nearest Shelter */}
      <section className="detail-section">
        <h2 className="detail-section__title">
          {userLocation ? 'Nearest Shelter (from you)' : 'Nearest Shelter'}
        </h2>
        {shelter ? (
          <div className={`shelter-card ${proximity.className}`}>
            <span className="shelter-card__emoji">{proximity.emoji}</span>
            <div className="shelter-card__info">
              <p className="shelter-card__name">{shelter.name}</p>
              <p className="shelter-card__dist">{metres.toLocaleString()} m away · {proximity.label}</p>
            </div>
            {onSelectLocation
              ? (
                <button className="shelter-card__link shelter-card__btn" onClick={() => onSelectLocation(shelter)}>
                  View →
                </button>
              )
              : (
                <Link to={`/location/${shelter.id}`} className="shelter-card__link">
                  View →
                </Link>
              )
            }
          </div>
        ) : (
          <p style={{ color: '#999', fontSize: '0.875rem' }}>No shelter data available.</p>
        )}
      </section>

      {/* 6. Amenities */}
      <section className="detail-section">
        <h2 className="detail-section__title">Amenities</h2>
        <ul className="amenity-list">
          <li className="amenity-row">
            <span className="amenity-row__icon">📶</span>
            <span className="amenity-row__label">WiFi</span>
            <span className="amenity-row__no">
              {location.wifi?.available ? 'Available' : 'Not available'}
            </span>
          </li>
          <li className="amenity-row">
            <span className="amenity-row__icon">🔌</span>
            <span className="amenity-row__label">Power outlets</span>
            {location.outlets
              ? <span className="amenity-row__value amenity-row__value--yes">Available</span>
              : <span className="amenity-row__no">Not available</span>
            }
          </li>
        </ul>
      </section>

      {/* 7. Instagram */}
      {location.instagram && (
        <ul className="links-list">
          <li className="links-row">
            <svg className="links-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </svg>
            <a
              href={`https://instagram.com/${location.instagram.replace(/^@/, '')}`}
              target="_blank"
              rel="noreferrer"
              className="links-anchor"
            >
              @{location.instagram.replace(/^@/, '')}
            </a>
          </li>
        </ul>
      )}

      {/* 8. Website */}
      {location.website && (
        <ul className="links-list">
          <li className="links-row">
            <svg className="links-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <a href={location.website} target="_blank" rel="noreferrer" className="links-anchor">
              {location.website.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
          </li>
        </ul>
      )}

      {/* 9. Ratings + 10. Comments */}
      <RatingsSection locationId={location.id} entityType="business" categories={BUSINESS_CATEGORIES} />
      <CommentsSection locationId={location.id} entityType="business" />
    </div>
  );
}
