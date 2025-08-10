const routeService = require('../service/routeService');

exports.getRoute = async (req, res, next) => {
  try {
    const { from, to, type, duration, distance } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'Missing from or to parameters' });
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
    next(err);
  }
};
