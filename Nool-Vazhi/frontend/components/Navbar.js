"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); router.push('/'); };

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>

        {/* Logo — left */}
        <Link href="/" style={styles.logo}>
          <i className="fa-solid fa-truck" style={styles.logoIcon}></i>
          <span>Nool<span style={{ color: '#F97316' }}>-Vazhi</span></span>
        </Link>

        {/* Center nav links */}
        <div className="nav-links" style={styles.links}>
          <Link href="/" style={styles.link}>Home</Link>
          <Link href="/pricing" style={styles.link}>Pricing</Link>
          <Link href="/trust" style={styles.link}>Safety</Link>
        </div>

        {/* Right actions */}
        <div className="nav-links" style={styles.actions}>
          {user ? (
            <>
              <Link href="/dashboard" style={styles.link}>Dashboard</Link>
              <button onClick={handleLogout} style={styles.logoutBtn}>
                <i className="fa-solid fa-right-from-bracket"></i> Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" style={styles.link}>Login</Link>
              <Link href="/register/organization" style={styles.ctaBtn}>
                <i className="fa-solid fa-building"></i> Org Register
              </Link>
              <Link href="/register/driver" style={{ ...styles.ctaBtn, background: '#F97316' }}>
                <i className="fa-solid fa-truck-moving"></i> Join as Driver
              </Link>
            </>
          )}
        </div>

        {/* Hamburger — mobile only */}
        <button className="hamburger-btn" style={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
          <i className={menuOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'}></i>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={styles.mobileMenu}>
          {[['/', 'Home'], ['/pricing', 'Pricing'], ['/trust', 'Safety']].map(([path, label]) => (
            <Link key={path} href={path} style={styles.mobileLink} onClick={() => setMenuOpen(false)}>{label}</Link>
          ))}
          <div style={styles.mobileDivider} />
          {user ? (
            <>
              <Link href="/dashboard" style={styles.mobileLink} onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <button onClick={handleLogout} style={styles.mobileActionBtn}>
                <i className="fa-solid fa-right-from-bracket"></i> Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" style={styles.mobileLink} onClick={() => setMenuOpen(false)}>Login</Link>
              <Link href="/register/organization" style={styles.mobileCta} onClick={() => setMenuOpen(false)}>
                <i className="fa-solid fa-building"></i> Org Register
              </Link>
              <Link href="/register/driver" style={{ ...styles.mobileCta, background: '#F97316' }} onClick={() => setMenuOpen(false)}>
                <i className="fa-solid fa-truck-moving"></i> Join as Driver
              </Link>
            </>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .nav-links { display: none !important; }
          .hamburger-btn { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}

const styles = {
  nav: {
    background: 'rgba(255,255,255,0.97)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
  },
  container: {
    maxWidth: 1280,
    margin: '0 auto',
    padding: '0 24px',
    height: 68,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    textDecoration: 'none',
    fontSize: 20,
    fontWeight: 800,
    color: '#1E3A8A',
    flexShrink: 0,
  },
  logoIcon: { fontSize: 20, color: '#F97316' },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'center',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  link: {
    textDecoration: 'none',
    color: '#475569',
    fontWeight: 500,
    fontSize: 14,
    padding: '7px 11px',
    borderRadius: 8,
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  ctaBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    textDecoration: 'none',
    background: '#1E3A8A',
    color: 'white',
    fontWeight: 600,
    fontSize: 13,
    padding: '8px 14px',
    borderRadius: 8,
    whiteSpace: 'nowrap',
    transition: 'opacity 0.2s',
  },
  logoutBtn: {
    background: 'none',
    border: '1.5px solid #e2e8f0',
    color: '#64748b',
    padding: '7px 14px',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap',
  },
  hamburger: {
    display: 'none',
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    color: '#1E3A8A',
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mobileMenu: {
    display: 'flex',
    flexDirection: 'column',
    padding: '12px 20px 20px',
    borderTop: '1px solid #e2e8f0',
    gap: 2,
    background: 'white',
  },
  mobileLink: {
    textDecoration: 'none',
    color: '#475569',
    fontWeight: 500,
    fontSize: 15,
    padding: '11px 4px',
    borderBottom: '1px solid #f1f5f9',
    display: 'block',
  },
  mobileDivider: { height: 1, background: '#e2e8f0', margin: '6px 0' },
  mobileActionBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontWeight: 500,
    fontSize: 15,
    padding: '11px 4px',
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderBottom: '1px solid #f1f5f9',
    width: '100%',
  },
  mobileCta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    textDecoration: 'none',
    background: '#1E3A8A',
    color: 'white',
    fontWeight: 600,
    fontSize: 14,
    padding: '10px 16px',
    borderRadius: 8,
    marginTop: 6,
    justifyContent: 'center',
  },
};
