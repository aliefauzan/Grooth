# Grooth Backend

## Overview

Grooth is an Express.js backend that provides bicycle/motorcycle route recommendations based on real-time air quality data. It integrates Google Maps APIs for routing and air quality, helping users avoid polluted routes.

## Features
- Real-time air quality detection using Google Maps Air Quality API
- Route recommendations based on pollution exposure
- Modular architecture for easy extension
- Docker support

## Project Structure

```
backend/
├── config/           # API keys, constants, configs
├── controllers/      # Route logic & main business logic
├── middleware/       # Error handling, logging, etc
├── models/           # Data models (if needed)
├── routes/           # Express route definitions
├── service/          # External API calls (air quality, maps)
├── utils/            # Helper functions
├── .env              # Secrets and API keys
├── Dockerfile        # Docker support
├── app.js            # Express app setup
├── server.js         # Entry point
├── package.json      # Dependencies and scripts
```

## Environment Setup

1. **Node.js v18+ required**
2. Create a `.env` file in `backend/`:
   ```env
   PORT=5000
   MAP_API_KEY=your_google_maps_api_key
   ```
   - Get your API key from Google Cloud Console and enable Maps and Air Quality APIs.

## Installation & Running

```bash
cd backend
npm install
npm start
```

Or with Docker:

```bash
docker build -t Grooth .
docker run -p 5000:5000 Grooth
```

## API Usage

### Get Route Recommendation

**Endpoint:**
```
GET /api/route?from=lat1,lng1&to=lat2,lng2
```

**Example:**
```
GET /api/route?from=-6.2001,106.8166&to=-6.1745,106.8227
```

**Response:**
```json
{
  "best": { ... },
  "alternative": { ... },
  "worst": { ... },
  "alternatives": [ ... ]
}
```
Each route includes:
- `from`, `to`: Street names
- `steps`: Directions, distance, duration, AQI
- `pollutionScore`: Air quality summary
- `recommended`: Boolean

## Development Notes

- All API keys/secrets should be stored in `.env` and never committed.
- Extend services in `service/` for new APIs or logic.
- For frontend integration, use `/api/route` endpoint and proxy requests if needed.

## License

MIT
