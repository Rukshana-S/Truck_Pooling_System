const axios = require('axios');
async function test() {
  const url = `https://api.razorpay.com/v2/standard_checkout/preferences?key_id=rzp_test_TAbp16UZYjRwe5&order_id=order_invalid`;
  try {
    const res = await axios.get(url);
    console.log('Success:', res.data);
  } catch (err) {
    console.log('Error:', err.response?.status, err.response?.data);
  }
}
test();
