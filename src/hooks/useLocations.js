import { useState, useEffect } from 'react';
import { fetchBusinesses, fetchShelters } from '../lib/api';
import { businesses as fallbackBusinesses, shelters as fallbackShelters } from '../data/locations';

export function useLocations() {
  const [businesses, setBusinesses] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchBusinesses(), fetchShelters()])
      .then(([b, s]) => {
        setBusinesses(b.length ? b : fallbackBusinesses);
        setShelters(s.length ? s : fallbackShelters);
      })
      .catch(() => {
        setBusinesses(fallbackBusinesses);
        setShelters(fallbackShelters);
      })
      .finally(() => setLoading(false));
  }, []);

  return { businesses, shelters, loading };
}
