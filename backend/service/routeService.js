
const mapsService = require('./mapsService');
const mapsStepsService = require('./mapsStepsService');
const airQualityService = require('./airQualityService');
const geocodeService = require('./geocodeService');
const scoreRoute = require('../utils/scoreRoute');

exports.getRecommendedRoute = async (from, to) => {
  // 1. Get detailed steps from Google Directions API
  const steps = await mapsStepsService.getBikeRouteSteps(from, to);
  if (!steps || steps.length === 0) {
    return {
      error: 'No route steps found from Google Directions API.',
      debug: {
        from,
        to,
        stepsRaw: steps
      }
    };
  }
  // 2. Get AQI for each step start point
  const route = steps.map(s => ({ lat: s.start_location.lat, lng: s.start_location.lng }));
  const pollutionData = await airQualityService.getAQIForRoute(route);
  // 3. Get street names for start and end
  const [start, end] = [route[0], route[route.length - 1]];
  const [startStreet, endStreet] = await Promise.all([
    geocodeService.getStreetName(start.lat, start.lng),
    geocodeService.getStreetName(end.lat, end.lng)
  ]);
  // 4. Score the route
  const pollutionScore = scoreRoute(pollutionData);

  // 5. Provide alternatives: fastest, cleanest, shortest (for MVP, just one route, but structure for more)
  // For demonstration, simulate 3 alternatives by shuffling AQI values
  const altPollution = [
    pollutionData,
    [...pollutionData].sort((a, b) => b.aqi - a.aqi), // worst
    [...pollutionData].sort((a, b) => a.aqi - b.aqi)  // best
  ];
  const altLabels = ['alternative', 'worst', 'best'];
  const alternatives = altPollution.map((pdata, idx) => {
    const avgAQI = pdata.reduce((sum, p) => sum + p.aqi, 0) / pdata.length;
    return {
      type: altLabels[idx],
      from: startStreet,
      to: endStreet,
      steps: steps.map((s, i) => ({
        instruction: s.html_instructions,
        distance: s.distance.text,
        duration: s.duration.text,
        start_location: s.start_location,
        end_location: s.end_location,
        aqi: pdata[i] ? pdata[i].aqi : null
      })),
      pollutionScore: scoreRoute(pdata),
      avgAQI,
      recommended: scoreRoute(pdata) === 'Good' || scoreRoute(pdata) === 'Moderate',
    };
  });

  // Sort alternatives: best (lowest avgAQI), alternative (middle), worst (highest avgAQI)
  const sorted = [...alternatives].sort((a, b) => a.avgAQI - b.avgAQI);
  return {
    best: sorted[0],
    alternative: sorted[1],
    worst: sorted[2],
    alternatives: sorted,
  };
};
