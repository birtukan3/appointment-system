"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { AppContext } from "../providers";
import Navbar from "../components/Navbar";
import ToastProvider from "../components/ToastProvider";
import api from "../lib/api";
import {
  Calendar, Clock, CheckCircle, XCircle, Users, Activity, Filter, Eye,
  Search, RefreshCw, LogOut, Bell, Star, Phone, Mail, User,
  CalendarCheck, AlertCircle, BarChart3, PieChart, Download,
  ChevronRight, ChevronLeft, FileText, Briefcase, UserCircle,
  FilterX, Award, TrendingUp, CalendarDays, Trophy, X, MessageSquare
} from "lucide-react";
import toast from "react-hot-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RPieChart, Pie, Cell, Legend
} from "recharts";
import { format, formatDistance, subDays, subWeeks, subMonths,
  isToday, isTomorrow, isThisWeek, isThisMonth, parseISO } from "date-fns";

export default function StaffDashboard() {
  const router = useRouter();
  const { user, logout, isAuthenticated, loading: authLoading } = useContext(AppContext);

  const [appointments, setAppointments] = useState([]);
  const [staffProfile, setStaffProfile] = useState(null);
  const [stats, setStats] = useState({
    total: 0, pending: 0, approved: 0, rejected: 0, today: 0,
    thisWeek: 0, thisMonth: 0, urgent: 0, high: 0,
    completionRate: 0, avgResponseTime: 0, uniqueClients: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [comment, setComment] = useState("");
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [refreshing, setRefreshing] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [detailsAppointment, setDetailsAppointment] = useState(null);
  const [dateRange, setDateRange] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterProvider, setFilterProvider] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [chartType, setChartType] = useState("bar");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const itemsPerPage = 9;

  const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444"];

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'staff') {
      router.push(user.role === 'admin' ? '/admin' : '/dashboard');
      return;
    }
    fetchStaffProfile();
    fetchAppointments();
  }, [authLoading, isAuthenticated, user, router]);

  const fetchStaffProfile = async () => {
    try {
      const response = await api.get('/users/profile');
      setStaffProfile(response.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      setRefreshing(true);
      const response = await api.get("/appointments");
      const allApps = Array.isArray(response.data) ? response.data : response.data?.data || [];
      
      // Filter appointments for this staff member only
      const staffApps = allApps.filter(app => app.providerName === user?.name);
      setAppointments(staffApps);

      const today = new Date().toISOString().split("T")[0];
      const weekAgo = subDays(new Date(), 7);
      const monthAgo = subMonths(new Date(), 1);

      const pendingApps = staffApps.filter((a) => a?.status === "Pending");
      const approvedApps = staffApps.filter((a) => a?.status === "Approved");
      const uniqueClients = new Set(staffApps.map(a => a.userEmail)).size;

      setStats({
        total: staffApps.length,
        pending: pendingApps.length,
        approved: approvedApps.length,
        rejected: staffApps.filter((a) => a?.status === "Rejected").length,
        today: staffApps.filter((a) => a?.datetime?.startsWith(today)).length,
        thisWeek: staffApps.filter((a) => new Date(a?.datetime) >= weekAgo).length,
        thisMonth: staffApps.filter((a) => new Date(a?.datetime) >= monthAgo).length,
        urgent: staffApps.filter((a) => a?.priority === "Urgent").length,
        high: staffApps.filter((a) => a?.priority === "High").length,
        completionRate: staffApps.length ? Math.round((approvedApps.length / staffApps.length) * 100) : 0,
        avgResponseTime: calculateAvgResponseTime(staffApps),
        uniqueClients,
      });

      // Auto notification for new pending appointments
      const newPendingApps = staffApps.filter(a => a?.status === "Pending" && 
        !notifications.some(n => n.appointmentId === a.id && n.type === 'new'));
      
      if (newPendingApps.length > 0) {
        const newNotifications = newPendingApps.map(app => ({
          id: Date.now() + Math.random(),
          type: 'new',
          appointmentId: app.id,
          message: `New appointment request from ${app.userName || app.userEmail} for ${app.serviceName}`,
          time: new Date().toISOString(),
          read: false
        }));
        setNotifications(prev => [...newNotifications, ...prev]);
        setUnreadCount(prev => prev + newPendingApps.length);
      }

      // Urgent notifications
      const urgentApps = staffApps.filter(a => a?.priority === "Urgent" && a?.status === "Pending");
      if (urgentApps.length > 0 && !notifications.some(n => n.type === 'urgent' && n.message.includes(urgentApps.length))) {
        setNotifications(prev => [{
          id: Date.now(),
          type: 'urgent',
          message: `${urgentApps.length} urgent appointment${urgentApps.length > 1 ? 's' : ''} pending`,
          time: new Date().toISOString(),
          read: false
        }, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error(error.response?.data?.message || "Failed to fetch appointments");
      setAppointments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateAvgResponseTime = (items) => {
    const processed = items.filter(a => a?.status !== "Pending" && a?.createdAt && a?.updatedAt);
    if (!processed.length) return 0;
    const totalMinutes = processed.reduce((sum, a) => {
      const createdAt = new Date(a.createdAt);
      const updatedAt = new Date(a.updatedAt);
      return sum + Math.max(0, Math.round((updatedAt - createdAt) / 60000));
    }, 0);
    return Math.round(totalMinutes / processed.length);
  };

  const updateAppointmentStatus = async (id, status, commentText = '') => {
    if (actionLoading) return;
    try {
      setActionLoading(true);
      const payload = { status };
      if (status === "Rejected" && commentText) {
        payload.comment = commentText;
      }
      if (status === "Approved") {
        payload.comment = commentText || "Appointment approved";
      }
      
      await api.patch(`/appointments/${id}`, payload);
      
      toast.success(`Appointment ${status.toLowerCase()} successfully`);
      
      // Add notification for the user (in real system, this would be server-side)
      setNotifications(prev => [{
        id: Date.now(),
        type: status.toLowerCase(),
        appointmentId: id,
        message: `Appointment #${id} was ${status.toLowerCase()}${status === 'Rejected' ? `: ${commentText}` : ''}`,
        time: new Date().toISOString(),
        read: false
      }, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      setComment("");
      setSelectedAppointment(null);
      setShowRejectModal(false);
      setShowApproveModal(false);
      setShowDetailsModal(false);
      await fetchAppointments();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${status.toLowerCase()} appointment`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchAppointments();
    toast.success("Appointments refreshed");
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleViewDetails = (app) => {
    setDetailsAppointment(app);
    setShowDetailsModal(true);
  };

  const handleApproveWithComment = (app) => {
    setSelectedAppointment(app);
    setShowApproveModal(true);
  };

  const handleRejectWithComment = (app) => {
    setSelectedAppointment(app);
    setShowRejectModal(true);
  };

  const clearAllFilters = () => {
    setFilter("all");
    setSearchTerm("");
    setDateRange("all");
    setFilterProvider("all");
    setSortBy("date-desc");
    setCurrentPage(1);
  };

  const markNotificationAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const filteredAppointments = appointments
    .filter((app) => {
      if (!app) return false;
      if (filterProvider !== "all" && app.providerName !== filterProvider) return false;
      if (filter !== "all" && app.status?.toLowerCase() !== filter) return false;
      if (dateRange !== "all") {
        const appDate = new Date(app.datetime);
        if (dateRange === "today" && !isToday(appDate)) return false;
        if (dateRange === "tomorrow" && !isTomorrow(appDate)) return false;
        if (dateRange === "week" && !isThisWeek(appDate)) return false;
        if (dateRange === "month" && !isThisMonth(appDate)) return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return app.serviceName?.toLowerCase().includes(term) ||
               app.userEmail?.toLowerCase().includes(term) ||
               app.userName?.toLowerCase().includes(term) ||
               app.id?.toString().includes(term);
      }
      return true;
    })
    .sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

  const uniqueProviders = [...new Set(appointments.map(app => app.providerName).filter(Boolean))];
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const paginatedAppointments = filteredAppointments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getChartData = () => {
    const last7Days = [...Array(7)].map((_, i) => format(subDays(new Date(), i), "yyyy-MM-dd")).reverse();
    return last7Days.map((date) => ({
      date: format(parseISO(date), "EEE, MMM d"),
      appointments: appointments.filter(a => a.datetime?.startsWith(date)).length,
      approved: appointments.filter(a => a.datetime?.startsWith(date) && a.status === "Approved").length,
      pending: appointments.filter(a => a.datetime?.startsWith(date) && a.status === "Pending").length,
    }));
  };

  const getWeeklyData = () => {
    const weeks = [...Array(4)].map((_, i) => {
      const start = subWeeks(new Date(), i);
      const end = subWeeks(new Date(), i - 1);
      const weekApps = appointments.filter(a => new Date(a.datetime) >= start && new Date(a.datetime) < end);
      return { week: `Week ${4 - i}`, total: weekApps.length, approved: weekApps.filter(a => a.status === "Approved").length };
    }).reverse();
    return weeks;
  };

  const getPieData = () => [
    { name: "Approved", value: stats.approved, color: "#10b981" },
    { name: "Pending", value: stats.pending, color: "#f59e0b" },
    { name: "Rejected", value: stats.rejected, color: "#ef4444" },
  ];

  const getPriorityPieData = () => [
    { name: "Urgent", value: stats.urgent, color: "#ef4444" },
    { name: "High", value: stats.high, color: "#f97316" },
    { name: "Normal", value: stats.total - stats.urgent - stats.high, color: "#3b82f6" },
  ];

  const getPriorityBadge = (priority) => {
    if (priority === "Urgent") return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 animate-pulse"><AlertCircle className="h-3 w-3" /> Urgent</span>;
    if (priority === "High") return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800"><AlertCircle className="h-3 w-3" /> High</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Clock className="h-3 w-3" /> Normal</span>;
  };

  const getStatusBadge = (status) => {
    if (status === "Approved") return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="h-3 w-3" /> Approved</span>;
    if (status === "Rejected") return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="h-3 w-3" /> Rejected</span>;
    return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3" /> Pending</span>;
  };

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <ToastProvider />
      <Navbar />
      <div className="min-h-screen bg-gray-50 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">Staff Dashboard</h1>
                {unreadCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">{unreadCount} new</span>}
              </div>
              <p className="text-gray-600">Welcome back, {user?.name}</p>
              {staffProfile?.department && <p className="text-sm text-gray-500 mt-1"><Briefcase className="h-3 w-3 inline mr-1" /> {staffProfile.department}</p>}
              <p className="text-xs text-gray-400 mt-1">Manage your appointments - Approve or Reject with comments</p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                  <Bell className="h-5 w-5 text-gray-600" />
                  {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{unreadCount}</span>}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <div className="p-3 border-b flex justify-between">
                      <h3 className="font-semibold">Notifications</h3>
                      <button onClick={clearAllNotifications} className="text-xs text-blue-600">Clear all</button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">No notifications</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className={`p-3 border-b cursor-pointer ${!n.read ? 'bg-blue-50' : ''}`} onClick={() => markNotificationAsRead(n.id)}>
                            <div className="flex gap-2">
                              {n.type === 'new' && <CalendarCheck className="h-4 w-4 text-blue-500" />}
                              {n.type === 'urgent' && <AlertCircle className="h-4 w-4 text-red-500" />}
                              {n.type === 'approved' && <CheckCircle className="h-4 w-4 text-green-500" />}
                              {n.type === 'rejected' && <XCircle className="h-4 w-4 text-red-500" />}
                              <div className="flex-1">
                                <p className="text-sm">{n.message}</p>
                                <p className="text-xs text-gray-500 mt-1">{formatDistance(parseISO(n.time), new Date(), { addSuffix: true })}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={handleRefresh} disabled={refreshing} className="bg-white border border-gray-200 rounded-lg p-2"><RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} /></button>
              <button onClick={() => setShowStatsModal(true)} className="bg-white border border-gray-200 rounded-lg p-2"><BarChart3 className="h-5 w-5" /></button>
              <button onClick={handleLogout} className="bg-red-50 border border-red-200 rounded-lg p-2"><LogOut className="h-5 w-5 text-red-600" /></button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
            <div className="bg-white rounded-xl p-4 border cursor-pointer" onClick={() => setFilter("all")}><p className="text-xs text-gray-500">Total</p><p className="text-2xl font-bold">{stats.total}</p></div>
            <div className="bg-white rounded-xl p-4 border border-yellow-100 cursor-pointer" onClick={() => setFilter("pending")}><p className="text-xs text-yellow-600">Pending</p><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p></div>
            <div className="bg-white rounded-xl p-4 border border-green-100 cursor-pointer" onClick={() => setFilter("approved")}><p className="text-xs text-green-600">Approved</p><p className="text-2xl font-bold text-green-600">{stats.approved}</p></div>
            <div className="bg-white rounded-xl p-4 border border-purple-100 cursor-pointer" onClick={() => setDateRange("today")}><p className="text-xs text-purple-600">Today</p><p className="text-2xl font-bold text-purple-600">{stats.today}</p></div>
            <div className="bg-white rounded-xl p-4 border border-orange-100"><p className="text-xs text-orange-600">Urgent</p><p className="text-2xl font-bold text-orange-600">{stats.urgent}</p></div>
            <div className="bg-white rounded-xl p-4 border border-teal-100"><p className="text-xs text-teal-600">Success</p><p className="text-2xl font-bold text-teal-600">{stats.completionRate}%</p></div>
            <div className="bg-white rounded-xl p-4 border border-indigo-100"><p className="text-xs text-indigo-600">Clients</p><p className="text-2xl font-bold text-indigo-600">{stats.uniqueClients}</p></div>
            <div className="bg-white rounded-xl p-4 border border-pink-100"><p className="text-xs text-pink-600">Response</p><p className="text-2xl font-bold text-pink-600">{stats.avgResponseTime}m</p></div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" /><input type="text" placeholder="Search by service, client email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" /></div>
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-4 py-2 border rounded-lg"><option value="all">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="px-4 py-2 border rounded-lg"><option value="all">All Time</option><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option></select>
              <div className="flex border rounded-lg overflow-hidden"><button onClick={() => setViewMode("grid")} className={`px-4 py-2 ${viewMode === "grid" ? "bg-blue-600 text-white" : "bg-white"}`}>Grid</button><button onClick={() => setViewMode("list")} className={`px-4 py-2 ${viewMode === "list" ? "bg-blue-600 text-white" : "bg-white"}`}>List</button></div>
            </div>
          </div>

          {/* Appointments */}
          {filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center"><Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" /><h3 className="text-xl font-semibold">No appointments found</h3><button onClick={clearAllFilters} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg">Clear Filters</button></div>
          ) : viewMode === "grid" ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedAppointments.map((app) => (
                  <div key={app.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition border cursor-pointer" onClick={() => handleViewDetails(app)}>
                    <div className="p-6">
                      <div className="flex justify-between mb-3"><h3 className="font-semibold text-lg">{app.serviceName}</h3>{getPriorityBadge(app.priority)}</div>
                      <p className="text-sm text-gray-600 mb-1"><User className="h-4 w-4 inline mr-1" /> {app.userName || app.userEmail}</p>
                      <p className="text-sm text-gray-500"><Calendar className="h-4 w-4 inline mr-1" /> {format(parseISO(app.datetime), 'MMM d, yyyy • h:mm a')}</p>
                      {app.notes && <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded mt-2 italic">"{app.notes}"</p>}
                      <div className="flex justify-between items-center mt-3">
                        {getStatusBadge(app.status)}
                        <div className="flex gap-2">
                          {app.status === "Pending" && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); handleApproveWithComment(app); }} className="text-green-600 hover:text-green-700 p-1" title="Approve with comment"><CheckCircle className="h-5 w-5" /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleRejectWithComment(app); }} className="text-red-600 hover:text-red-700 p-1" title="Reject with comment"><XCircle className="h-5 w-5" /></button>
                            </>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); handleViewDetails(app); }} className="text-blue-600"><Eye className="h-5 w-5" /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="px-3 py-1">Page {currentPage} of {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded"><ChevronRight className="h-4 w-4" /></button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">…
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Actions</th>
                </thead>
                <tbody className="divide-y">
                  {paginatedAppointments.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewDetails(app)}>
                      <td className="px-6 py-4 font-medium">{app.serviceName}</td>
                      <td className="px-6 py-4"><div className="text-sm">{app.userName || app.userEmail}</div><div className="text-xs text-gray-500">{app.userEmail}</div></td>
                      <td className="px-6 py-4 text-sm">{format(parseISO(app.datetime), 'MMM d, yyyy • h:mm a')}</td>
                      <td className="px-6 py-4">{getPriorityBadge(app.priority)}</td>
                      <td className="px-6 py-4">{getStatusBadge(app.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {app.status === "Pending" && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); handleApproveWithComment(app); }} className="text-green-600"><CheckCircle className="h-5 w-5" /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleRejectWithComment(app); }} className="text-red-600"><XCircle className="h-5 w-5" /></button>
                            </>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); handleViewDetails(app); }} className="text-blue-600"><Eye className="h-5 w-5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t flex justify-center gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded"><ChevronLeft className="h-4 w-4" /></button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded"><ChevronRight className="h-4 w-4" /></button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Details Modal */}
        {showDetailsModal && detailsAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between mb-6"><h2 className="text-xl font-bold">Appointment Details #{detailsAppointment.id}</h2><button onClick={() => setShowDetailsModal(false)}><XCircle className="h-6 w-6 text-gray-400" /></button></div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><p className="text-sm text-gray-500">Service</p><p className="font-medium">{detailsAppointment.serviceName}</p></div>
                <div><p className="text-sm text-gray-500">Provider</p><p className="font-medium">{detailsAppointment.providerName}</p></div>
                <div><p className="text-sm text-gray-500">Client</p><p className="font-medium">{detailsAppointment.userName || detailsAppointment.userEmail}</p><p className="text-xs text-gray-500">{detailsAppointment.userEmail}</p></div>
                <div><p className="text-sm text-gray-500">Date/Time</p><p className="font-medium">{format(parseISO(detailsAppointment.datetime), 'EEEE, MMMM d, yyyy • h:mm a')}</p></div>
                <div><p className="text-sm text-gray-500">Priority</p>{getPriorityBadge(detailsAppointment.priority)}</div>
                <div><p className="text-sm text-gray-500">Status</p>{getStatusBadge(detailsAppointment.status)}</div>
                {detailsAppointment.age && <div><p className="text-sm text-gray-500">Age/Gender</p><p className="font-medium">{detailsAppointment.age} years • {detailsAppointment.gender || 'N/A'}</p></div>}
                {detailsAppointment.company && <div><p className="text-sm text-gray-500">Company</p><p className="font-medium">{detailsAppointment.company}</p></div>}
              </div>
              {detailsAppointment.notes && <div className="mb-4"><p className="text-sm text-gray-500">Client Notes</p><p className="bg-gray-50 p-3 rounded">{detailsAppointment.notes}</p></div>}
              {detailsAppointment.comment && <div className="mb-4"><p className="text-sm text-gray-500">Staff Comment</p><p className="bg-red-50 p-3 rounded">{detailsAppointment.comment}</p></div>}
              {detailsAppointment.status === "Pending" && (
                <div className="flex gap-3 mt-4">
                  <button onClick={() => { handleApproveWithComment(detailsAppointment); setShowDetailsModal(false); }} className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">Approve</button>
                  <button onClick={() => { handleRejectWithComment(detailsAppointment); setShowDetailsModal(false); }} className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">Reject</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Approve Modal with Comment */}
        {showApproveModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center"><CheckCircle className="h-6 w-6 text-green-600" /></div>
                <h3 className="text-xl font-bold">Approve Appointment</h3>
              </div>
              <p className="text-gray-600 mb-2"><span className="font-medium">Service:</span> {selectedAppointment.serviceName}</p>
              <p className="text-gray-600 mb-4"><span className="font-medium">Client:</span> {selectedAppointment.userName || selectedAppointment.userEmail}</p>
              <p className="text-gray-600 mb-2">Optional comment (will be sent to client):</p>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full p-3 border rounded-lg h-24 resize-none mb-4" placeholder="Add a note for the client (optional)..." />
              <div className="flex gap-3">
                <button onClick={() => updateAppointmentStatus(selectedAppointment.id, "Approved", comment)} disabled={actionLoading} className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">Confirm Approval</button>
                <button onClick={() => { setSelectedAppointment(null); setComment(""); setShowApproveModal(false); }} className="flex-1 bg-gray-200 py-2 rounded-lg">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal with Comment */}
        {showRejectModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center"><XCircle className="h-6 w-6 text-red-600" /></div>
                <h3 className="text-xl font-bold">Reject Appointment</h3>
              </div>
              <p className="text-gray-600 mb-2"><span className="font-medium">Service:</span> {selectedAppointment.serviceName}</p>
              <p className="text-gray-600 mb-4"><span className="font-medium">Client:</span> {selectedAppointment.userName || selectedAppointment.userEmail}</p>
              <p className="text-gray-600 mb-2">Reason for rejection <span className="text-red-500">*</span>:</p>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full p-3 border rounded-lg h-24 resize-none mb-4" placeholder="Please provide a reason for rejection..." autoFocus />
              <div className="flex gap-3">
                <button onClick={() => updateAppointmentStatus(selectedAppointment.id, "Rejected", comment)} disabled={!comment.trim() || actionLoading} className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">Confirm Rejection</button>
                <button onClick={() => { setSelectedAppointment(null); setComment(""); setShowRejectModal(false); }} className="flex-1 bg-gray-200 py-2 rounded-lg">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Modal */}
        {showStatsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between mb-6"><h2 className="text-2xl font-bold">Analytics</h2><button onClick={() => setShowStatsModal(false)}><XCircle className="h-6 w-6 text-gray-400" /></button></div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg"><h3 className="font-semibold mb-4">Daily Trend</h3><div className="h-80"><ResponsiveContainer><BarChart data={getChartData()}><CartesianGrid /><XAxis dataKey="date" /><YAxis /><Tooltip /><Bar dataKey="appointments" fill="#3b82f6" /><Bar dataKey="approved" fill="#10b981" /><Bar dataKey="pending" fill="#f59e0b" /></BarChart></ResponsiveContainer></div></div>
                <div className="bg-gray-50 p-4 rounded-lg"><h3 className="font-semibold mb-4">Weekly Performance</h3><div className="h-80"><ResponsiveContainer><BarChart data={getWeeklyData()}><CartesianGrid /><XAxis dataKey="week" /><YAxis /><Tooltip /><Bar dataKey="total" fill="#3b82f6" /><Bar dataKey="approved" fill="#10b981" /></BarChart></ResponsiveContainer></div></div>
                <div className="bg-gray-50 p-4 rounded-lg"><h3 className="font-semibold mb-4">Status Distribution</h3><div className="h-64"><ResponsiveContainer><RPieChart><Pie data={getPieData()} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" label>{getPieData().map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip /></RPieChart></ResponsiveContainer></div></div>
                <div className="bg-gray-50 p-4 rounded-lg"><h3 className="font-semibold mb-4">Priority Distribution</h3><div className="h-64"><ResponsiveContainer><RPieChart><Pie data={getPriorityPieData()} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" label>{getPriorityPieData().map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip /></RPieChart></ResponsiveContainer></div></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}