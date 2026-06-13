// frontend/app/lib/api.js
// ============================================
// COMPLETE PRODUCTION-READY API SERVICE
// Version: 2.0.0
// Features: Auth, Retry, Cache, Rate Limiting, File Upload
// ============================================

import axios from 'axios';

// ============ CONFIGURATION ============
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';
const API_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// ============ CACHE MANAGEMENT ============
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCacheKey = (url, params) => {
  return `${url}:${JSON.stringify(params || {})}`;
};

const isCacheValid = (cached) => {
  return cached && Date.now() - cached.timestamp < CACHE_DURATION;
};

const setCache = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// ============ TOAST DEDUPLICATION ============
const toastCache = new Map();
const TOAST_CACHE_DURATION = 2000;

const showToast = (type, message, options = {}) => {
  const key = `${type}:${message}`;
  if (toastCache.has(key)) return null;
  
  toastCache.set(key, true);
  setTimeout(() => toastCache.delete(key), TOAST_CACHE_DURATION);
  
  // Import toast dynamically to avoid circular dependencies
  import('react-hot-toast').then(({ default: toast }) => {
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
          iconTheme: { primary: '#fff', secondary: '#10b981' },
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
  });
  
  return key;
};

// ============ MAIN API SERVICE ============
class ApiService {
  constructor() {
    this.token = null;
    this.refreshPromise = null;
    this.isRefreshing = false;
    this.pendingRequests = [];
    
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: API_TIMEOUT,
    });

    this.setupInterceptors();
  }

  // ============ INTERCEPTORS ============
  setupInterceptors() {
    // Request Interceptor
    this.api.interceptors.request.use(
      (config) => {
        const token = this.token || this.getStoredToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add request ID for tracking
        config.metadata = { startTime: Date.now(), requestId: Math.random().toString(36).substring(7) };
        
        // Log in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        }
        
        return config;
      },
      (error) => {
        console.error('[API] Request Error:', error.message);
        return Promise.reject(error);
      }
    );

    // Response Interceptor
    this.api.interceptors.response.use(
      (response) => {
        // Log duration in development
        if (process.env.NODE_ENV === 'development' && response.config.metadata) {
          const duration = Date.now() - response.config.metadata.startTime;
          console.log(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`);
        }
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        
        // Handle 401 Unauthorized - Token expired
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          // Try to refresh token
          const refreshed = await this.refreshToken();
          if (refreshed) {
            originalRequest.headers.Authorization = `Bearer ${this.token || this.getStoredToken()}`;
            return this.api(originalRequest);
          }
          
          // Clear session and redirect to login
          this.clearSession();
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
        
        // Handle 429 Too Many Requests
        if (error.response?.status === 429) {
          const retryAfter = error.response?.headers?.['retry-after'] || 30;
          showToast('warning', `Too many requests. Please try again in ${retryAfter} seconds.`);
        }
        
        // Handle Network Errors
        if (error.code === 'ERR_NETWORK') {
          showToast('error', 'Network error. Please check your connection.');
        }
        
        // Handle Timeout
        if (error.code === 'ECONNABORTED') {
          showToast('error', 'Request timeout. Please try again.');
        }
        
        // Log error details
        if (process.env.NODE_ENV === 'development') {
          console.error('[API] Response Error:', {
            status: error.response?.status,
            message: error.message,
            url: originalRequest?.url,
          });
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
      
      // Resolve all pending requests
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
      const response = await this.post('/auth/login', { email, password });
      const data = response.data;
      
      if (data.access_token) {
        this.setToken(data.access_token);
        if (data.refresh_token) {
          this.setRefreshToken(data.refresh_token);
        }
        
        const userData = {
          id: data.id || data.userId,
          userId: data.id || data.userId,
          name: data.name,
          email: data.email,
          role: data.role,
          company: data.company || '',
          phone: data.phone || '',
          department: data.department || '',
          avatar: data.avatar || null,
        };
        
        this.setCurrentUser(userData);
        return userData;
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
    return response.data;
  }

  async getStaff() {
    const response = await this.get('/users/staff');
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

  async getUserBookingStats() {
    const response = await this.get('/appointments/user-stats');
    return response.data;
  }

  async getUserBookingLimits() {
    const response = await this.get('/appointments/my-limits');
    return response.data;
  }

  async createAppointment(data) {
    const response = await this.post('/appointments', data);
    // Invalidate relevant caches
    cache.delete('/appointments/my');
    cache.delete('/appointments/stats');
    return response.data;
  }

  async cancelAppointment(id) {
    const response = await this.patch(`/appointments/${id}`, { status: 'cancelled' });
    cache.clear(); // Clear all caches on status change
    return response.data;
  }

  async updateAppointmentStatus(id, status, comment = '') {
    const response = await this.patch(`/appointments/${id}`, { status, comment });
    cache.clear();
    return response.data;
  }

  async getAvailableSlots(staffId, date, duration = 60) {
    const cacheKey = getCacheKey('/appointments/available-slots', { staffId, date, duration });
    const cached = cache.get(cacheKey);
    
    if (isCacheValid(cached)) {
      return cached.data;
    }
    
    const response = await this.post('/appointments/available-slots', { staffId, date, duration });
    setCache(cacheKey, response.data);
    return response.data;
  }

  async approveWithCode(approvalCode) {
    const response = await this.post('/appointments/approve-with-code', { approvalCode });
    cache.clear();
    return response.data;
  }

  // ============ NOTIFICATION ENDPOINTS ============
  async getNotifications() {
    const response = await this.get('/notifications');
    return response.data;
  }

  async getNotificationStats() {
    const response = await this.get('/notifications/stats');
    return response.data;
  }

  async markNotificationRead(id) {
    const response = await this.patch(`/notifications/${id}/read`);
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

  // ============ FILE UPLOAD ENDPOINTS ============
  async uploadFile(file, appointmentId = null, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (appointmentId) formData.append('appointmentId', appointmentId);
    
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
    return response.data;
  }

  async getUserFiles() {
    const response = await this.get('/uploads/user');
    return response.data;
  }

  async deleteFile(fileId) {
    const response = await this.delete(`/uploads/${fileId}`);
    return response.data;
  }

  // ============ FEEDBACK ENDPOINTS ============
  async submitFeedback(appointmentId, data) {
    const response = await this.post(`/feedback/${appointmentId}`, data);
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

  // ============ SYSTEM ENDPOINTS ============
  async getSystemStatus() {
    try {
      const response = await this.get('/system/status');
      return response.data;
    } catch (error) {
      console.error('[API] System status error:', error?.message);
      return { status: 'unknown', online: false };
    }
  }

  async getSystemHealth() {
    try {
      const response = await this.get('/system/health');
      return response.data;
    } catch (error) {
      return { status: 'degraded', error: error?.message };
    }
  }

  // ============ ADMIN ENDPOINTS ============
  async getAdminStats() {
    const response = await this.get('/admin/stats');
    return response.data;
  }

  async getAllUsers(params = {}) {
    const response = await this.get('/admin/users', { params });
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

  async getUserLimits(userId) {
    const response = await this.get(`/admin/limits/user/${userId}`);
    return response.data;
  }

  async updateUserLimits(userId, limits) {
    const response = await this.put(`/admin/limits/user/${userId}`, limits);
    return response.data;
  }

  // ============ GOOGLE CALENDAR ENDPOINTS ============
  async getGoogleCalendarStatus() {
    const response = await this.get('/google-calendar/status');
    return response.data;
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

  // ============ AUDIT LOG ENDPOINTS ============
  async getAuditLogs(params = {}) {
    const response = await this.get('/audit-logs', { params });
    return response.data;
  }

  async getAuditStats(params = {}) {
    const response = await this.get('/audit-logs/stats', { params });
    return response.data;
  }

  async exportAuditLogs(params = {}) {
    const response = await this.get('/audit-logs/export', { params, responseType: 'blob' });
    return response;
  }

  // ============ GENERIC METHODS WITH RETRY ============
  async get(url, config = {}, retryCount = 0) {
    try {
      const response = await this.api.get(url, config);
      return response;
    } catch (error) {
      if (this.shouldRetry(error, retryCount)) {
        await this.delay(RETRY_DELAY * (retryCount + 1));
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
        await this.delay(RETRY_DELAY * (retryCount + 1));
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
        await this.delay(RETRY_DELAY * (retryCount + 1));
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
        await this.delay(RETRY_DELAY * (retryCount + 1));
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
        await this.delay(RETRY_DELAY * (retryCount + 1));
        return this.delete(url, config, retryCount + 1);
      }
      throw error;
    }
  }

  shouldRetry(error, retryCount) {
    // Don't retry if max retries exceeded
    if (retryCount >= MAX_RETRIES) return false;
    
    // Don't retry on 4xx errors (except 429)
    if (error.response?.status && error.response.status >= 400 && error.response.status !== 429) {
      return false;
    }
    
    // Don't retry on 401 (auth errors)
    if (error.response?.status === 401) return false;
    
    // Retry on network errors, timeouts, and 5xx errors
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
  }

  invalidateCache(urlPattern) {
    for (const key of cache.keys()) {
      if (key.includes(urlPattern)) {
        cache.delete(key);
      }
    }
  }
}

export default new ApiService();