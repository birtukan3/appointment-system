"use client";

import { useState, useEffect, useContext, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppContext, getDefaultRouteForRole } from "../providers";
import ProtectedRoute from "../components/ProtectedRoute";
import Navbar from "../components/Navbar";
import api from "../lib/api";
import {
  Calendar, Clock, CheckCircle, XCircle, Users, Activity, Filter, Eye,
  Search, RefreshCw, LogOut, Bell, Star, Phone, Mail, User,
  CalendarCheck, AlertCircle, BarChart3, PieChart, Download,
  ChevronRight, ChevronLeft, FileText, Briefcase, UserCircle,
  FilterX, Award, TrendingUp, CalendarDays, Trophy, X, MessageSquare,
  Loader, Shield, Zap, Heart, Smile, Gift, Coffee, Sun, Moon,
  ArrowUp, ArrowDown, Menu, Grid3x3, List, Settings, HelpCircle,
  DollarSign, Percent, ThumbsUp, BookOpen, Video, Headphones
} from "lucide-react";
import toast from "react-hot-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RPieChart, Pie, Cell, Legend,
  LineChart, Line, AreaChart, Area, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ComposedChart
} from "recharts";
import { format, formatDistance, subDays, subWeeks, subMonths,
  isToday, isTomorrow, isThisWeek, isThisMonth, parseISO, differenceInDays,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

function StaffDashboardContent() {
  const router = useRouter();
  const { user, logout, isAuthenticated, loading: authLoading } = useContext(AppContext);

  // ============ STATE MANAGEMENT ============
  const [appointments, setAppointments] = useState([]);
  const [staffProfile, setStaffProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // UI State
  const [viewMode, setViewMode] = useState("grid");
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [detailsAppointment, setDetailsAppointment] = useState(null);
  const [comment, setComment] = useState("");
  
  // Filter State
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
    dateRange: "all",
    priority: "all",
    sortBy: "date-desc"
  });
  
  // Pagination State
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 9,
    total: 0,
    totalPages: 0
  });
  
  // Date Range Custom
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  
  // Stats
  const [stats, setStats] = useState({
    total: 0, pending: 0, approved: 0, rejected: 0, expired: 0,
    today: 0, thisWeek: 0, thisMonth: 0,
    urgent: 0, high: 0, normal: 0,
    completionRate: 0, avgResponseTime: 0, uniqueClients: 0,
    satisfactionRate: 98, revenue: 0
  });
  
  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Chart State
  const [selectedChart, setSelectedChart] = useState("bar");
  const [analyticsPeriod, setAnalyticsPeriod] = useState("week");
  
  // Refs
  const initializedRef = useRef(false);
  const pollIntervalRef = useRef(null);
  const toastShownRef = useRef({});
  const notificationsRef = useRef([]);
  
  // Constants
  const ITEMS_PER_PAGE = 9;
  const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];
  
  // Priority Colors
  const priorityColors = {
    Urgent: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200", icon: Zap },
    High: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200", icon: TrendingUp },
    Normal: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200", icon: Clock }
  };
  
  // Status Colors
  const statusColors = {
    Approved: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", icon: CheckCircle },
    Rejected: { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200", icon: XCircle },
    Pending: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200", icon: Clock },
    Expired: { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200", icon: Calendar }
  };

  // ============ HELPER FUNCTIONS ============
  const showUniqueToast = (message, type = "success", id = null) => {
    const toastId = id || `${message}-${Date.now()}`;
    if (toastShownRef.current[toastId]) return;
    toastShownRef.current[toastId] = true;
    
    if (type === "success") toast.success(message, { id: toastId });
    else if (type === "error") toast.error(message, { id: toastId });
    else toast(message, { id: toastId });
    
    setTimeout(() => delete toastShownRef.current[toastId], 3000);
  };

  const addNotification = useCallback((type, message, appointmentId = null) => {
    const uniqueKey = `${type}-${appointmentId}-${message}`;
    if (notificationsRef.current.some(n => n.type === type && !n.read && n.message === message)) return;
    if (toastShownRef.current[uniqueKey]) return;
    
    const newNotification = {
      id: Date.now() + Math.random(),
      type, appointmentId, message,
      time: new Date().toISOString(),
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 100));
    setUnreadCount(prev => prev + 1);
    notificationsRef.current = [newNotification, ...notificationsRef.current].slice(0, 100);
    
    toastShownRef.current[uniqueKey] = true;
    setTimeout(() => delete toastShownRef.current[uniqueKey], 10000);
    
    if (type === "urgent" || type === "new") {
      const icon = type === "urgent" ? "🚨" : "📅";
      toast(message, { icon, duration: 5000 });
    }
  }, []);

  // ============ API CALLS ============
  const fetchStaffProfile = useCallback(async () => {
    try {
      const response = await api.get("/users/profile");
      setStaffProfile(response.data);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    }
  }, []);

  const fetchAppointments = useCallback(async (silent = false) => {
    if (!silent && refreshing) return;
    
    try {
      if (!silent) setRefreshing(true);
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        status: filters.status !== "all" ? filters.status : undefined,
        search: filters.search || undefined,
        dateRange: filters.dateRange !== "all" ? filters.dateRange : undefined,
        priority: filters.priority !== "all" ? filters.priority : undefined,
        sortBy: filters.sortBy,
        ...(customStartDate && customEndDate && filters.dateRange === "custom" && {
          startDate: customStartDate,
          endDate: customEndDate
        })
      };
      
      const response = await api.get("/users/staff", { params });
      const data = response.data || [];
      const meta = response.meta || { total: 0, totalPages: 0 };
      
      setAppointments(data);
      setPagination(prev => ({
        ...prev,
        total: meta.total || data.length,
        totalPages: meta.totalPages || Math.ceil((meta.total || data.length) / prev.limit)
      }));
      
      // Calculate stats from fetched data
      calculateStats(data);
      
      // Notify about new pending appointments
      if (!silent && appointments.length > 0) {
        const newPending = data.filter(a => 
          a.status === "Pending" && !appointments.some(prev => prev.id === a.id)
        );
        newPending.forEach(app => {
          addNotification("new", `New: ${app.serviceName} from ${app.userName || app.userEmail}`, app.id);
        });
      }
      
    } catch (error) {
      console.error("Fetch error:", error);
      if (!silent) showUniqueToast("Failed to fetch appointments", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.page, pagination.limit, filters, customStartDate, customEndDate, appointments.length, addNotification]);

  const calculateStats = useCallback((data) => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);
    
    const pending = data.filter(a => a.status === "Pending").length;
    const approved = data.filter(a => a.status === "Approved").length;
    const rejected = data.filter(a => a.status === "Rejected").length;
    const expired = data.filter(a => a.status === "Expired").length;
    const uniqueClients = new Set(data.map(a => a.userId)).size;
    
    // Calculate average response time (for processed appointments)
    const processed = data.filter(a => a.status !== "Pending" && a.createdAt && a.updatedAt);
    const avgResponseTime = processed.length
      ? Math.round(processed.reduce((sum, a) => {
          const created = new Date(a.createdAt);
          const updated = new Date(a.updatedAt);
          return sum + Math.max(0, (updated - created) / 60000);
        }, 0) / processed.length)
      : 0;
    
    setStats({
      total: data.length,
      pending,
      approved,
      rejected,
      expired,
      today: data.filter(a => a.datetime?.startsWith(today)).length,
      thisWeek: data.filter(a => new Date(a.datetime) >= weekStart).length,
      thisMonth: data.filter(a => new Date(a.datetime) >= monthStart).length,
      urgent: data.filter(a => a.priority === "Urgent").length,
      high: data.filter(a => a.priority === "High").length,
      normal: data.filter(a => !a.priority || a.priority === "Normal").length,
      completionRate: data.length ? Math.round(((approved + expired) / data.length) * 100) : 0,
      avgResponseTime,
      uniqueClients,
      satisfactionRate: 98,
      revenue: 0
    });
  }, []);

  const updateAppointmentStatus = useCallback(async (id, status, commentText = "") => {
    if (actionLoading) return;
    
    setActionLoading(true);
    try {
      const payload = { status };
      if (commentText) payload.comment = commentText;
      
      await api.patch(`/appointments/${id}`, payload);
      showUniqueToast(`Appointment ${status.toLowerCase()} successfully`, "success");
      addNotification(status.toLowerCase(), `Appointment #${id.slice(-6)} was ${status.toLowerCase()}`, id);
      
      setComment("");
      setSelectedAppointment(null);
      setShowRejectModal(false);
      setShowApproveModal(false);
      setShowDetailsModal(false);
      
      await fetchAppointments();
    } catch (error) {
      showUniqueToast(error.response?.data?.message || `Failed to ${status.toLowerCase()} appointment`, "error");
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, fetchAppointments, addNotification]);

  const checkAndMarkExpired = useCallback(async () => {
    const now = new Date();
    const expiredApps = appointments.filter(app => 
      app.status === "Approved" && new Date(app.datetime) < now
    );
    
    for (const app of expiredApps) {
      try {
        await api.patch(`/appointments/${app.id}`, { status: "Expired" });
        addNotification("expired", `Appointment #${app.id.slice(-6)} has expired`, app.id);
      } catch (err) {
        console.error("Failed to mark expired:", err);
      }
    }
    
    if (expiredApps.length) await fetchAppointments(true);
  }, [appointments, fetchAppointments, addNotification]);

  // ============ EVENT HANDLERS ============
  const handleRefresh = useCallback(async () => {
    await fetchAppointments();
    showUniqueToast("Dashboard refreshed", "success");
  }, [fetchAppointments]);

  const handleLogout = useCallback(() => {
    logout();
    router.push("/");
  }, [logout, router]);

  const handleViewDetails = useCallback((app) => {
    setDetailsAppointment(app);
    setShowDetailsModal(true);
  }, []);

  const handleApprove = useCallback((app) => {
    setSelectedAppointment(app);
    setComment("");
    setShowApproveModal(true);
  }, []);

  const handleReject = useCallback((app) => {
    setSelectedAppointment(app);
    setComment("");
    setShowRejectModal(true);
  }, []);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      status: "all",
      search: "",
      dateRange: "all",
      priority: "all",
      sortBy: "date-desc"
    });
    setCustomStartDate("");
    setCustomEndDate("");
    setPagination(prev => ({ ...prev, page: 1 }));
    showUniqueToast("Filters cleared", "success");
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const markNotificationAsRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    notificationsRef.current = notificationsRef.current.map(n => n.id === id ? { ...n, read: true } : n);
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    notificationsRef.current = [];
    showUniqueToast("All notifications cleared", "success");
  }, []);

  const exportToCSV = useCallback(async () => {
    setExporting(true);
    try {
      const response = await api.get("/users/staff/export", { params: filters });
      const csvData = response.data;
      
      const blob = new Blob(["\uFEFF" + csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `appointments-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      showUniqueToast(`Exported ${appointments.length} appointments`, "success");
    } catch (error) {
      showUniqueToast("Export failed", "error");
    } finally {
      setExporting(false);
    }
  }, [filters, appointments.length]);

  // ============ CHART DATA ============
  const getDailyData = useCallback(() => {
    const days = analyticsPeriod === "week" ? 7 : analyticsPeriod === "month" ? 30 : 90;
    return [...Array(days)].map((_, i) => {
      const date = subDays(new Date(), days - 1 - i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayApps = appointments.filter(a => a.datetime?.startsWith(dateStr));
      return {
        date: format(date, "EEE, MMM d"),
        total: dayApps.length,
        approved: dayApps.filter(a => a.status === "Approved").length,
        pending: dayApps.filter(a => a.status === "Pending").length,
        rejected: dayApps.filter(a => a.status === "Rejected").length
      };
    });
  }, [appointments, analyticsPeriod]);

  const getWeeklyData = useCallback(() => {
    return [...Array(4)].map((_, i) => {
      const weekStart = subWeeks(new Date(), 3 - i);
      const weekEnd = subWeeks(new Date(), 2 - i);
      const weekApps = appointments.filter(a => {
        const date = new Date(a.datetime);
        return date >= weekStart && date < weekEnd;
      });
      return {
        week: `Week ${4 - i}`,
        total: weekApps.length,
        approved: weekApps.filter(a => a.status === "Approved").length,
        pending: weekApps.filter(a => a.status === "Pending").length
      };
    });
  }, [appointments]);

  const getMonthlyData = useCallback(() => {
    return [...Array(6)].map((_, i) => {
      const date = subMonths(new Date(), 5 - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const monthApps = appointments.filter(a => {
        const appDate = new Date(a.datetime);
        return appDate >= monthStart && appDate <= monthEnd;
      });
      return {
        month: format(date, "MMM"),
        total: monthApps.length,
        approved: monthApps.filter(a => a.status === "Approved").length
      };
    });
  }, [appointments]);

  const getStatusPieData = useCallback(() => [
    { name: "Approved", value: stats.approved, color: "#10b981" },
    { name: "Pending", value: stats.pending, color: "#f59e0b" },
    { name: "Rejected", value: stats.rejected, color: "#ef4444" },
    { name: "Expired", value: stats.expired, color: "#6b7280" }
  ], [stats]);

  const getPriorityPieData = useCallback(() => [
    { name: "Urgent", value: stats.urgent, color: "#ef4444" },
    { name: "High", value: stats.high, color: "#f97316" },
    { name: "Normal", value: stats.normal, color: "#3b82f6" }
  ], [stats]);

  // ============ EFFECTS ============
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "staff") {
      router.replace(getDefaultRouteForRole(user.role));
      return;
    }
    
    if (!initializedRef.current) {
      initializedRef.current = true;
      fetchStaffProfile();
      fetchAppointments();
      
      // Polling for real-time updates
      pollIntervalRef.current = setInterval(() => {
        fetchAppointments(true);
        checkAndMarkExpired();
      }, 30000);
    }
    
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [authLoading, isAuthenticated, user, router, fetchStaffProfile, fetchAppointments, checkAndMarkExpired]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // ============ RENDER HELPERS ============
  const renderPriorityBadge = useCallback((priority) => {
    const config = priorityColors[priority] || priorityColors.Normal;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} border ${config.border}`}>
        <Icon className="h-3 w-3" />
        {priority}
      </span>
    );
  }, []);

  const renderStatusBadge = useCallback((status) => {
    const config = statusColors[status] || statusColors.Pending;
    const Icon = config.icon;
    const isPending = status === "Pending";
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${config.bg} ${config.text} border ${config.border} ${isPending ? "animate-pulse" : ""}`}>
        <Icon className="h-3 w-3" />
        {status}
      </span>
    );
  }, []);

 const renderStatCard = useCallback((title, value, IconComponent, color, onClick = null) => {
    const Icon = icon;
    const colorClasses = {
      blue: "from-blue-500 to-blue-600",
      amber: "from-amber-500 to-amber-600",
      emerald: "from-emerald-500 to-emerald-600",
      purple: "from-purple-500 to-purple-600",
      orange: "from-orange-500 to-orange-600",
      teal: "from-teal-500 to-teal-600",
      indigo: "from-indigo-500 to-indigo-600",
      pink: "from-pink-500 to-pink-600",
      gray: "from-gray-500 to-gray-600"
    };
    
    return (
      <div 
        onClick={onClick}
        className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer group`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-xs uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className="bg-white/20 p-2 rounded-full group-hover:rotate-12 transition-transform">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
    );
  }, []);

  // Loading State
  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/20 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* ============ HEADER SECTION ============ */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Staff Dashboard
                  </h1>
                  <p className="text-gray-500 mt-1">
                    {format(new Date(), "EEEE, MMMM d, yyyy")} • {format(new Date(), "h:mm a")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">{user?.name}</span>
                </div>
                {staffProfile?.department && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Briefcase className="h-4 w-4" />
                    <span className="text-sm">{staffProfile.department}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              
              <button
                onClick={exportToCSV}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              
              <button
                onClick={() => setShowStatsModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
              </button>
              
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                >
                  <Bell className="h-5 w-5 text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse shadow-md">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-fadeIn">
                    <div className="p-3 border-b bg-gradient-to-r from-indigo-50 to-purple-50 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-indigo-600" />
                        <h3 className="font-semibold text-gray-800">Notifications</h3>
                      </div>
                      <button onClick={clearAllNotifications} className="text-xs text-indigo-600 hover:text-indigo-700">
                        Clear all
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <Bell className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No notifications</p>
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            className={`p-3 border-b cursor-pointer transition hover:bg-gray-50 ${
                              !n.read ? "bg-indigo-50/50 border-l-4 border-l-indigo-500" : ""
                            }`}
                            onClick={() => markNotificationAsRead(n.id)}
                          >
                            <div className="flex gap-2">
                              <div className="flex-shrink-0">
                                {n.type === "new" && <CalendarCheck className="h-4 w-4 text-blue-500" />}
                                {n.type === "urgent" && <AlertCircle className="h-4 w-4 text-red-500" />}
                                {n.type === "approved" && <CheckCircle className="h-4 w-4 text-green-500" />}
                                {n.type === "rejected" && <XCircle className="h-4 w-4 text-red-500" />}
                                {n.type === "expired" && <Clock className="h-4 w-4 text-gray-500" />}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-800">{n.message}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {formatDistance(parseISO(n.time), new Date(), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleLogout}
                className="p-2 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-all"
              >
                <LogOut className="h-5 w-5 text-red-600" />
              </button>
            </div>
          </div>

          {/* ============ STATS CARDS ============ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {renderStatCard("Total", stats.total, Calendar, "blue", () => handleFilterChange("status", "all"))}
            {renderStatCard("Pending", stats.pending, Clock, "amber", () => handleFilterChange("status", "pending"))}
            {renderStatCard("Approved", stats.approved, CheckCircle, "emerald", () => handleFilterChange("status", "approved"))}
            {renderStatCard("Today", stats.today, Sun, "purple", () => handleFilterChange("dateRange", "today"))}
            {renderStatCard("Urgent", stats.urgent, Zap, "orange")}
            {renderStatCard("Rate", `${stats.completionRate}%`, Award, "teal")}
          </div>

          {/* ============ FILTERS SECTION ============ */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-6 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-indigo-600" />
                <h2 className="font-semibold text-gray-800">Filters & Search</h2>
                {(filters.status !== "all" || filters.search || filters.dateRange !== "all" || filters.priority !== "all") && (
                  <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                    Active filters
                  </span>
                )}
              </div>
              <button onClick={() => setShowFilters(!showFilters)} className="text-indigo-600 hover:text-indigo-700 text-sm flex items-center gap-1">
                {showFilters ? "Hide" : "Show"} Filters
                <ChevronRight className={`h-4 w-4 transition-transform ${showFilters ? "rotate-90" : ""}`} />
              </button>
            </div>
            
            {showFilters && (
              <div className="p-4 space-y-4 animate-fadeIn">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by service, client, email, or booking code..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange("search", e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                  />
                </div>
                
                {/* Filter Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange("status", e.target.value)}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                  >
                    <option value="all">📋 All Status</option>
                    <option value="pending">⏳ Pending</option>
                    <option value="approved">✅ Approved</option>
                    <option value="rejected">❌ Rejected</option>
                    <option value="expired">📅 Expired</option>
                  </select>
                  
                  <select
                    value={filters.priority}
                    onChange={(e) => handleFilterChange("priority", e.target.value)}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                  >
                    <option value="all">🎯 All Priority</option>
                    <option value="Urgent">🚨 Urgent</option>
                    <option value="High">🔥 High</option>
                    <option value="Normal">✓ Normal</option>
                  </select>
                  
                  <select
                    value={filters.dateRange}
                    onChange={(e) => handleFilterChange("dateRange", e.target.value)}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                  >
                    <option value="all">📅 All Time</option>
                    <option value="today">🔴 Today</option>
                    <option value="tomorrow">⭐ Tomorrow</option>
                    <option value="week">📆 This Week</option>
                    <option value="month">📅 This Month</option>
                    <option value="custom">📋 Custom Range</option>
                  </select>
                  
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                  >
                    <option value="date-desc">🕐 Newest First</option>
                    <option value="date-asc">🕐 Oldest First</option>
                    <option value="priority">⭐ Priority</option>
                    <option value="status">📊 Status</option>
                  </select>
                </div>
                
                {/* Custom Date Range */}
                {filters.dateRange === "custom" && (
                  <div className="flex gap-3 animate-fadeIn">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                      placeholder="Start Date"
                    />
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                      placeholder="End Date"
                    />
                  </div>
                )}
                
                {/* Filter Actions */}
                <div className="flex justify-between items-center pt-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        viewMode === "grid"
                          ? "bg-indigo-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <Grid3x3 className="h-4 w-4" /> Grid
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        viewMode === "list"
                          ? "bg-indigo-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <List className="h-4 w-4" /> List
                    </button>
                  </div>
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-indigo-600 transition-all"
                  >
                    <FilterX className="h-4 w-4" /> Clear All
                  </button>
                </div>
              </div>
            )}
            
            {/* Search Results Count */}
            {filters.search && (
              <div className="px-4 py-2 bg-indigo-50 border-t border-indigo-100 text-sm text-indigo-700 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Found {pagination.total} appointment{pagination.total !== 1 ? "s" : ""} matching "{filters.search}"
              </div>
            )}
          </div>

          {/* ============ APPOINTMENTS DISPLAY ============ */}
          {appointments.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-lg">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No appointments found</h3>
              <p className="text-gray-500 mb-6">Try adjusting your filters or wait for new bookings</p>
              <button onClick={clearAllFilters} className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all">
                Clear Filters
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {appointments.map((app, index) => {
                  const daysUntil = app.datetime ? differenceInDays(parseISO(app.datetime), new Date()) : null;
                  const isUrgent = app.priority === "Urgent";
                  
                  return (
                    <div
                      key={app.id}
                      className={`bg-white rounded-2xl shadow-lg border overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group animate-fadeInUp ${
                        isUrgent ? "border-l-4 border-l-red-500" : "border-gray-100"
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => handleViewDetails(app)}
                    >
                      {/* Priority Bar */}
                      {isUrgent && (
                        <div className="bg-red-500 h-1 animate-pulse" />
                      )}
                      
                      <div className="p-5">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-800 text-lg group-hover:text-indigo-600 transition line-clamp-1">
                              {app.serviceName}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <User className="h-3.5 w-3.5 text-gray-400" />
                              <p className="text-xs text-gray-500">{app.userName || app.userEmail}</p>
                            </div>
                          </div>
                          {renderPriorityBadge(app.priority)}
                        </div>
                        
                        {/* Date & Time */}
                        <div className="bg-gray-50 rounded-xl p-3 mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-indigo-500" />
                            <span className="text-sm font-medium text-gray-700">
                              {format(parseISO(app.datetime), "EEEE, MMM d, yyyy")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-4 w-4 text-indigo-500" />
                            <span className="text-sm text-gray-600">
                              {format(parseISO(app.datetime), "h:mm a")}
                            </span>
                            {daysUntil !== null && daysUntil >= 0 && daysUntil <= 7 && app.status === "Approved" && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                daysUntil === 0 ? "bg-blue-100 text-blue-700 animate-pulse" : "bg-green-100 text-green-700"
                              }`}>
                                {daysUntil === 0 ? "Today!" : `${daysUntil} days left`}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Booking Code */}
                        {app.bookingCode && (
                          <div className="mb-2">
                            <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                              #{app.bookingCode}
                            </span>
                          </div>
                        )}
                        
                        {/* Client Notes Preview */}
                        {app.notes && (
                          <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                            <p className="text-xs text-amber-600 font-medium">Client Note:</p>
                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 italic">"{app.notes}"</p>
                          </div>
                        )}
                        
                        {/* Actions */}
                        <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
                          {renderStatusBadge(app.status)}
                          <div className="flex gap-2">
                            {app.status === "Pending" && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleApprove(app); }}
                                  className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"
                                  title="Approve"
                                >
                                  <CheckCircle className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleReject(app); }}
                                  className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Reject"
                                >
                                  <XCircle className="h-5 w-5" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleViewDetails(app); }}
                              className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all"
                              title="View Details"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ============ PAGINATION ============ */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="p-2 rounded-xl border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  <div className="flex gap-1">
                    {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
                            pagination.page === pageNum
                              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                              : "border border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="p-2 rounded-xl border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
              
              {/* Results Info */}
              <div className="text-center mt-4 text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} appointments
              </div>
            </>
          ) : (
            // ============ LIST VIEW ============
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Service</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Client</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date & Time</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Priority</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {appointments.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => handleViewDetails(app)}>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-800">{app.serviceName}</div>
                          {app.bookingCode && (
                            <div className="text-xs font-mono text-indigo-600 mt-0.5">#{app.bookingCode}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-800">{app.userName || app.userEmail}</div>
                          <div className="text-xs text-gray-500">{app.userEmail}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {format(parseISO(app.datetime), "MMM d, yyyy")}
                          <div className="text-xs text-gray-400">{format(parseISO(app.datetime), "h:mm a")}</div>
                        </td>
                        <td className="px-6 py-4">{renderPriorityBadge(app.priority)}</td>
                        <td className="px-6 py-4">{renderStatusBadge(app.status)}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {app.status === "Pending" && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleApprove(app); }}
                                  className="text-emerald-600 hover:text-emerald-700 transition"
                                  title="Approve"
                                >
                                  <CheckCircle className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleReject(app); }}
                                  className="text-rose-600 hover:text-rose-700 transition"
                                  title="Reject"
                                >
                                  <XCircle className="h-5 w-5" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleViewDetails(app); }}
                              className="text-indigo-600 hover:text-indigo-700 transition"
                              title="View Details"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination for List View */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 flex justify-center items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="p-2 rounded-xl border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="p-2 rounded-xl border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============ MODALS ============ */}
        {/* Details Modal */}
        {showDetailsModal && detailsAppointment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white border-b border-gray-100 p-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Appointment Details</h2>
                      <p className="text-xs text-gray-500">ID: {detailsAppointment.id}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs text-gray-500">Service</p>
                    <p className="font-semibold text-gray-800 mt-1">{detailsAppointment.serviceName}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs text-gray-500">Provider</p>
                    <p className="font-semibold text-gray-800 mt-1">{detailsAppointment.providerName}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs text-gray-500">Client</p>
                    <p className="font-semibold text-gray-800 mt-1">{detailsAppointment.userName || detailsAppointment.userEmail}</p>
                    <p className="text-xs text-gray-500">{detailsAppointment.userEmail}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs text-gray-500">Date & Time</p>
                    <p className="font-semibold text-gray-800 mt-1">{format(parseISO(detailsAppointment.datetime), 'EEEE, MMMM d, yyyy')}</p>
                    <p className="text-sm text-indigo-600">{format(parseISO(detailsAppointment.datetime), 'h:mm a')}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs text-gray-500">Booking Code</p>
                    <p className="font-mono font-semibold text-indigo-600 mt-1">{detailsAppointment.bookingCode || "N/A"}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs text-gray-500">Priority</p>
                    <div className="mt-1">{renderPriorityBadge(detailsAppointment.priority)}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs text-gray-500">Status</p>
                    <div className="mt-1">{renderStatusBadge(detailsAppointment.status)}</div>
                  </div>
                </div>

                {detailsAppointment.notes && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-indigo-500" /> Client Notes
                    </p>
                    <p className="text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100">{detailsAppointment.notes}</p>
                  </div>
                )}

                {detailsAppointment.comment && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-indigo-500" /> Staff Comment
                    </p>
                    <p className={`p-4 rounded-xl border ${
                      detailsAppointment.status === "Approved" 
                        ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                        : "bg-rose-50 border-rose-100 text-rose-700"
                    }`}>
                      {detailsAppointment.comment}
                    </p>
                  </div>
                )}

                {detailsAppointment.status === "Pending" && (
                  <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => { handleApprove(detailsAppointment); setShowDetailsModal(false); }}
                      className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-all"
                    >
                      Approve Appointment
                    </button>
                    <button
                      onClick={() => { handleReject(detailsAppointment); setShowDetailsModal(false); }}
                      className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl font-semibold hover:bg-rose-700 transition-all"
                    >
                      Reject Appointment
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Approve Modal */}
        {showApproveModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Approve Appointment</h3>
                <p className="text-gray-500 text-sm mt-1">Confirm approval for this appointment</p>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium text-gray-800">{selectedAppointment.serviceName}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Client:</span>
                  <span className="font-medium text-gray-800">{selectedAppointment.userName || selectedAppointment.userEmail}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Optional Comment (will be sent to client)</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  placeholder="Add a note for the client (optional)..."
                />
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => updateAppointmentStatus(selectedAppointment.id, "Approved", comment)}
                  disabled={actionLoading}
                  className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {actionLoading ? <Loader className="h-5 w-5 animate-spin mx-auto" /> : "Confirm Approval"}
                </button>
                <button
                  onClick={() => { setSelectedAppointment(null); setComment(""); setShowApproveModal(false); }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <XCircle className="h-8 w-8 text-rose-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Reject Appointment</h3>
                <p className="text-gray-500 text-sm mt-1">Please provide a reason for rejection</p>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium text-gray-800">{selectedAppointment.serviceName}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Client:</span>
                  <span className="font-medium text-gray-800">{selectedAppointment.userName || selectedAppointment.userEmail}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Rejection <span className="text-red-500">*</span></label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 resize-none"
                  placeholder="Please provide a detailed reason for rejection..."
                  autoFocus
                />
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => updateAppointmentStatus(selectedAppointment.id, "Rejected", comment)}
                  disabled={!comment.trim() || actionLoading}
                  className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl font-semibold hover:bg-rose-700 transition-all disabled:opacity-50"
                >
                  {actionLoading ? <Loader className="h-5 w-5 animate-spin mx-auto" /> : "Confirm Rejection"}
                </button>
                <button
                  onClick={() => { setSelectedAppointment(null); setComment(""); setShowRejectModal(false); }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Modal */}
        {showStatsModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-100 p-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
                      <BarChart3 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Analytics Dashboard</h2>
                      <p className="text-xs text-gray-500">Performance metrics and insights</p>
                    </div>
                  </div>
                  <button onClick={() => setShowStatsModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {/* Chart Type Selector */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <button
                    onClick={() => setAnalyticsPeriod("week")}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                      analyticsPeriod === "week" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Last 7 Days
                  </button>
                  <button
                    onClick={() => setAnalyticsPeriod("month")}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                      analyticsPeriod === "month" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Last 30 Days
                  </button>
                  <button
                    onClick={() => setAnalyticsPeriod("quarter")}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                      analyticsPeriod === "quarter" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Last 90 Days
                  </button>
                  
                  <div className="flex-1"></div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedChart("bar")}
                      className={`p-2 rounded-lg transition ${
                        selectedChart === "bar" ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setSelectedChart("line")}
                      className={`p-2 rounded-lg transition ${
                        selectedChart === "line" ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <TrendingUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setSelectedChart("area")}
                      className={`p-2 rounded-lg transition ${
                        selectedChart === "area" ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <Activity className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Daily Chart */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-indigo-500" /> Daily Appointments
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        {selectedChart === "bar" ? (
                          <BarChart data={getDailyData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                            <YAxis stroke="#6b7280" fontSize={12} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="total" fill="#3b82f6" name="Total" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="approved" fill="#10b981" name="Approved" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        ) : selectedChart === "line" ? (
                          <LineChart data={getDailyData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                            <YAxis stroke="#6b7280" fontSize={12} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total" strokeWidth={2} />
                            <Line type="monotone" dataKey="approved" stroke="#10b981" name="Approved" strokeWidth={2} />
                          </LineChart>
                        ) : (
                          <AreaChart data={getDailyData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                            <YAxis stroke="#6b7280" fontSize={12} />
                            <Tooltip />
                            <Legend />
                            <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Total" />
                            <Area type="monotone" dataKey="approved" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Approved" />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Weekly Chart */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-purple-500" /> Weekly Trends
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getWeeklyData()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="week" stroke="#6b7280" fontSize={12} />
                          <YAxis stroke="#6b7280" fontSize={12} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="total" fill="#8b5cf6" name="Total" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="approved" fill="#10b981" name="Approved" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Monthly Chart */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-amber-500" /> Monthly Performance
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getMonthlyData()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                          <YAxis stroke="#6b7280" fontSize={12} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="total" stroke="#ef4444" name="Total" strokeWidth={2} />
                          <Line type="monotone" dataKey="approved" stroke="#10b981" name="Approved" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Status Pie Chart */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <PieChart className="h-4 w-4 text-rose-500" /> Status Distribution
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RPieChart>
                          <Pie
                            data={getStatusPieData()}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {getStatusPieData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </RPieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Priority Pie Chart */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 col-span-2">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" /> Priority Distribution
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RPieChart>
                          <Pie
                            data={getPriorityPieData()}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {getPriorityPieData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </RPieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.3s ease-out forwards;
          opacity: 0;
        }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  );
}

// Main export with ProtectedRoute wrapper
export default function StaffDashboard() {
  return (
    <ProtectedRoute allowedRoles={['staff']}>
      <StaffDashboardContent />
    </ProtectedRoute>
  );
}
