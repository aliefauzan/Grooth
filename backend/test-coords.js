require('dotenv').config();
const mapsStepsService = require('./service/mapsStepsService');

async function testProblematicCoords() {
  console.log('Testing problematic coordinates...');
  console.log('Coordinates: 106.0594421,-5.9172312');
  
  try {
    // Test the coordinates in the correct format (lat,lng)
    const result = await mapsStepsService.getBikeRouteSteps('-5.9172312,106.0594421', '-5.9172312,106.0594421');
    console.log('Result:', result.length > 0 ? `${result.length} steps found` : 'No steps found');
    if (result.length > 0) {
      console.log('First step:', result[0]);
    }
  } catch (error) {
    console.error('Direct service test failed:', error.message);
  }
}

testProblematicCoords();
