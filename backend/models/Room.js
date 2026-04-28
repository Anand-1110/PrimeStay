const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true },
  type: { type: String, enum: ['Single', 'Double', 'Suite', 'Deluxe'], required: true },
  price: { type: Number, required: true },
  capacity: { type: Number, required: true },
  description: { type: String },
  status: { type: String, enum: ['Available', 'Booked', 'Maintenance'], default: 'Available' },
  image: { type: String, default: '' },
  icon: { type: String },
  features: [{ type: String }],
  featured: { type: Boolean, default: false }
});

module.exports = mongoose.model('Room', roomSchema);
