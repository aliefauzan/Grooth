const https = require('https');
const API_KEY = process.env.MAP_API_KEY;

// Returns steps with polyline and instructions using Google Directions API (driving mode for motorcycle)
module.exports.getBikeRouteSteps = (from, to) => {
  const [fromLat, fromLng] = from.split(',').map(Number);
  const [toLat, toLng] = to.split(',').map(Number);
  // Google Directions API does not have a 'motorcycle' mode, so we use 'driving' as the closest approximation
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&mode=driving&key=${API_KEY}`;
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.routes && json.routes[0] && json.routes[0].legs && json.routes[0].legs[0].steps) {
            resolve(json.routes[0].legs[0].steps);
          } else {
            resolve([]);
          }
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
};
