// Utility functions for coordinate validation and manipulation

// Check if coordinates are within reasonable bounds
function validateCoordinates(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return { valid: false, error: 'Coordinates must be numbers' };
  }
  
  if (lat < -90 || lat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90 degrees' };
  }
  
  if (lng < -180 || lng > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180 degrees' };
  }
  
  return { valid: true };
}

// Parse coordinate string (supports "lat,lng" format)
function parseCoordinateString(coordStr) {
  try {
    const parts = coordStr.split(',').map(s => s.trim());
    if (parts.length !== 2) {
      throw new Error('Invalid coordinate format. Use "lat,lng"');
    }
    
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    
    if (isNaN(lat) || isNaN(lng)) {
      throw new Error('Coordinates must be valid numbers');
    }
    
    const validation = validateCoordinates(lat, lng);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    return { lat, lng, valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Calculate distance between two points (in meters)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lng2-lng1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

// Check if two points are too close for meaningful routing
function checkMinimumDistance(lat1, lng1, lat2, lng2, minDistanceMeters = 50) {
  const distance = calculateDistance(lat1, lng1, lat2, lng2);
  return {
    distance,
    sufficient: distance >= minDistanceMeters,
    message: distance < minDistanceMeters ? 
      `Points are too close (${distance.toFixed(0)}m). Minimum distance: ${minDistanceMeters}m` : 
      'Distance is sufficient for routing'
  };
}

// Suggest adjusted coordinates within a small radius
function adjustCoordinatesForRouting(lat, lng, adjustmentMeters = 100) {
  // Generate small offsets (approximately adjustmentMeters in each direction)
  const latOffset = adjustmentMeters / 111000; // Approximately 111km per degree
  const lngOffset = adjustmentMeters / (111000 * Math.cos(lat * Math.PI / 180));
  
  return [
    { lat: lat + latOffset, lng, description: `${adjustmentMeters}m north` },
    { lat: lat - latOffset, lng, description: `${adjustmentMeters}m south` },
    { lat, lng: lng + lngOffset, description: `${adjustmentMeters}m east` },
    { lat, lng: lng - lngOffset, description: `${adjustmentMeters}m west` },
    { lat: lat + latOffset/2, lng: lng + lngOffset/2, description: `${adjustmentMeters/2}m northeast` },
    { lat: lat - latOffset/2, lng: lng - lngOffset/2, description: `${adjustmentMeters/2}m southwest` }
  ];
}

module.exports = {
  validateCoordinates,
  parseCoordinateString,
  calculateDistance,
  checkMinimumDistance,
  adjustCoordinatesForRouting
};
