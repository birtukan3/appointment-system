"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from './lib/api';
import toast from 'react-hot-toast';

export const AppContext = createContext();

export const getDefaultRouteForRole = (role) => {
  const routes = {
    'admin': '/admin',
    'staff': '/staff',
    'user': '/dashboard',
  };
  return routes[role?.toLowerCase()] || '/dashboard';
};

export const useAuth = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAuth must be used within Providers');
  return context;
};

export function Providers({ children }) {
  const router = useRouter();
  
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [systemStatus, setSystemStatus] = useState({ online: true, maintenance: false });
  const [theme, setTheme] = useState('light');
  
  const authCheckDoneRef = useRef(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (authCheckDoneRef.current) return;
      
      try {
        const token = api.getStoredToken();
        const savedUser = api.getCurrentUser();
        
        if (token && savedUser) {
          setUser(savedUser);
          setIsAuthenticated(true);
          
          const authPages = ['/login', '/register'];
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
          if (authPages.includes(currentPath)) {
            const redirectPath = getDefaultRouteForRole(savedUser.role);
            router.replace(redirectPath);
          }
        }
      } catch (error) {
        console.error('[Auth] Check failed:', error);
      } finally {
        setLoading(false);
        setAuthInitialized(true);
        authCheckDoneRef.current = true;
      }
    };
    
    checkAuth();
    
    const checkSystem = async () => {
      try {
        const status = await api.getSystemStatus();
        setSystemStatus({ online: true, maintenance: status.maintenance || false });
      } catch {
        setSystemStatus(prev => ({ ...prev, online: false }));
      }
    };
    
    checkSystem();
    const interval = setInterval(checkSystem, 60000);
    return () => clearInterval(interval);
  }, [router]);

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

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const userData = await api.login(email, password);
      setUser(userData);
      setIsAuthenticated(true);
      toast.success(`Welcome back, ${userData.name || 'User'}!`);
      
      const redirectPath = getDefaultRouteForRole(userData.role);
      setTimeout(() => {
        router.push(redirectPath);
      }, 100);
      
      return userData;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [router]);

  const register = useCallback(async (userData) => {
    setLoading(true);
    try {
      const response = await api.register(userData);
      toast.success('Registration successful! Please login.');
      setTimeout(() => router.push('/login'), 1500);
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [router]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await api.logout();
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      toast.success('Logged out successfully');
      router.push('/');
      setLoading(false);
    }
  }, [router]);

  const updateUser = useCallback(async (userData) => {
    try {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      api.setCurrentUser(updatedUser);
      toast.success('Profile updated successfully');
      return updatedUser;
    } catch (error) {
      toast.error('Failed to update profile');
      throw error;
    }
  }, [user]);

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
    getDefaultRouteForRole,
  }), [user, isAuthenticated, loading, authInitialized, systemStatus, theme, login, register, logout, updateUser, toggleTheme]);

  if (!authInitialized && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading SmartOffice...</p>
        </div>
      </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}