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
        setDropdownPos({
          top: rect.bottom + 8,
          left: collapsed ? rect.right + 10 : rect.left,
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
      setDropdownPos({
        top: rect.bottom + 8,
        left: collapsed ? rect.right + 10 : rect.left,
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
        width: 360, 
        background: 'white', 
        borderRadius: 12,
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)', 
        zIndex: 9999, 
        display: 'flex', 
        flexDirection: 'column', 
        maxHeight: 480,
        animation: 'slideDownFade 0.2s ease-out'
      }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderTopLeftRadius: 12, borderTopRightRadius: 12, flexShrink: 0 }}>
        <h4 style={{ margin: 0, fontSize: 15, color: '#1e293b' }}>Notifications</h4>
        {unreadCount > 0 && <button onClick={markAsRead} style={{ background: 'none', border: 'none', color: '#F97316', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Mark all read</button>}
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {displayNotifications.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>
            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>No notifications yet.</div>
            Notifications will appear here when shipments, auctions, bids, deliveries, payments, or return-load events occur.
          </div>
        ) : (
          displayNotifications.map(n => (
            <div key={n._id} onClick={() => handleNotificationClick(n)} style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', background: n.read ? 'white' : '#eff6ff', display: 'flex', gap: 12, cursor: 'pointer', transition: 'background 0.2s' }} className="hover:bg-gray-50">
              <div style={{ 
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: n.type === 'SUCCESS' ? '#dcfce7' : n.type === 'WARNING' ? '#fef3c7' : n.type === 'ERROR' ? '#fee2e2' : '#e0e7ff',
                color: n.type === 'SUCCESS' ? '#16a34a' : n.type === 'WARNING' ? '#d97706' : n.type === 'ERROR' ? '#dc2626' : '#4f46e5',
              }}>
                <i className={`fa-solid ${n.type === 'SUCCESS' ? 'fa-check' : n.type === 'WARNING' ? 'fa-triangle-exclamation' : n.type === 'ERROR' ? 'fa-xmark' : 'fa-info'}`}></i>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>{n.title}</div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>{n.message}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(n.createdAt).toLocaleString()}</div>
                  {n.priority === 'High' && <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, background: '#fee2e2', padding: '2px 6px', borderRadius: 4 }}>🔴 High</div>}
                  {n.priority === 'Medium' && <div style={{ fontSize: 10, color: '#f97316', fontWeight: 700, background: '#ffedd5', padding: '2px 6px', borderRadius: 4 }}>🟠 Medium</div>}
                  {n.priority === 'Low' && <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, background: '#dcfce7', padding: '2px 6px', borderRadius: 4 }}>🟢 Low</div>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div style={{ flexShrink: 0 }}>
        {notifications.length > 5 ? (
          <div 
            onClick={() => { setOpen(false); router.push('/notifications'); }}
            style={{ padding: '14px', textAlign: 'center', background: '#f8fafc', color: '#0F172A', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderTop: '1px solid #e2e8f0', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
            View All Notifications
          </div>
        ) : (notifications.length > 0 && (
          <div 
            onClick={() => { setOpen(false); router.push('/notifications'); }}
            style={{ padding: '14px', textAlign: 'center', background: '#f8fafc', color: '#0F172A', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderTop: '1px solid #e2e8f0', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
            Go to Dashboard
          </div>
        ))}
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
        @media (max-width: 768px) {
          /* On mobile, adjust the portal to be centered or full width if needed */
        }
      `}</style>
    </>
  );
}
