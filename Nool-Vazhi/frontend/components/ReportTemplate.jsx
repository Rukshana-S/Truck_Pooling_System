import React from 'react';

const ReportTemplate = React.forwardRef(({ payments, isDriver, user }, ref) => {
  if (!payments || payments.length === 0) return null;

  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div ref={ref} style={styles.container}>
      <div style={styles.header}>
        <div style={styles.logoBox}>
          <i className="fa-solid fa-truck" style={styles.logoIcon}></i>
          <span style={styles.logoText}>Nool<span style={{ color: '#F97316' }}>-Vazhi</span></span>
        </div>
        <div style={styles.titleBox}>
          <h1 style={styles.title}>CONSOLIDATED REPORT</h1>
          <p style={styles.date}>Generated: {dateStr}</p>
        </div>
      </div>

      <div style={styles.userInfo}>
        <h3 style={styles.partyTitle}>Report For:</h3>
        <p style={styles.partyText}>{user?.businessName || user?.name || 'N/A'}</p>
        <p style={styles.partySub}>Role: {isDriver ? 'Driver' : 'Shipper (Organization)'}</p>
      </div>

      <div style={styles.summaryWrap}>
        <div style={styles.summaryBox}>
          <div style={styles.summaryLabel}>Total Transactions</div>
          <div style={styles.summaryValue}>{payments.length}</div>
        </div>
        <div style={styles.summaryBox}>
          <div style={styles.summaryLabel}>Total Amount</div>
          <div style={styles.summaryValue}>₹{totalAmount.toLocaleString()}</div>
        </div>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Payment ID</th>
              <th style={styles.th}>Shipment</th>
              <th style={styles.th}>{isDriver ? 'Shipper' : 'Driver'}</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Status</th>
              <th style={styles.thRight}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p, i) => (
              <tr key={p._id || i} style={styles.tableRow}>
                <td style={styles.td}>{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                <td style={styles.td}>{p.paymentId}</td>
                <td style={styles.td}>{p.shipmentId?.shipmentId || 'N/A'}</td>
                <td style={styles.td}>{isDriver ? (p.shipperId?.businessName || p.shipperId?.name || 'N/A') : (p.driverId?.name || 'N/A')}</td>
                <td style={styles.td}>{p.type}</td>
                <td style={styles.td}>{p.status}</td>
                <td style={styles.tdRight}>₹{p.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={styles.footer}>
        <p style={{ margin: 0 }}>Thank you for using Nool-Vazhi Logistics.</p>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0 0' }}>
          This is a computer-generated report and does not require a physical signature.
        </p>
      </div>
    </div>
  );
});

const styles = {
  container: {
    width: '1123px',
    minHeight: '794px', 
    padding: '40px 50px',
    background: '#FFFFFF',
    fontFamily: 'Arial, Helvetica, sans-serif',
    color: '#334155',
    boxSizing: 'border-box',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '3px solid #1E3A8A',
    paddingBottom: '20px',
    marginBottom: '20px'
  },
  logoBox: { display: 'flex', alignItems: 'center', gap: '8px' },
  logoIcon: { fontSize: '32px', color: '#F97316' },
  logoText: { fontSize: '28px', fontWeight: '800', color: '#1E3A8A' },
  titleBox: { textAlign: 'right' },
  title: { fontSize: '20px', fontWeight: '800', color: '#1E3A8A', margin: '0 0 8px 0' },
  date: { fontSize: '14px', margin: 0, color: '#475569' },
  
  userInfo: { marginBottom: '30px' },
  partyTitle: { fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 4px 0' },
  partyText: { fontSize: '16px', fontWeight: '700', color: '#1E3A8A', margin: '0 0 2px 0' },
  partySub: { fontSize: '13px', color: '#64748b', margin: 0 },

  summaryWrap: { display: 'flex', gap: '20px', marginBottom: '30px' },
  summaryBox: { flex: 1, background: '#f8fafc', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #F97316' },
  summaryLabel: { fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' },
  summaryValue: { fontSize: '24px', fontWeight: '800', color: '#1E3A8A' },

  tableWrap: { marginBottom: '40px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  tableHeader: { background: '#1E3A8A', color: '#FFFFFF' },
  th: { padding: '12px', fontSize: '13px', fontWeight: '600', borderBottom: '1px solid #1E3A8A' },
  thRight: { padding: '12px', fontSize: '13px', fontWeight: '600', textAlign: 'right', borderBottom: '1px solid #1E3A8A' },
  tableRow: { borderBottom: '1px solid #e2e8f0' },
  td: { padding: '12px', fontSize: '13px', color: '#334155' },
  tdRight: { padding: '12px', fontSize: '13px', color: '#334155', textAlign: 'right', fontWeight: '600' },

  footer: { marginTop: '40px', textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '20px', color: '#64748b', fontSize: '13px' }
};

ReportTemplate.displayName = 'ReportTemplate';
export default ReportTemplate;
