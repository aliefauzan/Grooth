// Simple scoring for MVP
module.exports = (pollutionData) => {
  const avgAQI = pollutionData.reduce((sum, p) => sum + p.aqi, 0) / pollutionData.length;
  if (avgAQI <= 50) return 'Good';
  if (avgAQI <= 100) return 'Moderate';
  if (avgAQI <= 150) return 'Unhealthy for Sensitive Groups';
  return 'Unhealthy';
};
