// frontend/app/lib/api.js
// ============================================
// ENHANCED PRODUCTION-READY API SERVICE
// Version: 6.1.0 - FULL COMPLETE FILE
// ============================================

import axios from 'axios';
import toast from 'react-hot-toast';

// ============ CONFIGURATION ============
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';
const API_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// ============ LOGGING CONTROL ============
const ENABLE_LOGGING = false;
const ENABLE_DEV_TOOLS = false;

// ============ DEV MODE ============
const isDev = process.env.NODE_ENV === 'development';

// ============ CACHE MANAGEMENT ============
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

const getCacheKey = (url, params) => {
  return `${url}:${JSON.stringify(params || {})}`;
};

const isCacheValid = (cached) => {
  return cached && Date.now() - cached.timestamp < CACHE_DURATION;
};

const setCache = (key, data) => {
  if (cache.size > 100) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
};

// ============ TOAST HELPER ============
const showToast = (type, message, options = {}) => {
  const config = {
    duration: 3000,
    position: 'top-right',
    style: {
      borderRadius: '12px',
      padding: '12px 16px',
      fontSize: '14px',
      fontWeight: '500',
    },
    ...options,
  };

  switch (type) {
    case 'success':
      toast.success(message, {
        ...config,
        style: { ...config.style, background: '#10b981', color: '#fff' },
      });
      break;
    case 'error':
      toast.error(message, {
        ...config,
        duration: 4000,
        style: { ...config.style, background: '#ef4444', color: '#fff' },
      });
      break;
    case 'warning':
      toast(message, {
        ...config,
        icon: '⚠️',
        style: { ...config.style, background: '#f59e0b', color: '#fff' },
      });
      break;
    default:
      toast(message, config);
  }
};

// ============ MAIN API SERVICE ============
class ApiService {
  constructor() {
    this.token = null;
    this.refreshPromise = null;
    this.isRefreshing = false;
    this.pendingRequests = [];
    this.requestLogs = [];
    this.maxLogs = 50;
    this._isSystemChecking = false;
    this._lastSystemCheck = 0;
    this._systemCheckInterval = 300000;
    
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Client-Version': '6.1.0',
      },
      timeout: API_TIMEOUT,
    });

    this.setupInterceptors();
    this.setupDevTools();
  }

  // ============ DEV TOOLS ============
  setupDevTools() {
    if (typeof window !== 'undefined' && isDev && ENABLE_DEV_TOOLS) {
      window.__api = {
        getLogs: () => this.requestLogs,
        clearLogs: () => { this.requestLogs = []; console.log('[API] Logs cleared'); },
        getCache: () => Array.from(cache.entries()),
        clearCache: () => this.clearCache(),
        getStats: () => this.getRequestStats(),
        setDebug: (enabled) => { window.__apiDebug = enabled; },
        testConnection: () => this.testConnection(),
        getSystemStatus: () => this.getSystemStatus(),
      };
      console.log('%c[API] Dev tools available: window.__api', 'color: #10b981; font-size: 12px;');
    }
  }

  getRequestStats() {
    const stats = {
      totalRequests: this.requestLogs.length,
      successRate: '0%',
      averageResponseTime: 0,
      byEndpoint: {}
    };
    
    const responseLogs = this.requestLogs.filter(l => l.type === 'response');
    if (responseLogs.length > 0) {
      const totalTime = responseLogs.reduce((sum, l) => sum + (l.duration || 0), 0);
      stats.averageResponseTime = Math.round(totalTime / responseLogs.length);
      stats.successRate = ((responseLogs.length / this.requestLogs.length) * 100).toFixed(1);
    }
    
    this.requestLogs.forEach(log => {
      if (!stats.byEndpoint[log.url]) {
        stats.byEndpoint[log.url] = { count: 0, errors: 0 };
      }
      stats.byEndpoint[log.url].count++;
      if (log.type === 'error') stats.byEndpoint[log.url].errors++;
    });
    
    return stats;
  }

  logRequest(type, url, data = null, duration = null) {
    if (!ENABLE_LOGGING || !isDev) return;
    if (url && (url.includes('/system/') || url.includes('/health') || url.includes('/ping'))) {
      return;
    }
    
    const log = {
      timestamp: new Date().toISOString(),
      type,
      url,
      data,
      duration
    };
    
    this.requestLogs.unshift(log);
    if (this.requestLogs.length > this.maxLogs) this.requestLogs.pop();
    
    const colors = {
      request: '#3b82f6',
      response: '#10b981',
      error: '#ef4444',
      cache: '#f59e0b'
    };
    
    console.log(`%c[API] ${type.toUpperCase()} ${url}${duration ? ` (${duration}ms)` : ''}`, 
                `color: ${colors[type] || '#6b7280'}; font-weight: bold;`);
  }

  async testConnection() {
    try {
      const start = Date.now();
      await this.get('/system/health', { timeout: 5000 });
      if (isDev) {
        console.log(`%c[API] Connection test passed (${Date.now() - start}ms)`, 'color: #10b981');
      }
      return true;
    } catch (error) {
      if (isDev) {
        console.log('%c[API] Connection test failed', 'color: #ef4444');
      }
      return false;
    }
  }

  // ============ INTERCEPTORS ============
  setupInterceptors() {
    this.api.interceptors.request.use(
      (config) => {
        const token = this.token || this.getStoredToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        config.metadata = { 
          startTime: Date.now(), 
          requestId: Math.random().toString(36).substring(7) 
        };
        
        this.logRequest('request', `${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          hasBody: !!config.data
        });
        
        return config;
      },
      (error) => {
        console.error('[API] Request Error:', error.message);
        return Promise.reject(error);
      }
    );

    this.api.interceptors.response.use(
      (response) => {
        const duration = Date.now() - (response.config.metadata?.startTime || Date.now());
        
        this.logRequest('response', 
          `${response.config.method?.toUpperCase()} ${response.config.url}`,
          { status: response.status },
          duration
        );
        
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        const duration = originalRequest?.metadata?.startTime 
          ? Date.now() - originalRequest.metadata.startTime 
          : null;
        
        this.logRequest('error', originalRequest?.url || 'unknown', 
          { status: error.response?.status, message: error.message },
          duration
        );
        
        if (error.response?.status === 401 && !originalRequest?._retry) {
          if (originalRequest?.url?.includes('/auth/login')) {
            return Promise.reject(error);
          }
          
          if (originalRequest) {
            originalRequest._retry = true;
          }
          
          const refreshed = await this.refreshToken();
          if (refreshed && originalRequest) {
            originalRequest.headers.Authorization = `Bearer ${this.token || this.getStoredToken()}`;
            return this.api(originalRequest);
          }
          
          this.clearSession();
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
        
        if (error.response?.status === 403) {
          showToast('error', 'You don\'t have permission to perform this action.');
        }
        
        if (error.response?.status === 429) {
          const retryAfter = error.response?.headers?.['retry-after'] || 30;
          showToast('warning', `Too many requests. Please try again in ${retryAfter} seconds.`);
        }
        
        if (error.response?.status === 404) {
          if (originalRequest?.url?.includes('/system/') || 
              originalRequest?.url?.includes('/health') || 
              originalRequest?.url?.includes('/ping')) {
            if (isDev && ENABLE_LOGGING) {
              console.debug(`[API] System endpoint not found: ${originalRequest?.url}`);
            }
          } else {
            if (isDev) {
              console.warn(`[API] Endpoint not found: ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`);
            }
            if (!originalRequest?.url?.includes('/system/')) {
              showToast('error', 'Resource not found');
            }
          }
        }
        
        if (error.code === 'ERR_NETWORK') {
          if (!originalRequest?.url?.includes('/system/')) {
            showToast('error', 'Network error. Please check your connection.');
          }
        }
        
        if (error.code === 'ECONNABORTED') {
          if (!originalRequest?.url?.includes('/system/')) {
            showToast('error', 'Request timeout. Please try again.');
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  // ============ TOKEN MANAGEMENT ============
  getStoredToken() {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('token');
    } catch {
      return null;
    }
  }

  setStoredToken(token) {
    if (typeof window === 'undefined') return;
    try {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('[API] Failed to set token:', error);
    }
  }

  getRefreshToken() {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('refresh_token');
    } catch {
      return null;
    }
  }

  setRefreshToken(token) {
    if (typeof window === 'undefined') return;
    try {
      if (token) {
        localStorage.setItem('refresh_token', token);
      } else {
        localStorage.removeItem('refresh_token');
      }
    } catch (error) {
      console.error('[API] Failed to set refresh token:', error);
    }
  }

  clearSession() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    } catch (error) {
      console.error('[API] Failed to clear session:', error);
    }
    this.token = null;
  }

  setToken(token) {
    this.token = token;
    this.setStoredToken(token);
  }

  // ============ TOKEN REFRESH ============
  async refreshToken() {
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.pendingRequests.push({ resolve, reject });
      });
    }
    
    this.isRefreshing = true;
    
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await this.post('/auth/refresh', { refreshToken });
      const { access_token, refresh_token } = response.data;
      
      this.setToken(access_token);
      if (refresh_token) {
        this.setRefreshToken(refresh_token);
      }
      
      this.pendingRequests.forEach(({ resolve }) => resolve(true));
      this.pendingRequests = [];
      
      return true;
    } catch (error) {
      this.pendingRequests.forEach(({ reject }) => reject(false));
      this.pendingRequests = [];
      this.clearSession();
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  // ============ USER MANAGEMENT ============
  getCurrentUser() {
    if (typeof window === 'undefined') return null;
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  }

  setCurrentUser(user) {
    if (typeof window === 'undefined') return;
    try {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
      }
    } catch (error) {
      console.error('[API] Failed to set user:', error);
    }
  }

  isAuthenticated() {
    return !!this.getStoredToken() && !!this.getCurrentUser();
  }

  // ============ AUTH ENDPOINTS ============
  async login(email, password) {
    try {
      const emailStr = String(email || '').toLowerCase().trim();
      const passwordStr = String(password || '');
      
      if (!emailStr || !passwordStr) {
        throw new Error('Email and password are required');
      }
      
      const response = await this.post('/auth/login', { email: emailStr, password: passwordStr });
      const data = response.data;
      
      if (data.access_token) {
        this.setToken(data.access_token);
        if (data.refresh_token) {
          this.setRefreshToken(data.refresh_token);
        }
        
        const userData = data.user || data;
        
        const userObj = {
          id: userData.id,
          userId: userData.id,
          name: userData.name || emailStr.split('@')[0],
          firstName: userData.firstName || userData.name?.split(' ')[0] || '',
          lastName: userData.lastName || '',
          email: userData.email || emailStr,
          role: userData.role || 'user',
          company: userData.company || '',
          phone: userData.phone || '',
          department: userData.department || '',
          avatar: userData.avatar || null,
          createdAt: userData.createdAt,
          isActive: userData.isActive !== undefined ? userData.isActive : true,
          emailVerified: userData.emailVerified !== undefined ? userData.emailVerified : true,
          twoFactorEnabled: userData.twoFactorEnabled || false,
          googleCalendarConnected: userData.googleCalendarConnected || false,
        };
        
        this.setCurrentUser(userObj);
        return userObj;
      }
      throw new Error(data.message || 'Login failed');
    } catch (error) {
      console.error('[API] Login error:', error?.response?.data || error?.message);
      throw error;
    }
  }

  async register(userData) {
    try {
      const response = await this.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('[API] Registration error:', error?.response?.data || error?.message);
      throw error;
    }
  }

  async logout() {
    try {
      await this.post('/auth/logout');
    } catch (error) {
      console.error('[API] Logout error:', error);
    } finally {
      this.setToken(null);
      this.setRefreshToken(null);
      this.setCurrentUser(null);
      this.clearCache();
    }
  }

  async forgotPassword(email) {
    const response = await this.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token, password) {
    const response = await this.post('/auth/reset-password', { token, password });
    return response.data;
  }

  async changePassword(oldPassword, newPassword) {
    const response = await this.post('/users/change-password', { oldPassword, newPassword });
    return response.data;
  }

  async checkEmail(email) {
    if (!email || !email.includes('@') || email.length < 5) {
      return { available: true };
    }
    try {
      const response = await this.get(`/auth/check-email?email=${encodeURIComponent(email)}`);
      return response.data;
    } catch {
      return { available: true };
    }
  }

  // ============ USER ENDPOINTS ============
  async getProfile() {
    const response = await this.get('/users/profile');
    return response.data;
  }

  async updateProfile(data) {
    const response = await this.patch('/users/profile', data);
    this.invalidateCache('/users/profile');
    return response.data;
  }

  async getUserStats() {
    const response = await this.get('/users/stats');
    return response.data;
  }

  async getExperts() {
    const cacheKey = '/users/experts';
    const cached = cache.get(cacheKey);
    
    if (isCacheValid(cached)) {
      this.logRequest('cache', cacheKey, { hit: true });
      return cached.data;
    }
    
    try {
      const response = await this.get('/users/experts');
      const data = response.data;
      setCache(cacheKey, data);
      return data;
    } catch (error) {
      if (isDev) {
        console.warn('[API] Using mock experts data');
        const mockExperts = [
          { id: 1, name: 'Dr. Sarah Johnson', role: 'Senior Tech Consultant', expertise: 'AI/ML', rating: 4.9, available: true },
          { id: 2, name: 'Michael Chen', role: 'DevOps Expert', expertise: 'Cloud & Infrastructure', rating: 4.8, available: true },
          { id: 3, name: 'Emily Rodriguez', role: 'Full Stack Developer', expertise: 'React, Node.js', rating: 4.9, available: true },
        ];
        setCache(cacheKey, mockExperts);
        return mockExperts;
      }
      throw error;
    }
  }

  async getStaff() {
    const response = await this.get('/users/staff');
    return response.data;
  }

  async getStaffWithDetails() {
    const response = await this.get('/users/staff/details');
    return response.data;
  }

  async searchStaff(query, limit = 10) {
    const response = await this.get(`/users/staff/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data;
  }

  async getStaffById(id) {
    const response = await this.get(`/users/staff/${id}`);
    return response.data;
  }

  async createStaff(staffData) {
    const response = await this.post('/users/staff', staffData);
    this.invalidateCache('/users/experts');
    this.invalidateCache('/users/staff');
    return response.data;
  }

  async deleteStaff(id) {
    const response = await this.delete(`/users/staff/${id}`);
    this.invalidateCache('/users/experts');
    this.invalidateCache('/users/staff');
    return response.data;
  }

  async getAllUsers(params = {}) {
    const response = await this.get('/users', { params });
    return response.data;
  }

  async deactivateAccount(reason) {
    const response = await this.post('/users/deactivate', { reason });
    return response.data;
  }

  async reactivateAccount() {
    const response = await this.post('/users/reactivate');
    return response.data;
  }

  async getSecurityStatus() {
    const response = await this.get('/users/security/status');
    return response.data;
  }

  // ============ APPOINTMENT ENDPOINTS ============
  async getMyAppointments(params = {}) {
    const cacheKey = getCacheKey('/appointments/my', params);
    const cached = cache.get(cacheKey);
    
    if (isCacheValid(cached)) {
      return cached.data;
    }
    
    const response = await this.get('/appointments/my', { params });
    setCache(cacheKey, response.data);
    return response.data;
  }

  async getAppointmentStats() {
    const cacheKey = '/appointments/stats';
    const cached = cache.get(cacheKey);
    
    if (isCacheValid(cached)) {
      return cached.data;
    }
    
    const response = await this.get('/appointments/stats');
    setCache(cacheKey, response.data);
    return response.data;
  }

  async createAppointment(data) {
    const response = await this.post('/appointments', data);
    this.invalidateCache('/appointments/my');
    this.invalidateCache('/appointments/stats');
    return response.data;
  }

  async cancelAppointment(id) {
    const response = await this.delete(`/appointments/${id}`);
    this.clearCache();
    return response.data;
  }

  async updateAppointmentStatus(id, status, comment = '') {
    const response = await this.patch(`/appointments/${id}`, { status, comment });
    this.clearCache();
    return response.data;
  }

  async getAvailableSlots(expertId, date) {
    const response = await this.post('/appointments/available-slots', { expertId, date });
    return response.data;
  }

  // ============ STAFF APPOINTMENT ENDPOINTS ============
  async getStaffAppointments(params = {}) {
    const cacheKey = getCacheKey('/appointments/staff', params);
    const cached = cache.get(cacheKey);
    
    if (isCacheValid(cached)) {
      return cached.data;
    }
    
    const response = await this.get('/appointments/staff', { params });
    setCache(cacheKey, response.data);
    return response.data;
  }

  async updateStaffAppointmentStatus(id, status, comment = '') {
    const response = await this.patch(`/appointments/staff/${id}`, { status, comment });
    this.clearCache();
    return response.data;
  }

  async getStaffAppointmentStats() {
    const cacheKey = '/appointments/staff/stats';
    const cached = cache.get(cacheKey);
    
    if (isCacheValid(cached)) {
      return cached.data;
    }
    
    const response = await this.get('/appointments/staff/stats');
    setCache(cacheKey, response.data);
    return response.data;
  }

  async exportStaffAppointments(params = {}) {
    const response = await this.get('/appointments/staff/export', { 
      params,
      responseType: 'blob'
    });
    return response.data;
  }

  async getStaffAppointmentDetails(id) {
    const response = await this.get(`/appointments/staff/${id}`);
    return response.data;
  }

  // ============ CONSULTATION ENDPOINTS ============
  async getServices() {
    const cacheKey = '/services';
    const cached = cache.get(cacheKey);
    
    if (isCacheValid(cached)) {
      return cached.data;
    }
    
    const response = await this.get('/services');
    setCache(cacheKey, response.data);
    return response.data;
  }

  async getMyConsultations(params = {}) {
    const response = await this.get('/consultations/my', { params });
    return response.data;
  }

  async getUserBookingStats() {
    const response = await this.get('/consultations/user-stats');
    return response.data;
  }

  async getUserBookingLimits() {
    const response = await this.get('/consultations/my-limits');
    return response.data;
  }

  async getRecentConsultations() {
    const response = await this.get('/consultations/my/recent');
    return response.data;
  }

  async bookConsultation(data) {
    const response = await this.post('/consultations', data);
    this.invalidateCache('/consultations/my');
    this.invalidateCache('/consultations/user-stats');
    this.invalidateCache('/consultations/my-limits');
    return response.data;
  }

  async cancelConsultation(id) {
    const response = await this.delete(`/consultations/${id}`);
    this.clearCache();
    return response.data;
  }

  async updateConsultationStatus(id, status, comment = '') {
    const response = await this.patch(`/consultations/${id}`, { status, comment });
    this.clearCache();
    return response.data;
  }

  // ============ NOTIFICATION ENDPOINTS ============
  async getNotifications(params = {}) {
    const response = await this.get('/notifications', { params });
    return response.data;
  }

  async getNotificationStats() {
    const response = await this.get('/notifications/stats');
    return response.data;
  }

  async getUnreadCount() {
    const response = await this.get('/notifications/unread/count');
    return response.data;
  }

  async markNotificationRead(id) {
    const response = await this.patch(`/notifications/${id}/read`);
    return response.data;
  }

  async markMultipleNotificationsRead(notificationIds) {
    const response = await this.post('/notifications/mark-read', { notificationIds });
    return response.data;
  }

  async markAllNotificationsRead() {
    const response = await this.post('/notifications/mark-all-read');
    return response.data;
  }

  async deleteNotification(id) {
    const response = await this.delete(`/notifications/${id}`);
    return response.data;
  }

  async sendAnnouncement(title, message, target = 'all') {
    const response = await this.post('/notifications/announcement', { title, message, target });
    return response.data;
  }

  // ============ FILE UPLOAD ENDPOINTS ============
  async uploadFile(file, consultationId = null, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (consultationId) formData.append('consultationId', consultationId);
    
    const config = {
      headers: { 'Content-Type': 'multipart/form-data' },
    };
    
    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      };
    }
    
    const response = await this.post('/uploads', formData, config);
    this.invalidateCache('/uploads/user');
    return response.data;
  }

  async getUserFiles() {
    const response = await this.get('/uploads/user');
    return response.data;
  }

  async deleteFile(fileId) {
    const response = await this.delete(`/uploads/${fileId}`);
    this.invalidateCache('/uploads/user');
    return response.data;
  }

  // ============ FEEDBACK ENDPOINTS ============
  async submitFeedback(consultationId, rating, comment) {
    const response = await this.post(`/feedback/${consultationId}`, { rating, comment });
    return response.data;
  }

  async getFeedbackStats() {
    const response = await this.get('/feedback/stats');
    return response.data;
  }

  async getMyFeedback() {
    const response = await this.get('/feedback/my');
    return response.data;
  }

  async getConsultationFeedback(consultationId) {
    const response = await this.get(`/feedback/consultation/${consultationId}`);
    return response.data;
  }

  async updateFeedback(consultationId, rating, comment) {
    const response = await this.post(`/feedback/${consultationId}/update`, { rating, comment });
    return response.data;
  }

  async getRecentFeedback(limit = 10) {
    const response = await this.get(`/feedback/recent?limit=${limit}`);
    return response.data;
  }

  // ============ SYSTEM ENDPOINTS ============
  async getSystemStatus() {
    try {
      const response = await this.get('/system/status', { timeout: 5000 });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return { 
          status: 'online', 
          online: true, 
          version: '2.0.0',
          maintenance: false,
          error: 'Endpoint not found but server is running'
        };
      }
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
        return { 
          status: 'degraded', 
          online: false, 
          error: error?.message || 'Network error'
        };
      }
      return { 
        status: 'degraded', 
        online: false, 
        error: error?.message || 'System status unavailable'
      };
    }
  }

  async getSystemHealth() {
    try {
      const response = await this.get('/system/health', { timeout: 5000 });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        return { status: 'online', online: true };
      }
      return { status: 'degraded', online: false, error: error?.message };
    }
  }

  // ============ GOOGLE CALENDAR ENDPOINTS ============
  async getGoogleCalendarStatus() {
    try {
      const response = await this.get('/google-calendar/status');
      return response.data;
    } catch (error) {
      if (isDev) {
        return { connected: false, email: null };
      }
      throw error;
    }
  }

  async getGoogleCalendarAuthUrl() {
    const response = await this.get('/google-calendar/auth-url');
    return response.data;
  }

  async connectGoogleCalendar(code) {
    const response = await this.post('/google-calendar/connect', { code });
    return response.data;
  }

  async disconnectGoogleCalendar() {
    const response = await this.delete('/google-calendar/disconnect');
    return response.data;
  }

  async syncGoogleCalendar() {
    const response = await this.post('/google-calendar/sync');
    return response.data;
  }

  async getGoogleCalendarEvents(date) {
    const response = await this.get(`/google-calendar/events?date=${date}`);
    return response.data;
  }

  async getGoogleCalendarAvailableSlots(staffId, date) {
    try {
      const response = await this.get(`/google-calendar/available-slots?staffId=${staffId}&date=${date}`);
      return response.data;
    } catch (error) {
      if (isDev) {
        console.log('Google Calendar not available, returning empty array');
      }
      return [];
    }
  }

  // ============ ADMIN ENDPOINTS ============
  async getAdminStats() {
    const response = await this.get('/admin/stats');
    return response.data;
  }

  async getGlobalLimits() {
    const response = await this.get('/admin/limits/global');
    return response.data;
  }

  async updateGlobalLimits(limits) {
    const response = await this.put('/admin/limits/global', limits);
    return response.data;
  }

  async getUserLimits(userId) {
    const response = await this.get(`/admin/limits/user/${userId}`);
    return response.data;
  }

  async updateUserLimits(userId, limits) {
    const response = await this.put(`/admin/limits/user/${userId}`, limits);
    return response.data;
  }

  async removeUserLimitOverride(userId) {
    const response = await this.delete(`/admin/limits/user/${userId}`);
    return response.data;
  }

  async blockUser(userId, reason) {
    const response = await this.post(`/admin/users/${userId}/block`, { reason });
    return response.data;
  }

  async unblockUser(userId) {
    const response = await this.post(`/admin/users/${userId}/unblock`);
    return response.data;
  }

  async resetSpamCounter(userId) {
    const response = await this.post(`/admin/users/${userId}/reset-spam`);
    return response.data;
  }

  async getAllUsersWithLimits(params = {}) {
    const response = await this.get('/admin/users/limits', { params });
    return response.data;
  }

  async getSystemSettings() {
    const response = await this.get('/admin/settings');
    return response.data;
  }

  async updateSystemSettings(settings) {
    const response = await this.put('/admin/settings', settings);
    return response.data;
  }

  // ============ GENERIC METHODS WITH RETRY ============
  async get(url, config = {}, retryCount = 0) {
    try {
      const response = await this.api.get(url, config);
      return response;
    } catch (error) {
      if (this.shouldRetry(error, retryCount)) {
        await this.delay(RETRY_DELAY * Math.pow(2, retryCount));
        if (config.metadata) config.metadata.attempt = retryCount + 1;
        return this.get(url, config, retryCount + 1);
      }
      throw error;
    }
  }

  async post(url, data, config = {}, retryCount = 0) {
    try {
      const response = await this.api.post(url, data, config);
      return response;
    } catch (error) {
      if (this.shouldRetry(error, retryCount)) {
        await this.delay(RETRY_DELAY * Math.pow(2, retryCount));
        if (config.metadata) config.metadata.attempt = retryCount + 1;
        return this.post(url, data, config, retryCount + 1);
      }
      throw error;
    }
  }

  async patch(url, data, config = {}, retryCount = 0) {
    try {
      const response = await this.api.patch(url, data, config);
      return response;
    } catch (error) {
      if (this.shouldRetry(error, retryCount)) {
        await this.delay(RETRY_DELAY * Math.pow(2, retryCount));
        if (config.metadata) config.metadata.attempt = retryCount + 1;
        return this.patch(url, data, config, retryCount + 1);
      }
      throw error;
    }
  }

  async put(url, data, config = {}, retryCount = 0) {
    try {
      const response = await this.api.put(url, data, config);
      return response;
    } catch (error) {
      if (this.shouldRetry(error, retryCount)) {
        await this.delay(RETRY_DELAY * Math.pow(2, retryCount));
        if (config.metadata) config.metadata.attempt = retryCount + 1;
        return this.put(url, data, config, retryCount + 1);
      }
      throw error;
    }
  }

  async delete(url, config = {}, retryCount = 0) {
    try {
      const response = await this.api.delete(url, config);
      return response;
    } catch (error) {
      if (this.shouldRetry(error, retryCount)) {
        await this.delay(RETRY_DELAY * Math.pow(2, retryCount));
        if (config.metadata) config.metadata.attempt = retryCount + 1;
        return this.delete(url, config, retryCount + 1);
      }
      throw error;
    }
  }

  shouldRetry(error, retryCount) {
    if (retryCount >= MAX_RETRIES) return false;
    if (error.response?.status === 401) return false;
    if (error.response?.status === 403) return false;
    if (error.response?.status === 404 && !error.config?.url?.includes('/system/')) return false;
    if (error.response?.status && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 429) return false;
    return error.code === 'ERR_NETWORK' || 
           error.code === 'ECONNABORTED' || 
           (error.response?.status >= 500 && error.response?.status < 600) ||
           error.response?.status === 429;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============ CACHE MANAGEMENT ============
  clearCache() {
    cache.clear();
    if (isDev) {
      console.log('[API] Cache cleared');
    }
  }

  invalidateCache(urlPattern) {
    let invalidatedCount = 0;
    for (const key of cache.keys()) {
      if (key.includes(urlPattern)) {
        cache.delete(key);
        invalidatedCount++;
      }
    }
    if (isDev && invalidatedCount > 0) {
      console.log(`[API] Invalidated ${invalidatedCount} cache entries for pattern: ${urlPattern}`);
    }
  }

  getCacheStats() {
    return {
      size: cache.size,
      keys: Array.from(cache.keys()),
    };
  }
}

// ============ CREATE AND EXPORT SINGLETON INSTANCE ============
const apiService = new ApiService();

// DEFAULT EXPORT
export default apiService;

// ============ NAMED EXPORTS ============
export const login = (email, password) => apiService.login(email, password);
export const register = (userData) => apiService.register(userData);
export const logout = () => apiService.logout();
export const getCurrentUser = () => apiService.getCurrentUser();
export const isAuthenticated = () => apiService.isAuthenticated();
export const getProfile = () => apiService.getProfile();
export const updateProfile = (data) => apiService.updateProfile(data);
export const getUserStats = () => apiService.getUserStats();
export const getExperts = () => apiService.getExperts();
export const getStaff = () => apiService.getStaff();
export const getStaffWithDetails = () => apiService.getStaffWithDetails();
export const searchStaff = (query, limit) => apiService.searchStaff(query, limit);
export const getStaffById = (id) => apiService.getStaffById(id);
export const createStaff = (staffData) => apiService.createStaff(staffData);
export const deleteStaff = (id) => apiService.deleteStaff(id);
export const getAllUsers = (params) => apiService.getAllUsers(params);
export const deactivateAccount = (reason) => apiService.deactivateAccount(reason);
export const reactivateAccount = () => apiService.reactivateAccount();
export const getSecurityStatus = () => apiService.getSecurityStatus();
export const getMyAppointments = (params) => apiService.getMyAppointments(params);
export const getAppointmentStats = () => apiService.getAppointmentStats();
export const createAppointment = (data) => apiService.createAppointment(data);
export const cancelAppointment = (id) => apiService.cancelAppointment(id);
export const updateAppointmentStatus = (id, status, comment) => apiService.updateAppointmentStatus(id, status, comment);
export const getAvailableSlots = (expertId, date) => apiService.getAvailableSlots(expertId, date);
export const getStaffAppointments = (params) => apiService.getStaffAppointments(params);
export const updateStaffAppointmentStatus = (id, status, comment) => apiService.updateStaffAppointmentStatus(id, status, comment);
export const getStaffAppointmentStats = () => apiService.getStaffAppointmentStats();
export const exportStaffAppointments = (params) => apiService.exportStaffAppointments(params);
export const getStaffAppointmentDetails = (id) => apiService.getStaffAppointmentDetails(id);
export const getServices = () => apiService.getServices();
export const getMyConsultations = (params) => apiService.getMyConsultations(params);
export const getUserBookingStats = () => apiService.getUserBookingStats();
export const getUserBookingLimits = () => apiService.getUserBookingLimits();
export const getRecentConsultations = () => apiService.getRecentConsultations();
export const bookConsultation = (data) => apiService.bookConsultation(data);
export const cancelConsultation = (id) => apiService.cancelConsultation(id);
export const updateConsultationStatus = (id, status, comment) => apiService.updateConsultationStatus(id, status, comment);
export const getNotifications = (params) => apiService.getNotifications(params);
export const getNotificationStats = () => apiService.getNotificationStats();
export const getUnreadCount = () => apiService.getUnreadCount();
export const markNotificationRead = (id) => apiService.markNotificationRead(id);
export const markMultipleNotificationsRead = (ids) => apiService.markMultipleNotificationsRead(ids);
export const markAllNotificationsRead = () => apiService.markAllNotificationsRead();
export const deleteNotification = (id) => apiService.deleteNotification(id);
export const sendAnnouncement = (title, message, target) => apiService.sendAnnouncement(title, message, target);
export const uploadFile = (file, consultationId, onProgress) => apiService.uploadFile(file, consultationId, onProgress);
export const getUserFiles = () => apiService.getUserFiles();
export const deleteFile = (fileId) => apiService.deleteFile(fileId);
export const submitFeedback = (consultationId, rating, comment) => apiService.submitFeedback(consultationId, rating, comment);
export const getFeedbackStats = () => apiService.getFeedbackStats();
export const getMyFeedback = () => apiService.getMyFeedback();
export const getConsultationFeedback = (consultationId) => apiService.getConsultationFeedback(consultationId);
export const updateFeedback = (consultationId, rating, comment) => apiService.updateFeedback(consultationId, rating, comment);
export const getRecentFeedback = (limit) => apiService.getRecentFeedback(limit);
export const getSystemStatus = () => apiService.getSystemStatus();
export const getSystemHealth = () => apiService.getSystemHealth();
export const getGoogleCalendarStatus = () => apiService.getGoogleCalendarStatus();
export const getGoogleCalendarAuthUrl = () => apiService.getGoogleCalendarAuthUrl();
export const connectGoogleCalendar = (code) => apiService.connectGoogleCalendar(code);
export const disconnectGoogleCalendar = () => apiService.disconnectGoogleCalendar();
export const syncGoogleCalendar = () => apiService.syncGoogleCalendar();
export const getGoogleCalendarEvents = (date) => apiService.getGoogleCalendarEvents(date);
export const getGoogleCalendarAvailableSlots = (staffId, date) => apiService.getGoogleCalendarAvailableSlots(staffId, date);
export const getAdminStats = () => apiService.getAdminStats();
export const getGlobalLimits = () => apiService.getGlobalLimits();
export const updateGlobalLimits = (limits) => apiService.updateGlobalLimits(limits);
export const getUserLimits = (userId) => apiService.getUserLimits(userId);
export const updateUserLimits = (userId, limits) => apiService.updateUserLimits(userId, limits);
export const removeUserLimitOverride = (userId) => apiService.removeUserLimitOverride(userId);
export const blockUser = (userId, reason) => apiService.blockUser(userId, reason);
export const unblockUser = (userId) => apiService.unblockUser(userId);
export const resetSpamCounter = (userId) => apiService.resetSpamCounter(userId);
export const getAllUsersWithLimits = (params) => apiService.getAllUsersWithLimits(params);
export const getSystemSettings = () => apiService.getSystemSettings();
export const updateSystemSettings = (settings) => apiService.updateSystemSettings(settings);
export const changePassword = (oldPassword, newPassword) => apiService.changePassword(oldPassword, newPassword);
export const forgotPassword = (email) => apiService.forgotPassword(email);
export const resetPassword = (token, password) => apiService.resetPassword(token, password);
export const checkEmail = (email) => apiService.checkEmail(email);