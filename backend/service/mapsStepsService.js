const axios = require('axios');
const API_KEY = process.env.OPEN_ROUTE_API_KEY;

// Decode polyline string to coordinates
function decodePolyline(encoded) {
  const coordinates = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  
  while (index < encoded.length) {
    let byte = null;
    let shift = 0;
    let result = 0;
    
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    
    const deltaLat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lat += deltaLat;
    
    shift = 0;
    result = 0;
    
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    
    const deltaLng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lng += deltaLng;
    
    coordinates.push([lng / 1e5, lat / 1e5]);
  }
  
  return coordinates;
}

// Fallback function to try with driving profile when cycling fails
async function tryWithDrivingProfile(from, to) {
  try {
    console.log('Attempting fallback with driving profile...');
    const [fromLat, fromLng] = from.split(',').map(Number);
    const [toLat, toLng] = to.split(',').map(Number);
    
    const requestBody = {
      coordinates: [[fromLng, fromLat], [toLng, toLat]],
      profile: 'driving-car', // Use driving profile as fallback
      format: 'json',
      instructions: true,
      geometry: true,
      units: 'km',
      radiuses: [2000, 2000], // Even larger radius for fallback
      continue_straight: false
    };

    const response = await axios.post(
      `https://api.openrouteservice.org/v2/directions/driving-car`,
      requestBody,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': API_KEY
        }
      }
    );

    if (response.data && response.data.routes && response.data.routes[0] && response.data.routes[0].segments) {
      const segments = response.data.routes[0].segments;
      const steps = [];
      
      // Decode the geometry string to get coordinates
      const coordinates = response.data.routes[0].geometry ? 
        decodePolyline(response.data.routes[0].geometry) : 
        [[fromLng, fromLat], [toLng, toLat]];
      
      segments.forEach(segment => {
        if (segment.steps) {
          segment.steps.forEach(step => {
            // Get start and end coordinates for this step
            const startIdx = step.way_points ? step.way_points[0] : 0;
            const endIdx = step.way_points ? step.way_points[1] : coordinates.length - 1;
            
            const startCoord = coordinates[startIdx] || [fromLng, fromLat];
            const endCoord = coordinates[endIdx] || [toLng, toLat];
            
            // Convert OpenRoute step format to our expected format
            const stepData = {
              instruction: `(Driving route) ${step.instruction || 'Continue'}`, // Mark as driving route
              distance: step.distance >= 1 ? `${step.distance.toFixed(2)} km` : `${(step.distance * 1000).toFixed(0)} m`,
              duration: `${Math.round(step.duration / 60)} min`,
              start_location: {
                lat: startCoord[1],
                lng: startCoord[0]
              },
              end_location: {
                lat: endCoord[1],
                lng: endCoord[0]
              }
            };
            steps.push(stepData);
          });
        }
      });
      
      console.log(`Fallback successful: ${steps.length} steps found with driving profile`);
      return steps;
    } else {
      console.log('No routes found even with driving profile fallback');
      return [];
    }
  } catch (fallbackError) {
    console.error('Fallback with driving profile also failed:', fallbackError.message);
    return [];
  }
}

// Returns steps with polyline and instructions using OpenRoute Service Directions API (cycling profile)
module.exports.getBikeRouteSteps = async (from, to, profile = 'cycling-regular') => {
  try {
    const [fromLat, fromLng] = from.split(',').map(Number);
    const [toLat, toLng] = to.split(',').map(Number);
    
    // Configure different routing options based on profile
    let requestBody = {
      coordinates: [[fromLng, fromLat], [toLng, toLat]], // Note: OpenRoute uses [lng, lat] format
      profile: profile, // Use the specified profile
      format: 'json',
      instructions: true,
      geometry: true,
      units: 'km',
      radiuses: [1000, 1000], // Increase search radius to 1km for both start and end points
      continue_straight: false // Allow U-turns if needed
    };

    // Add profile-specific options for route variety
    if (profile === 'cycling-regular') {
      // Best route: avoid highways for cleaner air
      requestBody.options = {
        avoid_features: ['highways']
      };
    } else if (profile === 'cycling-road') {
      // Alternative route: allow more road types
      requestBody.options = {
        avoid_features: ['steps']
      };
    } else if (profile === 'driving-car') {
      // Worst route: use all road types (typically more polluted)
      requestBody.options = {
        avoid_features: []
      };
    }

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

    if (response.data && response.data.routes && response.data.routes[0] && response.data.routes[0].segments) {
      const segments = response.data.routes[0].segments;
      const geometry = response.data.routes[0].geometry;
      const steps = [];
      
      // Decode the geometry string to get coordinates
      const coordinates = response.data.routes[0].geometry ? 
        decodePolyline(response.data.routes[0].geometry) : 
        [[fromLng, fromLat], [toLng, toLat]];
      
      segments.forEach(segment => {
        if (segment.steps) {
          segment.steps.forEach(step => {
            // Get start and end coordinates for this step
            const startIdx = step.way_points ? step.way_points[0] : 0;
            const endIdx = step.way_points ? step.way_points[1] : coordinates.length - 1;
            
            const startCoord = coordinates[startIdx] || [fromLng, fromLat];
            const endCoord = coordinates[endIdx] || [toLng, toLat];
            
            // Convert OpenRoute step format to our expected format
            const stepData = {
              instruction: `${profile === 'driving-car' ? '[Driving] ' : profile === 'cycling-road' ? '[Road] ' : ''}${step.instruction || 'Continue'}`,
              distance: step.distance >= 1 ? `${step.distance.toFixed(2)} km` : `${(step.distance * 1000).toFixed(0)} m`,
              duration: `${Math.round(step.duration / 60)} min`,
              start_location: {
                lat: startCoord[1], // Note: coordinates are [lng, lat]
                lng: startCoord[0]
              },
              end_location: {
                lat: endCoord[1],
                lng: endCoord[0]
              }
            };
            steps.push(stepData);
          });
        }
      });
      
      console.log(`Route found using ${profile}: ${steps.length} steps`);
      return steps;
    } else {
      console.log(`No routes found in OpenRoute response for profile ${profile}:`, response.data);
      return [];
    }
  } catch (error) {
    console.error(`OpenRoute Directions error for profile ${profile}:`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      // Handle specific error codes
      if (error.response.data && error.response.data.error) {
        const errorData = error.response.data.error;
        
        // Handle radius/routable point errors
        if (errorData.code === 2010) {
          console.error('Location not routable:', errorData.message);
          // Try with driving profile as fallback only if not already using it
          if (profile !== 'driving-car') {
            return await tryWithDrivingProfile(from, to);
          }
        }
        
        // Handle other specific errors
        if (errorData.code === 2004) {
          console.error('No route found between points');
        }
      }
    }
    return [];
  }
};
