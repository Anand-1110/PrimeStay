const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes    = require('./routes/authRoutes');
const roomRoutes    = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const uploadRoutes  = require('./routes/uploadRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded room images as static files
// Accessible at: http://localhost:5000/uploads/<filename>
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_management')
  .then(() => console.log('✅ MongoDB Connection established!'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// API Routes
app.use('/api/auth',     authRoutes);
app.use('/api/rooms',    roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/upload',   uploadRoutes);

// Status Route
app.get('/', (req, res) => {
  res.send('John Villa Hotel API is live and running!');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Hotel API Server running on http://localhost:${PORT}`);
});
