"use client";
import { useEffect, useState, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import { useNotifications } from '@/context/NotificationContext';
import { useRouter } from 'next/navigation';
import ConfirmationModal from '@/components/ConfirmationModal';
import { toast } from 'react-hot-toast';

// Simple animated counter
const AnimatedCounter = ({ value }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTimestamp = null;
    const duration = 500;
    const end = parseInt(value) || 0;
    if (end === 0) { setCount(0); return; }
    
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }, [value]);
  return <>{count}</>;
};

export default function NotificationsPage() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markSingleAsRead, 
    deleteNotification, 
    deleteAllNotifications, 
    fetchNotifications,
    page,
    setPage,
    totalPages,
    filter,
    setFilter
  } = useNotifications();
  
  const router = useRouter();
  const [deleteModal, setDeleteModal] = useState(false);
  const [singleDeleteId, setSingleDeleteId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchNotifications(page, filter);
  }, [page, filter]);

  // Derived metrics for summary cards
  const readCount = notifications.filter(n => n.read).length;
  const todayCount = notifications.filter(n => new Date(n.createdAt).toDateString() === new Date().toDateString()).length;
  const totalCount = notifications.length; // Local page total
  
  // Search filtering
  const filteredNotifications = useMemo(() => {
    if (!search) return notifications;
    const s = search.toLowerCase();
    return notifications.filter(n => 
      (n.title && n.title.toLowerCase().includes(s)) ||
      (n.message && n.message.toLowerCase().includes(s)) ||
      (n.relatedEntityId && n.relatedEntityId.toLowerCase().includes(s)) ||
      (n.category && n.category.toLowerCase().includes(s))
    );
  }, [notifications, search]);

  // Grouping
  const grouped = useMemo(() => {
    const groups = { Today: [], Yesterday: [], 'This Week': [], Older: [] };
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const week = today - 86400000 * 7;
    
    filteredNotifications.forEach(n => {
      const d = new Date(n.createdAt).getTime();
      if (d >= today) groups.Today.push(n);
      else if (d >= yesterday) groups.Yesterday.push(n);
      else if (d >= week) groups['This Week'].push(n);
      else groups.Older.push(n);
    });
    return groups;
  }, [filteredNotifications]);

  const handleNotificationClick = (n) => {
    if (!n.read) markSingleAsRead(n._id);
    if (n.link) router.push(n.link);
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    await markAsRead();
    toast.success('All notifications marked as read');
  };

  const handleDeleteAll = async () => {
    await deleteAllNotifications();
    toast.success('All notifications deleted');
    setDeleteModal(false);
  };

  const confirmSingleDelete = async () => {
    if (singleDeleteId) {
      await deleteNotification(singleDeleteId);
      toast.success('Notification deleted');
      setSingleDeleteId(null);
    }
  };

  const categories = ['all', 'unread', 'Shipments', 'Auctions', 'Marketplace', 'Return Loads', 'Payments', 'System'];

  const getIcon = (category, type) => {
    if (type === 'WARNING') return 'fa-triangle-exclamation';
    switch (category?.toLowerCase()) {
      case 'shipments': return 'fa-truck-fast';
      case 'auctions': return 'fa-gavel';
      case 'marketplace': return 'fa-store';
      case 'payments': return 'fa-money-bill';
      case 'return loads': return 'fa-rotate';
      default: return 'fa-bell';
    }
  };

  const getActionText = (category) => {
    switch (category?.toLowerCase()) {
      case 'shipments': return 'View Shipment';
      case 'auctions': return 'View Auction';
      case 'marketplace': return 'View Marketplace';
      case 'payments': return 'View Payment';
      case 'return loads': return 'View Return Load';
      default: return 'View Details';
    }
  };

  const getPriorityColor = (prio) => {
    if (prio === 'High') return { bg: '#fee2e2', color: '#ef4444' };
    if (prio === 'Medium') return { bg: '#ffedd5', color: '#f97316' };
    if (prio === 'Low') return { bg: '#dcfce7', color: '#22c55e' };
    return { bg: '#dbeafe', color: '#3b82f6' }; // System
  };

  return (
    <div style={styles.layout}>
      <Sidebar />
      <main className="p-mobile-16" style={styles.main}>
        {/* HEADER SECTION */}
        <div className="header-area" style={styles.headerArea}>
          <div style={{ flex: 1 }}>
            <h1 style={styles.title}><i className="fa-regular fa-bell" style={{ color: '#F97316', marginRight: 12 }}></i>Notifications</h1>
            <p style={styles.sub}>Stay updated with shipments, auctions, bids, deliveries, marketplace activities and payments.</p>
          </div>
          
          {/* QUICK ACTIONS */}
          <div style={styles.quickActions}>
            <div style={styles.searchBox}>
              <i className="fa-solid fa-magnifying-glass" style={{ color: '#94a3b8' }}></i>
              <input 
                type="text" 
                placeholder="Search ID, text..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                style={styles.searchInput} 
              />
            </div>
            <button className="icon-btn" style={styles.iconBtn} onClick={() => fetchNotifications(page, filter)} title="Refresh">
              <i className="fa-solid fa-rotate-right"></i>
            </button>
            <button className="icon-btn" style={styles.iconBtn} onClick={handleMarkAllRead} disabled={unreadCount === 0} title="Mark All Read">
              <i className="fa-solid fa-check-double" style={{ color: unreadCount > 0 ? '#10b981' : '#cbd5e1' }}></i>
            </button>
            <button className="icon-btn" style={styles.iconBtn} onClick={() => setDeleteModal(true)} disabled={notifications.length === 0} title="Delete All">
              <i className="fa-solid fa-trash" style={{ color: notifications.length > 0 ? '#ef4444' : '#cbd5e1' }}></i>
            </button>
            <button className="icon-btn" style={styles.iconBtn} title="Notification Settings" onClick={() => toast('Settings coming soon!')}>
              <i className="fa-solid fa-gear"></i>
            </button>
          </div>
        </div>

        {/* TOP SUMMARY */}
        <div className="grid-4" style={{ marginBottom: 40 }}>
          <div style={styles.summaryCard}>
            <div style={{...styles.iconBox, background: '#fee2e2', color: '#ef4444'}}><i className="fa-solid fa-envelope"></i></div>
            <div>
              <div style={styles.sumLabel}>Unread</div>
              <div style={styles.sumVal}><AnimatedCounter value={unreadCount} /></div>
            </div>
          </div>
          <div style={styles.summaryCard}>
            <div style={{...styles.iconBox, background: '#dcfce7', color: '#10b981'}}><i className="fa-solid fa-envelope-open-text"></i></div>
            <div>
              <div style={styles.sumLabel}>Read</div>
              <div style={styles.sumVal}><AnimatedCounter value={readCount} /></div>
            </div>
          </div>
          <div style={styles.summaryCard}>
            <div style={{...styles.iconBox, background: '#ffedd5', color: '#f97316'}}><i className="fa-solid fa-calendar-day"></i></div>
            <div>
              <div style={styles.sumLabel}>Today</div>
              <div style={styles.sumVal}><AnimatedCounter value={todayCount} /></div>
            </div>
          </div>
          <div style={styles.summaryCard}>
            <div style={{...styles.iconBox, background: '#e0e7ff', color: '#4f46e5'}}><i className="fa-solid fa-layer-group"></i></div>
            <div>
              <div style={styles.sumLabel}>Total</div>
              <div style={styles.sumVal}><AnimatedCounter value={totalCount} /></div>
            </div>
          </div>
        </div>

        {/* FILTER BAR */}
        <div style={styles.filterRow}>
          {categories.map(f => {
            const count = f === 'unread' ? unreadCount : f === 'all' ? notifications.length : notifications.filter(n => n.category?.toLowerCase() === f.toLowerCase()).length;
            return (
              <button 
                key={f} 
                style={{ ...styles.pill, ...(filter === f ? styles.pillActive : {}) }} 
                onClick={() => { setFilter(f); setPage(1); }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)} <span style={{ opacity: filter === f ? 1 : 0.6, marginLeft: 6, fontWeight: 700 }}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* LIST */}
        {filteredNotifications.length === 0 ? (
          <div style={styles.empty}>
            <i className="fa-regular fa-bell" style={{ fontSize: 80, color: '#e2e8f0', marginBottom: 20 }}></i>
            <h2 style={{ fontWeight: 800, color: '#1e293b', marginBottom: 8, fontSize: 28 }}>You&apos;re all caught up!</h2>
            <p style={{ color: '#64748b', fontSize: 16, marginBottom: 28 }}>New shipment, auction and delivery updates will appear here.</p>
            <button className="btn-primary" onClick={() => router.push('/dashboard')} style={{ padding: '14px 28px', fontSize: 15, borderRadius: 30, boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }}>
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div style={{ paddingBottom: 60 }}>
            {['Today', 'Yesterday', 'This Week', 'Older'].map(groupName => {
              const items = grouped[groupName];
              if (!items.length) return null;
              return (
                <div key={groupName} style={{ marginBottom: 40 }}>
                  <h3 style={styles.groupHeading}>{groupName}</h3>
                  <div style={styles.list}>
                    {items.map((n) => {
                      const priorityStyle = getPriorityColor(n.priority || 'System');
                      return (
                        <div 
                          key={n._id} 
                          className="premium-card" 
                          style={{ 
                            ...styles.notificationCard, 
                            background: n.read ? '#f8fafc' : '#ffffff',
                            borderLeftWidth: n.read ? '1px' : '4px',
                            borderLeftColor: n.read ? '#e2e8f0' : '#F97316',
                            borderLeftStyle: 'solid'
                          }} 
                          onClick={() => handleNotificationClick(n)}
                        >
                          {/* LEFT */}
                          <div style={{ ...styles.avatar, background: n.read ? '#f1f5f9' : '#fff7ed', color: n.read ? '#94a3b8' : '#F97316' }}>
                            <i className={`fa-solid ${getIcon(n.category, n.type)}`}></i>
                          </div>
                          
                          {/* CENTER */}
                          <div style={{ flex: 1, paddingRight: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                              <h4 style={{ margin: 0, fontSize: 17, color: '#0F172A', fontWeight: n.read ? 600 : 800 }}>{n.title}</h4>
                              {!n.read && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F97316', boxShadow: '0 0 10px #F97316', animation: 'pulse 2s infinite' }}></div>}
                            </div>
                            <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.6, marginBottom: 10 }}>
                              {n.message}
                            </p>
                            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                              {n.relatedEntityId && (
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', background: '#e2e8f0', padding: '4px 10px', borderRadius: 6, letterSpacing: '0.5px' }}>
                                  ID: {n.relatedEntityId}
                                </span>
                              )}
                              <span style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                <i className="fa-regular fa-clock"></i>
                                {new Date(n.createdAt).toLocaleString(undefined, {
                                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>

                          {/* RIGHT */}
                          <div className="right-actions" style={styles.rightActions}>
                            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', background: priorityStyle.bg, color: priorityStyle.color, padding: '5px 12px', borderRadius: 20, letterSpacing: '0.5px' }}>
                              {n.priority || 'System'}
                            </div>
                            
                            {n.link && (
                              <button 
                                className="action-btn"
                                onClick={(e) => { e.stopPropagation(); handleNotificationClick(n); }}
                                style={styles.actionBtn}
                              >
                                {getActionText(n.category)}
                              </button>
                            )}

                            <button 
                              className="delete-btn"
                              onClick={(e) => { e.stopPropagation(); setSingleDeleteId(n._id); }}
                              style={styles.deleteOutlineBtn}
                              title="Delete"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button 
              className="page-btn"
              style={{ ...styles.pageBtn, opacity: page === 1 ? 0.5 : 1 }} 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <i className="fa-solid fa-arrow-left"></i> Previous
            </button>
            <span style={{ fontSize: 14, color: '#475569', fontWeight: 600 }}>Page {page} of {totalPages}</span>
            <button 
              className="page-btn"
              style={{ ...styles.pageBtn, opacity: page === totalPages ? 0.5 : 1 }} 
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        )}
      </main>

      {deleteModal && (
        <ConfirmationModal
          title="Delete All Notifications"
          message="Are you sure you want to delete all notifications? This action cannot be undone."
          confirmText="Delete All"
          confirmStyle="danger"
          onConfirm={handleDeleteAll}
          onCancel={() => setDeleteModal(false)}
        />
      )}

      {singleDeleteId && (
        <ConfirmationModal
          title="Delete Notification"
          message="Are you sure you want to delete this notification?"
          confirmText="Delete"
          confirmStyle="danger"
          onConfirm={confirmSingleDelete}
          onCancel={() => setSingleDeleteId(null)}
        />
      )}

      <style>{`
        @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(249,115,22,0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(249,115,22,0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(249,115,22,0); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        
        .premium-card {
          animation: fadeUp 0.4s ease-out backwards;
        }
        .premium-card:nth-child(1) { animation-delay: 0.05s; }
        .premium-card:nth-child(2) { animation-delay: 0.1s; }
        .premium-card:nth-child(3) { animation-delay: 0.15s; }
        .premium-card:nth-child(4) { animation-delay: 0.2s; }
        .premium-card:nth-child(5) { animation-delay: 0.25s; }
        
        .premium-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 32px -8px rgba(0,0,0,0.1);
          border-color: #cbd5e1;
        }
        
        .premium-card:hover .action-btn {
          background: #F97316 !important;
          color: white !important;
          border-color: #F97316 !important;
        }
        
        .premium-card:hover .delete-btn {
          color: #ef4444 !important;
          border-color: #fca5a5 !important;
          background: #fef2f2 !important;
        }
        
        .premium-card:hover .fa-solid {
          transform: scale(1.1);
          transition: transform 0.2s;
        }

        .icon-btn:hover {
          background: #f1f5f9;
        }
        .page-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
        
        @media (max-width: 1024px) {
          .premium-card { flex-direction: column !important; align-items: flex-start !important; gap: 20px; }
          .right-actions { width: 100%; flex-direction: row !important; justify-content: flex-start; align-items: center !important; }
          .summary-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 640px) {
          .summary-grid { grid-template-columns: 1fr !important; }
          .header-area { flex-direction: column !important; align-items: stretch !important; gap: 20px; }
          .quick-actions { flex-direction: column; width: 100%; align-items: stretch !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh', background: '#f8fafc', width: '100vw', overflowX: 'hidden' },
  main: { flex: 1, padding: '40px', overflowY: 'auto' },
  headerArea: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 24 },
  title: { fontSize: 32, fontWeight: 900, color: '#0F172A', margin: '0 0 8px 0', letterSpacing: '-0.5px' },
  sub: { margin: 0, color: '#64748b', fontSize: 16, maxWidth: 600, lineHeight: 1.5 },
  
  quickActions: { display: 'flex', gap: 8, alignItems: 'center', background: 'white', padding: '8px 12px', borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', flexWrap: 'wrap' },
  searchBox: { display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderRight: '1px solid #e2e8f0' },
  searchInput: { border: 'none', outline: 'none', background: 'transparent', fontSize: 14, width: 160, padding: '6px 0' },
  iconBtn: { background: 'transparent', border: 'none', padding: '10px', cursor: 'pointer', fontSize: 16, color: '#64748b', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' },
  
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 },
  summaryCard: { background: 'white', borderRadius: 20, padding: 24, display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
  iconBox: { width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 },
  sumLabel: { fontSize: 14, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 },
  sumVal: { fontSize: 32, fontWeight: 900, color: '#0F172A', lineHeight: 1 },

  filterRow: { display: 'flex', gap: 12, marginBottom: 40, paddingBottom: 16, overflowX: 'auto', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10, paddingTop: 10 },
  pill: {
    background: 'white',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#e2e8f0',
    padding: '12px 24px',
    borderRadius: 30,
    fontSize: 14,
    fontWeight: 700,
    color: '#64748b',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
  },
  pillActive: {
    background: '#F97316',
    color: 'white',
    borderColor: '#F97316',
    boxShadow: '0 8px 16px rgba(249,115,22,0.25)'
  },
  
  groupHeading: { fontSize: 15, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 20, borderBottom: '2px solid #e2e8f0', paddingBottom: 12 },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20
  },
  
  notificationCard: {
    padding: '24px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#e2e8f0',
    borderRadius: 20,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  avatar: { width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 28, marginRight: 24 },
  
  rightActions: { display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-end' },
  actionBtn: { background: 'transparent', border: '2px solid #cbd5e1', color: '#475569', padding: '8px 20px', borderRadius: 30, fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' },
  deleteOutlineBtn: { background: 'transparent', border: '2px solid #e2e8f0', color: '#94a3b8', padding: '10px 14px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s', fontSize: 14 },

  empty: { textAlign: 'center', padding: '120px 20px', background: 'white', borderRadius: 32, border: '2px dashed #cbd5e1', boxShadow: '0 10px 40px rgba(0,0,0,0.02)' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, marginTop: 48 },
  pageBtn: { background: 'white', border: '1px solid #e2e8f0', padding: '12px 24px', borderRadius: 30, cursor: 'pointer', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 6px rgba(0,0,0,0.05)', transition: 'all 0.2s' },
};
