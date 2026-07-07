import React from 'react';

const ReceiptTemplate = React.forwardRef(({ payment }, ref) => {
  if (!payment) return null;

  const dateStr = new Date(payment.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
  const updateDateStr = new Date(payment.updatedAt).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const isAdvance = payment.type === 'Advance';
  const title = isAdvance ? 'ADVANCE PAYMENT RECEIPT' : 'FINAL PAYMENT RECEIPT';
  
  return (
    <div ref={ref} style={styles.container}>
      {/* HEADER: LOGO AND TAGLINE */}
      <div style={styles.header}>
        <div style={styles.logoBox}>
          <i className="fa-solid fa-truck" style={styles.logoIcon}></i>
          <span style={styles.logoText}>Nool<span style={{ color: '#F97316' }}>-Vazhi</span></span>
        </div>
        <p style={styles.tagline}>Smart Logistics & Truck Pooling Platform</p>
      </div>

      <div style={styles.divider}></div>

      {/* RECEIPT METADATA */}
      <div style={styles.metaSection}>
        <h1 style={styles.title}>{title}</h1>
        <div style={styles.metaGrid}>
          <div style={styles.metaItem}><strong>Receipt No:</strong> {payment.paymentId}</div>
          <div style={styles.metaItem}><strong>Invoice No:</strong> INV-{payment.paymentId?.split('PAY')[1] || new Date().getTime()}</div>
          <div style={styles.metaItem}><strong>Issue Date:</strong> {dateStr}</div>
          <div style={styles.metaItem}><strong>Status:</strong> <span style={{ color: payment.status.includes('Paid') ? '#22c55e' : '#f59e0b' }}>{payment.status}</span></div>
        </div>
      </div>

      <div style={styles.divider}></div>

      {/* BILLED TO / PAID TO */}
      <div style={styles.parties}>
        <div style={styles.partyBox}>
          <h3 style={styles.sectionTitle}>BILLED TO (SHIPPER)</h3>
          <p style={styles.partyText}>{payment.shipperId?.businessName || payment.shipperId?.name || 'N/A'}</p>
          <p style={styles.partySub}>Phone: {payment.shipperId?.phone || 'N/A'}</p>
          <p style={styles.partySub}>Email: {payment.shipperId?.email || 'N/A'}</p>
        </div>
        <div style={styles.partyBoxRight}>
          <h3 style={styles.sectionTitle}>PAID TO (DRIVER)</h3>
          <p style={styles.partyText}>{payment.driverId?.name || 'N/A'}</p>
          <p style={styles.partySub}>Phone: {payment.driverId?.phone || 'N/A'}</p>
          <p style={styles.partySub}>Vehicle: {payment.driverId?.vehicleNumber || 'N/A'}</p>
        </div>
      </div>

      <div style={styles.divider}></div>

      {/* SHIPMENT DETAILS */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>SHIPMENT DETAILS</h3>
        <div style={styles.shipmentBox}>
          <div style={styles.shipRow}><strong>Shipment ID:</strong> {payment.shipmentId?.shipmentId || 'N/A'}</div>
          <div style={styles.shipRow}><strong>Route:</strong> {payment.shipmentId?.pickup} ➔ {payment.shipmentId?.drop}</div>
          {payment.shipmentId?.goodsType && <div style={styles.shipRow}><strong>Goods Type:</strong> {payment.shipmentId.goodsType}</div>}
          {payment.shipmentId?.weight && <div style={styles.shipRow}><strong>Weight:</strong> {payment.shipmentId.weight} {payment.shipmentId.weightUnit || 'kg'}</div>}
        </div>
      </div>

      <div style={styles.divider}></div>

      {/* PAYMENT SUMMARY */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>PAYMENT SUMMARY</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Description</th>
              <th style={styles.thRight}>Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.td}>
                <strong>Transportation Service ({payment.type})</strong><br/>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Transaction ID: {payment.razorpayPaymentId || 'N/A'}
                </span>
              </td>
              <td style={styles.tdRight}>₹{payment.amount.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        <div style={styles.totalBox}>
          <span>TOTAL PAID</span>
          <span style={styles.totalAmount}>₹{payment.amount.toLocaleString()}</span>
        </div>
      </div>

      <div style={styles.divider}></div>

      {/* TIMELINE */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>TIMELINE</h3>
        <div style={styles.timeline}>
          <div style={styles.timeItem}>
            <strong>Generated:</strong> {dateStr}
          </div>
          <div style={styles.timeItem}>
            <strong>Last Updated:</strong> {updateDateStr}
          </div>
        </div>
      </div>

      <div style={styles.divider}></div>

      {/* FOOTER */}
      <div style={styles.footer}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>Thank you for using Nool-Vazhi Logistics.</p>
        <p style={{ margin: '4px 0 0 0' }}>For support, contact support@noolvazhi.com</p>
        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '10px 0 0 0' }}>
          This is a computer-generated receipt and does not require a physical signature.
        </p>
      </div>
    </div>
  );
});

const styles = {
  container: {
    width: '800px',
    minHeight: '1130px', 
    padding: '40px 50px',
    background: '#FFFFFF',
    fontFamily: 'Arial, Helvetica, sans-serif',
    color: '#334155',
    boxSizing: 'border-box',
    margin: '0 auto'
  },
  divider: {
    height: '1px',
    background: '#e2e8f0',
    margin: '20px 0'
  },
  header: {
    textAlign: 'center',
    marginBottom: '10px'
  },
  logoBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '8px'
  },
  logoIcon: { fontSize: '40px', color: '#F97316' },
  logoText: { fontSize: '36px', fontWeight: '800', color: '#1E3A8A' },
  tagline: { fontSize: '14px', color: '#64748b', margin: 0, letterSpacing: '0px' },
  
  metaSection: {
    textAlign: 'center'
  },
  title: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#1E3A8A',
    margin: '0 0 15px 0'
  },
  metaGrid: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#475569'
  },
  metaItem: {
    flex: 1
  },
  
  parties: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  partyBox: { flex: 1 },
  partyBoxRight: { flex: 1, textAlign: 'right' },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#94a3b8',
    margin: '0 0 10px 0'
  },
  partyText: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1E3A8A',
    margin: '0 0 4px 0'
  },
  partySub: { fontSize: '13px', color: '#64748b', margin: '0 0 2px 0' },

  section: {
    marginBottom: '10px'
  },
  shipmentBox: {
    background: '#f8fafc',
    padding: '16px',
    borderRadius: '8px',
    fontSize: '14px'
  },
  shipRow: {
    marginBottom: '6px'
  },

  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px', fontSize: '13px', fontWeight: 'bold', borderBottom: '2px solid #1E3A8A' },
  thRight: { padding: '12px', fontSize: '13px', fontWeight: 'bold', textAlign: 'right', borderBottom: '2px solid #1E3A8A' },
  td: { padding: '16px 12px', fontSize: '14px', borderBottom: '1px solid #e2e8f0' },
  tdRight: { padding: '16px 12px', fontSize: '16px', fontWeight: 'bold', textAlign: 'right', borderBottom: '1px solid #e2e8f0' },
  
  totalBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 12px',
    background: '#1E3A8A',
    color: 'white',
    borderRadius: '0 0 8px 8px',
    fontWeight: 'bold',
    fontSize: '16px'
  },
  totalAmount: {
    fontSize: '24px'
  },

  timeline: {
    display: 'flex',
    gap: '40px',
    fontSize: '13px'
  },
  timeItem: {
    color: '#475569'
  },

  footer: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: '12px'
  }
};

ReceiptTemplate.displayName = 'ReceiptTemplate';
export default ReceiptTemplate;
