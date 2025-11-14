import express from 'express';
import prisma from './utils/prisma.js';
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


app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://wagonless-byron-noninclusively.ngrok-free.dev"
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.use('/api/auth', authRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/beaches', beachesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/finance', financeRouter);
app.use('/api/admins', adminsRouter);
app.use('/api/integrations', integrationsRouter);


app.use((err, req, res, next) => {
  const msg = err?.message || 'Server error';
  const code = /not found/i.test(msg)
    ? 404
    : /exists|duplicate|unique/i.test(msg)
    ? 409
    : 400;
  res.status(code).json({ message: msg });
});


app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://wagonless-byron-noninclusively.ngrok-free.dev"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});


app.set('io', io);

io.on('connection', (socket) => {
  socket.on('joinBeach', (beachId) => {
    if (beachId) socket.join(`beach:${beachId}`);
  });

  socket.on('leaveBeach', (beachId) => {
    if (beachId) socket.leave(`beach:${beachId}`);
  });

  socket.on('disconnect', () => { });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
