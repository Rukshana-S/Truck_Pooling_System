"use client";
import { useNotifications } from '@/context/NotificationContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LiveNotificationBanner({ categoryMatch, linkMatch }) {
  const { notifications, markSingleAsRead } = useNotifications();
  const [activeNotification, setActiveNotification] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!notifications || notifications.length === 0) return;
    
    // Find the latest unread notification that matches our context
    const latest = notifications[0];
    
    if (!latest.read) {
      let isMatch = false;
      if (categoryMatch && latest.category === categoryMatch) isMatch = true;
      if (linkMatch && latest.link && latest.link.includes(linkMatch)) isMatch = true;
      
      if (isMatch) {
        // Only show if it's recent (e.g. less than 1 hour old) to avoid sticky old notifications
        const ageInMs = new Date() - new Date(latest.createdAt);
        if (ageInMs < 3600000) {
          setActiveNotification(latest);
          return;
        }
      }
    }
    
    // Clear if read or no match
    if (activeNotification && latest._id === activeNotification._id && latest.read) {
      setActiveNotification(null);
    }
  }, [notifications, categoryMatch, linkMatch, activeNotification]);

  if (!activeNotification) return null;

  return (
    <div style={{
      background: activeNotification.type === 'SUCCESS' ? '#dcfce7' : 
                  activeNotification.type === 'WARNING' ? '#fef3c7' : 
                  activeNotification.type === 'ERROR' ? '#fee2e2' : '#e0e7ff',
      border: `1px solid ${
                  activeNotification.type === 'SUCCESS' ? '#bbf7d0' : 
                  activeNotification.type === 'WARNING' ? '#fde68a' : 
                  activeNotification.type === 'ERROR' ? '#fecaca' : '#c7d2fe'
      }`,
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      animation: 'slideDown 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        <i className="fa-solid fa-bell" style={{ 
          color: activeNotification.type === 'SUCCESS' ? '#16a34a' : 
                 activeNotification.type === 'WARNING' ? '#d97706' : 
                 activeNotification.type === 'ERROR' ? '#dc2626' : '#4f46e5',
          fontSize: '18px',
          animation: 'ring 2s infinite'
        }}></i>
        <div>
          <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '14px', marginRight: '8px' }}>
            {activeNotification.title}:
          </span>
          <span style={{ color: '#334155', fontSize: '14px' }}>
            {activeNotification.message}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {activeNotification.link && (
          <button 
            onClick={() => {
              markSingleAsRead(activeNotification._id);
              router.push(activeNotification.link);
            }}
            style={{ 
              background: 'white', border: '1px solid #cbd5e1', padding: '4px 12px', 
              borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              color: '#0F172A'
            }}
          >
            View Details
          </button>
        )}
        <button 
          onClick={() => markSingleAsRead(activeNotification._id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          title="Dismiss"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>
      <style>{`
        @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes ring { 0% { transform: rotate(0); } 10% { transform: rotate(15deg); } 20% { transform: rotate(-15deg); } 30% { transform: rotate(10deg); } 40% { transform: rotate(-10deg); } 50% { transform: rotate(0); } 100% { transform: rotate(0); } }
      `}</style>
    </div>
  );
}
