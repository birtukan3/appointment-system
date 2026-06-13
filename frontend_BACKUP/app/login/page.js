// frontend/app/login/page.js - COMPLETE WORKING VERSION
"use client";

import { useState, useContext, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext, getDefaultRouteForRole } from '../providers';
import { 
  Mail, Lock, Eye, EyeOff, AlertCircle, Shield, Smartphone, 
  Key, ChevronRight, CheckCircle, Timer, Clock, ArrowLeft, 
  LogIn, Sparkles, Home, Zap, Award, Fingerprint
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user, loading: authLoading } = useContext(AppContext);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [focusedField, setFocusedField] = useState(null);
  const [touchedFields, setTouchedFields] = useState({ email: false, password: false });
  
  // Refs for preventing duplicate submissions
  const submitLockRef = useRef(false);
  const redirectHandledRef = useRef(false);
  const lockIntervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Handle navigation to home
  const handleGoHome = useCallback(() => {
    router.push('/');
  }, [router]);

  // Load saved credentials
  useEffect(() => {
    const savedEmail = localStorage.getItem("savedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
    
    const lockUntil = localStorage.getItem("login_lock_until");
    if (lockUntil && new Date(lockUntil) > new Date()) {
      setIsLocked(true);
      startLockTimer(new Date(lockUntil));
    }
    
    const savedAttempts = localStorage.getItem("login_attempts");
    if (savedAttempts) {
      setRemainingAttempts(parseInt(savedAttempts, 10));
    }
    
    return () => {
      if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user || redirectHandledRef.current) return;
    redirectHandledRef.current = true;
    
    const timer = setTimeout(() => {
      router.replace(getDefaultRouteForRole(user.role));
    }, 100);
    
    return () => clearTimeout(timer);
  }, [authLoading, isAuthenticated, router, user]);

  // Start lock timer
  const startLockTimer = useCallback((lockUntil) => {
    if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);
    
    lockIntervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockUntil.getTime() - Date.now()) / 1000));
      setLockTimer(remaining);
      
      if (remaining <= 0) {
        clearInterval(lockIntervalRef.current);
        setIsLocked(false);
        localStorage.removeItem("login_lock_until");
        setRemainingAttempts(5);
        localStorage.setItem("login_attempts", "5");
      }
    }, 1000);
  }, []);

  // Update remaining attempts
  const updateAttempts = useCallback((newAttempts) => {
    const attempts = Math.max(0, Math.min(newAttempts, 5));
    setRemainingAttempts(attempts);
    localStorage.setItem("login_attempts", attempts.toString());
  }, []);

  // Validate form
  const isValid = useMemo(() => {
    return email.trim() !== '' && password.trim() !== '' && !loading && !isLocked;
  }, [email, password, loading, isLocked]);

  // Handle field blur for validation
  const handleFieldBlur = useCallback((fieldName) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
  }, []);

  // Get field error
  const getFieldError = useCallback((fieldName) => {
    if (!touchedFields[fieldName]) return null;
    if (fieldName === 'email' && email.trim() === '') return 'Email is required';
    if (fieldName === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address';
    if (fieldName === 'password' && password.trim() === '') return 'Password is required';
    return null;
  }, [touchedFields, email, password]);

  // Handle 2FA submission
  const handle2FASubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!twoFactorToken || twoFactorToken.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }
    
    setLoading(true);
    
    try {
      // Call login with 2FA token
      const loginResult = await login(email, password, twoFactorToken);
      
      if (rememberMe) {
        localStorage.setItem("savedEmail", email);
      } else {
        localStorage.removeItem("savedEmail");
      }

      localStorage.removeItem("login_lock_until");
      localStorage.removeItem("login_attempts");
      if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);

      toast.success(`Welcome back, ${loginResult.name || 'User'}!`, { 
        duration: 2000,
        id: 'login-success'
      });
      
      redirectHandledRef.current = true;
      router.replace(getDefaultRouteForRole(loginResult.role));
      
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Invalid 2FA code';
      setError(message);
      toast.error(message, { id: '2fa-error' });
      
      const newAttempts = Math.max(0, remainingAttempts - 1);
      updateAttempts(newAttempts);
      
      if (newAttempts === 0) {
        setIsLocked(true);
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        localStorage.setItem("login_lock_until", lockUntil.toISOString());
        startLockTimer(lockUntil);
        setShow2FA(false);
        toast.error("Too many failed 2FA attempts. Account locked for 15 minutes.", { id: 'lockout-error' });
      }
    } finally {
      setLoading(false);
    }
  }, [twoFactorToken, email, password, rememberMe, remainingAttempts, updateAttempts, startLockTimer, login, router]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouchedFields({ email: true, password: true });
    
    // Validation
    if (!email.trim()) {
      setError('Email is required');
      toast.error('Please enter your email address');
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (!password.trim()) {
      setError('Password is required');
      toast.error('Please enter your password');
      return;
    }
    
    if (isLocked) {
      toast.error(`Too many failed attempts. Please wait ${Math.ceil(lockTimer / 60)} minutes.`);
      return;
    }
    
    if (loading || submitLockRef.current || redirectHandledRef.current) return;

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    submitLockRef.current = true;
    setError('');
    setLoading(true);

    try {
      const loginResult = await login(email, password);

      if (loginResult && loginResult.requiresTwoFactor) {
        setShow2FA(true);
        setLoading(false);
        submitLockRef.current = false;
        return;
      }

      if (rememberMe) {
        localStorage.setItem("savedEmail", email);
      } else {
        localStorage.removeItem("savedEmail");
      }

      localStorage.removeItem("login_lock_until");
      localStorage.removeItem("login_attempts");
      if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);

      toast.success(`Welcome back, ${loginResult.name || 'User'}!`, { 
        duration: 2000,
        id: 'login-success'
      });
      
      redirectHandledRef.current = true;
      router.replace(getDefaultRouteForRole(loginResult.role));

    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Login failed';
      setError(message);
      toast.error(message, { id: 'login-error' });
      
      // Handle lockout based on response message
      if (message.toLowerCase().includes('locked') || message.toLowerCase().includes('minutes')) {
        setIsLocked(true);
        // Default 15 minute lock
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        localStorage.setItem("login_lock_until", lockUntil.toISOString());
        startLockTimer(lockUntil);
        updateAttempts(0);
      } else {
        const newAttempts = Math.max(0, remainingAttempts - 1);
        updateAttempts(newAttempts);
        
        if (newAttempts === 0 && !isLocked) {
          setIsLocked(true);
          const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
          localStorage.setItem("login_lock_until", lockUntil.toISOString());
          startLockTimer(lockUntil);
          toast.error("Too many failed attempts. Account locked for 15 minutes.", { id: 'lockout-error' });
        }
      }
    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  }, [email, password, rememberMe, loading, isLocked, lockTimer, remainingAttempts, startLockTimer, updateAttempts, login, router]);

  // Format lock time
  const formatLockTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // 2FA View
  if (show2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <button
          onClick={handleGoHome}
          className="fixed top-6 left-6 z-50 flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-md hover:bg-white hover:shadow-lg transition-all duration-300 group"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm text-gray-600 hidden sm:inline">Home</span>
        </button>

        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Fingerprint className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Two-Factor Authentication</h2>
            <p className="text-gray-500 mt-2">Enter the 6-digit code from your authenticator app</p>
          </div>
          
          {remainingAttempts < 5 && remainingAttempts > 0 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex justify-between text-xs text-amber-700 mb-1">
                <span>2FA attempts remaining</span>
                <span>{remainingAttempts}/5</span>
              </div>
              <div className="w-full bg-amber-200 rounded-full h-1.5">
                <div className="bg-amber-600 rounded-full h-1.5" style={{ width: `${(remainingAttempts / 5) * 100}%` }} />
              </div>
            </div>
          )}
          
          <form onSubmit={handle2FASubmit} className="space-y-4">
            <input
              type="text"
              value={twoFactorToken}
              onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full text-center text-2xl tracking-[0.5em] font-mono px-4 py-4 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-gray-50"
              maxLength={6}
              autoFocus
            />
            
            <button
              type="submit"
              disabled={loading || twoFactorToken.length !== 6}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div> : <>Verify & Continue <ChevronRight className="h-4 w-4" /></>}
            </button>
            
            <button
              type="button"
              onClick={() => { setShow2FA(false); setTwoFactorToken(''); setError(''); }}
              className="w-full mt-2 text-gray-500 text-sm hover:text-gray-700 transition py-2"
            >
              ← Back to login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main Login View
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Top-left Back Button */}
      <button
        onClick={handleGoHome}
        className="fixed top-6 left-6 z-50 flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-md hover:bg-white hover:shadow-lg transition-all duration-300 group"
      >
        <ArrowLeft className="h-4 w-4 text-gray-600 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm text-gray-600 hidden sm:inline">Home</span>
        <Home className="h-4 w-4 text-gray-600 sm:hidden" />
      </button>

      {/* Animated Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Login Container */}
      <div className="w-full max-w-md relative">
        {/* Header */}
        <div className="text-center mb-6 animate-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl shadow-lg mb-4 animate-float">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-500">Sign in to your SmartOffice account</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-100 p-8 animate-scale-in">
          
          {/* Locked Account Warning */}
          {isLocked && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3 animate-shake">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Timer className="h-5 w-5 text-red-600" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-800 text-sm">Account Temporarily Locked</p>
                <p className="text-red-700 text-sm">Too many failed attempts.</p>
                <p className="text-red-600 text-sm font-mono mt-1">Try again in {formatLockTime(lockTimer)}</p>
                <div className="w-full bg-red-200 rounded-full h-1.5 mt-2">
                  <div className="bg-red-600 rounded-full h-1.5 transition-all duration-500" style={{ width: `${((lockTimer % 60) / 60) * 100}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && !isLocked && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3 animate-shake">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-800 text-sm">Login Failed</p>
                <p className="text-red-700 text-sm">{error}</p>
                {remainingAttempts < 5 && remainingAttempts > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-red-600 mb-1">
                      <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Attempts remaining</span>
                      <span className="font-mono font-semibold">{remainingAttempts}/5</span>
                    </div>
                    <div className="w-full bg-red-200 rounded-full h-1.5">
                      <div className="bg-red-600 rounded-full h-1.5 transition-all duration-500" style={{ width: `${(remainingAttempts / 5) * 100}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email Address</label>
              <div className="relative group">
                <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                  focusedField === 'email' ? 'text-indigo-600 scale-110' : 'text-gray-400 group-hover:text-indigo-400'
                }`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => {
                    setFocusedField(null);
                    handleFieldBlur('email');
                  }}
                  placeholder="Enter your email"
                  required
                  disabled={loading || isLocked}
                  className={`w-full pl-10 pr-3 py-3 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 bg-gray-50 focus:bg-white ${
                    focusedField === 'email' ? 'border-indigo-300 shadow-md' : 'border-gray-200 hover:border-gray-300'
                  } ${getFieldError('email') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''} ${(loading || isLocked) ? 'opacity-60 bg-gray-100 cursor-not-allowed' : ''}`}
                />
              </div>
              {getFieldError('email') && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1 animate-fade-in">
                  <AlertCircle className="h-3 w-3" /> {getFieldError('email')}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Password</label>
              <div className="relative group">
                <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                  focusedField === 'password' ? 'text-indigo-600 scale-110' : 'text-gray-400 group-hover:text-indigo-400'
                }`} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => {
                    setFocusedField(null);
                    handleFieldBlur('password');
                  }}
                  placeholder="Enter your password"
                  required
                  disabled={loading || isLocked}
                  className={`w-full pl-10 pr-12 py-3 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 bg-gray-50 focus:bg-white ${
                    focusedField === 'password' ? 'border-indigo-300 shadow-md' : 'border-gray-200 hover:border-gray-300'
                  } ${getFieldError('password') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''} ${(loading || isLocked) ? 'opacity-60 bg-gray-100 cursor-not-allowed' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {getFieldError('password') && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1 animate-fade-in">
                  <AlertCircle className="h-3 w-3" /> {getFieldError('password')}
                </p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading || isLocked}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 transition-all duration-200 group-hover:scale-105"
                />
                <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">Remember me</span>
              </label>
              <Link 
                href="/forgot-password" 
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-all duration-200 inline-flex items-center gap-1 group"
              >
                Forgot password? 
                <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isValid || loading || isLocked}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl mt-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Signing in...</span>
                </>
              ) : isLocked ? (
                <>
                  <Clock className="h-5 w-5" />
                  <span>Locked ({formatLockTime(lockTimer)})</span>
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials - Helpful for testing */}
          <div className="mt-4 pt-2">
            <details className="group">
              <summary className="cursor-pointer text-center text-xs text-gray-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 py-2">
                <Key className="h-3 w-3" />
                <span>Demo Accounts</span>
                <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform" />
              </summary>
              <div className="mt-2 space-y-2">
                <button
                  onClick={() => { setEmail('admin@example.com'); setPassword('Admin@2026!'); setTouchedFields({ email: true, password: true }); }}
                  className="w-full p-2 text-left text-xs bg-gray-50 hover:bg-indigo-50 rounded-lg transition flex justify-between items-center group"
                >
                  <span>🛡️ Admin Account</span>
                  <span className="text-indigo-600 opacity-0 group-hover:opacity-100 transition">admin@example.com</span>
                </button>
                <button
                  onClick={() => { setEmail('staff@example.com'); setPassword('Staff@2026!'); setTouchedFields({ email: true, password: true }); }}
                  className="w-full p-2 text-left text-xs bg-gray-50 hover:bg-indigo-50 rounded-lg transition flex justify-between items-center group"
                >
                  <span>👨‍⚕️ Staff Account</span>
                  <span className="text-indigo-600 opacity-0 group-hover:opacity-100 transition">staff@example.com</span>
                </button>
                <button
                  onClick={() => { setEmail('user@example.com'); setPassword('User@2026!'); setTouchedFields({ email: true, password: true }); }}
                  className="w-full p-2 text-left text-xs bg-gray-50 hover:bg-indigo-50 rounded-lg transition flex justify-between items-center group"
                >
                  <span>👤 User Account</span>
                  <span className="text-indigo-600 opacity-0 group-hover:opacity-100 transition">user@example.com</span>
                </button>
              </div>
            </details>
          </div>

          {/* Register Link */}
          <p className="text-center text-sm mt-4 text-gray-600">
            Don't have an account?{" "}
            <Link 
              href="/register" 
              className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors inline-flex items-center gap-1 group"
            >
              Register now
              <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </p>

          {/* Security Badges */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-center gap-6 text-xs text-gray-500">
              <div className="flex items-center gap-1.5 group cursor-default">
                <Shield className="h-3.5 w-3.5 text-green-500 group-hover:scale-110 transition-transform" />
                <span>256-bit SSL</span>
              </div>
              <div className="flex items-center gap-1.5 group cursor-default">
                <Smartphone className="h-3.5 w-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
                <span>2FA Ready</span>
              </div>
              <div className="flex items-center gap-1.5 group cursor-default">
                <Zap className="h-3.5 w-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                <span>Rate Limited</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animate-slide-up { animation: slideUp 0.5s ease-out; }
        .animate-scale-in { animation: scaleIn 0.3s ease-out; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
}