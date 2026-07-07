"use client";
import { useState, useEffect } from 'react';
import { shipmentAPI, returnLoadAPI } from '@/services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import Sidebar from '@/components/Sidebar';

export default function ShipperAnalytics() {
  const [data, setData] = useState(null);
  const [returnLoadData, setReturnLoadData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [shipmentRes, returnRes] = await Promise.all([
          shipmentAPI.getShipperAnalytics(),
          returnLoadAPI.getAnalytics().catch(() => ({ data: null }))
        ]);
        setData(shipmentRes.data);
        if (returnRes.data) setReturnLoadData(returnRes.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={{ ...styles.main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#64748b', fontSize: 18 }}><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }}></i>Loading Analytics...</div>
      </main>
    </div>
  );

  if (!data) return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={{ ...styles.main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#ef4444', fontSize: 18 }}><i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }}></i>Failed to load analytics</div>
      </main>
    </div>
  );

  return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={styles.title}>Logistics <span style={{ color: '#F97316' }}>Analytics</span></h1>
            <p style={styles.sub}>Insights into your spending, volume, and cost savings.</p>
          </div>

          <div className="grid-3" style={{ marginBottom: 30, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div className="card" style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Total Spend</div>
              <div style={styles.summaryValue}>₹{data.totalSpent?.toLocaleString() || 0}</div>
            </div>
            <div className="card" style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Estimated Savings</div>
              <div style={{ ...styles.summaryValue, color: '#10b981' }}>₹{data.totalSavings?.toLocaleString() || 0}</div>
            </div>
            <div className="card" style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Total Shipments</div>
              <div style={styles.summaryValue}>{data.totalShipments || 0}</div>
            </div>
            <div className="card" style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Active Shipments</div>
              <div style={{ ...styles.summaryValue, color: '#F97316' }}>{data.activeShipments || 0}</div>
            </div>
            <div className="card" style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Delivered Shipments</div>
              <div style={{ ...styles.summaryValue, color: '#3b82f6' }}>{data.deliveredShipments || 0}</div>
            </div>
            
            {/* Return Load Analytics for Organization */}
            {returnLoadData && (
              <>
                <div className="card" style={styles.summaryCard}>
                  <div style={styles.summaryLabel}>Return Loads Approved</div>
                  <div style={{ ...styles.summaryValue, color: '#14b8a6' }}>{returnLoadData.returnLoadsCompleted || 0}</div>
                </div>
                <div className="card" style={styles.summaryCard}>
                  <div style={styles.summaryLabel}>Empty Trips Avoided</div>
                  <div style={{ ...styles.summaryValue, color: '#f59e0b' }}>{returnLoadData.emptyTripsAvoided || 0}</div>
                </div>
                <div className="card" style={styles.summaryCard}>
                  <div style={styles.summaryLabel}>CO₂ Saved</div>
                  <div style={{ ...styles.summaryValue, color: '#22c55e' }}>{returnLoadData.co2SavedKg || 0} kg</div>
                </div>
              </>
            )}

            <div className="card" style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Avg Shipment Weight</div>
              <div style={{ ...styles.summaryValue, color: '#6366f1' }}>{data.averageShipmentWeight ? `${Math.round(data.averageShipmentWeight)} kg` : '0 kg'}</div>
            </div>
            <div className="card" style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Avg Vehicle Capacity</div>
              <div style={{ ...styles.summaryValue, color: '#8b5cf6' }}>{data.averageVehicleCapacity ? (data.averageVehicleCapacity >= 1000 ? `${(data.averageVehicleCapacity/1000).toFixed(1)} tons` : `${Math.round(data.averageVehicleCapacity)} kg`) : '0 kg'}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: 30 }}>
            <div className="card" style={styles.chartCard}>
              <h3>Monthly Spending</h3>
              {data.monthlySpend?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.monthlySpend}>
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(val) => `₹${val}`} />
                    <Tooltip formatter={(val) => [`₹${val}`, 'Spend']} />
                    <Bar dataKey="spend" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={styles.emptyChart}>No analytics available yet</div>
              )}
            </div>

            <div className="card" style={styles.chartCard}>
              <h3>Shipment Volume by Category</h3>
              {data.categories?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={data.categories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {data.categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#F97316', '#1E3A8A', '#10b981', '#f59e0b', '#8b5cf6'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={styles.emptyChart}>No analytics available yet</div>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 24, marginBottom: 30 }}>
            <h3 style={{ marginBottom: 20 }}>Most Frequently Used Routes</h3>
            {data.routeAnalytics?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {data.routeAnalytics.map((route, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{route.route}</div>
                    <div style={{ color: '#64748b', fontWeight: 500 }}>{route.count} shipments</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.emptyChart}>No analytics available yet</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh' },
  main: { flex: 1, background: '#f8fafc', padding: '40px 20px', overflowY: 'auto' },
  container: { maxWidth: 1200, margin: '0 auto' },
  header: { marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 800, color: '#1E3A8A', margin: 0 },
  sub: { color: '#64748b', fontSize: 15, margin: '8px 0 0 0' },
  summaryCard: { padding: 24, borderRadius: 12, background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' },
  summaryLabel: { color: '#64748b', fontSize: 14, fontWeight: 500, marginBottom: 8 },
  summaryValue: { color: '#0f172a', fontSize: 28, fontWeight: 700 },
  chartCard: { padding: 24, borderRadius: 12, background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' },
  emptyChart: { height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 15, background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }
};