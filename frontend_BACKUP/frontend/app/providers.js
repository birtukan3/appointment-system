// frontend/app/providers.js
// ============================================
// COMPLETE AUTH PROVIDER WITH CONTEXT
// ============================================

"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from './lib/api';
import { showSuccess, showError, showInfo } from './lib/toastUtils';

export const AppContext = createContext();

export const getDefaultRouteForRole = (role) => {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'staff':
      return '/staff';
    case 'user':
      return '/dashboard';
    default:
      return '/login';
  }
};

export const useAuth = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAuth must be used within a Providers component');
  }
  return context;
};

export function Providers({ children }) {
  const router = useRouter();
  
  // User State
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  // System State
  const [systemStatus, setSystemStatus] = useState({
    online: true,
    maintenance: false,
    message: null,
  });
  
  // UI State
  const [theme, setTheme] = useState('light');
  
  // Refs
  const authCheckDoneRef = useRef(false);
  
  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (authCheckDoneRef.current) return;
      
      try {
        const token = api.getStoredToken();
        const savedUser = api.getCurrentUser();
        
        if (token && savedUser) {
          setUser(savedUser);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
        setAuthInitialized(true);
        authCheckDoneRef.current = true;
      }
    };
    
    checkAuth();
    
    // Check system status periodically
    const checkSystem = async () => {
      try {
        const status = await api.getSystemStatus();
        setSystemStatus({
          online: status.online !== false,
          maintenance: status.maintenance || false,
          message: status.message || null,
        });
      } catch (error) {
        setSystemStatus(prev => ({ ...prev, online: false }));
      }
    };
    
    checkSystem();
    const interval = setInterval(checkSystem, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);
  
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  
  // Login function
  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const userData = await api.login(email, password);
      setUser(userData);
      setIsAuthenticated(true);
      showSuccess(`Welcome back, ${userData.name || 'User'}!`);
      return userData;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      showError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Register function
  const register = useCallback(async (userData) => {
    setLoading(true);
    try {
      const response = await api.register(userData);
      showSuccess('Registration successful! Please login.');
      setTimeout(() => router.push('/login'), 1500);
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      showError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [router]);
  
  // Logout function
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      showSuccess('Logged out successfully');
      router.push('/');
      setLoading(false);
    }
  }, [router]);
  
  // Update user profile
  const updateUser = useCallback(async (userData) => {
    try {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      api.setCurrentUser(updatedUser);
      return updatedUser;
    } catch (error) {
      showError('Failed to update profile');
      throw error;
    }
  }, [user]);
  
  // Change password
  const changePassword = useCallback(async (oldPassword, newPassword) => {
    try {
      await api.changePassword(oldPassword, newPassword);
      showSuccess('Password changed successfully');
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to change password';
      showError(message);
      throw error;
    }
  }, []);
  
  // Memoized context value
  const value = useMemo(() => ({
    user,
    setUser,
    isAuthenticated,
    loading,
    authInitialized,
    systemStatus,
    theme,
    toggleTheme,
    login,
    register,
    logout,
    updateUser,
    changePassword,
    getDefaultRouteForRole,
  }), [
    user,
    isAuthenticated,
    loading,
    authInitialized,
    systemStatus,
    theme,
    login,
    register,
    logout,
    updateUser,
    changePassword,
    toggleTheme,
  ]);
  
  // Loading screen while initializing auth
  if (!authInitialized && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading SmartOffice...</p>
        </div>
      </div>
    );
  }
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}