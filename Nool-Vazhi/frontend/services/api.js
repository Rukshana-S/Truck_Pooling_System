import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const user = JSON.parse(localStorage.getItem('nv_user') || '{}');
    if (user.token) config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

export const authAPI = {
  registerOrg: (data) => API.post('/auth/register/organization', data),
  registerDriver: (data) => API.post('/auth/register/driver', data),
  loginOrg: (data) => API.post('/auth/login/organization', data),
  loginDriver: (data) => API.post('/auth/login/driver', data),
  forgotPassword: (data) => API.post('/auth/forgot-password', data),
  resetPassword: (userId, token, data) => API.post(`/auth/reset-password/${userId}/${token}`, data),
  profile: () => API.get('/auth/profile'),
  updateProfile: (data) => API.put('/auth/profile', data),
  deleteVehicle: () => API.delete('/auth/vehicle'),
  replaceDocument: (data) => API.post('/auth/document', data),
};

export const shipmentAPI = {
  create: (data) => API.post('/shipments', data),
  getAll: () => API.get('/shipments'),
  getById: (id) => API.get(`/shipments/${id}`),
  update: (id, data) => API.put(`/shipments/${id}`, data),
  delete: (id) => API.delete(`/shipments/${id}`),
  updateStatus: (id, data) => API.put(`/shipments/${id}/status`, data), // Used in driver accept
  getStats: () => API.get('/shipments/stats'),
  getShipperAnalytics: () => API.get('/shipments/analytics'),
  getDriverStats: () => API.get('/shipments/driver-stats'),
  getAvailable: () => API.get('/shipments/available'),
  accept: (id) => API.put(`/shipments/${id}/accept`),
  updateLocation: (id, data) => API.put(`/shipments/${id}/location`, data),
};

export const trackingAPI = {
  track: (id) => API.get(`/tracking/${id}`),
};

export const pricingAPI = {
  estimate: (bundles, season) => API.get(`/pricing/estimate?bundles=${bundles}&season=${season}`),
  suggest: (from, to, weight) => API.get(`/pricing/suggest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&weight=${weight}`),
};

export const ratingAPI = {
  add: (data) => API.post('/ratings', data),
  getForUser: (userId) => API.get(`/ratings/user/${userId}`),
  update: (id, data) => API.put(`/ratings/${id}`, data),
};

export const adminAPI = {
  getUsers: () => API.get('/admin/users'),
  getUserById: (id) => API.get(`/admin/users/${id}`),
  updateUser: (id, data) => API.put(`/admin/users/${id}`, data),
  deleteUser: (id) => API.delete(`/admin/users/${id}`),
  suspendUser: (id, data) => API.put(`/admin/users/${id}/suspend`, data),
  approveKyc: (id, data) => API.put(`/admin/users/${id}/approve`, data),
  getShipments: () => API.get('/admin/shipments'),
  deleteShipment: (id) => API.delete(`/admin/shipments/${id}`),
  getAuctions: () => API.get('/admin/auctions'),
  cancelAuction: (id) => API.put(`/admin/auctions/${id}/cancel`),
};

export const auctionAPI = {
  // Shipper
  create: (data) => API.post('/auctions', data),
  myAuctions: () => API.get('/auctions/my'),
  getBids: (id) => API.get(`/auctions/${id}/bids`),
  selectDrivers: (id, data) => API.post(`/auctions/${id}/select`, data),
  closeAuction: (id) => API.put(`/auctions/${id}/close`),
  update: (id, data) => API.put(`/auctions/${id}`, data),
  cancel: (id) => API.put(`/auctions/${id}/cancel`),
  delete: (id) => API.delete(`/auctions/${id}`),
  // Driver
  openAuctions: () => API.get('/auctions/open'),
  placeBid: (data) => API.post('/auctions/bid', data),
  withdrawBid: (auctionId) => API.delete(`/auctions/${auctionId}/bid`),
  mySelections: () => API.get('/auctions/driver/selections'),
  respond: (data) => API.post('/auctions/driver/respond', data),
  updateLocation: (id, data) => API.put(`/auctions/${id}/update-location`, data),
};

export const earningsAPI = {
  get: (filter = 'today') => API.get(`/earnings?filter=${filter}`),
  updatePayment: (bookingId, data) => API.put(`/earnings/${bookingId}/payment`, data),
};

export const tripAPI = {
  create: (data) => API.post('/trips', data),
  search: (from, to) => API.get(`/trips/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  book: (data) => API.post('/trips/book', data),
  myTrips: () => API.get('/trips/my-trips'),
  myBookings: () => API.get('/trips/my-bookings'),
  tripBookings: (id) => API.get(`/trips/${id}/bookings`),
  updateStatus: (id, status) => API.put(`/trips/${id}/status`, { status }),
  updateLocation: (id, data) => API.put(`/trips/${id}/location`, data),
  cancelTrip: (id) => API.put(`/trips/${id}/cancel`),
  acceptBooking: (bookingId) => API.post('/trips/accept-booking', { bookingId }),
  startTrip: (id) => API.put(`/trips/${id}/start`),
  updateBookingStatus: (bookingId, deliveryStatus) => API.put(`/trips/booking/${bookingId}/status`, { deliveryStatus }),
  updateBooking: (bookingId, data) => API.put(`/trips/bookings/${bookingId}`, data),
  cancelBooking: (bookingId) => API.put(`/trips/bookings/${bookingId}/cancel`),
  deleteBooking: (bookingId) => API.delete(`/trips/bookings/${bookingId}`),
  driverStats: () => API.get('/trips/driver-stats'),
  locations: () => API.get('/trips/locations'),
};

export const notificationAPI = {
  get: (page = 1, limit = 50, filter = 'all') => API.get(`/notifications?page=${page}&limit=${limit}&filter=${filter}`),
  markAsRead: () => API.put('/notifications'),
  markSingleAsRead: (id) => API.put(`/notifications/${id}`),
  delete: (id) => API.delete(`/notifications/${id}`),
  deleteAll: () => API.delete('/notifications'),
};

export const returnLoadAPI = {
  // Common
  getAnalytics: () => API.get('/return-loads/analytics'),
  delete: (id) => API.delete(`/return-loads/${id}`),

  // Driver
  getRecommendations: (currentLocation) => API.get(`/return-loads/recommendations?currentLocation=${encodeURIComponent(currentLocation)}`),
  requestReturnLoad: (data) => API.post('/return-loads/request', data),
  getDriverRequests: () => API.get('/return-loads/driver'),
  updateDriverRequest: (id, data) => API.put(`/return-loads/driver/${id}`, data),

  // Organization
  getOrgRequests: () => API.get('/return-loads/organization'),
  updateOrgRequest: (id, data) => API.put(`/return-loads/organization/${id}`, data),
};

export default API;
