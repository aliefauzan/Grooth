// Reverse geocode using Google Maps Geocoding API
const https = require('https');
const API_KEY = process.env.MAP_API_KEY;

module.exports.getStreetName = (lat, lng) => {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}`;
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.results && json.results[0]) {
            // Try to get street name from address components
            const address = json.results[0].address_components;
            const street = address.find(c => c.types.includes('route'));
            resolve(street ? street.long_name : json.results[0].formatted_address);
          } else {
            resolve(`${lat},${lng}`);
          }
        } catch (e) {
          resolve(`${lat},${lng}`);
        }
      });
    }).on('error', () => resolve(`${lat},${lng}`));
  });
};
