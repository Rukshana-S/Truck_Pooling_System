import Link from 'next/link';
;
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const stats = [
  { value: '10,000+', label: 'Active Drivers' },
  { value: '50,000+', label: 'Shipments Delivered' },
  { value: '500+', label: 'Cities Covered' },
  { value: '4.8', label: 'Average Rating' },
];

const features = [
  { icon: 'fa-solid fa-rotate', title: 'Smart Truck Pooling', desc: 'Share truck space with other shippers and cut costs by up to 40%.' },
  { icon: 'fa-solid fa-location-dot', title: 'Real-Time Tracking', desc: 'Live GPS tracking with instant status updates at every milestone.' },
  { icon: 'fa-solid fa-shield-halved', title: 'Trust & Safety', desc: 'Verified drivers, escrow payments, and OTP-based delivery confirmation.' },
  { icon: 'fa-solid fa-indian-rupee-sign', title: 'Best Pricing', desc: 'Dynamic pricing with pool discounts and return load optimization.' },
];

const bullets = [
  { icon: 'fa-solid fa-bolt', text: 'Instant booking in under 2 minutes' },
  { icon: 'fa-solid fa-arrows-rotate', text: 'Return load optimization' },
  { icon: 'fa-solid fa-coins', text: 'Transparent, no-hidden-fee pricing' },
  { icon: 'fa-solid fa-headset', text: '24/7 customer support' },
  { icon: 'fa-solid fa-lock', text: 'Shipment insurance included' },
  { icon: 'fa-solid fa-file-lines', text: 'Digital documentation & e-POD' },
];

export default function Landing() {
  return (
    <div>
      <Navbar />

      {/* Hero */}
      <section style={styles.hero}>
        <div style={styles.overlay} />
        <div style={styles.heroContent} className="fade-in">
          <div style={styles.badge}>
            <i className="fa-solid fa-flag" style={{ marginRight: 6 }}></i>
            India's #1 Truck Pooling Platform
          </div>
          <h1 style={styles.heroTitle}>
            Smart Truck Pooling<br />
            <span style={{ color: '#F97316' }}>Made Simple</span>
          </h1>
          <p style={styles.heroSub}>
            Connect shippers and drivers with trust, efficiency, and real-time tracking.
            Save costs through intelligent load pooling.
          </p>
          <div style={styles.heroBtns}>
            <Link href="/register/organization">
              <button className="btn-primary" style={{ fontSize: 16, padding: '14px 32px' }}>
                <i className="fa-solid fa-box"></i> Book Shipment
              </button>
            </Link>
            <Link href="/register/driver">
              <button className="btn-outline" style={{ fontSize: 16, padding: '14px 32px' }}>
                <i className="fa-solid fa-truck-moving"></i> Join as Driver
              </button>
            </Link>
          </div>
          <div style={styles.statsGrid}>
            {stats.map((s, i) => (
              <div key={i} style={styles.statCard}>
                <div style={styles.statValue}>{s.value}</div>
                <div style={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose */}
      <section style={styles.section}>
        <div style={styles.container}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Why Choose <span style={{ color: '#F97316' }}>Nool-Vazhi?</span></h2>
            <p style={styles.sectionSub}>Built for the modern Indian logistics ecosystem</p>
          </div>
          <div className="grid-4">
            {features.map((f, i) => (
              <div key={i} className="card" style={styles.featureCard}>
                <div style={styles.featureIconWrap}>
                  <i className={f.icon} style={styles.featureIcon}></i>
                </div>
                <h3 style={styles.featureTitle}>{f.title}</h3>
                <p style={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Split */}
      <section style={{ ...styles.section, background: '#f1f5f9' }}>
        <div style={{ ...styles.container, ...styles.splitGrid }}>
          <div style={styles.splitLeft} className="fade-in">
            <h2 style={styles.splitTitle}>Everything You Need for <span style={{ color: '#F97316' }}>Seamless Logistics</span></h2>
            <div style={styles.bulletList}>
              {bullets.map((b, i) => (
                <div key={i} style={styles.bullet}>
                  <i className={b.icon} style={styles.bulletIcon}></i>
                  {b.text}
                </div>
              ))}
            </div>
            <Link href="/register/organization">
              <button className="btn-primary" style={{ marginTop: 24 }}>
                Get Started Now <i className="fa-solid fa-arrow-right"></i>
              </button>
            </Link>
          </div>
          <div style={styles.splitRight}>
            <div style={styles.imageBox}>
              <div style={styles.imagePlaceholder}>
                <i className="fa-solid fa-warehouse" style={{ fontSize: 80, color: 'rgba(255,255,255,0.6)' }}></i>
                <p style={{ color: '#94a3b8', marginTop: 12 }}>Warehouse & Logistics Hub</p>
              </div>
              <div style={styles.floatingCard}>
                <i className="fa-solid fa-box" style={{ fontSize: 20, color: '#F97316' }}></i>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Live Shipment</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>Mumbai → Pune • In Transit</div>
                </div>
                <i className="fa-solid fa-circle" style={{ color: '#22c55e', fontSize: 10 }}></i>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={styles.cta}>
        <div style={styles.container}>
          <h2 style={styles.ctaTitle}>Ready to Transform Your Logistics?</h2>
          <p style={styles.ctaSub}>Join 10,000+ businesses already saving with Nool-Vazhi</p>
          <div style={styles.ctaBtns}>
            <Link href="/register/organization">
              <button className="btn-primary" style={{ fontSize: 16, padding: '14px 32px' }}>Get Started Free</button>
            </Link>
            <Link href="/trust">
              <button className="btn-outline" style={{ fontSize: 16, padding: '14px 32px' }}>Learn About Safety</button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

const styles = {
  hero: { position: 'relative', minHeight: '100vh', background: 'url("https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1600&q=80") center/cover no-repeat', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  overlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.62)' },
  heroContent: { position: 'relative', textAlign: 'center', padding: '80px 24px 60px', maxWidth: 900, margin: '0 auto' },
  badge: { display: 'inline-block', background: 'rgba(249,115,22,0.2)', border: '1px solid rgba(249,115,22,0.4)', color: '#fb923c', padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 24 },
  heroTitle: { fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 800, color: 'white', lineHeight: 1.15, marginBottom: 20 },
  heroSub: { fontSize: 18, color: 'rgba(255,255,255,0.8)', maxWidth: 600, margin: '0 auto 36px', lineHeight: 1.7 },
  heroBtns: { display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 60 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, maxWidth: 800, margin: '0 auto' },
  statCard: { background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 14, padding: '20px 16px', textAlign: 'center' },
  statValue: { fontSize: 26, fontWeight: 800, color: 'white', marginBottom: 4 },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500 },
  section: { padding: '80px 0' },
  container: { maxWidth: 1200, margin: '0 auto', padding: '0 24px' },
  sectionHeader: { textAlign: 'center', marginBottom: 48 },
  sectionTitle: { fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 800, color: '#1e293b', marginBottom: 12 },
  sectionSub: { color: '#64748b', fontSize: 16 },
  featureCard: { textAlign: 'center', padding: 32 },
  featureIconWrap: { width: 64, height: 64, borderRadius: 16, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  featureIcon: { fontSize: 28, color: '#1E3A8A' },
  featureTitle: { fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 10 },
  featureDesc: { color: '#64748b', fontSize: 14, lineHeight: 1.6 },
  splitGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' },
  splitLeft: {},
  splitTitle: { fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 800, color: '#1e293b', lineHeight: 1.3, marginBottom: 28 },
  bulletList: { display: 'flex', flexDirection: 'column', gap: 12 },
  bullet: { fontSize: 15, color: '#475569', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 },
  bulletIcon: { color: '#F97316', width: 16, textAlign: 'center' },
  splitRight: {},
  imageBox: { position: 'relative' },
  imagePlaceholder: { background: 'linear-gradient(135deg, #1E3A8A, #3b82f6)', borderRadius: 20, height: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  floatingCard: { position: 'absolute', bottom: -20, left: 20, background: 'white', borderRadius: 12, padding: '12px 16px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 10 },
  cta: { background: '#1E3A8A', padding: '80px 0', textAlign: 'center' },
  ctaTitle: { fontSize: 'clamp(24px, 4vw, 42px)', fontWeight: 800, color: 'white', marginBottom: 16 },
  ctaSub: { color: 'rgba(255,255,255,0.75)', fontSize: 16, marginBottom: 36 },
  ctaBtns: { display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' },
};
