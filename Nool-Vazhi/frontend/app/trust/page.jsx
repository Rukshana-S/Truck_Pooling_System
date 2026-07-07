"use client";
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';

const trustBadges = [
  { icon: 'fa-solid fa-lock', label: 'SSL Secured' },
  { icon: 'fa-solid fa-user-shield', label: 'End-to-End Encryption' },
  { icon: 'fa-solid fa-circle-check', label: 'Verified Drivers' },
  { icon: 'fa-solid fa-credit-card', label: 'Secure Payments' },
  { icon: 'fa-solid fa-trophy', label: 'ISO 27001 Certified' },
  { icon: 'fa-solid fa-star', label: 'Rating System' },
];

const safetyFeatures = [
  { icon: 'fa-solid fa-building-columns', title: 'Escrow Payment', desc: 'Your payment is held securely until delivery is confirmed. Money is released only after successful OTP verification at destination.', color: '#1E3A8A' },
  { icon: 'fa-solid fa-mobile-screen', title: 'OTP Verification', desc: 'Every pickup and delivery requires OTP confirmation from both shipper and receiver. No unauthorized handovers.', color: '#F97316' },
  { icon: 'fa-solid fa-robot', title: 'Fraud Detection', desc: 'AI-powered fraud detection monitors every transaction and flags suspicious activity in real-time.', color: '#8b5cf6' },
  { icon: 'fa-solid fa-star', title: 'Driver Rating System', desc: 'Every driver is rated after each delivery. Low-rated drivers are automatically suspended pending review.', color: '#22c55e' },
];

const processSteps = [
  { step: 1, icon: 'fa-solid fa-box', title: 'Book & Pay', desc: 'Book your shipment and pay securely. Funds held in escrow.' },
  { step: 2, icon: 'fa-solid fa-key', title: 'Pickup Verification', desc: 'Driver scans QR code and enters OTP to confirm pickup.' },
  { step: 3, icon: 'fa-solid fa-truck', title: 'In Transit', desc: 'Real-time GPS tracking throughout the journey.' },
  { step: 4, icon: 'fa-solid fa-circle-check', title: 'Delivery Confirmation', desc: 'Receiver confirms with OTP. Payment released to driver.' },
];

const trustStats = [
  { value: '0%', label: 'Fraud Rate', icon: 'fa-solid fa-shield-halved' },
  { value: '99.8%', label: 'Successful Deliveries', icon: 'fa-solid fa-circle-check' },
  { value: '4.8', label: 'Avg Driver Rating', icon: 'fa-solid fa-star' },
  { value: '24/7', label: 'Security Monitoring', icon: 'fa-solid fa-eye' },
];

export default function Trust() {
  const { user } = useAuth();

  const content = (
    <main style={styles.main}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Trust & <span style={{ color: '#F97316' }}>Safety</span></h1>
          <p style={styles.sub}>Your security is our top priority. Every shipment is protected end-to-end.</p>
        </div>

        <div style={styles.badgesGrid}>
          {trustBadges.map((b, i) => (
            <div key={i} style={styles.badge}>
              <i className={b.icon} style={styles.badgeIcon}></i>
              <span style={styles.badgeLabel}>{b.label}</span>
            </div>
          ))}
        </div>

        <div className="grid-2" style={{ marginBottom: 60 }}>
          {safetyFeatures.map((f, i) => (
            <div key={i} className="card" style={styles.featureCard}>
              <div style={{ ...styles.featureIcon, background: f.color + '18' }}>
                <i className={f.icon} style={{ color: f.color, fontSize: 24 }}></i>
              </div>
              <div>
                <h3 style={styles.featureTitle}>{f.title}</h3>
                <p style={styles.featureDesc}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 40, marginBottom: 48 }}>
          <h2 style={styles.sectionTitle}>How We Keep You Safe</h2>
          <div style={styles.processGrid}>
            {processSteps.map((p, i) => (
              <div key={i} style={styles.processStep}>
                <div style={styles.processNum}>{p.step}</div>
                <div style={styles.processIconWrap}>
                  <i className={p.icon} style={{ fontSize: 28, color: '#1E3A8A' }}></i>
                </div>
                <h4 style={styles.processTitle}>{p.title}</h4>
                <p style={styles.processDesc}>{p.desc}</p>
                {i < processSteps.length - 1 && (
                  <div style={styles.processArrow}>
                    <i className="fa-solid fa-arrow-right"></i>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={styles.statsGrid}>
          {trustStats.map((s, i) => (
            <div key={i} className="card" style={styles.statCard}>
              <i className={s.icon} style={styles.statIcon}></i>
              <div style={styles.statValue}>{s.value}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );

  if (user) return <div style={{ display: 'flex', minHeight: '100vh' }}><Sidebar />{content}</div>;
  return <div><Navbar />{content}<Footer /></div>;
}

const styles = {
  main: { flex: 1, padding: '40px 0', background: '#f8fafc' },
  container: { maxWidth: 1100, margin: '0 auto', padding: '0 24px' },
  header: { textAlign: 'center', marginBottom: 48 },
  title: { fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#1e293b', marginBottom: 12 },
  sub: { color: '#64748b', fontSize: 16, maxWidth: 600, margin: '0 auto' },
  badgesGrid: { display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 60 },
  badge: { background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' },
  badgeIcon: { fontSize: 20, color: '#1E3A8A', width: 20, textAlign: 'center' },
  badgeLabel: { fontWeight: 600, fontSize: 14, color: '#1e293b' },
  featureCard: { display: 'flex', gap: 20, alignItems: 'flex-start', padding: 28 },
  featureIcon: { width: 56, height: 56, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureTitle: { fontSize: 17, fontWeight: 700, color: '#1e293b', marginBottom: 8 },
  featureDesc: { color: '#64748b', fontSize: 14, lineHeight: 1.6 },
  sectionTitle: { fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 36, textAlign: 'center' },
  processGrid: { display: 'flex', gap: 0, position: 'relative', flexWrap: 'wrap', justifyContent: 'center' },
  processStep: { flex: 1, minWidth: 180, textAlign: 'center', padding: '0 16px', position: 'relative' },
  processNum: { width: 36, height: 36, borderRadius: '50%', background: '#1E3A8A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, margin: '0 auto 12px' },
  processIconWrap: { marginBottom: 12, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  processTitle: { fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 8 },
  processDesc: { color: '#64748b', fontSize: 13, lineHeight: 1.5 },
  processArrow: { position: 'absolute', right: -12, top: 16, fontSize: 18, color: '#F97316', fontWeight: 700 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 },
  statCard: { textAlign: 'center', padding: '28px 16px' },
  statIcon: { fontSize: 32, color: '#1E3A8A', marginBottom: 12 },
  statValue: { fontSize: 32, fontWeight: 800, color: '#1E3A8A', marginBottom: 6 },
  statLabel: { color: '#64748b', fontSize: 13, fontWeight: 500 },
};
