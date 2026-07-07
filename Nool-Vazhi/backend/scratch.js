const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
require('dotenv').config();

async function testAll() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const org = await User.findOne({ role: 'organization' });
  const driver = await User.findOne({ role: 'driver' });
  
  const orgToken = org ? jwt.sign({ id: org._id }, process.env.JWT_SECRET, { expiresIn: '1d' }) : null;
  const driverToken = driver ? jwt.sign({ id: driver._id }, process.env.JWT_SECRET, { expiresIn: '1d' }) : null;

  const endpoints = [
    { url: '/api/auth/profile', tokens: [orgToken, driverToken] },
    { url: '/api/shipments', tokens: [orgToken, driverToken] },
    { url: '/api/shipments/stats', tokens: [orgToken] },
    { url: '/api/shipments/available', tokens: [driverToken] },
    { url: '/api/shipments/driver-stats', tokens: [driverToken] },
    { url: '/api/auctions/my', tokens: [orgToken] },
    { url: '/api/auctions/open', tokens: [driverToken] },
    { url: '/api/auctions/driver/selections', tokens: [driverToken] },
    { url: '/api/earnings?filter=today', tokens: [driverToken] },
    { url: '/api/trips/my-trips', tokens: [driverToken] },
    { url: '/api/trips/my-bookings', tokens: [orgToken] },
    { url: '/api/trips/locations', tokens: [orgToken, driverToken] }
  ];

  for (const ep of endpoints) {
    for (const token of ep.tokens) {
      if (!token) continue;
      try {
        const res = await fetch(`http://localhost:5000${ep.url}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 500) {
          const data = await res.json();
          console.log(`500 ERROR on ${ep.url}:`, data.message);
        } else if (res.status !== 200) {
          console.log(`${res.status} on ${ep.url}`);
        }
      } catch (err) {
        console.log(`Fetch failed on ${ep.url}:`, err.message);
      }
    }
  }
  
  console.log("Done testing all GET endpoints");
  mongoose.disconnect();
}
testAll();
