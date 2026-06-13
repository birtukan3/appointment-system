// mock-server.js - ENHANCED COMPLETE VERSION
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3002;

// ============ MIDDLEWARE ============
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Create uploads directory if not exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';

// ============ DUPLICATE REQUEST PREVENTION ============
const requestTracker = new Map();

app.use((req, res, next) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    const requestKey = `${req.method}-${req.url}-${JSON.stringify(req.body)}`;
    const lastRequest = requestTracker.get(requestKey);
    const now = Date.now();
    
    if (lastRequest && (now - lastRequest.time) < 2000) {
      console.log(`[BLOCKED] Duplicate request: ${req.method} ${req.url}`);
      return res.status(429).json({ success: false, message: 'Duplicate request. Please wait.' });
    }
    
    requestTracker.set(requestKey, { time: now });
    setTimeout(() => requestTracker.delete(requestKey), 3000);
  }
  next();
});

// ============ REAL DATA STORAGE ============
let users = [
  {
    id: 1,
    name: 'Demo User',
    firstName: 'Demo',
    lastName: 'User',
    email: 'user@example.com',
    password: 'password123', // Plain text for demo
    role: 'user',
    company: 'Tech Corp',
    phone: '+251 91 234 5678',
    department: 'Engineering',
    avatar: null,
    preferences: { theme: 'light', notifications: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
    lastLogin: null
  },
  {
    id: 2,
    name: 'Admin User',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    company: 'System Admin',
    phone: '+251 91 234 5679',
    department: 'Administration',
    avatar: null,
    preferences: { theme: 'dark', notifications: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
    lastLogin: null
  },
  {
    id: 3,
    name: 'Dr. Sarah Johnson',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'staff@example.com',
    password: 'staff123',
    role: 'staff',
    company: 'Medical Center',
    phone: '+251 91 234 5680',
    department: 'Cardiology',
    avatar: null,
    preferences: { theme: 'light', notifications: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
    lastLogin: null,
    specialization: 'Cardiologist',
    experience: 12,
    bio: 'Board-certified cardiologist with 12+ years experience'
  }
];

// Real appointments data
let appointments = [
  {
    id: 1,
    serviceName: 'General Consultation',
    providerName: 'Dr. Sarah Johnson',
    providerId: 3,
    datetime: new Date(Date.now() + 86400000).toISOString(),
    endTime: new Date(Date.now() + 86400000 + 3600000).toISOString(),
    duration: 60,
    status: 'approved',
    priority: 'normal',
    notes: 'First time consultation',
    comment: 'Your appointment has been approved. Please arrive 10 minutes early.',
    bookingCode: 'BK-A1B2C3',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 1,
    userEmail: 'user@example.com',
    userName: 'Demo User'
  },
  {
    id: 2,
    serviceName: 'Tech Support',
    providerName: 'Michael Chen',
    providerId: 4,
    datetime: new Date(Date.now() + 172800000).toISOString(),
    endTime: new Date(Date.now() + 172800000 + 3600000).toISOString(),
    duration: 60,
    status: 'pending',
    priority: 'high',
    notes: 'Need help with deployment',
    comment: null,
    bookingCode: 'BK-D4E5F6',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 1,
    userEmail: 'user@example.com',
    userName: 'Demo User'
  },
  {
    id: 3,
    serviceName: 'Follow-up Visit',
    providerName: 'Emily Rodriguez',
    providerId: 5,
    datetime: new Date(Date.now() - 86400000).toISOString(),
    endTime: new Date(Date.now() - 86400000 + 3600000).toISOString(),
    duration: 45,
    status: 'completed',
    priority: 'normal',
    notes: 'Follow-up checkup',
    comment: 'Patient responded well to treatment',
    bookingCode: 'BK-X9Y8Z7',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    userId: 1,
    userEmail: 'user@example.com',
    userName: 'Demo User'
  },
  {
    id: 4,
    serviceName: 'Emergency Consultation',
    providerName: 'Dr. Sarah Johnson',
    providerId: 3,
    datetime: new Date(Date.now() + 259200000).toISOString(),
    endTime: new Date(Date.now() + 259200000 + 3600000).toISOString(),
    duration: 30,
    status: 'approved',
    priority: 'urgent',
    notes: 'Urgent medical attention needed',
    comment: 'Priority approved',
    bookingCode: 'BK-EMERG1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 2,
    userEmail: 'admin@example.com',
    userName: 'Admin User'
  }
];

let notifications = [
  {
    id: 1,
    title: 'Appointment Approved',
    message: 'Your appointment with Dr. Sarah Johnson has been approved.',
    type: 'status_update',
    status: 'approved',
    appointmentId: 1,
    read: false,
    createdAt: new Date().toISOString(),
    userId: 1
  },
  {
    id: 2,
    title: 'Staff Message',
    message: 'Dr. Sarah Johnson added a note to your appointment.',
    type: 'staff_message',
    status: 'approved',
    appointmentId: 1,
    comment: 'Please bring any relevant documents.',
    read: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    userId: 1
  },
  {
    id: 3,
    title: 'Welcome to the Platform',
    message: 'Thank you for joining! Explore our services.',
    type: 'welcome',
    read: false,
    createdAt: new Date().toISOString(),
    userId: 1
  }
];

let uploadedFiles = [];
let feedbacks = [];
let activityLogs = [];

// ============ HELPER FUNCTIONS ============
const getCurrentUser = () => users[0]; // For backward compatibility
const getUserAppointments = (userId) => appointments.filter(a => a.userId === userId);
const generateToken = (user) => jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
const verifyToken = (token) => { try { return jwt.verify(token, JWT_SECRET); } catch { return null; } };

// Authentication middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  req.user = decoded;
  next();
};

// Role guard middleware
const roleGuard = (...roles) => {
  return (req, res, next) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden - Insufficient permissions' });
    }
    next();
  };
};

// Log activity
const logActivity = (userId, action, details) => {
  activityLogs.push({
    id: activityLogs.length + 1,
    userId,
    action,
    details,
    timestamp: new Date().toISOString()
  });
};

// ============ AUTH ENDPOINTS ============
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  
  console.log('[LOGIN] Attempt for email:', email);
  
  if (!user) {
    return res.status(401).json({ success: false, message: 'User not found' });
  }
  
  if (user.password !== password) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  
  if (!user.isActive) {
    return res.status(401).json({ success: false, message: 'Account is deactivated' });
  }
  
  const token = generateToken(user);
  user.lastLogin = new Date().toISOString();
  logActivity(user.id, 'LOGIN', { email: user.email });
  
  res.json({
    success: true,
    access_token: token,
    refresh_token: 'mock-refresh-' + Date.now(),
    id: user.id,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    company: user.company,
    phone: user.phone,
    department: user.department,
    avatar: user.avatar,
    preferences: user.preferences,
    createdAt: user.createdAt
  });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, name, company, phone } = req.body;
  
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ success: false, message: 'Email already exists' });
  }
  
  const newUser = {
    id: users.length + 1,
    name: name || email.split('@')[0],
    firstName: name?.split(' ')[0] || '',
    lastName: name?.split(' ')[1] || '',
    email,
    password,
    role: 'user',
    company: company || '',
    phone: phone || '',
    department: '',
    avatar: null,
    preferences: { theme: 'light', notifications: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
    lastLogin: null
  };
  
  users.push(newUser);
  logActivity(newUser.id, 'REGISTER', { email });
  
  res.json({ success: true, message: 'Registration successful', data: newUser });
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  logActivity(req.user.id, 'LOGOUT', {});
  res.json({ success: true });
});

app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  // Simple implementation - just generate new token
  res.json({ success: true, access_token: 'mock-token-' + Date.now() });
});

// ============ HEALTH ENDPOINTS ============
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/system/status', (req, res) => {
  res.json({ success: true, status: 'healthy', uptime: process.uptime() });
});

app.get('/api/system/health', (req, res) => {
  res.json({ status: 'healthy', database: 'connected', uptime: process.uptime() });
});

// ============ USER PROFILE ENDPOINTS ============
app.get('/api/users/profile', authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  const { password, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

let lastProfileUpdateTime = 0;
app.patch('/api/users/profile', authMiddleware, (req, res) => {
  const now = Date.now();
  
  if (now - lastProfileUpdateTime < 1000) {
    console.log('[BLOCKED] Profile update too frequent');
    return res.status(429).json({ success: false, message: 'Please wait before updating again' });
  }
  
  lastProfileUpdateTime = now;
  
  const { name, company, phone, department, preferences } = req.body;
  const user = users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  
  console.log('[PROFILE] Updating user:', { name, company, phone, department });
  
  if (name !== undefined) user.name = name;
  if (company !== undefined) user.company = company;
  if (phone !== undefined) user.phone = phone;
  if (department !== undefined) user.department = department;
  if (preferences !== undefined) user.preferences = { ...user.preferences, ...preferences };
  
  user.updatedAt = new Date().toISOString();
  logActivity(req.user.id, 'UPDATE_PROFILE', { fields: Object.keys(req.body) });
  
  const { password, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

let lastPasswordChangeTime = 0;
app.post('/api/users/change-password', authMiddleware, (req, res) => {
  const now = Date.now();
  
  if (now - lastPasswordChangeTime < 2000) {
    console.log('[BLOCKED] Password change too frequent');
    return res.status(429).json({ success: false, message: 'Please wait before changing password again' });
  }
  
  lastPasswordChangeTime = now;
  
  const { currentPassword, newPassword } = req.body;
  const user = users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  
  if (user.password !== currentPassword) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }
  
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
  }
  
  user.password = newPassword;
  user.updatedAt = new Date().toISOString();
  logActivity(req.user.id, 'CHANGE_PASSWORD', {});
  
  res.json({ success: true, message: 'Password changed successfully' });
});

app.post('/api/users/avatar', authMiddleware, upload.single('avatar'), (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (req.file) {
    const avatarUrl = `/uploads/${req.file.filename}`;
    user.avatar = avatarUrl;
    user.updatedAt = new Date().toISOString();
    logActivity(req.user.id, 'UPLOAD_AVATAR', { url: avatarUrl });
    res.json({ success: true, avatar: avatarUrl, message: 'Avatar uploaded successfully' });
  } else {
    res.status(400).json({ success: false, message: 'No file uploaded' });
  }
});

app.delete('/api/users/avatar', authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  user.avatar = null;
  user.updatedAt = new Date().toISOString();
  res.json({ success: true, message: 'Avatar removed successfully' });
});

// ============ STATS ENDPOINTS ============
app.get('/api/users/stats', authMiddleware, (req, res) => {
  const userAppointments = getUserAppointments(req.user.id);
  const now = new Date();
  
  const total = userAppointments.length;
  const pending = userAppointments.filter(a => a.status === 'pending').length;
  const approved = userAppointments.filter(a => a.status === 'approved').length;
  const rejected = userAppointments.filter(a => a.status === 'rejected').length;
  const expired = userAppointments.filter(a => a.status === 'expired').length;
  const completed = userAppointments.filter(a => 
    a.status === 'approved' && new Date(a.datetime) < now
  ).length;
  const upcoming = userAppointments.filter(a => 
    a.status === 'approved' && new Date(a.datetime) > now
  ).length;
  
  const stats = {
    total,
    pending,
    approved,
    rejected,
    expired,
    completed,
    upcoming,
    memberSince: users.find(u => u.id === req.user.id)?.createdAt
  };
  
  console.log('[USER STATS]', stats);
  res.json(stats);
});

app.get('/api/users/staff', authMiddleware, (req, res) => {
  const staff = users.filter(u => u.role === 'staff').map(({ password, ...staff }) => staff);
  res.json(staff);
});

app.get('/api/users/experts', authMiddleware, (req, res) => {
  const experts = users.filter(u => u.role === 'staff').map(({ password, ...expert }) => expert);
  res.json(experts);
});

app.get('/api/users/:id', authMiddleware, roleGuard('admin'), (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  const { password, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// ============ APPOINTMENT ENDPOINTS ============
app.get('/api/appointments/my', authMiddleware, (req, res) => {
  const { page = 1, limit = 6, status, search, dateRange, sort } = req.query;
  let filteredApps = getUserAppointments(req.user.id);
  
  if (status && status !== 'all') {
    filteredApps = filteredApps.filter(a => a.status === status);
  }
  
  if (search) {
    filteredApps = filteredApps.filter(a => 
      a.serviceName.toLowerCase().includes(search.toLowerCase()) ||
      a.providerName.toLowerCase().includes(search.toLowerCase()) ||
      a.bookingCode.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  if (dateRange && dateRange !== 'all') {
    const now = new Date();
    if (dateRange === 'today') {
      filteredApps = filteredApps.filter(a => new Date(a.datetime).toDateString() === now.toDateString());
    } else if (dateRange === 'tomorrow') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      filteredApps = filteredApps.filter(a => new Date(a.datetime).toDateString() === tomorrow.toDateString());
    } else if (dateRange === 'week') {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      filteredApps = filteredApps.filter(a => new Date(a.datetime) >= now && new Date(a.datetime) <= weekEnd);
    } else if (dateRange === 'month') {
      const monthEnd = new Date(now);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      filteredApps = filteredApps.filter(a => new Date(a.datetime) >= now && new Date(a.datetime) <= monthEnd);
    }
  }
  
  if (sort) {
    if (sort === 'date-asc') {
      filteredApps.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    } else if (sort === 'date-desc') {
      filteredApps.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    }
  }
  
  const start = (parseInt(page) - 1) * parseInt(limit);
  const paginatedApps = filteredApps.slice(start, start + parseInt(limit));
  
  res.json({
    success: true,
    data: paginatedApps,
    total: filteredApps.length,
    page: parseInt(page),
    totalPages: Math.ceil(filteredApps.length / parseInt(limit)),
    limit: parseInt(limit)
  });
});

app.get('/api/appointments/stats', authMiddleware, (req, res) => {
  const userApps = getUserAppointments(req.user.id);
  const now = new Date();
  
  const stats = {
    total: userApps.length,
    pending: userApps.filter(a => a.status === 'pending').length,
    approved: userApps.filter(a => a.status === 'approved').length,
    rejected: userApps.filter(a => a.status === 'rejected').length,
    expired: userApps.filter(a => a.status === 'expired').length,
    completed: userApps.filter(a => a.status === 'approved' && new Date(a.datetime) < now).length,
    upcoming: userApps.filter(a => a.status === 'approved' && new Date(a.datetime) > now).length
  };
  
  console.log('[APPOINTMENT STATS]', stats);
  res.json(stats);
});

app.get('/api/appointments/:id', authMiddleware, (req, res) => {
  const appointment = appointments.find(a => a.id === parseInt(req.params.id));
  if (!appointment) {
    return res.status(404).json({ success: false, message: 'Appointment not found' });
  }
  if (appointment.userId !== req.user.id) {
    const user = users.find(u => u.id === req.user.id);
    if (user?.role !== 'admin' && user?.role !== 'staff') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
  }
  res.json({ success: true, data: appointment });
});

app.post('/api/appointments', authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  const newAppointment = {
    id: appointments.length + 1,
    ...req.body,
    status: 'pending',
    bookingCode: 'BK-' + Date.now().toString(36).toUpperCase(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: req.user.id,
    userEmail: user.email,
    userName: user.name
  };
  
  appointments.push(newAppointment);
  
  notifications.push({
    id: notifications.length + 1,
    title: 'Appointment Created',
    message: `Your appointment for ${newAppointment.serviceName} has been created and is pending approval.`,
    type: 'status_update',
    status: 'pending',
    appointmentId: newAppointment.id,
    read: false,
    createdAt: new Date().toISOString(),
    userId: req.user.id
  });
  
  logActivity(req.user.id, 'CREATE_APPOINTMENT', { appointmentId: newAppointment.id });
  
  res.json({ success: true, data: newAppointment });
});

app.patch('/api/appointments/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const appointment = appointments.find(a => a.id === id);
  
  if (!appointment) {
    return res.status(404).json({ success: false, message: 'Appointment not found' });
  }
  
  const user = users.find(u => u.id === req.user.id);
  if (appointment.userId !== req.user.id && user?.role !== 'admin' && user?.role !== 'staff') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  
  Object.assign(appointment, req.body, { updatedAt: new Date().toISOString() });
  
  if (req.body.status) {
    notifications.push({
      id: notifications.length + 1,
      title: `Appointment ${req.body.status === 'approved' ? 'Approved' : req.body.status === 'rejected' ? 'Rejected' : 'Updated'}`,
      message: `Your appointment for ${appointment.serviceName} has been ${req.body.status}.${req.body.comment ? ` Reason: ${req.body.comment}` : ''}`,
      type: 'status_update',
      status: req.body.status,
      appointmentId: id,
      comment: req.body.comment,
      read: false,
      createdAt: new Date().toISOString(),
      userId: appointment.userId
    });
  }
  
  logActivity(req.user.id, 'UPDATE_APPOINTMENT', { appointmentId: id, status: req.body.status });
  
  res.json({ success: true, data: appointment });
});

app.delete('/api/appointments/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const appointment = appointments.find(a => a.id === id);
  
  if (!appointment) {
    return res.status(404).json({ success: false, message: 'Appointment not found' });
  }
  
  const user = users.find(u => u.id === req.user.id);
  if (appointment.userId !== req.user.id && user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  
  appointments = appointments.filter(a => a.id !== id);
  logActivity(req.user.id, 'DELETE_APPOINTMENT', { appointmentId: id });
  
  res.json({ success: true });
});

app.post('/api/appointments/available-slots', authMiddleware, (req, res) => {
  const { expertId, date } = req.body;
  const bookedForDate = appointments.filter(a => a.providerId === expertId && a.datetime.split('T')[0] === date);
  
  const bookedSlots = bookedForDate.map(a => ({
    start: a.datetime.split('T')[1].slice(0, 5),
    end: a.endTime.split('T')[1].slice(0, 5)
  }));
  
  const allSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
  const availableSlots = allSlots.filter(slot => !bookedSlots.some(booked => booked.start === slot));
  
  res.json({ success: true, bookedSlots, availableSlots });
});

app.get('/api/appointments/:id/activities', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const appointment = appointments.find(a => a.id === id);
  
  if (!appointment) {
    return res.status(404).json({ success: false, message: 'Appointment not found' });
  }
  
  const activities = [
    {
      id: 1,
      action: 'Appointment created',
      timestamp: appointment.createdAt,
      user: appointment.userName
    }
  ];
  
  if (appointment.status !== 'pending') {
    activities.push({
      id: 2,
      action: `Appointment ${appointment.status}`,
      timestamp: appointment.updatedAt,
      user: appointment.providerName,
      comment: appointment.comment
    });
  }
  
  res.json({ success: true, data: activities });
});

// ============ NOTIFICATION ENDPOINTS ============
app.get('/api/notifications', authMiddleware, (req, res) => {
  const userNotifications = notifications.filter(n => n.userId === req.user.id);
  res.json({ success: true, data: userNotifications });
});

app.get('/api/notifications/unread/count', authMiddleware, (req, res) => {
  const unreadCount = notifications.filter(n => n.userId === req.user.id && !n.read).length;
  res.json({ success: true, count: unreadCount });
});

app.patch('/api/notifications/:id/read', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const notification = notifications.find(n => n.id === id);
  if (notification && notification.userId === req.user.id) {
    notification.read = true;
  }
  res.json({ success: true });
});

app.post('/api/notifications/mark-all-read', authMiddleware, (req, res) => {
  notifications.forEach(n => {
    if (n.userId === req.user.id) n.read = true;
  });
  res.json({ success: true });
});

app.post('/api/notifications/announcement', authMiddleware, roleGuard('admin'), (req, res) => {
  const { title, message, target = 'all' } = req.body;
  const targetUsers = target === 'all' ? users : users.filter(u => u.role === target);
  
  targetUsers.forEach(user => {
    notifications.push({
      id: notifications.length + 1,
      title,
      message,
      type: 'announcement',
      read: false,
      createdAt: new Date().toISOString(),
      userId: user.id
    });
  });
  
  res.json({ success: true, message: 'Announcement sent' });
});

// ============ UPLOAD ENDPOINTS ============
app.get('/api/uploads/user', authMiddleware, (req, res) => {
  const userFiles = uploadedFiles.filter(f => f.userId === req.user.id);
  res.json({ success: true, data: userFiles });
});

app.post('/api/uploads', authMiddleware, upload.single('file'), (req, res) => {
  const file = {
    id: uploadedFiles.length + 1,
    originalName: req.file?.originalname || req.body.originalName || 'uploaded-file.pdf',
    name: req.file?.filename || req.body.name || 'uploaded-file.pdf',
    url: req.file ? `/uploads/${req.file.filename}` : '/uploads/file-' + Date.now() + '.pdf',
    size: req.file?.size || 1024,
    type: req.file?.mimetype || 'application/pdf',
    appointmentId: req.body.appointmentId || null,
    userId: req.user.id,
    createdAt: new Date().toISOString()
  };
  uploadedFiles.push(file);
  logActivity(req.user.id, 'UPLOAD_FILE', { filename: file.name });
  res.json({ success: true, data: file });
});

app.delete('/api/uploads/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const file = uploadedFiles.find(f => f.id === id);
  if (file && file.userId === req.user.id) {
    uploadedFiles = uploadedFiles.filter(f => f.id !== id);
    // Delete physical file if exists
    const filePath = path.join(uploadsDir, path.basename(file.url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  res.json({ success: true });
});

// ============ SERVICE ENDPOINTS ============
app.get('/api/services', authMiddleware, (req, res) => {
  res.json([
    { id: 1, name: 'General Consultation', minDuration: 15, maxDuration: 60, popularity: 95, description: 'Standard consultation for general health concerns', icon: '🏥', bg: 'bg-blue-50', text: 'text-blue-600', price: 0 },
    { id: 2, name: 'Specialist Appointment', minDuration: 30, maxDuration: 120, popularity: 88, description: 'Consultation with specialized doctors', icon: '👨‍⚕️', bg: 'bg-emerald-50', text: 'text-emerald-600', price: 0 },
    { id: 3, name: 'Health Checkup', minDuration: 45, maxDuration: 180, popularity: 92, description: 'Complete health examination and screening', icon: '🩺', bg: 'bg-purple-50', text: 'text-purple-600', price: 0 },
    { id: 4, name: 'Follow-up Visit', minDuration: 15, maxDuration: 45, popularity: 85, description: 'Follow-up consultation for ongoing treatment', icon: '📋', bg: 'bg-amber-50', text: 'text-amber-600', price: 0 },
    { id: 5, name: 'Vaccination', minDuration: 10, maxDuration: 30, popularity: 78, description: 'Vaccination and immunization services', icon: '💉', bg: 'bg-rose-50', text: 'text-rose-600', price: 0 }
  ]);
});

// ============ CONSULTATION ENDPOINTS ============
app.get('/api/consultations/user-stats', authMiddleware, (req, res) => {
  const userApps = getUserAppointments(req.user.id);
  const pendingCount = userApps.filter(a => a.status === 'pending').length;
  const user = users.find(u => u.id === req.user.id);
  
  res.json({ 
    todayCount: 0, 
    pendingCount: pendingCount,
    dailyLimit: 5, 
    pendingLimit: 3, 
    role: user?.role || 'user'
  });
});

app.get('/api/consultations/my-limits', authMiddleware, (req, res) => {
  const userApps = getUserAppointments(req.user.id);
  const activeCount = userApps.filter(a => a.status === 'pending' || (a.status === 'approved' && new Date(a.datetime) > new Date())).length;
  
  res.json({ 
    success: true, 
    data: { 
      limits: { daily: 5, weekly: 10, monthly: 30, active: 3 },
      remaining: { 
        daily: 5, 
        weekly: 10, 
        monthly: 30, 
        active: Math.max(0, 3 - activeCount) 
      }
    } 
  });
});

app.get('/api/consultations/my/recent', authMiddleware, (req, res) => {
  const recentApps = getUserAppointments(req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);
  
  res.json({ success: true, data: recentApps });
});

app.post('/api/consultations', authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  const newConsultation = {
    id: appointments.length + 1,
    ...req.body,
    userId: req.user.id,
    userEmail: user.email,
    userName: user.name,
    status: 'pending',
    bookingCode: 'BK-' + Date.now().toString(36).toUpperCase(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  appointments.push(newConsultation);
  logActivity(req.user.id, 'BOOK_CONSULTATION', { consultationId: newConsultation.id });
  
  res.json({ success: true, data: newConsultation });
});

// ============ FEEDBACK ENDPOINTS ============
app.post('/api/feedback/:appointmentId', authMiddleware, (req, res) => {
  const appointmentId = parseInt(req.params.appointmentId);
  const appointment = appointments.find(a => a.id === appointmentId);
  
  if (!appointment) {
    return res.status(404).json({ success: false, message: 'Appointment not found' });
  }
  
  if (appointment.userId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  
  const { rating, comment } = req.body;
  
  appointment.feedbackGiven = true;
  appointment.feedbackRating = rating;
  appointment.feedbackComment = comment;
  appointment.updatedAt = new Date().toISOString();
  
  feedbacks.push({
    id: feedbacks.length + 1,
    userId: req.user.id,
    appointmentId,
    rating,
    comment,
    createdAt: new Date().toISOString()
  });
  
  logActivity(req.user.id, 'SUBMIT_FEEDBACK', { appointmentId, rating });
  
  res.json({ success: true, message: 'Feedback submitted successfully' });
});

app.get('/api/feedback/stats', authMiddleware, (req, res) => {
  const userFeedbacks = feedbacks.filter(f => f.userId === req.user.id);
  const avgRating = userFeedbacks.length > 0 
    ? userFeedbacks.reduce((sum, f) => sum + f.rating, 0) / userFeedbacks.length 
    : 0;
  
  res.json({
    total: userFeedbacks.length,
    averageRating: avgRating.toFixed(1),
    distribution: {
      5: userFeedbacks.filter(f => f.rating === 5).length,
      4: userFeedbacks.filter(f => f.rating === 4).length,
      3: userFeedbacks.filter(f => f.rating === 3).length,
      2: userFeedbacks.filter(f => f.rating === 2).length,
      1: userFeedbacks.filter(f => f.rating === 1).length
    }
  });
});

app.get('/api/feedback/my', authMiddleware, (req, res) => {
  const userFeedbacks = feedbacks.filter(f => f.userId === req.user.id);
  res.json({ success: true, data: userFeedbacks });
});

// ============ GOOGLE CALENDAR ENDPOINTS ============
app.get('/api/google-calendar/status', authMiddleware, (req, res) => {
  res.json({ connected: false, email: null });
});

app.get('/api/google-calendar/auth-url', authMiddleware, (req, res) => {
  res.json({ url: 'https://accounts.google.com/o/oauth2/auth?client_id=mock&redirect_uri=http://localhost:3002/api/google-calendar/callback&response_type=code&scope=calendar' });
});

app.post('/api/google-calendar/connect', authMiddleware, (req, res) => {
  res.json({ success: true, message: 'Connected to Google Calendar' });
});

app.post('/api/google-calendar/sync', authMiddleware, (req, res) => {
  res.json({ success: true, synced: 0 });
});

app.get('/api/google-calendar/events', authMiddleware, (req, res) => {
  res.json([]);
});

app.get('/api/google-calendar/available-slots', authMiddleware, (req, res) => {
  res.json([]);
});

// ============ ADMIN ENDPOINTS ============
app.get('/api/admin/stats', authMiddleware, roleGuard('admin'), (req, res) => {
  res.json({
    totalUsers: users.length,
    activeUsers: users.filter(u => u.isActive).length,
    totalAppointments: appointments.length,
    pendingAppointments: appointments.filter(a => a.status === 'pending').length,
    completedAppointments: appointments.filter(a => a.status === 'completed').length,
    totalFeedbacks: feedbacks.length,
    averageRating: feedbacks.length > 0 
      ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length 
      : 0,
    systemUptime: process.uptime()
  });
});

app.get('/api/admin/users/limits', authMiddleware, roleGuard('admin'), (req, res) => {
  const usersWithStats = users.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    appointmentCount: appointments.filter(a => a.userId === user.id).length,
    pendingCount: appointments.filter(a => a.userId === user.id && a.status === 'pending').length,
    completedCount: appointments.filter(a => a.userId === user.id && a.status === 'completed').length,
    createdAt: user.createdAt
  }));
  res.json(usersWithStats);
});

app.post('/api/admin/users/:id/block', authMiddleware, roleGuard('admin'), (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  user.isActive = false;
  logActivity(req.user.id, 'BLOCK_USER', { userId: user.id });
  res.json({ success: true, message: 'User blocked successfully' });
});

app.post('/api/admin/users/:id/unblock', authMiddleware, roleGuard('admin'), (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  user.isActive = true;
  logActivity(req.user.id, 'UNBLOCK_USER', { userId: user.id });
  res.json({ success: true, message: 'User unblocked successfully' });
});

app.get('/api/admin/activity-logs', authMiddleware, roleGuard('admin'), (req, res) => {
  const { limit = 50 } = req.query;
  const logs = activityLogs.slice(-parseInt(limit));
  res.json({ success: true, data: logs });
});

// ============ START SERVER ============
app.listen(PORT, () => {
  console.log('\n✅ =========================================');
  console.log('   ENHANCED MOCK BACKEND SERVER RUNNING');
  console.log('   =========================================');
  console.log(`   📡 API URL: http://localhost:${PORT}/api`);
  console.log(`   🩺 Health: http://localhost:${PORT}/api/health`);
  console.log(`   👤 Profile: http://localhost:${PORT}/api/users/profile`);
  console.log(`   📅 Appointments: http://localhost:${PORT}/api/appointments/my`);
  console.log(`   📊 User Stats: http://localhost:${PORT}/api/users/stats`);
  console.log(`   📊 App Stats: http://localhost:${PORT}/api/appointments/stats`);
  console.log(`   🔑 Login: POST http://localhost:${PORT}/api/auth/login`);
  console.log('   =========================================');
  console.log('   📝 Test Credentials:');
  console.log('   User: user@example.com / password123');
  console.log('   Admin: admin@example.com / admin123');
  console.log('   Staff: staff@example.com / staff123');
  console.log('   =========================================');
  console.log('   📊 Sample Data Statistics:');
  console.log('   - Total Users: 3');
  console.log('   - Total Appointments: 4');
  console.log('   - Completed: 1');
  console.log('   - Pending: 1');
  console.log('   - Approved: 2');
  console.log('   =========================================\n');
});