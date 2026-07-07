require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function migrate() {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected.');

  console.log('Migrating drivers...');
  const drivers = await User.find({ role: 'driver' });
  let migratedCount = 0;

  for (const driver of drivers) {
    let needsSave = false;

    // Migrate capacity -> vehicleCapacityKg and vehicleCapacity
    if (driver.capacity > 0 && driver.vehicleCapacityKg === 0) {
      if (driver.capacityUnit === 'tons') {
        // If it was tons, old logic usually stored tons in 'capacity' or kg in 'capacity' depending on when it was saved.
        // Let's assume the old logic multiplied by 1000 and saved it in capacity, 
        // e.g. 2 tons => capacity = 2000, capacityUnit = tons.
        // So vehicleCapacity = 2, vehicleCapacityKg = 2000.
        // Wait, what if capacity is already 2 (meaning it didn't multiply)? 
        // If capacity = 2000, it's 2000 tons? No, it's 2 tons.
        const isKgVal = driver.capacity >= 50; 
        if (isKgVal) {
          driver.vehicleCapacityKg = driver.capacity;
          driver.vehicleCapacity = driver.capacity / 1000;
        } else {
          driver.vehicleCapacity = driver.capacity;
          driver.vehicleCapacityKg = driver.capacity * 1000;
        }
      } else {
        // capacityUnit === 'kg'
        driver.vehicleCapacity = driver.capacity;
        driver.vehicleCapacityKg = driver.capacity;
      }
      needsSave = true;
    }

    // Set defaults if not present
    if (!driver.availability) {
      driver.availability = 'Available';
      needsSave = true;
    }
    if (!driver.fuelType) {
      driver.fuelType = '';
      needsSave = true;
    }
    if (!driver.currentLocation || !driver.currentLocation.raw) {
      driver.currentLocation = {
        city: '',
        state: '',
        coordinates: { lat: null, lng: null },
        raw: driver.location || ''
      };
      needsSave = true;
    }

    if (needsSave) {
      await driver.save();
      migratedCount++;
    }
  }

  console.log(`Migration complete. Migrated ${migratedCount} drivers.`);
  mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  mongoose.disconnect();
});
