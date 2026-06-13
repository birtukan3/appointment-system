﻿"use client";

import { useState, useEffect, useContext, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppContext } from "../providers";
import Navbar from "../components/Navbar";
import ToastProvider from "../components/ToastProvider";
import api from "../lib/api";
import {
  Calendar, Clock, CheckCircle, XCircle, User, ArrowRight,
  Filter, Search, X, TrendingUp, CalendarDays, Briefcase,
  MessageSquare, Star, Award, Eye, Sparkles, Shield, Zap, Users,
  RefreshCw, Heart, Bell, Activity, BarChart3, PieChart,
  ChevronRight, ChevronLeft, Home, Settings, LogOut,
  Moon, Sun, Gift, Crown, Rocket, Target, ThumbsUp,
  Coffee, Wifi, Monitor, Printer, Video, Headphones,
  AlertCircle, Info, HelpCircle, Mail, Phone, MapPin
} from "lucide-react";
import toast from "react-hot-toast";
import { format, formatDistance, isToday, isPast, isFuture } from "date-fns";

export default function UserDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useContext(AppContext);
  
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, completed: 0, upcoming: 0 });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [greetingEmoji, setGreetingEmoji] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [showQuickStats, setShowQuickStats] = useState(true);
  const [selectedQuickFilter, setSelectedQuickFilter] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [healthTips, setHealthTips] = useState([]);

  // Current time effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Set greeting with emoji
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Good Morning");
      setGreetingEmoji("🌅");
    } else if (hour < 18) {
      setGreeting("Good Afternoon");
      setGreetingEmoji("☀️");
    } else {
      setGreeting("Good Evening");
      setGreetingEmoji("🌙");
    }
    
    // Hide welcome animation after 3 seconds
    const timer = setTimeout(() => setShowWelcomeAnimation(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Health tips
  useEffect(() => {
    const tips = [
      { icon: "💧", text: "Stay hydrated - drink 8 glasses of water daily", color: "bg-blue-100 text-blue-600" },
      { icon: "😴", text: "Get 7-8 hours of sleep for optimal health", color: "bg-indigo-100 text-indigo-600" },
      { icon: "🚶", text: "Take a 10-minute walk after meals", color: "bg-green-100 text-green-600" },
      { icon: "🧘", text: "Practice deep breathing for stress relief", color: "bg-purple-100 text-purple-600" },
      { icon: "🍎", text: "Eat a balanced diet with fruits and vegetables", color: "bg-orange-100 text-orange-600" },
      { icon: "📱", text: "Limit screen time before bed for better sleep", color: "bg-cyan-100 text-cyan-600" }
    ];
    setHealthTips(tips);
  }, []);

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      setConnectionError(false);
      
      let appointmentsData = [];
      let errorMessage = null;
      
      // Method 1: Try getMyAppointments
      try {
        const response = await api.getMyAppointments();
        appointmentsData = Array.isArray(response) ? response : (response?.data || []);
      } catch (error1) {
        errorMessage = error1?.message;
        
        // Method 2: Try direct GET
        try {
          const response = await api.get('/api/appointments/my');
          appointmentsData = response?.data || [];
        } catch (error2) {
          // Method 3: Use mock data
          appointmentsData = getMockAppointments();
          setConnectionError(true);
          toast.error("Using demo data. Backend connection issue.", { icon: '🔄' });
        }
      }
      
      const now = new Date();
      const upcoming = appointmentsData.filter(a => {
        const status = (a.status || '').toLowerCase();
        return (status === 'approved' || status === 'Approved') && a.datetime && new Date(a.datetime) > now;
      }).length;
      
      const completed = appointmentsData.filter(a => {
        const status = (a.status || '').toLowerCase();
        return status === 'completed' || (status === 'approved' && a.datetime && new Date(a.datetime) < now);
      }).length;
      
      setAppointments(appointmentsData || []);
      setStats({
        total: appointmentsData?.length || 0,
        pending: (appointmentsData || []).filter(a => (a.status || '').toLowerCase() === 'pending').length,
        approved: (appointmentsData || []).filter(a => (a.status || '').toLowerCase() === 'approved').length,
        rejected: (appointmentsData || []).filter(a => (a.status || '').toLowerCase() === 'rejected').length,
        completed: completed,
        upcoming: upcoming,
      });
      
      // Generate recent activity
      const activities = (appointmentsData || []).slice(0, 5).map(app => ({
        id: app.id,
        type: app.status === 'pending' ? 'created' : app.status === 'approved' ? 'approved' : 'updated',
        message: `${app.status === 'pending' ? '📝 Booked' : app.status === 'approved' ? '✅ Approved' : '📋 Updated'} ${app.serviceName}`,
        time: app.createdAt || new Date().toISOString()
      }));
      setRecentActivity(activities);
      
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      setAppointments(getMockAppointments());
      setConnectionError(true);
      toast.error("Unable to load data. Showing demo content.", { icon: '🔄' });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
    toast.success("Dashboard refreshed! ✨");
  };

  const getMockAppointments = () => {
    const currentUser = user || { name: "User", email: "user@example.com", id: 1 };
    
    return [
      {
        id: 1,
        serviceName: "Cardiology Consultation",
        providerName: "Dr. Sarah Johnson",
        datetime: new Date(Date.now() + 86400000).toISOString(),
        status: "approved",
        priority: "normal",
        notes: "First time consultation for heart health checkup",
        comment: "Please bring your previous medical reports",
        bookingCode: "BK-001",
        userEmail: currentUser.email,
        userId: currentUser.id,
        userName: currentUser.name,
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        serviceName: "Neurology Follow-up",
        providerName: "Dr. Michael Chen",
        datetime: new Date(Date.now() + 172800000).toISOString(),
        status: "pending",
        priority: "high",
        notes: "Follow-up appointment for migraine treatment",
        comment: "",
        bookingCode: "BK-002",
        userEmail: currentUser.email,
        userId: currentUser.id,
        userName: currentUser.name,
        createdAt: new Date().toISOString(),
      },
      {
        id: 3,
        serviceName: "Pediatric Checkup",
        providerName: "Dr. Emily Rodriguez",
        datetime: new Date(Date.now() - 86400000).toISOString(),
        status: "completed",
        priority: "normal",
        notes: "Regular child health checkup",
        comment: "Great session! Your child is doing well.",
        bookingCode: "BK-003",
        userEmail: currentUser.email,
        userId: currentUser.id,
        userName: currentUser.name,
        createdAt: new Date().toISOString(),
      }
    ];
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;
    
    try {
      await api.cancelAppointment(selectedAppointment.id);
      toast.success("Appointment cancelled successfully 🗑️");
      setShowCancelModal(false);
      setSelectedAppointment(null);
      fetchUserData();
    } catch (error) {
      setAppointments(prev => prev.filter(app => app.id !== selectedAppointment.id));
      toast.success("Appointment cancelled");
      setShowCancelModal(false);
      setSelectedAppointment(null);
    }
  };

  const getStatusBadge = (status) => {
    const lowerStatus = (status || '').toLowerCase();
    switch(lowerStatus) {
      case "approved":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200 shadow-sm"><CheckCircle className="h-3 w-3" /> Approved</span>;
      case "completed":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border border-blue-200 shadow-sm"><CheckCircle className="h-3 w-3" /> Completed</span>;
      case "rejected":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 border border-rose-200 shadow-sm"><XCircle className="h-3 w-3" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200 shadow-sm animate-pulse"><Clock className="h-3 w-3" /> Pending</span>;
    }
  };

  const getTimeRemaining = (datetime) => {
    if (!datetime) return null;
    const date = new Date(datetime);
    if (isPast(date)) return null;
    if (isToday(date)) return "Today! 🔥";
    const days = Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24));
    if (days === 1) return "Tomorrow ⏰";
    return `${days} days left 📅`;
  };

  const statusFiltered = appointments.filter(app => {
    if (filter === "all") return true;
    const appStatus = (app.status || '').toLowerCase();
    return appStatus === filter.toLowerCase();
  });

  const filteredAppointments = statusFiltered.filter(app => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (app.serviceName || '').toLowerCase().includes(term) ||
      (app.providerName || '').toLowerCase().includes(term) ||
      (app.notes || '').toLowerCase().includes(term)
    );
  });

  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const dateA = new Date(a.datetime);
    const dateB = new Date(b.datetime);
    return sortBy === "newest" ? dateB - dateA : dateA - dateB;
  });

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString('en-US', { 
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  };

  const formatTime = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: 'numeric', minute: '2-digit', hour12: true 
    });
  };

  const formatRelativeTime = (date) => {
    if (!date) return "N/A";
    return formatDistance(new Date(date), new Date(), { addSuffix: true });
  };

  const completionRate = stats.total > 0 ? Math.round(((stats.completed + stats.approved) / stats.total) * 100) : 0;

  const statsCards = [
    { key: 'total', label: 'Total Appointments', value: stats.total, icon: Calendar, color: 'from-indigo-500 to-purple-500', bg: 'from-indigo-50 to-purple-50', textColor: 'text-indigo-600', borderColor: 'border-indigo-200' },
    { key: 'upcoming', label: 'Upcoming', value: stats.upcoming, icon: CalendarDays, color: 'from-blue-500 to-cyan-500', bg: 'from-blue-50 to-cyan-50', textColor: 'text-blue-600', borderColor: 'border-blue-200' },
    { key: 'pending', label: 'Pending Approval', value: stats.pending, icon: Clock, color: 'from-amber-500 to-orange-500', bg: 'from-amber-50 to-orange-50', textColor: 'text-amber-600', borderColor: 'border-amber-200' },
    { key: 'completed', label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'from-emerald-500 to-green-500', bg: 'from-emerald-50 to-green-50', textColor: 'text-emerald-600', borderColor: 'border-emerald-200' },
  ];

  if (authLoading || loading) {
    return (
      <>
        <ToastProvider />
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-24 w-24 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-6"></div>
              <Sparkles className="h-8 w-8 text-indigo-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <p className="text-slate-600 font-medium text-lg">Loading your dashboard...</p>
            <p className="text-sm text-slate-400 mt-1">Please wait while we fetch your data</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ToastProvider />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-purple-50/20">
        
        {/* Welcome Animation Overlay */}
        {showWelcomeAnimation && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center animate-fadeOut pointer-events-none">
            <div className="text-center transform animate-bounceIn">
              <div className="w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <User className="h-16 w-16 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Welcome Back!</h2>
              <p className="text-indigo-200 text-lg">{greeting}, {user?.name?.split(" ")[0] || "User"}!</p>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
          
          {/* Connection Error Banner */}
          {connectionError && (
            <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 animate-slideDown">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Zap className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Demo Mode Active</p>
                    <p className="text-xs text-amber-600">Showing sample data. Backend connection may be unavailable.</p>
                  </div>
                </div>
                <button 
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-200 transition-all duration-300 flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Retry Connection
                </button>
              </div>
            </div>
          )}

          {/* Hero Welcome Section */}
          <div className="relative overflow-hidden rounded-3xl mb-10 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-2xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
            
            <div className="relative px-8 py-10 md:py-12">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5">
                      <span className="text-yellow-200 text-sm font-medium">{greetingEmoji} {greeting}</span>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5">
                      <span className="text-white text-sm">{format(currentTime, 'h:mm a')}</span>
                    </div>
                  </div>
                  
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 leading-tight">
                    {greeting}, <span className="bg-gradient-to-r from-yellow-200 to-pink-200 bg-clip-text text-transparent">
                      {user?.name?.split(" ")[0] || "User"}
                    </span>! 👋
                  </h1>
                  
                  <p className="text-indigo-100 text-lg max-w-2xl">
                    Welcome to your SmartOffice dashboard. Track your appointments, manage your health, and stay connected with our healthcare team.
                  </p>
                  
                  <div className="flex flex-wrap gap-3 mt-6">
                    <button 
                      onClick={() => router.push("/book")}
                      className="px-6 py-2.5 bg-white text-indigo-700 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
                    >
                      <Calendar className="h-4 w-4" /> Book New Appointment
                    </button>
                    <button 
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="px-6 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-xl font-medium hover:bg-white/30 transition-all duration-300 flex items-center gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                      Refresh Data
                    </button>
                  </div>
                </div>
                
                <div className="hidden lg:block">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                    <div className="flex items-center gap-3 justify-center mb-3">
                      <Award className="h-8 w-8 text-yellow-300" />
                      <span className="text-white font-semibold">Health Score</span>
                    </div>
                    <p className="text-4xl font-bold text-white">{completionRate}%</p>
                    <p className="text-xs text-indigo-200 mt-1">Appointment completion rate</p>
                    <div className="w-full bg-white/20 rounded-full h-2 mt-3">
                      <div className="bg-yellow-300 rounded-full h-2 transition-all duration-500" style={{ width: `${completionRate}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {statsCards.map((stat, index) => {
              const Icon = stat.icon;
              const isHovered = hoveredCard === stat.key;
              return (
                <div
                  key={stat.key}
                  onMouseEnter={() => setHoveredCard(stat.key)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={() => {
                    if (stat.key !== 'total' && stat.key !== 'completed') {
                      setFilter(stat.key === 'upcoming' ? 'approved' : stat.key);
                      setSelectedQuickFilter(stat.key);
                    }
                  }}
                  className={`bg-white rounded-2xl p-6 border shadow-lg transition-all duration-500 cursor-pointer transform hover:scale-105 ${
                    isHovered ? 'shadow-2xl -translate-y-1' : ''
                  } ${selectedQuickFilter === stat.key ? 'ring-2 ring-indigo-500 shadow-xl' : ''}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.bg}`}>
                      <Icon className={`h-6 w-6 ${stat.textColor}`} />
                    </div>
                    <TrendingUp className={`h-4 w-4 text-gray-400 transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-1' : 'opacity-0'}`} />
                  </div>
                  <p className="text-3xl font-bold text-gray-800 mb-1">{stat.value.toLocaleString()}</p>
                  <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                  {stat.key === 'upcoming' && stats.upcoming > 0 && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-green-600">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      <span>{stats.upcoming} appointment{stats.upcoming !== 1 ? 's' : ''} scheduled</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
              <p className="text-xs text-indigo-600 font-medium">Avg. Response Time</p>
              <p className="text-xl font-bold text-indigo-800">2.5 hrs</p>
            </div>
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
              <p className="text-xs text-emerald-600 font-medium">Total Hours Saved</p>
              <p className="text-xl font-bold text-emerald-800">47 hrs</p>
            </div>
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
              <p className="text-xs text-amber-600 font-medium">Satisfaction Rate</p>
              <p className="text-xl font-bold text-amber-800">98%</p>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
              <p className="text-xs text-purple-600 font-medium">Reward Points</p>
              <p className="text-xl font-bold text-purple-800">1,250</p>
            </div>
          </div>

          {/* Health Tip of the Day */}
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <Heart className="h-5 w-5 text-rose-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">💡 Health Tip of the Day</p>
                <p className="text-sm text-gray-700 mt-1">{healthTips[Math.floor(Math.random() * healthTips.length)]?.text}</p>
              </div>
              <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">More Tips →</button>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 mb-6 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Activity className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Your Appointments</h2>
                    <p className="text-xs text-gray-500">Manage and track all your appointments</p>
                  </div>
                </div>
                
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by service, provider, or notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap gap-2">
              <button 
                onClick={() => { setFilter("all"); setSelectedQuickFilter(null); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  filter === "all" 
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" /> All ({stats.total})
              </button>
              <button 
                onClick={() => { setFilter("pending"); setSelectedQuickFilter("pending"); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  filter === "pending" 
                    ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Clock className="h-4 w-4" /> Pending ({stats.pending})
              </button>
              <button 
                onClick={() => { setFilter("approved"); setSelectedQuickFilter("approved"); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  filter === "approved" 
                    ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <CheckCircle className="h-4 w-4" /> Approved ({stats.approved})
              </button>
              <button 
                onClick={() => { setFilter("completed"); setSelectedQuickFilter("completed"); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  filter === "completed" 
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <CheckCircle className="h-4 w-4" /> Completed ({stats.completed})
              </button>
              
              <div className="flex-1"></div>
              
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)} 
                className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="newest">📅 Newest first</option>
                <option value="oldest">📅 Oldest first</option>
              </select>
            </div>

            {/* Appointments List */}
            <div className="p-6">
              {sortedAppointments.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Calendar className="h-14 w-14 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No appointments found</h3>
                  <p className="text-gray-500 mb-6">Book your first appointment to get started with SmartOffice</p>
                  <button 
                    onClick={() => router.push("/book")} 
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4" /> Book Your First Appointment
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedAppointments.map((app, index) => {
                    const timeRemaining = getTimeRemaining(app.datetime);
                    const isPastAppointment = app.datetime && isPast(new Date(app.datetime));
                    const isApproved = (app.status || '').toLowerCase() === 'approved';
                    
                    return (
                      <div 
                        key={app.id} 
                        className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.01] animate-fadeInUp"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          {/* Left Section */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                              <h3 className="font-bold text-gray-800 text-lg">{app.serviceName}</h3>
                              {getStatusBadge(app.status)}
                              {timeRemaining && isApproved && !isPastAppointment && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                  <Rocket className="h-3 w-3" /> {timeRemaining}
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Briefcase className="h-4 w-4 text-indigo-500" />
                                <span>with <span className="font-medium text-gray-800">{app.providerName}</span></span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="h-4 w-4 text-indigo-500" />
                                <span>{formatDate(app.datetime)} at {formatTime(app.datetime)}</span>
                              </div>
                              {app.bookingCode && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Tag className="h-4 w-4 text-indigo-500" />
                                  <span>Code: <span className="font-mono font-medium text-indigo-600">{app.bookingCode}</span></span>
                                </div>
                              )}
                            </div>
                            
                            {app.notes && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" /> Your Notes:
                                </p>
                                <p className="text-sm text-gray-700 mt-1 italic">"{app.notes}"</p>
                              </div>
                            )}
                          </div>
                          
                          {/* Right Section - Actions */}
                          <div className="flex gap-2">
                            {(app.status === 'pending' || app.status === 'Pending') && (
                              <button
                                onClick={() => { setSelectedAppointment(app); setShowCancelModal(true); }}
                                className="px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 rounded-xl hover:bg-rose-100 transition-all duration-300 flex items-center gap-2"
                              >
                                <XCircle className="h-4 w-4" /> Cancel
                              </button>
                            )}
                            <button
                              onClick={() => { setSelectedAppointment(app); setShowDetailsModal(true); }}
                              className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all duration-300 flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" /> Details
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section - Recent Activity & Quick Links */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-semibold text-gray-800">Recent Activity</h3>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {recentActivity.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No recent activity</p>
                ) : (
                  recentActivity.map((activity, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                        <Bell className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">{activity.message}</p>
                        <p className="text-xs text-gray-400">{formatRelativeTime(activity.time)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Links & Support */}
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Headphones className="h-5 w-5" /> Need Help?
                </h3>
                <p className="text-sm text-indigo-100 mb-4">Our support team is available 24/7 to assist you</p>
                <button className="w-full py-2 bg-white/20 rounded-xl text-sm font-medium hover:bg-white/30 transition">
                  Contact Support →
                </button>
              </div>
              
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" /> Quick Tips
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">✓ Arrive 10 minutes early</li>
                  <li className="flex items-center gap-2">✓ Bring medical records</li>
                  <li className="flex items-center gap-2">✓ List your symptoms</li>
                  <li className="flex items-center gap-2">✓ Prepare questions for doctor</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Cancel Modal */}
        {showCancelModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl transform animate-scaleIn">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="h-10 w-10 text-rose-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Cancel Appointment?</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to cancel your appointment for <br />
                  <span className="font-semibold text-gray-800">{selectedAppointment.serviceName}</span>?
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={handleCancelAppointment} 
                    className="flex-1 bg-gradient-to-r from-rose-600 to-red-600 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
                  >
                    Yes, Cancel
                  </button>
                  <button 
                    onClick={() => { setShowCancelModal(false); setSelectedAppointment(null); }} 
                    className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-300"
                  >
                    No, Keep
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl transform animate-scaleIn">
              <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Appointment Details</h2>
                    <p className="text-xs text-gray-500">View complete appointment information</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setShowDetailsModal(false); setSelectedAppointment(null); }} 
                  className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-300"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl">
                    <p className="text-xs text-indigo-600 font-medium">Service</p>
                    <p className="font-semibold text-gray-800 mt-1">{selectedAppointment.serviceName}</p>
                  </div>
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-xl">
                    <p className="text-xs text-emerald-600 font-medium">Provider</p>
                    <p className="font-semibold text-gray-800 mt-1">{selectedAppointment.providerName}</p>
                  </div>
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl">
                    <p className="text-xs text-amber-600 font-medium">Date & Time</p>
                    <p className="font-semibold text-gray-800 mt-1">{formatDate(selectedAppointment.datetime)}</p>
                    <p className="text-sm text-indigo-600 mt-0.5">{formatTime(selectedAppointment.datetime)}</p>
                  </div>
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl">
                    <p className="text-xs text-blue-600 font-medium">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedAppointment.status)}</div>
                  </div>
                </div>
                
                {selectedAppointment.bookingCode && (
                  <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-4 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium">Booking Reference</p>
                    <p className="font-mono text-lg font-bold text-indigo-600 tracking-wider mt-1">{selectedAppointment.bookingCode}</p>
                  </div>
                )}
                
                {selectedAppointment.notes && (
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> Your Notes
                    </p>
                    <p className="text-gray-700 mt-2">{selectedAppointment.notes}</p>
                  </div>
                )}
                
                {selectedAppointment.comment && (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                      <Star className="h-3 w-3" /> Staff Comment
                    </p>
                    <p className="text-gray-700 mt-2">{selectedAppointment.comment}</p>
                  </div>
                )}
                
                <div className="flex gap-3 pt-2">
                  {selectedAppointment.status === 'pending' && (
                    <button
                      onClick={() => { setShowCancelModal(true); setShowDetailsModal(false); }}
                      className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl font-semibold hover:bg-rose-700 transition-all duration-300"
                    >
                      Cancel Appointment
                    </button>
                  )}
                  <button
                    onClick={() => router.push("/book")}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
                  >
                    Book New Appointment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeOut {
          0% { opacity: 1; visibility: visible; }
          70% { opacity: 0.3; }
          100% { opacity: 0; visibility: hidden; }
        }
        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.3); }
          50% { opacity: 1; transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeOut { animation: fadeOut 3s ease-out forwards; }
        .animate-bounceIn { animation: bounceIn 0.5s ease-out; }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.2s ease-out; }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
        .animate-fadeInUp { animation: fadeInUp 0.4s ease-out forwards; opacity: 0; }
      `}</style>
    </>
  );
}