const axios = require('axios');
const API_KEY = process.env.OPEN_ROUTE_API_KEY;

// Test if coordinates are routable within a reasonable radius
module.exports.testRoutablePoint = async (lat, lng) => {
  try {
    // Use OpenRoute's isochrones API to test if a point is routable
    const requestBody = {
      locations: [[lng, lat]], // [lng, lat] format
      profile: 'cycling-regular',
      range: [300], // 5 minute range (300 seconds)
      range_type: 'time',
      units: 'km'
    };

    const response = await axios.post(
      'https://api.openrouteservice.org/v2/isochrones/cycling-regular',
      requestBody,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': API_KEY
        }
      }
    );

    if (response.data && response.data.features && response.data.features.length > 0) {
      return {
        routable: true,
        message: 'Point is routable for cycling',
        coverage: response.data.features[0].properties
      };
    } else {
      return {
        routable: false,
        message: 'Point may not be accessible for cycling routes'
      };
    }
  } catch (error) {
    console.error('Routable point test error:', error.message);
    
    if (error.response && error.response.data && error.response.data.error) {
      const errorData = error.response.data.error;
      
      if (errorData.code === 2010) {
        return {
          routable: false,
          message: 'Point is too far from any roads. Try selecting a point closer to streets.',
          error_code: 2010,
          suggestion: 'Move your point closer to a road or intersection'
        };
      }
    }
    
    return {
      routable: false,
      message: 'Unable to test point routability',
      error: error.message
    };
  }
};

// Get nearby routable points
module.exports.getNearbyRoutablePoints = async (lat, lng, radiusKm = 1) => {
  try {
    // Use OpenRoute's geocoding to find nearby roads/addresses
    const response = await axios.get(
      `https://api.openrouteservice.org/geocode/search`,
      {
        params: {
          api_key: API_KEY.replace('Bearer ', ''), // Remove Bearer prefix if present
          text: 'road',
          'boundary.circle.lat': lat,
          'boundary.circle.lon': lng,
          'boundary.circle.radius': radiusKm,
          layers: 'street,address',
          size: 5
        }
      }
    );

    if (response.data && response.data.features) {
      return response.data.features.map(feature => ({
        label: feature.properties.label || feature.properties.name || 'Nearby road',
        coordinates: {
          lat: feature.geometry.coordinates[1],
          lng: feature.geometry.coordinates[0]
        },
        distance: feature.properties.distance || null,
        confidence: feature.properties.confidence || null
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Nearby points search error:', error.message);
    return [];
  }
};
