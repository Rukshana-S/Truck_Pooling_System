"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { returnLoadAPI } from '@/services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

function RecommendationsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialLocation = searchParams.get('location') || '';
  
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(null);
  
  // Filters
  const [sortBy, setSortBy] = useState('Nearest Pickup');
  const [filterWeight, setFilterWeight] = useState('');

  useEffect(() => {
    fetchRecommendations();
  }, [initialLocation]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const { data } = await returnLoadAPI.getRecommendations(initialLocation);
      setRecommendations(data);
    } catch (err) {
      toast.error('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (shipmentId) => {
    setRequesting(shipmentId);
    try {
      await returnLoadAPI.requestReturnLoad({ 
        shipmentId, 
        originalDeliveryLocation: initialLocation 
      });
      toast.success('Return load requested successfully!');
      // Remove from list
      setRecommendations(prev => prev.filter(r => r._id !== shipmentId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request return load');
    } finally {
      setRequesting(null);
    }
  };

  // Smart Sorting
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    if (sortBy === 'Highest Earnings') {
      return (b.cost?.total || 0) - (a.cost?.total || 0);
    } else if (sortBy === 'Latest Shipment') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    // Default / Nearest Pickup - simplistic approach since we don't have exact lat/long distance here easily without geocoding
    return 0; 
  });

  // Optional Filters
  const filteredRecommendations = sortedRecommendations.filter(r => {
    if (filterWeight) {
      const maxWeight = parseInt(filterWeight);
      if (r.weight > maxWeight) return false;
    }
    return true;
  });

  return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              <i className="fa-solid fa-rotate-left" style={{ color: '#F97316', marginRight: 12 }}></i>
              Return Load Recommendations
            </h1>
            <p style={styles.sub}>Find matching shipments for your return journey from <strong>{initialLocation || 'your current location'}</strong></p>
          </div>
          <Link href="/driver-trips/return-loads/history">
             <button className="btn-secondary" style={styles.historyBtn}>
               <i className="fa-solid fa-clock-rotate-left"></i> History
             </button>
          </Link>
        </div>

        <div style={styles.filtersContainer}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Sort By</label>
            <select style={styles.select} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option>Nearest Pickup</option>
              <option>Highest Earnings</option>
              <option>Latest Shipment</option>
            </select>
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Max Weight (kg)</label>
            <input 
              type="number" 
              style={styles.input} 
              placeholder="e.g. 5000"
              value={filterWeight}
              onChange={(e) => setFilterWeight(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={styles.loading}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 12 }}></i>
            <p>Scanning for perfect matches...</p>
          </div>
        ) : filteredRecommendations.length === 0 ? (
          <div style={styles.empty}>
            <i className="fa-solid fa-box-open" style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 16 }}></i>
            <p style={{ fontSize: 18, color: '#475569', fontWeight: 600 }}>No Return Loads Found</p>
            <p style={{ color: '#94a3b8' }}>We couldn't find any direct return loads for your current vehicle capacity right now.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {filteredRecommendations.map(s => (
              <div key={s._id} className="card" style={styles.card}>
                <div style={styles.cardTop}>
                  <div style={styles.route}>
                    <span style={styles.city}>{s.pickup}</span>
                    <i className="fa-solid fa-arrow-right" style={{ color: '#F97316' }}></i>
                    <span style={styles.city}>{s.drop}</span>
                  </div>
                  <div style={styles.earningsBadge}>
                    ₹{s.cost?.total?.toLocaleString() || 0}
                  </div>
                </div>

                <div style={styles.detailsGrid}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Goods Type</span>
                    <span style={styles.detailValue}>{s.goodsType}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Weight</span>
                    <span style={styles.detailValue}>{s.weight} kg</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Price per kg</span>
                    <span style={styles.detailValue}>₹{s.weight ? ((s.cost?.total || 0) / s.weight).toFixed(2) : 0}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Organization</span>
                    <span style={styles.detailValue}>{s.shipper?.businessName || s.shipper?.name}</span>
                  </div>
                </div>

                <div style={styles.capacityWarning}>
                   <i className="fa-solid fa-check-circle" style={{ color: '#22c55e', marginRight: 6 }}></i>
                   Fits your vehicle capacity ({user?.vehicleCapacityKg} kg)
                </div>

                <div style={styles.actions}>
                  <button 
                    className="btn-primary" 
                    style={{ flex: 1, padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, background: '#1E3A8A' }}
                    onClick={() => handleRequest(s._id)}
                    disabled={requesting === s._id}
                  >
                    {requesting === s._id ? (
                      <i className="fa-solid fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fa-solid fa-hand-holding-dollar"></i>
                    )}
                    {requesting === s._id ? 'Requesting...' : 'Request Return Load'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ReturnLoadsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RecommendationsContent />
    </Suspense>
  );
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh', background: '#f8fafc' },
  main: { flex: 1, padding: '32px', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 },
  title: { fontSize: 28, fontWeight: 800, color: '#1e293b', margin: 0 },
  sub: { color: '#64748b', marginTop: 6, fontSize: 15 },
  historyBtn: { padding: '10px 20px', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 8, color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
  filtersContainer: { display: 'flex', gap: 20, marginBottom: 24, padding: '16px 24px', background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', flexWrap: 'wrap' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200 },
  filterLabel: { fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' },
  select: { padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, outline: 'none', color: '#1e293b', fontWeight: 500 },
  input: { padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, outline: 'none', color: '#1e293b', fontWeight: 500 },
  loading: { textAlign: 'center', padding: 80, color: '#94a3b8' },
  empty: { textAlign: 'center', padding: 80, color: '#94a3b8', background: 'white', borderRadius: 16, border: '1px dashed #cbd5e1' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 24 },
  card: { padding: 24, display: 'flex', flexDirection: 'column', gap: 16, transition: 'transform 0.2s, box-shadow 0.2s' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  route: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  city: { fontSize: 18, fontWeight: 700, color: '#1e293b' },
  earningsBadge: { background: '#d1fae5', color: '#065f46', padding: '6px 12px', borderRadius: 20, fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap' },
  detailsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #f1f5f9' },
  detailItem: { display: 'flex', flexDirection: 'column', gap: 4 },
  detailLabel: { fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' },
  detailValue: { fontSize: 14, color: '#1e293b', fontWeight: 600 },
  capacityWarning: { background: '#f0fdf4', color: '#15803d', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center' },
  actions: { display: 'flex', gap: 12, marginTop: 4 }
};
