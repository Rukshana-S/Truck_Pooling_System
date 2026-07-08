"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Custom icons using FontAwesome SVGs or similar
const createIcon = (color, faClass) => {
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div style="background-color: ${color}; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); font-size: 16px;">
             <i class="${faClass}"></i>
           </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

const pickupIcon = createIcon('#22c55e', 'fa-solid fa-box');
const dropIcon = createIcon('#F97316', 'fa-solid fa-location-dot');
const truckIcon = createIcon('#1E3A8A', 'fa-solid fa-truck');

// Helper component to adjust bounds automatically
function MapBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, positions]);
  return null;
}

export default function LiveMap({ pickupPos, dropPos, truckPos }) {
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    const validPositions = [pickupPos, dropPos].filter(Boolean);
    if (validPositions.length > 0) {
      setPositions(validPositions);
    }
  }, [pickupPos, dropPos]);

  if (!positions || positions.length === 0) {
    return (
      <div style={{ height: '400px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: 12 }}>
        <p style={{ color: '#94a3b8' }}>Loading map data...</p>
      </div>
    );
  }

  // Determine initial center
  const center = positions[0];

  return (
    <div style={{ height: '400px', width: '100%', borderRadius: 12, overflow: 'hidden' }}>
      <MapContainer center={center} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {pickupPos && (
          <Marker position={pickupPos} icon={pickupIcon}>
            <Popup><strong>Pickup Location</strong></Popup>
          </Marker>
        )}
        
        {dropPos && (
          <Marker position={dropPos} icon={dropIcon}>
            <Popup><strong>Destination</strong></Popup>
          </Marker>
        )}

        {truckPos && (
          <Marker position={truckPos} icon={truckIcon}>
            <Popup><strong>Current Truck Location</strong></Popup>
          </Marker>
        )}
        
        {pickupPos && dropPos && (
          <Polyline positions={[pickupPos, dropPos]} pathOptions={{ color: '#94a3b8', weight: 4, dashArray: '10, 10' }} />
        )}

        <MapBounds positions={positions} />
      </MapContainer>
    </div>
  );
}
