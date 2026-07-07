import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.grid}>
          <div>
            <div style={styles.logo}>
              <i className="fa-solid fa-truck" style={{ color: '#F97316', marginRight: 8 }}></i>
              Nool<span style={{ color: '#F97316' }}>-Vazhi</span>
            </div>
            <p style={styles.tagline}>Smart truck pooling for modern India. Save costs, reduce emissions, deliver faster.</p>
          </div>
          <div>
            <div style={styles.heading}>Quick Links</div>
            {[['/', 'Home'], ['/pricing', 'Pricing'], ['/tracking', 'Track Shipment'], ['/trust', 'Trust & Safety']].map(([path, label]) => (
              <Link key={path} href={path} style={styles.link}>{label}</Link>
            ))}
          </div>
          <div>
            <div style={styles.heading}>Account</div>
            {[['/register/organization', 'Org Register'], ['/register/driver', 'Driver Register'], ['/login', 'Login'], ['/dashboard', 'Dashboard']].map(([path, label]) => (
              <Link key={path} href={path} style={styles.link}>{label}</Link>
            ))}
          </div>
          <div>
            <div style={styles.heading}>Contact</div>
            <p style={styles.contact}><i className="fa-solid fa-envelope" style={styles.contactIcon}></i> support@nool-vazhi.in</p>
            <p style={styles.contact}><i className="fa-solid fa-phone" style={styles.contactIcon}></i> 1800-123-4567</p>
            <p style={styles.contact}><i className="fa-solid fa-location-dot" style={styles.contactIcon}></i> Chennai, Tamil Nadu</p>
            <div style={styles.socials}>
              <a href="#" style={styles.social}><i className="fa-brands fa-facebook-f"></i></a>
              <a href="#" style={styles.social}><i className="fa-brands fa-twitter"></i></a>
              <a href="#" style={styles.social}><i className="fa-brands fa-linkedin-in"></i></a>
              <a href="#" style={styles.social}><i className="fa-brands fa-instagram"></i></a>
            </div>
          </div>
        </div>
        <div style={styles.bottom}>
          <span>© 2024 Nool-Vazhi. All rights reserved.</span>
          <span>Made with <i className="fa-solid fa-heart" style={{ color: '#F97316' }}></i> for Indian logistics</span>
        </div>
      </div>
    </footer>
  );
}

const styles = {
  footer: { background: '#0f172a', color: 'white', padding: '60px 0 24px' },
  container: { maxWidth: 1200, margin: '0 auto', padding: '0 24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 40 },
  logo: { fontSize: 22, fontWeight: 800, marginBottom: 12 },
  tagline: { color: '#94a3b8', fontSize: 14, lineHeight: 1.6 },
  heading: { fontWeight: 700, marginBottom: 16, color: '#e2e8f0', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.5px' },
  link: { display: 'block', color: '#94a3b8', textDecoration: 'none', fontSize: 14, marginBottom: 8, transition: 'color 0.2s' },
  contact: { color: '#94a3b8', fontSize: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 },
  contactIcon: { color: '#F97316', width: 14 },
  socials: { display: 'flex', gap: 10, marginTop: 16 },
  social: { width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: 13, transition: 'all 0.2s' },
  bottom: { borderTop: '1px solid #1e293b', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, color: '#64748b', fontSize: 13, alignItems: 'center' },
};
