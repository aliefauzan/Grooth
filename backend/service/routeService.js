const mapsService = require('./mapsService');
const airQualityService = require('./airQualityService');
const scoreRoute = require('../utils/scoreRoute');

exports.getRecommendedRoute = async (from, to) => {
  // 1. Get bike route from maps API
  const route = await mapsService.getBikeRoute(from, to);
  // 2. Get AQI data for waypoints
  const pollutionData = await airQualityService.getAQIForRoute(route);
  // 3. Score the route
  const pollutionScore = scoreRoute(pollutionData);
  // 4. Return response
  return {
    route,
    pollutionScore,
    recommended: pollutionScore === 'Good' || pollutionScore === 'Moderate',
  };
};
