require('dotenv').config();
const coordinateUtils = require('./utils/coordinateUtils');

console.log('Testing coordinate parsing...');

const testCoords = [
  '-5.9172312,106.0594421',
  '-6.2001,106.8166',
  'invalid,coord',
  '91,181', // out of bounds
  '-5.9172312,106.0594421'
];

testCoords.forEach(coord => {
  console.log(`\nTesting: ${coord}`);
  const result = coordinateUtils.parseCoordinateString(coord);
  console.log('Result:', result);
});
