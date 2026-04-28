const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Room    = require('../models/Room');
const { verifyToken } = require('../middleware/authMiddleware');

// POST /api/bookings
// Auto-assigns the first conflict-free room of the requested roomType.
// This allows multiple rooms of the same type to be independently booked
// for the same dates — only blocking when ALL rooms of that type are taken.
router.post('/', verifyToken, async (req, res) => {
  try {
    const { roomType, checkIn, checkOut, guests, customerId, totalPrice, nights, roomIcon } = req.body;

    if (!roomType || !checkIn || !checkOut) {
      return res.status(400).json({ message: 'roomType, checkIn, and checkOut are required.' });
    }

    // 1. Get all Available rooms of this type
    const candidateRooms = await Room.find({ type: roomType, status: 'Available' });

    if (candidateRooms.length === 0) {
      return res.status(409).json({ message: `No ${roomType} rooms are currently available.` });
    }

    // 2. Find the first candidate room that has NO confirmed booking overlapping these dates
    let assignedRoom = null;
    for (const room of candidateRooms) {
      const conflict = await Booking.findOne({
        roomId: room.roomNumber,
        status:  { $in: ['Confirmed', 'Pending Payment'] },
        checkIn:  { $lt: new Date(checkOut) },
        checkOut: { $gt: new Date(checkIn) }
      });
      if (!conflict) {
        assignedRoom = room;
        break;
      }
    }

    // 3. If every room of this type is taken for these dates → return conflict
    if (!assignedRoom) {
      return res.status(409).json({
        message: `All ${roomType} rooms are fully booked for these dates. Please try different dates.`
      });
    }

    // 4. Create the booking against the auto-assigned room
    const newBooking = new Booking({
      customerId,
      roomId:     assignedRoom.roomNumber,
      roomType:   assignedRoom.type,
      roomIcon:   assignedRoom.icon || roomIcon || '',
      checkIn,
      checkOut,
      guests:     Number(guests),
      totalPrice: Number(totalPrice),
      nights:     Number(nights),
      status:     'Confirmed'
    });

    const savedBooking = await newBooking.save();

    // Automatically update the assigned room's status to 'Booked'
    await Room.findOneAndUpdate(
      { roomNumber: assignedRoom.roomNumber },
      { status: 'Booked' }
    );

    res.status(201).json(savedBooking);
  } catch (err) {
    res.status(500).json({ message: 'Server error creating booking', error: err.message });
  }
});

// GET /api/bookings
// Admin gets all bookings. Pass ?customerId=email to filter by customer.
router.get('/', verifyToken, async (req, res) => {
  try {
    const { customerId } = req.query;
    const filter = customerId ? { customerId } : {};
    const bookings = await Booking.find(filter).sort({ bookedOn: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching bookings', error: err.message });
  }
});

// PUT /api/bookings/:id
// Modify an existing booking (change dates / guests)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { checkIn, checkOut, guests } = req.body;
    const bookingId = req.params.id;

    // Find existing booking
    const existing = await Booking.findById(bookingId);
    if (!existing) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    // ── Conflict check (exclude self) ────────────────────────────────────────
    const conflict = await Booking.findOne({
      _id:    { $ne: bookingId },
      roomId: existing.roomId,
      status: { $in: ['Confirmed', 'Pending Payment'] },
      checkIn:  { $lt: new Date(checkOut) },
      checkOut: { $gt: new Date(checkIn) }
    });

    if (conflict) {
      return res.status(409).json({
        message: `Room is already booked from ${new Date(conflict.checkIn).toDateString()} to ${new Date(conflict.checkOut).toDateString()}. Please choose different dates.`
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Recalculate nights and price
    const nights = Math.max(1, Math.ceil(
      (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
    ));
    const totalPrice = Math.round(nights * existing.totalPrice / existing.nights);

    const updated = await Booking.findByIdAndUpdate(
      bookingId,
      { checkIn, checkOut, guests: Number(guests), nights, totalPrice },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error modifying booking', error: err.message });
  }
});

// PATCH /api/bookings/:id/cancel
// Updates a booking status to 'Cancelled'
router.patch('/:id/cancel', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'Cancelled' },
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server error cancelling booking', error: err.message });
  }
});

// GET /api/bookings/stats
// Admin analytics
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const allBookings = await Booking.find({ status: { $ne: 'Cancelled' } });
    const allRooms = await Room.find();

    // 1. Total Revenue
    const totalRevenue = allBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    // 2. Revenue by Month (Last 6 Months)
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthLabel = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      const month = d.getMonth();

      const rev = allBookings
        .filter(b => {
          const bd = new Date(b.bookedOn);
          return bd.getMonth() === month && bd.getFullYear() === year;
        })
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      
      monthlyRevenue.push({ name: monthLabel, revenue: rev });
    }

    // 3. Occupancy
    const occupiedCount = allRooms.filter(r => r.status === 'Booked').length;
    const maintenanceCount = allRooms.filter(r => r.status === 'Maintenance').length;
    const availableCount = allRooms.length - occupiedCount - maintenanceCount;

    // 4. Room Type Popularity
    const roomTypeStats = {};
    allBookings.forEach(b => {
      roomTypeStats[b.roomType] = (roomTypeStats[b.roomType] || 0) + 1;
    });
    const popularity = Object.keys(roomTypeStats).map(type => ({
      name: type,
      value: roomTypeStats[type]
    }));

    res.json({
      totalRevenue,
      monthlyRevenue,
      occupancy: [
        { name: 'Available', value: availableCount },
        { name: 'Occupied', value: occupiedCount },
        { name: 'Maintenance', value: maintenanceCount }
      ],
      popularity
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching stats', error: err.message });
  }
});

// PATCH /api/bookings/:id/payment
// User uploads payment proof
router.patch('/:id/payment', verifyToken, async (req, res) => {
  try {
    const { paymentProof } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { paymentProof, paymentStatus: 'Pending', status: 'Pending Payment' },
      { new: true }
    );
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Error updating payment proof', error: err.message });
  }
});

// PATCH /api/bookings/:id/verify
// Admin verifies payment
router.patch('/:id/verify', verifyToken, async (req, res) => {
  try {
    const { paymentStatus } = req.body; // 'Verified' or 'Declined'
    const status = paymentStatus === 'Verified' ? 'Confirmed' : 'Cancelled';
    
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { paymentStatus, status },
      { new: true }
    );

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Automatically update the room status based on verification
    if (paymentStatus === 'Verified') {
      await Room.findOneAndUpdate({ roomNumber: booking.roomId }, { status: 'Booked' });
    } else if (paymentStatus === 'Declined') {
      await Room.findOneAndUpdate({ roomNumber: booking.roomId }, { status: 'Available' });
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Error verifying payment', error: err.message });
  }
});

module.exports = router;
