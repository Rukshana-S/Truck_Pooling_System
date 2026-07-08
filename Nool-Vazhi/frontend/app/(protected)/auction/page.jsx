"use client";
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { auctionAPI, pricingAPI, ratingAPI } from '@/services/api';
import ConfirmModal from '@/components/ConfirmModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { io } from 'socket.io-client';
import LiveNotificationBanner from '@/components/LiveNotificationBanner';
import { toast } from 'react-hot-toast';

const GOODS = ['Electronics', 'Textiles', 'FMCG', 'Machinery', 'Furniture', 'Perishables', 'Chemicals', 'Other'];

function Countdown({ endTime }) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    const tick = () => {
      const diff = new Date(endTime) - new Date();
      if (diff <= 0) { setRemaining('Ended'); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);
  const isUrgent = remaining !== 'Ended' && parseInt(remaining) <= 1;
  return <span style={{ color: remaining === 'Ended' ? '#94a3b8' : isUrgent ? '#ef4444' : '#F97316', fontWeight: 700 }}>
    <i className="fa-solid fa-clock" style={{ marginRight: 4 }}></i>{remaining}
  </span>;
}

const STATUS_STYLE = {
  OPEN: { bg: '#d1fae5', color: '#065f46' },
  CLOSED: { bg: '#fef3c7', color: '#92400e' },
  SELECTED: { bg: '#dbeafe', color: '#1e40af' },
  CONFIRMED: { bg: '#d1fae5', color: '#065f46' },
  CANCELLED: { bg: '#fee2e2', color: '#991b1b' },
};

export default function ShipperAuction() {
  const [auctions, setAuctions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fromLocation: '', toLocation: '', weight: '', goodsType: '', description: '', auctionDuration: 10 });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [selections, setSelections] = useState({}); // { bidId: assignedWeight }
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(null);

  // Smart Pricing
  const [suggestedPrice, setSuggestedPrice] = useState(null);

  const [ratingModal, setRatingModal] = useState(null); // { driverId, auctionId }
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratedAuctions, setRatedAuctions] = useState({});

  const [deleteModal, setDeleteModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ goodsType: '', description: '', auctionDuration: 10 });
  const [modalConfig, setModalConfig] = useState({ isOpen: false });

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await auctionAPI.delete(deleteModal._id);
      toast.success('Auction deleted successfully');
      fetchAuctions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleteModal(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelModal) return;
    try {
      await auctionAPI.cancel(cancelModal._id);
      toast.success('Auction cancelled');
      fetchAuctions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation failed');
    } finally {
      setCancelModal(null);
    }
  };

  const handleEdit = async () => {
    if (!editModal) return;
    try {
      await auctionAPI.update(editModal._id, editForm);
      toast.success('Auction updated');
      setEditModal(null);
      fetchAuctions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  useEffect(() => {
    setRatedAuctions(JSON.parse(localStorage.getItem('noolvazhi_rated_auctions')) || {});
  }, []);

  const fetchAuctions = useCallback(() => {
    auctionAPI.myAuctions().then(({ data }) => setAuctions(data)).catch(() => {});
  }, []);

  const handleClose = (auctionId) => {
    setModalConfig({
      isOpen: true,
      title: 'Close Auction',
      message: 'Drivers will no longer be able to bid.',
      type: 'Warning',
      confirmText: 'Close Auction',
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, loading: true }));
        try {
          await auctionAPI.closeAuction(auctionId);
          toast.success('Auction closed successfully');
          fetchAuctions();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to close auction');
        } finally {
          setModalConfig({ isOpen: false });
        }
      },
      onCancel: () => setModalConfig({ isOpen: false })
    });
  };

  useEffect(() => {
    fetchAuctions();
    const id = setInterval(fetchAuctions, 15000);
    return () => clearInterval(id);
  }, [fetchAuctions]);

  // Smart Price Debouncer
  useEffect(() => {
    if (form.fromLocation && form.toLocation && form.weight) {
      const handler = setTimeout(() => {
        pricingAPI.suggest(form.fromLocation, form.toLocation, form.weight)
          .then(({ data }) => setSuggestedPrice(data))
          .catch(() => setSuggestedPrice(null));
      }, 800);
      return () => clearTimeout(handler);
    } else {
      setSuggestedPrice(null);
    }
  }, [form.fromLocation, form.toLocation, form.weight]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true); setMsg('');
    try {
      await auctionAPI.create(form);
      setMsg('success:Auction created! Drivers can now bid.');
      setShowForm(false);
      setForm({ fromLocation: '', toLocation: '', weight: '', goodsType: '', description: '', auctionDuration: 10 });
      fetchAuctions();
    } catch (err) {
      setMsg('error:' + (err.response?.data?.message || 'Failed'));
    } finally { setCreating(false); }
  };

  const openBids = async (auction) => {
    setSelectedAuction(auction);
    setSelections({});
    setBidsLoading(true);
    try {
      const { data } = await auctionAPI.getBids(auction._id);
      setBids(data.bids);
      setSelectedAuction(data.auction);
    } catch { setBids([]); }
    finally { setBidsLoading(false); }
  };

  const totalAssigned = Object.values(selections).reduce((s, v) => s + (Number(v) || 0), 0);

  const handleSelect = async () => {
    const sel = Object.entries(selections)
      .filter(([, w]) => Number(w) > 0)
      .map(([bidId, assignedWeight]) => ({ bidId, assignedWeight: Number(assignedWeight) }));
    if (!sel.length) return toast.error('Select at least one driver with weight');
    setSubmitting(true);
    try {
      await auctionAPI.selectDrivers(selectedAuction._id, { selections: sel });
      toast.success('Drivers selected! Waiting for their acceptance.');
      setSelectedAuction(null);
      fetchAuctions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Selection failed');
    } finally { setSubmitting(false); }
  };

  const handleRepeat = (a) => {
    setForm({ 
      fromLocation: a.fromLocation, 
      toLocation: a.toLocation, 
      weight: a.weight, 
      goodsType: a.goodsType || '', 
      description: a.description || '', 
      auctionDuration: 10 
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitRating = async () => {
    try {
      await ratingAPI.add({ toUserId: ratingModal.driverId, tripId: ratingModal.auctionId, rating: ratingVal, comment: ratingComment });
      const newRated = { ...ratedAuctions, [ratingModal.auctionId]: true };
      setRatedAuctions(newRated);
      localStorage.setItem('noolvazhi_rated_auctions', JSON.stringify(newRated));
      setRatingModal(null);
      setRatingVal(5); setRatingComment('');
      toast.success('Rating submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit rating');
    }
  };

  return (
    <div style={{ ...styles.layout, width: '100vw' }}>
      <ConfirmationModal {...modalConfig} />
      <Sidebar />
      <main className="p-mobile-16" style={styles.main}>
        <LiveNotificationBanner categoryMatch="Auction" />
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              <i className="fa-solid fa-gavel" style={{ color: '#F97316', marginRight: 10 }}></i>
              Auction Requests
            </h1>
            <p style={styles.sub}>Create time-bound shipment auctions and get the best bids from drivers</p>
          </div>
          <button className="btn-primary" onClick={() => { setShowForm(!showForm); setMsg(''); }}>
            <i className={`fa-solid ${showForm ? 'fa-xmark' : 'fa-plus'}`}></i>
            {showForm ? 'Cancel' : 'New Auction'}
          </button>
        </div>

        {msg && (
          <div style={msg.startsWith('success') ? styles.success : styles.error}>
            <i className={`fa-solid ${msg.startsWith('success') ? 'fa-circle-check' : 'fa-circle-xmark'}`} style={{ marginRight: 8 }}></i>
            {msg.replace(/^(success|error):/, '')}
          </div>
        )}

        {/* Create Form */}
        {showForm && (
          <div className="card" style={{ padding: 28, marginBottom: 28 }}>
            <h3 style={styles.cardTitle}>
              <i className="fa-solid fa-gavel" style={{ color: '#F97316', marginRight: 8 }}></i>
              New Auction Request
            </h3>
            <form onSubmit={handleCreate}>
              <div style={styles.grid3}>
                <div className="form-group">
                  <label>From Location *</label>
                  <input value={form.fromLocation} onChange={e => setForm({ ...form, fromLocation: e.target.value })} placeholder="e.g. Chennai" required />
                </div>
                <div className="form-group">
                  <label>To Location *</label>
                  <input value={form.toLocation} onChange={e => setForm({ ...form, toLocation: e.target.value })} placeholder="e.g. Coimbatore" required />
                </div>
                <div className="form-group">
                  <label>Total Weight (kg) *</label>
                  <input type="number" min="1" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} placeholder="e.g. 500" required />
                </div>

                {/* AI Smart Pricing */}
                {suggestedPrice && (
                  <div style={{ gridColumn: '1 / -1', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, color: '#16a34a', fontSize: 14, marginBottom: 8 }}>
                    <i className="fa-solid fa-sparkles" style={{ color: '#F97316', fontSize: 18 }}></i>
                    <div>
                      <strong>Recommended Price: ₹{suggestedPrice.suggested}/kg</strong> (₹{suggestedPrice.min} - ₹{suggestedPrice.max})
                      <div style={{ fontSize: 12, color: '#15803d', marginTop: 2 }}>Calculated from distance and live route demand to help you get faster bids.</div>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Goods Type</label>
                  <select value={form.goodsType} onChange={e => setForm({ ...form, goodsType: e.target.value })}>
                    <option value="">Select type</option>
                    {GOODS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Auction Duration (minutes) *</label>
                  <select value={form.auctionDuration} onChange={e => setForm({ ...form, auctionDuration: Number(e.target.value) })}>
                    {[5, 10, 15, 30, 60].map(m => <option key={m} value={m}>{m} minutes</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Description (optional)</label>
                  <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Any special requirements" />
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '12px 32px' }} disabled={creating}>
                <i className="fa-solid fa-gavel"></i> {creating ? 'Creating...' : 'Launch Auction'}
              </button>
            </form>
          </div>
        )}

        {/* Auctions List */}
        {auctions.length === 0 ? (
          <div style={styles.empty}>
            <i className="fa-solid fa-gavel" style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 12 }}></i>
            <p>No auctions yet. Create one to get bids from drivers.</p>
          </div>
        ) : (
          <div style={styles.auctionList}>
            {auctions.map(a => {
              const st = STATUS_STYLE[a.status] || STATUS_STYLE.CANCELLED;
              return (
                <div key={a._id} className="card" style={styles.auctionCard}>
                  <div style={styles.auctionTop}>
                    <div>
                      <div style={styles.auctionId}>{a.auctionId}</div>
                      <div style={styles.routeRow}>
                        <span style={styles.city}>{a.fromLocation}</span>
                        <i className="fa-solid fa-arrow-right" style={{ color: '#F97316' }}></i>
                        <span style={styles.city}>{a.toLocation}</span>
                      </div>
                    </div>
                    <span style={{ background: st.bg, color: st.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                      {a.status}
                    </span>
                  </div>

                  <div style={styles.metaRow}>
                    <span style={styles.chip}><i className="fa-solid fa-weight-hanging" style={{ marginRight: 4 }}></i>{a.weight} kg</span>
                    {a.goodsType && <span style={styles.chip}><i className="fa-solid fa-box" style={{ marginRight: 4 }}></i>{a.goodsType}</span>}
                    <span style={styles.chip}><i className="fa-solid fa-clock" style={{ marginRight: 4 }}></i>{a.auctionDuration} min auction</span>
                    {a.status === 'OPEN' && <Countdown endTime={a.auctionEndTime} />}
                    {a.status !== 'OPEN' && (
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        Ended {new Date(a.auctionEndTime).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  <div style={styles.auctionActions}>
                    {(a.status === 'CLOSED' || a.status === 'OPEN') && (
                      <button style={styles.viewBidsBtn} onClick={() => openBids(a)}>
                        <i className="fa-solid fa-list"></i> View Bids
                      </button>
                    )}
                    {a.status === 'OPEN' && (
                      <button
                        style={styles.closeNowBtn}
                        onClick={() => handleClose(a._id)}
                        disabled={closing === a._id}
                      >
                        <i className="fa-solid fa-flag-checkered"></i>
                        {closing === a._id ? 'Closing...' : 'Close Now'}
                      </button>
                    )}
                    {a.status === 'SELECTED' && (
                      <span style={{ fontSize: 13, color: '#1e40af', fontWeight: 600 }}>
                        <i className="fa-solid fa-hourglass-half" style={{ marginRight: 6 }}></i>
                        Waiting for driver acceptance
                      </span>
                    )}
                    {a.status === 'CONFIRMED' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, color: '#065f46', fontWeight: 600 }}>
                          <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }}></i>
                          Confirmed — drivers accepted
                        </span>
                        <Link href={`/tracking?id=${a.auctionId}`}>
                          <button style={styles.trackBtn}>
                            <i className="fa-solid fa-location-dot"></i> Track
                          </button>
                        </Link>
                        {a.selections?.length > 0 && a.selections[0].deliveryStatus === 'Delivered' && (
                          ratedAuctions[a._id] ? (
                            <span style={{ fontSize: 13, color: '#f59e0b', fontWeight: 700, padding: '8px 18px', background: '#fffbeb', borderRadius: 8, border: '1.5px solid #fef3c7' }}>
                              ★★★★★ Rated
                            </span>
                          ) : (
                            <button style={styles.rateBtn} onClick={() => setRatingModal({ driverId: a.selections[0].driver, auctionId: a._id })}>
                              <i className="fa-solid fa-star"></i> Rate Driver
                            </button>
                          )
                        )}
                      </div>
                    )}
                    
                    {/* Quick Rebooking / Repeat Button */}
                    {a.status !== 'OPEN' && (
                      <button style={styles.repeatBtn} onClick={() => handleRepeat(a)}>
                        <i className="fa-solid fa-rotate-right" style={{ marginRight: 6 }}></i> Repeat
                      </button>
                    )}
                    {a.status === 'OPEN' && (
                      <>
                        <button style={styles.repeatBtn} onClick={() => { setEditModal(a); setEditForm({ goodsType: a.goodsType || '', description: a.description || '', auctionDuration: a.auctionDuration || 10 }); }}>
                          <i className="fa-solid fa-pen" style={{ marginRight: 6 }}></i> Edit
                        </button>
                        <button style={{ ...styles.closeNowBtn, background: 'white', border: '1.5px solid #fecaca', color: '#ef4444' }} onClick={() => setCancelModal(a)}>
                          <i className="fa-solid fa-ban" style={{ marginRight: 6 }}></i> Cancel
                        </button>
                      </>
                    )}
                    {(a.status === 'CANCELLED' || a.status === 'CLOSED') && (
                      <button style={{ ...styles.closeNowBtn, background: 'white', border: '1.5px solid #fecaca', color: '#ef4444' }} onClick={() => setDeleteModal(a)}>
                        <i className="fa-solid fa-trash" style={{ marginRight: 6 }}></i> Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bids Modal */}
        {selectedAuction && (
          <div style={styles.modalOverlay} onClick={() => setSelectedAuction(null)}>
            <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>
                  <i className="fa-solid fa-list" style={{ color: '#1E3A8A', marginRight: 8 }}></i>
                  Bids — {selectedAuction.fromLocation} → {selectedAuction.toLocation}
                </h3>
                <button style={styles.closeBtn} onClick={() => setSelectedAuction(null)}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
                Total weight: <strong>{selectedAuction.weight} kg</strong> &nbsp;·&nbsp;
                Status: <strong>{selectedAuction.status}</strong>
              </p>

              {bidsLoading ? (
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24, color: '#cbd5e1' }}></i>
                </div>
              ) : bids.length === 0 ? (
                <div style={styles.empty}>
                  <i className="fa-solid fa-inbox" style={{ fontSize: 36, color: '#cbd5e1', marginBottom: 8 }}></i>
                  <p>No bids yet.</p>
                </div>
              ) : (
                <>
                  <div style={styles.bidsTable}>
                    <div style={styles.bidsHead}>
                      <span>Driver</span><span>Rating</span><span>₹/kg</span><span>Total</span>
                      {selectedAuction.status === 'CLOSED' && <span>Assign (kg)</span>}
                    </div>
                    {bids.map((bid, i) => (
                      <div key={bid._id} style={{ ...styles.bidRow, background: i % 2 === 0 ? '#f8fafc' : 'white' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{bid.driver?.name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{bid.driver?.vehicleType} · {bid.driver?.vehicleNumber}</div>
                        </div>
                        <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: 13 }}>
                          {bid.driver?.rating > 0 ? `⭐ ${bid.driver.rating.toFixed(1)} (${bid.driver.totalRatings || 1} trips)` : 'New'}
                        </span>
                        <span style={{ fontWeight: 700, color: '#1E3A8A' }}>₹{bid.pricePerKg}</span>
                        <span style={{ fontWeight: 600 }}>₹{bid.totalPrice?.toLocaleString()}</span>
                        {selectedAuction.status === 'CLOSED' && (
                          <input
                            type="number"
                            min="0"
                            max={selectedAuction.weight}
                            placeholder="0"
                            value={selections[bid._id] || ''}
                            onChange={e => setSelections(prev => ({ ...prev, [bid._id]: e.target.value }))}
                            style={styles.weightInput}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedAuction.status === 'CLOSED' && (
                    <div style={styles.selectionFooter}>
                      <div style={styles.weightSummary}>
                        <span>Assigned: <strong style={{ color: totalAssigned > selectedAuction.weight ? '#ef4444' : '#1E3A8A' }}>{totalAssigned} kg</strong></span>
                        <span>/ {selectedAuction.weight} kg total</span>
                        {totalAssigned > selectedAuction.weight && (
                          <span style={{ color: '#ef4444', fontSize: 12 }}>
                            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 4 }}></i>
                            Exceeds total weight!
                          </span>
                        )}
                      </div>
                      <button
                        className="btn-primary"
                        style={{ padding: '10px 24px' }}
                        onClick={handleSelect}
                        disabled={submitting || totalAssigned === 0 || totalAssigned > selectedAuction.weight}
                      >
                        <i className="fa-solid fa-check"></i>
                        {submitting ? 'Selecting...' : 'Confirm Selection'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Rating Modal */}
        {ratingModal && (
          <div style={styles.modalOverlay} onClick={() => setRatingModal(null)}>
            <div style={{ ...styles.modalCard, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 12, display: 'flex', alignItems: 'center' }}>
                <i className="fa-solid fa-star" style={{ color: '#f59e0b', marginRight: 8 }}></i>
                Rate Driver
              </h3>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
                How was your experience with this delivery?
              </p>
              
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
                {[1,2,3,4,5].map(star => (
                  <button 
                    key={star} 
                    onClick={() => setRatingVal(star)}
                    style={{ background: 'none', border: 'none', fontSize: 32, cursor: 'pointer', color: star <= ratingVal ? '#f59e0b' : '#e2e8f0', transition: 'color 0.2s' }}
                  >
                    ★
                  </button>
                ))}
              </div>

              <div className="form-group">
                <label>Comment (Optional)</label>
                <textarea 
                  rows="3" 
                  value={ratingComment} 
                  onChange={e => setRatingComment(e.target.value)}
                  placeholder="Leave a review..."
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button className="btn-primary" style={{ flex: 1, padding: '12px' }} onClick={submitRating}>
                  Submit Rating
                </button>
                <button style={{ flex: 1, padding: '12px', border: '1.5px solid #e2e8f0', borderRadius: 10, background: 'white', fontWeight: 600, color: '#64748b', cursor: 'pointer' }} onClick={() => setRatingModal(null)}>
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Edit Auction Modal */}
      {editModal && (
        <div style={styles.modalOverlay} onClick={() => setEditModal(null)}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <h3 style={styles.cardTitle}>
              <i className="fa-solid fa-pen" style={{ color: '#F97316', marginRight: 8 }}></i>
              Edit Auction
            </h3>
            <div className="form-group">
              <label>Goods Type</label>
              <select value={editForm.goodsType} onChange={e => setEditForm({ ...editForm, goodsType: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px' }}>
                <option value="">Select type</option>
                {GOODS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Description (optional)</label>
              <input value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '12px' }} onClick={handleEdit}>
                Save Changes
              </button>
              <button style={{ ...styles.cancelBtn, flex: 1, padding: '12px' }} onClick={() => setEditModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!cancelModal}
        title="Cancel Auction"
        message="Are you sure you want to cancel this auction? It will stop drivers from bidding."
        confirmText="Cancel Auction"
        type="Danger"
        onConfirm={handleCancel}
        onCancel={() => setCancelModal(null)}
      />

      <ConfirmationModal
        isOpen={!!deleteModal}
        title="Delete Auction"
        message="Are you sure you want to permanently delete this auction?"
        confirmText="Delete"
        type="Danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal(null)}
      />

    </div>
  );
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh', width: '100vw', overflowX: 'hidden' },
  main: { flex: 1, padding: '32px', background: '#f8fafc', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
  title: { fontSize: 26, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center' },
  sub: { color: '#64748b', marginTop: 4, fontSize: 14 },
  success: { background: '#d1fae5', color: '#065f46', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 14, display: 'flex', alignItems: 'center' },
  error: { background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 14, display: 'flex', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 },
  empty: { textAlign: 'center', padding: '48px 20px', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  auctionList: { display: 'flex', flexDirection: 'column', gap: 16 },
  auctionCard: { padding: 24 },
  auctionTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  auctionId: { fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4, letterSpacing: '0.5px' },
  routeRow: { display: 'flex', alignItems: 'center', gap: 10 },
  city: { fontSize: 18, fontWeight: 700, color: '#1e293b' },
  metaRow: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 },
  chip: { background: '#f1f5f9', color: '#475569', fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center' },
  auctionActions: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  viewBidsBtn: { padding: '8px 18px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#1E3A8A', display: 'flex', alignItems: 'center', gap: 6 },
  trackBtn: { padding: '8px 18px', border: 'none', borderRadius: 8, background: '#1E3A8A', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 },
  closeNowBtn: { padding: '8px 18px', border: 'none', borderRadius: 8, background: '#fee2e2', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 6 },
  rateBtn: { padding: '8px 18px', border: '1.5px solid #fef3c7', borderRadius: 8, background: '#fffbeb', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#d97706', display: 'flex', alignItems: 'center', gap: 6 },
  repeatBtn: { padding: '8px 18px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 680, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 17, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center' },
  closeBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b', padding: 4 },
  bidsTable: { border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 16 },
  bidsHead: { display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr', gap: 8, padding: '10px 16px', background: '#f1f5f9', fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase' },
  bidRow: { display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr', gap: 8, padding: '12px 16px', alignItems: 'center', fontSize: 14, borderTop: '1px solid #f1f5f9' },
  weightInput: { width: '80px', padding: '6px 8px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 13, outline: 'none' },
  selectionFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 12 },
  weightSummary: { display: 'flex', gap: 12, alignItems: 'center', fontSize: 14, color: '#475569', flexWrap: 'wrap' },
};
