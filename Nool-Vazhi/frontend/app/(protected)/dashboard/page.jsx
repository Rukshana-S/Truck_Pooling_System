"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
;
import Sidebar from '@/components/Sidebar';
import { shipmentAPI, pricingAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

// Demo available shipments for drivers — only used as fallback
const demoAvailable = [];

const orgStatCards = (stats) => [
  { icon: 'fa-solid fa-box', label: 'Total Shipments', value: stats.total, color: '#1E3A8A' },
  { icon: 'fa-solid fa-truck', label: 'Active', value: stats.active, color: '#F97316' },
  { icon: 'fa-solid fa-circle-check', label: 'Completed', value: stats.completed, color: '#22c55e' },
  { icon: 'fa-solid fa-indian-rupee-sign', label: 'Total Spent', value: `₹${(stats.totalSpent || 0).toLocaleString()}`, color: '#8b5cf6' },
];

const driverStatCards = (stats) => [
  { icon: 'fa-solid fa-truck-moving', label: 'Trips Taken', value: stats.total, color: '#1E3A8A' },
  { icon: 'fa-solid fa-spinner', label: 'Active Trips', value: stats.active, color: '#F97316' },
  { icon: 'fa-solid fa-circle-check', label: 'Completed', value: stats.completed, color: '#22c55e' },
  { icon: 'fa-solid fa-indian-rupee-sign', label: 'Total Earned', value: `₹${(stats.totalSpent || 0).toLocaleString()}`, color: '#8b5cf6' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const isDriver = user?.role === 'driver';

  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, totalSpent: 0 });
  const [form, setForm] = useState({ pickup: '', drop: '', goodsType: '', bundles: 1 });
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [available, setAvailable] = useState([]);
  const [availLoading, setAvailLoading] = useState(false);
  const [accepting, setAccepting] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('');

  useEffect(() => {
    if (isDriver) {
      shipmentAPI.getDriverStats().then(({ data }) => setStats(data)).catch(() => {});
      setAvailLoading(true);
      shipmentAPI.getAvailable()
        .then(({ data }) => setAvailable(data))
        .catch(() => setAvailable([]))
        .finally(() => setAvailLoading(false));
    } else {
      shipmentAPI.getStats().then(({ data }) => setStats(data)).catch(() => {});
    }
  }, [isDriver]);

  const handleChange = (e) => {
    const updated = { ...form, [e.target.name]: e.target.value };
    setForm(updated);
    if (updated.bundles > 0) {
      pricingAPI.estimate(updated.bundles, 'normal').then(({ data }) => setEstimate(data)).catch(() => {});
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await shipmentAPI.create({ ...form, bundles: Number(form.bundles) });
      setMsg('success:Shipment booked successfully!');
      setForm({ pickup: '', drop: '', goodsType: '', bundles: 1 });
      const { data } = await shipmentAPI.getStats();
      setStats(data);
    } catch (err) {
      setMsg('error:' + (err.response?.data?.message || 'Booking failed'));
    } finally { setLoading(false); }
  };

  const handleAccept = async (id) => {
    setAccepting(id);
    try {
      await shipmentAPI.accept(id);
      setAvailable(prev => prev.filter(s => s._id !== id));
      const { data } = await shipmentAPI.getDriverStats();
      setStats(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept shipment');
    } finally { setAccepting(null); }
  };

  const isSuccess = msg.startsWith('success:');
  const msgText = msg.replace(/^(success|error):/, '');
  const statCards = isDriver ? driverStatCards(stats) : orgStatCards(stats);

  const uniqueLocations = [...new Set(available.flatMap(s => [s.pickup, s.drop]))].sort();
  const filteredAvailable = selectedLocation ? available.filter(s => s.pickup === selectedLocation || s.drop === selectedLocation) : available;

  return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Dashboard</h1>
            <p style={styles.sub}>
              {isDriver ? 'View and accept available shipments' : 'Manage your shipments and bookings'}
            </p>
          </div>
          <Link href="/shipments">
            <button className="btn-primary">
              <i className="fa-solid fa-list"></i> View All Shipments
            </button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: 32 }}>
          {statCards.map((s, i) => (
            <div key={i} className="card" style={styles.statCard}>
              <div style={{ ...styles.statIcon, background: s.color + '18' }}>
                <i className={s.icon} style={{ color: s.color, fontSize: 22 }}></i>
              </div>
              <div style={{ ...styles.statValue, color: s.color }}>{s.value}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Driver: Available Shipments */}
        {isDriver && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <h2 style={{ ...styles.cardTitle, marginBottom: 0 }}>
                <i className="fa-solid fa-truck-ramp-box" style={{ color: '#1E3A8A', marginRight: 8 }}></i>
                Available Shipments
              </h2>
              {available.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fa-solid fa-location-dot" style={{ color: '#64748b' }}></i>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Filter by location:</span>
                  <select
                    value={selectedLocation}
                    onChange={e => setSelectedLocation(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer', background: 'white' }}
                  >
                    <option value="">All Locations</option>
                    {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                </div>
              )}
            </div>
            {availLoading ? (
              <div style={styles.emptyState}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: '#cbd5e1', marginBottom: 12 }}></i>
                <p>Loading available shipments...</p>
              </div>
            ) : available.length === 0 ? (
              <div style={styles.emptyState}>
                <i className="fa-solid fa-inbox" style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 12 }}></i>
                <p>No available shipments right now. Check back soon.</p>
              </div>
            ) : (
              <div style={styles.availableList}>
                {filteredAvailable.map(s => (
                  <div key={s._id} style={styles.availableCard}>
                    <div style={styles.availableLeft}>
                      <div style={styles.routeRow}>
                        <span style={styles.city}>{s.pickup.split(',')[0]}</span>
                        <i className="fa-solid fa-arrow-right" style={{ color: '#F97316', fontSize: 13 }}></i>
                        <span style={styles.city}>{s.drop.split(',')[0]}</span>
                      </div>
                      <div style={styles.availableMeta}>
                        <span style={styles.metaChip}>
                          <i className="fa-solid fa-box" style={{ marginRight: 4 }}></i>{s.goodsType}
                        </span>
                        <span style={styles.metaChip}>
                          <i className="fa-solid fa-layer-group" style={{ marginRight: 4 }}></i>{s.bundles} bundles
                        </span>
                        <span style={styles.metaChip}>
                          <i className="fa-solid fa-location-dot" style={{ marginRight: 4 }}></i>{s.pickup}
                        </span>
                      </div>
                    </div>
                    <div style={styles.availableRight}>
                      <div style={styles.earnAmount}>₹{s.cost?.total?.toLocaleString()}</div>
                      <div style={styles.earnLabel}>Earnings</div>
                      <button
                        className="btn-primary"
                        style={{ padding: '8px 20px', fontSize: 13, marginTop: 8 }}
                        onClick={() => handleAccept(s._id)}
                        disabled={accepting === s._id}
                      >
                        {accepting === s._id
                          ? <><i className="fa-solid fa-spinner fa-spin"></i> Accepting...</>
                          : <><i className="fa-solid fa-circle-check"></i> Accept</>
                        }
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Org: Booking Form + Estimate */}
        {!isDriver && (
          <div style={styles.bookingGrid}>
            <div className="card">
              <h2 style={styles.cardTitle}>
                <i className="fa-solid fa-box" style={{ color: '#1E3A8A', marginRight: 8 }}></i>
                Book New Shipment
              </h2>
              {msg && (
                <div style={isSuccess ? styles.success : styles.error}>
                  <i className={`fa-solid ${isSuccess ? 'fa-circle-check' : 'fa-circle-xmark'}`} style={{ marginRight: 8 }}></i>
                  {msgText}
                </div>
              )}
              <form onSubmit={handleBook}>
                <div className="form-group">
                  <label>Pickup Location</label>
                  <input name="pickup" value={form.pickup} onChange={handleChange} placeholder="e.g. Mumbai, Maharashtra" required />
                </div>
                <div className="form-group">
                  <label>Drop Location</label>
                  <input name="drop" value={form.drop} onChange={handleChange} placeholder="e.g. Pune, Maharashtra" required />
                </div>
                <div className="form-group">
                  <label>Goods Type</label>
                  <select name="goodsType" value={form.goodsType} onChange={handleChange} required>
                    <option value="">Select goods type</option>
                    {['Electronics', 'Textiles', 'FMCG', 'Machinery', 'Furniture', 'Perishables', 'Chemicals', 'Other'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Number of Bundles</label>
                  <input name="bundles" type="number" min="1" max="50" value={form.bundles} onChange={handleChange} required />
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} disabled={loading}>
                  <i className="fa-solid fa-rocket"></i>
                  {loading ? 'Booking...' : 'Book Shipment'}
                </button>
              </form>
            </div>

            <div className="card" style={styles.estimateCard}>
              <h2 style={styles.cardTitle}>
                <i className="fa-solid fa-calculator" style={{ color: '#1E3A8A', marginRight: 8 }}></i>
                Cost Estimate
              </h2>
              {estimate ? (
                <div style={styles.estimateBody}>
                  <div style={styles.estimateRow}><span>Base Cost</span><span>₹{estimate.baseCost.toLocaleString()}</span></div>
                  <div style={styles.estimateRow}><span>Per Bundle ({form.bundles} bundles)</span><span>₹{estimate.perBundle.toLocaleString()}</span></div>
                  <div style={{ ...styles.estimateRow, color: '#22c55e' }}><span>Pool Discount</span><span>- ₹{estimate.poolDiscount.toLocaleString()}</span></div>
                  <div style={styles.estimateDivider} />
                  <div style={{ ...styles.estimateRow, ...styles.estimateTotal }}><span>Total</span><span style={{ color: '#1E3A8A' }}>₹{estimate.total.toLocaleString()}</span></div>
                  <div style={styles.savingsBadge}>
                    <i className="fa-solid fa-tag" style={{ marginRight: 6 }}></i>
                    You save ₹{estimate.poolDiscount.toLocaleString()} with pool pricing!
                  </div>
                </div>
              ) : (
                <div style={styles.estimatePlaceholder}>
                  <i className="fa-solid fa-lightbulb" style={{ fontSize: 48, color: '#cbd5e1' }}></i>
                  <p style={{ marginTop: 12 }}>Enter shipment details to see cost estimate</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh' },
  main: { flex: 1, padding: '32px', background: '#f8fafc', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 },
  title: { fontSize: 28, fontWeight: 800, color: '#1e293b' },
  sub: { color: '#64748b', marginTop: 4 },
  statCard: { textAlign: 'center', padding: '28px 20px' },
  statIcon: { width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' },
  statValue: { fontSize: 28, fontWeight: 800, marginBottom: 4 },
  statLabel: { color: '#64748b', fontSize: 13, fontWeight: 500 },
  cardTitle: { fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 24, display: 'flex', alignItems: 'center' },
  emptyState: { textAlign: 'center', padding: '48px 20px', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  availableList: { display: 'flex', flexDirection: 'column', gap: 16 },
  availableCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', border: '1.5px solid #e2e8f0', borderRadius: 14, background: '#fafafa', flexWrap: 'wrap', gap: 16 },
  availableLeft: { flex: 1 },
  routeRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  city: { fontSize: 17, fontWeight: 700, color: '#1e293b' },
  availableMeta: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  metaChip: { background: '#f1f5f9', color: '#475569', fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center' },
  availableRight: { textAlign: 'center', flexShrink: 0 },
  earnAmount: { fontSize: 22, fontWeight: 800, color: '#22c55e' },
  earnLabel: { fontSize: 12, color: '#64748b', fontWeight: 500 },
  bookingGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 },
  success: { background: '#d1fae5', color: '#065f46', padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14, display: 'flex', alignItems: 'center' },
  error: { background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14, display: 'flex', alignItems: 'center' },
  estimateCard: { background: 'linear-gradient(135deg, #f8fafc, #eff6ff)' },
  estimateBody: { display: 'flex', flexDirection: 'column', gap: 0 },
  estimateRow: { display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #e2e8f0', fontSize: 15, color: '#475569' },
  estimateDivider: { height: 2, background: '#e2e8f0', margin: '8px 0' },
  estimateTotal: { fontWeight: 800, fontSize: 18, borderBottom: 'none' },
  savingsBadge: { background: '#d1fae5', color: '#065f46', padding: '12px 16px', borderRadius: 10, marginTop: 16, fontSize: 13, fontWeight: 600, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  estimatePlaceholder: { textAlign: 'center', padding: '40px 20px', color: '#94a3b8' },
};
