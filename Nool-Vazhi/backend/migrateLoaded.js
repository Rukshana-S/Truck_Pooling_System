require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Shipment = require('./models/Shipment');

async function migrateLoaded() {
  console.log('Connecting to database...', process.env.MONGO_URI);
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.');

  console.log('Migrating shipments with status Loaded...');
  const result = await Shipment.updateMany(
    { currentStatus: 'Loaded' },
    { $set: { currentStatus: 'Pickup Started' } }
  );
  
  console.log(`Migration complete. Modified ${result.modifiedCount} shipments.`);
  mongoose.disconnect();
}

migrateLoaded().catch(err => {
  console.error('Migration failed:', err);
  mongoose.disconnect();
});
