'use client';
import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix broken default icons in webpack/Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Icons (created once outside React, avoids recreation on every render) ──
const PICKUP_ICON = L.divIcon({
  className: '',
  iconSize: [34, 44],
  iconAnchor: [17, 44],
  popupAnchor: [0, -44],
  html: `<div style="
    width:34px;height:44px;
    display:flex;flex-direction:column;align-items:center;
  ">
    <div style="
      width:30px;height:30px;background:#16a34a;border-radius:50%;
      border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;font-size:15px;
    ">📦</div>
    <div style="width:2px;height:12px;background:#16a34a;"></div>
  </div>`,
});

const DROP_ICON = L.divIcon({
  className: '',
  iconSize: [34, 44],
  iconAnchor: [17, 44],
  popupAnchor: [0, -44],
  html: `<div style="
    width:34px;height:44px;
    display:flex;flex-direction:column;align-items:center;
  ">
    <div style="
      width:30px;height:30px;background:#dc2626;border-radius:50%;
      border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;font-size:15px;
    ">🏁</div>
    <div style="width:2px;height:12px;background:#dc2626;"></div>
  </div>`,
});

const TRUCK_ICON = L.divIcon({
  className: '',
  iconSize: [52, 32],
  iconAnchor: [26, 16],
  popupAnchor: [0, -20],
  html: `<div style="font-size:36px;line-height:1;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4));transform:scaleX(1);">🚛</div>`,
});

// ── Sub-component: pans the map smoothly when driver location changes ──────
function TruckPanner({ position }) {
  const map = useMap();
  const prevPos = useRef(null);

  useEffect(() => {
    if (!position) return;
    const [lat, lng] = position;
    const prev = prevPos.current;
    const moved = !prev || Math.abs(prev[0] - lat) > 0.00005 || Math.abs(prev[1] - lng) > 0.00005;
    if (moved) {
      map.panTo([lat, lng], { animate: true, duration: 1 });
      prevPos.current = [lat, lng];
    }
  }, [position, map]);

  return null;
}

// ── Main map component ──────────────────────────────────────────────────────
// NOTE: No `key` prop on MapContainer — that causes the "already initialized" error.
// Leaflet manages the DOM itself; React should never unmount+remount MapContainer.
export default function TrackingMap({ driverLocation, pickupLoc, dropLoc, pickupName, dropName }) {
  // Initial center: pickup if geocoded, else driver, else default to Tamil Nadu
  const initialCenter = useMemo(
    () => pickupLoc || driverLocation || [11.1271, 78.6569],
    [] // only computed once — never changes after mount
  );

  return (
    <MapContainer
      center={initialCenter}
      zoom={pickupLoc ? 8 : 10}
      style={{ height: '420px', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {/* Auto-pan map as truck moves */}
      {driverLocation && <TruckPanner position={driverLocation} />}

      {/* Dashed route line between pickup and drop */}
      {pickupLoc && dropLoc && (
        <Polyline
          positions={[pickupLoc, dropLoc]}
          color="#1E3A8A"
          dashArray="10,12"
          weight={3}
          opacity={0.55}
        />
      )}

      {/* Pickup marker */}
      {pickupLoc && (
        <Marker position={pickupLoc} icon={PICKUP_ICON}>
          <Popup><b>📦 Pickup</b><br />{pickupName || 'Pickup Location'}</Popup>
        </Marker>
      )}

      {/* Destination marker */}
      {dropLoc && (
        <Marker position={dropLoc} icon={DROP_ICON}>
          <Popup><b>🏁 Destination</b><br />{dropName || 'Drop Location'}</Popup>
        </Marker>
      )}

      {/* 🚛 Moving truck — rendered last so it's always on top */}
      {driverLocation && (
        <Marker position={driverLocation} icon={TRUCK_ICON} zIndexOffset={2000}>
          <Popup><b>🚛 Driver — Live Location</b></Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
