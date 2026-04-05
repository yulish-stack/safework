import { useState, useEffect } from 'react';
import { fetchBusinesses, fetchShelters } from '../lib/api';

export function useLocations() {
  const [businesses, setBusinesses] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchBusinesses(), fetchShelters()])
      .then(([b, s]) => {
        setBusinesses(b);
        setShelters(s);
      })
      .finally(() => setLoading(false));
  }, []);

  return { businesses, shelters, loading };
}
