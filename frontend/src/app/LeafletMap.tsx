"use client";
import { useState, useEffect } from 'react';

// Helper function to determine color based on AQI value
const getAQIColor = (aqi: number | null): string => {
  if (!aqi) return '#6b7280'; // Gray for unknown AQI
  
  if (aqi <= 50) return '#22c55e';        // Green - Good (0-50)
  if (aqi <= 100) return '#eab308';       // Yellow - Moderate (51-100)  
  if (aqi <= 150) return '#f97316';       // Orange - Unhealthy for Sensitive Groups (101-150)
  if (aqi <= 200) return '#ef4444';       // Red - Unhealthy (151-200)
  if (aqi <= 300) return '#a855f7';       // Purple - Very Unhealthy (201-300)
  return '#7c2d12';                       // Maroon - Hazardous (301+)
};

// Helper function to get AQI category name
const getAQICategory = (aqi: number | null): string => {
  if (!aqi) return 'Unknown';
  
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
};

// Simple dynamic component that loads the map only on client side
const LeafletMap = ({ path, mapCenter, routeColor, isCircular, markerIcons, routeSteps }: any) => {
  const [components, setComponents] = useState<any>(null);

  useEffect(() => {
    // Only load on client side
    const loadLeaflet = async () => {
      if (typeof window !== 'undefined') {
        const L = await import('leaflet');
        const reactLeaflet = await import('react-leaflet');
        
        // Fix for default markers
        delete (L.default.Icon.Default.prototype as any)._getIconUrl;
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        setComponents({
          MapContainer: reactLeaflet.MapContainer,
          TileLayer: reactLeaflet.TileLayer,
          Polyline: reactLeaflet.Polyline,
          Marker: reactLeaflet.Marker,
          Popup: reactLeaflet.Popup,
          L: L.default
        });
      }
    };

    loadLeaflet();
  }, []);

  if (!components) {
    return (
      <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 text-center" style={{ height: '300px' }}>
        <div className="text-gray-600 mb-2">🗺️ Loading Map...</div>
      </div>
    );
  }

  const { MapContainer, TileLayer, Polyline, Marker, Popup, L } = components;

  // Create marker icons
  const originIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const destinationIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const circularIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  // Create route segments with individual colors based on AQI
  const createRouteSegments = () => {
    if (!routeSteps || routeSteps.length === 0) {
      // Fallback to single colored route if no steps data
      return path.length > 0 ? (
        <Polyline 
          key="fallback-route"
          positions={path} 
          pathOptions={{ 
            color: routeColor, 
            weight: 5, 
            opacity: 0.8 
          }} 
        />
      ) : null;
    }

    // Create individual segments with AQI-based colors
    return routeSteps.map((step: any, index: number) => {
      const segmentPath = [
        [step.start_location.lat, step.start_location.lng],
        [step.end_location.lat, step.end_location.lng]
      ];
      
      const aqiColor = getAQIColor(step.aqi);
      const aqiCategory = getAQICategory(step.aqi);
      
      return (
        <Polyline
          key={`segment-${index}`}
          positions={segmentPath}
          pathOptions={{
            color: aqiColor,
            weight: 6,
            opacity: 0.9
          }}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-bold">{step.instruction}</div>
              <div className="text-gray-600">{step.distance} • {step.duration}</div>
              <div className="mt-2">
                <span className="font-semibold">AQI: </span>
                <span 
                  className="font-bold px-2 py-1 rounded text-white text-xs"
                  style={{ backgroundColor: aqiColor }}
                >
                  {step.aqi || 'N/A'}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{aqiCategory}</div>
            </div>
          </Popup>
        </Polyline>
      );
    });
  };

  return (
    <div style={{ height: '300px', borderRadius: '1rem', overflow: 'hidden' }}>
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Render AQI-colored route segments */}
        {createRouteSegments()}
        
        {/* Markers */}
        <Marker position={mapCenter} icon={isCircular ? circularIcon : originIcon} />
        {!isCircular && path.length > 1 && (
          <Marker position={path[path.length - 1]} icon={destinationIcon} />
        )}
      </MapContainer>
      
      {/* AQI Legend */}
      {routeSteps && routeSteps.length > 0 && (
        <div className="mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="text-xs font-semibold text-gray-700 mb-2">🌈 Route AQI Color Guide:</div>
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }}></div>
              <span>Good (0-50)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#eab308' }}></div>
              <span>Moderate (51-100)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f97316' }}></div>
              <span>Unhealthy for Sensitive (101-150)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }}></div>
              <span>Unhealthy (151-200)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#a855f7' }}></div>
              <span>Very Unhealthy (201-300)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#7c2d12' }}></div>
              <span>Hazardous (301+)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeafletMap;
