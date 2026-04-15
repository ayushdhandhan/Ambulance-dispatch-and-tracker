export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export const REGIONS = [
  'All Regions',
  'South Mumbai',
  'Central Mumbai',
  'Western Suburbs',
  'Navi Mumbai',
];

export const formatDateTime = (value) => {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleString();
};

export const getMapsLink = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;
