'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { trackingAPI } from '@/services/api';
import { toast } from 'react-hot-toast';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';

const TrackingMap = dynamic(() => import('../../../../components/TrackingMap'), { ssr: false });

async function geocode(query) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    if (data && data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch (_) {}
  return null;
}

function haversineKm(loc1, loc2) {
  if (!loc1 || !loc2) return null;
  const [lat1, lon1] = loc1;
  const [lat2, lon2] = loc2;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Deduplicate timeline: keep last occurrence of each status by timestamp
function deduplicateTimeline(events) {
  if (!events || events.length === 0) return [];
  const seen = new Map();
  // Keep the most recent entry per status
  events.forEach(ev => {
    const key = ev.status;
    if (!seen.has(key) || new Date(ev.timestamp) > new Date(seen.get(key).timestamp)) {
      seen.set(key, ev);
    }
  });
  // Sort by timestamp ascending
  return [...seen.values()].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

const STATUS_STAGES = [
  { label: 'Accepted', icon: 'fa-handshake' },
  { label: 'Pickup Started', icon: 'fa-truck-arrow-right' },
  { label: 'In Transit', icon: 'fa-truck-fast' },
  { label: 'Near Destination', icon: 'fa-location-dot' },
  { label: 'Delivered', icon: 'fa-house-circle-check' },
];

function getStageState(currentStatus, stageLabel) {
  const idx = STATUS_STAGES.findIndex(s => s.label === stageLabel);
  const cur = STATUS_STAGES.findIndex(s => s.label === currentStatus);
  if (cur === -1) return 'pending';
  if (idx < cur) return 'completed';
  if (idx === cur) return 'active';
  return 'pending';
}

const BADGE_STYLES = {
  'Delivered':        { background: '#d1fae5', color: '#065f46' },
  'In Transit':       { background: '#dbeafe', color: '#1e40af' },
  'Near Destination': { background: '#fef3c7', color: '#92400e' },
  'Pickup Started':   { background: '#ede9fe', color: '#5b21b6' },
  'Accepted':         { background: '#e0f2fe', color: '#075985' },
};

function getBadge(status) { return BADGE_STYLES[status] || { background: '#f1f5f9', color: '#475569' }; }

export default function OrgTracking() {
  const { id } = useParams();
  const router = useRouter();
  const [shipment, setShipment] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState([]);
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropCoords, setDropCoords] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(null);

  useEffect(() => {
    const fetchShipment = async () => {
      try {
        const res = await trackingAPI.track(id);
        const data = res.data;
        setShipment(data);
        setCurrentStatus(data.currentStatus || data.status);

        // Deduplicate the fetched timeline
        const raw = data.timeline || [];
        setTimeline(deduplicateTimeline(raw));

        const pickupName = data.pickup || data.fromLocation;
        const dropName   = data.drop   || data.toLocation;
        if (pickupName && dropName) {
          setGeocoding(true);
          const [pCoords, dCoords] = await Promise.all([geocode(pickupName), geocode(dropName)]);
          setPickupCoords(pCoords);
          setDropCoords(dCoords);
          setGeocoding(false);
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
    const socket = io(socketUrl);

    // Join tracking room after connection is established
    const joinRoom = () => socket.emit('join_tracking', id);
    if (socket.connected) joinRoom();
    else socket.on('connect', joinRoom);

    socket.on('driver_location_update', (data) => {
      setDriverLocation([data.lat, data.lng]);
    });

    socket.on('shipment_status_update', (data) => {
      const newStatus = data.status;
      setCurrentStatus(newStatus);
      setShipment(prev => prev ? { ...prev, currentStatus: newStatus, status: newStatus } : prev);
      // Add new event and re-deduplicate so no duplicates accumulate live
      setTimeline(prev => deduplicateTimeline([
        ...prev,
        { status: newStatus, timestamp: data.timestamp, note: `Status updated to ${newStatus}` }
      ]));
      toast.success(`Shipment: ${newStatus}`);
      if (data.lat && data.lng) setDriverLocation([data.lat, data.lng]);
    });

    return () => socket.disconnect();
  }, [id]);

  if (loading) return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, border: '4px solid #dbeafe', borderTopColor: '#1E3A8A', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }}></div>
          <p style={{ color: '#64748b', fontWeight: 500, marginTop: 16 }}>Loading live tracking...</p>
        </div>
      </main>
    </div>
  );

  if (!shipment) return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', flexDirection: 'column', gap: 16 }}>
        <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 52, color: '#ef4444' }}></i>
        <p style={{ color: '#1e293b', fontWeight: 700, fontSize: 20 }}>Shipment not found</p>
        <button onClick={() => router.back()} className="btn-blue" style={{ padding: '10px 24px' }}>← Go Back</button>
      </main>
    </div>
  );

  const pickup = shipment.pickup || shipment.fromLocation || '—';
  const drop   = shipment.drop   || shipment.toLocation   || '—';
  const distKm = haversineKm(driverLocation, dropCoords);
  const etaMin = distKm ? Math.round((distKm / 40) * 60) : null;
  const badge  = getBadge(currentStatus);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar />
      <main className="p-mobile-16" style={{ flex: 1, padding: '28px 24px 80px', background: '#f8fafc', overflowY: 'auto' }}>

        {/* Back */}
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#1E3A8A', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 20 }}>
          <i className="fa-solid fa-arrow-left"></i> Back to Shipments
        </button>

        {/* Header Banner */}
        <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #162d6e 100%)', borderRadius: 16, padding: '22px 28px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
              <i className="fa-solid fa-satellite-dish" style={{ marginRight: 10, color: '#F97316' }}></i>
              Live GPS Tracking
            </h1>
            <p style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>
              <b>{pickup}</b>&nbsp;<i className="fa-solid fa-arrow-right" style={{ color: '#F97316', margin: '0 6px', fontSize: 11 }}></i><b>{drop}</b>
              &nbsp;&nbsp;|&nbsp;&nbsp;ID: {id}
              {geocoding && <span style={{ marginLeft: 10, background: 'rgba(255,255,255,0.15)', padding: '2px 10px', borderRadius: 12, fontSize: 11 }}>Locating on map...</span>}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <span style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: badge.background, color: badge.color }}>
              {currentStatus || 'Pending'}
            </span>
            {driverLocation && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#bbf7d0' }}>
                <span style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%', animation: 'ping 1s infinite', display: 'inline-block' }}></span>
                Driver Online
              </span>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid-4" style={{ gap: 12, marginBottom: 20 }}>
          <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, background: '#dcfce7', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="fa-solid fa-circle-dot" style={{ color: '#16a34a', fontSize: 17 }}></i>
            </div>
            <div>
              <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Pickup</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{pickup}</p>
            </div>
          </div>
          <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, background: '#fee2e2', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="fa-solid fa-flag-checkered" style={{ color: '#dc2626', fontSize: 17 }}></i>
            </div>
            <div>
              <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Destination</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{drop}</p>
            </div>
          </div>
          <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, background: '#dbeafe', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="fa-solid fa-road" style={{ color: '#1E3A8A', fontSize: 17 }}></i>
            </div>
            <div>
              <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Remaining</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1E3A8A' }}>
                {driverLocation ? (distKm ? `${distKm.toFixed(1)} km` : '—') : 'Waiting...'}
              </p>
            </div>
          </div>
          <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, background: '#fff7ed', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="fa-solid fa-clock" style={{ color: '#F97316', fontSize: 17 }}></i>
            </div>
            <div>
              <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>ETA</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#F97316' }}>
                {driverLocation && etaMin ? `${Math.floor(etaMin / 60)}h ${etaMin % 60}m` : 'Waiting...'}
              </p>
            </div>
          </div>
        </div>

        {/* Map + Timeline grid */}
        <div className="grid-2" style={{ gap: 20, marginBottom: 20 }}>
          {/* Map */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <i className="fa-solid fa-map-location-dot" style={{ color: '#1E3A8A', fontSize: 16 }}></i>
              <span style={{ fontWeight: 700, color: '#1e293b', flex: 1, fontSize: 14 }}>Live Map View</span>
              {!driverLocation && (
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Waiting for driver...</span>
              )}
            </div>
            <TrackingMap
              driverLocation={driverLocation}
              pickupLoc={pickupCoords}
              dropLoc={dropCoords}
              pickupName={pickup}
              dropName={drop}
            />
          </div>

          {/* Timeline */}
          <div className="card" style={{ padding: '20px 22px', overflowY: 'auto', maxHeight: 490 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 18 }}>
              <i className="fa-solid fa-clock-rotate-left" style={{ color: '#1E3A8A', marginRight: 8 }}></i>
              Tracking Timeline
            </p>
            {timeline.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No tracking events yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {timeline.map((event, idx, arr) => (
                  <div key={`${event.status}-${event.timestamp}`} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3, flexShrink: 0 }}>
                      <div style={{
                        width: 12, height: 12, borderRadius: '50%',
                        background: idx === arr.length - 1 ? '#1E3A8A' : '#cbd5e1',
                        border: idx === arr.length - 1 ? '2px solid #bfdbfe' : '2px solid #e2e8f0',
                      }} />
                      {idx !== arr.length - 1 && (
                        <div style={{ width: 2, flex: 1, background: '#e2e8f0', marginTop: 4, minHeight: 24 }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: 18, flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: idx === arr.length - 1 ? '#1E3A8A' : '#1e293b', marginBottom: 2 }}>{event.status}</p>
                      <p style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(event.timestamp).toLocaleString('en-IN')}</p>
                      {event.note && <p style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{event.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Journey Progress */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>
            <i className="fa-solid fa-route" style={{ color: '#F97316', marginRight: 8 }}></i>
            Journey Progress
          </p>
          <div className="responsive-table-wrap" style={{ border: 'none', boxShadow: 'none', marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 440, paddingBottom: 4 }}>
              {STATUS_STAGES.map((stage, idx) => {
                const state = getStageState(currentStatus, stage.label);
                return (
                  <div key={stage.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 88, position: 'relative' }}>
                    {idx < STATUS_STAGES.length - 1 && (
                      <div style={{
                        position: 'absolute', top: 20, left: '50%', width: '100%', height: 3, zIndex: 1,
                        background: state === 'completed' ? '#22c55e' : '#e2e8f0',
                      }} />
                    )}
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, zIndex: 2, position: 'relative',
                      background: state === 'completed' ? '#d1fae5' : state === 'active' ? '#dbeafe' : '#f1f5f9',
                      border: state === 'completed' ? '2px solid #22c55e' : state === 'active' ? '2px solid #1E3A8A' : '2px solid #e2e8f0',
                      boxShadow: state === 'active' ? '0 0 0 4px #bfdbfe' : 'none',
                      color: state === 'completed' ? '#16a34a' : state === 'active' ? '#1E3A8A' : '#94a3b8',
                    }}>
                      <i className={`fa-solid ${stage.icon}`}></i>
                    </div>
                    <p style={{
                      fontSize: 10, textAlign: 'center', marginTop: 7, whiteSpace: 'nowrap', fontWeight: 600,
                      color: state === 'completed' ? '#16a34a' : state === 'active' ? '#1E3A8A' : '#94a3b8',
                    }}>{stage.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
