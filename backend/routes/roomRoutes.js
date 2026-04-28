const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// GET /api/rooms
// Public — fetches all rooms for the frontend to display
router.get('/', async (req, res) => {
  try {
    const rooms = await Room.find();
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching rooms', error: err.message });
  }
});

// PATCH /api/rooms/:roomNumber/status
// Admin — change room status (Available / Booked / Maintenance)
router.patch('/:roomNumber/status', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const room = await Room.findOneAndUpdate(
      { roomNumber: req.params.roomNumber },
      { status },
      { new: true }
    );
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating room status', error: err.message });
  }
});

// PUT /api/rooms/:roomNumber
// Admin — update room details (image URL, description, price, features, etc.)
router.put('/:roomNumber', verifyToken, requireAdmin, async (req, res) => {
  try {
    const allowedFields = ['image', 'description', 'price', 'features', 'featured'];
    const updates = {};
    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const room = await Room.findOneAndUpdate(
      { roomNumber: req.params.roomNumber },
      updates,
      { new: true }
    );
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating room', error: err.message });
  }
});

module.exports = router;
