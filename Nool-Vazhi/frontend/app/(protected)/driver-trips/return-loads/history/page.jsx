"use client";
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { returnLoadAPI } from '@/services/api';
import { toast } from 'react-hot-toast';

export default function ReturnLoadHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data } = await returnLoadAPI.getHistory();
      setHistory(data);
    } catch (err) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    Pending: { bg: '#fef3c7', fg: '#92400e' },
    Accepted: { bg: '#d1fae5', fg: '#065f46' },
    Rejected: { bg: '#fee2e2', fg: '#991b1b' },
  };

  return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Return Load History</h1>
            <p style={styles.sub}>Track all your return load requests</p>
          </div>
        </div>

        {loading ? (
          <div style={styles.loading}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 12 }}></i>
            <p>Loading history...</p>
          </div>
        ) : history.length === 0 ? (
          <div style={styles.empty}>
            <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 16 }}></i>
            <p style={{ fontSize: 18, color: '#475569', fontWeight: 600 }}>No History Found</p>
            <p style={{ color: '#94a3b8' }}>You haven't requested any return loads yet.</p>
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Route</th>
                  <th style={styles.th}>Organization</th>
                  <th style={styles.th}>Weight</th>
                  <th style={styles.th}>Revenue</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((req) => {
                  const s = req.shipment || {};
                  const colors = statusColors[req.status] || statusColors.Pending;
                  return (
                    <tr key={req._id} style={styles.tr}>
                      <td style={styles.td}>
                        {new Date(req.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{s.pickup || 'Unknown'} <i className="fa-solid fa-arrow-right" style={{ fontSize: 10, margin: '0 6px', color: '#94a3b8' }}></i> {s.drop || 'Unknown'}</div>
                      </td>
                      <td style={styles.td}>{req.organization?.businessName || req.organization?.name || 'N/A'}</td>
                      <td style={styles.td}>{s.weight ? `${s.weight} kg` : 'N/A'}</td>
                      <td style={styles.td} style={{ ...styles.td, fontWeight: 700, color: '#1E3A8A' }}>
                        ₹{s.cost?.total?.toLocaleString() || 0}
                      </td>
                      <td style={styles.td}>
                        <span style={{ 
                          background: colors.bg, 
                          color: colors.fg, 
                          padding: '4px 12px', 
                          borderRadius: '20px', 
                          fontSize: '12px', 
                          fontWeight: 700 
                        }}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh', background: '#f8fafc' },
  main: { flex: 1, padding: '32px', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 },
  title: { fontSize: 28, fontWeight: 800, color: '#1e293b', margin: 0 },
  sub: { color: '#64748b', marginTop: 6, fontSize: 15 },
  loading: { textAlign: 'center', padding: 80, color: '#94a3b8' },
  empty: { textAlign: 'center', padding: 80, color: '#94a3b8', background: 'white', borderRadius: 16, border: '1px dashed #cbd5e1' },
  tableContainer: { background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: 13, textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s' },
  td: { padding: '16px 20px', fontSize: 14, color: '#475569' }
};
