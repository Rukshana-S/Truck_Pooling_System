'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { trackingAPI, paymentAPI } from '@/services/api';
import { toast } from 'react-hot-toast';
import Sidebar from '@/components/Sidebar';

async function geocode(query) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (_) {}
  return null;
}

const ADVANCED_STATUS_STAGES = [
  { label: 'Pending', icon: 'fa-box' },
  { label: 'Accepted', icon: 'fa-handshake' },
  { label: 'Advance Paid', icon: 'fa-money-bill-wave' },
  { label: 'Pickup Started', icon: 'fa-truck-arrow-right' },
  { label: 'In Transit', icon: 'fa-truck-fast' },
  { label: 'Near Destination', icon: 'fa-location-dot' },
  { label: 'Delivered', icon: 'fa-house-circle-check' },
  { label: 'Final Payment Completed', icon: 'fa-check-double' },
  { label: 'Shipment Completed', icon: 'fa-file-invoice-dollar' }
];

const getStageState = (currentStatus, stageLabel) => {
  const currentIndex = ADVANCED_STATUS_STAGES.findIndex(s => s.label === (currentStatus || 'Pending'));
  const stageIndex = ADVANCED_STATUS_STAGES.findIndex(s => s.label === stageLabel);
  
  if (stageIndex < currentIndex) return 'completed';
  if (stageIndex === currentIndex) return 'active';
  return 'pending';
};

export default function DriverTracking() {
  const { id } = useParams();
  const router = useRouter();
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const simIntervalRef = useRef(null);
  const simCoordsRef = useRef(null);
  const prevStatusRef = useRef(null);

  const [isSharing, setIsSharing] = useState(false);
  const [simulate, setSimulate] = useState(false);
  const [location, setLocation] = useState(null);
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('Pending Advance');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    const fetchShipment = async () => {
      try {
        const res = await trackingAPI.track(id);
        const data = res.data;
        setShipment(data);
        setCurrentStatus(data.currentStatus || data.status || 'Pending');
        setPaymentStatus(data.paymentStatus || 'Pending Advance');
        setTimeline(data.timeline || []);
        prevStatusRef.current = data.currentStatus || data.status || 'Pending';

        const pickupCity = data.pickup || data.fromLocation;
        const dropCity = data.drop || data.toLocation;
        if (pickupCity && dropCity) {
          const [from, to] = await Promise.all([geocode(pickupCity), geocode(dropCity)]);
          simCoordsRef.current = { from, to };
        }
      } catch (err) {
        toast.error('Failed to load shipment details');
      } finally {
        setLoading(false);
      }
    };
    fetchShipment();

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const socketUrl = baseUrl.includes('/api') ? baseUrl.replace('/api', '') : baseUrl;
    socketRef.current = io(socketUrl);

    // Dedup guard - listen to socket events to sync if other device updates
    socketRef.current.on('shipment_status_update', (data) => {
      if (data.status !== prevStatusRef.current) {
         setCurrentStatus(data.status);
         prevStatusRef.current = data.status;
         setTimeline(prev => {
            const exists = prev.find(t => t.status === data.status && Math.abs(new Date(t.timestamp) - new Date(data.timestamp)) < 2000);
            if (exists) return prev;
            return [...prev, { status: data.status, timestamp: data.timestamp, note: `Status updated to ${data.status}` }];
         });
      }
    });

    return () => {
      stopTracking();
      if (socketRef.current) {
         socketRef.current.off('shipment_status_update');
         socketRef.current.disconnect();
      }
    };
  }, [id]);

  const updateStatus = useCallback(async (status) => {
    if (status === prevStatusRef.current) return; // Dedup check
    
    try {
      await trackingAPI.updateStatus(id, { status, lat: location?.lat, lng: location?.lng });
      setCurrentStatus(status);
      prevStatusRef.current = status;
      setTimeline(prev => [...prev, { status, timestamp: Date.now(), note: `Status updated to ${status}` }]);
      
      // Auto-update payment state on transition
      if (status === 'Advance Paid' && paymentStatus === 'Pending Advance') setPaymentStatus('Advance Paid');
      if (status === 'Final Payment Completed') setPaymentStatus('Fully Paid');
      
      toast.success(`Status updated to ${status}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  }, [id, location, paymentStatus]);

  const startTracking = () => {
    const socket = socketRef.current;
    if (!socket) return;
    setIsSharing(true);
    socket.emit('join_tracking', id);
    
    // Auto advance simulation status
    if (simulate) {
      updateStatus('Advance Paid'); // Trigger first step
      
      const coords = simCoordsRef.current;
      let lat = coords?.from?.lat ?? 13.0827;
      let lng = coords?.from?.lng ?? 80.2707;
      const toLat = coords?.to?.lat ?? (lat + 0.5);
      const toLng = coords?.to?.lng ?? (lng + 0.5);
      const steps = 40; 
      const dLat = (toLat - lat) / steps;
      const dLng = (toLng - lng) / steps;
      let step = 0;

      simIntervalRef.current = setInterval(() => {
        step++;
        lat = lat + dLat;
        lng = lng + dLng;
        const newLoc = { lat, lng };
        setLocation(newLoc);
        trackingAPI.updateLocation(id, newLoc).catch(console.error); // Persist GPS
        
        // Advance status based on time (simulating GPS triggers)
        if (step === 10) updateStatus('Pickup Started');
        if (step === 20) updateStatus('In Transit');
        if (step === 30) updateStatus('Near Destination');
        if (step === 40) {
          updateStatus('Delivered');
          clearInterval(simIntervalRef.current);
          setIsSharing(false);
        }
      }, 2000); 
    } else {
      if (!navigator.geolocation) { toast.error('Geolocation not supported.'); return; }
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(newLoc);
          trackingAPI.updateLocation(id, newLoc).catch(console.error);
        },
        (err) => toast.error('GPS error: ' + err.message),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
      );
    }
  };

  const stopTracking = () => {
    setIsSharing(false);
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
  };
  
  const handlePayment = async (type) => {
    if (!shipment) return;
    try {
      // For drivers, "Requesting" payment just sends a notification to the shipper in a real app.
      // Here we simulate the request being sent successfully.
      toast.success(`${type} payment request sent to the organization successfully!`);
      // Note: We don't update the payment status here because the organization has to actually pay it.
    } catch (err) {
      toast.error(`Failed to send ${type} payment request`);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, border: '4px solid #dbeafe', borderTopColor: '#1E3A8A', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }}></div>
          <p style={{ color: '#64748b', fontWeight: 500, marginTop: 16 }}>Loading workflow...</p>
        </div>
      </main>
    </div>
  );

  if (!shipment) return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', flexDirection: 'column', gap: 16 }}>
        <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 48, color: '#ef4444' }}></i>
        <p style={{ color: '#1e293b', fontWeight: 700, fontSize: 18 }}>Shipment not found</p>
        <button onClick={() => router.back()} className="btn-blue" style={{ padding: '10px 24px' }}>← Go Back</button>
      </main>
    </div>
  );

  const pickup = shipment.pickup || shipment.fromLocation || '—';
  const drop = shipment.drop || shipment.toLocation || '—';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar />
      <main className="p-mobile-16" style={{ flex: 1, padding: '28px 24px 80px', background: '#f8fafc', overflowY: 'auto' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Back & Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#1E3A8A', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
            <i className="fa-solid fa-arrow-left"></i> Back to Shipments
          </button>
          <span style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#e0f2fe', color: '#075985' }}>
            ID: {id}
          </span>
        </div>

        {/* Main Status Banner */}
        <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #162d6e 100%)', borderRadius: 16, padding: '24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
              <i className="fa-solid fa-truck-fast" style={{ color: '#F97316' }}></i>
              Driver Workflow
            </h1>
            <p style={{ fontSize: 14, opacity: 0.9, marginTop: 8 }}>
              <b>{pickup}</b> <i className="fa-solid fa-arrow-right" style={{ color: '#F97316', margin: '0 8px' }}></i> <b>{drop}</b>
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Current Status</p>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#bbf7d0', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-circle-check"></i> {currentStatus}
            </span>
          </div>
        </div>
        
        <div className="grid-2" style={{ gap: 20 }}>
           {/* Shipment Details */}
           <div className="card" style={{ padding: 20 }}>
             <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
               <i className="fa-solid fa-box" style={{ color: '#1E3A8A', marginRight: 8 }}></i> Shipment Details
             </h3>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
               <div>
                 <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Goods Type</p>
                 <p style={{ fontSize: 14, color: '#1e293b', fontWeight: 500 }}>{shipment.goodsType || 'N/A'}</p>
               </div>
               <div>
                 <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Weight</p>
                 <p style={{ fontSize: 14, color: '#1e293b', fontWeight: 500 }}>{shipment.weight || shipment.totalWeight || 0} kg</p>
               </div>
               <div>
                 <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Bundles</p>
                 <p style={{ fontSize: 14, color: '#1e293b', fontWeight: 500 }}>{shipment.bundles || 'N/A'}</p>
               </div>
               <div>
                 <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Cost</p>
                 <p style={{ fontSize: 14, color: '#16a34a', fontWeight: 700 }}>₹{shipment.cost?.total || 'N/A'}</p>
               </div>
             </div>
           </div>

           {/* Payment Status & Actions */}
           <div className="card" style={{ padding: 20 }}>
             <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
               <i className="fa-solid fa-wallet" style={{ color: '#16a34a', marginRight: 8 }}></i> Payment Actions
             </h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                 <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>10% Advance</span>
                 {paymentStatus === 'Pending Advance' ? (
                   <button onClick={() => handlePayment('Advance')} disabled={currentStatus === 'Pending'} className="btn-blue" style={{ padding: '6px 16px', fontSize: 12, opacity: currentStatus === 'Pending' ? 0.5 : 1 }}>
                     Request ₹{Math.round((shipment.cost?.total || 0) * 0.1)}
                   </button>
                 ) : (
                   <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}><i className="fa-solid fa-check"></i> Paid</span>
                 )}
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                 <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>90% Final</span>
                 {paymentStatus !== 'Fully Paid' ? (
                   <button onClick={() => handlePayment('Final')} disabled={currentStatus !== 'Delivered'} className="btn-blue" style={{ padding: '6px 16px', fontSize: 12, opacity: currentStatus !== 'Delivered' ? 0.5 : 1 }}>
                     Request ₹{Math.round((shipment.cost?.total || 0) * 0.9)}
                   </button>
                 ) : (
                   <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}><i className="fa-solid fa-check-double"></i> Paid</span>
                 )}
               </div>
             </div>
           </div>
        </div>

        {/* GPS Tracking Controls */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                <i className="fa-solid fa-satellite" style={{ color: '#1E3A8A', marginRight: 8 }}></i> 
                Live GPS Transmission
              </h3>
              <p style={{ fontSize: 13, color: '#64748b' }}>
                {isSharing ? 'Currently sharing your live location with the organization.' : 'Start journey to begin transmitting GPS coordinates.'}
              </p>
              {location && isSharing && (
                 <p style={{ fontSize: 12, color: '#16a34a', marginTop: 8, fontWeight: 500 }}>
                   <i className="fa-solid fa-location-crosshairs fa-spin"></i> {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                 </p>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
               <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: isSharing ? 'not-allowed' : 'pointer' }}>
                 <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Demo Simulation Mode</span>
                 <div onClick={() => !isSharing && setSimulate(!simulate)} style={{
                   width: 44, height: 24, borderRadius: 12, background: simulate ? '#F97316' : '#cbd5e1', position: 'relative', transition: '0.2s'
                 }}>
                   <div style={{
                     position: 'absolute', top: 3, left: simulate ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: '0.2s'
                   }} />
                 </div>
               </label>
               
               {!isSharing ? (
                 <button onClick={startTracking} className="btn-primary" style={{ padding: '10px 24px', fontWeight: 700 }}>
                   <i className="fa-solid fa-play"></i> Start Journey
                 </button>
               ) : (
                 <button onClick={stopTracking} style={{ padding: '10px 24px', fontWeight: 700, background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                   <i className="fa-solid fa-stop"></i> Stop Journey
                 </button>
               )}
            </div>
          </div>
        </div>

        {/* Journey Progress */}
        <div className="card" style={{ padding: '24px' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 24 }}>
            <i className="fa-solid fa-route" style={{ color: '#F97316', marginRight: 8 }}></i> Journey Progress
          </p>
          <div className="responsive-table-wrap" style={{ border: 'none', boxShadow: 'none', marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 900, paddingBottom: 8 }}>
              {ADVANCED_STATUS_STAGES.map((stage, idx) => {
                const state = getStageState(currentStatus, stage.label);
                return (
                  <div key={stage.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 80, position: 'relative' }}>
                    {idx < ADVANCED_STATUS_STAGES.length - 1 && (
                      <div style={{ position: 'absolute', top: 16, left: '50%', width: '100%', height: 3, zIndex: 1, background: state === 'completed' ? '#22c55e' : '#e2e8f0' }} />
                    )}
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, zIndex: 2, position: 'relative',
                      background: state === 'completed' ? '#d1fae5' : state === 'active' ? '#dbeafe' : '#f1f5f9',
                      border: state === 'completed' ? '2px solid #22c55e' : state === 'active' ? '2px solid #1E3A8A' : '2px solid #e2e8f0',
                      boxShadow: state === 'active' ? '0 0 0 4px #bfdbfe' : 'none',
                      color: state === 'completed' ? '#16a34a' : state === 'active' ? '#1E3A8A' : '#94a3b8',
                    }}>
                      <i className={`fa-solid ${stage.icon}`}></i>
                    </div>
                    <p style={{ fontSize: 10, textAlign: 'center', marginTop: 8, whiteSpace: 'normal', maxWidth: 80, lineHeight: 1.2, fontWeight: state === 'active' ? 700 : 600, color: state === 'completed' ? '#16a34a' : state === 'active' ? '#1E3A8A' : '#94a3b8' }}>
                      {stage.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Timeline & Advanced Controls */}
        <div className="grid-2" style={{ gap: 20 }}>
          {/* Advanced Controls */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                <i className="fa-solid fa-sliders" style={{ color: '#1E3A8A', marginRight: 8 }}></i> Manual Controls
              </h3>
              <button onClick={() => setShowAdvanced(!showAdvanced)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                {showAdvanced ? 'Hide' : 'Show'}
              </button>
            </div>
            
            {showAdvanced ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {['Pickup Started', 'In Transit', 'Near Destination', 'Delivered'].map(status => (
                  <button key={status} onClick={() => updateStatus(status)} disabled={currentStatus === status} className="btn-white" style={{
                     padding: '12px', fontSize: 13, fontWeight: 600, textAlign: 'center',
                     border: currentStatus === status ? '2px solid #1E3A8A' : '1px solid #cbd5e1',
                     background: currentStatus === status ? '#f8fafc' : 'white',
                     color: currentStatus === status ? '#1E3A8A' : '#475569',
                     opacity: currentStatus === status ? 0.6 : 1,
                  }}>
                    {status}
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
                Advanced manual status overrides are hidden.
              </p>
            )}
          </div>

          {/* Timeline */}
          <div className="card" style={{ padding: '20px 22px', overflowY: 'auto', maxHeight: 300 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 18 }}>
              <i className="fa-solid fa-clock-rotate-left" style={{ color: '#1E3A8A', marginRight: 8 }}></i>
              Tracking Timeline
            </p>
            {timeline.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No events recorded.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {timeline.map((event, idx, arr) => (
                  <div key={`${event.status}-${idx}`} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3, flexShrink: 0 }}>
                      <div style={{
                        width: 12, height: 12, borderRadius: '50%',
                        background: idx === arr.length - 1 ? '#1E3A8A' : '#cbd5e1',
                        border: idx === arr.length - 1 ? '2px solid #bfdbfe' : '2px solid #e2e8f0',
                      }} />
                      {idx !== arr.length - 1 && <div style={{ width: 2, flex: 1, background: '#e2e8f0', marginTop: 4, minHeight: 24 }} />}
                    </div>
                    <div style={{ paddingBottom: 18, flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: idx === arr.length - 1 ? '#1E3A8A' : '#1e293b', marginBottom: 2 }}>{event.status}</p>
                      <p style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(event.timestamp).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
      </main>
    </div>
  );
}
