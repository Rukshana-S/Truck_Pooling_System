"use client";
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from './NotificationBell';

const orgNavItems = [
  { path: '/dashboard', icon: 'fa-solid fa-chart-line', label: 'Dashboard' },
  { path: '/marketplace', icon: 'fa-solid fa-store', label: 'Marketplace' },
  { path: '/auction', icon: 'fa-solid fa-gavel', label: 'Auctions' },
  { path: '/shipments', icon: 'fa-solid fa-box', label: 'Shipments' },
  { path: '/payments', icon: 'fa-solid fa-file-invoice-dollar', label: 'Payments & Invoices' },
  { path: '/analytics', icon: 'fa-solid fa-chart-pie', label: 'Analytics' },
  { path: '/profile', icon: 'fa-solid fa-user-pen', label: 'My Profile' },
];

const driverNavItems = [
  { path: '/dashboard', icon: 'fa-solid fa-chart-line', label: 'Dashboard' },
  { path: '/driver-trips', icon: 'fa-solid fa-truck-moving', label: 'My Trips' },
  { path: '/driver-auction', icon: 'fa-solid fa-gavel', label: 'Bid Auctions' },
  { path: '/shipments', icon: 'fa-solid fa-box', label: 'Old Shipments' },
  { path: '/earnings', icon: 'fa-solid fa-wallet', label: 'Earnings' },
  { path: '/profile', icon: 'fa-solid fa-user-pen', label: 'My Profile' },
];

const adminNavItems = [
  { path: '/admin', icon: 'fa-solid fa-gauge', label: 'Admin Dashboard' },
  { path: '/profile', icon: 'fa-solid fa-user-pen', label: 'My Profile' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = user?.role === 'admin';
  const isDriver = user?.role === 'driver';
  const navItems = isAdmin ? adminNavItems : isDriver ? driverNavItems : orgNavItems;

  const handleLogout = () => { logout(); router.push('/'); };

  return (
    <aside style={{ ...styles.aside, width: collapsed ? 72 : 240 }}>
      {/* Background image + overlay contained here */}
      <div style={styles.bgWrap}>
        <div style={styles.bgImg} />
        <div style={styles.bgOverlay} />
      </div>

      {/* All content sits above via position relative + zIndex */}
      <div style={styles.content}>
        <div style={styles.header}>
          {!collapsed && (
            <Link href="/" style={styles.logo}>
              <i className="fa-solid fa-truck" style={{ color: '#F97316' }}></i>
              <span>Nool<span style={{ color: '#F97316' }}>-Vazhi</span></span>
            </Link>
          )}
          <button style={styles.collapseBtn} onClick={() => setCollapsed(!collapsed)}>
            <i className={`fa-solid ${collapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
          </button>
        </div>

        {!collapsed && user && (
          <div style={styles.userCard}>
            <div style={styles.avatar}>{(user.name || user.businessName || 'U')[0].toUpperCase()}</div>
            <div>
              <div style={styles.userName}>{user.name || user.businessName}</div>
              <div style={styles.userRole}>{user.role}</div>
            </div>
          </div>
        )}

        {user && <NotificationBell collapsed={collapsed} />}

        <nav style={styles.nav}>
          {navItems.map(({ path, icon, label }) => (
            <Link
              key={path}
              href={path}
              style={{ ...styles.navItem, ...(pathname === path ? styles.navItemActive : {}) }}
              title={collapsed ? label : ''}
            >
              <i className={icon} style={styles.navIcon}></i>
              {!collapsed && <span>{label}</span>}
            </Link>
          ))}
        </nav>

        <button onClick={handleLogout} style={styles.logoutBtn} title={collapsed ? 'Logout' : ''}>
          <i className="fa-solid fa-right-from-bracket"></i>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

const styles = {
  aside: {
    position: 'sticky',
    top: 0,
    height: '100vh',
    flexShrink: 0,
    transition: 'width 0.25s',
    overflow: 'hidden',
  },
  bgWrap: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
  },
  bgImg: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'url("https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=600&q=80")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  bgOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(5, 15, 40, 0.83)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '100vh',
  },
  header: {
    padding: '20px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255,255,255,0.15)',
    flexShrink: 0,
  },
  logo: {
    textDecoration: 'none',
    color: 'white',
    fontWeight: 800,
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  collapseBtn: {
    background: 'rgba(255,255,255,0.12)',
    border: 'none',
    color: 'white',
    width: 28,
    height: 28,
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userCard: {
    margin: '16px',
    padding: '12px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#F97316',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 700,
    fontSize: 16,
    flexShrink: 0,
  },
  userName: { color: 'white', fontWeight: 600, fontSize: 13 },
  userRole: { color: 'rgba(255,255,255,0.65)', fontSize: 11, textTransform: 'capitalize', marginTop: 2 },
  nav: { flex: 1, padding: '8px 0', overflowY: 'auto' },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 20px',
    color: 'rgba(255,255,255,0.85)',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s',
    borderLeft: '3px solid transparent',
    whiteSpace: 'nowrap',
  },
  navItemActive: {
    background: 'rgba(249,115,22,0.22)',
    color: 'white',
    fontWeight: 700,
    borderLeftColor: '#F97316',
  },
  navIcon: { fontSize: 15, flexShrink: 0, width: 18, textAlign: 'center' },
  logoutBtn: {
    margin: '16px',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: 'rgba(255,255,255,0.85)',
    borderRadius: 10,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 14,
    fontWeight: 500,
    flexShrink: 0,
  },
};
