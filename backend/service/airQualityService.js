const https = require('https');
const API_KEY = process.env.MAP_API_KEY;

function fetchAQI(lat, lng) {
  // Google Maps Air Quality API endpoint
  const url = `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${API_KEY}`;
  const postData = JSON.stringify({
    location: { latitude: lat, longitude: lng }
  });
  return new Promise((resolve) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          // Google returns AQI in json.indexes[0].aqi (US EPA scale 0-500)
          const aqi = json.indexes && json.indexes[0] && typeof json.indexes[0].aqi === 'number' ? json.indexes[0].aqi : 80;
          resolve(aqi);
        } catch (e) {
          resolve(80); // fallback
        }
      });
    });
    req.on('error', () => resolve(80));
    req.write(postData);
    req.end();
  });
}

module.exports.getAQIForRoute = async (route) => {
  const results = await Promise.all(route.map(async (point) => {
    const aqi = await fetchAQI(point.lat, point.lng);
    return { ...point, aqi };
  }));
  return results;
};
