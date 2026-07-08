"use client";
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { authAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import ConfirmationModal from '@/components/ConfirmationModal';
import { toast } from 'react-hot-toast';

const INDUSTRIES = ['Manufacturing', 'Retail / E-commerce', 'Agriculture', 'Construction', 'Pharma / Healthcare', 'Other'];
const VEHICLE_TYPES = [
  'Two-Wheeler Courier', 'Cargo Auto', 'Mini Pickup', 'Light Commercial Vehicle (LCV)',
  'Medium Commercial Vehicle (MCV)', 'Heavy Commercial Vehicle (HCV)', 'Container Truck',
  'Trailer', 'Tanker', 'Refrigerated Truck', 'Flatbed Truck', 'Other'
];
const FUEL_TYPES = ['Diesel', 'Petrol', 'Electric', 'CNG', 'Hybrid', 'Other'];
const AVAILABILITIES = ['Available', 'Busy', 'Under Maintenance'];

import LocationInput from '@/components/LocationInput';

export default function Profile() {
  const { user, login } = useAuth();
  const isDriver = user?.role === 'driver';

  const [form, setForm] = useState({
    name: '', phone: '', location: '', currentLocation: '',
    businessName: '', gst: '', industry: '',
    licenseNumber: '', vehicleType: '', vehicleNumber: '', capacityValue: '', capacityUnit: 'kg',
    fuelType: '', availability: 'Available'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  
  const [deleteVehicleModal, setDeleteVehicleModal] = useState(false);
  
  const [docType, setDocType] = useState('license');
  const [docBase64, setDocBase64] = useState('');
  const [replacingDoc, setReplacingDoc] = useState(false);

  useEffect(() => {
    authAPI.profile()
      .then(({ data }) => {
        setForm({
          name: data.name || '',
          phone: data.phone || '',
          location: data.location || '',
          currentLocation: data.currentLocation ? (typeof data.currentLocation === 'object' ? data.currentLocation.raw : data.currentLocation) : '',
          businessName: data.businessName || '',
          gst: data.gst || '',
          industry: data.industry || '',
          licenseNumber: data.licenseNumber || '',
          vehicleType: data.vehicleType || '',
          vehicleNumber: data.vehicleNumber || '',
          capacityValue: data.vehicleCapacity || (data.capacityUnit === 'tons' && data.capacity ? data.capacity / 1000 : (data.capacity || '')),
          capacityUnit: data.capacityUnit || 'kg',
          fuelType: data.fuelType || '',
          availability: data.availability || 'Available',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      const { data } = await authAPI.updateProfile(form);
      const stored = JSON.parse(localStorage.getItem('nv_user') || '{}');
      login({ ...stored, name: data.name });
      setMsg('success:Profile updated successfully!');
    } catch (err) {
      setMsg('error:' + (err.response?.data?.message || 'Update failed'));
    } finally { setSaving(false); }
  };

  const handleDeleteVehicle = async () => {
    try {
      await authAPI.deleteVehicle();
      toast.success('Vehicle deleted successfully');
      setForm(prev => ({ ...prev, vehicleType: '', vehicleNumber: '', capacityValue: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete vehicle');
    } finally {
      setDeleteVehicleModal(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setDocBase64(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleReplaceDoc = async (e) => {
    e.preventDefault();
    if (!docBase64) return toast.error('Please select a file');
    setReplacingDoc(true);
    try {
      await authAPI.replaceDocument({ type: docType, file: docBase64 });
      toast.success('Document updated successfully');
      setDocBase64('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update document');
    } finally { setReplacingDoc(false); }
  };

  if (loading) return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.empty}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 28, color: '#cbd5e1' }}></i></div>
      </main>
    </div>
  );

  return (
    <div style={styles.layout}>
      <Sidebar />
      <main className="p-mobile-16" style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              <i className="fa-solid fa-user-pen" style={{ color: '#F97316', marginRight: 10 }}></i>
              My Profile
            </h1>
            <p style={styles.sub}>Update your personal and {isDriver ? 'vehicle' : 'business'} details</p>
          </div>
        </div>

        {msg && (
          <div style={msg.startsWith('success') ? styles.success : styles.error}>
            <i className={`fa-solid ${msg.startsWith('success') ? 'fa-circle-check' : 'fa-circle-xmark'}`} style={{ marginRight: 8 }}></i>
            {msg.replace(/^(success|error):/, '')}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div className="card" style={{ padding: 28, marginBottom: 20 }}>
            <h3 style={styles.sectionTitle}>
              <i className="fa-solid fa-circle-info" style={{ color: '#1E3A8A', marginRight: 8 }}></i>
              Basic Information
            </h3>
            <div className="grid-2">
              <div className="form-group">
                <label>Full Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name" required />
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" required />
              </div>
              <div className="form-group">
                <label>{isDriver ? 'Current Operating Location *' : 'Location *'}</label>
                {isDriver ? (
                  <LocationInput name="currentLocation" value={form.currentLocation} onChange={e => setForm({ ...form, currentLocation: e.target.value })} placeholder="City, State" />
                ) : (
                  <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="City, State" required />
                )}
              </div>
              <div className="form-group">
                <label>Email</label>
                <input value={user?.email || ''} disabled style={{ background: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed' }} />
              </div>
            </div>
          </div>

          {/* Org-specific */}
          {!isDriver && (
            <div className="card" style={{ padding: 28, marginBottom: 20 }}>
              <h3 style={styles.sectionTitle}>
                <i className="fa-solid fa-building" style={{ color: '#1E3A8A', marginRight: 8 }}></i>
                Business Details
              </h3>
              <div className="grid-2">
                <div className="form-group">
                  <label>Business Name</label>
                  <input value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} placeholder="ABC Traders Pvt Ltd" />
                </div>
                <div className="form-group">
                  <label>GST Number</label>
                  <input value={form.gst} onChange={e => setForm({ ...form, gst: e.target.value })} placeholder="27AAPFU0939F1ZV" />
                </div>
                <div className="form-group">
                  <label>Industry</label>
                  <select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}>
                    <option value="">Select Industry</option>
                    {INDUSTRIES.map(i => <option key={i} value={i.toLowerCase()}>{i}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Driver-specific */}
          {isDriver && (
            <div className="card" style={{ padding: 28, marginBottom: 20 }}>
              <h3 style={styles.sectionTitle}>
                <i className="fa-solid fa-truck" style={{ color: '#F97316', marginRight: 8 }}></i>
                Vehicle Details
              </h3>
              <div className="grid-2">
                <div className="form-group">
                  <label>License Number</label>
                  <input value={form.licenseNumber} onChange={e => setForm({ ...form, licenseNumber: e.target.value })} placeholder="TN0120230012345" />
                </div>
                <div className="form-group">
                  <label>Vehicle Type</label>
                  <select value={form.vehicleType} onChange={e => setForm({ ...form, vehicleType: e.target.value })}>
                    <option value="">Select Vehicle Type</option>
                    {VEHICLE_TYPES.map(v => <option key={v} value={v.toLowerCase().replace(/\s+/g, '-')}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Vehicle Number</label>
                  <input value={form.vehicleNumber} onChange={e => setForm({ ...form, vehicleNumber: e.target.value })} placeholder="TN 01 AB 1234" />
                </div>
                <div className="form-group">
                  <label>Vehicle Capacity</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="number" name="capacityValue" value={form.capacityValue} onChange={e => setForm({ ...form, capacityValue: e.target.value })} placeholder="e.g. 500" min="1" max="40000" style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }} />
                    <select name="capacityUnit" value={form.capacityUnit} onChange={e => setForm({ ...form, capacityUnit: e.target.value })} style={{ width: 80, padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
                      <option value="kg">kg</option>
                      <option value="tons">tons</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Fuel Type</label>
                  <select value={form.fuelType} onChange={e => setForm({ ...form, fuelType: e.target.value })}>
                    <option value="">Select Fuel Type</option>
                    {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Availability</label>
                  <select value={form.availability} onChange={e => setForm({ ...form, availability: e.target.value })}>
                    {AVAILABILITIES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 20, textAlign: 'right' }}>
                <button type="button" onClick={() => setDeleteVehicleModal(true)} style={{ padding: '8px 16px', border: '1.5px solid #fecaca', borderRadius: 8, background: 'white', color: '#ef4444', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  <i className="fa-solid fa-trash" style={{ marginRight: 6 }}></i> Delete Vehicle
                </button>
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ padding: '13px 36px', fontSize: 15 }} disabled={saving}>
            <i className="fa-solid fa-floppy-disk"></i>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        {isDriver && (
          <div className="card" style={{ padding: 28, marginTop: 20 }}>
            <h3 style={styles.sectionTitle}>
              <i className="fa-solid fa-file-shield" style={{ color: '#1E3A8A', marginRight: 8 }}></i>
              Document Management
            </h3>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>Replace or update your KYC documents. Changes are recorded in your document history.</p>
            <form onSubmit={handleReplaceDoc} style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
                <label>Document Type</label>
                <select value={docType} onChange={e => setDocType(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
                  <option value="license">Driving License</option>
                  <option value="aadhaar">Aadhaar Card</option>
                  <option value="insurance">Vehicle Insurance</option>
                  <option value="rc">RC Book</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0, flex: 2, minWidth: 250 }}>
                <label>Upload New File</label>
                <input type="file" onChange={handleFileChange} accept="image/*,.pdf" style={{ width: '100%', padding: '8px', border: '1px dashed #cbd5e1', borderRadius: '4px', background: '#f8fafc' }} />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '10px 24px' }} disabled={replacingDoc || !docBase64}>
                {replacingDoc ? 'Uploading...' : 'Upload & Replace'}
              </button>
            </form>
          </div>
        )}

      </main>

      <ConfirmationModal
        isOpen={deleteVehicleModal}
        title="Delete Vehicle"
        message="Are you sure you want to delete your vehicle? You will not be able to bid on new auctions or accept shipments until you add a new vehicle. You cannot delete a vehicle if you have active shipments."
        confirmText="Delete Vehicle"
        type="Danger"
        onConfirm={handleDeleteVehicle}
        onCancel={() => setDeleteVehicleModal(false)}
      />
    </div>
  );
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh', width: '100vw', overflowX: 'hidden' },
  main: { flex: 1, padding: '32px', background: '#f8fafc', overflowY: 'auto' },
  header: { marginBottom: 24 },
  title: { fontSize: 26, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center' },
  sub: { color: '#64748b', marginTop: 4, fontSize: 14 },
  success: { background: '#d1fae5', color: '#065f46', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 14, display: 'flex', alignItems: 'center' },
  error: { background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 14, display: 'flex', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center' },
  empty: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' },
};
