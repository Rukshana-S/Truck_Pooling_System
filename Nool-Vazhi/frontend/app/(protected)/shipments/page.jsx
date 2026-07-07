"use client";
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import LiveNotificationBanner from '@/components/LiveNotificationBanner';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { shipmentAPI, paymentAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import ConfirmationModal from '@/components/ConfirmationModal';
import { toast } from 'react-hot-toast';

const statusClass = {
  Pending: 'badge-pending',
  'In Transit': 'badge-transit',
  Delivered: 'badge-delivered',
  Cancelled: 'badge-cancelled',
  'Pickup Confirmed': 'badge-transit',
  'Out for Delivery': 'badge-transit',
};

const STATUS_OPTIONS = ['Pickup Confirmed', 'In Transit', 'Out for Delivery', 'Delivered'];

export default function Shipments() {
  const { user } = useAuth();
  const isDriver = user?.role === 'driver';
  const [shipments, setShipments] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  
  const [modal, setModal] = useState(null);
  const [statusInput, setStatusInput] = useState('');
  const [updating, setUpdating] = useState(false);
  
  const [deleteModal, setDeleteModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ goodsType: '', bundles: '' });

  const fetchShipments = () => {
    setLoading(true);
    shipmentAPI.getAll()
      .then(({ data }) => setShipments(data))
      .catch(() => setShipments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchShipments(); }, []);

  const openModal = (s) => { setModal(s); setStatusInput(s.status); };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await shipmentAPI.updateLocation(modal._id, { status: statusInput });
      setModal(null);
      toast.success('Status updated');
      fetchShipments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setUpdating(false); }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await shipmentAPI.delete(deleteModal._id);
      toast.success('Shipment deleted successfully');
      fetchShipments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleteModal(null);
    }
  };

  const handleEdit = async () => {
    if (!editModal) return;
    try {
      await shipmentAPI.update(editModal._id, editForm);
      toast.success('Shipment updated successfully');
      setEditModal(null);
      fetchShipments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const handlePayAdvance = async (shipment) => {
    try {
      const advanceAmount = Math.round(shipment.cost.total * 0.1);
      
      let payload = null;

      // 1. Check for existing payment
      try {
        const getRes = await paymentAPI.getForShipment(shipment._id);
        const payments = getRes.data.data || [];
        const existingAdvance = payments.find(p => p.type === 'Advance' && p.status === 'Pending Advance');
        
        if (existingAdvance && existingAdvance.razorpayOrderId) {
          payload = {
            payment: existingAdvance,
            razorpayOrder: {
              id: existingAdvance.razorpayOrderId,
              amount: existingAdvance.amount * 100
            }
          };
        }
      } catch (getErr) {
        console.error('Error checking existing payments:', getErr);
      }

      // 2. If no existing payment, create one
      if (!payload) {
        try {
          const { data: apiResponse } = await paymentAPI.create({
            shipmentId: shipment._id,
            amount: advanceAmount,
            type: 'Advance'
          });
          payload = apiResponse.data;
        } catch (createErr) {
          // Graceful fallback if 409 Conflict is returned
          if (createErr.response?.status === 409 && createErr.response?.data?.existingPayment) {
            const existing = createErr.response.data.existingPayment;
            payload = {
              payment: existing,
              razorpayOrder: {
                id: existing.razorpayOrderId,
                amount: existing.amount * 100
              }
            };
          } else {
            throw createErr;
          }
        }
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TAbp16UZYjRwe5', // Default to test key for safety
        amount: payload.razorpayOrder.amount,
        currency: 'INR',
        name: 'Nool-Vazhi',
        description: `Advance Payment for Shipment ${shipment.shipmentId}`,
        order_id: payload.razorpayOrder.id,
        handler: async function (response) {
          try {
            await paymentAPI.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentId: payload.payment._id,
              status: 'Advance Paid'
            });
            toast.success('Advance payment successful!');
            fetchShipments();
          } catch (verifyErr) {
            toast.error(verifyErr.response?.data?.message || 'Payment verification failed');
          }
        },
        prefill: {
          name: user?.businessName || user?.name || '',
          email: user?.email || '',
          contact: user?.phone || ''
        },
        theme: {
          color: '#1E3A8A' // Nool-Vazhi primary color
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment');
    }
  };

  const statuses = ['All', 'Pickup Confirmed', 'In Transit', 'Out for Delivery', 'Delivered', 'Pending', 'Cancelled'];
  const filtered = filter === 'All' ? shipments : shipments.filter(s => s.status === filter);

  return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main}>
        <LiveNotificationBanner categoryMatch="Shipments" />
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>{isDriver ? 'My Trips' : 'Shipments'}</h1>
            <p style={styles.sub}>{shipments.length} total {isDriver ? 'trips' : 'shipments'}</p>
          </div>
          {!isDriver && (
            <div style={{ display: 'flex', gap: 10 }}>
              <Link href="/shipments/return-loads">
                <button className="btn-primary" style={{ background: '#1E3A8A' }}>
                  <i className="fa-solid fa-rotate"></i> Return Loads
                </button>
              </Link>
              <Link href="/dashboard">
                <button className="btn-primary">
                  <i className="fa-solid fa-plus"></i> New Shipment
                </button>
              </Link>
            </div>
          )}
        </div>

        <div style={styles.filterRow}>
          {statuses.map(s => (
            <button key={s} style={{ ...styles.filterBtn, ...(filter === s ? styles.filterActive : {}) }} onClick={() => setFilter(s)}>
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={styles.loading}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 12 }}></i>
            <p>Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={styles.empty}>
            <i className="fa-solid fa-inbox" style={{ fontSize: 64, color: '#cbd5e1', marginBottom: 16 }}></i>
            <p>{isDriver ? 'No trips yet. Accept shipments from the dashboard.' : filter === 'All' ? 'No shipments yet.' : `No shipments with status "${filter}".`}</p>
            {!isDriver && shipments.length === 0 && (
              <Link href="/dashboard"><button className="btn-primary" style={{ marginTop: 16 }}>Book Your First Shipment</button></Link>
            )}
          </div>
        ) : (
          <div style={styles.list}>
            {filtered.map((s) => (
              <div key={s._id} className="card" style={styles.shipCard}>
                <div style={styles.shipTop}>
                  <div>
                    <div style={styles.shipId}>{s.shipmentId}</div>
                    <div style={styles.shipRoute}>
                      <span style={styles.city}>{s.pickup}</span>
                      <i className="fa-solid fa-arrow-right" style={{ color: '#F97316' }}></i>
                      <span style={styles.city}>{s.drop}</span>
                    </div>
                  </div>
                  <span className={`badge ${statusClass[s.status] || 'badge-pending'}`}>{s.status}</span>
                </div>

                <div style={styles.shipMeta}>
                  <div style={styles.metaItem}><span style={styles.metaLabel}>Goods</span><span>{s.goodsType}</span></div>
                  <div style={styles.metaItem}><span style={styles.metaLabel}>Bundles</span><span>{s.bundles}</span></div>
                  {isDriver ? (
                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Shipper</span>
                      <span>{s.shipper?.businessName || s.shipper?.name || 'N/A'}</span>
                    </div>
                  ) : (
                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Driver</span>
                      <span>{s.driver?.name || 'Assigning...'}</span>
                    </div>
                  )}
                  {isDriver && s.currentLocation && (
                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>GPS Location</span>
                      <span><i className="fa-solid fa-satellite-dish" style={{ color: '#22c55e', marginRight: 4 }}></i>{s.currentLocation}</span>
                    </div>
                  )}
                  <div style={styles.metaItem}><span style={styles.metaLabel}>Date</span><span>{new Date(s.createdAt).toLocaleDateString('en-IN')}</span></div>
                  <div style={styles.metaItem}><span style={styles.metaLabel}>Cost</span><span style={{ color: '#1E3A8A', fontWeight: 700 }}>₹{s.cost?.total?.toLocaleString()}</span></div>
                </div>

                <div style={styles.shipActions}>
                  {isDriver ? (
                    s.status !== 'Delivered' && s.status !== 'Cancelled' ? (
                      s.paymentStatus === 'Pending Advance' ? (
                        <button className="btn-secondary" style={{ padding: '8px 20px', fontSize: 13, cursor: 'not-allowed', opacity: 0.7 }} disabled>
                          <i className="fa-solid fa-lock"></i> Waiting for Advance Payment
                        </button>
                      ) : (
                        <button className="btn-primary" style={{ padding: '8px 20px', fontSize: 13 }} onClick={() => openModal(s)}>
                          <i className="fa-solid fa-pen"></i> Update Status
                        </button>
                      )
                    ) : (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 13 }}>
                          <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }}></i>
                          {s.status}
                        </span>
                        {s.status === 'Delivered' && (
                          <Link href={`/driver-trips/return-loads?location=${encodeURIComponent(s.drop)}`}>
                            <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 12, background: '#F97316', border: 'none' }}>
                              <i className="fa-solid fa-rotate" style={{ marginRight: 6 }}></i> Find Return Load
                            </button>
                          </Link>
                        )}
                      </div>
                    )
                  ) : (
                    <>
                      <Link href={`/tracking?id=${s.shipmentId}`}>
                        <button className="btn-blue" style={{ padding: '8px 20px', fontSize: 13 }}>
                          <i className="fa-solid fa-location-dot"></i> Track
                        </button>
                      </Link>
                      {s.driver && s.paymentStatus === 'Pending Advance' && (
                        <button className="btn-primary" style={{ padding: '8px 20px', fontSize: 13, background: '#10b981', border: 'none' }} onClick={() => handlePayAdvance(s)}>
                          <i className="fa-solid fa-credit-card"></i> Pay Advance (10%)
                        </button>
                      )}
                      {!s.driver && s.status === 'Pending' && (
                        <>
                          <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13, background: 'white', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: '8px' }} onClick={() => { setEditModal(s); setEditForm({ goodsType: s.goodsType, bundles: s.bundles }); }}>
                            <i className="fa-solid fa-pen"></i> Edit
                          </button>
                          <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13, background: '#fee2e2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '8px' }} onClick={() => setDeleteModal(s)}>
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Driver Status Modal */}
      {modal && (
        <div style={styles.modalOverlay} onClick={() => setModal(null)}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              <i className="fa-solid fa-pen" style={{ color: '#F97316', marginRight: 8 }}></i>
              Update Status
            </h3>
            <p style={styles.modalRoute}>{modal.pickup} → {modal.drop}</p>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#15803d', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-satellite-dish"></i>
              Location is tracked automatically via GPS
            </div>
            <div className="form-group">
              <label>Update Status</label>
              <select value={statusInput} onChange={e => setStatusInput(e.target.value)}>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '12px' }} onClick={handleUpdate} disabled={updating}>
                {updating ? 'Updating...' : 'Update'}
              </button>
              <button style={styles.cancelBtn} onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Shipment Modal */}
      {editModal && (
        <div style={styles.modalOverlay} onClick={() => setEditModal(null)}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              <i className="fa-solid fa-pen" style={{ color: '#F97316', marginRight: 8 }}></i>
              Edit Shipment
            </h3>
            <p style={styles.modalRoute}>{editModal.pickup} → {editModal.drop}</p>
            <div className="form-group">
              <label>Goods Type</label>
              <input type="text" value={editForm.goodsType} onChange={e => setEditForm({ ...editForm, goodsType: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px' }} />
            </div>
            <div className="form-group">
              <label>Bundles</label>
              <input type="number" value={editForm.bundles} onChange={e => setEditForm({ ...editForm, bundles: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '12px' }} onClick={handleEdit}>
                Save Changes
              </button>
              <button style={styles.cancelBtn} onClick={() => setEditModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteModal}
        title="Delete Shipment"
        message={`Are you sure you want to delete shipment ${deleteModal?.shipmentId}? This action cannot be undone.`}
        confirmText="Delete"
        type="Danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal(null)}
      />
    </div>
  );
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh' },
  main: { flex: 1, padding: '32px', background: '#f8fafc' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 },
  title: { fontSize: 28, fontWeight: 800, color: '#1e293b' },
  sub: { color: '#64748b', marginTop: 4 },
  filterRow: { display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  filterBtn: { padding: '8px 18px', border: '1.5px solid #e2e8f0', borderRadius: 20, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b', transition: 'all 0.2s' },
  filterActive: { background: '#1E3A8A', color: 'white', border: '1.5px solid #1E3A8A' },
  loading: { textAlign: 'center', padding: 60, color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  empty: { textAlign: 'center', padding: 80, color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  list: { display: 'flex', flexDirection: 'column', gap: 16 },
  shipCard: { padding: '24px' },
  shipTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  shipId: { fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 6, letterSpacing: '0.5px' },
  shipRoute: { display: 'flex', alignItems: 'center', gap: 10 },
  city: { fontSize: 18, fontWeight: 700, color: '#1e293b' },
  shipMeta: { display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' },
  metaItem: { display: 'flex', flexDirection: 'column', gap: 2 },
  metaLabel: { fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' },
  shipActions: { display: 'flex', gap: 10, alignItems: 'center' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 6, display: 'flex', alignItems: 'center' },
  modalRoute: { color: '#64748b', fontSize: 14, marginBottom: 24 },
  cancelBtn: { flex: 1, padding: '12px', border: '1.5px solid #e2e8f0', borderRadius: 10, background: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#64748b' },
};
