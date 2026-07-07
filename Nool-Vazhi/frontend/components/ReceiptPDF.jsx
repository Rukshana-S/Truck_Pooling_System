import React from 'react';

const ReceiptPDF = React.forwardRef(({ payment }, ref) => {
  if (!payment) return null;

  const dateStr = new Date(payment.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
  
  const isAdvance = payment.type === 'Advance';
  const title = isAdvance ? 'ADVANCE PAYMENT RECEIPT' : 'FINAL PAYMENT RECEIPT';
  
  const s = payment.shipmentId || {};
  const amount = payment.amount || 0;
  
  // Calculate total, advance, final logic based on what we know
  // Since we only know the current payment amount, we assume it's either advance or final.
  const totalAmount = s.price || amount * (isAdvance ? 10 : 1.11); // mock total if price missing
  const advanceAmount = isAdvance ? amount : (totalAmount * 0.1);
  const finalAmount = isAdvance ? 0 : amount;
  const balance = totalAmount - advanceAmount - finalAmount;

  return (
    <div ref={ref} style={styles.container}>
      {/* HEADER */}
      <table width="100%" cellPadding="0" cellSpacing="0" border="0" style={{ marginBottom: '15px' }}>
        <tbody>
          <tr>
            <td width="50%" valign="middle">
              <div style={styles.logoBox}>
                <i className="fa-solid fa-truck" style={styles.logoIcon}></i>
                <span style={styles.logoText}>Nool<span style={{ color: '#F97316' }}>-Vazhi</span></span>
              </div>
              <div style={styles.tagline}>Smart Logistics & Truck Pooling Platform</div>
            </td>
            <td width="50%" valign="middle" align="right">
              <div style={styles.title}>{title}</div>
              <table cellPadding="0" cellSpacing="0" border="0" style={{ display: 'inline-table', textAlign: 'left', fontSize: '12px' }}>
                <tbody>
                  <tr><td style={{ paddingRight: '15px', color: '#64748b' }}>Receipt Number:</td><td><strong>{payment.paymentId}</strong></td></tr>
                  <tr><td style={{ paddingRight: '15px', color: '#64748b' }}>Invoice Number:</td><td><strong>INV-{payment.paymentId?.split('PAY')[1] || new Date().getTime()}</strong></td></tr>
                  <tr><td style={{ paddingRight: '15px', color: '#64748b' }}>Issue Date:</td><td><strong>{dateStr}</strong></td></tr>
                  <tr><td style={{ paddingRight: '15px', color: '#64748b' }}>Status:</td><td><span style={{ color: payment.status.includes('Paid') ? '#22c55e' : '#f59e0b', fontWeight: 'bold' }}>{payment.status}</span></td></tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* SECTION 1: ORG & DRIVER DETAILS */}
      <table width="100%" cellPadding="0" cellSpacing="0" border="0" style={{ marginBottom: '15px' }}>
        <tbody>
          <tr>
            <td width="49%" valign="top">
              <div style={styles.card}>
                <div style={styles.sectionTitle}>ORGANIZATION DETAILS (BILLED TO)</div>
                <table width="100%" cellPadding="2" cellSpacing="0" border="0" style={{ fontSize: '12px' }}>
                  <tbody>
                    <tr><td width="35%" style={{ color: '#64748b' }}>Organization:</td><td><strong>{payment.shipperId?.businessName || 'N/A'}</strong></td></tr>
                    <tr><td style={{ color: '#64748b' }}>Contact Person:</td><td><strong>{payment.shipperId?.name || 'N/A'}</strong></td></tr>
                    <tr><td style={{ color: '#64748b' }}>Phone:</td><td>{payment.shipperId?.phone || 'N/A'}</td></tr>
                    <tr><td style={{ color: '#64748b' }}>Email:</td><td>{payment.shipperId?.email || 'N/A'}</td></tr>
                  </tbody>
                </table>
              </div>
            </td>
            <td width="2%"></td>
            <td width="49%" valign="top">
              <div style={styles.card}>
                <div style={styles.sectionTitle}>DRIVER DETAILS (PAID TO)</div>
                <table width="100%" cellPadding="2" cellSpacing="0" border="0" style={{ fontSize: '12px' }}>
                  <tbody>
                    <tr><td width="35%" style={{ color: '#64748b' }}>Driver Name:</td><td><strong>{payment.driverId?.name || 'N/A'}</strong></td></tr>
                    <tr><td style={{ color: '#64748b' }}>Phone:</td><td>{payment.driverId?.phone || 'N/A'}</td></tr>
                    <tr><td style={{ color: '#64748b' }}>Vehicle Number:</td><td>{payment.driverId?.vehicleNumber || 'N/A'}</td></tr>
                    <tr><td style={{ color: '#64748b' }}>Vehicle Type:</td><td>{payment.driverId?.vehicleType || 'Truck'}</td></tr>
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* SECTION 2: SHIPMENT DETAILS */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>SHIPMENT DETAILS</div>
        <table width="100%" cellPadding="4" cellSpacing="0" border="0" style={{ fontSize: '12px' }}>
          <tbody>
            <tr>
              <td width="15%" style={{ color: '#64748b' }}>Shipment ID:</td><td width="35%"><strong>{s.shipmentId || 'N/A'}</strong></td>
              <td width="15%" style={{ color: '#64748b' }}>Goods Type:</td><td width="35%"><strong>{s.goodsType || 'N/A'}</strong></td>
            </tr>
            <tr>
              <td style={{ color: '#64748b' }}>Pickup:</td><td><strong>{s.pickup || 'N/A'}</strong></td>
              <td style={{ color: '#64748b' }}>Weight:</td><td><strong>{s.weight ? `${s.weight} ${s.weightUnit || 'kg'}` : 'N/A'}</strong></td>
            </tr>
            <tr>
              <td style={{ color: '#64748b' }}>Destination:</td><td><strong>{s.drop || 'N/A'}</strong></td>
              <td style={{ color: '#64748b' }}>Delivery Date:</td><td><strong>{s.deliveryDate ? new Date(s.deliveryDate).toLocaleDateString('en-IN') : 'N/A'}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* SECTION 3: PAYMENT SUMMARY TABLE */}
      <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
        <table width="100%" cellPadding="10" cellSpacing="0" border="0" style={styles.table}>
          <thead style={{ background: '#1E3A8A', color: 'white' }}>
            <tr>
              <th align="left" style={styles.th}>Description</th>
              <th align="right" style={styles.th}>Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.td}>
                <strong>Transportation Service ({payment.type})</strong><br/>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Shipment Reference: {s.shipmentId || 'N/A'}</span>
              </td>
              <td align="right" style={styles.tdRight}>₹{amount.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        <table width="100%" cellPadding="10" cellSpacing="0" border="0" style={{ background: '#f8fafc', fontSize: '12px' }}>
          <tbody>
            <tr>
              <td align="right" style={{ borderTop: '1px solid #e2e8f0', color: '#64748b' }}>Advance Payment:</td>
              <td align="right" width="20%" style={{ borderTop: '1px solid #e2e8f0' }}>₹{advanceAmount.toLocaleString()}</td>
            </tr>
            <tr>
              <td align="right" style={{ borderTop: '1px solid #e2e8f0', color: '#64748b' }}>Final Payment:</td>
              <td align="right" width="20%" style={{ borderTop: '1px solid #e2e8f0' }}>₹{finalAmount.toLocaleString()}</td>
            </tr>
            <tr>
              <td align="right" style={{ borderTop: '1px solid #e2e8f0', fontWeight: 'bold', color: '#1E3A8A', fontSize: '14px' }}>TOTAL PAID:</td>
              <td align="right" width="20%" style={{ borderTop: '1px solid #e2e8f0', fontWeight: 'bold', color: '#F97316', fontSize: '16px' }}>₹{amount.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* SECTION 4: PAYMENT TIMELINE */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>PAYMENT TIMELINE</div>
        <table width="100%" cellPadding="0" cellSpacing="0" border="0" style={{ textAlign: 'center', fontSize: '11px', color: '#1E3A8A', fontWeight: 'bold' }}>
          <tbody>
            <tr>
              <td width="16%">
                <div style={styles.timelineCircleActive}><i className="fa-solid fa-check"></i></div>
                <div>Shipment<br/>Accepted</div>
              </td>
              <td width="16%">
                <div style={styles.timelineCircleActive}><i className="fa-solid fa-check"></i></div>
                <div>Advance<br/>Paid</div>
              </td>
              <td width="16%">
                <div style={isAdvance && !payment.status.includes('Fully') ? styles.timelineCircle : styles.timelineCircleActive}>
                  <i className="fa-solid fa-truck-fast"></i>
                </div>
                <div>In Transit</div>
              </td>
              <td width="16%">
                <div style={isAdvance && !payment.status.includes('Fully') ? styles.timelineCircle : styles.timelineCircleActive}>
                  <i className="fa-solid fa-box-open"></i>
                </div>
                <div>Delivered</div>
              </td>
              <td width="16%">
                <div style={isAdvance && !payment.status.includes('Fully') ? styles.timelineCircle : styles.timelineCircleActive}>
                  {isAdvance && !payment.status.includes('Fully') ? <i className="fa-regular fa-clock"></i> : <i className="fa-solid fa-check"></i>}
                </div>
                <div>Final<br/>Payment</div>
              </td>
              <td width="16%">
                <div style={styles.timelineCircleActive}><i className="fa-solid fa-file-invoice"></i></div>
                <div>Receipt<br/>Generated</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* SECTION 5: TRANSACTION DETAILS */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>TRANSACTION DETAILS</div>
        <table width="100%" cellPadding="2" cellSpacing="0" border="0" style={{ fontSize: '12px' }}>
          <tbody>
            <tr>
              <td width="20%" style={{ color: '#64748b' }}>Payment Method:</td><td width="30%"><strong>Online (Razorpay)</strong></td>
              <td width="20%" style={{ color: '#64748b' }}>Payment Date:</td><td width="30%"><strong>{dateStr}</strong></td>
            </tr>
            <tr>
              <td style={{ color: '#64748b' }}>Transaction ID:</td><td><strong>{payment.razorpayPaymentId || 'N/A'}</strong></td>
              <td style={{ color: '#64748b' }}>Payment Gateway:</td><td><strong>Razorpay</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div style={styles.footer}>
        <div style={styles.divider}></div>
        <table width="100%" cellPadding="0" cellSpacing="0" border="0" style={{ fontSize: '11px', color: '#64748b' }}>
          <tbody>
            <tr>
              <td width="33%" align="left">
                <strong>Thank you for choosing Nool-Vazhi.</strong><br/>
                Smart Logistics & Truck Pooling Platform
              </td>
              <td width="33%" align="center">
                This is a computer-generated receipt<br/>and does not require a physical signature.
              </td>
              <td width="33%" align="right">
                support@noolvazhi.com<br/>
                www.noolvazhi.com
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
});

const styles = {
  container: {
    width: '1123px', // A4 Landscape pixel width at 96 DPI
    minHeight: '794px', // A4 Landscape pixel height
    padding: '30px 40px',
    background: '#FFFFFF',
    fontFamily: 'Arial, Helvetica, sans-serif',
    color: '#334155',
    boxSizing: 'border-box',
    margin: '0 auto',
    position: 'relative'
  },
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '15px'
  },
  logoBox: {
    marginBottom: '4px'
  },
  logoIcon: { fontSize: '32px', color: '#F97316', marginRight: '8px', verticalAlign: 'middle' },
  logoText: { fontSize: '28px', fontWeight: 'bold', color: '#1E3A8A', verticalAlign: 'middle' },
  tagline: { fontSize: '12px', color: '#64748b' },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: '10px'
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: '8px',
    textTransform: 'uppercase',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '4px'
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { fontSize: '12px', fontWeight: 'bold', padding: '10px' },
  td: { fontSize: '13px', padding: '10px', verticalAlign: 'top', borderBottom: '1px solid #e2e8f0' },
  tdRight: { fontSize: '14px', fontWeight: 'bold', padding: '10px', verticalAlign: 'top', color: '#1e293b', borderBottom: '1px solid #e2e8f0' },
  timelineCircleActive: {
    width: '28px', height: '28px', borderRadius: '14px', background: '#22c55e', color: 'white',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px', fontSize: '12px'
  },
  timelineCircle: {
    width: '28px', height: '28px', borderRadius: '14px', background: '#e2e8f0', color: '#94a3b8',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px', fontSize: '12px'
  },
  divider: { height: '1px', background: '#e2e8f0', margin: '15px 0' },
  footer: { marginTop: '10px' }
};

ReceiptPDF.displayName = 'ReceiptPDF';
export default ReceiptPDF;
