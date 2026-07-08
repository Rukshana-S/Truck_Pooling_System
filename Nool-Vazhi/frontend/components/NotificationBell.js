"use client";
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNotifications } from '@/context/NotificationContext';
import { useRouter } from 'next/navigation';

export default function NotificationBell({ collapsed }) {
  const { notifications, unreadCount, markAsRead, markSingleAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const handleClickOutside = (e) => {
      if (containerRef.current && containerRef.current.contains(e.target)) return;
      if (dropdownRef.current && dropdownRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    const updatePosition = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const isMobile = window.innerWidth <= 768;
        setDropdownPos({
          top: rect.bottom + 8,
          left: isMobile ? 16 : (collapsed ? rect.right + 10 : rect.left),
          width: isMobile ? window.innerWidth - 32 : 360,
        });
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, collapsed]);

  const toggleOpen = () => {
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth <= 768;
      const availableHeight = window.innerHeight - rect.bottom - 20;
      setDropdownPos({
        top: rect.bottom + 10,
        left: isMobile ? 16 : (collapsed ? rect.right + 10 : rect.left),
        width: isMobile ? window.innerWidth - 32 : 360,
        maxHeight: isMobile ? window.innerHeight - rect.bottom - 20 : Math.min(480, window.innerHeight - rect.bottom - 20)
      });
    }
    setOpen(!open);
  };

  const handleNotificationClick = (n) => {
    if (!n.read) markSingleAsRead(n._id);
    setOpen(false);
    if (n.link) {
      router.push(n.link);
    }
  };

  // Only show top 5 in dropdown
  const displayNotifications = notifications.slice(0, 5);

  const dropdownContent = (
    <div 
      ref={dropdownRef}
      style={{
        position: 'fixed', 
        top: dropdownPos.top, 
        left: dropdownPos.left,
        width: dropdownPos.width || 360, 
        background: 'white', 
        borderRadius: 12,
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)', 
        zIndex: 9999, 
        display: 'flex', 
        flexDirection: 'column', 
        maxHeight: dropdownPos.maxHeight || 480,
        animation: 'slideDownFade 0.2s ease-out'
      }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderTopLeftRadius: 12, borderTopRightRadius: 12, flexShrink: 0 }}>
        <h4 style={{ margin: 0, fontSize: 16, color: '#1e293b', fontWeight: 800 }}>Notifications</h4>
        {unreadCount > 0 && (
          <button 
            onClick={(e) => { e.stopPropagation(); markAsRead(); }} 
            style={{ background: '#F97316', border: 'none', color: 'white', fontSize: 11, padding: '4px 10px', borderRadius: 20, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
            className="hover-opacity"
          >
            <i className="fa-solid fa-check-double"></i> Mark all read
          </button>
        )}
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {displayNotifications.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>
            <i className="fa-regular fa-bell-slash" style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 16 }}></i>
            <div style={{ fontWeight: 800, color: '#1e293b', marginBottom: 6, fontSize: 16 }}>You&apos;re all caught up!</div>
            New updates about your shipments and payments will appear here.
          </div>
        ) : (
          displayNotifications.map(n => (
            <div key={n._id} onClick={() => handleNotificationClick(n)} style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', background: n.read ? 'white' : '#fff7ed', display: 'flex', gap: 14, cursor: 'pointer', transition: 'all 0.2s' }} className="notif-item">
              <div style={{ 
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14,
                background: n.type === 'SUCCESS' ? '#dcfce7' : n.type === 'WARNING' ? '#fef3c7' : n.type === 'ERROR' ? '#fee2e2' : '#e0e7ff',
                color: n.type === 'SUCCESS' ? '#16a34a' : n.type === 'WARNING' ? '#d97706' : n.type === 'ERROR' ? '#dc2626' : '#4f46e5',
                boxShadow: n.read ? 'none' : '0 0 0 4px white, 0 0 0 6px #fed7aa'
              }}>
                <i className={`fa-solid ${n.type === 'SUCCESS' ? 'fa-check' : n.type === 'WARNING' ? 'fa-triangle-exclamation' : n.type === 'ERROR' ? 'fa-xmark' : 'fa-info'}`}></i>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 14, fontWeight: n.read ? 600 : 800, color: '#0F172A', marginBottom: 4 }}>{n.title}</div>
                  {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F97316' }}></div>}
                </div>
                <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 8 }}>{n.message}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                    <i className="fa-regular fa-clock" style={{ marginRight: 4 }}></i>
                    {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                  {n.priority === 'High' && <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 800, background: '#fee2e2', padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase' }}>High</div>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div style={{ flexShrink: 0 }}>
        <div 
          onClick={() => { setOpen(false); router.push('/notifications'); }}
          style={{ padding: '14px', textAlign: 'center', background: '#f8fafc', color: '#0F172A', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderTop: '1px solid #e2e8f0', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
          View All Notifications
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div ref={containerRef} style={{ margin: '8px 16px', display: 'flex', justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <button 
          onClick={toggleOpen}
          style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.85)', borderRadius: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: collapsed ? '12px' : '10px 14px', width: collapsed ? 44 : '100%',
            gap: 10, position: 'relative'
          }}
          title="Notifications"
        >
          <i className="fa-solid fa-bell"></i>
          {!collapsed && <span style={{ fontSize: 14, fontWeight: 500 }}>Notifications</span>}
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: collapsed ? 4 : 8, right: collapsed ? 4 : 12,
              background: '#ef4444', color: 'white', fontSize: 10, fontWeight: 800,
              padding: '2px 6px', borderRadius: 10, border: '2px solid #050f28'
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {mounted && open && createPortal(dropdownContent, document.body)}

      <style>{`
        @keyframes slideDownFade {
          from { opacity: 0; transform: translateY(-10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .notif-item:hover {
          background: #f8fafc !important;
        }
        .hover-opacity:hover {
          opacity: 0.9;
          transform: scale(0.98);
        }
        @media (max-width: 768px) {
          /* On mobile, adjust the portal to be centered or full width if needed */
        }
      `}</style>
    </>
  );
}
