import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchLocationById, fetchShelters } from '../lib/api';
import { shelters as fallbackShelters } from '../data/locations';
import BusinessDetail from './BusinessDetail';
import ShelterDetail from './ShelterDetail';
import './DetailPage.css';

export default function LocationDetail() {
  const { id } = useParams();
  const [location, setLocation] = useState(null);
  const [shelters, setShelters] = useState(fallbackShelters);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchLocationById(id), fetchShelters()])
      .then(([loc, sh]) => {
        setLocation(loc);
        if (sh?.length) setShelters(sh);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="detail-page">
        <Link to="/" className="detail-back">← Back to map</Link>
        <p style={{ color: '#999', marginTop: '2rem' }}>Loading…</p>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="detail-page">
        <Link to="/" className="detail-back">← Back to map</Link>
        <p style={{ color: '#666', marginTop: '2rem' }}>Location not found.</p>
      </div>
    );
  }

  if (location.type === 'business') return <BusinessDetail location={location} shelters={shelters} />;
  return <ShelterDetail location={location} />;
}
