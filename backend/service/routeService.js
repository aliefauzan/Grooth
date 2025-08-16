
const mapsService = require('./mapsService');
const mapsStepsService = require('./mapsStepsService');
const airQualityService = require('./airQualityService');
const geocodeService = require('./geocodeService');
const circularRouteService = require('./circularRouteService');
const scoreRoute = require('../utils/scoreRoute');

exports.getCircularRoute = async (origin, options) => {
  const [lat, lng] = origin.split(',').map(Number);
  
  // Generate different types of circular routes
  const routeTypes = [
    { type: 'duration', label: 'Duration-based', ...options },
    { type: 'scenic', label: 'Scenic Route', ...options },
    { type: 'fitness', label: 'Fitness Route', ...options }
  ];
  
  const alternatives = await Promise.all(routeTypes.map(async (routeType) => {
    // Generate waypoints for this route type
    const waypoints = circularRouteService.generateCircularWaypoints(lat, lng, routeType);
    
    // Get directions for circular route
    const steps = await circularRouteService.getCircularDirections(origin, waypoints, routeType);
    
    if (steps.length === 0) {
      return null;
    }
    
    // Get AQI for each step
    const route = steps.map(s => ({ lat: s.start_location.lat, lng: s.start_location.lng }));
    const pollutionData = await airQualityService.getAQIForRoute(route);
    
    // Get street name for origin
    const originStreet = await geocodeService.getStreetName(lat, lng);
    
    const pollutionScore = scoreRoute(pollutionData);
    const avgAQI = pollutionData.reduce((sum, p) => sum + p.aqi, 0) / pollutionData.length;
    
    return {
      type: routeType.label,
      from: originStreet,
      to: originStreet,
      isCircular: true,
      requestedDuration: options.duration,
      requestedDistance: options.distance,
      steps: steps.map((s, i) => ({
        instruction: s.instruction, // Already formatted
        distance: s.distance,       // Already formatted
        duration: s.duration,       // Already formatted
        start_location: s.start_location,
        end_location: s.end_location,
        aqi: pollutionData[i] ? pollutionData[i].aqi : s.aqi || null
      })),
      pollutionScore,
      avgAQI,
      recommended: pollutionScore === 'Good' || pollutionScore === 'Moderate',
    };
  }));
  
  // Filter out null results and sort by air quality
  const validAlternatives = alternatives.filter(alt => alt !== null);
  const sorted = validAlternatives.sort((a, b) => a.avgAQI - b.avgAQI);
  
  return {
    isCircular: true,
    best: sorted[0],
    alternative: sorted[1],
    worst: sorted[2],
    alternatives: sorted,
  };
};

exports.getRecommendedRoute = async (from, to) => {
  // 1. Get detailed steps from OpenRoute Service Directions API
  const steps = await mapsStepsService.getBikeRouteSteps(from, to);
  if (!steps || steps.length === 0) {
    return {
      error: 'Unable to find a route between the specified locations. This could be because:',
      suggestions: [
        '• The coordinates are too far from any roads (try coordinates closer to streets)',
        '• The area is not well-mapped for cycling routes',
        '• The locations are in different disconnected road networks',
        '• Try selecting points closer to main roads or intersections'
      ],
      debug: {
        from,
        to,
        stepsFound: steps ? steps.length : 0
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
        instruction: s.instruction,
        distance: s.distance,
        duration: s.duration,
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
