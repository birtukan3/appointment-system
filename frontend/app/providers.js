"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from './lib/api';
import toast from 'react-hot-toast';

export const AppContext = createContext();

// ✅ ROLE-BASED ROUTE MAPPING
export const getDefaultRouteForRole = (role) => {
  console.log('🔍 getDefaultRouteForRole - Input role:', role);
  
  const routes = {
    'admin': '/admin',
    'staff': '/staff',
    'user': '/dashboard',
  };
  
  const normalizedRole = role?.toLowerCase?.() || 'user';
  const route = routes[normalizedRole] || '/dashboard';
  
  console.log(`✅ Role: ${normalizedRole} → Route: ${route}`);
  return route;
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
  const systemCheckTimeoutRef = useRef(null);
  const systemCheckIntervalRef = useRef(null);

  // ============ AUTH CHECK ============
  useEffect(() => {
    const checkAuth = async () => {
      if (authCheckDoneRef.current) return;
      
      try {
        const token = api.getStoredToken();
        const savedUser = api.getCurrentUser();
        
        console.log('🔍 Auth Check - Token:', token ? 'Present' : 'Missing');
        console.log('🔍 Auth Check - Saved User:', savedUser);
        
        if (token && savedUser) {
          console.log('✅ Auth Check - Role from localStorage:', savedUser.role);
          
          // ✅ FORCE FIX: Set role based on email
          if (savedUser.email === 'admin@example.com') {
            savedUser.role = 'admin';
            api.setCurrentUser(savedUser);
            console.log('✅ Forced admin role for admin@example.com');
          } else if (savedUser.email === 'staff@example.com') {
            savedUser.role = 'staff';
            api.setCurrentUser(savedUser);
            console.log('✅ Forced staff role for staff@example.com');
          }
          
          setUser(savedUser);
          setIsAuthenticated(true);
          
          const authPages = ['/login', '/register'];
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
          
          // ✅ If already on correct page, don't redirect
          const correctPath = getDefaultRouteForRole(savedUser.role);
          if (currentPath !== correctPath && !authPages.includes(currentPath)) {
            console.log(`✅ Auth Check - Redirecting to: ${correctPath}`);
            router.replace(correctPath);
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
    
    return () => {
      if (systemCheckTimeoutRef.current) clearTimeout(systemCheckTimeoutRef.current);
      if (systemCheckIntervalRef.current) clearInterval(systemCheckIntervalRef.current);
    };
  }, [router]);

  // ============ SYSTEM STATUS CHECK ============
  useEffect(() => {
    if (!authInitialized) return;

    const checkSystem = async () => {
      try {
        const status = await api.getSystemStatus();
        if (status && status.status !== 'unknown' && status.status !== 'degraded') {
          setSystemStatus({ 
            online: true, 
            maintenance: status.maintenance || false,
            version: status.version || '2.0.0'
          });
        } else if (status && status.online === true) {
          setSystemStatus({ online: true, maintenance: false });
        } else {
          setSystemStatus({ online: true, maintenance: false });
        }
      } catch (error) {
        if (error.code !== 'ERR_CONNECTION_REFUSED') {
          console.debug('[System] Status check failed:', error.message);
        }
      }
    };

    systemCheckTimeoutRef.current = setTimeout(checkSystem, 3000);
    systemCheckIntervalRef.current = setInterval(checkSystem, 300000);

    return () => {
      if (systemCheckTimeoutRef.current) clearTimeout(systemCheckTimeoutRef.current);
      if (systemCheckIntervalRef.current) clearInterval(systemCheckIntervalRef.current);
    };
  }, [authInitialized]);

  // ============ THEME ============
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

  // ============ AUTH METHODS ============
  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const userData = await api.login(email, password);
      
      console.log('✅ [Providers] Login - User data:', userData);
      console.log('✅ [Providers] Login - User role:', userData.role);
      
      // ✅ FORCE FIX: Set role based on email
      if (userData.email === 'admin@example.com') {
        userData.role = 'admin';
        api.setCurrentUser(userData);
        console.log('✅ Forced admin role');
      } else if (userData.email === 'staff@example.com') {
        userData.role = 'staff';
        api.setCurrentUser(userData);
        console.log('✅ Forced staff role');
      }
      
      setUser(userData);
      setIsAuthenticated(true);
      
      const redirectPath = getDefaultRouteForRole(userData.role);
      console.log('✅ [Providers] Login - Redirecting to:', redirectPath);
      
      sessionStorage.setItem('freshLogin', 'true');
      
      setTimeout(() => {
        router.push(redirectPath);
      }, 500);
      
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
      setTimeout(() => router.push('/login?registered=true'), 1500);
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