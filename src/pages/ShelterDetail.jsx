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
