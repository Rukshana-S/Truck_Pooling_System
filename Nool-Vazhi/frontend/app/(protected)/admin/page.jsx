"use client";
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { adminAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [msg, setMsg] = useState('');
  
  const [confirmModal, setConfirmationModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  useEffect(() => {
    if (user?.role !== 'admin') return;
    fetchData();
  }, [user, tab]);

  const fetchData = async () => {
    setLoading(true);
    setMsg('');
    try {
      if (tab === 'users') {
        const { data } = await adminAPI.getUsers();
        setUsers(data);
      } else if (tab === 'shipments') {
        const { data } = await adminAPI.getShipments();
        setShipments(data);
      } else if (tab === 'auctions') {
        const { data } = await adminAPI.getAuctions();
        setAuctions(data);
      }
    } catch (err) {
      setMsg('error:' + (err.response?.data?.message || 'Failed to fetch data'));
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (title, message, actionFn) => {
    setConfirmationModal({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        setConfirmationModal({ isOpen: false });
        try {
          await actionFn();
          setMsg(`success:${title} successful`);
          fetchData();
        } catch (err) {
          setMsg('error:' + (err.response?.data?.message || `${title} failed`));
        }
      }
    });
  };

  if (user?.role !== 'admin') {
    return (
      <div style={styles.layout}>
        <Sidebar />
        <main style={styles.main}>
          <div style={styles.empty}>Access Denied. Admin only.</div>
        </main>
      </div>
    );
  }

  return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              <i className="fa-solid fa-gauge" style={{ color: '#F97316', marginRight: 10 }}></i>
              Admin Dashboard
            </h1>
            <p style={styles.sub}>Manage users, shipments, and platform entities</p>
          </div>
        </div>

        {msg && (
          <div style={msg.startsWith('success') ? styles.success : styles.error}>
            <i className={`fa-solid ${msg.startsWith('success') ? 'fa-circle-check' : 'fa-circle-xmark'}`} style={{ marginRight: 8 }}></i>
            {msg.replace(/^(success|error):/, '')}
          </div>
        )}

        <div style={styles.tabs}>
          <button style={{ ...styles.tab, ...(tab === 'users' ? styles.tabActive : {}) }} onClick={() => setTab('users')}>
            <i className="fa-solid fa-users" style={{ marginRight: 6 }}></i> Users
          </button>
          <button style={{ ...styles.tab, ...(tab === 'shipments' ? styles.tabActive : {}) }} onClick={() => setTab('shipments')}>
            <i className="fa-solid fa-box" style={{ marginRight: 6 }}></i> Shipments
          </button>
          <button style={{ ...styles.tab, ...(tab === 'auctions' ? styles.tabActive : {}) }} onClick={() => setTab('auctions')}>
            <i className="fa-solid fa-gavel" style={{ marginRight: 6 }}></i> Auctions
          </button>
        </div>

        {loading ? (
          <div style={styles.empty}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 28, color: '#cbd5e1' }}></i>
          </div>
        ) : tab === 'users' ? (
          <div className="card" style={{ padding: 20 }}>
            <h3 style={styles.cardTitle}>User Management</h3>
            {users.length === 0 ? <p style={styles.emptyText}>No users found.</p> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Name/Business</th>
                      <th style={styles.th}>Role</th>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>KYC</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id} style={styles.tr}>
                        <td style={styles.td}>{u.businessName || u.name}</td>
                        <td style={styles.td}>{u.role}</td>
                        <td style={styles.td}>{u.email}</td>
                        <td style={styles.td}>{u.isSuspended ? <span style={styles.badgeError}>Suspended</span> : <span style={styles.badgeSuccess}>Active</span>}</td>
                        <td style={styles.td}>{u.isKycVerified ? <span style={styles.badgeSuccess}>Verified</span> : <span style={styles.badgeWarning}>Pending</span>}</td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button style={styles.actionBtn} onClick={() => handleAction('Suspend/Unsuspend User', `Are you sure you want to toggle suspension for ${u.email}?`, () => adminAPI.suspendUser(u._id, { isSuspended: !u.isSuspended }))}>
                              {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                            </button>
                            {!u.isKycVerified && (
                              <button style={styles.actionBtnSuccess} onClick={() => handleAction('Approve KYC', `Approve KYC for ${u.email}?`, () => adminAPI.approveKyc(u._id, { isKycVerified: true }))}>
                                Approve KYC
                              </button>
                            )}
                            <button style={styles.actionBtnDanger} onClick={() => handleAction('Delete User', `Are you sure you want to completely delete ${u.email}? This cannot be undone.`, () => adminAPI.deleteUser(u._id))}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : tab === 'shipments' ? (
          <div className="card" style={{ padding: 20 }}>
            <h3 style={styles.cardTitle}>Shipments Overview</h3>
            {shipments.length === 0 ? <p style={styles.emptyText}>No shipments found.</p> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>ID</th>
                      <th style={styles.th}>Shipper</th>
                      <th style={styles.th}>Route</th>
                      <th style={styles.th}>Weight</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipments.map(s => (
                      <tr key={s._id} style={styles.tr}>
                        <td style={styles.td}>{s.shipmentId}</td>
                        <td style={styles.td}>{s.shipper?.businessName || s.shipper?.name}</td>
                        <td style={styles.td}>{s.fromLocation} &rarr; {s.toLocation}</td>
                        <td style={styles.td}>{s.weight} kg</td>
                        <td style={styles.td}>{s.status}</td>
                        <td style={styles.td}>
                          <button style={styles.actionBtnDanger} onClick={() => handleAction('Delete Shipment', `Delete shipment ${s.shipmentId}?`, () => adminAPI.deleteShipment(s._id))}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : tab === 'auctions' ? (
          <div className="card" style={{ padding: 20 }}>
            <h3 style={styles.cardTitle}>Auctions Overview</h3>
            {auctions.length === 0 ? <p style={styles.emptyText}>No auctions found.</p> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>ID</th>
                      <th style={styles.th}>Shipper</th>
                      <th style={styles.th}>Route</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auctions.map(a => (
                      <tr key={a._id} style={styles.tr}>
                        <td style={styles.td}>{a.auctionId}</td>
                        <td style={styles.td}>{a.shipper?.businessName || a.shipper?.name}</td>
                        <td style={styles.td}>{a.fromLocation} &rarr; {a.toLocation}</td>
                        <td style={styles.td}>{a.status}</td>
                        <td style={styles.td}>
                          {a.status !== 'CANCELLED' && a.status !== 'CLOSED' && (
                            <button style={styles.actionBtnDanger} onClick={() => handleAction('Cancel Auction', `Force cancel auction ${a.auctionId}?`, () => adminAPI.cancelAuction(a._id))}>
                              Force Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </main>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false })}
      />
    </div>
  );
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh' },
  main: { flex: 1, padding: '32px', background: '#f8fafc', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
  title: { fontSize: 26, fontWeight: 800, color: '#1e293b' },
  sub: { color: '#64748b', marginTop: 4 },
  tabs: { display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' },
  tab: { padding: '9px 20px', border: 'none', background: 'transparent', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 },
  tabActive: { background: 'white', color: '#1E3A8A', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  emptyText: { color: '#64748b', fontSize: 14, fontStyle: 'italic' },
  cardTitle: { fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 20 },
  success: { background: '#d1fae5', color: '#065f46', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 14, display: 'flex', alignItems: 'center' },
  error: { background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 14, display: 'flex', alignItems: 'center' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 },
  th: { padding: '12px 16px', background: '#f8fafc', color: '#475569', fontWeight: 600, borderBottom: '2px solid #e2e8f0' },
  tr: { borderBottom: '1px solid #e2e8f0' },
  td: { padding: '14px 16px', color: '#1e293b' },
  badgeSuccess: { background: '#d1fae5', color: '#065f46', padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 },
  badgeWarning: { background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 },
  badgeError: { background: '#fee2e2', color: '#991b1b', padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 },
  actionBtn: { padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 6, background: 'white', color: '#475569', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  actionBtnSuccess: { padding: '6px 12px', border: 'none', borderRadius: 6, background: '#10b981', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  actionBtnDanger: { padding: '6px 12px', border: 'none', borderRadius: 6, background: '#ef4444', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600 }
};
