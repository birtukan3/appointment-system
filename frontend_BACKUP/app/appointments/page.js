"use client";

import { useState, useEffect, useContext, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppContext } from "../providers";
import Navbar from "../components/Navbar";
import api from "../lib/api";
import { showSuccess, showError, showInfo } from "../lib/toastUtils";
import { 
  Calendar, Clock, CheckCircle, XCircle, Search, 
  Loader, AlertCircle, Bell, MessageSquare, Sparkles, 
  TrendingUp, Users, Star, ChevronRight, Filter, X, Eye, Shield, 
  Zap, Award, Rocket, RefreshCw, FilterX, Edit, Trash2, 
  FileText, Upload, Paperclip, Image, CalendarCheck, ThumbsUp, 
  Clock8, Save, ChevronDown, ChevronUp, Share2, MessageCircle,
  Send, Smile, Frown, Meh, Heart, ThumbsDown, UserCheck,
  Briefcase, Tag, CreditCard, MapPin, Phone, Mail as MailIcon,
  Check, AlertTriangle, Info, Volume2, VolumeX, BellRing,
  History, Repeat, Download, Printer, ExternalLink, 
  Gift, Coffee, Music, BookOpen, Video, Mic, Headphones
} from "lucide-react";
import { format, formatDistance, parseISO, isToday, isPast, differenceInDays, isFuture } from "date-fns";

export default function AppointmentsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useContext(AppContext);
  
  // State Management
  const [appointments, setAppointments] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0, page: 1, limit: 6 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  
  // UI States
  const [stats, setStats] = useState({ total: 0, upcoming: 0, pending: 0, approved: 0, rejected: 0, expired: 0 });
  const [viewMode, setViewMode] = useState("grid");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditNotesModal, setShowEditNotesModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRebookModal, setShowRebookModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [appointmentActivities, setAppointmentActivities] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [expandedComment, setExpandedComment] = useState(null);
  const [feedback, setFeedback] = useState({ rating: 5, comment: "" });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [showFilePreview, setShowFilePreview] = useState(null);
  const [selectedNotificationTab, setSelectedNotificationTab] = useState("all");
  
  const ITEMS_PER_PAGE = 6;

  // Toast deduplication
  const lastToastRef = useRef({ message: '', time: 0 });
  const showDeduplicatedToast = (message, type = 'success') => {
    const now = Date.now();
    if (lastToastRef.current.message === message && now - lastToastRef.current.time < 3000) return;
    lastToastRef.current = { message, time: now };
    if (type === 'success') showSuccess(message);
    else if (type === 'error') showError(message);
    else showInfo(message);
  };

  // Set greeting with emoji
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("🌅 Good Morning");
    else if (hour < 18) setGreeting("☀️ Good Afternoon");
    else setGreeting("🌙 Good Evening");
  }, []);

  // Authentication check
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (user?.role !== "user") {
      router.push(user?.role === "admin" ? "/admin" : "/staff");
      return;
    }
    fetchAllData();
    fetchUploadedFiles();
    fetchNotifications();
  }, [authLoading, isAuthenticated, user, router]);

  // Fetch data when filters change
  useEffect(() => {
    if (isAuthenticated && user?.role === 'user') {
      fetchAppointments();
      fetchStats();
    }
  }, [currentPage, statusFilter, searchTerm, dateRange, sortBy]);

  const fetchAppointments = async () => {
    try {
      setRefreshing(true);
      const params = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        status: statusFilter,
        search: searchTerm,
        dateRange: dateRange,
        sort: sortBy
      };
      
      const response = await api.getMyAppointments(params);
      const apps = response.data || [];
      setAppointments(apps);
      setMeta(response.meta || { total: 0, totalPages: 0, page: 1, limit: ITEMS_PER_PAGE });
      
      // Fetch activities for each appointment
      for (const app of apps) {
        fetchAppointmentActivities(app.id);
      }
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
      showError("Failed to load appointments");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAppointmentActivities = async (appointmentId) => {
    try {
      const response = await api.get(`/appointments/${appointmentId}/activities`);
      setAppointmentActivities(prev => ({
        ...prev,
        [appointmentId]: response.data || []
      }));
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const statsRes = await api.getAppointmentStats();
      const allApps = await api.getMyAppointments({ limit: 1000 });
      const data = allApps.data || [];
      
      const expired = data.filter(a => a.status === "Expired").length;
      setStats({
        total: statsRes.total || 0,
        pending: statsRes.pending || 0,
        approved: statsRes.approved || 0,
        rejected: statsRes.rejected || 0,
        expired: expired,
        upcoming: data.filter(a => a.status === "Approved" && new Date(a.datetime) > new Date()).length
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const fetchAllData = async () => {
    await Promise.all([fetchAppointments(), fetchStats(), fetchUploadedFiles(), fetchNotifications()]);
  };

  const fetchUploadedFiles = async () => {
    try {
      const response = await api.getUserFiles();
      if (Array.isArray(response.data)) {
        setUploadedFiles(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch files:", error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.getNotifications();
      setNotifications(response.data || []);
      setUnreadCount((response.data || []).filter(n => !n.read).length);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const handleFileUpload = async (event, appointmentId) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      showError("Only images and PDF files are allowed");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      showError("File size must be less than 5MB");
      return;
    }
    
    setUploading(true);
    try {
      await api.uploadFile(file, appointmentId);
      showSuccess("Document uploaded successfully!");
      fetchUploadedFiles();
    } catch (error) {
      showError("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId) => {
    try {
      await api.deleteFile(fileId);
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
      showSuccess("File deleted successfully");
    } catch (error) {
      showError("Failed to delete file");
    }
  };

  const saveNotes = async () => {
    if (!selectedAppointment) return;
    
    setSavingNotes(true);
    try {
      await api.patch(`/appointments/${selectedAppointment.id}`, { notes: editNotes });
      showSuccess("Notes updated successfully!");
      setShowEditNotesModal(false);
      setSelectedAppointment(null);
      await fetchAppointments();
    } catch (error) {
      showError("Failed to update notes");
    } finally {
      setSavingNotes(false);
    }
  };

  const submitFeedback = async () => {
    if (!selectedAppointment) return;
    
    setSubmittingFeedback(true);
    try {
      await api.post(`/appointments/${selectedAppointment.id}/feedback`, {
        rating: feedback.rating,
        comment: feedback.comment
      });
      showSuccess("Thank you for your feedback!");
      setShowFeedbackModal(false);
      setFeedback({ rating: 5, comment: "" });
      setSelectedAppointment(null);
    } catch (error) {
      showError("Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;
    
    try {
      await api.cancelAppointment(selectedAppointment.id);
      showSuccess("Appointment cancelled successfully");
      setShowCancelModal(false);
      setSelectedAppointment(null);
      fetchAppointments();
      fetchStats();
    } catch (error) {
      showError("Failed to cancel appointment");
    }
  };

  const handleRebook = async () => {
    if (!selectedAppointment) return;
    
    try {
      await api.cancelAppointment(selectedAppointment.id);
      showSuccess("Appointment cancelled. You can now book a new one.");
      setShowRebookModal(false);
      setSelectedAppointment(null);
      router.push("/book");
    } catch (error) {
      showError("Failed to cancel appointment");
    }
  };

  const handleRefresh = () => {
    fetchAllData();
    showDeduplicatedToast("Dashboard refreshed", "success");
  };

  const shareAppointment = async (appointment) => {
    try {
      const shareData = {
        title: `Appointment: ${appointment.serviceName}`,
        text: `I have an appointment for ${appointment.serviceName} on ${format(parseISO(appointment.datetime), 'MMM d, h:mm a')}`,
        url: `${window.location.origin}/appointments/${appointment.id}`
      };
      
      if (navigator.share) {
        await navigator.share(shareData);
        showSuccess("Shared successfully!");
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        showSuccess("Link copied to clipboard!");
      }
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const markNotificationAsRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      showSuccess("All notifications marked as read");
    } catch (error) {
      showError("Failed to mark notifications as read");
    }
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setSearchTerm("");
    setDateRange("all");
    setSortBy("date-desc");
    setCurrentPage(1);
    showSuccess("Filters cleared");
  };

  const getAppointmentFiles = (appointmentId) => {
    return uploadedFiles.filter(f => f.appointmentId === appointmentId);
  };

  const getStatusBadge = (status, datetime) => {
    const isPastAppointment = datetime ? isPast(parseISO(datetime)) : false;
    
    if (status === "Expired") {
      return { icon: <Clock8 className="h-3 w-3" />, text: "Expired", color: "bg-gray-100 text-gray-600" };
    }
    if (status === "Approved" && isPastAppointment) {
      return { icon: <CheckCircle className="h-3 w-3" />, text: "Completed", color: "bg-green-100 text-green-700" };
    }
    if (status === "Approved" && datetime && isToday(parseISO(datetime))) {
      return { icon: <Calendar className="h-3 w-3" />, text: `Today at ${format(parseISO(datetime), 'h:mm a')}`, color: "bg-blue-100 text-blue-700 animate-pulse" };
    }
    switch (status) {
      case "Approved": 
        return { icon: <CheckCircle className="h-3 w-3" />, text: "Approved", color: "bg-emerald-100 text-emerald-700" };
      case "Rejected": 
        return { icon: <XCircle className="h-3 w-3" />, text: "Rejected", color: "bg-rose-100 text-rose-700" };
      default: 
        return { icon: <Clock className="h-3 w-3" />, text: "Pending", color: "bg-amber-100 text-amber-700 animate-pulse" };
    }
  };

  const formatDate = (date) => date ? format(parseISO(date), 'EEEE, MMMM d, yyyy') : 'N/A';
  const formatTime = (date) => date ? format(parseISO(date), 'h:mm a') : 'N/A';
  const formatShortDate = (date) => date ? format(parseISO(date), 'MMM d, yyyy') : 'N/A';

  const completionRate = stats.total > 0 ? Math.round(((stats.approved + stats.expired) / stats.total) * 100) : 0;

  // Get notification icon based on type
  const getNotificationIcon = (type, status) => {
    if (type === 'staff_message' || status === 'staff_note') {
      return <MessageSquare className="h-5 w-5 text-indigo-500" />;
    }
    if (status === 'approved') {
      return <CheckCircle className="h-5 w-5 text-emerald-500" />;
    }
    if (status === 'rejected') {
      return <XCircle className="h-5 w-5 text-rose-500" />;
    }
    if (status === 'expired') {
      return <Clock8 className="h-5 w-5 text-gray-500" />;
    }
    return <Bell className="h-5 w-5 text-purple-500" />;
  };

  // Filter notifications by tab
  const getFilteredNotifications = () => {
    if (selectedNotificationTab === 'all') return notifications;
    if (selectedNotificationTab === 'staff') {
      return notifications.filter(n => n.type === 'staff_message' || n.staffComment);
    }
    if (selectedNotificationTab === 'status') {
      return notifications.filter(n => n.type === 'status_update');
    }
    return notifications;
  };

  // Get time left message
  const getTimeLeftMessage = (datetime) => {
    if (!datetime) return null;
    const appointmentDate = parseISO(datetime);
    if (isPast(appointmentDate)) return null;
    const daysLeft = differenceInDays(appointmentDate, new Date());
    if (daysLeft === 0) return "⏰ Today!";
    if (daysLeft === 1) return "📅 Tomorrow";
    return `📆 ${daysLeft} days left`;
  };

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
            <Sparkles className="h-8 w-8 text-indigo-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            <p className="text-slate-600 font-medium">Loading your appointments...</p>
          </div>
        </div>
      </>
    );
  }

  // Professional Stats Cards with Icons
  const statsCards = [
    { key: 'total', label: 'Total Appointments', value: stats.total, icon: <Calendar className="h-5 w-5" />, color: 'indigo', onClick: () => { setStatusFilter("all"); setCurrentPage(1); } },
    { key: 'upcoming', label: 'Upcoming', value: stats.upcoming, icon: <CalendarCheck className="h-5 w-5" />, color: 'purple', onClick: () => { setStatusFilter("approved"); setCurrentPage(1); } },
    { key: 'pending', label: 'Pending', value: stats.pending, icon: <Clock className="h-5 w-5" />, color: 'amber', onClick: () => { setStatusFilter("pending"); setCurrentPage(1); } },
    { key: 'approved', label: 'Approved', value: stats.approved, icon: <CheckCircle className="h-5 w-5" />, color: 'emerald', onClick: () => { setStatusFilter("approved"); setCurrentPage(1); } },
    { key: 'rejected', label: 'Rejected', value: stats.rejected, icon: <XCircle className="h-5 w-5" />, color: 'rose', onClick: () => { setStatusFilter("rejected"); setCurrentPage(1); } },
  ];

  const colorClasses = {
    indigo: 'from-indigo-500 to-indigo-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
    emerald: 'from-emerald-500 to-emerald-600',
    rose: 'from-rose-500 to-rose-600',
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/10 to-purple-50/10 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Welcome Header with Animated Greeting */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 mb-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                    <UserCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-indigo-100 text-sm">{greeting} 👋</p>
                    <h1 className="text-2xl md:text-3xl font-bold">
                      {user?.firstName || user?.name?.split(' ')[0] || 'Valued Customer'}
                    </h1>
                  </div>
                </div>
                <p className="text-indigo-100 mt-2 text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-300" />
                  Here's your complete appointment overview and status updates
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push("/book")}
                  className="px-5 py-2.5 bg-white text-indigo-700 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center gap-2 hover:scale-105"
                >
                  <Calendar className="h-4 w-4" /> Book New Appointment
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition"
                >
                  <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Professional Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {statsCards.map((stat) => (
              <button
                key={stat.key}
                onClick={stat.onClick}
                className={`bg-gradient-to-br ${colorClasses[stat.color]} rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-xs uppercase tracking-wide">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className="bg-white/20 p-2 rounded-full group-hover:rotate-12 transition">
                    {stat.icon}
                  </div>
                </div>
              </button>
            ))}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-wide">Success Rate</p>
                  <p className="text-2xl font-bold mt-1">{completionRate}%</p>
                </div>
                <div className="bg-white/20 p-2 rounded-full">
                  <Award className="h-5 w-5 text-yellow-400" />
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-1.5 mt-3">
                <div className="bg-yellow-400 rounded-full h-1.5 transition-all duration-500" style={{ width: `${completionRate}%` }} />
              </div>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 border border-gray-100">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search by service, staff, or booking code..." 
                  value={searchTerm} 
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                  className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 transition" 
                />
              </div>
              <select 
                value={statusFilter} 
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} 
                className="px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 transition"
              >
                <option value="all">📋 All Status</option>
                <option value="pending">⏳ Pending</option>
                <option value="approved">✅ Approved</option>
                <option value="rejected">❌ Rejected</option>
              </select>
              <select 
                value={dateRange} 
                onChange={(e) => { setDateRange(e.target.value); setCurrentPage(1); }} 
                className="px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 transition"
              >
                <option value="all">📅 All Time</option>
                <option value="today">🔴 Today</option>
                <option value="tomorrow">⭐ Tomorrow</option>
                <option value="week">📆 This Week</option>
                <option value="month">📅 This Month</option>
              </select>
              <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                <button 
                  onClick={() => setViewMode("grid")} 
                  className={`px-4 py-3 text-sm font-medium transition-all duration-200 ${viewMode === "grid" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  📱 Grid
                </button>
                <button 
                  onClick={() => setViewMode("list")} 
                  className={`px-4 py-3 text-sm font-medium transition-all duration-200 ${viewMode === "list" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  📋 List
                </button>
              </div>
              <button 
                onClick={clearFilters} 
                className="px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition flex items-center gap-2 text-slate-600"
              >
                <FilterX className="h-4 w-4" /> Clear
              </button>
            </div>
            {searchTerm && (
              <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                <Eye className="h-3 w-3" /> Found {meta.total} appointment{meta.total !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Notifications Panel - Professional Staff Messages Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl">
                  <BellRing className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Staff Communications</h2>
                  <p className="text-xs text-slate-500">Important updates and messages from our team</p>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setSelectedNotificationTab('all')}
                    className={`px-3 py-1.5 text-xs rounded-md transition ${selectedNotificationTab === 'all' ? 'bg-white shadow text-indigo-600' : 'text-slate-600'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSelectedNotificationTab('staff')}
                    className={`px-3 py-1.5 text-xs rounded-md transition ${selectedNotificationTab === 'staff' ? 'bg-white shadow text-indigo-600' : 'text-slate-600'}`}
                  >
                    Staff Messages
                  </button>
                  <button
                    onClick={() => setSelectedNotificationTab('status')}
                    className={`px-3 py-1.5 text-xs rounded-md transition ${selectedNotificationTab === 'status' ? 'bg-white shadow text-indigo-600' : 'text-slate-600'}`}
                  >
                    Status Updates
                  </button>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsAsRead}
                    className="text-xs text-indigo-600 hover:text-indigo-700 px-3 py-1.5 bg-indigo-50 rounded-lg"
                  >
                    Mark all read ({unreadCount})
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            {getFilteredNotifications().length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                <MessageCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No messages from staff yet</p>
                <p className="text-xs text-slate-400 mt-1">When staff responds to your appointments, you'll see them here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {getFilteredNotifications().map((notif) => (
                  <div
                    key={notif.id}
                    className={`bg-white rounded-xl p-4 border-l-4 transition-all duration-300 hover:shadow-md ${
                      !notif.read ? 'border-l-indigo-500 bg-gradient-to-r from-indigo-50/50 to-white' : 'border-l-gray-300'
                    }`}
                    onClick={() => markNotificationAsRead(notif.id)}
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className={`p-2 rounded-full ${!notif.read ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                          {getNotificationIcon(notif.type, notif.status)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{notif.title || "Staff Update"}</span>
                            {!notif.read && (
                              <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full animate-pulse">New</span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">
                            {formatDistance(parseISO(notif.createdAt || notif.time), new Date(), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-slate-700 text-sm mb-2">{notif.message}</p>
                        {notif.comment && (
                          <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 text-indigo-500 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-indigo-600">Staff Comment:</p>
                                <p className="text-sm text-slate-700 mt-0.5">{notif.comment}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {notif.appointmentId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const app = appointments.find(a => a.id === notif.appointmentId);
                              if (app) {
                                setSelectedAppointment(app);
                                setShowDetailsModal(true);
                              }
                            }}
                            className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                          >
                            View Appointment <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Appointments Display */}
          {appointments.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl border p-12 text-center">
              <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No appointments found</h3>
              <p className="text-slate-500 mb-6">Book your first appointment to get started</p>
              <button onClick={() => router.push("/book")} className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition">
                Book Appointment
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {appointments.map((app) => {
                  const isExpanded = expandedComment === app.id;
                  const hasLongComment = app.comment && app.comment.length > 100;
                  const appointmentFiles = getAppointmentFiles(app.id);
                  const daysUntil = app.datetime ? differenceInDays(parseISO(app.datetime), new Date()) : null;
                  const statusBadge = getStatusBadge(app.status, app.datetime);
                  const hasStaffComment = app.comment && app.status !== "Pending";
                  const timeLeft = getTimeLeftMessage(app.datetime);
                  
                  return (
                    <div 
                      key={app.id} 
                      className={`bg-white rounded-2xl shadow-lg border overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group ${
                        hasStaffComment ? 'border-l-4 border-l-indigo-400' : ''
                      }`}
                    >
                      {/* Staff Comment Notification Badge */}
                      {hasStaffComment && (
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-2 border-b border-indigo-100">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-indigo-500" />
                            <span className="text-xs font-medium text-indigo-700">
                              {app.status === "Approved" ? "Staff approved your appointment" : "Staff left a response"}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition line-clamp-1">
                              {app.serviceName}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Users className="h-3.5 w-3.5 text-slate-400" />
                              <p className="text-xs text-slate-500">with {app.providerName}</p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusBadge.color}`}>
                            {statusBadge.icon} {statusBadge.text}
                          </span>
                        </div>
                        
                        {/* Date & Time Section */}
                        <div className="bg-slate-50 rounded-xl p-3 mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-indigo-500" />
                            <span className="text-sm font-medium text-slate-700">{formatDate(app.datetime)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-4 w-4 text-indigo-500" />
                            <span className="text-sm text-slate-600">{formatTime(app.datetime)}</span>
                            {timeLeft && (
                              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full ml-2">
                                {timeLeft}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Staff Comment Section - Professional Display */}
                        {hasStaffComment && (
                          <div className={`mb-4 rounded-xl overflow-hidden ${
                            app.status === "Approved" 
                              ? "bg-emerald-50 border border-emerald-100" 
                              : "bg-amber-50 border border-amber-100"
                          }`}>
                            <div className="p-3">
                              <div className="flex items-start gap-2">
                                <div className={`p-1.5 rounded-full ${
                                  app.status === "Approved" ? "bg-emerald-200" : "bg-amber-200"
                                }`}>
                                  {app.status === "Approved" 
                                    ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                    : <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                                  }
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs font-semibold text-slate-700">
                                    {app.status === "Approved" ? "✨ Staff Approval Note" : "📝 Staff Response"}
                                  </p>
                                  <div className="mt-1">
                                    {hasLongComment && !isExpanded ? (
                                      <>
                                        <p className="text-sm text-slate-700 leading-relaxed">
                                          {app.comment.substring(0, 80)}...
                                        </p>
                                        <button 
                                          onClick={() => setExpandedComment(app.id)} 
                                          className="text-xs text-indigo-600 hover:text-indigo-700 mt-1 font-medium flex items-center gap-1"
                                        >
                                          Read more <ChevronDown className="h-3 w-3" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <p className="text-sm text-slate-700 leading-relaxed">{app.comment}</p>
                                        {hasLongComment && (
                                          <button 
                                            onClick={() => setExpandedComment(null)} 
                                            className="text-xs text-indigo-600 hover:text-indigo-700 mt-1 font-medium flex items-center gap-1"
                                          >
                                            Show less <ChevronUp className="h-3 w-3" />
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Booking Code */}
                        {app.bookingCode && (
                          <div className="mb-3 p-2 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Tag className="h-3 w-3" /> Booking Code: 
                              <span className="font-mono text-indigo-600 font-medium">{app.bookingCode}</span>
                            </p>
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2 pt-2">
                          {app.status === "Pending" && (
                            <>
                              <button 
                                onClick={() => { setSelectedAppointment(app); setEditNotes(app.notes || ""); setShowEditNotesModal(true); }} 
                                className="px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition flex items-center gap-1"
                              >
                                <Edit className="h-3 w-3" /> Edit Notes
                              </button>
                              <button 
                                onClick={() => { setSelectedAppointment(app); setShowCancelModal(true); }} 
                                className="px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition flex items-center gap-1"
                              >
                                <Trash2 className="h-3 w-3" /> Cancel
                              </button>
                            </>
                          )}
                          {app.status === "Approved" && app.datetime && isFuture(parseISO(app.datetime)) && (
                            <button 
                              onClick={() => shareAppointment(app)} 
                              className="px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition flex items-center gap-1"
                            >
                              <Share2 className="h-3 w-3" /> Share
                            </button>
                          )}
                          {app.status === "Expired" && (
                            <button 
                              onClick={() => { setSelectedAppointment(app); setShowRebookModal(true); }} 
                              className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition flex items-center gap-1"
                            >
                              <Repeat className="h-3 w-3" /> Rebook
                            </button>
                          )}
                          {app.status === "Approved" && app.datetime && isPast(parseISO(app.datetime)) && !app.feedbackGiven && (
                            <button 
                              onClick={() => { setSelectedAppointment(app); setShowFeedbackModal(true); }} 
                              className="px-3 py-1.5 text-xs font-medium text-yellow-600 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition flex items-center gap-1"
                            >
                              <Star className="h-3 w-3" /> Rate & Review
                            </button>
                          )}
                          <button 
                            onClick={() => { setSelectedAppointment(app); setShowDetailsModal(true); }} 
                            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" /> Details
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {meta.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                    disabled={currentPage === 1} 
                    className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition"
                  >
                    ← Previous
                  </button>
                  {[...Array(Math.min(5, meta.totalPages))].map((_, i) => {
                    let pageNum;
                    if (meta.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= meta.totalPages - 2) {
                      pageNum = meta.totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-lg text-sm transition-all ${
                          currentPage === pageNum
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'border text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(meta.totalPages, p + 1))} 
                    disabled={currentPage === meta.totalPages} 
                    className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          ) : (
            // List View with Professional Design
            <div className="bg-white rounded-2xl shadow-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-white border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Service</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Provider</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date & Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Staff Response</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {appointments.map((app) => {
                      const statusBadge = getStatusBadge(app.status, app.datetime);
                      const hasStaffComment = app.comment && app.status !== "Pending";
                      
                      return (
                        <tr 
                          key={app.id} 
                          className={`hover:bg-slate-50 cursor-pointer transition-all duration-200 ${hasStaffComment ? 'bg-indigo-50/30' : ''}`} 
                          onClick={() => { setSelectedAppointment(app); setShowDetailsModal(true); }}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-slate-800">{app.serviceName}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{app.providerName}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {formatShortDate(app.datetime)}<br />
                            <span className="text-xs text-slate-400">{formatTime(app.datetime)}</span>
                          </td>
                          <td className="px-4 py-3">
                            {hasStaffComment ? (
                              <div className="flex items-center gap-2">
                                <MessageCircle className="h-4 w-4 text-indigo-500" />
                                <span className="text-xs text-indigo-600 font-medium">Response received</span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                              {statusBadge.icon} {statusBadge.text}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedAppointment(app); setShowDetailsModal(true); }} 
                              className="text-indigo-600 text-sm hover:text-indigo-800 font-medium flex items-center gap-1"
                            >
                              View Details <ChevronRight className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {meta.totalPages > 1 && (
                <div className="flex justify-center gap-2 p-4 border-t">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                    disabled={currentPage === 1} 
                    className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-white transition"
                  >
                    ← Previous
                  </button>
                  <span className="px-4 py-2 text-sm text-slate-600">
                    Page {currentPage} of {meta.totalPages}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(meta.totalPages, p + 1))} 
                    disabled={currentPage === meta.totalPages} 
                    className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-white transition"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* All Modals - Same as before but with professional styling */}
        {/* Feedback Modal */}
        {showFeedbackModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl transform transition-all">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="h-8 w-8 text-yellow-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Share Your Experience</h3>
                <p className="text-slate-500 text-sm mt-1">How was your appointment with {selectedAppointment.providerName}?</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Your Rating</label>
                  <div className="flex gap-2 justify-center">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button 
                        key={star} 
                        onClick={() => setFeedback({ ...feedback, rating: star })} 
                        className="focus:outline-none transform hover:scale-110 transition"
                      >
                        <Star className={`h-8 w-8 ${star <= feedback.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Your Feedback</label>
                  <textarea 
                    value={feedback.comment} 
                    onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })} 
                    rows="4" 
                    placeholder="Share your experience with us..." 
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 resize-none" 
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={submitFeedback} 
                  disabled={submittingFeedback} 
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
                >
                  {submittingFeedback ? "Submitting..." : "Submit Feedback"}
                </button>
                <button 
                  onClick={() => { setShowFeedbackModal(false); setFeedback({ rating: 5, comment: "" }); }} 
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-semibold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Notes Modal */}
        {showEditNotesModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Edit className="h-5 w-5 text-amber-600" />
                  <h3 className="text-xl font-bold text-slate-800">Edit Your Notes</h3>
                </div>
                <button onClick={() => { setShowEditNotesModal(false); setSelectedAppointment(null); }} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <textarea 
                value={editNotes} 
                onChange={(e) => setEditNotes(e.target.value)} 
                rows="5" 
                placeholder="Add your personal notes about this appointment..." 
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 resize-none" 
              />
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={saveNotes} 
                  disabled={savingNotes} 
                  className="flex-1 bg-amber-600 text-white py-2.5 rounded-xl font-semibold hover:bg-amber-700 transition disabled:opacity-50"
                >
                  {savingNotes ? "Saving..." : "Save Changes"}
                </button>
                <button 
                  onClick={() => { setShowEditNotesModal(false); setSelectedAppointment(null); }} 
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-semibold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-8 w-8 text-rose-500" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-slate-800">Cancel Appointment?</h3>
              <p className="text-slate-600 mb-6">
                Are you sure you want to cancel your appointment for <span className="font-semibold">{selectedAppointment.serviceName}</span>?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={handleCancelAppointment} 
                  className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl font-semibold hover:bg-rose-700 transition"
                >
                  Yes, Cancel
                </button>
                <button 
                  onClick={() => { setShowCancelModal(false); setSelectedAppointment(null); }} 
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-semibold hover:bg-slate-200 transition"
                >
                  No, Keep
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rebook Modal */}
        {showRebookModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Repeat className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-slate-800">Rebook Appointment</h3>
              <p className="text-slate-600 mb-6">
                Would you like to book a new appointment similar to <span className="font-semibold">{selectedAppointment.serviceName}</span>?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={handleRebook} 
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition"
                >
                  Yes, Rebook
                </button>
                <button 
                  onClick={() => { setShowRebookModal(false); setSelectedAppointment(null); }} 
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-semibold hover:bg-slate-200 transition"
                >
                  No, Thanks
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Appointment Details
                  </h2>
                  <p className="text-xs text-slate-500">Booking Code: {selectedAppointment.bookingCode || 'N/A'}</p>
                </div>
                <button 
                  onClick={() => { setShowDetailsModal(false); setSelectedAppointment(null); }} 
                  className="p-2 hover:bg-slate-100 rounded-xl transition"
                >
                  <XCircle className="h-6 w-6 text-slate-400" />
                </button>
              </div>
              
              <div className="p-6">
                {/* Service Info */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-xs text-slate-500 flex items-center gap-1"><Briefcase className="h-3 w-3" /> Service</p>
                    <p className="font-medium text-slate-900 mt-1">{selectedAppointment.serviceName}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-xs text-slate-500 flex items-center gap-1"><Users className="h-3 w-3" /> Staff Provider</p>
                    <p className="font-medium text-slate-900 mt-1">{selectedAppointment.providerName}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-xs text-slate-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> Date</p>
                    <p className="font-medium text-slate-900 mt-1">{formatDate(selectedAppointment.datetime)}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-xs text-slate-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Time</p>
                    <p className="font-medium text-slate-900 mt-1">{formatTime(selectedAppointment.datetime)}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-xs text-slate-500 flex items-center gap-1"><Clock8 className="h-3 w-3" /> Duration</p>
                    <p className="font-medium text-slate-900 mt-1">{selectedAppointment.duration || 60} minutes</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-xs text-slate-500 flex items-center gap-1"><Tag className="h-3 w-3" /> Priority</p>
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                      selectedAppointment.priority === 'Urgent' ? 'bg-red-100 text-red-700' : 
                      selectedAppointment.priority === 'High' ? 'bg-orange-100 text-orange-700' : 
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {selectedAppointment.priority || 'Normal'}
                    </div>
                  </div>
                </div>
                
                {/* Staff Comment */}
                {selectedAppointment.comment && selectedAppointment.status !== "Pending" && (
                  <div className={`mb-4 rounded-xl overflow-hidden border-2 ${
                    selectedAppointment.status === "Approved" ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
                  }`}>
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${selectedAppointment.status === "Approved" ? "bg-emerald-200" : "bg-rose-200"}`}>
                          <MessageSquare className={`h-5 w-5 ${selectedAppointment.status === "Approved" ? "text-emerald-700" : "text-rose-700"}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800">
                            {selectedAppointment.status === "Approved" ? "✅ Staff Approval Note" : "❌ Staff Response"}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">From {selectedAppointment.providerName}</p>
                          <div className="mt-2 p-3 bg-white/50 rounded-lg">
                            <p className="text-slate-700 leading-relaxed">{selectedAppointment.comment}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* User Notes */}
                {selectedAppointment.notes && (
                  <div className="mb-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="flex items-start gap-2">
                      <Edit className="h-4 w-4 text-amber-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Your Personal Notes</p>
                        <p className="text-sm text-slate-700 mt-1 italic">"{selectedAppointment.notes}"</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 mt-4">
                  {selectedAppointment.status === "Pending" && (
                    <>
                      <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl cursor-pointer hover:bg-indigo-100 transition">
                        <Upload className="h-4 w-4" /> Upload Document
                        <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, selectedAppointment.id)} disabled={uploading} />
                      </label>
                      <button 
                        onClick={() => { setShowEditNotesModal(true); setShowDetailsModal(false); setEditNotes(selectedAppointment.notes || ""); }} 
                        className="flex-1 bg-amber-600 text-white py-2.5 rounded-xl hover:bg-amber-700 transition"
                      >
                        Edit Notes
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => shareAppointment(selectedAppointment)} 
                    className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl hover:bg-emerald-700 transition flex items-center justify-center gap-2"
                  >
                    <Share2 className="h-4 w-4" /> Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}