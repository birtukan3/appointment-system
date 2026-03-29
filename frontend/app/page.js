"use client";

import { useRouter } from 'next/navigation';
import { useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { AppContext } from './providers';
import Navbar from './components/Navbar';
import ToastProvider from './components/ToastProvider';
import { 
  Calendar, Shield, Users, Building2, CheckCircle, 
  ArrowRight, Star, Briefcase, Phone, Mail, MapPin,
  Facebook, Twitter, Linkedin, Instagram, Sparkles, Rocket, Heart,
  Clock, Award, Zap, Globe, Smartphone, Loader, ChevronRight,
  CalendarDays, Clock3, Bell, MessageSquare, Settings, 
  BarChart3, Target, Trophy, Medal, Crown, Gem, Diamond,
  Video, FileText, UserCheck, UserX, TrendingUp,
  Play, Pause, Music, Coffee, Sun, Moon, Palette,
  Headphones
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user, loading } = useContext(AppContext);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [counters, setCounters] = useState({ users: 0, appointments: 0, satisfaction: 0, rating: 0 });
  const heroRef = useRef(null);

  // Testimonials data
  const testimonials = useMemo(() => [
    { 
      name: 'Dr. Sarah Johnson', 
      role: 'Medical Director', 
      comment: 'This platform has completely transformed how we manage appointments. Efficiency increased by 200%!', 
      rating: 5, 
      image: '👩‍⚕️',
      company: 'Wellness Medical Center',
      color: 'from-indigo-50 to-purple-50'
    },
    { 
      name: 'Michael Chen', 
      role: 'CTO', 
      comment: 'The best scheduling system we\'ve ever used. Our team productivity has skyrocketed.', 
      rating: 5, 
      image: '👨‍💻',
      company: 'TechInnovate',
      color: 'from-blue-50 to-cyan-50'
    },
    { 
      name: 'Emily Rodriguez', 
      role: 'Operations Manager', 
      comment: 'Incredible support team and feature-rich platform. Highly recommend to any business.', 
      rating: 5, 
      image: '👩‍💼',
      company: 'Global Solutions',
      color: 'from-emerald-50 to-teal-50'
    },
  ], []);

  // Services data
  const services = useMemo(() => [
    { 
      name: 'Instant Booking', 
      description: 'Book appointments in seconds with our intelligent scheduling system.', 
      icon: Zap, 
      gradient: 'from-amber-500 to-orange-500',
      details: '30-second booking',
      delay: 0
    },
    { 
      name: 'Smart Reminders', 
      description: 'Never miss an appointment with automated notifications.', 
      icon: Bell, 
      gradient: 'from-purple-500 to-pink-500',
      details: '95% attendance rate',
      delay: 100
    },
    { 
      name: 'Expert Staff', 
      description: 'Choose from our team of qualified professionals.', 
      icon: Users, 
      gradient: 'from-emerald-500 to-teal-500',
      details: 'Expert team',
      delay: 200
    },
    { 
      name: 'Real-time Sync', 
      description: 'Synchronize with your calendar instantly.', 
      icon: Calendar, 
      gradient: 'from-indigo-500 to-purple-500',
      details: 'Google Calendar sync',
      delay: 300
    },
  ], []);

  // Features data
  const features = useMemo(() => [
    { icon: Zap, title: 'Lightning Fast', description: 'Book appointments in under 30 seconds', color: 'from-amber-500 to-orange-500', delay: 0 },
    { icon: Shield, title: 'Bank-Grade Security', description: '256-bit encryption for your data', color: 'from-blue-500 to-indigo-500', delay: 100 },
    { icon: Sparkles, title: 'AI-Powered', description: 'Smart scheduling recommendations', color: 'from-purple-500 to-pink-500', delay: 200 },
    { icon: Heart, title: '24/7 Support', description: 'Round-the-clock customer service', color: 'from-rose-500 to-pink-500', delay: 300 },
    { icon: Globe, title: 'Global Access', description: 'Access from anywhere, anytime', color: 'from-cyan-500 to-blue-500', delay: 400 },
    { icon: Smartphone, title: 'Mobile Ready', description: 'Fully responsive design', color: 'from-emerald-500 to-teal-500', delay: 500 },
  ], []);

  // Benefits data
  const benefits = useMemo(() => [
    { icon: CalendarDays, title: 'Reduce No-Shows', description: 'Smart reminders', stat: '85%', color: 'from-emerald-500 to-teal-500' },
    { icon: Clock3, title: 'Save Time', description: 'Less admin work', stat: '40%', color: 'from-blue-500 to-indigo-500' },
    { icon: UserCheck, title: 'Staff Efficiency', description: 'Better organization', stat: '95%', color: 'from-amber-500 to-orange-500' },
    { icon: BarChart3, title: 'Better Insights', description: 'Data-driven decisions', stat: '100%', color: 'from-purple-500 to-pink-500' },
  ], []);

  // Stats data
  const stats = useMemo(() => [
    { value: '100K+', label: 'Active Users', icon: Users, delay: 0 },
    { value: '500K+', label: 'Appointments', icon: Calendar, delay: 100 },
    { value: '98%', label: 'Satisfaction', icon: Heart, delay: 200 },
    { value: '24/7', label: 'Support', icon: Headphones, delay: 300 },
  ], []);

  // Animated counters
  useEffect(() => {
    const animateCounter = (target, setter, duration = 2000) => {
      let start = 0;
      const increment = target / (duration / 16);
      const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
          setter(target);
          clearInterval(timer);
        } else {
          setter(Math.floor(start));
        }
      }, 16);
      return timer;
    };

    const timer1 = animateCounter(10000, (val) => setCounters(prev => ({ ...prev, users: val })));
    const timer2 = animateCounter(50000, (val) => setCounters(prev => ({ ...prev, appointments: val })));
    const timer3 = animateCounter(99, (val) => setCounters(prev => ({ ...prev, satisfaction: val })));
    const timer4 = animateCounter(49, (val) => setCounters(prev => ({ ...prev, rating: val })));

    return () => {
      clearInterval(timer1);
      clearInterval(timer2);
      clearInterval(timer3);
      clearInterval(timer4);
    };
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  // Mouse move effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Scroll animation
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('.fade-up-section');
      const windowHeight = window.innerHeight;
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top < windowHeight - 100) {
          section.classList.add('visible');
        }
      });
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavigation = useCallback((path) => {
    if (isNavigating) return;
    setIsNavigating(true);
    setTimeout(() => {
      router.push(path);
      setTimeout(() => setIsNavigating(false), 300);
    }, 50);
  }, [isNavigating, router]);

  // FIXED: Start Booking Button
  // If signed in as USER → goes to /book
  // If signed in as ADMIN or STAFF → goes to their dashboard
  // If NOT signed in → goes to /register
  const handleStartBooking = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAuthenticated) {
      if (user?.role === 'user') {
        // User role goes to book page
        handleNavigation('/book');
      } else if (user?.role === 'admin') {
        // Admin goes to admin dashboard
        handleNavigation('/admin');
      } else if (user?.role === 'staff') {
        // Staff goes to staff dashboard
        handleNavigation('/staff');
      } else {
        // Fallback
        handleNavigation('/dashboard');
      }
    } else {
      // Not signed in, go to register
      handleNavigation('/register');
    }
  }, [isAuthenticated, user, handleNavigation]);

  // FIXED: Sign In Button
  // If signed in → goes to dashboard (based on role)
  // If NOT signed in → goes to /login
  const handleSignIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAuthenticated) {
      // If already signed in, go to dashboard based on role
      if (user?.role === 'admin') {
        handleNavigation('/admin');
      } else if (user?.role === 'staff') {
        handleNavigation('/staff');
      } else {
        handleNavigation('/dashboard');
      }
    } else {
      // If not signed in, go to login page
      handleNavigation('/login');
    }
  }, [isAuthenticated, user, handleNavigation]);

  // Service card click - goes to book page if user, else login
  const handleServiceClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAuthenticated) {
      if (user?.role === 'user') {
        handleNavigation('/book');
      } else if (user?.role === 'admin') {
        toast.error('Admins cannot book appointments. Please use a user account.');
      } else if (user?.role === 'staff') {
        toast.error('Staff members cannot book appointments. Please use a user account.');
      }
    } else {
      toast.success('Please login or register to book an appointment');
      handleNavigation('/login');
    }
  }, [isAuthenticated, user, handleNavigation]);

  if (loading) {
    return (
      <>
        <ToastProvider />
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-indigo-400 animate-pulse" />
              </div>
            </div>
            <p className="text-slate-600 font-medium">Loading SmartOffice...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ToastProvider />
      <Navbar />
      <div className="min-h-screen bg-white overflow-x-hidden">
        {/* Animated Background */}
        <div 
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(99,102,241,0.03) 0%, transparent 50%)`
          }}
        />
        
        {/* Hero Section */}
        <section ref={heroRef} className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white">
          <div className="absolute inset-0">
            <div className="absolute top-20 left-10 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse-slow"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse-slow animation-delay-2000"></div>
            <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse-slow animation-delay-4000"></div>
            
            {/* Floating Particles */}
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${3 + Math.random() * 4}s`,
                  opacity: 0.3
                }}
              >
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            ))}
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 md:py-40">
            <div className="text-center max-w-5xl mx-auto animate-fade-in-up">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-8 animate-slide-in border border-white/20">
                <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse" />
                <span className="text-sm font-medium">✨ Smart Appointment Management System ✨</span>
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight animate-slide-up">
                Transform Your
                <span className="block bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300 bg-clip-text text-transparent animate-gradient-x">
                  Appointment Management
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-indigo-100 mb-12 max-w-3xl mx-auto animate-fade-in-up animation-delay-200">
                The intelligent platform that helps you schedule, manage, and optimize appointments with AI-powered insights.
              </p>
              <div className="flex flex-col sm:flex-row gap-5 justify-center animate-fade-in-up animation-delay-400">
                {/* Start Booking Button - FIXED */}
                <button 
                  onClick={handleStartBooking}
                  disabled={isNavigating}
                  className="group relative overflow-hidden bg-white text-indigo-600 px-10 py-4 rounded-2xl font-bold text-lg hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-purple-50 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <span className="relative z-10 flex items-center gap-2">
                    {isNavigating ? <Loader className="h-5 w-5 animate-spin" /> : <><Rocket className="h-5 w-5 group-hover:translate-x-1 group-hover:rotate-12 transition-transform" /> Start Booking</>}
                  </span>
                </button>
                
                {/* Sign In Button - FIXED */}
                <button 
                  onClick={handleSignIn}
                  disabled={isNavigating}
                  className="group bg-transparent border-2 border-white text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-white hover:text-indigo-600 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  Sign In <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              
              {/* Animated Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 pt-10 border-t border-white/20">
                <div className="text-center animate-float-in" style={{ animationDelay: '0ms' }}>
                  <div className="text-3xl md:text-4xl font-bold text-yellow-300 mb-1 animate-count-up">
                    {counters.users.toLocaleString()}+
                  </div>
                  <div className="text-sm text-indigo-100">Active Users</div>
                </div>
                <div className="text-center animate-float-in" style={{ animationDelay: '100ms' }}>
                  <div className="text-3xl md:text-4xl font-bold text-yellow-300 mb-1">
                    {counters.appointments.toLocaleString()}+
                  </div>
                  <div className="text-sm text-indigo-100">Appointments</div>
                </div>
                <div className="text-center animate-float-in" style={{ animationDelay: '200ms' }}>
                  <div className="text-3xl md:text-4xl font-bold text-yellow-300 mb-1">
                    {counters.satisfaction}%
                  </div>
                  <div className="text-sm text-indigo-100">Satisfaction</div>
                </div>
                <div className="text-center animate-float-in" style={{ animationDelay: '300ms' }}>
                  <div className="text-3xl md:text-4xl font-bold text-yellow-300 mb-1">
                    {counters.rating / 10}.{counters.rating % 10}
                  </div>
                  <div className="text-sm text-indigo-100">Rating</div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full"><path fill="white" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,170.7C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-24 bg-white relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 fade-up-section">
              <div className="inline-flex items-center gap-2 bg-indigo-50 rounded-full px-4 py-2 mb-4">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-semibold text-indigo-600">Premium Services</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">Everything You Need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 animate-gradient-x">Succeed</span></h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">Comprehensive appointment solutions for modern professionals</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map((service, index) => {
                const Icon = service.icon;
                return (
                  <div 
                    key={index} 
                    onClick={handleServiceClick}
                    className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer hover:-translate-y-3 fade-up-section border border-slate-100 overflow-hidden"
                    style={{ animationDelay: `${service.delay}ms` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
                    <div className={`w-14 h-14 bg-gradient-to-br ${service.gradient} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg`}>
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">{service.name}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed mb-3">{service.description}</p>
                    <p className="text-xs text-indigo-500 font-medium flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> {service.details}
                    </p>
                    <div className="text-indigo-600 font-semibold flex items-center gap-2 group-hover:gap-3 transition-all mt-4">
                      Book Now <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-float-slow"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 10}s`,
                  animationDuration: `${10 + Math.random() * 10}s`
                }}
              >
                <Sparkles className="h-4 w-4 text-indigo-200" />
              </div>
            ))}
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 fade-up-section">
              <div className="inline-flex items-center gap-2 bg-purple-50 rounded-full px-4 py-2 mb-4">
                <Rocket className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-600">Powerful Features</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">Why Choose <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 animate-gradient-x">SmartOffice?</span></h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">Designed for efficiency, security, and reliability</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div 
                    key={index} 
                    className="group bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-500 hover:-translate-y-2 fade-up-section border border-slate-100 relative overflow-hidden"
                    style={{ animationDelay: `${feature.delay}ms` }}
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-transparent to-slate-50 rounded-bl-full group-hover:scale-150 transition-transform duration-500"></div>
                    <div className={`mb-5 w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg`}>
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">{feature.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 fade-up-section">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Measurable <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Results</span></h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">See the impact on your appointment management</p>
            </div>
            <div className="grid md:grid-cols-4 gap-6">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div key={index} className="text-center p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 fade-up-section">
                    <div className={`w-16 h-16 bg-gradient-to-br ${benefit.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-indigo-600 mb-2">{benefit.stat}</div>
                    <h3 className="font-semibold text-slate-800 mb-1">{benefit.title}</h3>
                    <p className="text-sm text-slate-500">{benefit.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Stats Counter Section */}
        <section className="py-20 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative overflow-hidden">
          <div className="absolute inset-0">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${3 + Math.random() * 4}s`
                }}
              >
                <Sparkles className="h-2 w-2 text-white/30" />
              </div>
            ))}
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="text-center animate-scale-in" style={{ animationDelay: `${stat.delay}ms` }}>
                    <div className="flex justify-center mb-3">
                      <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm animate-pulse-slow">
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-white mb-1 animate-count-up">{stat.value}</div>
                    <div className="text-indigo-200">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Testimonials Carousel */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 fade-up-section">
              <div className="inline-flex items-center gap-2 bg-emerald-50 rounded-full px-4 py-2 mb-4">
                <Star className="h-4 w-4 text-emerald-600 animate-pulse" />
                <span className="text-sm font-semibold text-emerald-600">Testimonials</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">What Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Clients Say</span></h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">Trusted by thousands of satisfied users worldwide</p>
            </div>
            
            <div className="relative overflow-hidden">
              <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${activeTestimonial * 100}%)` }}>
                {testimonials.map((testimonial, index) => (
                  <div key={index} className="w-full flex-shrink-0 px-4">
                    <div className={`bg-gradient-to-br ${testimonial.color} rounded-3xl p-10 shadow-2xl transform transition-all duration-500 hover:scale-105`}>
                      <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="text-8xl">{testimonial.image}</div>
                        <div className="flex-1 text-center md:text-left">
                          <div className="flex justify-center md:justify-start gap-1 mb-4">
                            {[...Array(testimonial.rating)].map((_, i) => <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />)}
                          </div>
                          <p className="text-slate-700 text-lg leading-relaxed mb-6 italic">"{testimonial.comment}"</p>
                          <h4 className="font-bold text-slate-800 text-xl">{testimonial.name}</h4>
                          <p className="text-slate-500">{testimonial.role}</p>
                          <p className="text-sm text-indigo-500 mt-1">{testimonial.company}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Carousel Indicators */}
              <div className="flex justify-center gap-2 mt-8">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveTestimonial(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      activeTestimonial === index ? 'w-8 bg-indigo-600' : 'bg-slate-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative overflow-hidden py-24 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${3 + Math.random() * 4}s`
                }}
              >
                <Sparkles className="h-4 w-4 text-white/30" />
              </div>
            ))}
          </div>
          <div className="relative max-w-4xl mx-auto text-center px-4">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6 animate-bounce">
              <Calendar className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-medium">✨ Ready to Transform Your Workflow? ✨</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 animate-slide-up">Start Your Free Trial Today</h2>
            <p className="text-xl text-indigo-100 mb-8 animate-fade-in-up">No credit card required. Cancel anytime.</p>
            <button 
              onClick={handleStartBooking}
              disabled={isNavigating}
              className="group bg-white text-indigo-600 px-10 py-4 rounded-2xl font-bold text-lg hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer animate-scale-in"
            >
              {isNavigating ? <Loader className="h-5 w-5 animate-spin" /> : <><Rocket className="h-5 w-5 group-hover:translate-x-1 group-hover:rotate-12 transition-transform" /> Get Started Free</>}
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-12">
              <div>
                <div className="flex items-center space-x-2 mb-4 group cursor-pointer">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold group-hover:text-indigo-400 transition-colors">Smart<span className="text-indigo-400">Office</span></span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">Revolutionizing appointment management with intelligent scheduling.</p>
                <div className="flex gap-4 mt-6">
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="bg-slate-800 p-2.5 rounded-lg hover:bg-[#1877f2] transition-all duration-300 transform hover:scale-110 hover:rotate-6"><Facebook className="h-5 w-5" /></a>
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="bg-slate-800 p-2.5 rounded-lg hover:bg-[#1da1f2] transition-all duration-300 transform hover:scale-110 hover:rotate-6"><Twitter className="h-5 w-5" /></a>
                  <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="bg-slate-800 p-2.5 rounded-lg hover:bg-[#0a66c2] transition-all duration-300 transform hover:scale-110 hover:rotate-6"><Linkedin className="h-5 w-5" /></a>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="bg-slate-800 p-2.5 rounded-lg hover:bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] transition-all duration-300 transform hover:scale-110 hover:rotate-6"><Instagram className="h-5 w-5" /></a>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-4 text-white">Quick Links</h4>
                <ul className="space-y-3">
                  <li><button onClick={() => router.push('/')} className="text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-2 group"><ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" /> Home</button></li>
                  <li><button onClick={() => router.push('/book')} className="text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-2 group"><ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" /> Book Appointment</button></li>
                  <li><button onClick={() => router.push('/appointments')} className="text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-2 group"><ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" /> My Appointments</button></li>
                  <li><button onClick={() => router.push('/privacy')} className="text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-2 group"><ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" /> Privacy Policy</button></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-4 text-white">Contact Info</h4>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-slate-400 group"><Phone className="h-5 w-5 text-indigo-400 group-hover:scale-110 transition-transform" /><a href="tel:+15551234567" className="hover:text-indigo-400 transition-colors">+1 (555) 123-4567</a></li>
                  <li className="flex items-center gap-3 text-slate-400 group"><Mail className="h-5 w-5 text-indigo-400 group-hover:scale-110 transition-transform" /><a href="mailto:info@smartoffice.com" className="hover:text-indigo-400 transition-colors">info@smartoffice.com</a></li>
                  <li className="flex items-center gap-3 text-slate-400 group"><MapPin className="h-5 w-5 text-indigo-400 group-hover:scale-110 transition-transform" /><span>123 Business Ave, Suite 100<br />New York, NY 10001</span></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-4 text-white">Newsletter</h4>
                <p className="text-slate-400 text-sm mb-3">Get the latest updates and offers</p>
                <div className="flex">
                  <input type="email" placeholder="Your email" className="flex-1 px-4 py-2.5 bg-slate-800 rounded-l-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <button className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-r-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium hover:scale-105">Subscribe</button>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-400">
              <p>&copy; {currentYear} SmartOffice. All rights reserved. | Made with <Heart className="h-4 w-4 inline text-rose-500 animate-pulse" /> for professionals</p>
            </div>
          </div>
        </footer>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(50px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulseSlow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        @keyframes gradientX {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes countUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .animate-slide-in {
          animation: slideIn 0.6s ease-out forwards;
        }
        .animate-slide-up {
          animation: slideUp 0.8s ease-out forwards;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: floatSlow 8s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulseSlow 4s ease-in-out infinite;
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradientX 3s ease infinite;
        }
        .animate-count-up {
          animation: countUp 1s ease-out forwards;
        }
        .animate-scale-in {
          animation: scaleIn 0.5s ease-out forwards;
        }
        .animate-bounce {
          animation: bounce 1s ease-in-out infinite;
        }
        .animate-float-in {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .animation-delay-200 {
          animation-delay: 200ms;
        }
        .animation-delay-400 {
          animation-delay: 400ms;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .fade-up-section {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s ease-out;
        }
        .fade-up-section.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </>
  );
}