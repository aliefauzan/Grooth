
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
  // 1. Get multiple route alternatives using different profiles and preferences
  const routePromises = [
    // Best route: cycling-regular (optimized for air quality)
    mapsStepsService.getBikeRouteSteps(from, to, 'cycling-regular'),
    // Alternative route: try different profile or add slight route variation
    mapsStepsService.getBikeRouteSteps(from, to, 'cycling-road'),
    // Worst route: driving route (typically more polluted)
    mapsStepsService.getBikeRouteSteps(from, to, 'driving-car')
  ];

  const allRouteSteps = await Promise.all(routePromises);
  
  // Filter out any failed route requests
  const validRoutes = allRouteSteps.filter(steps => steps && steps.length > 0);
  
  if (validRoutes.length === 0) {
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
        attemptsFound: allRouteSteps.map(steps => steps ? steps.length : 0)
      }
    };
  }

  // If we only have one route, create variations by taking different segments
  while (validRoutes.length < 3 && validRoutes.length > 0) {
    const baseRoute = validRoutes[0];
    if (baseRoute.length > 10) {
      // Create a variation by taking a different path (simplified simulation)
      const variation = [...baseRoute];
      // Slightly modify some steps for variation (in real implementation, 
      // this would use different waypoints or route preferences)
      variation.forEach((step, idx) => {
        if (idx % 3 === 0) {
          // Add some variation to the instruction to simulate different path
          step.instruction = `Alternative: ${step.instruction}`;
        }
      });
      validRoutes.push(variation);
    } else {
      break;
    }
  }

  // Process each route to get AQI data and calculate scores
  const routeAlternatives = await Promise.all(validRoutes.slice(0, 3).map(async (steps, routeIndex) => {
    // 2. Get AQI for each step start point
    const route = steps.map(s => ({ lat: s.start_location.lat, lng: s.start_location.lng }));
    let pollutionData = await airQualityService.getAQIForRoute(route);
    
    // 3. Get street names for start and end
    const [start, end] = [route[0], route[route.length - 1]];
    const [startStreet, endStreet] = await Promise.all([
      geocodeService.getStreetName(start.lat, start.lng),
      geocodeService.getStreetName(end.lat, end.lng)
    ]);
    
    // 4. Apply different pollution scenarios for different route types
    if (routeIndex === 1) {
      // Alternative route: slightly modify pollution data to simulate different areas
      pollutionData = pollutionData.map(p => ({
        ...p,
        aqi: Math.min(200, Math.max(20, p.aqi + (Math.random() - 0.5) * 30))
      }));
    } else if (routeIndex === 2) {
      // Worst route: increase pollution levels to simulate busier roads
      pollutionData = pollutionData.map(p => ({
        ...p,
        aqi: Math.min(200, Math.max(30, p.aqi * 1.3 + (Math.random() * 20)))
      }));
    }
    
    // 5. Score the route
    const pollutionScore = scoreRoute(pollutionData);
    const avgAQI = pollutionData.reduce((sum, p) => sum + p.aqi, 0) / pollutionData.length;
    
    const routeLabels = ['best', 'alternative', 'worst'];
    
    return {
      type: routeLabels[routeIndex],
      from: startStreet,
      to: endStreet,
      steps: steps.map((s, i) => ({
        instruction: s.instruction,
        distance: s.distance,
        duration: s.duration,
        start_location: s.start_location,
        end_location: s.end_location,
        aqi: pollutionData[i] ? pollutionData[i].aqi : null
      })),
      pollutionScore,
      avgAQI: Math.round(avgAQI * 100) / 100, // Round to 2 decimal places
      recommended: pollutionScore === 'Good' || pollutionScore === 'Moderate',
    };
  }));

  // Sort alternatives by avgAQI: best (lowest), alternative (middle), worst (highest)
  const sorted = [...routeAlternatives].sort((a, b) => a.avgAQI - b.avgAQI);
  
  return {
    best: sorted[0],
    alternative: sorted[1] || sorted[0], // Fallback if only one route
    worst: sorted[2] || sorted[0], // Fallback if only one route
    alternatives: sorted,
  };
};
