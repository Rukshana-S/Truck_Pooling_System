"use client";
import { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import LiveNotificationBanner from '@/components/LiveNotificationBanner';
import { paymentAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import ReceiptPDF from '@/components/ReceiptPDF';
import ReportTemplate from '@/components/ReportTemplate';

// Helper for the visual Payment Timeline
const getPaymentStages = (payment) => {
  const s = payment.shipmentId || {};
  
  const isFullyPaid = s.paymentStatus === 'Fully Paid' || 
                      (payment.type === 'Final' && payment.status === 'Fully Paid') || 
                      s.currentStatus === 'Shipment Completed' || 
                      s.currentStatus === 'Final Payment Completed';
                      
  const isDelivered = isFullyPaid || 
                      s.status === 'Delivered' || 
                      s.currentStatus === 'Delivered';
                      
  const isAdvancePaid = isDelivered || 
                        s.paymentStatus !== 'Pending Advance' || 
                        (payment.type === 'Advance' && payment.status !== 'Pending Advance');

  return [
    { label: 'Shipment Created', icon: 'fa-box', state: 'completed' },
    { label: 'Advance Paid', icon: 'fa-money-bill-wave', state: isAdvancePaid ? 'completed' : 'active' },
    { label: 'In Transit', icon: 'fa-truck-fast', state: isDelivered ? 'completed' : (isAdvancePaid ? 'active' : 'pending') },
    { label: 'Delivered', icon: 'fa-house-circle-check', state: isDelivered ? 'completed' : 'pending' },
    { label: 'Final Payment & Receipt', icon: 'fa-check-double', state: isFullyPaid ? 'completed' : (isDelivered ? 'active' : 'pending') }
  ];
};

export default function PaymentsDashboard() {
  const { user } = useAuth();
  const isDriver = user?.role === 'driver';

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedPayment, setSelectedPayment] = useState(null);
  
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Refs for visible previews (scaled)
  const previewReceiptRef = useRef();
  const previewReportRef = useRef();

  // Refs for hidden print versions (unscaled, unconstrained)
  const printReceiptRef = useRef();
  const printReportRef = useRef();

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

  const generatePDF = async (elementRef, filename, print = false) => {
    if (!elementRef.current) return;
    try {
      setGenerating(true);
      toast.loading(print ? 'Preparing Print...' : 'Generating High-Quality PDF...', { id: 'pdf-toast' });
      
      // Wait briefly for React to render the hidden elements
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(elementRef.current, { 
        scale: 3, 
        useCORS: true,
        logging: false,
        windowWidth: 1123,
        onclone: (document) => {
          // Ensure cloned hidden element is visible for capture
          const el = document.getElementById(elementRef.current.id);
          if (el) {
            el.style.position = 'static';
            el.style.display = 'block';
            el.style.left = 'auto';
            el.style.top = 'auto';
          }
        }
      });
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, '', 'FAST');
      
      if (print) {
        pdf.autoPrint();
        window.open(pdf.output('bloburl'), '_blank');
        toast.success('Ready to print!', { id: 'pdf-toast' });
      } else {
        pdf.save(filename);
        toast.success('Downloaded Successfully!', { id: 'pdf-toast' });
      }
    } catch (err) {
      toast.error('Failed to generate PDF', { id: 'pdf-toast' });
      console.error(err);
    } finally {
      setGenerating(false);
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
          <button 
            className="btn-primary" 
            style={{ padding: '0 24px', background: '#1E3A8A', border: 'none', borderRadius: 10 }}
            onClick={() => setShowReportPreview(true)}
            disabled={filteredPayments.length === 0}
          >
            <i className="fa-solid fa-file-pdf" style={{ marginRight: 8 }}></i> Generate Report
          </button>
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

              {/* Visual Payment Timeline */}
              <div style={{ marginTop: 24 }}>
                <h4 style={{ fontSize: 13, color: '#64748b', textTransform: 'uppercase', marginBottom: 16 }}>Payment Lifecycle</h4>
                <div style={styles.timelineContainer}>
                  {getPaymentStages(selectedPayment).map((stage, index, arr) => (
                    <div key={stage.label} style={styles.timelineStep}>
                      <div style={{
                        ...styles.timelineIcon,
                        ...(stage.state === 'completed' ? styles.timelineIconCompleted : {}),
                        ...(stage.state === 'active' ? styles.timelineIconActive : {})
                      }}>
                        <i className={`fa-solid ${stage.icon}`}></i>
                      </div>
                      <div style={{
                        ...styles.timelineLabel,
                        ...(stage.state === 'completed' ? styles.timelineLabelCompleted : {}),
                        ...(stage.state === 'active' ? styles.timelineLabelActive : {})
                      }}>
                        {stage.label}
                      </div>
                      {index < arr.length - 1 && (
                        <div style={{
                          ...styles.timelineLine,
                          ...(stage.state === 'completed' ? styles.timelineLineCompleted : {})
                        }}></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button 
                className="btn-secondary" 
                style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, background: '#1E3A8A', border: '1px solid #1E3A8A', color: 'white' }}
                onClick={() => setShowReceiptPreview(true)}
              >
                <i className="fa-solid fa-file-invoice"></i> View Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Render Targets for Flawless PDF Capture (No Scaling/Modal Constraints) */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '1123px', zIndex: -100 }}>
        {selectedPayment && (
          <div id="print-receipt-wrapper" ref={printReceiptRef}>
            <ReceiptPDF payment={selectedPayment} />
          </div>
        )}
        <div id="print-report-wrapper" ref={printReportRef}>
          <ReportTemplate payments={filteredPayments} isDriver={isDriver} user={user} />
        </div>
      </div>

      {/* Receipt Preview Modal */}
      {showReceiptPreview && selectedPayment && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: 880, background: '#f1f5f9' }}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Receipt Preview</h3>
              <button style={styles.closeBtn} onClick={() => setShowReceiptPreview(false)} disabled={generating}>
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            
            <div style={{ padding: 20, maxHeight: '65vh', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
              {/* Scale down the 1123px component for preview without shrinking the actual generated component */}
              <div style={{ transform: 'scale(0.7)', transformOrigin: 'top center' }}>
                <ReceiptPDF payment={selectedPayment} />
              </div>
            </div>

            <div style={{ ...styles.modalFooter, display: 'flex', gap: 12 }}>
              <button 
                className="btn-secondary" 
                style={{ flex: 1, padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                onClick={() => generatePDF(printReceiptRef, `Receipt_${selectedPayment.paymentId}.pdf`, true)}
                disabled={generating}
              >
                <i className="fa-solid fa-print"></i> Print
              </button>
              <button 
                className="btn-primary" 
                style={{ flex: 1, padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, background: '#F97316', border: 'none' }}
                onClick={() => generatePDF(printReceiptRef, `Receipt_${selectedPayment.paymentId}.pdf`, false)}
                disabled={generating}
              >
                <i className="fa-solid fa-download"></i> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Preview Modal */}
      {showReportPreview && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: 880, background: '#f1f5f9' }}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Consolidated Report Preview</h3>
              <button style={styles.closeBtn} onClick={() => setShowReportPreview(false)} disabled={generating}>
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            
            <div style={{ padding: 20, maxHeight: '65vh', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
              <div style={{ transform: 'scale(0.7)', transformOrigin: 'top center' }}>
                <ReportTemplate payments={filteredPayments} isDriver={isDriver} user={user} />
              </div>
            </div>

            <div style={{ ...styles.modalFooter, display: 'flex', gap: 12 }}>
              <button 
                className="btn-secondary" 
                style={{ flex: 1, padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                onClick={() => generatePDF(printReportRef, `Report_${new Date().getTime()}.pdf`, true)}
                disabled={generating}
              >
                <i className="fa-solid fa-print"></i> Print Report
              </button>
              <button 
                className="btn-primary" 
                style={{ flex: 1, padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, background: '#1E3A8A', border: 'none' }}
                onClick={() => generatePDF(printReportRef, `Report_${new Date().getTime()}.pdf`, false)}
                disabled={generating}
              >
                <i className="fa-solid fa-download"></i> Download PDF Report
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
  
  timelineContainer: { display: 'flex', alignItems: 'center', gap: 4, width: '100%' },
  timelineStep: { display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', flex: 1 },
  timelineIcon: { width: 32, height: 32, borderRadius: 16, background: '#f1f5f9', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, zIndex: 2, border: '2px solid white' },
  timelineIconActive: { background: '#1E3A8A', color: 'white', boxShadow: '0 0 0 3px #bfdbfe' },
  timelineIconCompleted: { background: '#22c55e', color: 'white' },
  timelineLabel: { fontSize: 9, fontWeight: 600, color: '#94a3b8', marginTop: 6, textAlign: 'center', whiteSpace: 'nowrap' },
  timelineLabelActive: { color: '#1E3A8A', fontWeight: 700 },
  timelineLabelCompleted: { color: '#22c55e' },
  timelineLine: { position: 'absolute', top: 16, left: '50%', width: '100%', height: 3, background: '#f1f5f9', zIndex: 1 },
  timelineLineCompleted: { background: '#22c55e' },
};
