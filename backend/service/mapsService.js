// Dummy implementation for MVP
module.exports.getBikeRoute = async (from, to) => {
  // Parse coordinates
  const [fromLat, fromLng] = from.split(',').map(Number);
  const [toLat, toLng] = to.split(',').map(Number);
  // Return a mocked route (list of coordinates)
  return [
    { lat: fromLat, lng: fromLng },
    { lat: (fromLat + toLat) / 2, lng: (fromLng + toLng) / 2 },
    { lat: toLat, lng: toLng },
  ];
};
