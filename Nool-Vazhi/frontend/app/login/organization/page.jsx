"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
;
import { authAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export default function OrgLogin() {
  const navigate = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await authAPI.loginOrg(form);
      login(data);
      navigate.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
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
        <div style={styles.badge}>
          <i className="fa-solid fa-building" style={{ marginRight: 6 }}></i>
          Organization Login
        </div>
        <h2 style={styles.title}>Welcome Back</h2>
        <p style={styles.sub}>Sign in to your organization account</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@company.com" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Your password" required />
          </div>
          <div style={{ textAlign: 'right', marginBottom: 12 }}>
            <Link href="/forgot-password" style={{ color: '#F97316', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              <i className="fa-solid fa-lock-open" style={{ marginRight: 4 }}></i>Forgot Password?
            </Link>
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 16, marginTop: 8 }} disabled={loading}>
            {loading ? 'Signing In...' : <><i className="fa-solid fa-building"></i> Sign In as Organization</>}
          </button>
        </form>

        <p style={styles.footer}>
          Not an org? <Link href="/login/driver" style={styles.link}>Driver Login</Link>
          {' · '}
          <Link href="/register/organization" style={styles.link}>Create Account</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: 'url("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600&q=80") center/cover no-repeat', padding: '40px 16px' },
  overlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.60)' },
  card: { position: 'relative', background: 'white', borderRadius: 20, padding: '40px', width: '100%', maxWidth: 440, boxShadow: '0 30px 60px rgba(0,0,0,0.3)' },
  logo: { textDecoration: 'none', fontSize: 22, fontWeight: 800, color: '#1E3A8A', display: 'block', marginBottom: 16 },
  badge: { display: 'inline-block', background: '#eff6ff', color: '#1E3A8A', border: '1px solid #bfdbfe', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: 800, color: '#1e293b', marginBottom: 6 },
  sub: { color: '#64748b', marginBottom: 28, fontSize: 15 },
  error: { background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 14 },
  footer: { textAlign: 'center', marginTop: 24, color: '#64748b', fontSize: 14 },
  link: { color: '#F97316', fontWeight: 600, textDecoration: 'none' },
};
