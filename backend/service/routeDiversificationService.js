const axios = require('axios');
const API_KEY = process.env.OPEN_ROUTE_API_KEY;

/**
 * Generate intermedi    if (response.data?.routes?.[0]?.segments) {
      const parsedRoute = parseRouteResponse(response.data.routes[0], strategy);
      return {
        success: true,
        route: parsedRoute.steps,
        fullPolyline: parsedRoute.fullPolyline,
        strategy: strategy
      };
    } else {
      return { success: false, strategy: strategy, error: 'No route found' };
    }ints to force route diversity
 */
function generateWaypoints(fromLat, fromLng, toLat, toLng, strategy) {
  const midLat = (fromLat + toLat) / 2;
  const midLng = (fromLng + toLng) / 2;
  
  // Calculate distance and bearing for waypoint generation
  const distance = Math.sqrt(Math.pow(toLat - fromLat, 2) + Math.pow(toLng - fromLng, 2));
  
  // Use smaller offset for long distances to avoid invalid coordinates
  const maxOffset = Math.min(distance * 0.2, 0.05); // Max 20% of distance or 0.05 degrees
  const offsetDistance = Math.max(maxOffset, 0.005); // Minimum 0.005 degrees offset
  
  const waypoints = [];
  
  switch (strategy) {
    case 'northern_route':
      // Force route to go slightly north
      waypoints.push([midLng, midLat + offsetDistance]);
      break;
      
    case 'southern_route':
      // Force route to go slightly south
      waypoints.push([midLng, midLat - offsetDistance]);
      break;
      
    case 'eastern_route':
      // Force route to go slightly east
      waypoints.push([midLng + offsetDistance, midLat]);
      break;
      
    case 'western_route':
      // Force route to go slightly west
      waypoints.push([midLng - offsetDistance, midLat]);
      break;
      
    case 'scenic_route':
      // Create smaller waypoints for scenic route
      waypoints.push([midLng - offsetDistance * 0.3, midLat + offsetDistance * 0.3]);
      break;
      
    default:
      // Direct route - no waypoints
      break;
  }
  
  return waypoints;
}

/**
 * Get route with specific waypoints and options
 */
async function getRouteWithStrategy(from, to, strategy) {
  try {
    const [fromLat, fromLng] = from.split(',').map(Number);
    const [toLat, toLng] = to.split(',').map(Number);
    
    // Check if coordinates are valid
    if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) {
      return { success: false, strategy: strategy, error: 'Invalid coordinates' };
    }
    
    // Calculate distance to determine appropriate radius
    const distance = calculateDistance(fromLat, fromLng, toLat, toLng);
    const searchRadius = Math.min(Math.max(distance * 100, 1000), 5000); // 1-5km radius based on distance
    
    // Generate waypoints for this strategy
    const waypoints = generateWaypoints(fromLat, fromLng, toLat, toLng, strategy);
    
    // Build coordinates array: start -> waypoints -> end
    const coordinates = [
      [fromLng, fromLat],
      ...waypoints,
      [toLng, toLat]
    ];
    
    // Configure routing options based on strategy
    const routingOptions = getRoutingOptions(strategy);
    
    const requestBody = {
      coordinates: coordinates,
      profile: routingOptions.profile,
      format: 'json',
      instructions: true,
      geometry: true,
      units: 'km',
      radiuses: coordinates.map(() => searchRadius), // Dynamic radius based on distance
      continue_straight: false,
      options: routingOptions.options
    };

    console.log(`Trying ${strategy} with profile ${routingOptions.profile}, ${coordinates.length} coordinates, radius ${searchRadius}m`);

    const response = await axios.post(
      `https://api.openrouteservice.org/v2/directions/${routingOptions.profile}`,
      requestBody,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': API_KEY
        },
        timeout: 15000 // 15 second timeout
      }
    );

    if (response.data?.routes?.[0]?.segments) {
      return {
        success: true,
        route: parseRouteResponse(response.data.routes[0], strategy),
        strategy: strategy
      };
    } else {
      return { success: false, strategy: strategy, error: 'No route found in response' };
    }
  } catch (error) {
    console.error(`Route strategy ${strategy} failed:`, error.response?.status, error.response?.data?.error?.message || error.message);
    return { 
      success: false, 
      strategy: strategy, 
      error: error.response?.data?.error?.message || error.message,
      statusCode: error.response?.status
    };
  }
}

/**
 * Get routing options for different strategies
 */
function getRoutingOptions(strategy) {
  const options = {
    direct_route: {
      profile: 'cycling-regular',
      options: { avoid_features: ['highways'] }
    },
    northern_route: {
      profile: 'cycling-regular',
      options: { avoid_features: ['highways', 'steps'] }
    },
    southern_route: {
      profile: 'cycling-road',
      options: { avoid_features: ['steps'] }
    },
    eastern_route: {
      profile: 'cycling-regular',
      options: { avoid_features: ['highways', 'ferries'] }
    },
    western_route: {
      profile: 'cycling-road',
      options: { avoid_features: ['ferries'] }
    },
    scenic_route: {
      profile: 'cycling-regular',
      options: { avoid_features: ['highways', 'tollways'] }
    },
    fast_route: {
      profile: 'driving-car',
      options: { avoid_features: [] }
    }
  };
  
  return options[strategy] || options.direct_route;
}

/**
 * Parse OpenRoute response to our format
 */
function parseRouteResponse(route, strategy) {
  const segments = route.segments;
  const steps = [];
  
  // Decode geometry for coordinates
  const coordinates = route.geometry ? 
    decodePolyline(route.geometry) : [];
  
  segments.forEach(segment => {
    if (segment.steps) {
      segment.steps.forEach(step => {
        const startIdx = step.way_points ? step.way_points[0] : 0;
        const endIdx = step.way_points ? step.way_points[1] : coordinates.length - 1;
        
        const startCoord = coordinates[startIdx] || [0, 0];
        const endCoord = coordinates[endIdx] || [0, 0];
        
        const stepData = {
          instruction: addStrategyPrefix(step.instruction || 'Continue', strategy),
          distance: step.distance >= 1 ? 
            `${step.distance.toFixed(2)} km` : 
            `${(step.distance * 1000).toFixed(0)} m`,
          duration: `${Math.round(step.duration / 60)} min`,
          start_location: {
            lat: startCoord[1],
            lng: startCoord[0]
          },
          end_location: {
            lat: endCoord[1],
            lng: endCoord[0]
          },
          // Add polyline coordinates for this step
          polyline: coordinates.slice(startIdx, endIdx + 1).map(coord => ({
            lat: coord[1],
            lng: coord[0]
          }))
        };
        steps.push(stepData);
      });
    }
  });
  
  // Add full route polyline to the response
  const fullPolyline = coordinates.map(coord => ({
    lat: coord[1],
    lng: coord[0]
  }));
  
  return {
    steps: steps,
    fullPolyline: fullPolyline
  };
}

/**
 * Add strategy-specific prefixes to instructions
 */
function addStrategyPrefix(instruction, strategy) {
  const prefixes = {
    direct_route: '',
    northern_route: '[Northern] ',
    southern_route: '[Southern] ',
    eastern_route: '[Eastern] ',
    western_route: '[Western] ',
    scenic_route: '[Scenic] ',
    fast_route: '[Fast] '
  };
  
  return (prefixes[strategy] || '') + instruction;
}

/**
 * Decode polyline string to coordinates
 */
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

/**
 * Check if two routes are significantly different
 */
function areRoutesDifferent(route1, route2, threshold = 0.3) {
  if (!route1 || !route2 || route1.length === 0 || route2.length === 0) {
    return false;
  }
  
  // Compare key coordinates
  const sample1 = sampleRoute(route1);
  const sample2 = sampleRoute(route2);
  
  let differences = 0;
  const maxComparisons = Math.min(sample1.length, sample2.length);
  
  for (let i = 0; i < maxComparisons; i++) {
    const distance = calculateDistance(
      sample1[i].start_location.lat, sample1[i].start_location.lng,
      sample2[i].start_location.lat, sample2[i].start_location.lng
    );
    
    // If points are more than 200m apart, consider it different
    if (distance > 0.2) {
      differences++;
    }
  }
  
  const differenceRatio = differences / maxComparisons;
  return differenceRatio > threshold;
}

/**
 * Sample key points from route for comparison
 */
function sampleRoute(route) {
  if (route.length <= 5) return route;
  
  const samples = [];
  const step = Math.floor(route.length / 5);
  
  for (let i = 0; i < route.length; i += step) {
    samples.push(route[i]);
  }
  
  return samples;
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
 * Get diverse routes using multiple strategies
 */
async function getDiverseRoutes(from, to) {
  console.log(`Generating diverse routes from ${from} to ${to}`);
  
  // Check distance first
  const [fromLat, fromLng] = from.split(',').map(Number);
  const [toLat, toLng] = to.split(',').map(Number);
  const distance = calculateDistance(fromLat, fromLng, toLat, toLng);
  
  console.log(`Route distance: ${distance.toFixed(2)} km`);
  
  // Adjust strategies based on distance
  let strategies;
  if (distance > 50) {
    // For long distances, use only driving and main road strategies
    strategies = ['direct_route', 'fast_route'];
    console.log('Using long-distance strategies');
  } else if (distance > 20) {
    // For medium distances, use fewer waypoint strategies
    strategies = ['direct_route', 'northern_route', 'southern_route', 'fast_route'];
    console.log('Using medium-distance strategies');
  } else {
    // For short distances, use all strategies
    strategies = [
      'direct_route',    // Best route
      'northern_route',  // Alternative route 1
      'southern_route',  // Alternative route 2
      'eastern_route',   // Alternative route 3
      'western_route',   // Alternative route 4
      'scenic_route',    // Scenic alternative
      'fast_route'       // Fast/driving route
    ];
    console.log('Using all strategies for short distance');
  }
  
  // Try strategies in sequence (not parallel) to avoid rate limiting
  const routeResults = [];
  for (const strategy of strategies) {
    const result = await getRouteWithStrategy(from, to, strategy);
    routeResults.push(result);
    
    // Add small delay to avoid rate limiting
    if (routeResults.length < strategies.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  // Filter successful routes
  const successfulRoutes = routeResults.filter(result => result.success);
  console.log(`Successfully generated ${successfulRoutes.length} routes out of ${strategies.length} attempts`);
  
  if (successfulRoutes.length === 0) {
    // Log all failures for debugging
    const failures = routeResults.filter(r => !r.success);
    console.log('All route strategies failed:');
    failures.forEach(f => {
      console.log(`- ${f.strategy}: ${f.error} (${f.statusCode || 'unknown'})`);
    });
    throw new Error('Unable to generate any routes with diversification strategies');
  }
  
  // Remove duplicate routes
  const uniqueRoutes = [];
  const usedStrategies = [];
  
  for (const routeResult of successfulRoutes) {
    const isUnique = uniqueRoutes.every(existing => 
      areRoutesDifferent(existing.route, routeResult.route)
    );
    
    if (isUnique || uniqueRoutes.length === 0) {
      uniqueRoutes.push(routeResult);
      usedStrategies.push(routeResult.strategy);
    }
  }
  
  console.log(`Found ${uniqueRoutes.length} unique routes using strategies: ${usedStrategies.join(', ')}`);
  
  // Return top 3 most diverse routes
  return uniqueRoutes.slice(0, 3).map(result => ({
    steps: result.route,
    fullPolyline: result.fullPolyline,
    strategy: result.strategy
  }));
}

module.exports = {
  getDiverseRoutes,
  areRoutesDifferent,
  generateWaypoints,
  getRouteWithStrategy
};
