"use client";
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { trackingAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const timelineSteps = ['Booked', 'Pickup Confirmed', 'In Transit', 'Out for Delivery', 'Delivered'];

export default function Tracking() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [trackingId, setTrackingId] = useState(searchParams.get('id') || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-track if id is in URL
  useEffect(() => {
    if (searchParams.get('id')) handleTrack(null, searchParams.get('id'));
  }, []);

  const handleTrack = async (e, id) => {
    if (e) e.preventDefault();
    const tid = id || trackingId;
    if (!tid) return;
    setLoading(true); setError(''); setData(null);
    try {
      const res = await trackingAPI.track(tid);
      setData(res.data);
    } catch {
      setError('Shipment not found. Please check the tracking ID.');
    } finally { setLoading(false); }
  };

  const getStepIndex = (status) => timelineSteps.findIndex(s => s === status);
  const currentStep = data ? getStepIndex(data.status) : -1;

  const getProgressPercentage = (status) => {
    switch (status) {
      case 'Booked': return '0%';
      case 'Pickup Confirmed': return '15%';
      case 'In Transit': return '55%';
      case 'Out for Delivery': return '85%';
      case 'Delivered': return '100%';
      default: return '0%';
    }
  };
  const progressPercent = data ? getProgressPercentage(data.status) : '0%';

  const content = (
    <main style={styles.main}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Track <span style={{ color: '#F97316' }}>Shipment</span></h1>
          <p style={styles.sub}>Real-time updates on your cargo</p>
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
            {/* Map */}
            <div style={styles.mapCard}>
              <div style={styles.mapHeader}>
                <h3 style={styles.cardTitle}>
                  <i className="fa-solid fa-location-dot" style={{ color: '#F97316', marginRight: 6 }}></i>
                  Live Location
                </h3>
                <span style={styles.liveDot}>
                  <i className="fa-solid fa-circle" style={{ fontSize: 8, marginRight: 4 }}></i>LIVE
                </span>
              </div>
              <div style={styles.mapBox}>
                <div style={styles.mapBg}>
                  <div style={styles.mapRoute}>
                    <div style={styles.mapCity}>{data.pickup?.split(',')[0]}</div>
                    <div style={styles.mapLine}>
                      <div style={{ ...styles.mapProgress, width: progressPercent }} />
                      <i className="fa-solid fa-truck" style={{ ...styles.mapTruck, left: progressPercent, transform: 'translateX(-50%)' }}></i>
                    </div>
                    <div style={styles.mapCity}>{data.drop?.split(',')[0]}</div>
                  </div>
                  <div style={styles.currentLoc}>
                    <i className="fa-solid fa-location-dot" style={{ fontSize: 20, color: '#F97316' }}></i>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>Current Location</div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{data.currentLocation || 'En route'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Driver Info */}
            <div>
              <div className="card" style={{ marginBottom: 20, padding: 24 }}>
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

              <div className="card" style={{ padding: 24 }}>
                <h3 style={styles.cardTitle}>
                  <i className="fa-solid fa-clipboard-list" style={{ color: '#1E3A8A', marginRight: 6 }}></i>
                  Shipment Info
                </h3>
                <div style={styles.infoGrid}>
                  <div style={styles.infoItem}><span style={styles.infoLabel}>ID</span><span style={styles.infoValue}>{data.shipmentId}</span></div>
                  <div style={styles.infoItem}><span style={styles.infoLabel}>From</span><span style={styles.infoValue}>{data.pickup}</span></div>
                  <div style={styles.infoItem}><span style={styles.infoLabel}>To</span><span style={styles.infoValue}>{data.drop}</span></div>
                  <div style={styles.infoItem}><span style={styles.infoLabel}>ETA</span><span style={styles.infoValue}>{data.estimatedDelivery ? new Date(data.estimatedDelivery).toLocaleDateString('en-IN') : 'TBD'}</span></div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="card" style={{ gridColumn: '1 / -1', padding: 28 }}>
              <h3 style={styles.cardTitle}>
                <i className="fa-solid fa-clock" style={{ color: '#1E3A8A', marginRight: 6 }}></i>
                Shipment Timeline
              </h3>
              <div style={styles.timeline}>
                {timelineSteps.map((step, i) => {
                  const done = i <= currentStep;
                  const active = i === currentStep;
                  const timelineEntry = data.timeline?.find(t => t.status === step);
                  return (
                    <div key={i} style={styles.timelineItem}>
                      <div style={styles.timelineLeft}>
                        <div style={{ ...styles.timelineDot, background: done ? '#22c55e' : '#e2e8f0', border: active ? '3px solid #1E3A8A' : 'none' }}>
                          {done
                            ? <i className="fa-solid fa-check" style={{ fontSize: 11 }}></i>
                            : <span style={{ fontSize: 12 }}>{i + 1}</span>
                          }
                        </div>
                        {i < timelineSteps.length - 1 && <div style={{ ...styles.timelineLine, background: done ? '#22c55e' : '#e2e8f0' }} />}
                      </div>
                      <div style={styles.timelineContent}>
                        <div style={{ ...styles.timelineStep, color: done ? '#1e293b' : '#94a3b8', fontWeight: done ? 700 : 400 }}>{step}</div>
                        {timelineEntry && (
                          <>
                            <div style={styles.timelineNote}>{timelineEntry.note}</div>
                            <div style={styles.timelineTime}>{new Date(timelineEntry.timestamp).toLocaleString('en-IN')}</div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );

  if (user) return <div style={{ display: 'flex', minHeight: '100vh' }}><Sidebar />{content}</div>;
  return <div><Navbar />{content}<Footer /></div>;
}

const styles = {
  main: { flex: 1, padding: '40px 0', background: '#f8fafc' },
  container: { maxWidth: 1100, margin: '0 auto', padding: '0 24px' },
  header: { textAlign: 'center', marginBottom: 36 },
  title: { fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#1e293b', marginBottom: 8 },
  sub: { color: '#64748b', fontSize: 16 },
  searchForm: { display: 'flex', gap: 12 },
  searchInput: { flex: 1, padding: '14px 18px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 15, outline: 'none', fontFamily: 'Inter, sans-serif' },
  error: { background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 10, marginTop: 12, fontSize: 14 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  mapCard: { background: 'white', borderRadius: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: 24 },
  mapHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center' },
  liveDot: { color: '#22c55e', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center' },
  mapBox: { borderRadius: 12, overflow: 'hidden' },
  mapBg: { background: 'linear-gradient(135deg, #0f172a, #1E3A8A)', padding: 28, borderRadius: 12 },
  mapRoute: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  mapCity: { color: 'white', fontWeight: 700, fontSize: 16, minWidth: 60 },
  mapLine: { flex: 1, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, position: 'relative' },
  mapProgress: { position: 'absolute', left: 0, top: 0, height: '100%', background: '#F97316', borderRadius: 2, transition: 'width 1s ease-in-out' },
  mapTruck: { position: 'absolute', top: -10, fontSize: 20, color: 'white', transition: 'left 1s ease-in-out' },
  currentLoc: { background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, color: 'white' },
  driverInfo: { display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 },
  driverAvatar: { width: 52, height: 52, borderRadius: '50%', background: '#1E3A8A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, flexShrink: 0 },
  driverName: { fontWeight: 700, fontSize: 16, color: '#1e293b', marginBottom: 4 },
  driverRating: { color: '#f59e0b', fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center' },
  driverPhone: { color: '#64748b', fontSize: 13, display: 'flex', alignItems: 'center' },
  infoGrid: { display: 'flex', flexDirection: 'column', gap: 0, marginTop: 8 },
  infoItem: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' },
  infoLabel: { color: '#94a3b8', fontSize: 13, fontWeight: 600 },
  infoValue: { color: '#1e293b', fontSize: 13, fontWeight: 600, textAlign: 'right', maxWidth: '60%' },
  timeline: { display: 'flex', flexDirection: 'column', gap: 0 },
  timelineItem: { display: 'flex', gap: 16 },
  timelineLeft: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  timelineDot: { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 },
  timelineLine: { width: 2, flex: 1, minHeight: 24, margin: '4px 0' },
  timelineContent: { paddingBottom: 20 },
  timelineStep: { fontSize: 15, marginBottom: 4 },
  timelineNote: { color: '#64748b', fontSize: 13, marginBottom: 2 },
  timelineTime: { color: '#94a3b8', fontSize: 12 },
};
