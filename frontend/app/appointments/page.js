"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { AppContext } from "../providers";
import api from "../lib/api";
import { 
  Calendar, Clock, CheckCircle, XCircle, ArrowLeft, Search, 
  Loader, CalendarIcon, AlertCircle, Video, ExternalLink, Bell,
  MessageSquare, Info, Sparkles, TrendingUp, Users, Star,
  ChevronRight, Filter, X, Eye, Heart, Shield, Zap
} from "lucide-react";
import toast from "react-hot-toast";
import { format, formatDistance, parseISO, isToday, isTomorrow, isThisWeek, isThisMonth } from "date-fns";

export default function AppointmentsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useContext(AppContext);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({ total: 0, upcoming: 0, pending: 0, approved: 0, rejected: 0 });
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

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
    fetchAppointments();
    fetchStats();
  }, [authLoading, isAuthenticated, user]);

  const fetchAppointments = async () => {
    try {
      const response = await api.get("/appointments/my");
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setAppointments(data);
      
      const newNotifications = [];
      data.forEach(app => {
        if (app.status === "Approved" && app.comment && !localStorage.getItem(`notified_${app.id}`)) {
          newNotifications.push({
            id: app.id,
            type: "approved",
            message: `Your appointment for ${app.serviceName} on ${format(parseISO(app.datetime), 'MMM d, h:mm a')} has been approved!${app.comment ? ` Note: ${app.comment}` : ''}`,
            time: app.updatedAt,
            read: false
          });
          localStorage.setItem(`notified_${app.id}`, "true");
        }
        if (app.status === "Rejected" && app.comment && !localStorage.getItem(`notified_reject_${app.id}`)) {
          newNotifications.push({
            id: app.id,
            type: "rejected",
            message: `Your appointment for ${app.serviceName} was rejected. Reason: ${app.comment}`,
            time: app.updatedAt,
            read: false
          });
          localStorage.setItem(`notified_reject_${app.id}`, "true");
        }
      });
      
      if (newNotifications.length > 0) {
        setNotifications(prev => [...newNotifications, ...prev]);
        setUnreadCount(prev => prev + newNotifications.length);
        newNotifications.forEach(n => toast.info(n.message, { duration: 5000 }));
      }
    } catch (error) {
      toast.error("Failed to fetch appointments");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get("/appointments/stats");
      setStats(response.data);
    } catch (error) {}
  };

  const handleCancel = async (id) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await api.delete(`/appointments/${id}`);
      toast.success("Appointment cancelled successfully");
      fetchAppointments();
      fetchStats();
    } catch (error) {
      toast.error("Failed to cancel appointment");
    }
  };

  const markNotificationAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const clearSearch = () => setSearchTerm("");

  const isSoon = (datetime) => {
    if (!datetime) return false;
    const diffMinutes = (new Date(datetime) - new Date()) / 60000;
    return diffMinutes <= 30 && diffMinutes > 0;
  };

  const isPast = (datetime) => {
    if (!datetime) return false;
    return new Date(datetime) < new Date();
  };

  const getPriorityColor = (priority) => {
    if (priority === "Urgent") return "bg-red-100 text-red-700 border-red-200";
    if (priority === "High") return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  const filteredAppointments = appointments.filter((app) => {
    if (!app) return false;
    if (filter !== "all" && app.status?.toLowerCase() !== filter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return app.serviceName?.toLowerCase().includes(term) || 
             app.providerName?.toLowerCase().includes(term) ||
             app.notes?.toLowerCase().includes(term);
    }
    return true;
  });

  const getStatusBadge = (status, datetime) => {
    const isPastAppointment = isPast(datetime);
    const isSoonAppointment = isSoon(datetime);
    
    if (status === "Approved" && isPastAppointment) {
      return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200"><CheckCircle className="h-3 w-3" /> Completed</span>;
    }
    if (status === "Approved" && isSoonAppointment) {
      return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200 animate-pulse"><AlertCircle className="h-3 w-3" /> Starting Soon</span>;
    }
    switch (status) {
      case "Approved": 
        return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm"><CheckCircle className="h-3 w-3" /> Approved</span>;
      case "Rejected": 
        return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700 border border-rose-200 shadow-sm"><XCircle className="h-3 w-3" /> Rejected</span>;
      default: 
        return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 shadow-sm animate-pulse"><Clock className="h-3 w-3" /> Pending</span>;
    }
  };

  const getPriorityBadge = (priority) => {
    if (!priority || priority === "Normal") return null;
    const colors = getPriorityColor(priority);
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors}`}>
      {priority === "Urgent" ? <Zap className="h-2.5 w-2.5" /> : <TrendingUp className="h-2.5 w-2.5" />}
      {priority}
    </span>;
  };

  const formatDate = (date) => format(parseISO(date), 'EEEE, MMMM d, yyyy');
  const formatTime = (date) => format(parseISO(date), 'h:mm a');

  const completionRate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <p className="text-slate-600 font-medium">Loading your appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()} 
              className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition" /> Back
            </button>
            <div>
              <div className="inline-flex items-center gap-2 bg-indigo-100 rounded-full px-3 py-1 mb-2">
                <Sparkles className="h-3 w-3 text-indigo-600" />
                <span className="text-xs font-semibold text-indigo-600">Appointments</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-800">
                My <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Appointments</span>
              </h1>
              <p className="text-slate-500 mt-1">{greeting}, {user?.name?.split(' ')[0]}! Here's your appointment overview</p>
            </div>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)} 
              className="relative p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-indigo-200 transition shadow-sm"
            >
              <Bell className="h-5 w-5 text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse shadow-md">
                  {unreadCount}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-fadeIn">
                <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50 flex justify-between items-center">
                  <h3 className="font-semibold text-slate-800">Notifications</h3>
                  <button onClick={clearAllNotifications} className="text-xs text-indigo-600 hover:text-indigo-700 transition">Clear all</button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <Bell className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        className={`p-4 border-b border-slate-100 cursor-pointer transition hover:bg-slate-50 ${!n.read ? 'bg-indigo-50/50' : ''}`} 
                        onClick={() => markNotificationAsRead(n.id)}
                      >
                        <div className="flex gap-3">
                          {n.type === 'approved' && <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />}
                          {n.type === 'rejected' && <XCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />}
                          <div className="flex-1">
                            <p className="text-sm text-slate-700 leading-relaxed">{n.message}</p>
                            <p className="text-xs text-slate-400 mt-1">{formatDistance(parseISO(n.time), new Date(), { addSuffix: true })}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-md p-5 border border-slate-100 hover:shadow-lg transition">
            <p className="text-xs text-slate-500 font-medium mb-1">Total</p>
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            <Calendar className="h-4 w-4 text-indigo-500 mt-2" />
          </div>
          <div className="bg-white rounded-2xl shadow-md p-5 border border-slate-100 hover:shadow-lg transition">
            <p className="text-xs text-purple-600 font-medium mb-1">Upcoming</p>
            <p className="text-2xl font-bold text-purple-600">{stats.upcoming}</p>
            <TrendingUp className="h-4 w-4 text-purple-500 mt-2" />
          </div>
          <div className="bg-white rounded-2xl shadow-md p-5 border border-amber-100 hover:shadow-lg transition">
            <p className="text-xs text-amber-600 font-medium mb-1">Pending</p>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <Clock className="h-4 w-4 text-amber-500 mt-2" />
          </div>
          <div className="bg-white rounded-2xl shadow-md p-5 border border-emerald-100 hover:shadow-lg transition">
            <p className="text-xs text-emerald-600 font-medium mb-1">Approved</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
            <CheckCircle className="h-4 w-4 text-emerald-500 mt-2" />
          </div>
          <div className="bg-white rounded-2xl shadow-md p-5 border border-rose-100 hover:shadow-lg transition">
            <p className="text-xs text-rose-600 font-medium mb-1">Rejected</p>
            <p className="text-2xl font-bold text-rose-600">{stats.rejected}</p>
            <XCircle className="h-4 w-4 text-rose-500 mt-2" />
          </div>
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-md p-5 text-white">
            <p className="text-xs text-indigo-200 font-medium mb-1">Success Rate</p>
            <p className="text-2xl font-bold">{completionRate}%</p>
            <Star className="h-4 w-4 text-yellow-300 mt-2" />
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl shadow-lg p-5 mb-6 border border-slate-100">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by service, provider, or notes..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-12 pr-10 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition" 
              />
              {searchTerm && (
                <button onClick={clearSearch} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)} 
              className="px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition"
            >
              <option value="all">📋 All Appointments</option>
              <option value="pending">⏳ Pending</option>
              <option value="approved">✅ Approved</option>
              <option value="rejected">❌ Rejected</option>
            </select>
          </div>
          {searchTerm && (
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
              <Eye className="h-3 w-3" /> Found {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Appointments List */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-12 w-12 text-slate-400" />
              </div>
              <p className="text-slate-600 text-lg font-medium mb-2">No appointments found</p>
              <p className="text-sm text-slate-400 mb-6">
                {searchTerm ? "Try different keywords" : filter !== "all" ? "Change your filter to see more" : "Start by booking your first appointment"}
              </p>
              {searchTerm ? (
                <button onClick={clearSearch} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium">Clear search</button>
              ) : filter !== "all" ? (
                <button onClick={() => setFilter("all")} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium">View all appointments</button>
              ) : (
                <button onClick={() => router.push("/book")} className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition font-medium">Book your first appointment</button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredAppointments.map((app) => (
                <div 
                  key={app.id} 
                  className="p-6 hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-transparent transition cursor-pointer group"
                  onClick={() => { setSelectedAppointment(app); setShowDetailsModal(true); }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-slate-800 text-lg group-hover:text-indigo-600 transition">
                          {app.serviceName}
                        </h3>
                        {getStatusBadge(app.status, app.datetime)}
                        {getPriorityBadge(app.priority)}
                      </div>
                      <p className="text-sm text-slate-600 flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-indigo-500" /> with {app.providerName}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg">
                          <CalendarIcon className="h-3 w-3 text-indigo-500" />
                          {formatDate(app.datetime)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg">
                          <Clock className="h-3 w-3 text-purple-500" />
                          {formatTime(app.datetime)}
                        </span>
                      </div>
                      {app.notes && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                            <p className="text-xs text-slate-600 italic">{app.notes}</p>
                          </div>
                        </div>
                      )}
                      {app.comment && app.status !== "Pending" && (
                        <div className={`mt-3 p-3 rounded-xl flex items-start gap-2 border ${
                          app.status === "Approved" 
                            ? "bg-emerald-50 border-emerald-100" 
                            : "bg-rose-50 border-rose-100"
                        }`}>
                          <MessageSquare className={`h-3.5 w-3.5 mt-0.5 ${
                            app.status === "Approved" ? "text-emerald-500" : "text-rose-500"
                          }`} />
                          <p className={`text-xs ${
                            app.status === "Approved" ? "text-emerald-700" : "text-rose-700"
                          }`}>
                            <span className="font-medium">Staff note:</span> {app.comment}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 lg:ml-4">
                      {app.status === "Pending" && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleCancel(app.id); }} 
                          className="px-4 py-2 text-sm font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all duration-200"
                        >
                          Cancel
                        </button>
                      )}
                      {app.status === "Approved" && app.meetLink && (
                        <a 
                          href={app.meetLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          onClick={(e) => e.stopPropagation()}
                          className="px-4 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all duration-200 flex items-center gap-1"
                        >
                          <Video className="h-4 w-4" /> Join
                        </a>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedAppointment(app); setShowDetailsModal(true); }} 
                        className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all duration-200 flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" /> Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details Modal */}
        {showDetailsModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white border-b border-slate-100 p-6 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Appointment Details</h2>
                  </div>
                  <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition">
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Service</p>
                    <p className="font-semibold text-slate-800">{selectedAppointment.serviceName}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Staff</p>
                    <p className="font-semibold text-slate-800">{selectedAppointment.providerName}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Date & Time</p>
                    <p className="font-semibold text-slate-800">{formatDate(selectedAppointment.datetime)} at {formatTime(selectedAppointment.datetime)}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Status</p>
                    {getStatusBadge(selectedAppointment.status, selectedAppointment.datetime)}
                  </div>
                  {selectedAppointment.priority && selectedAppointment.priority !== "Normal" && (
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <p className="text-xs text-slate-500 mb-1">Priority</p>
                      {getPriorityBadge(selectedAppointment.priority)}
                    </div>
                  )}
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">For</p>
                    <p className="font-semibold text-slate-800">
                      {selectedAppointment.forSelf ? 'Myself' : selectedAppointment.patientName || 'Someone else'}
                    </p>
                  </div>
                </div>

                {selectedAppointment.notes && (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-indigo-500" /> Your Notes
                    </p>
                    <p className="text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">{selectedAppointment.notes}</p>
                  </div>
                )}

                {selectedAppointment.comment && (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-indigo-500" /> Staff Comment
                    </p>
                    <p className={`p-4 rounded-xl border ${
                      selectedAppointment.status === "Approved" 
                        ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                        : "bg-rose-50 border-rose-100 text-rose-700"
                    }`}>
                      {selectedAppointment.comment}
                    </p>
                  </div>
                )}

                {selectedAppointment.status === "Pending" && (
                  <button 
                    onClick={() => handleCancel(selectedAppointment.id)} 
                    className="w-full bg-rose-600 text-white py-3 rounded-xl hover:bg-rose-700 transition font-medium"
                  >
                    Cancel Appointment
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}