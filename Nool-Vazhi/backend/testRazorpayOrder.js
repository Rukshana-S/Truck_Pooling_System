require('dotenv').config({ path: './.env' });
const Razorpay = require('razorpay');

async function test() {
  const rzp = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  
  try {
    const order = await rzp.orders.fetch('order_TGtaEPOEjc3HIG');
    console.log(JSON.stringify(order, null, 2));
  } catch (err) {
    console.log('Error:', err);
  }
}
test();
