"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import Sidebar from '@/components/Sidebar';
import { auctionAPI } from '@/services/api';
import ConfirmationModal from '@/components/ConfirmationModal';
import { io } from 'socket.io-client';
import LiveNotificationBanner from '@/components/LiveNotificationBanner';

const STATUS_OPTIONS = ['Pickup Confirmed', 'In Transit', 'Out for Delivery', 'Delivered'];

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
  const isUrgent = remaining !== 'Ended' && parseInt(remaining) === 0;
  return (
    <span style={{ color: remaining === 'Ended' ? '#94a3b8' : isUrgent ? '#ef4444' : '#22c55e', fontWeight: 700, fontSize: 13 }}>
      <i className="fa-solid fa-clock" style={{ marginRight: 4 }}></i>{remaining}
    </span>
  );
}

export default function DriverAuction() {
  const [tab, setTab] = useState('open');
  const [auctions, setAuctions] = useState([]);
  const [selections, setSelections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bidInputs, setBidInputs] = useState({});
  const [bidding, setBidding] = useState(null);
  const [bidMsg, setBidMsg] = useState({});
  const [decisions, setDecisions] = useState({});
  const [responding, setResponding] = useState(false);
  const [responseMsg, setResponseMsg] = useState('');
  const [locModal, setLocModal] = useState(null);
  const [locInput, setLocInput] = useState('');
  const [statusInput, setStatusInput] = useState('In Transit');
  const [updatingLoc, setUpdatingLoc] = useState(false);
  const [modalConfig, setModalConfig] = useState({ isOpen: false });
  const socketRef = useRef(null);

  // Real-time updates state
  const [liveBids, setLiveBids] = useState({});

  useEffect(() => {
    // Connect to Socket.io
    const url = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
      ? 'http://localhost:5000' 
      : '';
    socketRef.current = io(url);

    socketRef.current.on('bid_update', (data) => {
      setLiveBids(prev => ({
        ...prev,
        [data.auctionId]: {
          lowestBid: data.lowestBid,
          totalBids: data.totalBids
        }
      }));
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const fetchOpen = useCallback(() => {
    auctionAPI.openAuctions()
      .then(({ data }) => setAuctions(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fetchSelections = useCallback(() => {
    auctionAPI.mySelections()
      .then(({ data }) => setSelections(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchOpen();
    fetchSelections();
    const id = setInterval(() => { fetchOpen(); fetchSelections(); }, 15000);
    return () => clearInterval(id);
  }, [fetchOpen, fetchSelections]);

  // Join auction rooms for live updates
  useEffect(() => {
    if (socketRef.current && auctions.length > 0) {
      auctions.forEach(a => socketRef.current.emit('join_auction', a._id));
    }
  }, [auctions]);

  const handleBid = async (auctionId, weight) => {
    const price = Number(bidInputs[auctionId]);
    if (!price || price <= 0) return toast.error('Enter a valid price');
    setBidding(auctionId);
    try {
      await auctionAPI.placeBid({ auctionId, pricePerKg: price });
      toast.success(`Bid of ₹${price}/kg placed!`);
      fetchOpen();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bid failed');
    } finally { setBidding(null); }
  };

  const handleWithdrawBid = (auctionId) => {
    setModalConfig({
      isOpen: true,
      title: 'Withdraw Bid',
      message: 'Are you sure you want to withdraw your bid?',
      type: 'Warning',
      confirmText: 'Withdraw',
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, loading: true }));
        try {
          await auctionAPI.withdrawBid(auctionId);
          toast.success('Bid withdrawn successfully');
          setBidInputs(prev => {
            const newInputs = { ...prev };
            delete newInputs[auctionId];
            return newInputs;
          });
          fetchOpen();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to withdraw bid');
        } finally {
          setModalConfig({ isOpen: false });
        }
      },
      onCancel: () => setModalConfig({ isOpen: false })
    });
  };

  const pendingSelections = selections.filter(s => s.driverStatus === 'PENDING');
  const totalSelectedWeight = pendingSelections.filter(s => decisions[s._id] === 'ACCEPTED').reduce((sum, s) => sum + s.assignedWeight, 0);
  const totalSelectedEarnings = pendingSelections.filter(s => decisions[s._id] === 'ACCEPTED').reduce((sum, s) => sum + s.totalPrice, 0);

  const openLocModal = (s) => {
    setLocModal(s);
    setLocInput(s.currentLocation || '');
    setStatusInput(s.deliveryStatus || 'In Transit');
  };

  const handleUpdateLocation = async () => {
    setUpdatingLoc(true);
    try {
      await auctionAPI.updateLocation(locModal._id, { currentLocation: locInput, deliveryStatus: statusInput });
      setLocModal(null);
      toast.success('Location updated successfully');
      fetchSelections();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setUpdatingLoc(false); }
  };

  const handleRespond = async () => {
    const dec = Object.entries(decisions).map(([auctionId, decision]) => ({ auctionId, decision }));
    if (!dec.length) return toast.error('Make a decision for at least one shipment');
    setResponding(true);
    try {
      await auctionAPI.respond({ decisions: dec });
      toast.success('Response submitted successfully!');
      setDecisions({});
      fetchSelections();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setResponding(false); }
  };

  return (
    <div style={styles.layout}>
      <ConfirmationModal {...modalConfig} />
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              <i className="fa-solid fa-gavel" style={{ color: '#F97316', marginRight: 10 }}></i>
              Auction Bidding
            </h1>
            <p style={styles.sub}>Bid on open shipment requests and manage your selections</p>
          </div>
        </div>

        <LiveNotificationBanner categoryMatch="Auctions" />

        <div style={styles.tabs}>
          <button style={{ ...styles.tab, ...(tab === 'open' ? styles.tabActive : {}) }} onClick={() => setTab('open')}>
            <i className="fa-solid fa-door-open" style={{ marginRight: 6 }}></i>
            Open Auctions
            {auctions.length > 0 && <span style={styles.badge}>{auctions.length}</span>}
          </button>
          <button style={{ ...styles.tab, ...(tab === 'selections' ? styles.tabActive : {}) }} onClick={() => setTab('selections')}>
            <i className="fa-solid fa-list-check" style={{ marginRight: 6 }}></i>
            My Selections
            {pendingSelections.length > 0 && <span style={{ ...styles.badge, background: '#ef4444' }}>{pendingSelections.length}</span>}
          </button>
        </div>

        {/* Open Auctions Tab */}
        {tab === 'open' && (
          loading ? (
            <div style={styles.empty}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 28, color: '#cbd5e1' }}></i></div>
          ) : auctions.length === 0 ? (
            <div style={styles.empty}>
              <i className="fa-solid fa-inbox" style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 12 }}></i>
              <p>No open auctions right now. Check back soon.</p>
            </div>
          ) : (
            <div style={styles.auctionList}>
              {auctions.map(a => {
                const liveData = liveBids[a._id] || {};
                const currentLowest = liveData.lowestBid || a.lowestBid || null;
                const totalBidsCount = liveData.totalBids !== undefined ? liveData.totalBids : a.totalBids || 0;
                
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
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{a.shipper?.businessName || a.shipper?.name}</div>
                      </div>
                      <Countdown endTime={a.auctionEndTime} />
                    </div>
                    <div style={styles.metaRow}>
                      <span style={styles.chip}><i className="fa-solid fa-weight-hanging" style={{ marginRight: 4 }}></i>{a.weight} kg</span>
                      {a.goodsType && <span style={styles.chip}><i className="fa-solid fa-box" style={{ marginRight: 4 }}></i>{a.goodsType}</span>}
                      {a.description && <span style={styles.chip}><i className="fa-solid fa-note-sticky" style={{ marginRight: 4 }}></i>{a.description}</span>}
                    </div>
                    
                    {/* Live Bid Metrics */}
                    <div style={{ display: 'flex', gap: 16, marginTop: 12, marginBottom: 12, padding: '12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Current Lowest Bid</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#1E3A8A' }}>
                          {currentLowest ? `₹${currentLowest}/kg` : 'No Bids'}
                        </div>
                      </div>
                      {currentLowest && (
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: '#64748b' }}>Lowest Total</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#475569' }}>
                            ₹{(currentLowest * a.weight).toLocaleString()}
                          </div>
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Total Bids</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#475569' }}>
                          {totalBidsCount}
                        </div>
                      </div>
                    </div>
                    {a.myBid ? (
                      <div style={styles.myBidRow}>
                        <span style={{ fontSize: 13, color: '#065f46', fontWeight: 600 }}>
                          <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }}></i>
                          Your bid: ₹{a.myBid.pricePerKg}/kg · Total: ₹{a.myBid.totalPrice?.toLocaleString()}
                        </span>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                          <input type="number" min="1" placeholder="Update ₹/kg"
                            value={bidInputs[a._id] || ''}
                            onChange={e => setBidInputs(prev => ({ ...prev, [a._id]: e.target.value }))}
                            style={styles.bidInput} />
                          <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}
                            onClick={() => handleBid(a._id, a.weight)} disabled={bidding === a._id}>
                            {bidding === a._id ? 'Updating...' : 'Update Bid'}
                          </button>
                          <button style={{ padding: '8px 16px', fontSize: 13, background: 'white', border: '1.5px solid #fecaca', color: '#ef4444', borderRadius: 8, cursor: 'pointer' }}
                            onClick={() => handleWithdrawBid(a._id)}>
                            <i className="fa-solid fa-ban"></i> Withdraw
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={styles.bidForm}>
                        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Enter your price per kg to bid:</div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <input type="number" min="1" placeholder="₹ per kg"
                            value={bidInputs[a._id] || ''}
                            onChange={e => setBidInputs(prev => ({ ...prev, [a._id]: e.target.value }))}
                            style={styles.bidInput} />
                          {bidInputs[a._id] > 0 && (
                            <span style={{ fontSize: 13, color: '#1E3A8A', fontWeight: 600 }}>
                              = ₹{(Number(bidInputs[a._id]) * a.weight).toLocaleString()} total
                            </span>
                          )}
                          <button className="btn-primary" style={{ padding: '8px 20px', fontSize: 13, background: '#F97316' }}
                            onClick={() => handleBid(a._id, a.weight)} disabled={bidding === a._id}>
                            <i className="fa-solid fa-gavel"></i>
                            {bidding === a._id ? 'Placing...' : 'Place Bid'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Selections Tab */}
        {tab === 'selections' && (
          <div>
            {responseMsg && (
              <div style={responseMsg.startsWith('success') ? styles.success : styles.error}>
                <i className={`fa-solid ${responseMsg.startsWith('success') ? 'fa-circle-check' : 'fa-circle-xmark'}`} style={{ marginRight: 8 }}></i>
                {responseMsg.replace(/^(success|error):/, '')}
              </div>
            )}

            {selections.length === 0 ? (
              <div style={styles.empty}>
                <i className="fa-solid fa-inbox" style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 12 }}></i>
                <p>No selections yet. Win bids to see shipments here.</p>
              </div>
            ) : (
              <>
                {pendingSelections.length > 0 && (
                  <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                    <h3 style={styles.cardTitle}>
                      <i className="fa-solid fa-hourglass-half" style={{ color: '#F97316', marginRight: 8 }}></i>
                      Pending Decisions
                    </h3>
                    <div style={styles.selTable}>
                      <div style={styles.selHead}>
                        <span>Company</span><span>Route</span><span>Weight</span><span>₹/kg</span><span>Earnings</span><span>Decision</span>
                      </div>
                      {pendingSelections.map(s => (
                        <div key={s._id} style={styles.selRow}>
                          <span style={{ fontWeight: 600 }}>{s.shipper?.businessName || s.shipper?.name}</span>
                          <span style={{ fontSize: 13 }}>{s.fromLocation} → {s.toLocation}</span>
                          <span>{s.assignedWeight} kg</span>
                          <span>₹{s.pricePerKg}</span>
                          <span style={{ fontWeight: 700, color: '#22c55e' }}>₹{s.totalPrice?.toLocaleString()}</span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              style={{ ...styles.decBtn, background: decisions[s._id] === 'ACCEPTED' ? '#d1fae5' : 'white', border: `1.5px solid ${decisions[s._id] === 'ACCEPTED' ? '#22c55e' : '#e2e8f0'}`, color: decisions[s._id] === 'ACCEPTED' ? '#065f46' : '#475569' }}
                              onClick={() => setDecisions(prev => ({ ...prev, [s._id]: 'ACCEPTED' }))}
                            ><i className="fa-solid fa-check"></i> Accept</button>
                            <button
                              style={{ ...styles.decBtn, background: decisions[s._id] === 'REJECTED' ? '#fee2e2' : 'white', border: `1.5px solid ${decisions[s._id] === 'REJECTED' ? '#ef4444' : '#e2e8f0'}`, color: decisions[s._id] === 'REJECTED' ? '#991b1b' : '#475569' }}
                              onClick={() => setDecisions(prev => ({ ...prev, [s._id]: 'REJECTED' }))}
                            ><i className="fa-solid fa-xmark"></i> Reject</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={styles.summary}>
                      <div style={styles.summaryItem}>
                        <span style={styles.summaryLabel}>Total Weight Accepted</span>
                        <span style={{ ...styles.summaryValue, color: '#1E3A8A' }}>{totalSelectedWeight} kg</span>
                      </div>
                      <div style={styles.summaryItem}>
                        <span style={styles.summaryLabel}>Total Earnings</span>
                        <span style={{ ...styles.summaryValue, color: '#22c55e' }}>₹{totalSelectedEarnings.toLocaleString()}</span>
                      </div>
                    </div>
                    <button className="btn-primary" style={{ padding: '12px 28px' }}
                      onClick={handleRespond} disabled={responding || Object.keys(decisions).length === 0}>
                      <i className="fa-solid fa-paper-plane"></i>
                      {responding ? 'Submitting...' : 'Submit Decisions'}
                    </button>
                  </div>
                )}

                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>All Selections</h3>
                <div style={styles.auctionList}>
                  {selections.map(s => (
                    <div key={s._id} className="card" style={{ padding: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <div style={styles.routeRow}>
                            <span style={{ fontWeight: 700 }}>{s.fromLocation}</span>
                            <i className="fa-solid fa-arrow-right" style={{ color: '#F97316', fontSize: 12 }}></i>
                            <span style={{ fontWeight: 700 }}>{s.toLocation}</span>
                          </div>
                          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                            {s.shipper?.businessName || s.shipper?.name} · {s.assignedWeight} kg · ₹{s.pricePerKg}/kg
                          </div>
                          {s.currentLocation && (
                            <div style={{ fontSize: 12, color: '#1E3A8A', marginTop: 4, fontWeight: 600 }}>
                              <i className="fa-solid fa-location-dot" style={{ marginRight: 4 }}></i>{s.currentLocation}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                          <div style={{ fontWeight: 800, color: '#22c55e', fontSize: 18 }}>₹{s.totalPrice?.toLocaleString()}</div>
                          <span style={{
                            background: s.driverStatus === 'ACCEPTED' ? '#d1fae5' : s.driverStatus === 'REJECTED' ? '#fee2e2' : '#fef3c7',
                            color: s.driverStatus === 'ACCEPTED' ? '#065f46' : s.driverStatus === 'REJECTED' ? '#991b1b' : '#92400e',
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          }}>
                            {s.deliveryStatus || s.driverStatus}
                          </span>
                          {s.driverStatus === 'ACCEPTED' && s.deliveryStatus !== 'Delivered' && (
                            <button style={styles.updateLocBtn} onClick={() => openLocModal(s)}>
                              <i className="fa-solid fa-location-dot"></i> Update Location
                            </button>
                          )}
                          {s.deliveryStatus === 'Delivered' && (
                            <span style={{ fontSize: 12, color: '#065f46', fontWeight: 600 }}>
                              <i className="fa-solid fa-circle-check" style={{ marginRight: 4 }}></i>Delivered
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Location Update Modal */}
      {locModal && (
        <div style={styles.modalOverlay} onClick={() => setLocModal(null)}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-location-dot" style={{ color: '#F97316' }}></i>
              Update Location
            </h3>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
              {locModal.fromLocation} → {locModal.toLocation} · {locModal.assignedWeight} kg
            </p>
            <div className="form-group">
              <label>Current Location</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={locInput}
                  onChange={e => setLocInput(e.target.value)}
                  placeholder="e.g. Coimbatore, Tamil Nadu"
                  style={{ flex: 1 }}
                />
                <button type="button" style={styles.gpsBtn} onClick={() => {
                  if (!navigator.geolocation) return toast.error('GPS not supported');
                  navigator.geolocation.getCurrentPosition(
                    pos => setLocInput(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`),
                    () => toast.error('Allow location access to use GPS')
                  );
                }}>
                  <i className="fa-solid fa-satellite-dish"></i> GPS
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Delivery Status</label>
              <select value={statusInput} onChange={e => setStatusInput(e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
                onClick={handleUpdateLocation} disabled={updatingLoc}>
                <i className="fa-solid fa-floppy-disk"></i>
                {updatingLoc ? 'Updating...' : 'Update'}
              </button>
              <button style={styles.cancelBtn} onClick={() => setLocModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh' },
  main: { flex: 1, padding: '32px', background: '#f8fafc', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 16 },
  title: { fontSize: 26, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center' },
  sub: { color: '#64748b', marginTop: 4, fontSize: 14 },
  tabs: { display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' },
  tab: { padding: '9px 20px', border: 'none', background: 'transparent', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 },
  tabActive: { background: 'white', color: '#1E3A8A', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  badge: { background: '#F97316', color: 'white', borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '1px 7px', marginLeft: 4 },
  success: { background: '#d1fae5', color: '#065f46', padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14, display: 'flex', alignItems: 'center' },
  error: { background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14, display: 'flex', alignItems: 'center' },
  empty: { textAlign: 'center', padding: '48px 20px', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  auctionList: { display: 'flex', flexDirection: 'column', gap: 16 },
  auctionCard: { padding: 24 },
  auctionTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  auctionId: { fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4, letterSpacing: '0.5px' },
  routeRow: { display: 'flex', alignItems: 'center', gap: 10 },
  city: { fontSize: 18, fontWeight: 700, color: '#1e293b' },
  metaRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 },
  chip: { background: '#f1f5f9', color: '#475569', fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center' },
  myBidRow: { padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' },
  bidForm: { marginTop: 8 },
  bidInput: { padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', width: 120 },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16, display: 'flex', alignItems: 'center' },
  selTable: { border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 16 },
  selHead: { display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 1fr 1.5fr', gap: 8, padding: '10px 16px', background: '#f1f5f9', fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase' },
  selRow: { display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 1fr 1.5fr', gap: 8, padding: '12px 16px', alignItems: 'center', fontSize: 13, borderTop: '1px solid #f1f5f9' },
  decBtn: { padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 },
  summary: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '16px', background: '#f8fafc', borderRadius: 10, marginBottom: 16 },
  summaryItem: { display: 'flex', flexDirection: 'column', gap: 4 },
  summaryLabel: { fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' },
  summaryValue: { fontSize: 20, fontWeight: 800 },
  updateLocBtn: { padding: '7px 14px', border: 'none', borderRadius: 8, background: '#1E3A8A', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  gpsBtn: { padding: '8px 14px', border: '1.5px solid #1E3A8A', borderRadius: 8, background: '#eff6ff', color: '#1E3A8A', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' },
  cancelBtn: { flex: 1, padding: '12px', border: '1.5px solid #e2e8f0', borderRadius: 10, background: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#64748b' },
};
