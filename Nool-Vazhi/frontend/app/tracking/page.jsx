"use client";
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { trackingAPI, shipmentAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

// Dynamically import LiveMap with no SSR because Leaflet uses window
const LiveMap = dynamic(() => import('@/components/LiveMap'), { ssr: false, loading: () => <div style={{ height: 400, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Map...</div> });

const ADVANCED_TIMELINE_STAGES = [
  { label: 'Booked', statusKey: 'Pending', icon: 'fa-box', desc: 'Shipment request received.' },
  { label: 'Driver Accepted', statusKey: 'Accepted', icon: 'fa-handshake', desc: 'A driver has been assigned.' },
  { label: 'Advance Paid', statusKey: 'Advance Paid', icon: 'fa-money-bill-wave', desc: 'Advance payment secured.' },
  { label: 'Pickup Started', statusKey: 'Pickup Started', icon: 'fa-truck-arrow-right', desc: 'Driver is en route to pickup.' },
  { label: 'Goods Loaded', statusKey: 'Loaded', icon: 'fa-boxes-stacked', desc: 'Cargo loaded onto vehicle.' },
  { label: 'In Transit', statusKey: 'In Transit', icon: 'fa-truck-fast', desc: 'Journey has begun.' },
  { label: 'Near Destination', statusKey: 'Near Destination', icon: 'fa-location-dot', desc: 'Driver is approaching drop.' },
  { label: 'Delivered', statusKey: 'Delivered', icon: 'fa-house-circle-check', desc: 'Goods arrived safely.' },
  { label: 'Final Payment Completed', statusKey: 'Final Payment Completed', icon: 'fa-check-double', desc: 'Remaining balance paid.' },
  { label: 'Receipt Generated', statusKey: 'Shipment Completed', icon: 'fa-file-invoice-dollar', desc: 'Transaction complete.' }
];

// Haversine formula to calculate distance between two coordinates in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper to interpolate position between two points
function interpolatePosition(pos1, pos2, fraction) {
  if (!pos1 || !pos2) return null;
  return [
    pos1[0] + (pos2[0] - pos1[0]) * fraction,
    pos1[1] + (pos2[1] - pos1[1]) * fraction
  ];
}

const geocode = async (locationName) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`);
    const results = await res.json();
    if (results && results.length > 0) {
      return [parseFloat(results[0].lat), parseFloat(results[0].lon)];
    }
  } catch (err) {
    console.error('Geocoding failed for', locationName, err);
  }
  return null;
};

export default function Tracking() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [trackingId, setTrackingId] = useState(searchParams.get('id') || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Geocoding states
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropCoords, setDropCoords] = useState(null);
  
  // Simulation states
  const [simulationProgress, setSimulationProgress] = useState(0);
  
  // Demo Mode state
  const [demoMode, setDemoMode] = useState(false);

  // Auto-track if id is in URL
  useEffect(() => {
    if (searchParams.get('id')) handleTrack(null, searchParams.get('id'));
  }, []);

  const handleTrack = async (e, id) => {
    if (e) e.preventDefault();
    const tid = id || trackingId;
    if (!tid) return;
    setLoading(true); setError(''); setData(null);
    setPickupCoords(null); setDropCoords(null); setSimulationProgress(0);
    
    try {
      const res = await trackingAPI.track(tid);
      setData(res.data);
      
      // Attempt to geocode locations
      if (res.data.pickup) {
        geocode(res.data.pickup).then(coords => setPickupCoords(coords || [13.0827, 80.2707])); // Fallback to Chennai
      }
      if (res.data.drop) {
        geocode(res.data.drop).then(coords => setDropCoords(coords || [11.0168, 76.9558])); // Fallback to Coimbatore
      }

      // Initialize simulation progress based on status
      if (res.data.status === 'Near Destination' || res.data.status === 'Out for Delivery') setSimulationProgress(0.9);
      if (res.data.status === 'Delivered') setSimulationProgress(1);
      
    } catch {
      setError('Shipment not found. Please check the tracking ID.');
    } finally { setLoading(false); }
  };

  // Auto-refresh polling every 10 seconds
  useEffect(() => {
    let pollInterval;
    if (data?.shipmentId) {
      pollInterval = setInterval(async () => {
        try {
          const res = await trackingAPI.track(data.shipmentId);
          if (res.data && res.data.status !== data.status) {
            setData(res.data);
            if (res.data.status === 'Near Destination' || res.data.status === 'Out for Delivery') setSimulationProgress(0.9);
            if (res.data.status === 'Delivered') setSimulationProgress(1);
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 10000);
    }
    return () => clearInterval(pollInterval);
  }, [data?.shipmentId, data?.status]);

  // Simulate truck movement when "In Transit"
  useEffect(() => {
    let interval;
    if (data?.status === 'In Transit') {
      interval = setInterval(() => {
        setSimulationProgress(prev => {
          if (prev >= 1) {
            clearInterval(interval);
            return 1;
          }
          return prev + 0.02; // Move 2% every 5 seconds
        });
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [data?.status]);

  // Demo Mode logic
  useEffect(() => {
    let demoTimeout;
    if (demoMode && data?.shipmentId) {
      if (data.status === 'In Transit') {
        demoTimeout = setTimeout(async () => {
          try {
            await shipmentAPI.updateDemoStatus(data.shipmentId, { status: 'Near Destination', note: 'Driver is approaching the destination.' });
          } catch (err) {
            console.error('Demo update failed', err);
          }
        }, 20000);
      } else if (data.status === 'Near Destination') {
        demoTimeout = setTimeout(async () => {
          try {
            await shipmentAPI.updateDemoStatus(data.shipmentId, { status: 'Delivered', note: 'Shipment safely delivered.' });
          } catch (err) {
            console.error('Demo update failed', err);
          }
        }, 20000);
      }
    }
    return () => clearTimeout(demoTimeout);
  }, [demoMode, data?.status, data?.shipmentId]);

  const getAdvancedStageState = (currentStatus, statusKey) => {
    if (currentStatus === 'Cancelled') return 'pending';
    const cStatus = currentStatus || 'Pending';
    const currentIndex = ADVANCED_TIMELINE_STAGES.findIndex(s => s.statusKey === cStatus);
    const stageIndex = ADVANCED_TIMELINE_STAGES.findIndex(s => s.statusKey === statusKey);
    
    if (stageIndex < currentIndex || cStatus === 'Shipment Completed') return 'completed';
    if (stageIndex === currentIndex) return 'active';
    return 'pending';
  };

  const getProgressPercentage = (status) => {
    const cStatus = status || 'Pending';
    const currentIndex = ADVANCED_TIMELINE_STAGES.findIndex(s => s.statusKey === cStatus);
    if (currentIndex <= 0) return '0%';
    if (currentIndex === ADVANCED_TIMELINE_STAGES.length - 1) return '100%';
    return `${Math.round((currentIndex / (ADVANCED_TIMELINE_STAGES.length - 1)) * 100)}%`;
  };
  const progressPercent = data ? getProgressPercentage(data.currentStatus || data.status) : '0%';

  // Calculate dynamic truck position, distance, and ETA
  const truckCoords = useMemo(() => {
    if (!pickupCoords || !dropCoords) return null;
    if (data?.status === 'Booked' || data?.status === 'Pickup Confirmed') return pickupCoords;
    if (data?.status === 'Delivered') return dropCoords;
    return interpolatePosition(pickupCoords, dropCoords, simulationProgress);
  }, [pickupCoords, dropCoords, simulationProgress, data?.status]);

  const distanceMetrics = useMemo(() => {
    if (!truckCoords || !dropCoords) return { remaining: 0, etaMinutes: 0 };
    const dist = calculateDistance(truckCoords[0], truckCoords[1], dropCoords[0], dropCoords[1]);
    // Mock speed 60 km/h (1 km/min)
    const eta = Math.round(dist); 
    return { remaining: dist.toFixed(1), etaMinutes: eta };
  }, [truckCoords, dropCoords]);

  const formatETA = (minutes) => {
    if (minutes <= 0) return 'Arrived';
    if (minutes < 60) return `${minutes} mins`;
    const hrs = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${hrs} hr ${m} min`;
  };

  const content = (
    <main style={styles.main}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Track <span style={{ color: '#F97316' }}>Shipment</span></h1>
          <p style={styles.sub}>Real-time updates on your cargo</p>

          {data && (
            <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 10, background: demoMode ? '#fef3c7' : '#f1f5f9', padding: '8px 16px', borderRadius: 20, transition: 'all 0.3s' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: demoMode ? '#d97706' : '#64748b' }}>
                <i className={`fa-solid fa-flask${demoMode ? '' : '-vial'}`} style={{ marginRight: 6 }}></i>
                Demo Mode {demoMode ? 'Active' : 'Off'}
              </span>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                <input type="checkbox" checked={demoMode} onChange={(e) => setDemoMode(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: demoMode ? '#F97316' : '#cbd5e1', transition: '.4s', borderRadius: 24 }}>
                  <span style={{ position: 'absolute', content: '""', height: 18, width: 18, left: demoMode ? 23 : 3, bottom: 3, backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: 32, padding: 28 }}>
          <form onSubmit={handleTrack} style={styles.searchForm}>
            <input
              value={trackingId}
              onChange={e => setTrackingId(e.target.value)}
              placeholder="Enter Tracking ID (e.g. NV12345678)"
              style={styles.searchInput}
              required
            />
            <button type="submit" className="btn-primary" style={{ padding: '14px 32px', fontSize: 15 }} disabled={loading}>
              <i className="fa-solid fa-magnifying-glass"></i>
              {loading ? 'Tracking...' : 'Track'}
            </button>
          </form>
          {error && <div style={styles.error}>{error}</div>}
          <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 12 }}>
            Try demo ID: <strong style={{ color: '#1E3A8A', cursor: 'pointer' }} onClick={() => setTrackingId('NV12345678')}>NV12345678</strong>
          </p>
        </div>

        {data && (
          <div style={styles.grid} className="fade-in">
            
            {/* Left Column: Map and Metrics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card" style={{ padding: 24, paddingBottom: 0, overflow: 'hidden' }}>
                <div style={styles.mapHeader}>
                  <h3 style={styles.cardTitle}>
                    <i className="fa-solid fa-location-dot" style={{ color: '#F97316', marginRight: 6 }}></i>
                    Live Location
                  </h3>
                  {data.status === 'In Transit' && (
                    <span style={styles.liveDot}>
                      <i className="fa-solid fa-circle fade-pulse" style={{ fontSize: 8, marginRight: 4 }}></i>LIVE
                    </span>
                  )}
                </div>
                
                {/* Metrics Row */}
                <div style={styles.metricsRow}>
                  <div style={styles.metricCard}>
                    <div style={styles.metricLabel}>Est. Arrival</div>
                    <div style={styles.metricValue}>{data.currentStatus === 'Delivered' || data.currentStatus === 'Shipment Completed' || data.currentStatus === 'Final Payment Completed' ? 'Arrived' : formatETA(distanceMetrics.etaMinutes)}</div>
                  </div>
                  <div style={styles.metricCard}>
                    <div style={styles.metricLabel}>Distance Left</div>
                    <div style={styles.metricValue}>{data.currentStatus === 'Delivered' || data.currentStatus === 'Shipment Completed' || data.currentStatus === 'Final Payment Completed' ? '0 km' : `${distanceMetrics.remaining} km`}</div>
                  </div>
                  <div style={styles.metricCard}>
                    <div style={styles.metricLabel}>Current Status</div>
                    <div style={{...styles.metricValue, color: '#1E3A8A', fontSize: 14}}>{data.currentStatus || data.status}</div>
                  </div>
                </div>

                {/* Leaflet Map */}
                <div style={{ marginTop: 20, margin: '0 -24px' }}>
                  <LiveMap pickupPos={pickupCoords} dropPos={dropCoords} truckPos={truckCoords} />
                </div>
              </div>
            </div>

            {/* Right Column: Details and Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Shipment Details */}
              <div className="card" style={{ padding: 24 }}>
                <h3 style={styles.cardTitle}>
                  <i className="fa-solid fa-clipboard-list" style={{ color: '#1E3A8A', marginRight: 6 }}></i>
                  Shipment Info
                </h3>
                <div style={styles.infoGrid}>
                  <div style={styles.infoItem}><span style={styles.infoLabel}>ID</span><span style={styles.infoValue}>{data.shipmentId}</span></div>
                  <div style={styles.infoItem}><span style={styles.infoLabel}>From</span><span style={styles.infoValue}>{data.pickup}</span></div>
                  <div style={styles.infoItem}><span style={styles.infoLabel}>To</span><span style={styles.infoValue}>{data.drop}</span></div>
                  <div style={styles.infoItem}><span style={styles.infoLabel}>Weight</span><span style={styles.infoValue}>{data.totalWeight || '-'} kg</span></div>
                  <div style={styles.infoItem}><span style={styles.infoLabel}>Goods</span><span style={styles.infoValue}>{data.goodsType || '-'}</span></div>
                </div>
                
                {/* Global Progress Bar */}
                <div style={{ marginTop: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8, fontWeight: 600 }}>
                    <span style={{ color: '#64748b' }}>Progress</span>
                    <span style={{ color: '#1E3A8A' }}>{progressPercent}</span>
                  </div>
                  <div style={styles.mapLine}>
                    <div style={{ ...styles.mapProgress, width: progressPercent }} />
                    <i className="fa-solid fa-truck" style={{ ...styles.mapTruck, left: progressPercent, transform: 'translateX(-50%)' }}></i>
                  </div>
                </div>
              </div>

              {/* Driver Details */}
              <div className="card" style={{ padding: 24 }}>
                <h3 style={styles.cardTitle}>
                  <i className="fa-solid fa-id-card" style={{ color: '#1E3A8A', marginRight: 6 }}></i>
                  Driver Details
                </h3>
                {data.driver ? (
                  <div style={styles.driverInfo}>
                    <div style={styles.driverAvatar}>{(data.driver.name || data.driver.contactPerson || 'D')[0]}</div>
                    <div>
                      <div style={styles.driverName}>{data.driver.name || data.driver.contactPerson}</div>
                      <div style={styles.driverRating}>
                        <i className="fa-solid fa-star" style={{ color: '#f59e0b', marginRight: 4 }}></i>
                        {data.driver.rating || 'N/A'} Rating
                      </div>
                      <div style={styles.driverPhone}>
                        <i className="fa-solid fa-phone" style={{ marginRight: 4 }}></i>
                        {data.driver.phone}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#64748b', fontSize: 14, textAlign: 'center', padding: '16px 0', background: '#f8fafc', borderRadius: 8 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>Not Assigned Yet</div>
                    Driver will be displayed once shipment is accepted.
                  </div>
                )}
              </div>

              {/* Vertical Timeline */}
              <div className="card" style={{ padding: 24 }}>
                <h3 style={styles.cardTitle}>
                  <i className="fa-solid fa-clock-rotate-left" style={{ color: '#1E3A8A', marginRight: 6 }}></i>
                  Live Journey Timeline
                </h3>
                <div style={styles.timeline}>
                  {ADVANCED_TIMELINE_STAGES.map((stage, i) => {
                    const state = getAdvancedStageState(data.currentStatus || data.status, stage.statusKey);
                    
                    let dotColor = '#e2e8f0'; // Gray (pending)
                    let lineColor = '#e2e8f0';
                    let iconColor = '#94a3b8';
                    
                    if (state === 'completed') {
                      dotColor = '#22c55e'; // Green
                      lineColor = '#22c55e';
                      iconColor = 'white';
                    } else if (state === 'active') {
                      dotColor = '#F97316'; // Orange
                      lineColor = '#e2e8f0'; 
                      iconColor = 'white';
                    }
                    
                    // Match trackingHistory entry if it exists
                    const historyEntry = data.trackingHistory?.find(t => t.status === stage.statusKey) 
                                         || data.timeline?.find(t => t.status === stage.statusKey);
                                         
                    return (
                      <div key={i} style={styles.timelineItem}>
                        <div style={styles.timelineLeft}>
                          <div style={{ ...styles.timelineDot, background: dotColor, color: iconColor }}>
                             <i className={`fa-solid ${stage.icon}`} style={{ fontSize: 13 }}></i>
                          </div>
                          {i < ADVANCED_TIMELINE_STAGES.length - 1 && <div style={{ ...styles.timelineLine, background: lineColor }} />}
                        </div>
                        <div style={styles.timelineContent}>
                          <div style={{ ...styles.timelineStep, color: state === 'completed' ? '#22c55e' : state === 'active' ? '#F97316' : '#94a3b8', fontWeight: (state === 'completed' || state === 'active') ? 700 : 500 }}>
                            {stage.label}
                          </div>
                          <div style={styles.timelineNote}>{stage.desc}</div>
                          {historyEntry && (
                            <div style={styles.timelineTime}>{new Date(historyEntry.timestamp).toLocaleString('en-IN', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Activity Feed */}
              {data.trackingHistory && data.trackingHistory.length > 0 && (
                <div className="card" style={{ padding: 24 }}>
                  <h3 style={styles.cardTitle}>
                    <i className="fa-solid fa-list-ul" style={{ color: '#1E3A8A', marginRight: 6 }}></i>
                    Activity Log
                  </h3>
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[...data.trackingHistory].reverse().map((entry, idx) => (
                      <div key={idx} style={{ padding: 12, background: '#f8fafc', borderRadius: 8, borderLeft: '3px solid #1E3A8A' }}>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                          {new Date(entry.timestamp).toLocaleString('en-IN', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                        </div>
                        <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 600 }}>
                          Driver entered {entry.status}
                        </div>
                        {entry.note && entry.note !== entry.status && (
                           <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>{entry.note}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );

  if (user) return <div style={styles.layout}><Sidebar />{content}</div>;
  return <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}><Navbar />{content}<Footer /></div>;
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh', width: '100vw', overflowX: 'hidden' },
  main: { flex: 1, padding: '40px 0', background: '#f8fafc', overflowY: 'auto' },
  container: { maxWidth: 1200, margin: '0 auto', padding: '0 24px' },
  header: { textAlign: 'center', marginBottom: 36 },
  title: { fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#1e293b', marginBottom: 8 },
  sub: { color: '#64748b', fontSize: 16 },
  searchForm: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  searchInput: { flex: 1, padding: '14px 18px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 15, outline: 'none', fontFamily: 'Inter, sans-serif', minWidth: '200px' },
  error: { background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 10, marginTop: 12, fontSize: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 },
  mapHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center' },
  liveDot: { color: '#22c55e', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center' },
  metricsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 },
  metricCard: { background: '#f1f5f9', padding: '12px 16px', borderRadius: 10 },
  metricLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 },
  metricValue: { fontSize: 16, color: '#1e293b', fontWeight: 800 },
  mapLine: { width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, position: 'relative' },
  mapProgress: { position: 'absolute', left: 0, top: 0, height: '100%', background: '#F97316', borderRadius: 3, transition: 'width 1s ease-in-out' },
  mapTruck: { position: 'absolute', top: -12, fontSize: 22, color: '#1E3A8A', transition: 'left 1s ease-in-out' },
  driverInfo: { display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, flexWrap: 'wrap' },
  driverAvatar: { width: 52, height: 52, borderRadius: '50%', background: '#1E3A8A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, flexShrink: 0 },
  driverName: { fontWeight: 700, fontSize: 16, color: '#1e293b', marginBottom: 4 },
  driverRating: { color: '#f59e0b', fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center' },
  driverPhone: { color: '#64748b', fontSize: 13, display: 'flex', alignItems: 'center' },
  infoGrid: { display: 'flex', flexDirection: 'column', gap: 0, marginTop: 8 },
  infoItem: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' },
  infoLabel: { color: '#94a3b8', fontSize: 13, fontWeight: 600 },
  infoValue: { color: '#1e293b', fontSize: 13, fontWeight: 600, textAlign: 'right', maxWidth: '60%' },
  timeline: { display: 'flex', flexDirection: 'column', gap: 0, marginTop: 12 },
  timelineItem: { display: 'flex', gap: 16 },
  timelineLeft: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  timelineDot: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  timelineLine: { width: 2, flex: 1, minHeight: 32, margin: '4px 0' },
  timelineContent: { paddingBottom: 24, flex: 1 },
  timelineStep: { fontSize: 15, marginBottom: 4 },
  timelineNote: { color: '#64748b', fontSize: 13, marginBottom: 2 },
  timelineTime: { color: '#94a3b8', fontSize: 12 },
};
