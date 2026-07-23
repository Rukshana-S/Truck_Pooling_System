'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { trackingAPI } from '@/services/api';
import { toast } from 'react-hot-toast';
import Sidebar from '@/components/Sidebar';

async function geocode(query) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (_) {}
  return null;
}

const JOURNEY_STATUSES = [
  { label: 'Pickup Started', icon: 'fa-truck-arrow-right' },
  { label: 'In Transit', icon: 'fa-truck-fast' },
  { label: 'Near Destination', icon: 'fa-location-dot' },
  { label: 'Delivered', icon: 'fa-house-circle-check' },
];

export default function DriverTracking() {
  const { id } = useParams();
  const router = useRouter();
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const simIntervalRef = useRef(null);
  const simCoordsRef = useRef(null);

  const [isSharing, setIsSharing] = useState(false);
  const [simulate, setSimulate] = useState(false);
  const [location, setLocation] = useState(null);
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState(null);

  useEffect(() => {
    const fetchShipment = async () => {
      try {
        const res = await trackingAPI.track(id);
        const data = res.data;
        setShipment(data);
        setCurrentStatus(data.currentStatus || data.status);
        const pickupCity = data.pickup || data.fromLocation;
        const dropCity = data.drop || data.toLocation;
        if (pickupCity && dropCity) {
          const [from, to] = await Promise.all([geocode(pickupCity), geocode(dropCity)]);
          simCoordsRef.current = { from, to };
        }
      } catch (err) {
        toast.error('Failed to load shipment details');
      } finally {
        setLoading(false);
      }
    };
    fetchShipment();

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const socketUrl = baseUrl.includes('/api') ? baseUrl.replace('/api', '') : baseUrl;
    socketRef.current = io(socketUrl);

    return () => {
      stopTracking();
      socketRef.current?.disconnect();
    };
  }, [id]);

  const updateStatus = useCallback(async (status) => {
    try {
      await trackingAPI.updateStatus(id, { status, lat: location?.lat, lng: location?.lng });
      setCurrentStatus(status);
      socketRef.current?.emit('status_update', { trackingId: id, status, timestamp: Date.now() });
      toast.success(`Status: ${status}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  }, [id, location]);

  const startTracking = () => {
    const socket = socketRef.current;
    if (!socket) return;
    setIsSharing(true);
    socket.emit('join_tracking', id);
    updateStatus('Pickup Started');

    if (simulate) {
      const coords = simCoordsRef.current;
      let lat = coords?.from?.lat ?? 13.0827;
      let lng = coords?.from?.lng ?? 80.2707;
      const toLat = coords?.to?.lat ?? (lat + 0.5);
      const toLng = coords?.to?.lng ?? (lng + 0.5);
      const steps = 50; // 50 steps × 2s = ~100s total journey
      const dLat = (toLat - lat) / steps;
      const dLng = (toLng - lng) / steps;
      let step = 0;

      simIntervalRef.current = setInterval(() => {
        step++;
        lat = lat + dLat;
        lng = lng + dLng;
        const newLoc = { lat, lng };
        setLocation(newLoc);
        socket.emit('location_update', { trackingId: id, lat, lng, timestamp: Date.now() });
        const pct = step / steps;
        if (pct >= 0.2 && pct < 0.6) updateStatus('In Transit');
        else if (pct >= 0.6 && pct < 0.9) updateStatus('Near Destination');
        else if (pct >= 0.9) { updateStatus('Delivered'); clearInterval(simIntervalRef.current); }
      }, 2000); // 2 seconds per step — visibly moves on map
    } else {
      if (!navigator.geolocation) { toast.error('Geolocation not supported. Try Simulation Mode.'); return; }
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(newLoc);
          socket.emit('location_update', { trackingId: id, ...newLoc, timestamp: Date.now() });
        },
        (err) => toast.error('GPS error: ' + err.message),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
      );
    }
  };

  const stopTracking = () => {
    setIsSharing(false);
    socketRef.current?.emit('leave_tracking', id);
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
  };

  if (loading) return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, border: '4px solid #dbeafe', borderTopColor: '#1E3A8A', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }}></div>
          <p style={{ color: '#64748b', fontWeight: 500, marginTop: 16 }}>Loading shipment...</p>
        </div>
      </main>
    </div>
  );

  if (!shipment) return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', flexDirection: 'column', gap: 16 }}>
        <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 48, color: '#ef4444' }}></i>
        <p style={{ color: '#1e293b', fontWeight: 700, fontSize: 18 }}>Shipment not found</p>
        <button onClick={() => router.back()} className="btn-blue" style={{ padding: '10px 24px' }}>← Go Back</button>
      </main>
    </div>
  );

  const pickup = shipment.pickup || shipment.fromLocation || '—';
  const drop = shipment.drop || shipment.toLocation || '—';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar />
      <main className="p-mobile-16" style={{ flex: 1, padding: '28px 24px 80px', background: '#f8fafc', overflowY: 'auto' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Back */}
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#1E3A8A', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, padding: 0, alignSelf: 'flex-start' }}>
          <i className="fa-solid fa-arrow-left"></i> Back to Shipments
        </button>

        {/* Route Card */}
        <div className="card" style={{ padding: 24, background: 'linear-gradient(135deg, #1E3A8A 0%, #162d6e 100%)', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Tracking ID</p>
              <p style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.3px' }}>{id}</p>
            </div>
            <span style={{
              padding: '5px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              background: currentStatus === 'Delivered' ? '#10b981' : currentStatus === 'In Transit' ? '#3b82f6' : 'rgba(255,255,255,0.2)',
              color: 'white',
            }}>
              {currentStatus || 'Pending'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 10, opacity: 0.7, fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>From</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 3px rgba(34,197,94,0.3)' }}></div>
                <p style={{ fontSize: 17, fontWeight: 800 }}>{pickup}</p>
              </div>
            </div>
            <i className="fa-solid fa-arrow-right" style={{ fontSize: 18, color: '#F97316' }}></i>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <p style={{ fontSize: 10, opacity: 0.7, fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>To</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                <p style={{ fontSize: 17, fontWeight: 800 }}>{drop}</p>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.3)' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Simulation Toggle */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                <i className="fa-solid fa-satellite-dish" style={{ color: '#1E3A8A', marginRight: 8 }}></i>
                Simulation Mode
              </p>
              <p style={{ fontSize: 12, color: '#64748b' }}>
                Simulates GPS movement from <b>{pickup}</b> → <b>{drop}</b>
              </p>
            </div>
            <label style={{ cursor: isSharing ? 'not-allowed' : 'pointer', flexShrink: 0 }} onClick={() => !isSharing && setSimulate(v => !v)}>
              <div style={{
                width: 50, height: 28, borderRadius: 14, position: 'relative', transition: 'background 0.2s',
                background: simulate ? '#1E3A8A' : '#cbd5e1',
              }}>
                <div style={{
                  position: 'absolute', top: 4, width: 20, height: 20, borderRadius: '50%', background: 'white',
                  transition: 'left 0.2s', left: simulate ? 26 : 4,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                }}></div>
              </div>
            </label>
          </div>
        </div>

        {/* Start / Stop Button */}
        <div className="card" style={{ padding: 20 }}>
          {!isSharing ? (
            <button onClick={startTracking} className="btn-primary" style={{
              width: '100%', justifyContent: 'center', padding: '14px 0',
              fontSize: 16, background: 'linear-gradient(135deg, #F97316, #fb923c)',
            }}>
              <i className="fa-solid fa-location-arrow"></i> Start Journey &amp; Share Live Location
            </button>
          ) : (
            <button onClick={stopTracking} style={{
              width: '100%', padding: '14px 0', background: 'linear-gradient(135deg, #dc2626, #ef4444)',
              color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 16,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <i className="fa-solid fa-circle-stop"></i> Stop Sharing Location
            </button>
          )}

          {isSharing && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginTop: 14,
              padding: '10px 14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0',
            }}>
              <div style={{ width: 10, height: 10, background: '#22c55e', borderRadius: '50%', animation: 'ping 1s infinite', flexShrink: 0 }}></div>
              <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 14 }}>Live location sharing active</span>
              {location && (
                <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 'auto' }}>
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Manual Status Buttons */}
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
            <i className="fa-solid fa-sliders" style={{ marginRight: 6 }}></i>Manual Status Update
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {JOURNEY_STATUSES.map(({ label, icon }) => (
              <button
                key={label}
                onClick={() => updateStatus(label)}
                style={{
                  padding: '10px 8px',
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.15s',
                  // No borderColor - use full border shorthand only
                  border: currentStatus === label ? '2px solid #1E3A8A' : '1.5px solid #e2e8f0',
                  background: currentStatus === label ? '#dbeafe' : 'white',
                  color: currentStatus === label ? '#1E3A8A' : '#475569',
                }}
              >
                <i className={`fa-solid ${icon}`}></i> {label}
              </button>
            ))}
          </div>
        </div>

      </div>
      </main>
    </div>
  );
}
