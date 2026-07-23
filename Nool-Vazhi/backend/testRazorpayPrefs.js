const axios = require('axios');
require('dotenv').config({ path: './.env' });

async function test() {
  const url = `https://api.razorpay.com/v2/standard_checkout/preferences?key_id=${process.env.RAZORPAY_KEY_ID}&order_id=order_TGtaEPOEjc3HIG`;
  
  try {
    const res = await axios.get(url);
    console.log('Success:', res.data);
  } catch (err) {
    console.log('Error:', err.response?.status, err.response?.data);
  }
}
test();
