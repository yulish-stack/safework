// Fallback data — used when Supabase is unavailable.
// Primary data source is now Supabase (see src/lib/api.js).

export const businesses = [
  {
    id: 'b1',
    type: 'business',
    name: 'P.O.C Cafe',
    lat: 32.0573445,
    lng: 34.7703167,
    address: 'Florentin, Tel Aviv',
    category: 'café',
    hours: [
      { days: 'Sun–Thu', time: '08:00–22:00' },
      { days: 'Fri',     time: '08:00–16:00' },
      { days: 'Sat',     time: '10:00–22:00' },
    ],
    wifi: { available: true, quality: 'good' },
    outlets: true,
  },
  {
    id: 'b2',
    type: 'business',
    name: 'Easy Cafe Florentine',
    lat: 32.0561962,
    lng: 34.7710167,
    address: 'Florentin, Tel Aviv',
    category: 'café',
    hours: [
      { days: 'Sun–Thu', time: '07:30–21:00' },
      { days: 'Fri',     time: '07:30–14:00' },
      { days: 'Sat',     time: '09:00–21:00' },
    ],
    wifi: { available: true, quality: 'ok' },
    outlets: false,
  },
  {
    id: 'b3',
    type: 'business',
    name: 'Cafe Xoho',
    lat: 32.0809187,
    lng: 34.7702554,
    address: 'Tel Aviv',
    category: 'café',
    hours: [
      { days: 'Sun–Thu', time: '08:00–23:00' },
      { days: 'Fri',     time: '08:00–15:00' },
      { days: 'Sat',     time: '10:00–23:00' },
    ],
    wifi: { available: true, quality: 'good' },
    outlets: true,
  },
];

export const shelters = [
  {
    id: 's1',
    type: 'shelter',
    name: 'Shelter – Dizengoff Center',
    lat: 32.0793,
    lng: 34.7742,
    address: 'Dizengoff Center, Tel Aviv',
    accessible: true,
    designation: 'public',
  },
  {
    id: 's2',
    type: 'shelter',
    name: 'Shelter – Azrieli Mall',
    lat: 32.0698,
    lng: 34.7812,
    address: 'Azrieli Center, Tel Aviv',
    accessible: true,
    designation: 'public',
  },
  {
    id: 's3',
    type: 'shelter',
    name: 'Shelter – HaShalom Station',
    lat: 32.0668,
    lng: 34.7922,
    address: 'HaShalom Train Station, Tel Aviv',
    accessible: false,
    designation: 'public',
  },
];

export const allLocations = [...businesses, ...shelters];
