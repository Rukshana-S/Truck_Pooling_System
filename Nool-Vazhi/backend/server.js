const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

io.on('connection', (socket) => {
  // Join a specific auction room
  socket.on('join_auction', (auctionId) => {
    socket.join(auctionId);
  });
  
  // Register user for personal notifications
  socket.on('register_user', (userId) => {
    socket.join(userId);
  });
  
  socket.on('leave_auction', (auctionId) => {
    socket.leave(auctionId);
  });
});

// Attach io to req object
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/shipments', require('./routes/shipmentRoutes'));
app.use('/api/trips', require('./routes/tripRoutes'));
app.use('/api/auctions', require('./routes/auctionRoutes'));
app.use('/api/tracking', require('./routes/trackingRoutes'));
app.use('/api/pricing', require('./routes/pricingRoutes'));
app.use('/api/earnings', require('./routes/earningsRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/ratings', require('./routes/ratingRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/return-loads', require('./routes/returnLoadRoutes'));
// Health check
app.get('/', (req, res) => res.json({ message: 'Nool-Vazhi API running' }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    server.listen(process.env.PORT, () =>
      console.log(`Server running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => console.error(err));
