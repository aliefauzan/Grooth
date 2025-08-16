
"use client";
import dynamic from "next/dynamic";
import { useState } from "react";

const MapSelector = dynamic(() => import("./MapSelector"), { ssr: false });
const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false });

type RouteStep = {
  instruction: string;
  distance: string;
  duration: string;
  start_location: { lat: number; lng: number };
  end_location: { lat: number; lng: number };
  aqi: number | null;
};

type RouteOption = {
  type: string;
  from: string;
  to: string;
  steps: RouteStep[];
  pollutionScore: string;
  avgAQI: number;
  recommended: boolean;
  isCircular?: boolean;
  requestedDuration?: string;
  requestedDistance?: string;
};

type RouteResponse = {
  best?: RouteOption;
  alternative?: RouteOption;
  worst?: RouteOption;
  alternatives?: RouteOption[];
  isCircular?: boolean;
};

export default function Home() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteResponse | null>(null);
  const [error, setError] = useState("");
  const [isCircular, setIsCircular] = useState(false);
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [routeType, setRouteType] = useState("balanced");
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      let url = `/api/route?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      
      // Add circular route parameters
      if (isCircular) {
        url += `&type=circular`;
        if (duration) url += `&duration=${encodeURIComponent(duration)}`;
        if (distance) url += `&distance=${encodeURIComponent(distance)}`;
        if (routeType) url += `&routeType=${encodeURIComponent(routeType)}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError("Failed to fetch route");
    }
    setLoading(false);
  };

  // Auto-detect if route is circular
  const handleFromChange = (value: string) => {
    setFrom(value);
    if (isCircular) {
      setTo(value); // Auto-update destination for circular routes
    } else {
      setIsCircular(value === to && value !== "");
    }
  };

  const handleToChange = (value: string) => {
    setTo(value);
    setIsCircular(value === from && value !== "");
  };

  // Get current position
  const getCurrentPosition = () => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const locationString = `${lat},${lng}`;
          setCurrentLocation({ lat, lng });
          setFrom(locationString);
          setGettingLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setError("Unable to get current location. Please enter manually.");
          setGettingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    } else {
      setError("Geolocation is not supported by this browser.");
      setGettingLocation(false);
    }
  };

  // Handle circular route checkbox
  const handleCircularToggle = (checked: boolean) => {
    setIsCircular(checked);
    if (checked && from) {
      setTo(from); // Auto-set destination to origin for circular route
    } else if (!checked) {
      setTo(""); // Clear destination when unchecking circular
    }
  };

  // Auto-use current location for circular routes
  const useCurrentLocationForCircular = () => {
    if (currentLocation) {
      const locationString = `${currentLocation.lat},${currentLocation.lng}`;
      setFrom(locationString);
      setTo(locationString);
      setIsCircular(true);
    } else {
      getCurrentPosition();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">Grooth MVP Demo</h1>
      <form
        className="bg-white shadow rounded p-6 flex flex-col gap-4 w-full max-w-md"
        onSubmit={handleSubmit}
      >
        <MapSelector from={from} to={to} setFrom={setFrom} setTo={setTo} />
        
        {/* Current Location and Circular Route Controls */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <button
              type="button"
              onClick={getCurrentPosition}
              disabled={gettingLocation}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              📍 {gettingLocation ? "Getting Location..." : "Use Current Location"}
            </button>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="circularRoute"
                checked={isCircular}
                onChange={(e) => handleCircularToggle(e.target.checked)}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <label htmlFor="circularRoute" className="font-semibold text-purple-700 cursor-pointer">
                🔄 Circular Route (Round Trip)
              </label>
            </div>
            
            {currentLocation && (
              <button
                type="button"
                onClick={useCurrentLocationForCircular}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 flex items-center gap-2"
              >
                🎯 Circular from Here
              </button>
            )}
          </div>
          
          {currentLocation && (
            <div className="mt-2 text-sm text-blue-600">
              📍 Current Location: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
            </div>
          )}
        </div>
        
        <label className="font-semibold text-blue-700">Origin (lat,lng or address)</label>
        <input
          className="border rounded px-3 py-2 text-gray-800 font-bold bg-blue-50 focus:bg-white focus:border-blue-500"
          value={from}
          onChange={(e) => handleFromChange(e.target.value)}
          placeholder="e.g. -6.2001,106.8166 or address"
          required
        />
        <label className="font-semibold text-green-700">
          Destination (lat,lng or address)
          {isCircular && <span className="text-purple-600 ml-2">🔄 Auto-set for circular route</span>}
        </label>
        <input
          className={`border rounded px-3 py-2 text-gray-800 font-bold focus:bg-white focus:border-green-500 ${
            isCircular 
              ? 'bg-purple-100 border-purple-300 cursor-not-allowed' 
              : 'bg-green-50'
          }`}
          value={to}
          onChange={(e) => handleToChange(e.target.value)}
          placeholder={isCircular ? "Same as origin (circular route)" : "e.g. -6.1745,106.8227 or address"}
          required
          disabled={isCircular}
        />
        
        {/* Circular Route Controls */}
        {isCircular && (
          <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50 animate-pulse">
            <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
              🔄 Circular Route Options
              <span className="text-xs bg-purple-200 text-purple-700 px-2 py-1 rounded-full">ACTIVE</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-purple-700 flex items-center gap-1">
                  ⏱️ Duration (minutes)
                  <span className="text-xs text-purple-500">(optional)</span>
                </label>
                <input
                  type="number"
                  className="border rounded px-3 py-2 text-gray-800 bg-white focus:border-purple-500 w-full shadow-sm"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 30"
                  min="10"
                  max="180"
                />
              </div>
              
              <div>
                <label className="font-semibold text-purple-700 flex items-center gap-1">
                  📏 Distance (km)
                  <span className="text-xs text-purple-500">(optional)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="border rounded px-3 py-2 text-gray-800 bg-white focus:border-purple-500 w-full shadow-sm"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="e.g. 5.0"
                  min="0.5"
                  max="50"
                />
              </div>
            </div>
            
            <div className="mt-3">
              <label className="font-semibold text-purple-700">🎯 Route Type</label>
              <select
                className="border rounded px-3 py-2 text-gray-800 bg-white focus:border-purple-500 w-full shadow-sm"
                value={routeType}
                onChange={(e) => setRouteType(e.target.value)}
              >
                <option value="balanced">🌟 Balanced Route</option>
                <option value="scenic">🌳 Scenic Route</option>
                <option value="fitness">💪 Fitness Route</option>
                <option value="duration">⏱️ Duration-based</option>
                <option value="distance">📏 Distance-based</option>
              </select>
            </div>
            
            <div className="bg-purple-100 border border-purple-300 rounded p-3 mt-3">
              <div className="text-sm text-purple-700 font-medium">
                💡 <strong>Pro Tips:</strong>
              </div>
              <ul className="text-xs text-purple-600 mt-1 list-disc list-inside">
                <li>Set either duration OR distance for best results</li>
                <li>Scenic routes prioritize parks and green spaces</li>
                <li>Fitness routes include more elevation changes</li>
              </ul>
            </div>
          </div>
        )}
        
        <button
          className={`py-3 rounded-lg font-bold text-lg transition-all duration-300 ${
            isCircular 
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span> Loading...
            </span>
          ) : isCircular ? (
            <span className="flex items-center justify-center gap-2">
              🔄 Find Circular Route
            </span>
          ) : (
            "🗺️ Find Route"
          )}
        </button>
      </form>

      {error && <div className="text-red-600 mt-4">{error}</div>}

      {result && (
        <div className="mt-8 w-full max-w-3xl">
          <h2 className="text-xl font-bold mb-4 text-blue-700">
            {isCircular ? "🔄 Circular Route Results" : "🗺️ Route Results"}
          </h2>
          {isCircular && (
            <div className="bg-purple-100 border border-purple-300 rounded-lg p-3 mb-4">
              <div className="text-purple-800 font-semibold">
                📍 Round Trip from: {from}
              </div>
              <div className="text-sm text-purple-600 mt-1">
                Route Type: {routeType} | Duration: {duration || 'Auto'} min | Distance: {distance || 'Auto'} km
              </div>
            </div>
          )}
          
          {/* Debug Information */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-3 bg-gray-100 rounded-lg text-xs">
              <details>
                <summary className="cursor-pointer font-semibold">🔍 Debug Data</summary>
                <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
              </details>
            </div>
          )}
          
          {["best", "alternative", "worst"].map((key) => {
            const route = (result as any)[key] as RouteOption | undefined;
            if (!route) return null;
            
            // Debug logging
            console.log(`Route ${key}:`, route);
            console.log(`Route steps:`, route.steps);
            
            // Polyline path for this route
            const path = route.steps && route.steps.length > 0 
              ? route.steps.map((step) => [step.start_location.lat, step.start_location.lng] as [number, number])
                  .concat([[route.steps[route.steps.length - 1].end_location.lat, route.steps[route.steps.length - 1].end_location.lng]])
              : [];
            
            console.log(`Path for ${key}:`, path);
            
            // AQI color
            const aqiColor = route.pollutionScore === 'Good' ? 'text-green-700' : route.pollutionScore === 'Moderate' ? 'text-yellow-600' : 'text-red-600';
            
            // Default center if no path
            const mapCenter: [number, number] = path.length > 0 ? path[0] : [-6.2088, 106.8456];
            
            // Route color based on quality
            const routeColor = key === 'best' ? '#22c55e' : key === 'worst' ? '#ef4444' : '#eab308';
            
            return (
              <div key={key} className="mb-8 p-6 bg-white rounded-2xl shadow-xl border border-gray-200">
                <h3 className={`font-bold text-lg mb-2 capitalize ${key === 'best' ? 'text-green-700' : key === 'worst' ? 'text-red-600' : 'text-yellow-600'}`}>
                  {isCircular ? `${key === 'best' ? '🥇' : key === 'worst' ? '🥉' : '🥈'} ${key} Circular Route` : `${key} Route`}
                </h3>
                {!isCircular && (
                  <>
                    <div className="mb-2">
                      <span className="font-semibold text-blue-700">From:</span> <span className="font-bold text-blue-900">{route.from}</span>
                    </div>
                    <div className="mb-2">
                      <span className="font-semibold text-green-700">To:</span> <span className="font-bold text-green-900">{route.to}</span>
                    </div>
                  </>
                )}
                {isCircular && (
                  <div className="mb-2">
                    <span className="font-semibold text-purple-700">Round Trip:</span> <span className="font-bold text-purple-900">{route.from} → Loop → {route.from}</span>
                  </div>
                )}
                <div className="mb-2">
                  <span className="font-semibold text-gray-800">Air Quality:</span> <span className={`font-bold ${aqiColor}`}>{route.pollutionScore}</span>
                </div>
                <div className="mb-4">
                  <LeafletMap 
                    path={path}
                    mapCenter={mapCenter}
                    routeColor={routeColor}
                    isCircular={isCircular}
                    routeSteps={route.steps}
                  />
                </div>
                <div className="mb-2">
                  <span className="font-semibold text-gray-800">Steps:</span>
                  <ol className="list-decimal ml-6 text-gray-800">
                    {route.steps && route.steps.length > 0 ? (
                      route.steps.map((step, idx) => {
                        // Get AQI color for the step
                        const getAQIColor = (aqi: number | null): string => {
                          if (!aqi) return '#6b7280'; // Gray for unknown AQI
                          if (aqi <= 50) return '#22c55e';        // Green - Good
                          if (aqi <= 100) return '#eab308';       // Yellow - Moderate  
                          if (aqi <= 150) return '#f97316';       // Orange - Unhealthy for Sensitive Groups
                          if (aqi <= 200) return '#ef4444';       // Red - Unhealthy
                          if (aqi <= 300) return '#a855f7';       // Purple - Very Unhealthy
                          return '#7c2d12';                       // Maroon - Hazardous
                        };

                        const getAQICategory = (aqi: number | null): string => {
                          if (!aqi) return 'Unknown';
                          if (aqi <= 50) return 'Good';
                          if (aqi <= 100) return 'Moderate';
                          if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
                          if (aqi <= 200) return 'Unhealthy';
                          if (aqi <= 300) return 'Very Unhealthy';
                          return 'Hazardous';
                        };

                        const aqiColor = getAQIColor(step.aqi);
                        const aqiCategory = getAQICategory(step.aqi);
                        
                        return (
                          <li key={idx} className="mb-3 p-3 bg-gray-50 rounded-lg border-l-4" style={{ borderLeftColor: aqiColor }}>
                            <div className="text-gray-800 font-medium" dangerouslySetInnerHTML={{ __html: step.instruction }} />
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                              <span className="text-gray-600">{step.distance} • {step.duration}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">AQI:</span>
                                <span 
                                  className="px-2 py-1 rounded-full text-white font-bold text-xs"
                                  style={{ backgroundColor: aqiColor }}
                                >
                                  {step.aqi || 'N/A'}
                                </span>
                                <span className="text-xs text-gray-500">{aqiCategory}</span>
                              </div>
                            </div>
                          </li>
                        );
                      })
                    ) : (
                      <li className="text-gray-800">No steps found.</li>
                    )}
                  </ol>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
