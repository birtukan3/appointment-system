"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mail, ArrowLeft, AlertCircle, CheckCircle, Shield, 
  Sparkles, Key, Send, Lock, UserCheck, Clock, 
  Heart, HelpCircle, MessageCircle, ShieldCheck,
  MailCheck, Fingerprint, Smartphone, BellRing,
  Coffee, BookOpen, Star, Award, Globe, Zap
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [tips, setTips] = useState([]);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [animated, setAnimated] = useState(false);

  // Security tips array
  const securityTips = [
    { icon: Shield, text: "Never share your recovery link with anyone", color: "text-indigo-500" },
    { icon: Key, text: "Create a strong password with 8+ characters", color: "text-emerald-500" },
    { icon: Smartphone, text: "Enable 2FA for extra security", color: "text-purple-500" },
    { icon: Clock, text: "Recovery links expire in 1 hour", color: "text-amber-500" },
    { icon: ShieldCheck, text: "We'll never ask for your password via email", color: "text-rose-500" },
    { icon: MailCheck, text: "Check your spam folder if you don't see the email", color: "text-blue-500" },
  ];

  // Animate tips
  useEffect(() => {
    setTips(securityTips);
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % securityTips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Animate on load
  useEffect(() => {
    setAnimated(true);
  }, []);

  // Countdown effect for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setResendDisabled(false);
    }
  }, [countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email) {
      setError('Please enter your email address');
      toast.error('Please enter your email address');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      toast.error('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await api.post('/auth/forgot-password', { email });
      setMessage(response.data?.message || 'We\'ve sent a password reset link to your email.');
      setSubmitted(true);
      setCountdown(60);
      setResendDisabled(true);
      toast.success('Recovery email sent! Check your inbox 📧');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to submit recovery request';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendDisabled) return;
    
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('Recovery email resent!');
      setCountdown(60);
      setResendDisabled(true);
    } catch (err) {
      toast.error('Failed to resend. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const CurrentTip = tips[currentTipIndex];

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center transform transition-all duration-500 animate-fadeInUp">
          {/* Success Animation */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-green-100 rounded-full animate-ping opacity-30"></div>
            </div>
            <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <MailCheck className="h-12 w-12 text-white" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Check Your Email! 📧</h1>
          <p className="text-gray-600 mb-2">
            We've sent a password reset link to
          </p>
          <p className="font-semibold text-indigo-600 bg-indigo-50 inline-block px-4 py-1 rounded-full text-sm mb-4">
            {email}
          </p>
          <div className="bg-amber-50 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-amber-100 rounded-lg">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800">Important Note</p>
                <p className="text-xs text-amber-700 mt-1">The reset link will expire in 1 hour. If you don't see the email, check your spam folder.</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <button 
              onClick={handleResend}
              disabled={resendDisabled || loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
              {resendDisabled ? `Resend available in ${countdown}s` : 'Resend Email'}
            </button>
            
            <button 
              onClick={() => router.push('/login')} 
              className="w-full text-gray-600 hover:text-gray-800 font-medium py-2 flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Login
            </button>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Didn't receive the email? Check your spam folder or
              <button onClick={() => setSubmitted(false)} className="text-indigo-600 hover:text-indigo-700 ml-1">try a different email</button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className={`max-w-6xl w-full mx-auto transition-all duration-700 ${animated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        
        {/* Main Card */}
        <div className="grid md:grid-cols-2 gap-0 bg-white rounded-3xl shadow-2xl overflow-hidden">
          
          {/* Left Side - Form Section */}
          <div className="p-8 md:p-10">
            {/* Back Button */}
            <button 
              onClick={() => router.push('/login')} 
              className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-all duration-300 mb-6 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
              <span className="text-sm font-medium">Back to Login</span>
            </button>

            {/* Header */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full px-4 py-1.5 mb-4">
                <Shield className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-semibold text-indigo-700">ACCOUNT RECOVERY</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password?</h1>
              <p className="text-gray-500">No worries! Enter your email and we'll send you a reset link.</p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl animate-slideDown">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">Recovery Error</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className={`relative transition-all duration-300 ${emailFocused ? 'transform scale-[1.01]' : ''}`}>
                  <Mail className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors duration-300 ${emailFocused ? 'text-indigo-500' : 'text-gray-400'}`} />
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    className={`w-full px-4 py-3.5 pl-12 border rounded-xl focus:ring-2 transition-all duration-300 ${
                      emailFocused 
                        ? 'border-indigo-400 ring-2 ring-indigo-200' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    placeholder="you@example.com" 
                    required 
                    disabled={loading} 
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  We'll send a password reset link to this email
                </p>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3.5 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Sending...</span>
                  </div>
                ) : (
                  <>
                    <Send className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    <span>Send Reset Link</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer Links */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Remember your password?{' '}
                <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">
                  Sign In
                </Link>
              </p>
              <p className="text-xs text-gray-400 mt-4">
                Don't have an account?{' '}
                <Link href="/register" className="text-indigo-500 hover:text-indigo-600">
                  Create Account
                </Link>
              </p>
            </div>
          </div>

          {/* Right Side - Info & Tips Section */}
          <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 md:p-10 text-white hidden md:flex flex-col justify-between">
            {/* Brand Header */}
            <div>
              <div className="flex items-center gap-2 mb-8">
                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl">
                  <Lock className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold">SmartOffice</span>
              </div>
              
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 mb-4">
                  <Key className="h-3 w-3" />
                  <span className="text-xs font-medium">SECURE RECOVERY</span>
                </div>
                <h2 className="text-2xl font-bold mb-3">Account Recovery Made Simple</h2>
                <p className="text-indigo-100 text-sm leading-relaxed">
                  We take your account security seriously. Our recovery process is designed to be quick, secure, and hassle-free.
                </p>
              </div>
            </div>

            {/* Security Tips Carousel */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-yellow-300" />
                <span className="text-sm font-semibold uppercase tracking-wide">Security Tips</span>
              </div>
              
              {CurrentTip && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 transition-all duration-500">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <CurrentTip.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Pro Tip</p>
                      <p className="text-indigo-100 text-sm leading-relaxed">{CurrentTip.text}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Dot indicators */}
              <div className="flex justify-center gap-2">
                {securityTips.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentTipIndex(idx)}
                    className={`transition-all duration-300 rounded-full ${
                      idx === currentTipIndex 
                        ? 'w-2 h-2 bg-white' 
                        : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Support Section */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <HelpCircle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-indigo-200">Need immediate help?</p>
                  <button className="text-sm font-semibold hover:text-white transition-colors">
                    Contact Support →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-6 mt-6">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
            <span>256-bit SSL Encrypted</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            <span>24/7 Support Available</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Globe className="h-3.5 w-3.5 text-purple-500" />
            <span>Trusted by 50,000+ Users</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease-out;
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}