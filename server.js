import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import authRouter from './routes/auth.js';
import alertsRouter from './routes/alerts.js';
import dashboardRouter from './routes/dashboard.js';
import beachesRouter from './routes/beaches.js';
import bookingsRouter from './routes/bookings.js';
import financeRouter from './routes/finance.js';
import adminsRouter from './routes/admins.js';
import integrationsRouter from './routes/integrations.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.log('MongoDB Error:', err));

app.use('/api/auth', authRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/beaches', beachesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/finance', financeRouter);
app.use('/api/admins', adminsRouter);
app.use('/api/integrations', integrationsRouter);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Sun Shelter API is running' });
});

const PORT = process.env.PORT || 5000;

// --- Socket.IO Setup ---
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Expose io for routes to emit events
app.set('io', io);

io.on('connection', (socket) => {
  // Join a specific beach room to receive updates
  socket.on('joinBeach', (beachId) => {
    if (beachId) socket.join(`beach:${beachId}`);
  });

  socket.on('leaveBeach', (beachId) => {
    if (beachId) socket.leave(`beach:${beachId}`);
  });

  socket.on('disconnect', () => {});
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
