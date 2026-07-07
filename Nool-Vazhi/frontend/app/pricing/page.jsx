"use client";
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';

const routes = [
  { route: 'Mumbai → Pune', regular: 3500, pooled: 2800, savings: 700 },
  { route: 'Delhi → Jaipur', regular: 4200, pooled: 3360, savings: 840 },
  { route: 'Chennai → Bangalore', regular: 3800, pooled: 3040, savings: 760 },
  { route: 'Hyderabad → Mumbai', regular: 6500, pooled: 5200, savings: 1300 },
  { route: 'Kolkata → Patna', regular: 2800, pooled: 2240, savings: 560 },
];

const dynamicPricing = [
  { label: 'Peak Hours', multiplier: '1.2x', color: '#f59e0b', icon: 'fa-solid fa-clock' },
  { label: 'Festival Season', multiplier: '1.5x', color: '#ef4444', icon: 'fa-solid fa-star' },
  { label: 'Monsoon', multiplier: '1.8x', color: '#3b82f6', icon: 'fa-solid fa-cloud-rain' },
  { label: 'Off-Peak', multiplier: '0.9x', color: '#22c55e', icon: 'fa-solid fa-moon' },
];

const pricingCards = [
  { icon: 'fa-solid fa-rotate', title: 'Shared Load Pricing', desc: 'Split truck space with other shippers on the same route. Pay only for what you use.', highlight: 'Save up to 40%' },
  { icon: 'fa-solid fa-arrow-rotate-left', title: 'Return Optimization', desc: 'Trucks returning empty get matched with loads going back. Massive savings for both.', highlight: 'Save up to 55%' },
  { icon: 'fa-solid fa-chart-bar', title: 'Dynamic Pricing', desc: 'Prices adjust based on demand, season, and route availability in real-time.', highlight: 'Always fair pricing' },
];

export default function Pricing() {
  const { user } = useAuth();
  const [bundles, setBundles] = useState(3);

  const baseCost = 1500;
  const perBundle = 200 * bundles;
  const discount = bundles >= 5 ? 0.15 : bundles >= 3 ? 0.10 : 0.05;
  const subtotal = baseCost + perBundle;
  const discountAmt = Math.round(subtotal * discount);
  const total = subtotal - discountAmt;

  const content = (
    <main style={styles.main}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Transparent <span style={{ color: '#F97316' }}>Pricing</span></h1>
          <p style={styles.sub}>No hidden fees. Pay only for what you ship.</p>
        </div>

        <div className="grid-3" style={{ marginBottom: 60 }}>
          {pricingCards.map((c, i) => (
            <div key={i} className="card" style={styles.pricingCard}>
              <div style={styles.pricingIconWrap}>
                <i className={c.icon} style={styles.pricingIcon}></i>
              </div>
              <h3 style={styles.pricingTitle}>{c.title}</h3>
              <p style={styles.pricingDesc}>{c.desc}</p>
              <div style={styles.highlight}>{c.highlight}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 48, padding: 36 }}>
          <h2 style={styles.sectionTitle}>
            <i className="fa-solid fa-calculator" style={{ color: '#1E3A8A', marginRight: 8 }}></i>
            Quick Price Calculator
          </h2>
          <div style={styles.calcGrid}>
            <div>
              <label style={styles.calcLabel}>Number of Bundles: <strong>{bundles}</strong></label>
              <input type="range" min="1" max="20" value={bundles} onChange={e => setBundles(Number(e.target.value))} style={styles.slider} />
              <div style={styles.calcBreakdown}>
                <div style={styles.calcRow}><span>Base Cost</span><span>₹{baseCost.toLocaleString()}</span></div>
                <div style={styles.calcRow}><span>Per Bundle ({bundles} × ₹200)</span><span>₹{perBundle.toLocaleString()}</span></div>
                <div style={{ ...styles.calcRow, color: '#22c55e' }}><span>Pool Discount ({(discount * 100).toFixed(0)}%)</span><span>- ₹{discountAmt.toLocaleString()}</span></div>
                <div style={styles.calcDivider} />
                <div style={{ ...styles.calcRow, fontWeight: 800, fontSize: 20, color: '#1E3A8A' }}><span>Total</span><span>₹{total.toLocaleString()}</span></div>
              </div>
            </div>
            <div style={styles.savingsBox}>
              <i className="fa-solid fa-piggy-bank" style={{ fontSize: 48, opacity: 0.9 }}></i>
              <div style={styles.savingsValue}>₹{discountAmt.toLocaleString()}</div>
              <div style={styles.savingsLabel}>You Save with Pool Pricing</div>
              <div style={styles.savingsPct}>{(discount * 100).toFixed(0)}% discount applied</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 48, padding: 36 }}>
          <h2 style={styles.sectionTitle}>
            <i className="fa-solid fa-chart-bar" style={{ color: '#1E3A8A', marginRight: 8 }}></i>
            Route Comparison
          </h2>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>Route</th>
                  <th style={styles.th}>Regular Price</th>
                  <th style={styles.th}>Pooled Price</th>
                  <th style={styles.th}>You Save</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((r, i) => (
                  <tr key={i} style={i % 2 === 0 ? styles.trEven : {}}>
                    <td style={styles.td}><strong>{r.route}</strong></td>
                    <td style={{ ...styles.td, textDecoration: 'line-through', color: '#94a3b8' }}>₹{r.regular.toLocaleString()}</td>
                    <td style={{ ...styles.td, color: '#1E3A8A', fontWeight: 700 }}>₹{r.pooled.toLocaleString()}</td>
                    <td style={styles.td}><span style={styles.savingsBadge}>Save ₹{r.savings.toLocaleString()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ padding: 36 }}>
          <h2 style={styles.sectionTitle}>
            <i className="fa-solid fa-bolt" style={{ color: '#F97316', marginRight: 8 }}></i>
            Dynamic Pricing Multipliers
          </h2>
          <div className="grid-4">
            {dynamicPricing.map((d, i) => (
              <div key={i} style={{ ...styles.dynCard, borderColor: d.color + '40', background: d.color + '0d' }}>
                <i className={d.icon} style={{ fontSize: 32, color: d.color, marginBottom: 8, display: 'block' }}></i>
                <div style={{ ...styles.dynMultiplier, color: d.color }}>{d.multiplier}</div>
                <div style={styles.dynLabel}>{d.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );

  if (user) return <div style={{ display: 'flex', minHeight: '100vh' }}><Sidebar />{content}</div>;
  return <div><Navbar />{content}<Footer /></div>;
}

const styles = {
  main: { flex: 1, padding: '40px 0', background: '#f8fafc' },
  container: { maxWidth: 1100, margin: '0 auto', padding: '0 24px' },
  header: { textAlign: 'center', marginBottom: 48 },
  title: { fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#1e293b', marginBottom: 12 },
  sub: { color: '#64748b', fontSize: 16 },
  pricingCard: { textAlign: 'center', padding: 32 },
  pricingIconWrap: { width: 64, height: 64, borderRadius: 16, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  pricingIcon: { fontSize: 28, color: '#1E3A8A' },
  pricingTitle: { fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 10 },
  pricingDesc: { color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 16 },
  highlight: { background: '#dbeafe', color: '#1e40af', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, display: 'inline-block' },
  sectionTitle: { fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 28, display: 'flex', alignItems: 'center' },
  calcGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' },
  calcLabel: { fontSize: 15, color: '#475569', marginBottom: 12, display: 'block' },
  slider: { width: '100%', marginBottom: 24, accentColor: '#1E3A8A' },
  calcBreakdown: { display: 'flex', flexDirection: 'column', gap: 0 },
  calcRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9', fontSize: 15, color: '#475569' },
  calcDivider: { height: 2, background: '#e2e8f0', margin: '8px 0' },
  savingsBox: { background: 'linear-gradient(135deg, #1E3A8A, #3b82f6)', borderRadius: 16, padding: '40px 24px', textAlign: 'center', color: 'white' },
  savingsValue: { fontSize: 48, fontWeight: 800, margin: '12px 0 8px' },
  savingsLabel: { fontSize: 16, opacity: 0.9, marginBottom: 8 },
  savingsPct: { background: 'rgba(255,255,255,0.2)', padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, display: 'inline-block' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f1f5f9' },
  th: { padding: '14px 16px', textAlign: 'left', fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' },
  td: { padding: '14px 16px', fontSize: 15, color: '#1e293b', borderBottom: '1px solid #f1f5f9' },
  trEven: { background: '#fafafa' },
  savingsBadge: { background: '#d1fae5', color: '#065f46', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700 },
  dynCard: { border: '2px solid', borderRadius: 14, padding: '24px 16px', textAlign: 'center' },
  dynMultiplier: { fontSize: 32, fontWeight: 800, marginBottom: 6 },
  dynLabel: { fontSize: 13, color: '#64748b', fontWeight: 600 },
};
