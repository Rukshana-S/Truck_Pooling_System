"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
;
import { authAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

function FileUpload({ label, name, accept, required, onChange, preview }) {
  return (
    <div className="form-group">
      <label>{label}{required && ' *'}</label>
      <div style={styles.fileWrap}>
        <label style={styles.fileLabel}>
          <i className="fa-solid fa-upload" style={{ marginRight: 6, color: '#1E3A8A' }}></i>
          {preview ? 'Change file' : 'Choose file'}
          <input type="file" name={name} accept={accept} onChange={onChange} style={{ display: 'none' }} required={required} />
        </label>
        {preview && (
          <span style={styles.fileName}>
            <i className="fa-solid fa-circle-check" style={{ color: '#22c55e', marginRight: 4 }}></i>
            {preview}
          </span>
        )}
        {!preview && <span style={styles.fileHint}>JPG, PNG or PDF · Max 5MB</span>}
      </div>
    </div>
  );
}

export default function OrgRegister() {
  const navigate = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', email: '', location: '', businessName: '', gst: '', industry: '', password: '', confirm: '' });
  const [files, setFiles] = useState({ orgProof: null, gstCertificate: null, aadharDoc: null });
  const [previews, setPreviews] = useState({ orgProof: '', gstCertificate: '', aadharDoc: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFile = (e) => {
    const { name, files: f } = e.target;
    if (f[0]) {
      setFiles(prev => ({ ...prev, [name]: f[0] }));
      setPreviews(prev => ({ ...prev, [name]: f[0].name }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (!files.orgProof) return setError('Organization proof document is required');
    if (!files.aadharDoc) return setError('Aadhar card is required');
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (k !== 'confirm') fd.append(k, v); });
      if (files.orgProof) fd.append('orgProof', files.orgProof);
      if (files.gstCertificate) fd.append('gstCertificate', files.gstCertificate);
      if (files.aadharDoc) fd.append('aadharDoc', files.aadharDoc);

      const { data } = await authAPI.registerOrg(fd);
      login(data);
      navigate.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
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
          Organization Registration
        </div>
        <h2 style={styles.title}>Create Organization Account</h2>
        <p style={styles.sub}>Register your business to start booking shipments</p>

        {error && <div style={styles.error}><i className="fa-solid fa-circle-xmark" style={{ marginRight: 8 }}></i>{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div style={styles.row}>
            <div className="form-group">
              <label>Contact Person *</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="John Doe" required />
            </div>
            <div className="form-group">
              <label>Business Name *</label>
              <input name="businessName" value={form.businessName} onChange={handleChange} placeholder="ABC Traders Pvt Ltd" required />
            </div>
          </div>
          <div style={styles.row}>
            <div className="form-group">
              <label>Phone *</label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210" required />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@company.com" required />
            </div>
          </div>
          <div style={styles.row}>
            <div className="form-group">
              <label>Location *</label>
              <input name="location" value={form.location} onChange={handleChange} placeholder="Mumbai, Maharashtra" required />
            </div>
            <div className="form-group">
              <label>Industry</label>
              <select name="industry" value={form.industry} onChange={handleChange}>
                <option value="">Select Industry</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="retail">Retail / E-commerce</option>
                <option value="agriculture">Agriculture</option>
                <option value="construction">Construction</option>
                <option value="pharma">Pharma / Healthcare</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>GST Number (Optional)</label>
            <input name="gst" value={form.gst} onChange={handleChange} placeholder="27AAPFU0939F1ZV" />
          </div>

          {/* KYC Section */}
          <div style={styles.kycSection}>
            <div style={styles.kycHeader}>
              <i className="fa-solid fa-shield-halved" style={{ color: '#1E3A8A', marginRight: 8 }}></i>
              KYC Verification Documents
            </div>
            <p style={styles.kycNote}>Upload clear scans or photos. Accepted: JPG, PNG, PDF (max 5MB each)</p>
            <div style={styles.row}>
              <FileUpload
                label="Organization Proof"
                name="orgProof"
                accept=".jpg,.jpeg,.png,.pdf"
                required
                onChange={handleFile}
                preview={previews.orgProof}
              />
              <FileUpload
                label="GST Certificate (Optional)"
                name="gstCertificate"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFile}
                preview={previews.gstCertificate}
              />
            </div>
            <div style={styles.row}>
              <FileUpload
                label="Aadhar Card"
                name="aadharDoc"
                accept=".jpg,.jpeg,.png,.pdf"
                required
                onChange={handleFile}
                preview={previews.aadharDoc}
              />
              <div />
            </div>
            <div style={styles.kycExamples}>
              <i className="fa-solid fa-circle-info" style={{ color: '#64748b', marginRight: 6 }}></i>
              Accepted: Certificate of Incorporation, Trade License, MSME Certificate, GST Certificate
            </div>
          </div>

          {/* Password */}
          <div style={styles.row}>
            <div className="form-group">
              <label>Password *</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min 8 characters" required />
            </div>
            <div className="form-group">
              <label>Confirm Password *</label>
              <input name="confirm" type="password" value={form.confirm} onChange={handleChange} placeholder="Repeat password" required />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 16 }} disabled={loading}>
            {loading ? 'Creating Account...' : <><i className="fa-solid fa-building"></i> Create Organization Account</>}
          </button>
        </form>

        <p style={styles.footer}>
          Are you a driver? <Link href="/register/driver" style={styles.link}>Register as Driver</Link>
          {' · '}
          <Link href="/login" style={styles.link}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: 'url("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600&q=80") center/cover no-repeat', padding: '40px 16px' },
  overlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.60)' },
  card: { position: 'relative', background: 'white', borderRadius: 20, padding: '40px', width: '100%', maxWidth: 720, boxShadow: '0 30px 60px rgba(0,0,0,0.3)' },
  logo: { textDecoration: 'none', fontSize: 22, fontWeight: 800, color: '#1E3A8A', display: 'flex', alignItems: 'center', marginBottom: 16 },
  badge: { display: 'inline-block', background: '#eff6ff', color: '#1E3A8A', border: '1px solid #bfdbfe', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: 800, color: '#1e293b', marginBottom: 6 },
  sub: { color: '#64748b', marginBottom: 24, fontSize: 15 },
  error: { background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 14, display: 'flex', alignItems: 'center' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  kycSection: { background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '20px', marginBottom: 20 },
  kycHeader: { fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 6, display: 'flex', alignItems: 'center' },
  kycNote: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  kycExamples: { fontSize: 12, color: '#64748b', marginTop: 8, display: 'flex', alignItems: 'flex-start' },
  fileWrap: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  fileLabel: { display: 'inline-flex', alignItems: 'center', padding: '8px 16px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#1E3A8A', whiteSpace: 'nowrap' },
  fileName: { fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center' },
  fileHint: { fontSize: 11, color: '#94a3b8' },
  footer: { textAlign: 'center', marginTop: 24, color: '#64748b', fontSize: 14 },
  link: { color: '#F97316', fontWeight: 600, textDecoration: 'none' },
};
