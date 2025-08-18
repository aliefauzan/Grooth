
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
  polyline?: Array<{ lat: number; lng: number }>; // Add polyline for detailed route rendering
};

type RouteOption = {
  type?: string;
  from: string;
  to: string;
  steps: RouteStep[];
  pollutionScore: string;
  avgAQI: number;
  recommended: boolean;
  isCircular?: boolean;
  requestedDuration?: string;
  requestedDistance?: string;
  routeHash?: string; // Add hash for duplicate detection
  fullPolyline?: Array<{ lat: number; lng: number }>; // Add full route polyline
};

type RouteResponse = {
  best?: RouteOption;
  alternative?: RouteOption;
  worst?: RouteOption;
  alternatives?: RouteOption[];
  isCircular?: boolean;
  warning?: string; // Add warning for single route scenarios
  routeCount?: number; // Add route count info
  fallbackUsed?: boolean; // Add fallback indicator
  error?: string;
  suggestions?: string[];
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
  const [selectedRouteType, setSelectedRouteType] = useState<'best' | 'alternative' | 'worst'>('best');

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
        <div className="mt-8 w-full max-w-4xl">
          <h2 className="text-xl font-bold mb-4 text-blue-700">
            {isCircular ? "🔄 Circular Route Results" : "🗺️ Route Results"}
          </h2>
          
          {/* Show warning if only one route available */}
          {result.warning && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <span className="text-yellow-600 text-xl">⚠️</span>
                <div>
                  <div className="font-semibold text-yellow-800">Limited Route Options</div>
                  <div className="text-sm text-yellow-700 mt-1">{result.warning}</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Show route count info */}
          {result.routeCount && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="text-blue-800 font-medium text-sm">
                📊 Found {result.routeCount} unique route{result.routeCount > 1 ? 's' : ''} 
                {result.routeCount === 1 ? ' (showing single available option)' : ' with different air quality profiles'}
                {result.fallbackUsed && (
                  <span className="block text-blue-600 text-xs mt-1">
                    ⚡ Using optimized routing for long-distance travel
                  </span>
                )}
              </div>
            </div>
          )}
          
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
          
          {/* Route Type Pagination Selector */}
          <div className="mb-6 bg-white rounded-xl shadow-lg p-4">
            <div className="flex justify-center">
              <div className="flex bg-gray-100 rounded-lg p-1 space-x-1">
                {([
                  { key: 'best', label: 'Good Route', icon: '🥇', color: 'green' },
                  { key: 'alternative', label: 'Alternative Route', icon: '🥈', color: 'yellow' },
                  { key: 'worst', label: 'Bad Route', icon: '🥉', color: 'red' }
                ] as const).map(({ key, label, icon, color }) => {
                  const route = (result as any)[key] as RouteOption | undefined;
                  const isSelected = selectedRouteType === key;
                  const isAvailable = !!route;
                  
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedRouteType(key)}
                      disabled={!isAvailable}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-md font-semibold transition-all duration-200
                        ${isSelected
                          ? key === 'best' 
                            ? 'bg-green-600 text-white shadow-md'
                            : key === 'alternative'
                            ? 'bg-orange-600 text-white shadow-md'
                            : 'bg-red-600 text-white shadow-md'
                          : isAvailable
                          ? key === 'best'
                            ? 'bg-white text-green-700 hover:bg-green-50 border border-green-200'
                            : key === 'alternative'
                            ? 'bg-white text-orange-700 hover:bg-orange-50 border border-orange-200'
                            : 'bg-white text-red-700 hover:bg-red-50 border border-red-200'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }
                      `}
                    >
                      <span className="text-lg">{icon}</span>
                      <span className="text-sm font-medium">{label}</span>
                      {!isAvailable && <span className="text-xs">(N/A)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Route Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {([
                { key: 'best', label: 'Good Route', icon: '🥇', color: 'green' },
                { key: 'alternative', label: 'Alternative', icon: '🥈', color: 'yellow' },
                { key: 'worst', label: 'Bad Route', icon: '🥉', color: 'red' }
              ] as const).map(({ key, label, icon, color }) => {
                const route = (result as any)[key] as RouteOption | undefined;
                if (!route) return null;
                
                const isSelected = selectedRouteType === key;
                
                return (
                  <div
                    key={key}
                    className={`
                      p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer
                      ${isSelected
                        ? key === 'best'
                          ? 'border-green-500 bg-green-50 shadow-md'
                          : key === 'alternative'
                          ? 'border-orange-500 bg-orange-50 shadow-md'
                          : 'border-red-500 bg-red-50 shadow-md'
                        : key === 'best'
                        ? 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-25'
                        : key === 'alternative'
                        ? 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-25'
                        : 'border-gray-200 bg-white hover:border-red-300 hover:bg-red-25'
                      }
                    `}
                    onClick={() => setSelectedRouteType(key)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{icon}</span>
                      <span className={`font-semibold ${
                        key === 'best' ? 'text-green-700' : 
                        key === 'alternative' ? 'text-orange-700' : 
                        'text-red-700'
                      }`}>{label}</span>
                      {route.routeHash && result.routeCount === 1 && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                          Same Route
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className={`font-medium ${
                        key === 'best' ? 'text-green-600' : 
                        key === 'alternative' ? 'text-orange-600' : 
                        'text-red-600'
                      }`}>
                        Air Quality: {route.pollutionScore}
                      </div>
                      <div className="text-gray-600">
                        Avg AQI: {route.avgAQI || 'N/A'}
                      </div>
                      <div className="text-gray-600">
                        Steps: {route.steps?.length || 0}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Route Details */}
          {(() => {
            const selectedRoute = (result as any)[selectedRouteType] as RouteOption | undefined;
            if (!selectedRoute) return null;
            
            // Polyline path for this route - use full polyline if available, otherwise fall back to step coordinates
            const path = selectedRoute.fullPolyline && selectedRoute.fullPolyline.length > 0
              ? selectedRoute.fullPolyline.map((point) => [point.lat, point.lng] as [number, number])
              : selectedRoute.steps && selectedRoute.steps.length > 0 
                ? selectedRoute.steps.map((step) => [step.start_location.lat, step.start_location.lng] as [number, number])
                    .concat([[selectedRoute.steps[selectedRoute.steps.length - 1].end_location.lat, selectedRoute.steps[selectedRoute.steps.length - 1].end_location.lng]])
                : [];
            
            // AQI color
            const aqiColor = selectedRoute.pollutionScore === 'Good' ? 'text-green-700' : selectedRoute.pollutionScore === 'Moderate' ? 'text-yellow-600' : 'text-red-600';
            
            // Default center if no path
            const mapCenter: [number, number] = path.length > 0 ? path[0] : [-6.2088, 106.8456];
            
            // Route color based on quality
            const routeColor = selectedRouteType === 'best' ? '#22c55e' : selectedRouteType === 'worst' ? '#ef4444' : '#eab308';
            
            return (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                {/* Route Header */}
                <div className={`
                  p-6 border-b border-gray-200
                  ${selectedRouteType === 'best' ? 'bg-green-50' : 
                    selectedRouteType === 'worst' ? 'bg-red-50' : 'bg-yellow-50'}
                `}>
                  <h3 className={`font-bold text-xl mb-4 flex items-center gap-2 ${
                    selectedRouteType === 'best' ? 'text-green-700' : 
                    selectedRouteType === 'worst' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {selectedRouteType === 'best' ? '🥇' : selectedRouteType === 'worst' ? '🥉' : '🥈'} 
                    {selectedRouteType === 'best' ? 'Good Route' : 
                     selectedRouteType === 'worst' ? 'Bad Route' : 'Alternative Route'}
                    {selectedRoute.recommended && (
                      <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                        Recommended
                      </span>
                    )}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {!isCircular && (
                      <>
                        <div>
                          <span className="font-semibold text-blue-700">From:</span>
                          <div className="font-bold text-blue-900 break-words">{selectedRoute.from}</div>
                        </div>
                        <div>
                          <span className="font-semibold text-green-700">To:</span>
                          <div className="font-bold text-green-900 break-words">{selectedRoute.to}</div>
                        </div>
                      </>
                    )}
                    {isCircular && (
                      <div className="md:col-span-2">
                        <span className="font-semibold text-purple-700">Round Trip:</span>
                        <div className="font-bold text-purple-900 break-words">{selectedRoute.from} → Loop → {selectedRoute.from}</div>
                      </div>
                    )}
                    <div>
                      <span className="font-semibold text-gray-800">Air Quality:</span>
                      <div className={`font-bold text-lg ${aqiColor}`}>
                        {selectedRoute.pollutionScore}
                        <div className="text-sm font-normal text-gray-600">
                          Avg AQI: {selectedRoute.avgAQI || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Map Section */}
                <div className="p-6 border-b border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    🗺️ Route Map
                  </h4>
                  <div className="rounded-lg overflow-hidden shadow-md">
                    <LeafletMap 
                      path={path}
                      mapCenter={mapCenter}
                      routeColor={routeColor}
                      isCircular={isCircular}
                      routeSteps={selectedRoute.steps}
                    />
                  </div>
                </div>

                {/* Steps Section */}
                <div className="p-6">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    📋 Route Steps ({selectedRoute.steps?.length || 0} steps)
                  </h4>
                  <div className="max-h-96 overflow-y-auto">
                    <ol className="space-y-3">
                      {selectedRoute.steps && selectedRoute.steps.length > 0 ? (
                        selectedRoute.steps.map((step, idx) => {
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
                            <li key={idx} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border-l-4" style={{ borderLeftColor: aqiColor }}>
                              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                {idx + 1}
                              </div>
                              <div className="flex-grow">
                                <div className="text-gray-800 font-medium mb-2" dangerouslySetInnerHTML={{ __html: step.instruction }} />
                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <span>📏</span>
                                    <span>{step.distance}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <span>⏱️</span>
                                    <span>{step.duration}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-600">🌬️ AQI:</span>
                                    <span 
                                      className="px-2 py-1 rounded-full text-white font-bold text-xs"
                                      style={{ backgroundColor: aqiColor }}
                                    >
                                      {step.aqi || 'N/A'}
                                    </span>
                                    <span className="text-xs text-gray-500">{aqiCategory}</span>
                                  </div>
                                </div>
                              </div>
                            </li>
                          );
                        })
                      ) : (
                        <li className="text-gray-600 text-center py-8">No steps found for this route.</li>
                      )}
                    </ol>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
