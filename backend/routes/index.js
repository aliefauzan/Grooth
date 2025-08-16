const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
const routabilityService = require('../service/routabilityService');

router.get('/route', routeController.getRoute);

// Test if a coordinate is routable
router.get('/test-point', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Missing lat or lng parameters' });
    }
    
    const result = await routabilityService.testRoutablePoint(parseFloat(lat), parseFloat(lng));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get nearby routable points
router.get('/nearby-roads', async (req, res) => {
  try {
    const { lat, lng, radius = 1 } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Missing lat or lng parameters' });
    }
    
    const result = await routabilityService.getNearbyRoutablePoints(
      parseFloat(lat), 
      parseFloat(lng), 
      parseFloat(radius)
    );
    res.json({ nearby_points: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
