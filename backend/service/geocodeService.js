// Reverse geocode using OpenRoute Service Geocoding API
const axios = require('axios');
const API_KEY = process.env.OPEN_ROUTE_API_KEY;

module.exports.getStreetName = async (lat, lng) => {
  try {
    const url = `https://api.openrouteservice.org/geocode/reverse?api_key=${API_KEY}&point.lon=${lng}&point.lat=${lat}&size=1`;
    
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.data && response.data.features && response.data.features[0]) {
      const feature = response.data.features[0];
      const properties = feature.properties;
      
      // Try to get street name from properties
      const streetName = properties.street || properties.name || properties.label;
      return streetName || `${lat},${lng}`;
    } else {
      return `${lat},${lng}`;
    }
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return `${lat},${lng}`;
  }
};
