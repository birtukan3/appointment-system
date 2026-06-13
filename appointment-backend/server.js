const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = 3002;
const JWT_SECRET = 'your-secret-key-change-this';

app.use(cors());
app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release();
  }
});

// Helper function to generate token
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Middleware to verify token
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'No token provided', message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token', message: 'Unauthorized' });
  }
}

// ============ AUTH ENDPOINTS ============

// Register - Format that frontend expects
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'User already exists', error: 'Email already registered' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const result = await pool.query(
      `INSERT INTO users (email, password, name, role, status, "isActive", "emailVerified", "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING id, email, name, role`,
      [email, hashedPassword, name || email.split('@')[0], 'user', 'active', true, true]
    );
    
    const newUser = result.rows[0];
    const token = generateToken(newUser);
    
    // Format that frontend expects
    res.json({ 
      success: true, 
      token, 
      user: newUser,
      message: 'Registration successful'
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: error.message, message: 'Registration failed' });
  }
});

// Login - Format that frontend expects
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query(
      'SELECT id, email, password, name, role FROM users WHERE email = $1 AND "isActive" = true',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password', error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const isValidPassword = bcrypt.compareSync(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid email or password', error: 'Invalid credentials' });
    }
    
    delete user.password;
    const token = generateToken(user);
    
    // Format that frontend expects
    res.json({ 
      success: true, 
      token, 
      user: user,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message, message: 'Login failed' });
  }
});

// Check email
app.get('/api/auth/check-email', async (req, res) => {
  try {
    const { email } = req.query;
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    res.json({ success: true, exists: result.rows.length > 0 });
  } catch (error) {
    res.json({ success: true, exists: false });
  }
});

// Refresh token
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { token } = req.body;
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    const newToken = generateToken(result.rows[0]);
    res.json({ success: true, token: newToken });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

// Logout
app.post('/api/auth/logout', async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Get current user profile
app.get('/api/users/profile', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, phone, company, department, "isActive", "createdAt" FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ USER ENDPOINTS ============

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, name, role, "isActive", "createdAt" FROM users');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get experts/staff
app.get('/api/users/experts', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, name, role, department FROM users WHERE role = $1', ['staff']);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update profile
app.put('/api/users/profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone, company, department } = req.body;
    await pool.query(
      'UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone), company = COALESCE($3, company), department = COALESCE($4, department), "updatedAt" = NOW() WHERE id = $5',
      [name, phone, company, department, req.user.id]
    );
    
    const result = await pool.query('SELECT id, email, name, role, phone, company, department FROM users WHERE id = $1', [req.user.id]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Change password
app.post('/api/users/change-password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    
    if (!bcrypt.compareSync(oldPassword, result.rows[0].password)) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await pool.query('UPDATE users SET password = $1, "passwordChangedAt" = NOW() WHERE id = $2', [hashedPassword, req.user.id]);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ APPOINTMENT ENDPOINTS ============

// Get user's appointments
app.get('/api/appointments/my', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, "serviceName", "providerName", datetime, status, priority, duration, notes, "createdAt" 
       FROM appointments WHERE "userId" = $1 ORDER BY datetime DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows, total: result.rows.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get appointment stats
app.get('/api/appointments/stats', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT status, COUNT(*) FROM appointments WHERE "userId" = $1 GROUP BY status`,
      [req.user.id]
    );
    
    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      completed: 0,
      rejected: 0,
      cancelled: 0
    };
    
    result.rows.forEach(row => {
      stats.total += parseInt(row.count);
      if (stats[row.status] !== undefined) stats[row.status] = parseInt(row.count);
    });
    
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create appointment
app.post('/api/appointments', authMiddleware, async (req, res) => {
  try {
    const { serviceName, providerName, datetime, userName, notes, duration } = req.body;
    
    const result = await pool.query(
      `INSERT INTO appointments ("serviceName", "providerName", datetime, "userId", "userEmail", "userName", status, priority, duration, notes, "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) RETURNING *`,
      [serviceName, providerName, new Date(datetime), req.user.id, req.user.email, userName || req.user.email, 'pending', 'normal', duration || 60, notes || '']
    );
    
    res.json({ success: true, data: result.rows[0], message: 'Appointment created successfully' });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ success: false, error: error.message, message: 'Failed to create appointment' });
  }
});

// Update appointment status
app.patch('/api/appointments/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    await pool.query(
      'UPDATE appointments SET status = $1, "updatedAt" = NOW() WHERE id = $2 AND "userId" = $3',
      [status, id, req.user.id]
    );
    
    const result = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancel appointment
app.delete('/api/appointments/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE appointments SET status = $1, "cancelledAt" = NOW(), "updatedAt" = NOW() WHERE id = $2 AND "userId" = $3',
      ['cancelled', id, req.user.id]
    );
    
    const result = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ SYSTEM ENDPOINTS ============

// System status
app.get('/api/system/status', async (req, res) => {
  try {
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const aptCount = await pool.query('SELECT COUNT(*) FROM appointments');
    
    res.json({
      success: true,
      data: {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        stats: {
          users: parseInt(userCount.rows[0].count),
          appointments: parseInt(aptCount.rows[0].count)
        }
      }
    });
  } catch (error) {
    res.json({
      success: true,
      data: {
        status: 'degraded',
        database: 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        error: error.message
      }
    });
  }
});

// Health check
app.get('/health', async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ OTHER ENDPOINTS ============

// Get services
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
    database: 'PostgreSQL'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n========================================');
  console.log('🚀 Server is running!');
  console.log('========================================\n');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`📍 API Base: http://localhost:${PORT}/api\n`);
  console.log('🔑 Test Credentials:');
  console.log('   Admin: admin@example.com / Admin123');
  console.log('   User:  user@example.com / User123');
  console.log('   Staff: staff@example.com / Staff123\n');
  console.log('========================================\n');
});
