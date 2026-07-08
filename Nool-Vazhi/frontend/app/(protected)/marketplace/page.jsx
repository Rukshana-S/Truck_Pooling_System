"use client";
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { tripAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import LocationInput from '@/components/LocationInput';
import ConfirmationModal from '@/components/ConfirmationModal';
import { toast } from 'react-hot-toast';

const GOODS = ['Electronics', 'Textiles', 'FMCG', 'Machinery', 'Furniture', 'Perishables', 'Chemicals', 'Other'];

function CapacityBar({ total, available }) {
  const used = total - available;
  const pct = Math.round((used / total) * 100);
  const color = pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#22c55e';
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
        <span>{available} kg available</span>
        <span>{pct}% filled</span>
      </div>
      <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

export default function Marketplace() {
  const { user } = useAuth();
  const [search, setSearch] = useState({ from: '', to: '' });
  const [trips, setTrips] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [bookForm, setBookForm] = useState({ bookedWeight: '', goodsType: '', goodsDescription: '' });
  const [booking, setBooking] = useState(false);
  const [bookMsg, setBookMsg] = useState('');
  const [myBookings, setMyBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  
  const [deleteModal, setDeleteModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ goodsType: '', goodsDescription: '' });

  const fetchMyBookings = () => {
    tripAPI.myBookings()
      .then(({ data }) => setMyBookings(data))
      .catch(() => {})
      .finally(() => setBookingsLoading(false));
  };

  useEffect(() => {
    tripAPI.locations().then(({ data }) => setLocations(data)).catch(() => {});
    if (user?.role === 'organization') {
      fetchMyBookings();
    }
  }, [user]);

  const handleEditBooking = async () => {
    if (!editModal) return;
    try {
      await tripAPI.updateBooking(editModal._id, editForm);
      toast.success('Booking updated');
      setEditModal(null);
      fetchMyBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelModal) return;
    try {
      await tripAPI.cancelBooking(cancelModal._id);
      toast.success('Booking cancelled');
      fetchMyBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation failed');
    } finally {
      setCancelModal(null);
    }
  };

  const handleDeleteBooking = async () => {
    if (!deleteModal) return;
    try {
      await tripAPI.deleteBooking(deleteModal._id);
      toast.success('Booking deleted');
      fetchMyBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleteModal(null);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!locations.includes(search.from) || !locations.includes(search.to)) {
      toast.error("Please select a valid location from the suggestions.");
      return;
    }
    setLoading(true); setTrips([]); setSearched(true); setSelected(null);
    try {
      const { data } = await tripAPI.search(search.from, search.to);
      setTrips(data);
    } catch { setTrips([]); }
    finally { setLoading(false); }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    setBooking(true); setBookMsg('');
    try {
      await tripAPI.book({ tripId: selected._id, ...bookForm, bookedWeight: Number(bookForm.bookedWeight) });
      setBookMsg('success:Booking confirmed! Capacity reserved.');
      // Refresh trips
      const { data } = await tripAPI.search(search.from, search.to);
      setTrips(data);
      const { data: bk } = await tripAPI.myBookings();
      setMyBookings(bk);
      setSelected(null);
      setBookForm({ bookedWeight: '', goodsType: '', goodsDescription: '' });
    } catch (err) {
      setBookMsg('error:' + (err.response?.data?.message || 'Booking failed'));
    } finally { setBooking(false); }
  };

  const estPrice = selected && bookForm.bookedWeight
    ? selected.effectivePricePerKg * Number(bookForm.bookedWeight)
    : null;

  const content = (
    <main className="p-mobile-16" style={styles.main}>
      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <div>
            <h1 style={styles.title}>
              <i className="fa-solid fa-store" style={{ color: '#F97316', marginRight: 10 }}></i>
              Capacity Marketplace
            </h1>
            <p style={styles.sub}>Find available trucks and book only the capacity you need</p>
          </div>
        </div>

        {/* Search */}
        <div className="card" style={{ padding: 28, marginBottom: 28 }}>
          <form onSubmit={handleSearch} style={styles.searchRow}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>From</label>
              <LocationInput
                id="search-from"
                value={search.from}
                onChange={e => setSearch({ ...search, from: e.target.value })}
                placeholder="Type or select from location"
                locations={locations}
              />
            </div>
            <div style={styles.arrowDiv}>
              <i className="fa-solid fa-arrow-right" style={{ color: '#F97316', fontSize: 20 }}></i>
            </div>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>To</label>
              <LocationInput
                id="search-to"
                value={search.to}
                onChange={e => setSearch({ ...search, to: e.target.value })}
                placeholder="Type or select to location"
                locations={locations}
              />
            </div>
            <button type="submit" className="btn-primary" style={{ padding: '12px 28px', alignSelf: 'flex-end' }} disabled={loading}>
              <i className="fa-solid fa-magnifying-glass"></i> {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {/* Results */}
        {searched && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={styles.sectionTitle}>
              {loading ? 'Searching...' : `${trips.length} trip${trips.length !== 1 ? 's' : ''} found`}
              {trips.length > 0 && <span style={styles.sortNote}> · sorted by lowest price</span>}
            </h2>

            {!loading && trips.length === 0 && (
              <div style={styles.empty}>
                <i className="fa-solid fa-truck-fast" style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 12 }}></i>
                <p>No trips found for this route. Try different locations.</p>
              </div>
            )}

            <div style={styles.tripGrid}>
              {trips.map(trip => (
                <div key={trip._id} className="card" style={{ ...styles.tripCard, ...(selected?._id === trip._id ? styles.tripCardSelected : {}) }}>
                  <div style={styles.tripHeader}>
                    <div style={styles.routeRow}>
                      <span style={styles.city}>{trip.fromLocation}</span>
                      <i className="fa-solid fa-arrow-right" style={{ color: '#F97316' }}></i>
                      <span style={styles.city}>{trip.toLocation}</span>
                    </div>
                    <span style={{ ...styles.statusBadge, background: trip.status === 'FULL' ? '#fee2e2' : '#d1fae5', color: trip.status === 'FULL' ? '#991b1b' : '#065f46' }}>
                      {trip.status}
                    </span>
                  </div>

                  <div style={styles.tripMeta}>
                    <div style={styles.metaItem}>
                      <i className="fa-solid fa-indian-rupee-sign" style={{ color: '#1E3A8A' }}></i>
                      <div>
                        <div style={styles.metaValue}>₹{trip.effectivePricePerKg}/kg</div>
                        {trip.effectivePricePerKg < trip.pricePerKg && (
                          <div style={styles.discountTag}>
                            <i className="fa-solid fa-tag" style={{ marginRight: 3 }}></i>
                            Was ₹{trip.pricePerKg}/kg
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={styles.metaItem}>
                      <i className="fa-solid fa-weight-hanging" style={{ color: '#8b5cf6' }}></i>
                      <div>
                        <div style={styles.metaValue}>{trip.driver?.capacityUnit === 'tons' ? (trip.totalCapacity / 1000) + ' tons' : trip.totalCapacity + ' kg'} total</div>
                        <div style={styles.metaLabel}>capacity</div>
                      </div>
                    </div>
                    <div style={styles.metaItem}>
                      <i className="fa-solid fa-user" style={{ color: '#F97316' }}></i>
                      <div>
                        <div style={styles.metaValue}>{trip.driver?.name}</div>
                        <div style={styles.metaLabel}>
                          {trip.driver?.rating > 0 ? `⭐ ${trip.driver.rating}` : 'New driver'}
                        </div>
                      </div>
                    </div>
                    {trip.departureTime && (
                      <div style={styles.metaItem}>
                        <i className="fa-solid fa-clock" style={{ color: '#64748b' }}></i>
                        <div>
                          <div style={styles.metaValue}>{new Date(trip.departureTime).toLocaleDateString('en-IN')}</div>
                          <div style={styles.metaLabel}>{new Date(trip.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <CapacityBar total={trip.totalCapacity} available={trip.availableCapacity} />

                  {trip.minimumBookingKg > 1 && (
                    <div style={styles.minNote}>
                      <i className="fa-solid fa-circle-info" style={{ marginRight: 4 }}></i>
                      Min booking: {trip.minimumBookingKg} kg
                    </div>
                  )}

                  {trip.status === 'ACTIVE' && (
                    <button
                      className="btn-primary"
                      style={{ width: '100%', justifyContent: 'center', marginTop: 16, padding: '10px' }}
                      onClick={() => { setSelected(trip); setBookMsg(''); setBookForm({ bookedWeight: '', goodsType: '', goodsDescription: '' }); }}
                    >
                      <i className="fa-solid fa-cart-plus"></i> Book Capacity
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Booking Modal */}
        {selected && (
          <div style={styles.modalOverlay} onClick={() => setSelected(null)}>
            <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
              <h3 style={styles.modalTitle}>
                <i className="fa-solid fa-cart-plus" style={{ color: '#F97316', marginRight: 8 }}></i>
                Book Capacity
              </h3>
              <p style={styles.modalRoute}>
                {selected.fromLocation} → {selected.toLocation} &nbsp;·&nbsp;
                <strong>₹{selected.effectivePricePerKg}/kg</strong> &nbsp;·&nbsp;
                {selected.availableCapacity} kg available
              </p>

              {bookMsg && (
                <div style={bookMsg.startsWith('success') ? styles.success : styles.error}>
                  <i className={`fa-solid ${bookMsg.startsWith('success') ? 'fa-circle-check' : 'fa-circle-xmark'}`} style={{ marginRight: 8 }}></i>
                  {bookMsg.replace(/^(success|error):/, '')}
                </div>
              )}

              <form onSubmit={handleBook}>
                <div className="form-group">
                  <label>Weight Required (kg) *</label>
                  <input type="number" min={selected.minimumBookingKg} max={selected.availableCapacity}
                    value={bookForm.bookedWeight}
                    onChange={e => setBookForm({ ...bookForm, bookedWeight: e.target.value })}
                    placeholder={`Min ${selected.minimumBookingKg} kg, Max ${selected.availableCapacity} kg`}
                    required />
                </div>
                <div className="form-group">
                  <label>Goods Type *</label>
                  <select value={bookForm.goodsType} onChange={e => setBookForm({ ...bookForm, goodsType: e.target.value })} required>
                    <option value="">Select type</option>
                    {GOODS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Description (optional)</label>
                  <input value={bookForm.goodsDescription}
                    onChange={e => setBookForm({ ...bookForm, goodsDescription: e.target.value })}
                    placeholder="e.g. 50 cartons of mobile phones" />
                </div>

                {bookForm.bookedWeight > 0 && (
                  <div style={styles.pricePreview}>
                    <div style={styles.priceRow}><span>Weight</span><span>{bookForm.bookedWeight} kg</span></div>
                    <div style={styles.priceRow}><span>Rate</span><span>₹{selected.effectivePricePerKg}/kg</span></div>
                    {selected.effectivePricePerKg < selected.pricePerKg && (
                      <div style={{ ...styles.priceRow, color: '#22c55e' }}>
                        <span>Discount</span><span>Applied ✓</span>
                      </div>
                    )}
                    <div style={styles.priceDivider} />
                    <div style={{ ...styles.priceRow, fontWeight: 800, fontSize: 18, color: '#1E3A8A' }}>
                      <span>Total</span><span>₹{(selected.effectivePricePerKg * Number(bookForm.bookedWeight)).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '12px' }} disabled={booking}>
                    {booking ? 'Confirming...' : 'Confirm Booking'}
                  </button>
                  <button type="button" style={styles.cancelBtn} onClick={() => setSelected(null)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* My Bookings */}
        {user?.role === 'organization' && (
          <div>
            <h2 style={styles.sectionTitle}>My Capacity Bookings</h2>
            {bookingsLoading ? (
              <div style={styles.empty}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24 }}></i></div>
            ) : myBookings.length === 0 ? (
              <div style={styles.empty}>
                <i className="fa-solid fa-inbox" style={{ fontSize: 40, color: '#cbd5e1', marginBottom: 8 }}></i>
                <p>No bookings yet. Search for a trip above.</p>
              </div>
            ) : (
              <div style={styles.bookingList}>
                {myBookings.map(b => (
                  <div key={b._id} className="card" style={styles.bookingCard}>
                    <div style={styles.bookingLeft}>
                      <div style={styles.bookingId}>{b.bookingId}</div>
                      <div style={styles.routeRow}>
                        <span style={{ fontWeight: 700 }}>{b.trip?.fromLocation}</span>
                        <i className="fa-solid fa-arrow-right" style={{ color: '#F97316', fontSize: 12 }}></i>
                        <span style={{ fontWeight: 700 }}>{b.trip?.toLocation}</span>
                      </div>
                      <div style={styles.bookingMeta}>
                        <span style={styles.chip}><i className="fa-solid fa-weight-hanging" style={{ marginRight: 4 }}></i>{b.bookedWeight} kg</span>
                        <span style={styles.chip}><i className="fa-solid fa-box" style={{ marginRight: 4 }}></i>{b.goodsType}</span>
                        <span style={styles.chip}><i className="fa-solid fa-user" style={{ marginRight: 4 }}></i>{b.trip?.driver?.name}</span>
                      </div>
                    </div>
                    <div className="align-start-mobile" style={styles.bookingRight}>
                      <div style={styles.bookingPrice}>₹{b.totalPrice?.toLocaleString()}</div>
                      <div style={styles.bookingPriceLabel}>₹{b.pricePerKg}/kg</div>
                      <span style={{ ...styles.statusBadge, background: b.status === 'DELIVERED' ? '#d1fae5' : '#dbeafe', color: b.status === 'DELIVERED' ? '#065f46' : '#1e40af', marginTop: 8, marginBottom: 8 }}>
                        {b.status}
                      </span>
                      <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                        {b.status !== 'CANCELLED' && b.status !== 'DELIVERED' && (
                          <>
                            <button style={{ ...styles.cancelBtn, padding: '6px 12px', fontSize: 12 }} onClick={() => { setEditModal(b); setEditForm({ goodsType: b.goodsType || '', goodsDescription: b.goodsDescription || '' }); }}>
                              <i className="fa-solid fa-pen"></i> Edit
                            </button>
                            <button style={{ ...styles.cancelBtn, padding: '6px 12px', fontSize: 12, color: '#ef4444', borderColor: '#fecaca', background: '#fee2e2' }} onClick={() => setCancelModal(b)}>
                              <i className="fa-solid fa-ban"></i> Cancel
                            </button>
                          </>
                        )}
                        {(b.status === 'CANCELLED' || b.status === 'DELIVERED') && (
                          <button style={{ ...styles.cancelBtn, padding: '6px 12px', fontSize: 12, color: '#ef4444', borderColor: '#fecaca', background: '#fee2e2' }} onClick={() => setDeleteModal(b)}>
                            <i className="fa-solid fa-trash"></i> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Booking Modal */}
      {editModal && (
        <div style={styles.modalOverlay} onClick={() => setEditModal(null)}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              <i className="fa-solid fa-pen" style={{ color: '#F97316', marginRight: 8 }}></i>
              Edit Booking
            </h3>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label>Goods Type *</label>
              <select value={editForm.goodsType} onChange={e => setEditForm({ ...editForm, goodsType: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <option value="">Select type</option>
                {GOODS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Description</label>
              <input value={editForm.goodsDescription} onChange={e => setEditForm({ ...editForm, goodsDescription: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn-primary" style={{ flex: 1, padding: '12px', justifyContent: 'center' }} onClick={handleEditBooking}>
                Save Changes
              </button>
              <button style={styles.cancelBtn} onClick={() => setEditModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!cancelModal}
        title="Cancel Booking"
        message={`Are you sure you want to cancel booking ${cancelModal?.bookingId}? This will free up the capacity for other users.`}
        confirmText="Cancel Booking"
        type="Danger"
        onConfirm={handleCancelBooking}
        onCancel={() => setCancelModal(null)}
      />

      <ConfirmationModal
        isOpen={!!deleteModal}
        title="Delete Booking"
        message={`Are you sure you want to permanently delete booking ${deleteModal?.bookingId}?`}
        confirmText="Delete"
        type="Danger"
        onConfirm={handleDeleteBooking}
        onCancel={() => setDeleteModal(null)}
      />

    </main>
  );

  if (user) return <div style={styles.layout}><Sidebar />{content}</div>;
  return <div><Navbar />{content}<Footer /></div>;
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh', width: '100vw', overflowX: 'hidden' },
  main: { flex: 1, padding: '32px 0', background: '#f8fafc', overflowY: 'auto' },
  container: { maxWidth: 1100, margin: '0 auto', padding: '0 24px' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 },
  title: { fontSize: 26, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center' },
  sub: { color: '#64748b', marginTop: 4, fontSize: 15 },
  searchRow: { display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' },
  arrowDiv: { display: 'flex', alignItems: 'flex-end', paddingBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 16 },
  sortNote: { fontSize: 13, color: '#94a3b8', fontWeight: 400 },
  empty: { textAlign: 'center', padding: '40px 20px', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  tripGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 },
  tripCard: { padding: 24, transition: 'all 0.2s' },
  tripCardSelected: { border: '2px solid #F97316', boxShadow: '0 0 0 3px rgba(249,115,22,0.15)' },
  tripHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  routeRow: { display: 'flex', alignItems: 'center', gap: 8 },
  city: { fontSize: 16, fontWeight: 700, color: '#1e293b' },
  statusBadge: { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-block' },
  tripMeta: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 },
  metaItem: { display: 'flex', alignItems: 'flex-start', gap: 8 },
  metaValue: { fontSize: 14, fontWeight: 700, color: '#1e293b' },
  metaLabel: { fontSize: 11, color: '#94a3b8' },
  discountTag: { fontSize: 11, color: '#22c55e', fontWeight: 600 },
  minNote: { fontSize: 12, color: '#94a3b8', marginTop: 8 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 6, display: 'flex', alignItems: 'center' },
  modalRoute: { color: '#64748b', fontSize: 14, marginBottom: 20 },
  success: { background: '#d1fae5', color: '#065f46', padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14, display: 'flex', alignItems: 'center' },
  error: { background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14, display: 'flex', alignItems: 'center' },
  pricePreview: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginTop: 8 },
  priceRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14, color: '#475569', borderBottom: '1px solid #f1f5f9' },
  priceDivider: { height: 2, background: '#e2e8f0', margin: '4px 0' },
  cancelBtn: { flex: 1, padding: '12px', border: '1.5px solid #e2e8f0', borderRadius: 10, background: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#64748b' },
  bookingList: { display: 'flex', flexDirection: 'column', gap: 12 },
  bookingCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', flexWrap: 'wrap', gap: 12 },
  bookingLeft: { flex: 1 },
  bookingId: { fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4, letterSpacing: '0.5px' },
  bookingMeta: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  chip: { background: '#f1f5f9', color: '#475569', fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20, display: 'flex', alignItems: 'center' },
  bookingRight: { textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
  bookingPrice: { fontSize: 20, fontWeight: 800, color: '#1E3A8A' },
  bookingPriceLabel: { fontSize: 12, color: '#94a3b8' },
};
