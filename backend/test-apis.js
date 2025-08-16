// Test script to verify OpenRoute Service and WAQI API integration
require('dotenv').config();
const axios = require('axios');

const OPEN_ROUTE_API_KEY = process.env.OPEN_ROUTE_API_KEY;
const WAQI_API_KEY = process.env.WAQI_API_KEY;

console.log('Testing API integrations...\n');

// Test OpenRoute Service Directions API
async function testOpenRouteDirections() {
  console.log('Testing OpenRoute Service Directions API...');
  try {
    const requestBody = {
      coordinates: [[106.8166, -6.2001], [106.8227, -6.1745]], // Jakarta coordinates
      profile: 'cycling-regular',
      format: 'json',
      instructions: true,
      geometry: true,
      units: 'km'
    };

    const response = await axios.post(
      'https://api.openrouteservice.org/v2/directions/cycling-regular',
      requestBody,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': OPEN_ROUTE_API_KEY
        }
      }
    );

    if (response.data && response.data.routes && response.data.routes[0]) {
      console.log('✅ OpenRoute Directions API - SUCCESS');
      console.log(`   Duration: ${response.data.routes[0].summary.duration} seconds`);
      console.log(`   Distance: ${response.data.routes[0].summary.distance} meters`);
      console.log(`   Steps: ${response.data.routes[0].segments[0].steps.length}`);
    } else {
      console.log('❌ OpenRoute Directions API - No routes found');
    }
  } catch (error) {
    console.log('❌ OpenRoute Directions API - ERROR:', error.response?.data || error.message);
  }
  console.log('');
}

// Test OpenRoute Service Geocoding API
async function testOpenRouteGeocoding() {
  console.log('Testing OpenRoute Service Geocoding API...');
  try {
    const lat = -6.2001;
    const lng = 106.8166;
    const url = `https://api.openrouteservice.org/geocode/reverse?api_key=${OPEN_ROUTE_API_KEY}&point.lon=${lng}&point.lat=${lat}&size=1`;
    
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.data && response.data.features && response.data.features[0]) {
      console.log('✅ OpenRoute Geocoding API - SUCCESS');
      console.log(`   Address: ${response.data.features[0].properties.label}`);
    } else {
      console.log('❌ OpenRoute Geocoding API - No results found');
    }
  } catch (error) {
    console.log('❌ OpenRoute Geocoding API - ERROR:', error.response?.data || error.message);
  }
  console.log('');
}

// Test WAQI API
async function testWAQI() {
  console.log('Testing WAQI API...');
  try {
    const lat = -6.2001;
    const lng = 106.8166;
    const url = `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${WAQI_API_KEY}`;
    
    const response = await axios.get(url);
    
    if (response.data && response.data.status === 'ok' && response.data.data && response.data.data.aqi) {
      console.log('✅ WAQI API - SUCCESS');
      console.log(`   AQI: ${response.data.data.aqi}`);
      console.log(`   Station: ${response.data.data.city?.name || 'Unknown'}`);
    } else {
      console.log('❌ WAQI API - No AQI data found, trying nearby stations...');
      
      // Try nearby search as fallback
      const nearbyUrl = `https://api.waqi.info/search/?token=${WAQI_API_KEY}&keyword=${lat},${lng}`;
      const nearbyResponse = await axios.get(nearbyUrl);
      
      if (nearbyResponse.data && nearbyResponse.data.status === 'ok' && nearbyResponse.data.data && nearbyResponse.data.data.length > 0) {
        console.log('✅ WAQI API (nearby) - SUCCESS');
        console.log(`   Found ${nearbyResponse.data.data.length} nearby stations`);
        console.log(`   First station: ${nearbyResponse.data.data[0].station.name}`);
      } else {
        console.log('❌ WAQI API - No nearby stations found');
      }
    }
  } catch (error) {
    console.log('❌ WAQI API - ERROR:', error.response?.data || error.message);
  }
  console.log('');
}

// Run all tests
async function runTests() {
  console.log('API Keys Status:');
  console.log(`OpenRoute API Key: ${OPEN_ROUTE_API_KEY ? '✅ Present' : '❌ Missing'}`);
  console.log(`WAQI API Key: ${WAQI_API_KEY ? '✅ Present' : '❌ Missing'}`);
  console.log('');

  if (!OPEN_ROUTE_API_KEY || !WAQI_API_KEY) {
    console.log('❌ Missing API keys. Please check your .env file.');
    return;
  }

  await testOpenRouteDirections();
  await testOpenRouteGeocoding();
  await testWAQI();
  
  console.log('All tests completed!');
}

runTests();
