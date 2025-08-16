const routeService = require('../service/routeService');

exports.getRoute = async (req, res, next) => {
  try {
    const { from, to, type, duration, distance } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'Missing from or to parameters' });
    }
    
    // Basic validation for coordinate format
    const coordPattern = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
    if (!coordPattern.test(from)) {
      return res.status(400).json({ 
        error: 'Invalid origin coordinates format', 
        example: 'Use format: -6.2001,106.8166'
      });
    }
    
    if (!coordPattern.test(to)) {
      return res.status(400).json({ 
        error: 'Invalid destination coordinates format', 
        example: 'Use format: -6.1745,106.8227'
      });
    }
    
    // Check if it's a circular route (same origin and destination)
    if (from === to || type === 'circular') {
      const result = await routeService.getCircularRoute(from, { type, duration, distance });
      res.json(result);
    } else {
      const result = await routeService.getRecommendedRoute(from, to);
      res.json(result);
    }
  } catch (err) {
    console.error('Route controller error:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
};
