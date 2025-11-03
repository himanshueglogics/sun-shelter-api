const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Beach = require('./models/Beach');
const Booking = require('./models/Booking');
const Alert = require('./models/Alert');
const Finance = require('./models/Finance');

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for seeding');

    // Clear existing data
    await User.deleteMany({});
    await Beach.deleteMany({});
    await Booking.deleteMany({});
    await Alert.deleteMany({});
    await Finance.deleteMany({});

    // Create admin user
    const admin = await User.create({
      email: 'nikhil17607@gmail.com',
      password: 'admin123',
      name: 'Admin User',
      role: 'super_admin'
    });
    console.log('Admin user created');

    // Create beaches
    const beaches = await Beach.create([
      {
        name: 'Sunset Cove',
        location: 'California, USA',
        occupancyRate: 92,
        totalCapacity: 150,
        currentBookings: 138,
        status: 'active',
        pricePerDay: 250,
        amenities: ['Parking', 'Restrooms', 'Showers', 'Restaurant']
      },
      {
        name: 'Malibu Beach',
        location: 'California, USA',
        occupancyRate: 75,
        totalCapacity: 200,
        currentBookings: 150,
        status: 'active',
        pricePerDay: 300,
        amenities: ['Parking', 'Restrooms', 'Lifeguard', 'Cafe']
      },
      {
        name: 'Coral Reef',
        location: 'Florida, USA',
        occupancyRate: 60,
        totalCapacity: 120,
        currentBookings: 72,
        status: 'active',
        pricePerDay: 200,
        amenities: ['Snorkeling', 'Parking', 'Restrooms']
      },
      {
        name: 'Golden Sands',
        location: 'Hawaii, USA',
        occupancyRate: 88,
        totalCapacity: 180,
        currentBookings: 158,
        status: 'active',
        pricePerDay: 350,
        amenities: ['Parking', 'Restrooms', 'Showers', 'Bar', 'Water Sports']
      },
      {
        name: 'Blue Lagoon',
        location: 'Miami, USA',
        occupancyRate: 81,
        totalCapacity: 160,
        currentBookings: 130,
        status: 'active',
        pricePerDay: 280,
        amenities: ['Parking', 'Restrooms', 'Restaurant', 'Pool']
      }
    ]);
    console.log('Beaches created');

    // Create bookings
    const bookings = await Booking.create([
      {
        beach: beaches[0]._id,
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        customerPhone: '+1234567890',
        checkInDate: new Date('2024-11-10'),
        checkOutDate: new Date('2024-11-15'),
        numberOfGuests: 4,
        totalAmount: 1250,
        status: 'confirmed',
        paymentStatus: 'paid'
      },
      {
        beach: beaches[1]._id,
        customerName: 'Jane Smith',
        customerEmail: 'jane@example.com',
        customerPhone: '+1234567891',
        checkInDate: new Date('2024-11-12'),
        checkOutDate: new Date('2024-11-18'),
        numberOfGuests: 2,
        totalAmount: 1800,
        status: 'confirmed',
        paymentStatus: 'paid'
      },
      {
        beach: beaches[3]._id,
        customerName: 'Mike Johnson',
        customerEmail: 'mike@example.com',
        customerPhone: '+1234567892',
        checkInDate: new Date('2024-11-08'),
        checkOutDate: new Date('2024-11-12'),
        numberOfGuests: 6,
        totalAmount: 1400,
        status: 'completed',
        paymentStatus: 'paid'
      }
    ]);
    console.log('Bookings created');

    // Create alerts
    const alerts = await Alert.create([
      {
        type: 'info',
        message: 'High booking rate for Sunset Cove.',
        beach: beaches[0]._id,
        createdAt: new Date(Date.now() - 2 * 60 * 1000)
      },
      {
        type: 'warning',
        message: 'Unusual cancellation activity in Malibu Beach.',
        beach: beaches[1]._id,
        createdAt: new Date(Date.now() - 60 * 60 * 1000)
      },
      {
        type: 'success',
        message: 'New beach property "Azure Bay" added.',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
      },
      {
        type: 'warning',
        message: 'Unusual cancellation activity in Malibu Beach.',
        beach: beaches[1]._id,
        createdAt: new Date(Date.now() - 60 * 60 * 1000)
      }
    ]);
    console.log('Alerts created');

    // Create finance records
    const finances = await Finance.create([
      {
        type: 'rental_income',
        amount: 1250,
        description: 'Booking payment from John Doe',
        booking: bookings[0]._id,
        beach: beaches[0]._id,
        date: new Date('2024-11-10')
      },
      {
        type: 'service_fee',
        amount: 125,
        description: 'Service fee for booking #001',
        booking: bookings[0]._id,
        beach: beaches[0]._id,
        date: new Date('2024-11-10')
      },
      {
        type: 'rental_income',
        amount: 1800,
        description: 'Booking payment from Jane Smith',
        booking: bookings[1]._id,
        beach: beaches[1]._id,
        date: new Date('2024-11-12')
      },
      {
        type: 'service_fee',
        amount: 180,
        description: 'Service fee for booking #002',
        booking: bookings[1]._id,
        beach: beaches[1]._id,
        date: new Date('2024-11-12')
      },
      {
        type: 'expense',
        amount: 500,
        description: 'Beach maintenance and cleaning',
        beach: beaches[0]._id,
        date: new Date('2024-11-05')
      }
    ]);
    console.log('Finance records created');

    console.log('\n=== Seed Data Summary ===');
    console.log('Admin Email: admin@sunshelter.com');
    console.log('Admin Password: admin123');
    console.log(`Beaches: ${beaches.length}`);
    console.log(`Bookings: ${bookings.length}`);
    console.log(`Alerts: ${alerts.length}`);
    console.log(`Finance Records: ${finances.length}`);
    console.log('========================\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
