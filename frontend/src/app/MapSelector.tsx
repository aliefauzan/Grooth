import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import { useState, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const fallbackCenter: [number, number] = [-6.2001, 106.8166];

function getLatLng(value: string) {
  const parts = value.split(',');
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (!isFinite(lat) || !isFinite(lng)) return null;
  return [lat, lng] as [number, number];
}

// Custom hook for map click events
function MapClickHandler({ selecting, setFrom, setTo }: any) {
  useMapEvents({
    click: (e) => {
      if (!selecting) return;
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      const value = `${lat},${lng}`;
      if (selecting === 'from') setFrom(value);
      if (selecting === 'to') setTo(value);
    },
  });
  return null;
}

export default function MapSelector({ from, to, setFrom, setTo }: any) {
  const [selecting, setSelecting] = useState<'from' | 'to' | null>(null);
  const [userCenter, setUserCenter] = useState<[number, number]>(fallbackCenter);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCenter([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const fromLatLng = getLatLng(from);
  const toLatLng = getLatLng(to);
  const center = fromLatLng || userCenter;

  // Custom marker icons
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
      <div className="rounded-2xl overflow-hidden shadow border border-gray-300" style={{ height: '400px' }}>
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler selecting={selecting} setFrom={setFrom} setTo={setTo} />
          {fromLatLng && (
            <Marker position={fromLatLng} icon={originIcon} />
          )}
          {toLatLng && (
            <Marker position={toLatLng} icon={destinationIcon} />
          )}
        </MapContainer>
      </div>
      <div className="text-sm text-gray-700 mt-3 text-center font-medium">
        <span className="text-blue-700 font-semibold">Click the map</span> to set your <span className="text-blue-700 font-semibold">origin</span> or <span className="text-green-700 font-semibold">destination</span>.<br />
        Your <span className="text-green-700 font-semibold">current location</span> is used as default center.
      </div>
    </div>
  );
}
