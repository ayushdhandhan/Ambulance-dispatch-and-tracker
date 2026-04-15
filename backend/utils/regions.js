const getRegionFromCoordinates = (lat, lng) => {
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return 'Unknown';
  }

  if (latitude < 18.98) {
    return 'South Mumbai';
  }

  if (longitude >= 72.88) {
    return 'Navi Mumbai';
  }

  if (latitude <= 19.06) {
    return 'Central Mumbai';
  }

  return 'Western Suburbs';
};

const attachRegion = (row, latKey = 'lat', lngKey = 'lng') => ({
  ...row,
  region: getRegionFromCoordinates(row[latKey], row[lngKey]),
});

module.exports = {
  attachRegion,
  getRegionFromCoordinates,
};
