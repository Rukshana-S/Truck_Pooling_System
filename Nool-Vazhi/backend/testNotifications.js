require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Notification = require('./models/Notification');

async function checkNotifications() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const notifs = await Notification.find().sort({ createdAt: -1 }).limit(5);
  console.log('Latest 5 notifications:');
  notifs.forEach(n => {
    console.log(`ID: ${n._id}, User: ${n.user}, Read: ${n.read}, Title: ${n.title}`);
  });

  process.exit(0);
}

checkNotifications();
