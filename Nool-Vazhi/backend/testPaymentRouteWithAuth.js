const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const Payment = require('./models/Payment');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Find a shipper
  const shipper = await User.findOne({ role: 'organization' });
  const token = jwt.sign({ id: shipper._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  
  // Find a pending advance payment
  const p = await Payment.findOne({ status: 'Pending Advance' });
  if (!p) return console.log('No pending advance payment found');
  
  console.log('Testing shipment id:', p.shipmentId);
  const res = await axios.get(`http://localhost:5000/api/payments/shipment/${p.shipmentId}`, {
     headers: { Authorization: `Bearer ${token}` }
  }).catch(e => e.response);
  
  console.log('Status:', res.status);
  console.log('Data:', JSON.stringify(res.data, null, 2));
  process.exit(0);
}
test();
