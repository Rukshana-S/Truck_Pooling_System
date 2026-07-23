require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Payment = require('./models/Payment');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const payments = await Payment.find().sort({ createdAt: -1 }).limit(3);
  payments.forEach(p => {
    console.log(`ID: ${p._id}, type: ${p.type}, status: ${p.status}, razorpayOrderId: ${p.razorpayOrderId}, shipmentId: ${p.shipmentId}`);
  });
  process.exit(0);
}
test();
