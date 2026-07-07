"use client";
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Sidebar from '@/components/Sidebar';
import { returnLoadAPI } from '@/services/api';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function DriverReturnLoads() {
  const searchParams = useSearchParams();
  const initialLoc = searchParams.get('location') || '';
  
  const [activeTab, setActiveTab] = useState('Available Loads');
  const [recommendations, setRecommendations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoc, setSearchLoc] = useState(initialLoc);

  // Modals
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const [requestModal, setRequestModal] = useState(null); // { shipment, defaultPrice }
  const [updateModal, setUpdateModal] = useState(null); // { request, currentPrice }

  const tabs = ['Available Loads', 'My Requests', 'Approved', 'Rejected', 'Completed', 'Withdrawn'];

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'Available Loads') {
        const { data } = await returnLoadAPI.getRecommendations(searchLoc);
        setRecommendations(data);
      } else {
        const { data } = await returnLoadAPI.getDriverRequests();
        setRequests(data);
      }
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleRequest = async (e) => {
    e.preventDefault();
    try {
      await returnLoadAPI.requestReturnLoad({ 
        shipmentId: requestModal.shipment._id,
        offeredPrice: Number(requestModal.defaultPrice)
      });
      toast.success('Return load requested successfully!');
      setRequestModal(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request');
    }
  };

  const handleUpdatePrice = async (e) => {
    e.preventDefault();
    try {
      await returnLoadAPI.updateDriverRequest(updateModal.request._id, {
        offeredPrice: Number(updateModal.currentPrice)
      });
      toast.success('Price updated!');
      setUpdateModal(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const handleWithdraw = (reqId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Withdraw Request',
      message: 'Are you sure you want to withdraw this return load request?',
      type: 'Warning',
      confirmText: 'Withdraw',
      onConfirm: async () => {
        try {
          await returnLoadAPI.updateDriverRequest(reqId, { status: 'Withdrawn' });
          toast.success('Request withdrawn');
          fetchData();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to withdraw');
        } finally {
          setConfirmModal({ isOpen: false });
        }
      },
      onCancel: () => setConfirmModal({ isOpen: false })
    });
  };

  const handleDelete = (reqId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Record',
      message: 'Remove this record from your history?',
      type: 'Danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await returnLoadAPI.delete(reqId);
          toast.success('Record removed');
          fetchData();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to delete');
        } finally {
          setConfirmModal({ isOpen: false });
        }
      },
      onCancel: () => setConfirmModal({ isOpen: false })
    });
  };

  const renderAvailableLoads = () => (
    <>
      <div style={styles.searchBar}>
        <input 
          type="text" 
          value={searchLoc} 
          onChange={e => setSearchLoc(e.target.value)} 
          placeholder="Filter by pickup location (e.g. Chennai)" 
          style={styles.searchInput}
        />
        <button onClick={fetchData} className="btn-primary" style={{ padding: '10px 20px' }}>
          Search
        </button>
      </div>

      {loading ? <p style={styles.loading}>Loading recommendations...</p> : recommendations.length === 0 ? (
        <div style={styles.empty}>No return loads found matching your capacity and location.</div>
      ) : (
        <div style={styles.grid}>
          {recommendations.map(s => (
            <div key={s._id} className="card" style={styles.card}>
              <div style={styles.cardTop}>
                <h4 style={styles.orgName}>{s.shipper?.businessName || s.shipper?.name}</h4>
              </div>
              <div style={styles.routeRow}>
                <span style={styles.city}>{s.pickup}</span>
                <i className="fa-solid fa-arrow-right" style={{ color: '#F97316' }}></i>
                <span style={styles.city}>{s.drop}</span>
              </div>
              <div style={styles.meta}>
                <span><i className="fa-solid fa-box" style={{ color: '#8b5cf6' }}></i> {s.goodsType}</span>
                <span><i className="fa-solid fa-weight-hanging" style={{ color: '#22c55e' }}></i> {s.weight} kg</span>
                <span><i className="fa-solid fa-indian-rupee-sign" style={{ color: '#1E3A8A' }}></i> {s.cost?.total || 0} suggested</span>
              </div>
              <button 
                className="btn-primary" 
                style={{ width: '100%', marginTop: 16 }}
                onClick={() => setRequestModal({ shipment: s, defaultPrice: s.cost?.total || 0 })}
              >
                Request Return Load
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const renderRequests = () => {
    const statusMap = {
      'My Requests': 'Pending',
      'Approved': 'Approved',
      'Rejected': 'Rejected',
      'Completed': 'Completed',
      'Withdrawn': 'Withdrawn'
    };
    const targetStatus = statusMap[activeTab];
    const filtered = requests.filter(r => r.status === targetStatus);

    if (loading) return <p style={styles.loading}>Loading requests...</p>;
    if (filtered.length === 0) return <div style={styles.empty}>No records found in this category.</div>;

    return (
      <div style={styles.grid}>
        {filtered.map(r => (
          <div key={r._id} className="card" style={styles.card}>
            <div style={styles.cardTop}>
              <h4 style={styles.orgName}>{r.organizationId?.businessName || r.organizationId?.name}</h4>
              <span style={{...styles.badge, ...styles[`badge_${r.status}`]}}>{r.status}</span>
            </div>
            <div style={styles.routeRow}>
              <span style={styles.city}>{r.pickup}</span>
              <i className="fa-solid fa-arrow-right" style={{ color: '#F97316' }}></i>
              <span style={styles.city}>{r.destination}</span>
            </div>
            <div style={styles.meta}>
              <span><i className="fa-solid fa-weight-hanging" style={{ color: '#22c55e' }}></i> {r.weight} kg</span>
              <span><i className="fa-solid fa-indian-rupee-sign" style={{ color: '#1E3A8A' }}></i> {r.offeredPrice} offered</span>
            </div>
            
            {r.status === 'Pending' && (
              <div style={styles.actions}>
                <button style={styles.editBtn} onClick={() => setUpdateModal({ request: r, currentPrice: r.offeredPrice })}>
                  Update Price
                </button>
                <button style={styles.cancelBtn} onClick={() => handleWithdraw(r._id)}>
                  Withdraw
                </button>
              </div>
            )}
            
            {(r.status === 'Rejected' || r.status === 'Completed' || r.status === 'Withdrawn') && (
              <div style={styles.actions}>
                <button style={styles.cancelBtn} onClick={() => handleDelete(r._id)}>
                  <i className="fa-solid fa-trash"></i> Delete Record
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={styles.layout}>
      <ConfirmationModal {...confirmModal} />
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>Return Loads</h1>
          <p style={styles.sub}>Find matching shipments for your return trips to avoid running empty.</p>
        </div>

        <div style={styles.tabsContainer}>
          {tabs.map(tab => (
            <button 
              key={tab} 
              style={activeTab === tab ? styles.activeTab : styles.tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Available Loads' ? renderAvailableLoads() : renderRequests()}
      </main>

      {/* Request Modal */}
      {requestModal && (
        <div style={styles.modalOverlay} onClick={() => setRequestModal(null)}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Request Return Load</h3>
            <form onSubmit={handleRequest}>
              <div className="form-group">
                <label>Offered Price (₹)</label>
                <input 
                  type="number" 
                  value={requestModal.defaultPrice} 
                  onChange={e => setRequestModal({ ...requestModal, defaultPrice: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: 12 }}>Submit Request</button>
                <button type="button" style={styles.modalCancel} onClick={() => setRequestModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {updateModal && (
        <div style={styles.modalOverlay} onClick={() => setUpdateModal(null)}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Update Offered Price</h3>
            <form onSubmit={handleUpdatePrice}>
              <div className="form-group">
                <label>New Price (₹)</label>
                <input 
                  type="number" 
                  value={updateModal.currentPrice} 
                  onChange={e => setUpdateModal({ ...updateModal, currentPrice: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: 12 }}>Update</button>
                <button type="button" style={styles.modalCancel} onClick={() => setUpdateModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh' },
  main: { flex: 1, padding: '32px', background: '#f8fafc', overflowY: 'auto' },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 800, color: '#1e293b' },
  sub: { color: '#64748b', marginTop: 4 },
  tabsContainer: { display: 'flex', gap: 10, marginBottom: 24, overflowX: 'auto', paddingBottom: 5 },
  tab: { padding: '10px 20px', borderRadius: 20, border: 'none', background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  activeTab: { padding: '10px 20px', borderRadius: 20, border: 'none', background: '#1E3A8A', color: 'white', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  searchBar: { display: 'flex', gap: 10, marginBottom: 20 },
  searchInput: { flex: 1, padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, outline: 'none' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  card: { padding: 20 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orgName: { fontSize: 16, fontWeight: 700, color: '#1e293b' },
  routeRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 },
  city: { fontSize: 15, fontWeight: 600, color: '#475569' },
  meta: { display: 'flex', gap: 12, fontSize: 13, color: '#64748b', flexWrap: 'wrap' },
  actions: { display: 'flex', gap: 10, marginTop: 16 },
  editBtn: { flex: 1, padding: '8px', border: '1.5px solid #1E3A8A', borderRadius: 6, background: 'white', color: '#1E3A8A', fontWeight: 600, cursor: 'pointer' },
  cancelBtn: { flex: 1, padding: '8px', border: 'none', borderRadius: 6, background: '#fee2e2', color: '#991b1b', fontWeight: 600, cursor: 'pointer' },
  loading: { color: '#64748b', textAlign: 'center', marginTop: 40 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40, padding: 40, background: 'white', borderRadius: 12 },
  badge: { padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  badge_Pending: { background: '#fef3c7', color: '#92400e' },
  badge_Approved: { background: '#d1fae5', color: '#065f46' },
  badge_Rejected: { background: '#fee2e2', color: '#991b1b' },
  badge_Completed: { background: '#dbeafe', color: '#1e40af' },
  badge_Withdrawn: { background: '#f1f5f9', color: '#475569' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalCard: { background: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 400 },
  modalCancel: { flex: 1, padding: 12, border: '1.5px solid #e2e8f0', borderRadius: 8, background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer' }
};
