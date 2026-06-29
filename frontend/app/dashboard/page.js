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
  ChevronRight, ChevronLeft, LayoutDashboard,
  Code, Terminal, Cpu, Tag, Rocket, Target, ThumbsUp,
  Headphones, Crown, AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { format, formatDistance, isToday, isPast, isFuture } from "date-fns";

export default function UserDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useContext(AppContext);
  
  // ============ STATE MANAGEMENT ============
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("datetime");
  const [sortOrder, setSortOrder] = useState("desc");
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const [stats, setStats] = useState({ 
    total: 0, 
    pending: 0, 
    approved: 0, 
    rejected: 0, 
    completed: 0, 
    upcoming: 0 
  });
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [greetingEmoji, setGreetingEmoji] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  
  const techTips = [
    { icon: "💻", text: "Take a 5-minute break every hour to prevent eye strain", color: "bg-blue-100 text-blue-600" },
    { icon: "🧠", text: "Use the Pomodoro technique: 25 min work, 5 min break", color: "bg-indigo-100 text-indigo-600" },
    { icon: "☕", text: "Stay hydrated - coffee breaks improve productivity", color: "bg-amber-100 text-amber-600" },
    { icon: "🎧", text: "Noise-cancelling headphones boost focus by 40%", color: "bg-purple-100 text-purple-600" },
    { icon: "⚡", text: "Keyboard shortcuts save 8+ days per year", color: "bg-green-100 text-green-600" },
    { icon: "🔋", text: "Charge your laptop to 80% for longer battery life", color: "bg-cyan-100 text-cyan-600" }
  ];
  
  const [productivityScore, setProductivityScore] = useState(0);
  const toastShownRef = useRef(false);
  const toastTimeoutRef = useRef(null);
  const isFetchingRef = useRef(false);

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
    
    const timer = setTimeout(() => setShowWelcomeAnimation(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // ============ CALCULATE STATS FROM BOOKINGS ============
  const calculateStatsFromBookings = useCallback((bookingsData) => {
    const now = new Date();
    const upcoming = bookingsData.filter(b => {
      const status = (b.status || '').toLowerCase();
      return (status === 'approved') && b.datetime && new Date(b.datetime) > now;
    }).length;
    
    const completed = bookingsData.filter(b => {
      const status = (b.status || '').toLowerCase();
      return status === 'completed' || (status === 'approved' && b.datetime && new Date(b.datetime) < now);
    }).length;
    
    setStats({
      total: bookingsData.length,
      pending: bookingsData.filter(b => (b.status || '').toLowerCase() === 'pending').length,
      approved: bookingsData.filter(b => (b.status || '').toLowerCase() === 'approved').length,
      rejected: bookingsData.filter(b => (b.status || '').toLowerCase() === 'rejected').length,
      completed: completed,
      upcoming: upcoming,
    });
    
    const rate = bookingsData.length > 0 
      ? Math.round(((completed + bookingsData.filter(b => (b.status || '').toLowerCase() === 'approved').length) / bookingsData.length) * 100) 
      : 0;
    setProductivityScore(Math.min(98, rate + 10));
    
    const activities = bookingsData.slice(0, 5).map(booking => ({
      id: booking.id,
      type: booking.status === 'pending' ? 'created' : booking.status === 'approved' ? 'approved' : 'updated',
      message: `${booking.status === 'pending' ? '📝 Booked' : booking.status === 'approved' ? '✅ Approved' : '📋 Completed'} ${booking.serviceName}`,
      time: booking.createdAt || new Date().toISOString()
    }));
    setRecentActivity(activities);
  }, []);

  // ============ FETCH BOOKINGS ============
  const fetchBookings = useCallback(async () => {
    if (isFetchingRef.current) return;
    
    try {
      isFetchingRef.current = true;
      setLoading(true);
      
      const params = new URLSearchParams();
      params.append('page', currentPage);
      params.append('limit', itemsPerPage);
      params.append('sortBy', sortField);
      params.append('sortOrder', sortOrder);
      
      if (filter !== 'all') {
        params.append('status', filter);
      }
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      
      const response = await api.get(`/appointments/my?${params.toString()}`);
      
      if (response?.data) {
        const bookingsData = Array.isArray(response.data) ? response.data : (response.data.data || []);
        setBookings(bookingsData);
        setTotalItems(response.data.total || response.data.totalItems || bookingsData.length);
        setTotalPages(response.data.totalPages || Math.ceil((response.data.total || bookingsData.length) / itemsPerPage));
        calculateStatsFromBookings(bookingsData);
        toastShownRef.current = false;
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setConnectionError(false);
      }
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
      setConnectionError(true);
      setBookings([]);
      setTotalItems(0);
      setTotalPages(0);
      
      if (!toastShownRef.current) {
        toastShownRef.current = true;
        toast.error("Failed to load bookings. Please refresh.");
        toastTimeoutRef.current = setTimeout(() => {
          toastShownRef.current = false;
        }, 5000);
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [currentPage, itemsPerPage, filter, searchTerm, sortField, sortOrder, calculateStatsFromBookings]);

  // ============ REDIRECT BASED ON ROLE ============
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    
    // ✅ Enhanced role-based redirect
    const role = user?.role?.toLowerCase();
    if (role === 'admin') {
      router.push("/admin");
      return;
    }
    if (role === 'staff') {
      router.push("/staff");
      return;
    }
    if (role !== 'user') {
      router.push("/dashboard");
      return;
    }
    
    fetchBookings();
  }, [authLoading, isAuthenticated, user, router, fetchBookings]);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
    toast.success("Dashboard refreshed! ✨");
  };

  // Cancel booking
  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    
    try {
      await api.delete(`/appointments/${selectedBooking.id}`);
      toast.success("Booking cancelled successfully 🗑️");
      setShowCancelModal(false);
      setSelectedBooking(null);
      await fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel booking");
    }
  };

  // Filter handlers
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // Pagination
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  const getPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(i);
    }
    return buttons;
  };

  // UI Helper Functions
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
        return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200 shadow-sm"><Clock className="h-3 w-3" /> Pending</span>;
    }
  };

  const getPriorityBadge = (priority) => {
    const lowerPriority = (priority || '').toLowerCase();
    if (lowerPriority === "urgent") {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 border border-red-200"><Zap className="h-2.5 w-2.5" /> Urgent</span>;
    }
    if (lowerPriority === "high") {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-600 border border-orange-200"><TrendingUp className="h-2.5 w-2.5" /> High</span>;
    }
    if (lowerPriority === "low") {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-600 border border-green-200"><Target className="h-2.5 w-2.5" /> Low</span>;
    }
    return null;
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

  const statsCards = [
    { key: 'total', label: 'Total Sessions', value: stats.total, icon: Calendar, color: 'from-indigo-500 to-purple-500', bg: 'from-indigo-50 to-purple-50', textColor: 'text-indigo-600', borderColor: 'border-indigo-200', description: 'All time bookings' },
    { key: 'upcoming', label: 'Upcoming', value: stats.upcoming, icon: CalendarDays, color: 'from-blue-500 to-cyan-500', bg: 'from-blue-50 to-cyan-50', textColor: 'text-blue-600', borderColor: 'border-blue-200', description: 'Scheduled sessions' },
    { key: 'pending', label: 'Pending Review', value: stats.pending, icon: Clock, color: 'from-amber-500 to-orange-500', bg: 'from-amber-50 to-orange-50', textColor: 'text-amber-600', borderColor: 'border-amber-200', description: 'Awaiting approval' },
    { key: 'completed', label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'from-emerald-500 to-green-500', bg: 'from-emerald-50 to-green-50', textColor: 'text-emerald-600', borderColor: 'border-emerald-200', description: 'Successfully finished' },
  ];

  // Loading Screen
  if (authLoading) {
    return (
      <>
        <ToastProvider />
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-24 w-24 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-6"></div>
              <Sparkles className="h-8 w-8 text-indigo-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <p className="text-slate-600 font-medium text-lg">Loading TechHub Dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  // Main Render
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
                <Code className="h-16 w-16 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Welcome to TechHub!</h2>
              <p className="text-indigo-200 text-lg">{greeting}, {user?.name?.split(" ")[0] || "Developer"}!</p>
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
                    <p className="text-sm font-semibold text-amber-800">Connection Issue</p>
                    <p className="text-xs text-amber-600">Unable to fetch data from server. Please check your connection.</p>
                  </div>
                </div>
                <button 
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-200 transition-all duration-300 flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Retry
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
                    <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5">
                      <span className="text-cyan-200 text-sm flex items-center gap-1"><Cpu className="h-3 w-3" /> Tech Professional</span>
                    </div>
                  </div>
                  
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 leading-tight">
                    {greeting}, <span className="bg-gradient-to-r from-yellow-200 to-pink-200 bg-clip-text text-transparent">
                      {user?.name?.split(" ")[0] || "Developer"}
                    </span>! 👋
                  </h1>
                  
                  <p className="text-indigo-100 text-lg max-w-2xl">
                    Welcome to your TechHub consultation dashboard. Book expert sessions, track your progress, and level up your skills.
                  </p>
                  
                  <div className="flex flex-wrap gap-3 mt-6">
                    <button 
                      onClick={() => router.push("/book")}
                      className="px-6 py-2.5 bg-white text-indigo-700 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
                    >
                      <Calendar className="h-4 w-4" /> Book Consultation
                    </button>
                    <button 
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="px-6 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-xl font-medium hover:bg-white/30 transition-all duration-300 flex items-center gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>
                </div>
                
                <div className="hidden lg:block">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                    <div className="flex items-center gap-3 justify-center mb-3">
                      <Rocket className="h-8 w-8 text-yellow-300" />
                      <span className="text-white font-semibold">Productivity Score</span>
                    </div>
                    <p className="text-4xl font-bold text-white">{productivityScore}%</p>
                    <p className="text-xs text-indigo-200 mt-1">Session completion rate</p>
                    <div className="w-full bg-white/20 rounded-full h-2 mt-3">
                      <div className="bg-yellow-300 rounded-full h-2 transition-all duration-500" style={{ width: `${productivityScore}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {statsCards.map((stat) => {
              const Icon = stat.icon;
              const isHovered = hoveredCard === stat.key;
              return (
                <div
                  key={stat.key}
                  onMouseEnter={() => setHoveredCard(stat.key)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={() => {
                    if (stat.key !== 'total' && stat.key !== 'completed') {
                      handleFilterChange(stat.key === 'upcoming' ? 'approved' : stat.key);
                    }
                  }}
                  className={`bg-white rounded-2xl p-6 border shadow-lg transition-all duration-500 cursor-pointer transform hover:scale-105 ${
                    isHovered ? 'shadow-2xl -translate-y-1' : ''
                  } ${filter === (stat.key === 'upcoming' ? 'approved' : stat.key) ? 'ring-2 ring-indigo-500 shadow-xl' : ''}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.bg}`}>
                      <Icon className={`h-6 w-6 ${stat.textColor}`} />
                    </div>
                    <TrendingUp className={`h-4 w-4 text-gray-400 transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-1' : 'opacity-0'}`} />
                  </div>
                  <p className="text-3xl font-bold text-gray-800 mb-1">{stat.value.toLocaleString()}</p>
                  <p className="text-sm font-semibold text-gray-800">{stat.label}</p>
                  <p className="text-xs text-gray-400 mt-1">{stat.description}</p>
                  {stat.key === 'upcoming' && stats.upcoming > 0 && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-green-600">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      <span>{stats.upcoming} session{stats.upcoming !== 1 ? 's' : ''} scheduled</span>
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
              <p className="text-xl font-bold text-indigo-800">&lt; 2 hours</p>
            </div>
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
              <p className="text-xs text-emerald-600 font-medium">Hours Saved</p>
              <p className="text-xl font-bold text-emerald-800">127 hrs</p>
            </div>
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
              <p className="text-xs text-amber-600 font-medium">Expert Rating</p>
              <p className="text-xl font-bold text-amber-800">4.9 ★</p>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
              <p className="text-xs text-purple-600 font-medium">Skills Upgraded</p>
              <p className="text-xl font-bold text-purple-800">12</p>
            </div>
          </div>

          {/* Tech Tip of the Day */}
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <Cpu className="h-5 w-5 text-indigo-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">💡 Tech Tip of the Day</p>
                <p className="text-sm text-gray-700 mt-1">{techTips[Math.floor(Math.random() * techTips.length)]?.text}</p>
              </div>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 mb-6 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Briefcase className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Your Consultations</h2>
                    <p className="text-xs text-gray-500">Manage and track all your tech sessions</p>
                  </div>
                </div>
                
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by service, expert, or tech stack..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  {searchTerm && (
                    <button onClick={clearSearch} className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap gap-2">
              <button 
                onClick={() => handleFilterChange("all")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  filter === "all" 
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" /> All ({stats.total})
              </button>
              <button 
                onClick={() => handleFilterChange("pending")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  filter === "pending" 
                    ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Clock className="h-4 w-4" /> Pending ({stats.pending})
              </button>
              <button 
                onClick={() => handleFilterChange("approved")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  filter === "approved" 
                    ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <CheckCircle className="h-4 w-4" /> Approved ({stats.approved})
              </button>
              <button 
                onClick={() => handleFilterChange("completed")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  filter === "completed" 
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <CheckCircle className="h-4 w-4" /> Completed ({stats.completed})
              </button>
              
              <div className="flex-1"></div>
              
              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Sort by:</span>
                <select 
                  value={`${sortField}:${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split(':');
                    setSortField(field);
                    setSortOrder(order);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="datetime:desc">📅 Newest first</option>
                  <option value="datetime:asc">📅 Oldest first</option>
                  <option value="serviceName:asc">📋 Service A-Z</option>
                  <option value="serviceName:desc">📋 Service Z-A</option>
                  <option value="providerName:asc">👨‍💻 Expert A-Z</option>
                  <option value="providerName:desc">👨‍💻 Expert Z-A</option>
                  <option value="status:asc">📊 Status A-Z</option>
                  <option value="status:desc">📊 Status Z-A</option>
                </select>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading consultations...</p>
              </div>
            )}

            {/* Consultations List */}
            {!loading && (
              <div className="p-6">
                {bookings.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Calendar className="h-14 w-14 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No consultations found</h3>
                    <p className="text-gray-500 mb-6">
                      {searchTerm ? "Try different search terms" : "Book your first tech consultation to get started"}
                    </p>
                    {searchTerm ? (
                      <button onClick={clearSearch} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
                        Clear Search
                      </button>
                    ) : (
                      <button 
                        onClick={() => router.push("/book")} 
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2"
                      >
                        <Calendar className="h-4 w-4" /> Book Your First Consultation
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking, index) => {
                      const timeRemaining = getTimeRemaining(booking.datetime);
                      const isPastBooking = booking.datetime && isPast(new Date(booking.datetime));
                      const isApproved = (booking.status || '').toLowerCase() === 'approved';
                      
                      return (
                        <div 
                          key={booking.id} 
                          className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.01] animate-fadeInUp"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3 flex-wrap">
                                <h3 className="font-bold text-gray-800 text-lg">{booking.serviceName}</h3>
                                {getStatusBadge(booking.status)}
                                {getPriorityBadge(booking.priority)}
                                {timeRemaining && isApproved && !isPastBooking && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                    <Rocket className="h-3 w-3" /> {timeRemaining}
                                  </span>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Users className="h-4 w-4 text-indigo-500" />
                                  <span>with <span className="font-medium text-gray-800">{booking.providerName}</span></span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Calendar className="h-4 w-4 text-indigo-500" />
                                  <span>{formatDate(booking.datetime)} at {formatTime(booking.datetime)}</span>
                                </div>
                                {booking.techStack && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Terminal className="h-4 w-4 text-indigo-500" />
                                    <span>Tech: <span className="font-medium text-gray-800">{booking.techStack}</span></span>
                                  </div>
                                )}
                                {booking.bookingCode && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Tag className="h-4 w-4 text-indigo-500" />
                                    <span>Code: <span className="font-mono font-medium text-indigo-600">{booking.bookingCode}</span></span>
                                  </div>
                                )}
                              </div>
                              
                              {booking.notes && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                                  <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" /> Your Notes:
                                  </p>
                                  <p className="text-sm text-gray-700 mt-1 italic">"{booking.notes}"</p>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex gap-2">
                              {(booking.status === 'pending' || booking.status === 'Pending') && (
                                <button
                                  onClick={() => { setSelectedBooking(booking); setShowCancelModal(true); }}
                                  className="px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 rounded-xl hover:bg-rose-100 transition-all duration-300 flex items-center gap-2"
                                >
                                  <XCircle className="h-4 w-4" /> Cancel
                                </button>
                              )}
                              <button
                                onClick={() => { setSelectedBooking(booking); setShowDetailsModal(true); }}
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
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} consultations
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {getPaginationButtons().map(page => (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                          currentPage === page
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Show:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Headphones className="h-5 w-5" /> Need Tech Support?
                </h3>
                <p className="text-sm text-indigo-100 mb-4">Our tech support team is available 24/7 to assist you</p>
                <button className="w-full py-2 bg-white/20 rounded-xl text-sm font-medium hover:bg-white/30 transition">
                  Contact Support →
                </button>
              </div>
              
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" /> Quick Tips
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">✓ Test your microphone before the session</li>
                  <li className="flex items-center gap-2">✓ Prepare your questions in advance</li>
                  <li className="flex items-center gap-2">✓ Share your screen for code review</li>
                  <li className="flex items-center gap-2">✓ Take notes during the consultation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Cancel Modal */}
        {showCancelModal && selectedBooking && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl transform animate-scaleIn">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="h-10 w-10 text-rose-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Cancel Consultation?</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to cancel your consultation for <br />
                  <span className="font-semibold text-gray-800">{selectedBooking.serviceName}</span>?
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={handleCancelBooking} 
                    className="flex-1 bg-gradient-to-r from-rose-600 to-red-600 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
                  >
                    Yes, Cancel
                  </button>
                  <button 
                    onClick={() => { setShowCancelModal(false); setSelectedBooking(null); }} 
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
        {showDetailsModal && selectedBooking && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl transform animate-scaleIn">
              <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Consultation Details</h2>
                    <p className="text-xs text-gray-500">View complete session information</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setShowDetailsModal(false); setSelectedBooking(null); }} 
                  className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-300"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl">
                    <p className="text-xs text-indigo-600 font-medium">Service</p>
                    <p className="font-semibold text-gray-800 mt-1">{selectedBooking.serviceName}</p>
                  </div>
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-xl">
                    <p className="text-xs text-emerald-600 font-medium">Expert</p>
                    <p className="font-semibold text-gray-800 mt-1">{selectedBooking.providerName}</p>
                  </div>
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl">
                    <p className="text-xs text-amber-600 font-medium">Date & Time</p>
                    <p className="font-semibold text-gray-800 mt-1">{formatDate(selectedBooking.datetime)}</p>
                    <p className="text-sm text-indigo-600 mt-0.5">{formatTime(selectedBooking.datetime)}</p>
                  </div>
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl">
                    <p className="text-xs text-blue-600 font-medium">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedBooking.status)}</div>
                  </div>
                  {selectedBooking.priority && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl">
                      <p className="text-xs text-purple-600 font-medium">Priority</p>
                      <div className="mt-1">{getPriorityBadge(selectedBooking.priority)}</div>
                    </div>
                  )}
                  {selectedBooking.duration && (
                    <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-4 rounded-xl">
                      <p className="text-xs text-teal-600 font-medium">Duration</p>
                      <p className="font-semibold text-gray-800 mt-1">{selectedBooking.duration} minutes</p>
                    </div>
                  )}
                </div>
                
                {selectedBooking.techStack && (
                  <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-4 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                      <Terminal className="h-3 w-3" /> Tech Stack
                    </p>
                    <p className="font-mono text-sm font-medium text-indigo-600 mt-1">{selectedBooking.techStack}</p>
                  </div>
                )}
                
                {selectedBooking.bookingCode && (
                  <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-4 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium">Booking Reference</p>
                    <p className="font-mono text-lg font-bold text-indigo-600 tracking-wider mt-1">{selectedBooking.bookingCode}</p>
                  </div>
                )}
                
                {selectedBooking.notes && (
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> Your Notes
                    </p>
                    <p className="text-gray-700 mt-2">{selectedBooking.notes}</p>
                  </div>
                )}
                
                {selectedBooking.comment && (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                      <Star className="h-3 w-3" /> Expert Comment
                    </p>
                    <p className="text-gray-700 mt-2">{selectedBooking.comment}</p>
                  </div>
                )}
                
                <div className="flex gap-3 pt-2">
                  {selectedBooking.status === 'pending' && (
                    <button
                      onClick={() => { setShowCancelModal(true); setShowDetailsModal(false); }}
                      className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl font-semibold hover:bg-rose-700 transition-all duration-300"
                    >
                      Cancel Consultation
                    </button>
                  )}
                  <button
                    onClick={() => router.push("/book")}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
                  >
                    Book New Consultation
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