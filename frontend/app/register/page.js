"use client";

import { useState, useContext, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '../providers';
import {
  Mail, Lock, User, Eye, EyeOff, AlertCircle, Phone, Building2,
  ArrowRight, CheckCircle, Sparkles, Shield, Zap,
  Rocket, Timer, X, Star, Key, Home, Users
} from 'lucide-react';
import Link from 'next/link';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useContext(AppContext);
  const redirectHandledRef = useRef(false);
  const submitLockRef = useRef(false);

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', company: '', phone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({
    name: false, email: false, password: false, confirmPassword: false, phone: false
  });
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [phoneValid, setPhoneValid] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const emailTimeoutRef = useRef(null);

  // ✅ Toast Manager - Prevents duplicates
  const ToastManager = {
    lastMessage: '',
    lastTime: 0,
    showing: false,
    timer: null,

    show(message, type = 'success', duration = 3000) {
      const now = Date.now();
      if (this.lastMessage === message && (now - this.lastTime) < 3000) return;
      if (this.showing) return;
      
      this.lastMessage = message;
      this.lastTime = now;
      this.showing = true;
      
      if (type === 'success') {
        toast.success(message, { duration });
      } else if (type === 'error') {
        toast.error(message, { duration });
      } else {
        toast(message, { icon: 'ℹ️', duration });
      }
      
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.showing = false;
      }, duration + 500);
    }
  };

  // ✅ Redirect if already authenticated
  useEffect(() => {
    if (!isAuthenticated || !user || redirectHandledRef.current) return;
    redirectHandledRef.current = true;
    const role = user.role || 'user';
    const redirectMap = { admin: '/admin', staff: '/staff', user: '/dashboard' };
    router.replace(redirectMap[role] || '/dashboard');
  }, [isAuthenticated, router, user]);

  // ✅ Lock timer cleanup
  useEffect(() => {
    const lockUntil = localStorage.getItem("register_lock_until");
    if (lockUntil && new Date(lockUntil) > new Date()) {
      setIsLocked(true);
      startLockTimer(new Date(lockUntil));
    }
    return () => {
      if (emailTimeoutRef.current) clearTimeout(emailTimeoutRef.current);
    };
  }, []);

  const startLockTimer = useCallback((lockUntil) => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockUntil.getTime() - Date.now()) / 1000));
      setLockTimer(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setIsLocked(false);
        localStorage.removeItem("register_lock_until");
        setAttempts(0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Email availability check
  useEffect(() => {
    if (emailTimeoutRef.current) clearTimeout(emailTimeoutRef.current);

    if (!formData.email || !formData.email.includes('@') || errors.email) {
      setEmailAvailable(null);
      return;
    }

    emailTimeoutRef.current = setTimeout(async () => {
      try {
        setCheckingEmail(true);
        const response = await api.checkEmail(formData.email);
        setEmailAvailable(response.available);
        if (!response.available) {
          setErrors(prev => ({ ...prev, email: "This email is already registered" }));
        } else if (touchedFields.email) {
          setErrors(prev => ({ ...prev, email: null }));
        }
      } catch (error) {
        setEmailAvailable(null);
      } finally {
        setCheckingEmail(false);
      }
    }, 500);

    return () => clearTimeout(emailTimeoutRef.current);
  }, [formData.email, touchedFields.email, errors.email]);

  const passwordRequirements = useMemo(() => [
    { label: '8+ characters', check: (pwd) => pwd.length >= 8 },
    { label: 'Uppercase letter', check: (pwd) => /[A-Z]/.test(pwd) },
    { label: 'Lowercase letter', check: (pwd) => /[a-z]/.test(pwd) },
    { label: 'Number', check: (pwd) => /[0-9]/.test(pwd) },
  ], []);

  const checkPasswordStrength = useCallback((password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
    return strength;
  }, []);

  const validateEthiopianPhone = useCallback((phone) => {
    if (!phone) return true;
    const clean = phone.replace(/[\s\-\(\)]/g, '');
    const ethiopianPhoneRegex = /^(?:\+251|0|251)[1-9]\d{8}$/;
    const isValid = ethiopianPhoneRegex.test(clean);
    setPhoneValid(isValid);
    return isValid;
  }, []);

  const handleFieldBlur = useCallback((fieldName) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
  }, []);

  const getFieldError = useCallback((fieldName) => {
    if (!touchedFields[fieldName]) return null;
    return errors[fieldName];
  }, [touchedFields, errors]);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    else if (formData.name.trim().length < 2) newErrors.name = "Name must be at least 2 characters";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) newErrors.email = "Email is required";
    else if (!emailRegex.test(formData.email)) newErrors.email = "Please enter a valid email address";
    else if (emailAvailable === false) newErrors.email = "This email is already registered";

    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 8) newErrors.password = "Password must be at least 8 characters";
    else if (!/[A-Z]/.test(formData.password)) newErrors.password = "Must contain uppercase letter";
    else if (!/[a-z]/.test(formData.password)) newErrors.password = "Must contain lowercase letter";
    else if (!/[0-9]/.test(formData.password)) newErrors.password = "Must contain a number";

    if (!formData.confirmPassword) newErrors.confirmPassword = "Please confirm your password";
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";

    if (formData.phone && !validateEthiopianPhone(formData.phone)) {
      newErrors.phone = "Please enter a valid Ethiopian phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, emailAvailable, validateEthiopianPhone]);

  const strengthInfo = useCallback(() => {
    if (passwordStrength === 0) return { color: "bg-gray-200", text: "No password", width: "0%" };
    if (passwordStrength === 1) return { color: "bg-red-500", text: "Very Weak", width: "20%" };
    if (passwordStrength === 2) return { color: "bg-orange-500", text: "Weak", width: "40%" };
    if (passwordStrength === 3) return { color: "bg-yellow-500", text: "Medium", width: "60%" };
    if (passwordStrength === 4) return { color: "bg-blue-500", text: "Strong", width: "80%" };
    return { color: "bg-green-500", text: "Very Strong", width: "100%" };
  }, [passwordStrength]);

  // ✅ FIXED: Simplified registration - NO AUTO-LOGIN
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    setTouchedFields({
      name: true, email: true, password: true, confirmPassword: true, phone: true
    });

    if (isLocked) {
      ToastManager.show(`Too many attempts. Please wait ${Math.ceil(lockTimer / 60)} minutes.`, 'error');
      return;
    }

    if (loading || submitLockRef.current) return;

    if (!validateForm()) {
      ToastManager.show("Please fix the errors in the form", 'error');
      return;
    }

    submitLockRef.current = true;
    setLoading(true);

    try {
      // ✅ Normalize phone number
      let normalizedPhone = formData.phone?.trim() || '';
      if (normalizedPhone) {
        const cleanPhone = normalizedPhone.replace(/[\s\-\(\)]/g, '');
        if (cleanPhone.startsWith('0')) {
          normalizedPhone = '+251' + cleanPhone.substring(1);
        } else if (cleanPhone.startsWith('251')) {
          normalizedPhone = '+' + cleanPhone;
        } else if (!cleanPhone.startsWith('+')) {
          normalizedPhone = '+' + cleanPhone;
        }
      }

      // ✅ Register API call
      const response = await api.register({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        company: formData.company?.trim() || '',
        phone: normalizedPhone,
      });

      if (response && response.success !== false) {
        // ✅ Show ONLY ONE success toast
        ToastManager.show('🎉 Registration Successful! Please login with your credentials', 'success', 5000);
        
        setSuccess(true);
        setAttempts(0);
        localStorage.removeItem("register_lock_until");
        
        // ✅ Redirect to login after delay (NO AUTO-LOGIN)
        setTimeout(() => {
          router.replace('/login?registered=true');
        }, 2500);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Registration failed";
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 5) {
        setIsLocked(true);
        const lockDuration = 15;
        const lockUntil = new Date(Date.now() + lockDuration * 60 * 1000);
        localStorage.setItem("register_lock_until", lockUntil.toISOString());
        startLockTimer(lockUntil);
        ToastManager.show(`Too many failed attempts. Account locked for ${lockDuration} minutes.`, 'error');
        submitLockRef.current = false;
        setLoading(false);
        return;
      }

      if (errorMessage.toLowerCase().includes("email already exists") ||
          errorMessage.toLowerCase().includes("already registered")) {
        setErrors(prev => ({ ...prev, email: "This email is already registered" }));
        setEmailAvailable(false);
        ToastManager.show("Email already exists. Please use a different email.", 'error');
      } else {
        ToastManager.show(errorMessage, 'error');
      }
    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  }, [formData, validateForm, router, loading, attempts, isLocked, lockTimer, startLockTimer]);

  const isValid = useMemo(() => {
    return formData.name.trim() !== '' &&
           formData.email.trim() !== '' &&
           emailAvailable === true &&
           formData.password.length >= 8 &&
           /[A-Z]/.test(formData.password) &&
           /[a-z]/.test(formData.password) &&
           /[0-9]/.test(formData.password) &&
           formData.password === formData.confirmPassword &&
           !loading &&
           !isLocked;
  }, [formData, emailAvailable, loading, isLocked]);

  // ✅ If already authenticated, return null
  if (isAuthenticated) return null;

  // ✅ Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center animate-scale-in">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2">
              <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">🎉 Registration Successful!</h2>
          <p className="text-gray-500 mb-5">Your account has been created successfully. Redirecting to login...</p>
          <div className="flex justify-center gap-1 mb-5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>
            <span>Redirecting to login...</span>
          </div>
          <div className="mt-4 w-full bg-gray-100 rounded-full h-1 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-1 animate-progress"></div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Main registration form
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4 py-12">
      {/* Home Button */}
      <button
        onClick={() => router.push('/')}
        className="fixed top-6 left-6 z-50 flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-md hover:bg-white hover:shadow-lg transition-all duration-300 group"
      >
        <ArrowLeft className="h-4 w-4 text-gray-600 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm text-gray-600 hidden sm:inline">Home</span>
        <Home className="h-4 w-4 text-gray-600 sm:hidden" />
      </button>

      {/* Background Decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Registration Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-8 transform transition-all duration-500 animate-scale-in">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-md mb-4 animate-float">
            <Users className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Create Account
          </h1>
          <p className="text-gray-500 text-sm">Join SmartOffice and start managing appointments</p>
        </div>

        {/* Locked Warning */}
        {isLocked && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3 animate-shake">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Timer className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-red-800 text-sm">Account Temporarily Locked</p>
              <p className="text-red-700 text-sm">Too many failed registration attempts.</p>
              <p className="text-red-600 text-sm font-mono mt-1">Try again in {Math.ceil(lockTimer / 60)}:{String(lockTimer % 60).padStart(2, '0')}</p>
              <div className="w-full bg-red-200 rounded-full h-1.5 mt-2">
                <div className="bg-red-600 rounded-full h-1.5 transition-all duration-500" style={{ width: `${((lockTimer % 60) / 60) * 100}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Attempts Warning */}
        {attempts > 0 && attempts < 5 && !isLocked && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex justify-between text-xs text-amber-700 mb-1">
              <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Failed attempts</span>
              <span className="font-mono font-semibold">{attempts}/5</span>
            </div>
            <div className="w-full bg-amber-200 rounded-full h-1.5">
              <div className="bg-amber-600 rounded-full h-1.5 transition-all duration-500" style={{ width: `${(attempts / 5) * 100}%` }} />
            </div>
            <p className="text-xs text-amber-600 mt-1">{5 - attempts} attempts remaining before 15 min lockout</p>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
            <div className="relative group">
              <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${focusedField === 'name' ? 'text-indigo-600 scale-110' : 'text-gray-400 group-hover:text-indigo-400'}`} />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                onFocus={() => setFocusedField('name')}
                onBlur={() => {
                  setFocusedField(null);
                  handleFieldBlur('name');
                }}
                disabled={isLocked}
                className={`w-full pl-10 pr-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 bg-gray-50 focus:bg-white ${getFieldError('name') ? 'border-red-500' : 'border-gray-200 hover:border-gray-300'} ${focusedField === 'name' ? 'border-indigo-300 shadow-md' : ''} ${isLocked ? 'opacity-60 bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="John Doe"
                autoFocus
              />
            </div>
            {getFieldError('name') && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1 animate-fade-in">
                <AlertCircle className="h-3 w-3" /> {getFieldError('name')}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address <span className="text-red-500">*</span></label>
            <div className="relative group">
              <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${focusedField === 'email' ? 'text-indigo-600 scale-110' : 'text-gray-400 group-hover:text-indigo-400'}`} />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value.toLowerCase() }))}
                onFocus={() => setFocusedField('email')}
                onBlur={() => {
                  setFocusedField(null);
                  handleFieldBlur('email');
                }}
                disabled={isLocked}
                className={`w-full pl-10 pr-10 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 bg-gray-50 focus:bg-white ${getFieldError('email') ? 'border-red-500' : 'border-gray-200 hover:border-gray-300'} ${focusedField === 'email' ? 'border-indigo-300 shadow-md' : ''} ${isLocked ? 'opacity-60 bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="you@example.com"
              />
              {checkingEmail && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent"></div>
                </div>
              )}
              {emailAvailable === true && !checkingEmail && formData.email && !getFieldError('email') && (
                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500 animate-scale-in" />
              )}
              {emailAvailable === false && !checkingEmail && formData.email && (
                <X className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-500" />
              )}
            </div>
            {getFieldError('email') && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1 animate-fade-in">
                <AlertCircle className="h-3 w-3" /> {getFieldError('email')}
              </p>
            )}
            {emailAvailable === true && !getFieldError('email') && formData.email && touchedFields.email && (
              <p className="text-green-500 text-xs mt-1 flex items-center gap-1 animate-fade-in">
                <CheckCircle className="h-3 w-3" /> Email is available
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password <span className="text-red-500">*</span></label>
            <div className="relative group">
              <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${focusedField === 'password' ? 'text-indigo-600 scale-110' : 'text-gray-400 group-hover:text-indigo-400'}`} />
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, password: e.target.value }));
                  checkPasswordStrength(e.target.value);
                }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => {
                  setFocusedField(null);
                  handleFieldBlur('password');
                }}
                disabled={isLocked}
                className={`w-full pl-10 pr-10 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 bg-gray-50 focus:bg-white ${getFieldError('password') ? 'border-red-500' : 'border-gray-200 hover:border-gray-300'} ${focusedField === 'password' ? 'border-indigo-300 shadow-md' : ''} ${isLocked ? 'opacity-60 bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="Create a strong password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {formData.password && (
              <div className="mt-2">
                <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${strengthInfo().color} transition-all duration-500 rounded-full`} style={{ width: strengthInfo().width }}></div>
                </div>
                <p className="text-xs mt-1 text-gray-500 flex items-center justify-between">
                  <span>Password strength: <span className="font-semibold">{strengthInfo().text}</span></span>
                </p>
              </div>
            )}

            {touchedFields.password && formData.password && (
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {passwordRequirements.map((req, idx) => (
                  <div key={idx} className={`flex items-center gap-1 transition-all duration-200 ${req.check(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
                    <CheckCircle className={`h-3 w-3 ${req.check(formData.password) ? 'opacity-100' : 'opacity-0'}`} />
                    <span className={req.check(formData.password) ? '' : 'line-through decoration-gray-300'}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {getFieldError('password') && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1 animate-fade-in">
                <AlertCircle className="h-3 w-3" /> {getFieldError('password')}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password <span className="text-red-500">*</span></label>
            <div className="relative group">
              <Shield className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${focusedField === 'confirmPassword' ? 'text-indigo-600 scale-110' : 'text-gray-400 group-hover:text-indigo-400'}`} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => {
                  setFocusedField(null);
                  handleFieldBlur('confirmPassword');
                }}
                disabled={isLocked}
                className={`w-full pl-10 pr-10 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 bg-gray-50 focus:bg-white ${getFieldError('confirmPassword') ? 'border-red-500' : 'border-gray-200 hover:border-gray-300'} ${focusedField === 'confirmPassword' ? 'border-indigo-300 shadow-md' : ''} ${isLocked ? 'opacity-60 bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="Confirm your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {getFieldError('confirmPassword') && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1 animate-fade-in">
                <AlertCircle className="h-3 w-3" /> {getFieldError('confirmPassword')}
              </p>
            )}
            {touchedFields.confirmPassword && formData.confirmPassword && !getFieldError('confirmPassword') && formData.password === formData.confirmPassword && formData.password && (
              <p className="text-green-500 text-xs mt-1 flex items-center gap-1 animate-fade-in">
                <CheckCircle className="h-3 w-3" /> Passwords match
              </p>
            )}
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Company (Optional)</label>
            <div className="relative group">
              <Building2 className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${focusedField === 'company' ? 'text-indigo-600 scale-110' : 'text-gray-400 group-hover:text-indigo-400'}`} />
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                disabled={isLocked}
                className={`w-full pl-10 pr-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 bg-gray-50 focus:bg-white ${focusedField === 'company' ? 'border-indigo-300 shadow-md' : 'border-gray-200 hover:border-gray-300'} ${isLocked ? 'opacity-60 bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="Your Company (optional)"
                onFocus={() => setFocusedField('company')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number (Optional)</label>
            <div className="relative group">
              <Phone className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${focusedField === 'phone' ? 'text-indigo-600 scale-110' : 'text-gray-400 group-hover:text-indigo-400'}`} />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData(prev => ({ ...prev, phone: value }));
                  if (value) validateEthiopianPhone(value);
                }}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => {
                  setFocusedField(null);
                  handleFieldBlur('phone');
                }}
                disabled={isLocked}
                className={`w-full pl-10 pr-10 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 bg-gray-50 focus:bg-white ${getFieldError('phone') ? 'border-red-500' : 'border-gray-200 hover:border-gray-300'} ${focusedField === 'phone' ? 'border-indigo-300 shadow-md' : ''} ${isLocked ? 'opacity-60 bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="0912345678 or +251912345678"
              />
              {phoneValid === true && formData.phone && !getFieldError('phone') && (
                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500 animate-scale-in" />
              )}
              {phoneValid === false && formData.phone && (
                <X className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-500" />
              )}
            </div>
            {getFieldError('phone') && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1 animate-fade-in">
                <AlertCircle className="h-3 w-3" /> {getFieldError('phone')}
              </p>
            )}
            {phoneValid === true && !getFieldError('phone') && formData.phone && touchedFields.phone && (
              <p className="text-green-500 text-xs mt-1 flex items-center gap-1 animate-fade-in">
                <CheckCircle className="h-3 w-3" /> Valid Ethiopian number
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">Ethiopian format: 0912345678 or +251912345678</p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isValid || loading || isLocked}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-xl font-semibold mt-4 hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Creating Account...</span>
              </>
            ) : isLocked ? (
              <>
                <Timer className="h-5 w-5" />
                <span>Locked ({Math.ceil(lockTimer / 60)}:{String(lockTimer % 60).padStart(2, '0')})</span>
              </>
            ) : (
              <>
                <Rocket className="h-5 w-5" />
                <span>Create Account</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Login Link */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors inline-flex items-center gap-1 group">
            Sign in
            <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
          </Link>
        </p>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-center gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-1.5 group cursor-default">
              <Zap className="h-3.5 w-3.5 text-yellow-500 group-hover:scale-110 transition-transform" />
              <span>Fast Booking</span>
            </div>
            <div className="flex items-center gap-1.5 group cursor-default">
              <Shield className="h-3.5 w-3.5 text-green-500 group-hover:scale-110 transition-transform" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1.5 group cursor-default">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
              <span>24/7 Support</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob { 0%, 100% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes progress { from { width: 0%; } to { width: 100%; } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-5px); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-blob { animation: blob 7s infinite; }
        .animate-scale-in { animation: scaleIn 0.3s ease-out; }
        .animate-progress { animation: progress 2s ease-out forwards; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
}