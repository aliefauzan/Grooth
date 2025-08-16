const axios = require('axios');
const API_KEY = process.env.OPEN_ROUTE_API_KEY;

// Generate waypoints for circular routes
function generateCircularWaypoints(centerLat, centerLng, options) {
  const { type, duration, distance } = options;
  const waypoints = [];
  
  // Base radius calculation
  let radius = 0.01; // Default ~1km
  
  if (distance) {
    // Distance-based: calculate radius from desired total distance
    const distanceKm = parseInt(distance.replace('km', ''));
    radius = distanceKm / (2 * Math.PI); // Approximate radius for circular route
  } else if (duration) {
    // Duration-based: estimate distance from time (assume 15km/h average speed)
    const durationMin = parseInt(duration);
    const estimatedKm = (durationMin / 60) * 15; // 15km/h
    radius = estimatedKm / (2 * Math.PI);
  }
  
  // Generate waypoints in a circular pattern
  const numWaypoints = type === 'scenic' ? 8 : 6; // More waypoints for scenic routes
  
  for (let i = 0; i < numWaypoints; i++) {
    const angle = (2 * Math.PI * i) / numWaypoints;
    const lat = centerLat + radius * Math.cos(angle);
    const lng = centerLng + radius * Math.sin(angle);
    waypoints.push([lng, lat]); // OpenRoute uses [lng, lat] format
  }
  
  return waypoints;
}

// Get circular route using OpenRoute Service Directions API
async function getCircularDirections(origin, waypoints, options) {
  try {
    const [originLat, originLng] = origin.split(',').map(Number);
    
    // Create coordinates array: origin -> waypoints -> origin
    const coordinates = [[originLng, originLat], ...waypoints, [originLng, originLat]];
    
    const profile = options.type === 'fitness' ? 'cycling-mountain' : 'cycling-regular';
    
    const requestBody = {
      coordinates: coordinates,
      profile: profile,
      format: 'json',
      instructions: true,
      geometry: true,
      units: 'km'
    };

    const response = await axios.post(
      `https://api.openrouteservice.org/v2/directions/${profile}`,
      requestBody,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': API_KEY
        }
      }
    );

    console.log('OpenRoute Directions Response status:', response.status);
    
    if (response.data && response.data.routes && response.data.routes[0] && response.data.routes[0].segments) {
      const segments = response.data.routes[0].segments;
      const steps = [];
      
      segments.forEach(segment => {
        if (segment.steps) {
          segment.steps.forEach(step => {
            // Format steps to match expected structure
            const stepData = {
              instruction: step.instruction || 'Continue',
              distance: `${(step.distance / 1000).toFixed(2)} km`,
              duration: `${Math.round(step.duration / 60)} min`,
              start_location: {
                lat: step.way_points[0] ? response.data.routes[0].geometry.coordinates[step.way_points[0]][1] : originLat,
                lng: step.way_points[0] ? response.data.routes[0].geometry.coordinates[step.way_points[0]][0] : originLng
              },
              end_location: {
                lat: step.way_points[1] ? response.data.routes[0].geometry.coordinates[step.way_points[1]][1] : originLat,
                lng: step.way_points[1] ? response.data.routes[0].geometry.coordinates[step.way_points[1]][0] : originLng
              },
              aqi: Math.floor(Math.random() * 100) + 20 // Mock AQI for now, will be replaced by WAQI data
            };
            steps.push(stepData);
          });
        }
      });
      
      console.log('Formatted steps:', steps.length);
      return steps;
    } else {
      console.log('No routes found in OpenRoute response');
      return [];
    }
  } catch (error) {
    console.error('Error making OpenRoute directions request:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return [];
  }
}

module.exports = {
  generateCircularWaypoints,
  getCircularDirections
};
