
"use client";
import dynamic from "next/dynamic";
const MapSelector = dynamic(() => import("./MapSelector"), { ssr: false });
import { GoogleMap, Polyline, Marker, HeatmapLayer } from '@react-google-maps/api';
import { useState } from "react";

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
};

type RouteResponse = {
  best?: RouteOption;
  alternative?: RouteOption;
  worst?: RouteOption;
  alternatives?: RouteOption[];
};

export default function Home() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteResponse | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(
        `/api/route?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      );
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError("Failed to fetch route");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">BreezyPath MVP Demo</h1>
      <form
        className="bg-white shadow rounded p-6 flex flex-col gap-4 w-full max-w-md"
        onSubmit={handleSubmit}
      >
        <MapSelector from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <label className="font-semibold text-blue-700">Origin (lat,lng or address)</label>
        <input
          className="border rounded px-3 py-2 text-gray-800 font-bold bg-blue-50 focus:bg-white focus:border-blue-500"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder="e.g. -6.2001,106.8166 or address"
          required
        />
        <label className="font-semibold text-green-700">Destination (lat,lng or address)</label>
        <input
          className="border rounded px-3 py-2 text-gray-800 font-bold bg-green-50 focus:bg-white focus:border-green-500"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="e.g. -6.1745,106.8227 or address"
          required
        />
        <button
          className="bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700"
          type="submit"
          disabled={loading}
        >
          {loading ? "Loading..." : "Find Route"}
        </button>
      </form>

      {error && <div className="text-red-600 mt-4">{error}</div>}

      {result && (
        <div className="mt-8 w-full max-w-3xl">
          <h2 className="text-xl font-bold mb-4 text-blue-700">Routes</h2>
          {["best", "alternative", "worst"].map((key) => {
            const route = (result as any)[key] as RouteOption | undefined;
            if (!route) return null;
            // Polyline path for this route
            const path = route.steps.map((step) => step.start_location);
            if (route.steps.length > 0) path.push(route.steps[route.steps.length - 1].end_location);
            // AQI color
            const aqiColor = route.pollutionScore === 'Good' ? 'text-green-700' : route.pollutionScore === 'Moderate' ? 'text-yellow-600' : 'text-red-600';
            // Heatmap data
            const heatmapData = route.steps.map((step) => ({
              location: new window.google.maps.LatLng(step.start_location.lat, step.start_location.lng),
              weight: step.aqi || 0
            }));
            return (
              <div key={key} className="mb-8 p-6 bg-white rounded-2xl shadow-xl border border-gray-200">
                <h3 className={`font-bold text-lg mb-2 capitalize ${key === 'best' ? 'text-green-700' : key === 'worst' ? 'text-red-600' : 'text-yellow-600'}`}>{key} Route</h3>
                <div className="mb-2">
                  <span className="font-semibold text-blue-700">From:</span> <span className="font-bold text-blue-900">{route.from}</span>
                </div>
                <div className="mb-2">
                  <span className="font-semibold text-green-700">To:</span> <span className="font-bold text-green-900">{route.to}</span>
                </div>
                <div className="mb-2">
                  <span className="font-semibold text-gray-800">Air Quality:</span> <span className={`font-bold ${aqiColor}`}>{route.pollutionScore}</span>
                </div>
                <div className="mb-4">
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '300px', borderRadius: '1rem' }}
                    center={path[0]}
                    zoom={13}
                  >
                    <Polyline path={path} options={{ strokeColor: key === 'best' ? '#22c55e' : key === 'worst' ? '#ef4444' : '#eab308', strokeWeight: 5, strokeOpacity: 0.8 }} />
                    <HeatmapLayer
                      data={heatmapData}
                      options={{ radius: 30, opacity: 0.5, gradient: ['#22c55e', '#eab308', '#ef4444'] }}
                    />
                    <Marker position={path[0]} label="A" />
                    <Marker position={path[path.length - 1]} label="B" />
                  </GoogleMap>
                </div>
                <div className="mb-2">
                  <span className="font-semibold text-gray-800">Steps:</span>
                  <ol className="list-decimal ml-6 text-gray-800">
                    {route.steps && route.steps.length > 0 ? (
                      route.steps.map((step, idx) => (
                        <li key={idx} className="mb-2">
                          <div className="text-gray-800" dangerouslySetInnerHTML={{ __html: step.instruction }} />
                          <div className={`text-sm font-bold ${step.aqi && step.aqi <= 50 ? 'text-green-600' : step.aqi && step.aqi <= 100 ? 'text-yellow-700' : 'text-red-600'} drop-shadow`}>
                            {step.distance} ({step.duration}) | AQI: <span className={step.aqi && step.aqi <= 50 ? 'text-green-700' : step.aqi && step.aqi <= 100 ? 'text-yellow-600' : 'text-red-600'}>{step.aqi}</span>
                          </div>
                        </li>
                      ))
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
