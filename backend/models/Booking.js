const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customerId: { type: String, required: true }, // Will act as email or user_id mapping
  roomId: { type: String, required: true }, // Will link to roomNumber
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  totalPrice: { type: Number, required: true },
  guests: { type: Number, required: true },
  status: { type: String, enum: ['Confirmed', 'Cancelled'], default: 'Confirmed' },
  // UI helpers
  nights: { type: Number },
  roomType: { type: String },
  roomIcon: { type: String },
  bookedOn: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
