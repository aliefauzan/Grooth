import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useState, useEffect } from 'react';

const containerStyle = {
  width: '100%',
  height: '400px',
};

const fallbackCenter = {
  lat: -6.2001,
  lng: 106.8166,
};

function getLatLng(value: string) {
  const parts = value.split(',');
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (!isFinite(lat) || !isFinite(lng)) return null;
  return { lat, lng };
}

export default function MapSelector({ from, to, setFrom, setTo }: any) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['visualization'],
  });
  const [selecting, setSelecting] = useState<'from' | 'to' | null>(null);
  const [userCenter, setUserCenter] = useState(fallbackCenter);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }
  }, []);

  if (!isLoaded) return <div className="mb-6 p-4 bg-white rounded shadow">Loading Map...</div>;

  const fromLatLng = getLatLng(from);
  const toLatLng = getLatLng(to);
  const center = fromLatLng || userCenter;

  return (
    <div className="mb-6 bg-white rounded-2xl shadow-xl border border-gray-200 p-6 max-w-lg mx-auto">
      <div className="flex gap-2 justify-center mb-4">
        <button
          className={`px-5 py-2 rounded-full font-semibold shadow transition-colors duration-200 text-base tracking-wide border ${selecting === 'from' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'}`}
          onClick={() => setSelecting('from')}
        >
          <span className="drop-shadow">Select <span className="font-bold">Origin</span></span>
        </button>
        <button
          className={`px-5 py-2 rounded-full font-semibold shadow transition-colors duration-200 text-base tracking-wide border ${selecting === 'to' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-700 border-green-300 hover:bg-green-50'}`}
          onClick={() => setSelecting('to')}
        >
          <span className="drop-shadow">Select <span className="font-bold">Destination</span></span>
        </button>
      </div>
      <div className="rounded-2xl overflow-hidden shadow border border-gray-300">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={13}
          onClick={(e) => {
            if (!selecting) return;
            const lat = e.latLng?.lat();
            const lng = e.latLng?.lng();
            if (lat && lng) {
              const value = `${lat},${lng}`;
              if (selecting === 'from') setFrom(value);
              if (selecting === 'to') setTo(value);
            }
          }}
        >
          {fromLatLng && (
            <Marker position={fromLatLng} label="A" />
          )}
          {toLatLng && (
            <Marker position={toLatLng} label="B" />
          )}
        </GoogleMap>
      </div>
      <div className="text-sm text-gray-700 mt-3 text-center font-medium">
        <span className="text-blue-700 font-semibold">Click the map</span> to set your <span className="text-blue-700 font-semibold">origin</span> or <span className="text-green-700 font-semibold">destination</span>.<br />
        Your <span className="text-green-700 font-semibold">current location</span> is used as default center.
      </div>
    </div>
  );
}

// Leaflet version (optional, commented out)
// import { MapContainer, Marker as LeafletMarker, TileLayer, useMapEvents } from 'react-leaflet';
// import 'leaflet/dist/leaflet.css';
// export function LeafletMapSelector({ from, to, setFrom, setTo }: any) {
//   ...implement similar logic using react-leaflet...
// }
