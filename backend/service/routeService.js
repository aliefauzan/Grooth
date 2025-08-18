
const mapsService = require('./mapsService');
const mapsStepsService = require('./mapsStepsService');
const airQualityService = require('./airQualityService');
const geocodeService = require('./geocodeService');
const circularRouteService = require('./circularRouteService');
const routeDiversificationService = require('./routeDiversificationService');
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
  console.log(`Getting route recommendations from ${from} to ${to}`);
  
  try {
    // Calculate distance between origin and destination
    const [fromLat, fromLng] = from.split(',').map(Number);
    const [toLat, toLng] = to.split(',').map(Number);
    const distance = calculateDistance(fromLat, fromLng, toLat, toLng);
    
    console.log(`Distance between points: ${distance.toFixed(2)} km`);
    
    // For very long distances (>100km), fall back to original service
    // as cycling profiles won't work well for such distances
    if (distance > 100) {
      console.log(`Distance too large for cycling profiles (${distance.toFixed(2)} km), using fallback service`);
      return await getFallbackRoutes(from, to);
    }
    
    // 1. Try to get diverse routes using the new diversification service
    let diverseRoutes;
    try {
      diverseRoutes = await routeDiversificationService.getDiverseRoutes(from, to);
    } catch (diversificationError) {
      console.log(`Route diversification failed: ${diversificationError.message}, falling back to original service`);
      return await getFallbackRoutes(from, to);
    }
    
    if (diverseRoutes.length === 0) {
      console.log('No diverse routes found, falling back to original service');
      return await getFallbackRoutes(from, to);
    }

    console.log(`Found ${diverseRoutes.length} diverse routes`);

    // 2. Process each route to get real AQI data and calculate scores
    const routeAlternatives = await Promise.all(diverseRoutes.map(async (routeData, routeIndex) => {
      const steps = routeData.steps;
      const fullPolyline = routeData.fullPolyline;
      
      // Get coordinates for AQI lookup
      const route = steps.map(s => ({ lat: s.start_location.lat, lng: s.start_location.lng }));
      
      // Get real AQI data for this route (no artificial modification)
      const pollutionData = await airQualityService.getAQIForRoute(route);
      
      // Get street names for start and end
      const [start, end] = [route[0], route[route.length - 1]];
      const [startStreet, endStreet] = await Promise.all([
        geocodeService.getStreetName(start.lat, start.lng),
        geocodeService.getStreetName(end.lat, end.lng)
      ]);
      
      // Calculate pollution score based on real data
      const pollutionScore = scoreRoute(pollutionData);
      const avgAQI = pollutionData.reduce((sum, p) => sum + p.aqi, 0) / pollutionData.length;
      
      const routeLabels = ['best', 'alternative', 'worst'];
      
      return {
        type: routeLabels[routeIndex] || 'alternative',
        from: startStreet,
        to: endStreet,
        steps: steps.map((s, i) => ({
          instruction: s.instruction,
          distance: s.distance,
          duration: s.duration,
          start_location: s.start_location,
          end_location: s.end_location,
          aqi: pollutionData[i] ? pollutionData[i].aqi : null,
          polyline: s.polyline // Include polyline data for detailed route rendering
        })),
        fullPolyline: fullPolyline, // Add full route polyline
        pollutionScore,
        avgAQI: Math.round(avgAQI * 100) / 100,
        recommended: pollutionScore === 'Good' || pollutionScore === 'Moderate',
        routeHash: generateRouteHash(steps) // Add hash to detect identical routes
      };
    }));

    // 3. Sort by real air quality (best AQI first)
    const sorted = [...routeAlternatives].sort((a, b) => a.avgAQI - b.avgAQI);
    
    // 4. Validate that routes are actually different
    const uniqueRoutes = [];
    const usedHashes = new Set();
    
    for (const route of sorted) {
      if (!usedHashes.has(route.routeHash)) {
        uniqueRoutes.push(route);
        usedHashes.add(route.routeHash);
      }
    }
    
    console.log(`Filtered to ${uniqueRoutes.length} unique routes`);
    
    // 5. If we only have one unique route, be transparent about it
    if (uniqueRoutes.length === 1) {
      console.log('Only one unique route found - showing as single option');
      return {
        best: uniqueRoutes[0],
        alternative: null,
        worst: null,
        alternatives: uniqueRoutes,
        warning: 'Only one viable route found between these locations. Consider choosing locations with more road network options for route alternatives.',
        routeCount: 1
      };
    }
    
    // 6. Return properly labeled routes
    const result = {
      best: uniqueRoutes[0],
      alternative: uniqueRoutes[1] || null,
      worst: uniqueRoutes[2] || uniqueRoutes[uniqueRoutes.length - 1] || null,
      alternatives: uniqueRoutes,
      routeCount: uniqueRoutes.length
    };
    
    // Log for debugging
    console.log('Route AQI summary:', {
      best: result.best?.avgAQI,
      alternative: result.alternative?.avgAQI,
      worst: result.worst?.avgAQI
    });
    
    return result;
    
  } catch (error) {
    console.error('Error in getRecommendedRoute:', error);
    return {
      error: 'Unable to generate route recommendations',
      details: error.message,
      suggestions: [
        '• Check your internet connection',
        '• Verify that the coordinates are valid',
        '• Try again with different origin/destination points'
      ]
    };
  }
};

/**
 * Fallback to original route service for long distances or when diversification fails
 */
async function getFallbackRoutes(from, to) {
  console.log('Using fallback route service');
  
  // Use the original logic with different profiles
  const routePromises = [
    mapsStepsService.getBikeRouteSteps(from, to, 'cycling-regular'),
    mapsStepsService.getBikeRouteSteps(from, to, 'cycling-road'),
    mapsStepsService.getBikeRouteSteps(from, to, 'driving-car')
  ];

  const allRouteSteps = await Promise.all(routePromises);
  const validRoutes = allRouteSteps.filter(result => result && result.steps && result.steps.length > 0);
  
  if (validRoutes.length === 0) {
    return {
      error: 'Unable to find any routes between the specified locations.',
      suggestions: [
        '• The coordinates may be too far from roads',
        '• The distance may be too large for available routing profiles',
        '• Try selecting points closer to main roads or intersections',
        '• Consider if the locations are reachable by the selected transport mode'
      ],
      debug: { from, to, routesFound: 0 }
    };
  }

  // Process routes without artificial modification
  const routeAlternatives = await Promise.all(validRoutes.slice(0, 3).map(async (routeResult, routeIndex) => {
    const steps = routeResult.steps;
    const route = steps.map(s => ({ lat: s.start_location.lat, lng: s.start_location.lng }));
    const pollutionData = await airQualityService.getAQIForRoute(route);
    
    const [start, end] = [route[0], route[route.length - 1]];
    const [startStreet, endStreet] = await Promise.all([
      geocodeService.getStreetName(start.lat, start.lng),
      geocodeService.getStreetName(end.lat, end.lng)
    ]);
    
    const pollutionScore = scoreRoute(pollutionData);
    const avgAQI = pollutionData.reduce((sum, p) => sum + p.aqi, 0) / pollutionData.length;
    
    const routeLabels = ['best', 'alternative', 'worst'];
    const profiles = ['cycling-regular', 'cycling-road', 'driving-car'];
    
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
        aqi: pollutionData[i] ? pollutionData[i].aqi : null,
        polyline: s.polyline || null
      })),
      pollutionScore,
      avgAQI: Math.round(avgAQI * 100) / 100,
      recommended: pollutionScore === 'Good' || pollutionScore === 'Moderate',
      routeHash: generateRouteHash(steps),
      profile: profiles[routeIndex], // Add profile info for fallback routes
      fullPolyline: routeResult.fullPolyline || null
    };
  }));

  const sorted = [...routeAlternatives].sort((a, b) => a.avgAQI - b.avgAQI);
  
  return {
    best: sorted[0],
    alternative: sorted[1] || null,
    worst: sorted[2] || null,
    alternatives: sorted,
    routeCount: sorted.length,
    fallbackUsed: true // Indicate that fallback was used
  };
}

/**
 * Calculate distance between two points in km
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Generate a hash for a route to detect identical routes
 */
function generateRouteHash(steps) {
  // Create a hash based on key coordinates
  const keyPoints = steps
    .filter((_, index) => index % Math.max(1, Math.floor(steps.length / 10)) === 0) // Sample every ~10%
    .map(step => `${step.start_location.lat.toFixed(4)},${step.start_location.lng.toFixed(4)}`)
    .join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < keyPoints.length; i++) {
    const char = keyPoints.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return hash.toString(36);
}
