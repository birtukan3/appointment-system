import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Extend Express Request to include our user type
declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      role: string;
    }
  }
}

interface MockUser {
  id: number;
  email: string;
  password: string;
  name: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  department?: string;
}

interface MockAppointment {
  id: number;
  serviceName: string;
  providerName: string;
  datetime: string;
  userId: number;
  userEmail: string;
  userName: string;
  status: string;
  priority: string;
  duration: number;
  notes: string;
  createdAt: string;
}

const app = express();
const PORT = 3002;
const JWT_SECRET = 'your-secret-key-change-this';

app.use(cors());
app.use(express.json());

// In-memory database (mock data)
let users: MockUser[] = [
  {
    id: 1,
    email: 'admin@example.com',
    password: bcrypt.hashSync('Admin123', 10),
    name: 'Admin User',
    role: 'admin',
    isActive: true,
    emailVerified: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    email: 'user@example.com',
    password: bcrypt.hashSync('User123', 10),
    name: 'John Smith',
    role: 'user',
    isActive: true,
    emailVerified: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    email: 'staff@example.com',
    password: bcrypt.hashSync('Staff123', 10),
    name: 'Dr. Sarah Johnson',
    role: 'staff',
    department: 'Cardiology',
    isActive: true,
    emailVerified: true,
    createdAt: new Date().toISOString()
  }
];

let appointments: MockAppointment[] = [
  {
    id: 1,
    serviceName: 'Cardiology Consultation',
    providerName: 'Dr. Sarah Johnson',
    datetime: new Date(Date.now() + 86400000).toISOString(),
    userId: 2,
    userEmail: 'user@example.com',
    userName: 'John Smith',
    status: 'pending',
    priority: 'normal',
    duration: 60,
    notes: 'First time consultation',
    createdAt: new Date().toISOString()
  }
];

let nextUserId = 4;
let nextAppointmentId = 2;

// Helper function to generate token
function generateToken(user: MockUser) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Middleware to verify token
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

// ============ AUTH ENDPOINTS ============

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = {
      id: nextUserId++,
      email,
      password: hashedPassword,
      name: name || email.split('@')[0],
      role: 'user',
      isActive: true,
      emailVerified: true,
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    const token = generateToken(newUser);
    
    const { password: _, ...userWithoutPassword } = newUser;
    res.json({ success: true, token, user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    const token = generateToken(user);
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, token, user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check email
app.get('/api/auth/check-email', async (req, res) => {
  const { email } = req.query;
  const exists = users.some(u => u.email === email);
  res.json({ success: true, exists });
});

// Refresh token
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { token } = req.body;
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    const user = users.find(u => u.id === decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    const newToken = generateToken(user);
    res.json({ success: true, token: newToken });
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
});

// Logout
app.post('/api/auth/logout', async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Get current user profile
app.get('/api/users/profile', authMiddleware, async (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  const { password, ...userWithoutPassword } = user;
  res.json({ success: true, data: userWithoutPassword });
});

// ============ USER ENDPOINTS ============

// Get all users
app.get('/api/users', async (req, res) => {
  const usersWithoutPassword = users.map(({ password, ...user }) => user);
  res.json({ success: true, data: usersWithoutPassword });
});

// Get experts/staff
app.get('/api/users/experts', async (req, res) => {
  const experts = users.filter(u => u.role === 'staff').map(({ password, ...expert }) => expert);
  res.json({ success: true, data: experts });
});

// Update profile
app.put('/api/users/profile', authMiddleware, async (req, res) => {
  const userIndex = users.findIndex(u => u.id === req.user.id);
  if (userIndex === -1) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  
  users[userIndex] = { ...users[userIndex], ...req.body };
  const { password, ...userWithoutPassword } = users[userIndex];
  res.json({ success: true, data: userWithoutPassword });
});

// Change password
app.post('/api/users/change-password', authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = users.find(u => u.id === req.user.id);
  
  if (!bcrypt.compareSync(oldPassword, user.password)) {
    return res.status(401).json({ success: false, error: 'Current password is incorrect' });
  }
  
  user.password = bcrypt.hashSync(newPassword, 10);
  res.json({ success: true, message: 'Password changed successfully' });
});

// ============ APPOINTMENT ENDPOINTS ============

// Get user's appointments
app.get('/api/appointments/my', authMiddleware, async (req, res) => {
  const userAppointments = appointments.filter(a => a.userId === req.user.id);
  res.json({ success: true, data: userAppointments, total: userAppointments.length });
});

// Get appointment stats
app.get('/api/appointments/stats', authMiddleware, async (req, res) => {
  const userAppointments = appointments.filter(a => a.userId === req.user.id);
  const stats = {
    total: userAppointments.length,
    pending: userAppointments.filter(a => a.status === 'pending').length,
    approved: userAppointments.filter(a => a.status === 'approved').length,
    completed: userAppointments.filter(a => a.status === 'completed').length,
    rejected: userAppointments.filter(a => a.status === 'rejected').length
  };
  res.json({ success: true, data: stats });
});

// Create appointment
app.post('/api/appointments', authMiddleware, async (req, res) => {
  const newAppointment = {
    id: nextAppointmentId++,
    ...req.body,
    userId: req.user.id,
    userEmail: req.user.email,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  appointments.push(newAppointment);
  res.json({ success: true, data: newAppointment });
});

// Update appointment status
app.patch('/api/appointments/:id/status', authMiddleware, async (req, res) => {
  const appointment = appointments.find(a => a.id === parseInt(req.params.id));
  if (!appointment) {
    return res.status(404).json({ success: false, error: 'Appointment not found' });
  }
  appointment.status = req.body.status;
  res.json({ success: true, data: appointment });
});

// Cancel appointment
app.delete('/api/appointments/:id/cancel', authMiddleware, async (req, res) => {
  const appointment = appointments.find(a => a.id === parseInt(req.params.id));
  if (!appointment) {
    return res.status(404).json({ success: false, error: 'Appointment not found' });
  }
  appointment.status = 'cancelled';
  res.json({ success: true, data: appointment });
});

// ============ SYSTEM ENDPOINTS ============

// System status
app.get('/api/system/status', async (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      database: 'connected (mock)',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      stats: {
        users: users.length,
        appointments: appointments.length
      }
    }
  });
});

// Health check
app.get('/health', async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ OTHER ENDPOINTS ============

// Get services (mock data)
app.get('/api/services', async (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: 'Cardiology Consultation', duration: 60, price: 200 },
      { id: 2, name: 'Neurology Consultation', duration: 45, price: 250 },
      { id: 3, name: 'Pediatric Checkup', duration: 30, price: 150 },
      { id: 4, name: 'General Checkup', duration: 30, price: 100 }
    ]
  });
});

// Google Calendar status
app.get('/api/google-calendar/status', authMiddleware, async (req, res) => {
  res.json({ success: true, data: { connected: false } });
});

// Consultations endpoints
app.get('/api/consultations/user-stats', authMiddleware, async (req, res) => {
  res.json({ success: true, data: { total: 0, used: 0, remaining: 5 } });
});

app.get('/api/consultations/my/recent', authMiddleware, async (req, res) => {
  res.json({ success: true, data: [] });
});

app.get('/api/consultations/my-limits', authMiddleware, async (req, res) => {
  res.json({ success: true, data: { daily: 3, weekly: 10, monthly: 30 } });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Appointment System API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth/login, /api/auth/register',
      users: '/api/users, /api/users/profile',
      appointments: '/api/appointments, /api/appointments/my',
      system: '/api/system/status'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n========================================');
  console.log('🚀 Mock API Server is running!');
  console.log('========================================\n');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`📍 API Base: http://localhost:${PORT}/api\n`);
  console.log('✅ Available endpoints:');
  console.log('   POST   /api/auth/login        - Login');
  console.log('   POST   /api/auth/register     - Register');
  console.log('   GET    /api/users/profile     - Get profile');
  console.log('   GET    /api/appointments/my   - My appointments');
  console.log('   POST   /api/appointments      - Create appointment');
  console.log('   GET    /api/system/status     - System status\n');
  console.log('🔑 Test Credentials:');
  console.log('   Admin: admin@example.com / Admin123');
  console.log('   User:  user@example.com / User123');
  console.log('   Staff: staff@example.com / Staff123\n');
  console.log('========================================\n');
});
