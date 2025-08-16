require('dotenv').config();
const mapsStepsService = require('./service/mapsStepsService');

async function testDirect() {
  console.log('Testing mapsStepsService directly...');
  console.log('API Key:', process.env.OPEN_ROUTE_API_KEY ? 'Set' : 'Missing');
  
  try {
    const result = await mapsStepsService.getBikeRouteSteps('-6.2001,106.8166', '-6.1745,106.8227');
    console.log('Result:', result);
  } catch (error) {
    console.error('Test error:', error);
  }
}

testDirect();
