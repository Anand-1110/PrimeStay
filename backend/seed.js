const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Room = require('./models/Room');
const Booking = require('./models/Booking');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_management')
  .then(() => console.log("MongoDB Connected for Seeding"))
  .catch(err => { console.error("MongoDB Connection Error:", err); process.exit(1); });

const seedDatabase = async () => {
  try {
    // 1. Clear existing data
    await User.deleteMany({});
    await Room.deleteMany({});
    await Booking.deleteMany({});
    console.log("✅ Cleared existing database records.");

    // 2. Insert Admin User
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash("admin123", 12);
    await User.create({
      name: "Hotel Admin",
      email: "admin@johnvilla.com",
      password: hashedPassword, // Strict password
      role: "admin",
      memberSince: "2026"
    });
    console.log("✅ Admin user created (admin@johnvilla.com).");

    // 3. Insert Rooms (Generate 30 Rooms across 4 categories)
    const roomTypes = [
      { type: "Single", price: 1500, capacity: 1, icon: "🛏️", desc: "Cozy single room with all essential amenities." },
      { type: "Double", price: 2500, capacity: 2, icon: "🛎️", desc: "Spacious double room with premium furnishings." },
      { type: "Deluxe", price: 3500, capacity: 3, icon: "✨", desc: "Enhanced comfort with premium features." },
      { type: "Suite", price: 5000, capacity: 4, icon: "👑", desc: "Grand suite with luxury lounge and city views." }
    ];

    const generatedRooms = [];
    for (let i = 1; i <= 30; i++) {
        const floor = Math.floor((i - 1) / 10) + 1;
        const roomNumInFloor = (i - 1) % 10 + 1;
        const roomNumber = `${floor}${roomNumInFloor < 10 ? '0' : ''}${roomNumInFloor}`;
        
        const typeInfo = roomTypes[(i - 1) % roomTypes.length];
        
        generatedRooms.push({
            roomNumber: roomNumber,
            type: typeInfo.type,
            price: typeInfo.price,
            capacity: typeInfo.capacity,
            description: typeInfo.desc,
            status: "Available",
            icon: typeInfo.icon,
            featured: i % 7 === 0, // Mark some rooms as featured
            features: ["Free Wi-Fi", "Air Conditioning", "Flat Screen TV", "Room Service"]
        });
    }

    await Room.insertMany(generatedRooms);
    console.log("✅ 30 Hotel Rooms successfully added.");

    console.log("🎉 Database Seeding Complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
