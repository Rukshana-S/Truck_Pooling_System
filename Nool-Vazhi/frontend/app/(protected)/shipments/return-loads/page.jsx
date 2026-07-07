"use client";
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Sidebar from '@/components/Sidebar';
import { returnLoadAPI } from '@/services/api';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function OrganizationReturnLoads() {
  const [activeTab, setActiveTab] = useState('Incoming Requests');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const [modifyModal, setModifyModal] = useState(null); // { request, pickupTime, remarks, actionType }

  const tabs = ['Incoming Requests', 'Approved', 'Rejected', 'Completed', 'Withdrawn'];

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await returnLoadAPI.getOrgRequests();
      setRequests(data);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleStatusUpdate = async (reqId, status, payload = {}) => {
    try {
      await returnLoadAPI.updateOrgRequest(reqId, { status, ...payload });
      toast.success(`Request ${status.toLowerCase()}!`);
      setModifyModal(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const handleActionClick = (r, actionType) => {
    if (actionType === 'Approve') {
      setConfirmModal({
        isOpen: true,
        title: 'Approve Return Load',
        message: `Approve this request? The shipment will be assigned to driver ${r.driverId?.name}.`,
        type: 'Success',
        confirmText: 'Approve',
        onConfirm: () => {
          handleStatusUpdate(r._id, 'Approved');
          setConfirmModal({ isOpen: false });
        },
        onCancel: () => setConfirmModal({ isOpen: false })
      });
    } else if (actionType === 'Reject') {
      setModifyModal({ request: r, pickupTime: '', remarks: '', actionType: 'Reject' });
    } else if (actionType === 'Modify') {
      setModifyModal({ request: r, pickupTime: r.pickupTime ? new Date(r.pickupTime).toISOString().slice(0, 16) : '', remarks: r.remarks || '', actionType: 'Modify' });
    }
  };

  const submitModification = (e) => {
    e.preventDefault();
    if (modifyModal.actionType === 'Reject') {
      handleStatusUpdate(modifyModal.request._id, 'Rejected', { remarks: modifyModal.remarks });
    } else {
      // It's a modify but keep status Pending until they approve
      // Actually, if we just want to update remarks and time:
      returnLoadAPI.updateOrgRequest(modifyModal.request._id, { 
        status: 'Pending', 
        pickupTime: modifyModal.pickupTime, 
        remarks: modifyModal.remarks 
      })
      .then(() => {
        toast.success('Request updated');
        setModifyModal(null);
        fetchData();
      })
      .catch(err => toast.error(err.response?.data?.message || 'Failed'));
    }
  };

  const handleDelete = (reqId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Archive Record',
      message: 'Remove this record from your dashboard?',
      type: 'Danger',
      confirmText: 'Archive',
      onConfirm: async () => {
        try {
          await returnLoadAPI.delete(reqId);
          toast.success('Record archived');
          fetchData();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to archive');
        } finally {
          setConfirmModal({ isOpen: false });
        }
      },
      onCancel: () => setConfirmModal({ isOpen: false })
    });
  };

  const renderRequests = () => {
    const statusMap = {
      'Incoming Requests': 'Pending',
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
              <h4 style={styles.driverName}>{r.driverId?.name || 'Unknown Driver'}</h4>
              <span style={{...styles.badge, ...styles[`badge_${r.status}`]}}>{r.status}</span>
            </div>
            <div style={styles.routeRow}>
              <span style={styles.city}>{r.pickup}</span>
              <i className="fa-solid fa-arrow-right" style={{ color: '#F97316' }}></i>
              <span style={styles.city}>{r.destination}</span>
            </div>
            
            <div style={styles.detailsBox}>
              <div style={styles.detailRow}><span>Offered Price:</span> <strong>₹{r.offeredPrice}</strong></div>
              <div style={styles.detailRow}><span>Vehicle Capacity:</span> <strong>{r.vehicleCapacity} kg</strong></div>
              <div style={styles.detailRow}><span>Shipment Weight:</span> <strong>{r.weight} kg ({r.goodsType})</strong></div>
              {r.pickupTime && <div style={styles.detailRow}><span>Pickup Time:</span> <strong>{new Date(r.pickupTime).toLocaleString()}</strong></div>}
              {r.remarks && <div style={styles.detailRow}><span>Remarks:</span> <strong>{r.remarks}</strong></div>}
            </div>

            {r.status === 'Pending' && (
              <div style={styles.actions}>
                <button style={styles.approveBtn} onClick={() => handleActionClick(r, 'Approve')}>Approve</button>
                <button style={styles.rejectBtn} onClick={() => handleActionClick(r, 'Reject')}>Reject</button>
                <button style={styles.modifyBtn} onClick={() => handleActionClick(r, 'Modify')}>Add Details</button>
              </div>
            )}
            
            {(r.status === 'Rejected' || r.status === 'Completed' || r.status === 'Withdrawn') && (
              <div style={styles.actions}>
                <button style={styles.rejectBtn} onClick={() => handleDelete(r._id)}>
                  <i className="fa-solid fa-box-archive"></i> Archive Record
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
          <h1 style={styles.title}>Return Load Requests</h1>
          <p style={styles.sub}>Manage incoming return load requests from drivers to get your shipments picked up quickly.</p>
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

        {renderRequests()}
      </main>

      {/* Modify / Reject Modal */}
      {modifyModal && (
        <div style={styles.modalOverlay} onClick={() => setModifyModal(null)}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              {modifyModal.actionType === 'Reject' ? 'Reject Request' : 'Add Pickup Details'}
            </h3>
            <form onSubmit={submitModification}>
              {modifyModal.actionType === 'Modify' && (
                <div className="form-group">
                  <label>Suggested Pickup Time</label>
                  <input 
                    type="datetime-local" 
                    value={modifyModal.pickupTime} 
                    onChange={e => setModifyModal({ ...modifyModal, pickupTime: e.target.value })}
                  />
                </div>
              )}
              <div className="form-group">
                <label>Remarks {modifyModal.actionType === 'Reject' && '(Reason)'}</label>
                <textarea 
                  rows="3"
                  value={modifyModal.remarks} 
                  onChange={e => setModifyModal({ ...modifyModal, remarks: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1.5px solid #e2e8f0' }}
                  required={modifyModal.actionType === 'Reject'}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button 
                  type="submit" 
                  style={modifyModal.actionType === 'Reject' ? {...styles.rejectBtn, flex: 1} : {...styles.approveBtn, flex: 1}}
                >
                  Confirm {modifyModal.actionType}
                </button>
                <button type="button" style={styles.modalCancel} onClick={() => setModifyModal(null)}>Cancel</button>
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
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 },
  card: { padding: 20 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  driverName: { fontSize: 16, fontWeight: 700, color: '#1e293b' },
  routeRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 },
  city: { fontSize: 15, fontWeight: 600, color: '#475569' },
  detailsBox: { background: '#f1f5f9', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#475569', display: 'flex', flexDirection: 'column', gap: 6 },
  detailRow: { display: 'flex', justifyContent: 'space-between' },
  actions: { display: 'flex', gap: 10 },
  approveBtn: { flex: 1, padding: '8px', border: 'none', borderRadius: 6, background: '#10b981', color: 'white', fontWeight: 600, cursor: 'pointer' },
  rejectBtn: { flex: 1, padding: '8px', border: 'none', borderRadius: 6, background: '#fee2e2', color: '#991b1b', fontWeight: 600, cursor: 'pointer' },
  modifyBtn: { flex: 1, padding: '8px', border: '1.5px solid #1E3A8A', borderRadius: 6, background: 'white', color: '#1E3A8A', fontWeight: 600, cursor: 'pointer' },
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
