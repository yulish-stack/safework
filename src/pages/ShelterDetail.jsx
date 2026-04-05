import { Link } from 'react-router-dom';
import { RatingsSection, CommentsSection } from '../components/SocialSection';
import './DetailPage.css';

const SHELTER_CATEGORIES = [
  { label: 'Crowdedness',  key: 'crowdedness' },
  { label: 'Cleanliness',  key: 'cleanliness' },
  { label: 'Dog Friendly', key: 'dog_friendly' },
  { label: 'Comfort',      key: 'comfort' },
];

/** onClose — provided when rendered inside the Sidebar (hides back link) */
export default function ShelterDetail({ location, onClose }) {
  return (
    <div className="detail-page">
      {!onClose && <Link to="/" className="detail-back">← Back to map</Link>}

      <header className="detail-header">
        <h1 className="detail-name">{location.name}</h1>
        <span className="detail-badge detail-badge--shelter">Shelter</span>
      </header>

      <p className="detail-address">📍 {location.address}</p>

      {/* Get Directions */}
      <ul className="links-list links-list--inline">
        <li className="links-row">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${location.address ? encodeURIComponent(location.address) : `${location.lat},${location.lng}`}`}
            target="_blank"
            rel="noreferrer"
            className="links-anchor"
            aria-label="Get directions"
          >
            <svg className="links-icon links-icon--pin" viewBox="0 0 24 24" fill="#EA4335" aria-hidden="true">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            Directions
          </a>
        </li>
      </ul>

      {location.source === 'city' && (
        <p className="shelter-source shelter-source--city">✓ Official city data</p>
      )}
      {location.source === 'community' && (
        <p className="shelter-source shelter-source--community">👤 Unverified — added by a user</p>
      )}

      {/* Info */}
      <section className="detail-section">
        <h2 className="detail-section__title">Details</h2>
        <ul className="amenity-list">
          <li className="amenity-row">
            <span className="amenity-row__icon">♿</span>
            <span className="amenity-row__label">Wheelchair accessible</span>
            <span className={`amenity-row__value ${location.accessible ? 'amenity-row__value--yes' : 'amenity-row__value--no'}`}>
              {location.accessible ? 'Yes' : 'No'}
            </span>
          </li>
          <li className="amenity-row">
            <span className="amenity-row__icon">🏛️</span>
            <span className="amenity-row__label">Designation</span>
            <span className="amenity-row__value">
              {location.designation === 'public' ? 'Public' : 'Private'}
            </span>
          </li>
        </ul>
      </section>

      <RatingsSection locationId={location.id} entityType="shelter" categories={SHELTER_CATEGORIES} />
      <CommentsSection locationId={location.id} entityType="shelter" />
    </div>
  );
}
