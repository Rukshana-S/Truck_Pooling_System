"use client";
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import LiveNotificationBanner from '@/components/LiveNotificationBanner';
import { paymentAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';

export default function PaymentsDashboard() {
  const { user } = useAuth();
  const isDriver = user?.role === 'driver';

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await paymentAPI.getMyPayments();
      setPayments(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load payments.');
    } finally {
      setLoading(false);
    }
  };

  // Common Calculations
  const totalTransactions = payments.length;

  // Shipper Calculations
  const totalSpent = payments
    .filter(p => p.status === 'Advance Paid' || p.status === 'Fully Paid')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const pendingFinal = payments
    .filter(p => p.type === 'Final' && p.status === 'Pending Final Payment')
    .reduce((sum, p) => sum + p.amount, 0);

  // Driver Calculations
  const totalEarnings = payments
    .filter(p => p.status === 'Advance Paid' || p.status === 'Fully Paid')
    .reduce((sum, p) => sum + p.amount, 0);
    
  const advanceReceived = payments
    .filter(p => p.type === 'Advance' && (p.status === 'Advance Paid' || p.status === 'Fully Paid'))
    .reduce((sum, p) => sum + p.amount, 0);
    
  const finalReceived = payments
    .filter(p => p.type === 'Final' && p.status === 'Fully Paid')
    .reduce((sum, p) => sum + p.amount, 0);
    
  const totalPending = payments
    .filter(p => p.status === 'Pending Advance' || p.status === 'Pending Final Payment')
    .reduce((sum, p) => sum + p.amount, 0);

  // Filtering
  const filteredPayments = payments.filter(p => {
    const matchesSearch = 
      p.paymentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.shipmentId?.shipmentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.driverId?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Fully Paid': return 'badge-delivered'; // Green
      case 'Advance Paid': return 'badge-transit'; // Orange
      case 'Pending Final Payment': return 'badge-pending'; // Yellow/Orange
      default: return 'badge-pending';
    }
  };

  return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main}>
        <LiveNotificationBanner categoryMatch="Payment" />
        
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>{isDriver ? 'Driver Payments' : 'Payments & Invoices'}</h1>
            <p style={styles.sub}>{isDriver ? 'Track your earnings and pending payouts' : 'Track all your shipment transactions'}</p>
          </div>
        </div>

        {/* Summary Cards */}
        {isDriver ? (
          <div style={styles.summaryGrid}>
            <div style={{ ...styles.card, borderLeft: '4px solid #22c55e' }}>
              <div style={styles.cardIconWrap}><i className="fa-solid fa-wallet" style={styles.cardIcon}></i></div>
              <div style={styles.cardValue}>₹{totalEarnings.toLocaleString()}</div>
              <div style={styles.cardLabel}>Total Earnings (Received)</div>
            </div>
            <div style={{ ...styles.card, borderLeft: '4px solid #3b82f6' }}>
              <div style={{ ...styles.cardIconWrap, background: '#eff6ff', color: '#3b82f6' }}><i className="fa-solid fa-money-bill-wave" style={{ color: '#3b82f6', fontSize: 20 }}></i></div>
              <div style={styles.cardValue}>₹{advanceReceived.toLocaleString()}</div>
              <div style={styles.cardLabel}>Advance Received</div>
            </div>
            <div style={{ ...styles.card, borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ ...styles.cardIconWrap, background: '#f5f3ff', color: '#8b5cf6' }}><i className="fa-solid fa-flag-checkered" style={{ color: '#8b5cf6', fontSize: 20 }}></i></div>
              <div style={styles.cardValue}>₹{finalReceived.toLocaleString()}</div>
              <div style={styles.cardLabel}>Final Received</div>
            </div>
            <div style={{ ...styles.card, borderLeft: '4px solid #F97316' }}>
              <div style={{ ...styles.cardIconWrap, background: '#fff7ed', color: '#F97316' }}><i className="fa-solid fa-hourglass-half" style={{ color: '#F97316', fontSize: 20 }}></i></div>
              <div style={styles.cardValue}>₹{totalPending.toLocaleString()}</div>
              <div style={styles.cardLabel}>Pending Payments</div>
            </div>
          </div>
        ) : (
          <div style={styles.summaryGrid}>
            <div style={styles.card}>
              <div style={styles.cardIconWrap}><i className="fa-solid fa-wallet" style={styles.cardIcon}></i></div>
              <div style={styles.cardValue}>₹{totalSpent.toLocaleString()}</div>
              <div style={styles.cardLabel}>Total Paid</div>
            </div>
            <div style={{ ...styles.card, borderLeft: '4px solid #F97316' }}>
              <div style={{ ...styles.cardIconWrap, background: '#fff7ed', color: '#F97316' }}><i className="fa-solid fa-hourglass-half" style={{ color: '#F97316', fontSize: 20 }}></i></div>
              <div style={styles.cardValue}>₹{pendingFinal.toLocaleString()}</div>
              <div style={styles.cardLabel}>Pending Final Payments</div>
            </div>
            <div style={{ ...styles.card, borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ ...styles.cardIconWrap, background: '#f5f3ff', color: '#8b5cf6' }}><i className="fa-solid fa-receipt" style={{ color: '#8b5cf6', fontSize: 20 }}></i></div>
              <div style={styles.cardValue}>{totalTransactions}</div>
              <div style={styles.cardLabel}>Total Transactions</div>
            </div>
          </div>
        )}

        {/* Filters & Search */}
        <div style={styles.controls}>
          <div style={styles.searchBox}>
            <i className="fa-solid fa-search" style={{ color: '#94a3b8' }}></i>
            <input 
              type="text" 
              placeholder="Search by ID or Driver..." 
              style={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select style={styles.selectBox} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Advance Paid">Advance Paid</option>
            <option value="Pending Final Payment">Pending Final Payment</option>
            <option value="Fully Paid">Fully Paid</option>
          </select>
        </div>

        {/* Payment History */}
        <div style={styles.tableCard}>
          <h2 style={styles.tableTitle}>Payment History</h2>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading payments...</div>
          ) : filteredPayments.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No payments found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Payment ID</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Shipment</th>
                    <th style={styles.th}>{isDriver ? 'Shipper' : 'Driver'}</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map(p => (
                    <tr key={p._id} style={styles.tr} onClick={() => setSelectedPayment(p)}>
                      <td style={styles.td}><span style={styles.payId}>{p.paymentId}</span></td>
                      <td style={styles.td}>{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td style={styles.td}>{p.shipmentId?.shipmentId || 'N/A'}</td>
                      <td style={styles.td}>{isDriver ? (p.shipperId?.businessName || p.shipperId?.name || 'N/A') : (p.driverId?.name || 'N/A')}</td>
                      <td style={{ ...styles.td, fontWeight: 700, color: '#1e293b' }}>₹{p.amount.toLocaleString()}</td>
                      <td style={styles.td}>{p.type}</td>
                      <td style={styles.td}>
                        <span className={`badge ${getStatusBadge(p.status)}`}>{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Details Modal */}
      {selectedPayment && (
        <div style={styles.modalOverlay} onClick={() => setSelectedPayment(null)}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Payment Details</h3>
              <button style={styles.closeBtn} onClick={() => setSelectedPayment(null)}>
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Payment ID</span>
                <span style={styles.detailValue}>{selectedPayment.paymentId}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Date</span>
                <span style={styles.detailValue}>{new Date(selectedPayment.createdAt).toLocaleString()}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Amount</span>
                <span style={{ ...styles.detailValue, fontSize: 18, fontWeight: 700, color: '#1E3A8A' }}>
                  ₹{selectedPayment.amount.toLocaleString()}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Status</span>
                <span className={`badge ${getStatusBadge(selectedPayment.status)}`}>
                  {selectedPayment.status}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Type</span>
                <span style={styles.detailValue}>{selectedPayment.type}</span>
              </div>
              {selectedPayment.razorpayOrderId && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Razorpay Order ID</span>
                  <span style={{ ...styles.detailValue, fontFamily: 'monospace', fontSize: 12 }}>{selectedPayment.razorpayOrderId}</span>
                </div>
              )}
              {selectedPayment.razorpayPaymentId && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Transaction ID</span>
                  <span style={{ ...styles.detailValue, fontFamily: 'monospace', fontSize: 12 }}>{selectedPayment.razorpayPaymentId}</span>
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button 
                className="btn-secondary" 
                style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#64748b' }}
                onClick={() => toast('No receipt yet.', { icon: '📄' })}
              >
                <i className="fa-solid fa-download"></i> Download Receipt
              </button>
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
  header: { marginBottom: 28 },
  title: { fontSize: 28, fontWeight: 800, color: '#1e293b' },
  sub: { color: '#64748b', marginTop: 4 },
  
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 32 },
  card: { background: 'white', padding: 24, borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '4px solid #22c55e' },
  cardIconWrap: { width: 48, height: 48, borderRadius: 12, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  cardIcon: { fontSize: 20, color: '#22c55e' },
  cardValue: { fontSize: 28, fontWeight: 800, color: '#1e293b', marginBottom: 4 },
  cardLabel: { fontSize: 14, color: '#64748b', fontWeight: 500 },

  controls: { display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' },
  searchBox: { display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0 16px', flex: 1, minWidth: 250 },
  searchInput: { border: 'none', outline: 'none', padding: '12px 10px', width: '100%', fontSize: 14 },
  selectBox: { padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 10, background: 'white', fontSize: 14, color: '#1e293b', outline: 'none' },

  tableCard: { background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' },
  tableTitle: { padding: '20px 24px', fontSize: 18, fontWeight: 700, color: '#1e293b', borderBottom: '1px solid #e2e8f0', margin: 0 },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '16px 24px', fontSize: 13, fontWeight: 600, color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  tr: { borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'background 0.2s' },
  td: { padding: '16px 24px', fontSize: 14, color: '#334155', verticalAlign: 'middle' },
  payId: { fontFamily: 'monospace', background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, fontSize: 13, color: '#475569' },

  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { background: 'white', borderRadius: 16, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' },
  modalHeader: { padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 },
  closeBtn: { background: 'transparent', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer' },
  modalBody: { padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 },
  detailRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { color: '#64748b', fontSize: 14, fontWeight: 500 },
  detailValue: { color: '#1e293b', fontSize: 14, fontWeight: 600 },
  modalFooter: { padding: '20px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' },
};
