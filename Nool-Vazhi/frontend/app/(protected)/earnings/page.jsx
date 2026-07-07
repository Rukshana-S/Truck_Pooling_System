"use client";
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { earningsAPI, returnLoadAPI } from '@/services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import Sidebar from '@/components/Sidebar';

export default function DriverEarnings() {
  const { user } = useAuth();
  const [filter, setFilter] = useState('today');
  const [data, setData] = useState({ summary: {}, rows: [] });
  const [returnLoadData, setReturnLoadData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEarnings();
  }, [filter]);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const [earningsRes, returnRes] = await Promise.all([
        earningsAPI.get(filter),
        returnLoadAPI.getAnalytics().catch(() => ({ data: null }))
      ]);
      setData(earningsRes.data || { summary: {}, rows: [] });
      if (returnRes.data) setReturnLoadData(returnRes.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const markPaid = async (bookingId, type) => {
    try {
      await earningsAPI.updatePayment(bookingId, { type });
      fetchEarnings();
    } catch (err) {
      toast.error('Failed to update payment');
    }
  };

  const exportCSV = () => {
    const headers = ['Date', 'Route', 'Weight', 'Shipment ID', 'Amount Earned (INR)', 'Payment Status', 'Status'];
    const csvRows = data.rows.map(row => [
      new Date(row.date).toLocaleDateString(),
      `"${row.from} to ${row.to}"`,
      `${row.weight} ${row.weightUnit || 'kg'}`,
      row.shipmentId?.slice(-6).toUpperCase() || 'N/A',
      row.totalEarning || 0,
      row.paymentStatus || 'N/A',
      row.status || 'Delivered'
    ].join(','));
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Earnings_${filter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  // Group earnings for the chart by date
  const chartData = [...data.rows]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .reduce((acc, curr) => {
      const d = new Date(curr.date).toLocaleDateString();
      const existing = acc.find(item => item.date === d);
      if (existing) {
        existing.earnings += curr.totalEarning || 0;
      } else {
        acc.push({ date: d, earnings: curr.totalEarning || 0 });
      }
      return acc;
    }, []);

  return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={styles.title}>Earnings <span style={{ color: '#F97316' }}>Dashboard</span></h1>
            <p style={styles.sub}>Track your revenue and pending payments</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
            <div style={styles.filterBox}>
              {['today', 'week', 'month'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ ...styles.filterBtn, background: filter === f ? '#1E3A8A' : 'transparent', color: filter === f ? 'white' : '#64748b' }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={exportCSV} style={styles.exportBtn}>
                <i className="fa-solid fa-file-csv" style={{ marginRight: 6 }}></i> Export CSV
              </button>
              <button onClick={handlePrintPDF} style={styles.exportBtn}>
                <i className="fa-solid fa-file-pdf" style={{ marginRight: 6 }}></i> Export PDF
              </button>
            </div>
          </div>

          {/* 6 Summary Cards */}
          <div className="grid-3" style={{ marginBottom: 30, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div className="card" style={styles.summaryCard}>
              <div style={styles.summaryIcon}><i className="fa-solid fa-indian-rupee-sign"></i></div>
              <div>
                <div style={styles.summaryLabel}>Today's Earnings</div>
                <div style={styles.summaryValue}>₹{data.summary.todayEarnings?.toLocaleString() || 0}</div>
              </div>
            </div>
            <div className="card" style={styles.summaryCard}>
              <div style={{ ...styles.summaryIcon, background: '#e0e7ff', color: '#4f46e5' }}><i className="fa-solid fa-calendar-week"></i></div>
              <div>
                <div style={styles.summaryLabel}>Weekly Earnings</div>
                <div style={styles.summaryValue}>₹{data.summary.weeklyEarnings?.toLocaleString() || 0}</div>
              </div>
            </div>
            <div className="card" style={styles.summaryCard}>
              <div style={{ ...styles.summaryIcon, background: '#fef3c7', color: '#d97706' }}><i className="fa-solid fa-calendar-days"></i></div>
              <div>
                <div style={styles.summaryLabel}>Monthly Earnings</div>
                <div style={styles.summaryValue}>₹{data.summary.monthlyEarnings?.toLocaleString() || 0}</div>
              </div>
            </div>
            <div className="card" style={styles.summaryCard}>
              <div style={{ ...styles.summaryIcon, background: '#fee2e2', color: '#dc2626' }}><i className="fa-solid fa-clock"></i></div>
              <div>
                <div style={styles.summaryLabel}>Pending Payments</div>
                <div style={styles.summaryValue}>₹{data.summary.pendingPayments?.toLocaleString() || 0}</div>
              </div>
            </div>
            <div className="card" style={styles.summaryCard}>
              <div style={{ ...styles.summaryIcon, background: '#dcfce7', color: '#16a34a' }}><i className="fa-solid fa-truck-fast"></i></div>
              <div>
                <div style={styles.summaryLabel}>Completed Trips</div>
                <div style={styles.summaryValue}>{data.summary.completedTrips || 0}</div>
              </div>
            </div>
            <div className="card" style={styles.summaryCard}>
              <div style={{ ...styles.summaryIcon, background: '#f3e8ff', color: '#9333ea' }}><i className="fa-solid fa-chart-line"></i></div>
              <div>
                <div style={styles.summaryLabel}>Avg Earnings / Trip</div>
                <div style={styles.summaryValue}>₹{data.summary.avgEarnings?.toLocaleString() || 0}</div>
              </div>
            </div>
            
            {/* Return Load Analytics */}
            {returnLoadData && (
              <>
                <div className="card" style={styles.summaryCard}>
                  <div style={{ ...styles.summaryIcon, background: '#d1fae5', color: '#059669' }}><i className="fa-solid fa-rotate-left"></i></div>
                  <div>
                    <div style={styles.summaryLabel}>Return Loads</div>
                    <div style={styles.summaryValue}>{returnLoadData.returnLoadsCompleted || 0}</div>
                  </div>
                </div>
                <div className="card" style={styles.summaryCard}>
                  <div style={{ ...styles.summaryIcon, background: '#fef08a', color: '#ca8a04' }}><i className="fa-solid fa-truck"></i></div>
                  <div>
                    <div style={styles.summaryLabel}>Empty Trips Avoided</div>
                    <div style={styles.summaryValue}>{returnLoadData.emptyTripsAvoided || 0}</div>
                  </div>
                </div>
                <div className="card" style={styles.summaryCard}>
                  <div style={{ ...styles.summaryIcon, background: '#bbf7d0', color: '#16a34a' }}><i className="fa-solid fa-leaf"></i></div>
                  <div>
                    <div style={styles.summaryLabel}>CO₂ Saved</div>
                    <div style={styles.summaryValue}>{returnLoadData.co2SavedKg || 0} kg</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Chart Section */}
          <div className="card" style={{ padding: 24, marginBottom: 30 }}>
            <h3 style={{ fontSize: 16, color: '#1e293b', marginBottom: 20 }}>{filter.charAt(0).toUpperCase() + filter.slice(1)} Earnings Over Time</h3>
            {chartData.length > 0 ? (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  {filter === 'month' ? (
                    <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                        formatter={(val) => [`₹${val}`, 'Earnings']}
                      />
                      <Bar dataKey="earnings" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                        formatter={(val) => [`₹${val}`, 'Earnings']}
                      />
                      <Line type="monotone" dataKey="earnings" stroke="#1E3A8A" strokeWidth={3} dot={{ r: 4, fill: '#1E3A8A', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>No data available for this period.</div>
            )}
          </div>

          {/* Trip-wise Earnings Table */}
          <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Route</th>
                  <th style={styles.th}>Weight</th>
                  <th style={styles.th}>Shipment ID</th>
                  <th style={styles.th}>Amount Earned</th>
                  <th style={styles.th}>Payment Status</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 16 }}>No completed trips yet.</td>
                  </tr>
                ) : data.rows.map(row => (
                  <tr key={row._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={styles.td}>{new Date(row.date).toLocaleDateString()}</td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600 }}>{row.from}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>to {row.to}</div>
                    </td>
                    <td style={styles.td}>{row.weight} {row.weightUnit || 'kg'}</td>
                    <td style={styles.td}><span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{row.shipmentId?.slice(-6).toUpperCase() || 'N/A'}</span></td>
                    <td style={styles.td}><span style={{ fontWeight: 700, color: '#1E3A8A' }}>₹{row.totalEarning?.toLocaleString()}</span></td>
                    <td style={styles.td}>
                      <span style={row.paymentStatus === 'Completed' ? styles.badgeSuccess : row.paymentStatus === 'Advance Paid' ? styles.badgeInfo : styles.badgeWarn}>
                        {row.paymentStatus}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.badgeSuccess}>
                        {row.status || 'Delivered'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {!row.advancePaid && <button onClick={() => markPaid(row._id, 'advance')} style={styles.actionBtn}>Mark Adv Paid</button>}
                      {row.advancePaid && !row.remainingPaid && <button onClick={() => markPaid(row._id, 'remaining')} style={styles.actionBtn}>Mark Bal Paid</button>}
                      {row.advancePaid && row.remainingPaid && <span style={{ color: '#16a34a', fontSize: 13, fontWeight: 500 }}><i className="fa-solid fa-check"></i> Cleared</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh' },
  main: { flex: 1, padding: '32px', background: '#f8fafc', overflowY: 'auto' },
  container: { maxWidth: 1200, margin: '0 auto' },
  header: { marginBottom: 30, display: 'flex', flexDirection: 'column', gap: 6 },
  title: { fontSize: 28, fontWeight: 800, color: '#1E3A8A', margin: 0 },
  sub: { color: '#64748b', fontSize: 15, margin: 0 },
  filterBox: { display: 'flex', gap: 10 },
  filterBtn: { border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' },
  exportBtn: { background: 'white', border: '1.5px solid #e2e8f0', color: '#475569', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center' },
  summaryCard: { display: 'flex', alignItems: 'center', gap: 16, padding: 24, borderRadius: 12, background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' },
  summaryIcon: { width: 48, height: 48, borderRadius: 12, background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 },
  summaryLabel: { color: '#64748b', fontSize: 14, fontWeight: 500, marginBottom: 4 },
  summaryValue: { color: '#0f172a', fontSize: 24, fontWeight: 700 },
  th: { padding: '16px 20px', fontWeight: 600, color: '#475569', fontSize: 14 },
  td: { padding: '16px 20px', color: '#334155', fontSize: 14, verticalAlign: 'middle' },
  badgeSuccess: { background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  badgeWarn: { background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  badgeInfo: { background: '#e0e7ff', color: '#4f46e5', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  actionBtn: { background: '#1E3A8A', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 500 }
};