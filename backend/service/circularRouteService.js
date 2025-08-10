const https = require('https');
const API_KEY = process.env.MAP_API_KEY;

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
    waypoints.push(`${lat},${lng}`);
  }
  
  return waypoints;
}

// Get circular route using Google Directions API
async function getCircularDirections(origin, waypoints, options) {
  const waypointStr = waypoints.join('|');
  const mode = options.type === 'fitness' ? 'bicycling' : 'driving'; // Use bicycling for fitness routes
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${origin}&waypoints=${waypointStr}&mode=${mode}&key=${API_KEY}`;
  
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log('Google Directions Response:', JSON.stringify(json, null, 2));
          
          if (json.routes && json.routes[0] && json.routes[0].legs) {
            const steps = [];
            json.routes[0].legs.forEach(leg => {
              if (leg.steps) {
                steps.push(...leg.steps);
              }
            });
            
            // Format steps to match expected structure
            const formattedSteps = steps.map(step => ({
              instruction: step.html_instructions || 'Continue',
              distance: step.distance ? step.distance.text : '0 km',
              duration: step.duration ? step.duration.text : '0 mins',
              start_location: step.start_location || { lat: 0, lng: 0 },
              end_location: step.end_location || { lat: 0, lng: 0 },
              aqi: Math.floor(Math.random() * 100) + 20 // Mock AQI for now
            }));
            
            console.log('Formatted steps:', formattedSteps.length);
            resolve(formattedSteps);
          } else {
            console.log('No routes found in response');
            resolve([]);
          }
        } catch (e) {
          console.error('Error parsing directions response:', e);
          resolve([]);
        }
      });
    }).on('error', (err) => {
      console.error('Error making directions request:', err);
      resolve([]);
    });
  });
}

module.exports = {
  generateCircularWaypoints,
  getCircularDirections
};
