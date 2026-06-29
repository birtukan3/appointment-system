// frontend/app/login/page.js
// ============================================
// COMPLETE FIXED LOGIN PAGE - NO DUPLICATE TOASTS
// ============================================

"use client";

import { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppContext } from '../providers';
import { 
  Mail, Lock, Eye, EyeOff, AlertCircle, Shield, Smartphone, 
  Key, ChevronRight, Timer, Clock, ArrowLeft, LogIn, 
  Sparkles, Home, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

// ============================================
// TOAST MANAGER - PREVENTS DUPLICATES
// ============================================
const ToastManager = {
  lastMessage: '',
  lastTime: 0,
  showing: false,
  timer: null,

  show(message, type = 'success', duration = 3000) {
    const now = Date.now();
    
    // ✅ Block duplicate messages
    if (this.lastMessage === message && (now - this.lastTime) < 3000) {
      console.log('[TOAST BLOCKED] Duplicate:', message);
      return;
    }
    
    if (this.showing) return;
    
    this.lastMessage = message;
    this.lastTime = now;
    this.showing = true;
    
    if (type === 'success') {
      toast.success(message, { duration, id: message });
    } else if (type === 'error') {
      toast.error(message, { duration, id: message });
    } else {
      toast(message, { icon: 'ℹ️', duration, id: message });
    }
    
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.showing = false;
    }, duration + 500);
  },

  clear() {
    if (this.timer) clearTimeout(this.timer);
    this.showing = false;
  }
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, login, loading: authLoading } = useContext(AppContext);
  
  // ============ FORM STATE ============
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [touchedFields, setTouchedFields] = useState({ email: false, password: false });
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [toastShown, setToastShown] = useState(false); // ✅ Track if toast shown
  
  // ============ REFS ============
  const submitLockRef = useRef(false);
  const lockIntervalRef = useRef(null);
  const redirectHandledRef = useRef(false);

  // ============ REDIRECT HANDLING ============
  useEffect(() => {
    if (!isAuthenticated || !user || redirectHandledRef.current || authLoading) return;
    
    redirectHandledRef.current = true;
    const role = user.role || 'user';
    const redirectMap = {
      admin: '/admin',
      staff: '/staff',
      user: '/dashboard'
    };
    router.replace(redirectMap[role] || '/dashboard');
  }, [isAuthenticated, user, router, authLoading]);

  // ============ REGISTRATION SUCCESS TOAST ============
  useEffect(() => {
    const registered = searchParams?.get('registered');
    if (registered === 'true') {
      ToastManager.show('🎉 Registration Successful! Please login with your credentials', 'success', 5000);
    }
  }, [searchParams]);

  // ============ LOAD SAVED CREDENTIALS ============
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
    };
  }, []);

  // ============ LOCK TIMER ============
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

  // ============ HELPER FUNCTIONS ============
  const updateAttempts = useCallback((newAttempts) => {
    const attempts = Math.max(0, Math.min(newAttempts, 5));
    setRemainingAttempts(attempts);
    localStorage.setItem("login_attempts", attempts.toString());
  }, []);

  const formatLockTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isValid = email.trim() !== '' && password.trim() !== '' && !loading && !isLocked;

  const handleFieldBlur = (fieldName) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
  };

  const getFieldError = (fieldName) => {
    if (!touchedFields[fieldName]) return null;
    if (fieldName === 'email' && email.trim() === '') return 'Email is required';
    if (fieldName === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address';
    if (fieldName === 'password' && password.trim() === '') return 'Password is required';
    return null;
  };

  // ============ FILL DEMO CREDENTIALS ============
  const fillDemoCredentials = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setTouchedFields({ email: true, password: true });
    setError('');
    ToastManager.show(`✓ ${demoEmail.split('@')[0]} credentials loaded`, 'success', 2000);
  };

  // ============ HANDLE LOGIN - FIXED ============
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setTouchedFields({ email: true, password: true });
    setToastShown(false); // ✅ Reset toast flag
    
    // ✅ Validation
    if (!email.trim()) {
      setError('Email is required');
      ToastManager.show('Please enter your email address', 'error');
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      ToastManager.show('Please enter a valid email address', 'error');
      return;
    }
    
    if (!password.trim()) {
      setError('Password is required');
      ToastManager.show('Please enter your password', 'error');
      return;
    }
    
    if (isLocked) {
      ToastManager.show(`Too many failed attempts. Please wait ${Math.ceil(lockTimer / 60)} minutes.`, 'warning');
      return;
    }
    
    if (loading || submitLockRef.current) return;

    // ✅ Clear previous errors
    submitLockRef.current = true;
    setError('');
    setLoading(true);

    try {
      // ✅ Clear any previous toast
      ToastManager.clear();
      
      // ✅ Attempt login
      const loginResult = await login(email.trim(), password);

      // ✅ Save credentials if remember me
      if (rememberMe) {
        localStorage.setItem("savedEmail", email);
      } else {
        localStorage.removeItem("savedEmail");
      }

      // ✅ Reset lock state
      localStorage.removeItem("login_lock_until");
      localStorage.removeItem("login_attempts");
      if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);
      
      // ✅ SHOW ONLY ONE WELCOME TOAST
      const userName = loginResult?.name || loginResult?.firstName || email.split('@')[0];
      
      // ✅ Prevent duplicate by checking if already shown
      if (!toastShown) {
        setToastShown(true);
        ToastManager.show(`👋 Welcome back, ${userName}!`, 'success', 3000);
      }
      
      // ✅ Redirect based on role
      const role = loginResult?.role || 'user';
      const redirectMap = {
        admin: '/admin',
        staff: '/staff',
        user: '/dashboard'
      };
      setTimeout(() => {
        router.push(redirectMap[role] || '/dashboard');
      }, 500);

    } catch (err) {
      // ✅ Enhanced error parsing
      let message = err.message || 'Login failed';
      
      if (err.response?.data?.message) {
        message = err.response.data.message;
      }
      
      // ✅ Handle specific error cases
      if (message.toLowerCase().includes('invalid password')) {
        const match = message.match(/(\d+)\s*attempts?/i);
        if (match) {
          const attemptsLeft = parseInt(match[1]);
          if (attemptsLeft > 0) {
            message = `Invalid password. ${attemptsLeft} attempt${attemptsLeft > 1 ? 's' : ''} remaining.`;
          } else {
            message = 'Too many failed attempts. Account is locked.';
          }
        }
      } else if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('no user')) {
        message = 'No account found with this email address.';
      } else if (message.toLowerCase().includes('deactivated')) {
        message = 'This account has been deactivated. Please contact support.';
      } else if (message.toLowerCase().includes('inactive')) {
        message = 'This account is inactive. Please contact support.';
      } else if (message.toLowerCase().includes('blocked')) {
        message = 'This account has been blocked. Please contact support.';
      }
      
      setError(message);
      ToastManager.show(message, 'error');
      
      // ✅ Update attempts
      const newAttempts = Math.max(0, remainingAttempts - 1);
      updateAttempts(newAttempts);
      
      // ✅ Lock account if too many attempts
      if (newAttempts === 0 && !isLocked) {
        setIsLocked(true);
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        localStorage.setItem("login_lock_until", lockUntil.toISOString());
        startLockTimer(lockUntil);
        ToastManager.show("Too many failed attempts. Account locked for 15 minutes.", 'warning');
      }
    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  };

  // ============ RENDER ============
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      
      {/* ===== HOME BUTTON ===== */}
      <button
        onClick={() => router.push('/')}
        className="fixed top-6 left-6 z-50 flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-md hover:bg-white hover:shadow-lg transition-all duration-300 group"
      >
        <ArrowLeft className="h-4 w-4 text-gray-600 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm text-gray-600 hidden sm:inline">Home</span>
        <Home className="h-4 w-4 text-gray-600 sm:hidden" />
      </button>

      {/* ===== ANIMATED BACKGROUND ===== */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* ===== LOGIN CONTAINER ===== */}
      <div className="w-full max-w-md relative">
        
        {/* ===== HEADER ===== */}
        <div className="text-center mb-6 animate-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl shadow-lg mb-4 animate-float">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-500">Sign in to your SmartOffice account</p>
        </div>

        {/* ===== LOGIN CARD ===== */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-100 p-8 animate-scale-in">
          
          {/* ===== LOCKED ACCOUNT WARNING ===== */}
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

          {/* ===== ERROR MESSAGE ===== */}
          {error && !isLocked && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3 animate-fade-in">
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
                      <div className="bg-red-600 rounded-full h-1.5" style={{ width: `${(remainingAttempts / 5) * 100}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== LOGIN FORM ===== */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* ===== EMAIL FIELD ===== */}
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
                  disabled={loading || isLocked}
                  className={`w-full pl-10 pr-3 py-3 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 bg-gray-50 focus:bg-white ${
                    focusedField === 'email' ? 'border-indigo-300 shadow-md' : 'border-gray-200 hover:border-gray-300'
                  } ${getFieldError('email') ? 'border-red-500' : ''} ${(loading || isLocked) ? 'opacity-60 bg-gray-100 cursor-not-allowed' : ''}`}
                />
              </div>
              {getFieldError('email') && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1 animate-fade-in">
                  <AlertCircle className="h-3 w-3" /> {getFieldError('email')}
                </p>
              )}
            </div>

            {/* ===== PASSWORD FIELD ===== */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <Link 
                  href="/forgot-password" 
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-all duration-200 inline-flex items-center gap-1 group"
                >
                  Forgot password?
                  <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
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
                  disabled={loading || isLocked}
                  className={`w-full pl-10 pr-12 py-3 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 bg-gray-50 focus:bg-white ${
                    focusedField === 'password' ? 'border-indigo-300 shadow-md' : 'border-gray-200 hover:border-gray-300'
                  } ${getFieldError('password') ? 'border-red-500' : ''} ${(loading || isLocked) ? 'opacity-60 bg-gray-100 cursor-not-allowed' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110"
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

            {/* ===== REMEMBER ME ===== */}
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
            </div>

            {/* ===== SUBMIT BUTTON ===== */}
            <button
              type="submit"
              disabled={!isValid}
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

          {/* ===== DEMO CREDENTIALS ===== */}
          <div className="mt-6 pt-2">
            <details className="group">
              <summary className="cursor-pointer text-center text-xs text-gray-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 py-2">
                <Key className="h-3 w-3" />
                <span>Demo Accounts</span>
                <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform" />
              </summary>
              <div className="mt-2 space-y-2">
                <button
                  onClick={() => fillDemoCredentials('admin@example.com', 'Admin123')}
                  className="w-full p-2 text-left text-xs bg-gray-50 hover:bg-indigo-50 rounded-lg transition flex justify-between items-center group"
                >
                  <span>🛡️ Admin Account</span>
                  <span className="text-indigo-600 opacity-0 group-hover:opacity-100 transition">Click to fill</span>
                </button>
                <button
                  onClick={() => fillDemoCredentials('staff@example.com', 'Staff123')}
                  className="w-full p-2 text-left text-xs bg-gray-50 hover:bg-indigo-50 rounded-lg transition flex justify-between items-center group"
                >
                  <span>👨‍⚕️ Staff Account</span>
                  <span className="text-indigo-600 opacity-0 group-hover:opacity-100 transition">Click to fill</span>
                </button>
                <button
                  onClick={() => fillDemoCredentials('user@example.com', 'User123')}
                  className="w-full p-2 text-left text-xs bg-gray-50 hover:bg-indigo-50 rounded-lg transition flex justify-between items-center group"
                >
                  <span>👤 User Account</span>
                  <span className="text-indigo-600 opacity-0 group-hover:opacity-100 transition">Click to fill</span>
                </button>
              </div>
            </details>
          </div>

          {/* ===== REGISTER LINK ===== */}
          <p className="text-center text-sm mt-4 text-gray-600">
            Don't have an account?{' '}
            <Link 
              href="/register" 
              className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors inline-flex items-center gap-1 group"
            >
              Register now
              <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </p>

          {/* ===== SECURITY BADGES ===== */}
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

      {/* ===== STYLES ===== */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
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
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animate-scale-in { animation: scale-in 0.3s ease-out; }
        .animate-slide-up { animation: slide-up 0.5s ease-out; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
}