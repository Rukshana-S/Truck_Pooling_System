"use client";
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { returnLoadAPI } from '@/services/api';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function ReturnLoadRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  
  const [modalConfig, setModalConfig] = useState({ isOpen: false });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data } = await returnLoadAPI.getOrganizationRequests();
      setRequests(data);
    } catch (err) {
      toast.error('Failed to load return load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = (requestId, status) => {
    setModalConfig({
      isOpen: true,
      title: `${status === 'Accepted' ? 'Approve' : 'Reject'} Request`,
      message: `Are you sure you want to ${status.toLowerCase()} this return load request?`,
      type: status === 'Accepted' ? 'Info' : 'Danger',
      confirmText: status === 'Accepted' ? 'Approve' : 'Reject',
      onConfirm: async () => {
        setUpdating(requestId);
        try {
          await returnLoadAPI.updateStatus(requestId, status);
          toast.success(`Request ${status.toLowerCase()} successfully`);
          setRequests(prev => prev.filter(r => r._id !== requestId));
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to update request');
        } finally {
          setUpdating(null);
          setModalConfig({ isOpen: false });
        }
      },
      onCancel: () => setModalConfig({ isOpen: false })
    });
  };

  return (
    <div style={styles.layout}>
      <ConfirmationModal {...modalConfig} />
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Return Load Requests</h1>
            <p style={styles.sub}>Review drivers who want to pick up your shipments as return loads</p>
          </div>
        </div>

        {loading ? (
          <div style={styles.loading}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 12 }}></i>
            <p>Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div style={styles.empty}>
            <i className="fa-solid fa-envelope-open-text" style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 16 }}></i>
            <p style={{ fontSize: 18, color: '#475569', fontWeight: 600 }}>No Pending Requests</p>
            <p style={{ color: '#94a3b8' }}>You don't have any new return load requests from drivers.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {requests.map(req => {
              const s = req.shipment || {};
              const d = req.driver || {};
              return (
                <div key={req._id} className="card" style={styles.card}>
                  <div style={styles.cardTop}>
                    <div>
                      <div style={styles.driverName}>{d.name || 'Unknown Driver'}</div>
                      <div style={styles.driverMeta}>
                        <i className="fa-solid fa-star" style={{ color: '#f59e0b' }}></i> {d.rating || 0} ({d.totalRatings || 0} reviews)
                      </div>
                    </div>
                    <div style={styles.vehicleBadge}>
                      <i className="fa-solid fa-truck" style={{ marginRight: 6 }}></i>
                      {d.vehicleCapacityKg || 'N/A'} kg Capacity
                    </div>
                  </div>

                  <div style={styles.routeBox}>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Requested Shipment</div>
                    <div style={styles.route}>
                      <span style={styles.city}>{s.pickup}</span>
                      <i className="fa-solid fa-arrow-right" style={{ color: '#F97316' }}></i>
                      <span style={styles.city}>{s.drop}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px dashed #cbd5e1' }}>
                       <div><span style={{color: '#64748b', fontSize: 13}}>Weight:</span> <span style={{fontWeight: 600, color: '#1e293b'}}>{s.weight} kg</span></div>
                       <div><span style={{color: '#64748b', fontSize: 13}}>Price:</span> <span style={{fontWeight: 700, color: '#1E3A8A'}}>₹{s.cost?.total?.toLocaleString()}</span></div>
                    </div>
                  </div>

                  <div style={styles.actions}>
                    <button 
                      className="btn-primary" 
                      style={{ flex: 1, padding: '10px', background: '#22c55e', border: 'none', display: 'flex', justifyContent: 'center', gap: 6 }}
                      onClick={() => handleUpdateStatus(req._id, 'Accepted')}
                      disabled={updating === req._id}
                    >
                      <i className="fa-solid fa-check"></i> Approve
                    </button>
                    <button 
                      className="btn-secondary" 
                      style={{ flex: 1, padding: '10px', background: '#fee2e2', color: '#991b1b', border: 'none', display: 'flex', justifyContent: 'center', gap: 6 }}
                      onClick={() => handleUpdateStatus(req._id, 'Rejected')}
                      disabled={updating === req._id}
                    >
                      <i className="fa-solid fa-xmark"></i> Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh', background: '#f8fafc' },
  main: { flex: 1, padding: '32px', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 },
  title: { fontSize: 28, fontWeight: 800, color: '#1e293b', margin: 0 },
  sub: { color: '#64748b', marginTop: 6, fontSize: 15 },
  loading: { textAlign: 'center', padding: 80, color: '#94a3b8' },
  empty: { textAlign: 'center', padding: 80, color: '#94a3b8', background: 'white', borderRadius: 16, border: '1px dashed #cbd5e1' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 24 },
  card: { padding: 24, display: 'flex', flexDirection: 'column', gap: 16 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  driverName: { fontSize: 18, fontWeight: 700, color: '#1e293b' },
  driverMeta: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', marginTop: 4 },
  vehicleBadge: { background: '#f1f5f9', color: '#475569', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center' },
  routeBox: { background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' },
  route: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  city: { fontSize: 16, fontWeight: 700, color: '#1e293b' },
  actions: { display: 'flex', gap: 12, marginTop: 4 }
};
