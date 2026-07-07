"use client";
import { useState } from 'react';
import Link from 'next/link';
;
import { authAPI } from '@/services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [devLink, setDevLink] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess(''); setDevLink('');
    try {
      const { data } = await authAPI.forgotPassword({ email });
      setSuccess(data.message);
      if (data.resetUrl) setDevLink(data.resetUrl);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
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
          <i className="fa-solid fa-lock-open" style={{ fontSize: 32, color: '#1E3A8A' }}></i>
        </div>
        <h2 style={styles.title}>Forgot Password?</h2>
        <p style={styles.sub}>Enter your registered email and we'll send you a reset link.</p>

        {success ? (
          <div style={styles.success}>
            <i className="fa-solid fa-circle-check" style={{ marginRight: 8 }}></i>
            {success}
            {devLink ? (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 13, marginBottom: 8 }}>Click the link below to reset your password:</p>
                <a href={devLink} style={{ color: '#1E3A8A', fontWeight: 700, fontSize: 13, wordBreak: 'break-all' }}>{devLink}</a>
              </div>
            ) : (
              <p style={{ marginTop: 12, fontSize: 13 }}>Check your inbox at <strong>{email}</strong>. The link expires in 15 minutes.</p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={styles.error}>
                <i className="fa-solid fa-circle-xmark" style={{ marginRight: 8 }}></i>{error}
              </div>
            )}
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 16 }} disabled={loading}>
              <i className="fa-solid fa-paper-plane"></i>
              {loading ? 'Sending...' : 'Send Reset Link'}
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
  sub: { color: '#64748b', marginBottom: 28, fontSize: 14, textAlign: 'center', lineHeight: 1.6 },
  success: { background: '#d1fae5', color: '#065f46', padding: '16px', borderRadius: 10, fontSize: 14, display: 'flex', flexDirection: 'column' },
  error: { background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 14, display: 'flex', alignItems: 'center' },
  footer: { textAlign: 'center', marginTop: 24, color: '#64748b', fontSize: 14 },
  link: { color: '#F97316', fontWeight: 600, textDecoration: 'none' },
};
