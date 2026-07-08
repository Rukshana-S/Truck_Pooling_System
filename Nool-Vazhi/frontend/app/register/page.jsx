import Link from 'next/link';
;

export default function Register() {
  return (
    <div style={styles.page}>
      <div style={styles.overlay} />
      <div style={styles.card} className="fade-in">
        <Link href="/" style={styles.logo}>
          <i className="fa-solid fa-truck" style={{ color: '#F97316', marginRight: 8 }}></i>
          Nool<span style={{ color: '#F97316' }}>-Vazhi</span>
        </Link>
        <h2 style={styles.title}>Create Account</h2>
        <p style={styles.sub}>Choose how you want to join Nool-Vazhi</p>

        <div className="grid-2" style={{ gap: 16, marginBottom: 28 }}>
          <Link href="/register/organization" style={styles.option}>
            <div style={styles.optionIcon}><i className="fa-solid fa-building"></i></div>
            <div style={styles.optionTitle}>Organization</div>
            <div style={styles.optionDesc}>Register as a business to book and manage shipments</div>
            <div style={styles.optionBtn}>Register as Org <i className="fa-solid fa-arrow-right"></i></div>
          </Link>

          <Link href="/register/driver" style={styles.option}>
            <div style={styles.optionIcon}><i className="fa-solid fa-truck-moving"></i></div>
            <div style={styles.optionTitle}>Driver</div>
            <div style={styles.optionDesc}>Register as a truck driver to accept and deliver loads</div>
            <div style={{ ...styles.optionBtn, background: '#F97316' }}>Register as Driver <i className="fa-solid fa-arrow-right"></i></div>
          </Link>
        </div>

        <p style={styles.footer}>Already have an account? <Link href="/login" style={styles.link}>Sign In</Link></p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: 'url("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600&q=80") center/cover no-repeat', padding: '40px 16px' },
  overlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.60)' },
  card: { position: 'relative', background: 'white', borderRadius: 20, padding: '40px', width: '100%', maxWidth: 560, boxShadow: '0 30px 60px rgba(0,0,0,0.3)' },
  logo: { textDecoration: 'none', fontSize: 22, fontWeight: 800, color: '#1E3A8A', display: 'block', marginBottom: 24 },
  title: { fontSize: 26, fontWeight: 800, color: '#1e293b', marginBottom: 6 },
  sub: { color: '#64748b', marginBottom: 32, fontSize: 15 },
  sub: { color: '#64748b', marginBottom: 32, fontSize: 15 },
  option: { textDecoration: 'none', border: '2px solid #e2e8f0', borderRadius: 16, padding: 24, textAlign: 'center', transition: 'all 0.2s', cursor: 'pointer', display: 'block' },
  optionIcon: { fontSize: 40, marginBottom: 12, color: '#1E3A8A' },
  optionTitle: { fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 },
  optionDesc: { fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 16 },
  optionBtn: { background: '#1E3A8A', color: 'white', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 },
  footer: { textAlign: 'center', color: '#64748b', fontSize: 14 },
  link: { color: '#F97316', fontWeight: 600, textDecoration: 'none' },
};
