﻿// frontend/app/page.js - Complete Professional Homepage for Any Office

"use client";
// Add this at the very top of page.js
import { ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { AppContext } from './providers';
import Navbar from './components/Navbar';
import { 
  Calendar, Shield, Users, Building2, CheckCircle, 
  ArrowRight, Star, Briefcase, Phone, Mail, MapPin,
  Share, MessageCircle, Image, Sparkles, Rocket, Heart,
  Clock, Award, Zap, Globe, Smartphone, Loader, ChevronRight,
  CalendarDays, Clock3, Bell, MessageSquare, Settings, 
  BarChart3, Target, Trophy, Medal, Crown, Gem, Diamond,
  Video, FileText, UserCheck, UserX, TrendingUp,
  Play, Coffee, Sun, Moon, Headphones, Wifi,
  CreditCard, Lock, Database, Cloud, Cpu, Code,
  DollarSign, Percent, ThumbsUp, BookOpen, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user, loading } = useContext(AppContext);
  const [isNavigating, setIsNavigating] = useState(false);
  const currentYear = new Date().getFullYear();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [counters, setCounters] = useState({ businesses: 0, appointments: 0, satisfaction: 0, countries: 0 });
  const heroRef = useRef(null);
  const [emailForNewsletter, setEmailForNewsletter] = useState('');

  // Testimonials
  const testimonials = useMemo(() => [
    { 
      name: 'Dr. Sarah Johnson', 
      role: 'Medical Director', 
      comment: 'SmartOffice has revolutionized how we manage patient appointments. Our no-show rate dropped by 75% and patient satisfaction increased dramatically.', 
      rating: 5, 
      image: '👩‍⚕️',
      company: 'Wellness Medical Center',
      industry: 'Healthcare',
      color: 'from-indigo-50 to-purple-50'
    },
    { 
      name: 'Michael Chen', 
      role: 'CTO', 
      comment: 'The best scheduling system we\'ve ever used. Integration with our existing workflow was seamless, and the team productivity has skyrocketed by 200%.', 
      rating: 5, 
      image: '👨‍💻',
      company: 'TechInnovate',
      industry: 'Technology',
      color: 'from-blue-50 to-cyan-50'
    },
    { 
      name: 'Emily Rodriguez', 
      role: 'Operations Manager', 
      comment: 'Incredible support team and feature-rich platform. We\'ve saved over 40 hours per month on administrative tasks. Highly recommend to any business.', 
      rating: 5, 
      image: '👩‍💼',
      company: 'Global Solutions',
      industry: 'Corporate',
      color: 'from-emerald-50 to-teal-50'
    },
    { 
      name: 'James Wilson', 
      role: 'Clinic Owner', 
      comment: 'From dental clinics to law firms, this platform works perfectly. The automated reminders have been a game-changer for our practice.', 
      rating: 5, 
      image: '👨‍⚕️',
      company: 'Wilson Dental Clinic',
      industry: 'Dental',
      color: 'from-amber-50 to-orange-50'
    },
    { 
      name: 'Lisa Thompson', 
      role: 'HR Director', 
      comment: 'Managing interviews and candidate schedules has never been easier. The calendar sync feature is absolutely brilliant.', 
      rating: 5, 
      image: '👩‍💼',
      company: 'RecruitPro',
      industry: 'HR',
      color: 'from-rose-50 to-pink-50'
    },
  ], []);

  // Industries we serve
  const industries = useMemo(() => [
    { name: 'Healthcare', icon: Heart, color: 'from-rose-500 to-pink-500', count: '5,000+' },
    { name: 'Legal', icon: Shield, color: 'from-indigo-500 to-purple-500', count: '2,500+' },
    { name: 'Education', icon: BookOpen, color: 'from-emerald-500 to-teal-500', count: '3,000+' },
    { name: 'Corporate', icon: Building2, color: 'from-blue-500 to-cyan-500', count: '8,000+' },
    { name: 'Retail', icon: ShoppingBag, color: 'from-amber-500 to-orange-500', count: '4,500+' },
    { name: 'Beauty & Wellness', icon: Sparkles, color: 'from-purple-500 to-pink-500', count: '6,000+' },
  ], []);

  // Services
  const services = useMemo(() => [
    { 
      name: 'Smart Scheduling', 
      description: 'AI-powered appointment scheduling that learns your preferences and optimizes your calendar.', 
      icon: Calendar, 
      gradient: 'from-indigo-500 to-purple-500',
      features: ['Auto-confirmation', 'Conflict detection', 'Smart suggestions'],
      delay: 0
    },
    { 
      name: 'Automated Reminders', 
      description: 'Reduce no-shows with automated SMS, email, and push notifications.', 
      icon: Bell, 
      gradient: 'from-amber-500 to-orange-500',
      features: ['SMS reminders', 'Email alerts', 'Push notifications'],
      delay: 100
    },
    { 
      name: 'Team Management', 
      description: 'Manage multiple staff members, roles, and permissions from one dashboard.', 
      icon: Users, 
      gradient: 'from-emerald-500 to-teal-500',
      features: ['Role-based access', 'Team calendar', 'Performance tracking'],
      delay: 200
    },
    { 
      name: 'Analytics & Reports', 
      description: 'Gain insights with detailed reports and analytics dashboard.', 
      icon: BarChart3, 
      gradient: 'from-cyan-500 to-blue-500',
      features: ['Custom reports', 'Export data', 'Performance metrics'],
      delay: 300
    },
    { 
      name: 'Payment Integration', 
      description: 'Accept payments online with secure payment gateway integration.', 
      icon: CreditCard, 
      gradient: 'from-green-500 to-emerald-500',
      features: ['Stripe ready', 'PayPal integration', 'Invoice generation'],
      delay: 400
    },
    { 
      name: 'Calendar Sync', 
      description: 'Sync with Google Calendar, Outlook, and other popular calendars.', 
      icon: CalendarDays, 
      gradient: 'from-red-500 to-rose-500',
      features: ['Two-way sync', 'Real-time updates', 'Multiple calendars'],
      delay: 500
    },
  ], []);

  // Features
  const features = useMemo(() => [
    { icon: Zap, title: 'Lightning Fast', description: 'Book appointments in under 30 seconds', color: 'from-amber-500 to-orange-500', delay: 0 },
    { icon: Shield, title: 'Bank-Grade Security', description: '256-bit encryption for your data', color: 'from-blue-500 to-indigo-500', delay: 100 },
    { icon: Sparkles, title: 'AI-Powered', description: 'Smart scheduling recommendations', color: 'from-purple-500 to-pink-500', delay: 200 },
    { icon: Heart, title: '24/7 Support', description: 'Round-the-clock customer service', color: 'from-rose-500 to-pink-500', delay: 300 },
    { icon: Globe, title: 'Global Access', description: 'Access from anywhere, anytime', color: 'from-cyan-500 to-blue-500', delay: 400 },
    { icon: Smartphone, title: 'Mobile Ready', description: 'Fully responsive design', color: 'from-emerald-500 to-teal-500', delay: 500 },
    { icon: Cloud, title: 'Cloud-Based', description: 'No installation needed', color: 'from-sky-500 to-blue-500', delay: 600 },
    { icon: Database, title: 'Secure Backup', description: 'Automatic daily backups', color: 'from-gray-500 to-slate-500', delay: 700 },
  ], []);

  // Benefits
  const benefits = useMemo(() => [
    { icon: CalendarDays, title: 'Reduce No-Shows', description: 'Smart reminders', stat: '75%', color: 'from-emerald-500 to-teal-500' },
    { icon: Clock3, title: 'Save Time', description: 'Less admin work', stat: '40%', color: 'from-blue-500 to-indigo-500' },
    { icon: UserCheck, title: 'Staff Efficiency', description: 'Better organization', stat: '95%', color: 'from-amber-500 to-orange-500' },
    { icon: BarChart3, title: 'Better Insights', description: 'Data-driven decisions', stat: '100%', color: 'from-purple-500 to-pink-500' },
    { icon: DollarSign, title: 'Cost Savings', description: 'Reduce operational costs', stat: '35%', color: 'from-green-500 to-emerald-500' },
    { icon: TrendingUp, title: 'Growth', description: 'Scale your business', stat: '50%', color: 'from-cyan-500 to-blue-500' },
  ], []);

  // Stats
  const stats = useMemo(() => [
    { value: '50K+', label: 'Businesses', icon: Building2, delay: 0 },
    { value: '1M+', label: 'Appointments', icon: Calendar, delay: 100 },
    { value: '98%', label: 'Satisfaction', icon: Heart, delay: 200 },
    { value: '150+', label: 'Countries', icon: Globe, delay: 300 },
  ], []);

  // Pricing plans
  const pricingPlans = useMemo(() => [
    {
      name: 'Starter',
      price: '$29',
      period: 'month',
      description: 'Perfect for small businesses and startups',
      features: ['Up to 100 appointments/month', 'Basic reporting', 'Email support', 'Calendar sync', '2 team members'],
      icon: Rocket,
      color: 'from-blue-500 to-cyan-500',
      recommended: false
    },
    {
      name: 'Professional',
      price: '$79',
      period: 'month',
      description: 'Ideal for growing businesses',
      features: ['Unlimited appointments', 'Advanced analytics', 'Priority support', 'SMS reminders', '10 team members', 'API access'],
      icon: Crown,
      color: 'from-indigo-500 to-purple-500',
      recommended: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'contact us',
      description: 'For large organizations with custom needs',
      features: ['Custom integrations', 'Dedicated support', 'SLA guarantee', 'Unlimited team members', 'White-label option', 'On-premise deployment'],
      icon: Diamond,
      color: 'from-rose-500 to-pink-500',
      recommended: false
    },
  ], []);

  // FAQ
  const faqs = useMemo(() => [
    { question: 'What types of businesses can use SmartOffice?', answer: 'SmartOffice is designed for any business that manages appointments - healthcare, legal, education, beauty, corporate, retail, and more. Our platform is highly customizable to fit your specific needs.' },
    { question: 'Is my data secure?', answer: 'Absolutely! We use bank-grade 256-bit encryption, regular security audits, and comply with GDPR, CCPA, and HIPAA standards. Your data is backed up daily and stored securely.' },
    { question: 'Can I sync with my existing calendar?', answer: 'Yes! SmartOffice integrates seamlessly with Google Calendar, Outlook, iCal, and other major calendar platforms. Two-way sync ensures your schedule is always up to date.' },
    { question: 'Do you offer a free trial?', answer: 'Yes, we offer a 14-day free trial with no credit card required. You can explore all features and see if SmartOffice is right for your business.' },
    { question: 'What kind of support do you provide?', answer: 'We offer 24/7 email and chat support for all plans. Professional and Enterprise plans include priority phone support and dedicated account managers.' },
  ], []);

  // Particle positions for background animation
  const particlePositions = useMemo(
    () => Array.from({ length: 50 }, () => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 10}s`,
      animationDuration: `${5 + Math.random() * 10}s`,
    })),
    []
  );

  // Animate counters on mount
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

    const timer1 = animateCounter(50000, (val) => setCounters(prev => ({ ...prev, businesses: val })));
    const timer2 = animateCounter(1000000, (val) => setCounters(prev => ({ ...prev, appointments: val })));
    const timer3 = animateCounter(98, (val) => setCounters(prev => ({ ...prev, satisfaction: val })));
    const timer4 = animateCounter(150, (val) => setCounters(prev => ({ ...prev, countries: val })));

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
    }, 6000);
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

  // Scroll reveal sections
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
    
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavigation = useCallback((path) => {
    if (isNavigating) return;
    setIsNavigating(true);
    router.push(path)
      .catch((error) => {
        console.error('Navigation error:', error);
        toast.error('Unable to navigate right now.');
      })
      .finally(() => {
        setTimeout(() => setIsNavigating(false), 500);
      });
  }, [isNavigating, router]);

  const handleStartBooking = useCallback((e) => {
    e.preventDefault();
    if (isAuthenticated) {
      if (user?.role === 'user') {
        handleNavigation('/book');
      } else if (user?.role === 'admin') {
        handleNavigation('/admin');
      } else if (user?.role === 'staff') {
        handleNavigation('/staff');
      } else {
        handleNavigation('/dashboard');
      }
    } else {
      toast.success('Please login to book an appointment.');
      handleNavigation('/login');
    }
  }, [isAuthenticated, user, handleNavigation]);

  const handleSignIn = useCallback((e) => {
    e.preventDefault();
    if (isAuthenticated) {
      if (user?.role === 'admin') {
        handleNavigation('/admin');
      } else if (user?.role === 'staff') {
        handleNavigation('/staff');
      } else {
        handleNavigation('/dashboard');
      }
    } else {
      handleNavigation('/login');
    }
  }, [isAuthenticated, user, handleNavigation]);

  const handleNewsletterSubscribe = useCallback(() => {
    if (!emailForNewsletter) {
      toast.error('Please enter your email address');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForNewsletter)) {
      toast.error('Please enter a valid email address');
      return;
    }
    toast.success('Subscribed to newsletter!');
    setEmailForNewsletter('');
  }, [emailForNewsletter]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
              <Sparkles className="h-8 w-8 text-indigo-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <p className="text-slate-600 font-medium">Loading SmartOffice...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-white overflow-x-hidden">
        {/* Custom Mouse Follow Gradient */}
        <div 
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(99,102,241,0.03) 0%, transparent 50%)`
          }}
        />
        
        {/* ============ HERO SECTION ============ */}
        <section ref={heroRef} className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white">
          {/* Animated Background Elements */}
          <div className="absolute inset-0">
            <div className="absolute top-20 left-10 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse-slow"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse-slow animation-delay-2000"></div>
            <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse-slow animation-delay-4000"></div>
            
            {/* Floating particles */}
            {particlePositions.map((particle, i) => (
              <div
                key={i}
                className="absolute animate-float"
                style={{
                  left: particle.left,
                  top: particle.top,
                  animationDelay: particle.animationDelay,
                  animationDuration: particle.animationDuration,
                  opacity: 0.2,
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
                <span className="text-sm font-medium">✨ The Ultimate Appointment Management Platform ✨</span>
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight animate-slide-up">
                Transform Your
                <span className="block bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300 bg-clip-text text-transparent animate-gradient-x">
                  Business Scheduling
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-indigo-100 mb-12 max-w-3xl mx-auto animate-fade-in-up animation-delay-200">
                The intelligent platform that helps any office schedule, manage, and optimize appointments with AI-powered insights.
              </p>
              <div className="flex flex-col sm:flex-row gap-5 justify-center animate-fade-in-up animation-delay-400">
                <button 
                  onClick={handleStartBooking}
                  disabled={isNavigating}
                  className="group relative overflow-hidden bg-white text-indigo-600 px-10 py-4 rounded-2xl font-bold text-lg hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-purple-50 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <span className="relative z-10 flex items-center gap-2">
                    {isNavigating ? <Loader className="h-5 w-5 animate-spin" /> : <><Rocket className="h-5 w-5 group-hover:translate-x-1 group-hover:rotate-12 transition-transform" /> Start Free Trial</>}
                  </span>
                </button>
                
                <button 
                  onClick={handleSignIn}
                  disabled={isNavigating}
                  className="group bg-transparent border-2 border-white text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-white hover:text-indigo-600 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sign In <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              
              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 pt-10 border-t border-white/20">
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-yellow-300 mb-1">
                    {counters.businesses.toLocaleString()}+
                  </div>
                  <div className="text-sm text-indigo-100">Businesses</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-yellow-300 mb-1">
                    {counters.appointments.toLocaleString()}+
                  </div>
                  <div className="text-sm text-indigo-100">Appointments</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-yellow-300 mb-1">
                    {counters.satisfaction}%
                  </div>
                  <div className="text-sm text-indigo-100">Satisfaction</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-yellow-300 mb-1">
                    {counters.countries}+
                  </div>
                  <div className="text-sm text-indigo-100">Countries</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Wave SVG */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full"><path fill="white" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,170.7C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>
          </div>
        </section>

        {/* ============ INDUSTRIES WE SERVE ============ */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 fade-up-section">
              <div className="inline-flex items-center gap-2 bg-indigo-50 rounded-full px-4 py-2 mb-4">
                <Building2 className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-semibold text-indigo-600">Trusted By</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">Every Industry, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Every Business</span></h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">SmartOffice works perfectly for any office environment</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 fade-up-section">
              {industries.map((industry, index) => {
                const Icon = industry.icon;
                return (
                  <div key={index} className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-5 text-center border border-slate-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <div className={`w-12 h-12 bg-gradient-to-br ${industry.color} rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm">{industry.name}</h3>
                    <p className="text-xs text-indigo-600 mt-1">{industry.count}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============ SERVICES SECTION ============ */}
        <section className="py-24 bg-gradient-to-b from-slate-50 to-white relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 fade-up-section">
              <div className="inline-flex items-center gap-2 bg-purple-50 rounded-full px-4 py-2 mb-4">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-600">Premium Features</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">Everything You Need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">Succeed</span></h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">Comprehensive solutions for modern office management</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, index) => {
                const Icon = service.icon;
                return (
                  <div 
                    key={index} 
                    className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 fade-up-section border border-slate-100 overflow-hidden"
                    style={{ animationDelay: `${service.delay}ms` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
                    <div className={`w-14 h-14 bg-gradient-to-br ${service.gradient} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg`}>
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">{service.name}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed mb-4">{service.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {service.features.slice(0, 2).map((feature, idx) => (
                        <span key={idx} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">✓ {feature}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============ FEATURES SECTION ============ */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 fade-up-section">
              <div className="inline-flex items-center gap-2 bg-emerald-50 rounded-full px-4 py-2 mb-4">
                <Crown className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-600">Why Choose Us</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">Powerful Features for <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Modern Offices</span></h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">Designed for efficiency, security, and reliability</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div 
                    key={index} 
                    className="group bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-500 hover:-translate-y-2 fade-up-section border border-slate-100"
                    style={{ animationDelay: `${feature.delay}ms` }}
                  >
                    <div className={`mb-4 w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-md`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">{feature.title}</h3>
                    <p className="text-slate-600 text-sm">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============ BENEFITS SECTION ============ */}
        <section className="py-20 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 fade-up-section">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Measurable <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Results</span></h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">See the impact on your office management</p>
            </div>
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div key={index} className="text-center p-4 rounded-xl bg-white border border-slate-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 fade-up-section">
                    <div className={`w-12 h-12 bg-gradient-to-br ${benefit.color} rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-indigo-600 mb-1">{benefit.stat}</div>
                    <h3 className="font-semibold text-slate-800 text-sm">{benefit.title}</h3>
                    <p className="text-xs text-slate-500">{benefit.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============ STATS BANNER ============ */}
        <section className="py-16 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="fade-up-section" style={{ animationDelay: `${stat.delay}ms` }}>
                    <div className="flex justify-center mb-3">
                      <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-indigo-200 text-sm">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============ PRICING SECTION ============ */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 fade-up-section">
              <div className="inline-flex items-center gap-2 bg-amber-50 rounded-full px-4 py-2 mb-4">
                <DollarSign className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-600">Pricing</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">Simple, Transparent <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">Pricing</span></h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">Choose the plan that fits your business needs</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {pricingPlans.map((plan, index) => {
                const Icon = plan.icon;
                return (
                  <div 
                    key={index} 
                    className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-500 hover:-translate-y-2 fade-up-section ${
                      plan.recommended ? 'ring-2 ring-indigo-500 shadow-2xl' : 'border border-slate-100'
                    }`}
                  >
                    {plan.recommended && (
                      <div className="absolute top-0 right-0">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">MOST POPULAR</div>
                      </div>
                    )}
                    <div className={`p-6 bg-gradient-to-br ${plan.color} text-white`}>
                      <Icon className="h-12 w-12 mb-4 opacity-80" />
                      <h3 className="text-2xl font-bold">{plan.name}</h3>
                      <div className="mt-4">
                        <span className="text-4xl font-bold">{plan.price}</span>
                        <span className="text-sm opacity-80">/{plan.period}</span>
                      </div>
                      <p className="text-sm opacity-80 mt-2">{plan.description}</p>
                    </div>
                    <div className="p-6">
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <button 
                        onClick={handleStartBooking}
                        className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${
                          plan.recommended 
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg' 
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Get Started
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============ TESTIMONIALS SECTION ============ */}
        <section className="py-24 bg-gradient-to-b from-slate-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 fade-up-section">
              <div className="inline-flex items-center gap-2 bg-rose-50 rounded-full px-4 py-2 mb-4">
                <Star className="h-4 w-4 text-rose-600" />
                <span className="text-sm font-semibold text-rose-600">Testimonials</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">What Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-pink-600">Clients Say</span></h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">Trusted by thousands of satisfied businesses worldwide</p>
            </div>
            
            <div className="relative max-w-4xl mx-auto">
              <div className="overflow-hidden">
                <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${activeTestimonial * 100}%)` }}>
                  {testimonials.map((testimonial, index) => (
                    <div key={index} className="w-full flex-shrink-0 px-4">
                      <div className={`bg-gradient-to-br ${testimonial.color} rounded-3xl p-8 shadow-2xl`}>
                        <div className="flex flex-col md:flex-row items-center gap-6">
                          <div className="text-7xl">{testimonial.image}</div>
                          <div className="flex-1 text-center md:text-left">
                            <div className="flex gap-1 mb-3 justify-center md:justify-start">
                              {[...Array(testimonial.rating)].map((_, i) => (
                                <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                              ))}
                            </div>
                            <p className="text-slate-700 text-base leading-relaxed mb-4 italic">"{testimonial.comment}"</p>
                            <h4 className="font-bold text-slate-800 text-lg">{testimonial.name}</h4>
                            <p className="text-slate-500 text-sm">{testimonial.role}</p>
                            <p className="text-xs text-indigo-500 mt-1">{testimonial.company} • {testimonial.industry}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-center gap-2 mt-8">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveTestimonial(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      activeTestimonial === index ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-300'
                    }`}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============ FAQ SECTION ============ */}
        <section className="py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 fade-up-section">
              <div className="inline-flex items-center gap-2 bg-blue-50 rounded-full px-4 py-2 mb-4">
                <HelpCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-600">FAQ</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Frequently Asked <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">Questions</span></h2>
              <p className="text-lg text-slate-600">Got questions? We've got answers</p>
            </div>
            <div className="space-y-4 fade-up-section">
              {faqs.map((faq, index) => (
                <details key={index} className="group bg-slate-50 rounded-xl p-4 cursor-pointer hover:bg-slate-100 transition">
                  <summary className="font-semibold text-slate-800 flex items-center justify-between list-none">
                    {faq.question}
                    <ChevronRight className="h-5 w-5 text-slate-500 group-open:rotate-90 transition-transform" />
                  </summary>
                  <p className="text-slate-600 mt-3 pl-0 text-sm">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ============ CTA SECTION ============ */}
        <section className="py-24 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
          <div className="max-w-4xl mx-auto text-center px-4">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Rocket className="h-4 w-4 text-white" />
              <span className="text-sm font-medium text-white">✨ Ready to Transform Your Office? ✨</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Start Your Free Trial Today</h2>
            <p className="text-xl text-indigo-100 mb-8">No credit card required. Cancel anytime.</p>
            <button 
              onClick={handleStartBooking}
              disabled={isNavigating}
              className="group bg-white text-indigo-600 px-10 py-4 rounded-2xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isNavigating ? <Loader className="h-5 w-5 animate-spin" /> : <><Rocket className="h-5 w-5" /> Get Started Free</>}
            </button>
          </div>
        </section>

        {/* ============ FOOTER ============ */}
        <footer className="bg-slate-900 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-12">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-lg">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold">Smart<span className="text-indigo-400">Office</span></span>
                </div>
                <p className="text-slate-400 text-sm">Revolutionizing office management with intelligent scheduling solutions for any business.</p>
                <div className="flex gap-4 mt-6">
                  <a href="#" className="bg-slate-800 p-2.5 rounded-lg hover:bg-[#1877f2] transition"><Share className="h-5 w-5" /></a>
                  <a href="#" className="bg-slate-800 p-2.5 rounded-lg hover:bg-[#1da1f2] transition"><MessageCircle className="h-5 w-5" /></a>
                  <a href="#" className="bg-slate-800 p-2.5 rounded-lg hover:bg-[#0a66c2] transition"><Users className="h-5 w-5" /></a>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-4">Quick Links</h4>
                <ul className="space-y-3">
                  <li><button onClick={() => router.push('/')} className="text-slate-400 hover:text-white transition">Home</button></li>
                  <li><button onClick={() => handleNavigation('/book')} className="text-slate-400 hover:text-white transition">Book Appointment</button></li>
                  <li><button onClick={() => handleNavigation('/appointments')} className="text-slate-400 hover:text-white transition">My Appointments</button></li>
                  <li><button onClick={() => handleNavigation('/privacy')} className="text-slate-400 hover:text-white transition">Privacy Policy</button></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-4">Contact Info</h4>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-slate-400"><Phone className="h-5 w-5" /> +1 (555) 123-4567</li>
                  <li className="flex items-center gap-3 text-slate-400"><Mail className="h-5 w-5" /> info@smartoffice.com</li>
                  <li className="flex items-center gap-3 text-slate-400"><MapPin className="h-5 w-5" /> New York, NY 10001</li>
                  <li className="flex items-center gap-3 text-slate-400"><Clock className="h-5 w-5" /> 24/7 Support</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-4">Newsletter</h4>
                <p className="text-slate-400 text-sm mb-3">Get the latest updates and offers</p>
                <div className="flex">
                  <input 
                    type="email" 
                    value={emailForNewsletter}
                    onChange={(e) => setEmailForNewsletter(e.target.value)}
                    placeholder="Your email" 
                    className="flex-1 px-4 py-2.5 bg-slate-800 rounded-l-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button 
                    onClick={handleNewsletterSubscribe}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-r-lg hover:from-indigo-700 hover:to-purple-700 transition"
                  >
                    Subscribe
                  </button>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-400 text-sm">
              <p>&copy; {currentYear} SmartOffice. All rights reserved. | Made with <Heart className="h-4 w-4 inline text-rose-500" /> for offices worldwide</p>
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
        @keyframes pulseSlow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        @keyframes gradientX {
          0%, 100% { background-size: 200% 200%; background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; opacity: 0; }
        .animate-slide-in { animation: slideIn 0.6s ease-out forwards; opacity: 0; }
        .animate-slide-up { animation: slideUp 0.8s ease-out forwards; opacity: 0; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulseSlow 4s ease-in-out infinite; }
        .animate-gradient-x { background-size: 200% 200%; animation: gradientX 3s ease infinite; }
        .animation-delay-200 { animation-delay: 200ms; }
        .animation-delay-400 { animation-delay: 400ms; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .fade-up-section { opacity: 0; transform: translateY(30px); transition: all 0.8s ease-out; }
        .fade-up-section.visible { opacity: 1; transform: translateY(0); }
      `}</style>
    </>
  );
}