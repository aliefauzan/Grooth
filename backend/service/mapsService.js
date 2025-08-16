const axios = require('axios');
const API_KEY = process.env.OPEN_ROUTE_API_KEY;

// Get bike route using OpenRoute Service
module.exports.getBikeRoute = async (from, to) => {
  try {
    // Parse coordinates
    const [fromLat, fromLng] = from.split(',').map(Number);
    const [toLat, toLng] = to.split(',').map(Number);
    
    const requestBody = {
      coordinates: [[fromLng, fromLat], [toLng, toLat]], // OpenRoute uses [lng, lat] format
      profile: 'cycling-regular',
      format: 'json',
      geometry: true
    };

    const response = await axios.post(
      'https://api.openrouteservice.org/v2/directions/cycling-regular',
      requestBody,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': API_KEY
        }
      }
    );

    if (response.data && response.data.routes && response.data.routes[0] && response.data.routes[0].geometry) {
      const coordinates = response.data.routes[0].geometry.coordinates;
      // Convert [lng, lat] back to [lat, lng] for consistency
      return coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }));
    } else {
      // Return a simple mock route if API fails
      return [
        { lat: fromLat, lng: fromLng },
        { lat: (fromLat + toLat) / 2, lng: (fromLng + toLng) / 2 },
        { lat: toLat, lng: toLng },
      ];
    }
  } catch (error) {
    console.error('OpenRoute Service error:', error.message);
    // Return a simple mock route if API fails
    const [fromLat, fromLng] = from.split(',').map(Number);
    const [toLat, toLng] = to.split(',').map(Number);
    return [
      { lat: fromLat, lng: fromLng },
      { lat: (fromLat + toLat) / 2, lng: (fromLng + toLng) / 2 },
      { lat: toLat, lng: toLng },
    ];
  }
};
