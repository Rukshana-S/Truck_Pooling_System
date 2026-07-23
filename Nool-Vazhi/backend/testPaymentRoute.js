const axios = require('axios');
require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Payment = require('./models/Payment');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const p = await Payment.findOne();
  if (!p) return console.log('No payments found');
  
  console.log('Testing shipment id:', p.shipmentId);
  const res = await axios.get(`http://localhost:5000/api/payments/shipment/${p.shipmentId}`, {
     // I might need token, I'll just check if it returns 401 instead of 400
  }).catch(e => e.response);
  
  console.log('Status:', res.status);
  console.log('Data:', res.data);
  process.exit(0);
}
test();
