"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
;
import { authAPI } from '@/services/api';

export default function ResetPassword() {
  const { userId, token } = useParams();
  const navigate = useRouter();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true); setError('');
    try {
      const { data } = await authAPI.resetPassword(userId, token, { password: form.password });
      setSuccess(data.message);
      setTimeout(() => navigate.push('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Link may be expired.');
    } finally { setLoading(false); }
  };

  return (
    <div style={styles.page}>
      <div style={styles.overlay} />
      <div style={styles.card} className="fade-in">
        <Link href="/" style={styles.logo}>
          <i className="fa-solid fa-truck" style={{ color: '#F97316', marginRight: 8 }}></i>
          Nool<span style={{ color: '#F97316' }}>-Vazhi</span>
        </Link>

        <div style={styles.iconWrap}>
          <i className="fa-solid fa-key" style={{ fontSize: 32, color: '#1E3A8A' }}></i>
        </div>
        <h2 style={styles.title}>Set New Password</h2>
        <p style={styles.sub}>Enter your new password below.</p>

        {success ? (
          <div style={styles.success}>
            <i className="fa-solid fa-circle-check" style={{ marginRight: 8 }}></i>
            {success} Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={styles.error}>
                <i className="fa-solid fa-circle-xmark" style={{ marginRight: 8 }}></i>{error}
              </div>
            )}
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Min 6 characters"
                required
              />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={form.confirm}
                onChange={e => setForm({ ...form, confirm: e.target.value })}
                placeholder="Repeat new password"
                required
              />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 16 }} disabled={loading}>
              <i className="fa-solid fa-lock"></i>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        <p style={styles.footer}>
          <Link href="/login" style={styles.link}>
            <i className="fa-solid fa-arrow-left" style={{ marginRight: 6 }}></i>Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: 'url("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600&q=80") center/cover no-repeat', padding: '40px 16px' },
  overlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.60)' },
  card: { position: 'relative', background: 'white', borderRadius: 20, padding: '40px', width: '100%', maxWidth: 420, boxShadow: '0 30px 60px rgba(0,0,0,0.3)' },
  logo: { textDecoration: 'none', fontSize: 20, fontWeight: 800, color: '#1E3A8A', display: 'block', marginBottom: 24 },
  iconWrap: { width: 64, height: 64, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  title: { fontSize: 24, fontWeight: 800, color: '#1e293b', marginBottom: 8, textAlign: 'center' },
  sub: { color: '#64748b', marginBottom: 28, fontSize: 14, textAlign: 'center' },
  success: { background: '#d1fae5', color: '#065f46', padding: '16px', borderRadius: 10, fontSize: 14, display: 'flex', alignItems: 'center' },
  error: { background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 14, display: 'flex', alignItems: 'center' },
  footer: { textAlign: 'center', marginTop: 24, color: '#64748b', fontSize: 14 },
  link: { color: '#F97316', fontWeight: 600, textDecoration: 'none' },
};
