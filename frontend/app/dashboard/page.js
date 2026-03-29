"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { AppContext } from "../providers";
import Navbar from "../components/Navbar";
import ToastProvider from "../components/ToastProvider";
import api from "../lib/api";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  User,
  ArrowRight,
  Filter,
  Search,
  X,
  TrendingUp,
  CalendarDays,
  Briefcase,
  MessageSquare,
  Star,
  Award,
  Bell,
  Eye,
  ChevronRight,
  Sparkles,
  Shield,
  Zap,
  Heart,
  Activity,
  Users,
  DollarSign,
  Target,
  Gift,
  Coffee,
  Smile,
  Sun,
  Moon,
  Palette
} from "lucide-react";
import toast from "react-hot-toast";

export default function UserDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useContext(AppContext);
  
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
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
      if (user?.role === "admin") router.push("/admin");
      if (user?.role === "staff") router.push("/staff");
      return;
    }
    fetchUserData();
  }, [authLoading, isAuthenticated, user, router]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const appointmentsRes = await api.get("/appointments/my");
      const appointmentsData = appointmentsRes.data || [];
      setAppointments(appointmentsData);

      setStats({
        total: appointmentsData.length,
        pending: appointmentsData.filter(a => a.status === "Pending").length,
        approved: appointmentsData.filter(a => a.status === "Approved").length,
        rejected: appointmentsData.filter(a => a.status === "Rejected").length,
      });

    } catch (error) {
      console.error("Failed to fetch user data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;
    
    try {
      await api.delete(`/appointments/${selectedAppointment.id}`);
      toast.success("Appointment cancelled successfully");
      setShowCancelModal(false);
      setSelectedAppointment(null);
      fetchUserData();
    } catch (error) {
      toast.error("Failed to cancel appointment");
    }
  };

  const statusFiltered = appointments.filter(app => {
    if (filter === "all") return true;
    return app.status?.toLowerCase() === filter.toLowerCase();
  });

  const filteredAppointments = statusFiltered.filter(app => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      app.serviceName?.toLowerCase().includes(term) ||
      app.providerName?.toLowerCase().includes(term) ||
      app.notes?.toLowerCase().includes(term) ||
      (app.datetime && new Date(app.datetime).toLocaleDateString().toLowerCase().includes(term)) ||
      (app.datetime && new Date(app.datetime).toLocaleTimeString().toLowerCase().includes(term)) ||
      app.status?.toLowerCase().includes(term)
    );
  });

  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const dateA = new Date(a.datetime);
    const dateB = new Date(b.datetime);
    return sortBy === "newest" ? dateB - dateA : dateA - dateB;
  });

  const getStatusBadge = (status) => {
    switch(status) {
      case "Approved":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm"><CheckCircle className="h-3 w-3" /> Approved</span>;
      case "Rejected":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 shadow-sm"><XCircle className="h-3 w-3" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 shadow-sm"><Clock className="h-3 w-3" /> Pending</span>;
    }
  };

  const getPriorityBadge = (priority) => {
    if (priority === "Urgent") {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 border border-red-200"><Zap className="h-2.5 w-2.5" /> Urgent</span>;
    }
    if (priority === "High") {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-600 border border-orange-200"><TrendingUp className="h-2.5 w-2.5" /> High</span>;
    }
    return null;
  };

  const clearSearch = () => setSearchTerm("");

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const upcomingAppointments = appointments.filter(a => 
    a.status === "Approved" && a.datetime && new Date(a.datetime) > new Date()
  ).length;

  const completionRate = stats.total > 0 
    ? Math.round((stats.approved / stats.total) * 100) 
    : 0;

  if (authLoading || loading) {
    return (
      <>
        <ToastProvider />
        <Navbar />
        <div className="min-h-screen flex items-center justify-center pt-16 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-indigo-400 animate-pulse" />
              </div>
            </div>
            <p className="text-slate-600 font-medium">Loading your dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ToastProvider />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-3xl mb-8 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-2xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
            <div className="relative px-8 py-10 md:py-12">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <Sparkles className="h-8 w-8 text-yellow-300 animate-pulse" />
                    <span className="text-yellow-200 font-medium text-sm uppercase tracking-wider">{greeting}</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                    {user?.name?.split(" ")[0] || "User"}! 👋
                  </h1>
                  <p className="text-indigo-100 text-lg">Welcome to your SmartOffice dashboard</p>
                  <div className="flex flex-wrap gap-3 mt-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white">
                      <Star className="h-3.5 w-3.5 text-yellow-300" /> Premium Member
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white">
                      <Award className="h-3.5 w-3.5 text-yellow-300" /> {stats.total} Appointments
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white">
                      <Users className="h-3.5 w-3.5 text-yellow-300" /> Active Member
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 text-center">
                    <p className="text-2xl font-bold text-white">{stats.approved}</p>
                    <p className="text-xs text-indigo-200">Completed</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 text-center">
                    <p className="text-2xl font-bold text-white">{completionRate}%</p>
                    <p className="text-xs text-indigo-200">Success Rate</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-5 mb-8">
            <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-500 font-medium">Total</p>
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl group-hover:scale-110 transition shadow-md">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
              <p className="text-xs text-slate-400 mt-1">All appointments</p>
            </div>
            
            <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-amber-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-amber-600 font-medium">Pending</p>
                <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl group-hover:scale-110 transition shadow-md">
                  <Clock className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
              <p className="text-xs text-slate-400 mt-1">Awaiting approval</p>
            </div>
            
            <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-emerald-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-emerald-600 font-medium">Approved</p>
                <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl group-hover:scale-110 transition shadow-md">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-emerald-600">{stats.approved}</p>
              <p className="text-xs text-slate-400 mt-1">Confirmed</p>
            </div>
            
            <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-purple-600 font-medium">Upcoming</p>
                <div className="p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl group-hover:scale-110 transition shadow-md">
                  <CalendarDays className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-purple-600">{upcomingAppointments}</p>
              <p className="text-xs text-slate-400 mt-1">Coming soon</p>
            </div>
            
            <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-teal-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-teal-600 font-medium">Success Rate</p>
                <div className="p-2.5 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl group-hover:scale-110 transition shadow-md">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-teal-600">{completionRate}%</p>
              <p className="text-xs text-slate-400 mt-1">Completion rate</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <button
              onClick={() => router.push("/book")}
              className="group relative overflow-hidden bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 text-left"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-white/20 rounded-xl group-hover:scale-110 transition">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-white text-xl">Book Appointment</h3>
                </div>
                <p className="text-indigo-100 text-sm">Schedule a new appointment with our expert staff</p>
                <div className="mt-4 flex items-center gap-1 text-white/90 text-sm group-hover:gap-2 transition-all">
                  Get Started <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push("/appointments")}
              className="group relative overflow-hidden bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 text-left"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-white/20 rounded-xl group-hover:scale-110 transition">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-white text-xl">All Appointments</h3>
                </div>
                <p className="text-purple-100 text-sm">View your complete appointment history</p>
                <div className="mt-4 flex items-center gap-1 text-white/90 text-sm group-hover:gap-2 transition-all">
                  View History <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push("/profile")}
              className="group relative overflow-hidden bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 text-left"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-white/20 rounded-xl group-hover:scale-110 transition">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-white text-xl">Profile Settings</h3>
                </div>
                <p className="text-emerald-100 text-sm">Update your personal information</p>
                <div className="mt-4 flex items-center gap-1 text-white/90 text-sm group-hover:gap-2 transition-all">
                  Edit Profile <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </button>
          </div>

          {/* Search Section */}
          <div className="bg-white rounded-2xl shadow-xl p-5 mb-6 border border-slate-100">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by service, provider, date, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-12 py-3.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition"
              />
              {searchTerm && (
                <button onClick={clearSearch} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            {searchTerm && (
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <Eye className="h-3 w-3" /> Found {sortedAppointments.length} appointment{sortedAppointments.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Filter:</span>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filter === "all" ? "bg-indigo-600 text-white shadow-md" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>All ({stats.total})</button>
                <button onClick={() => setFilter("pending")} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filter === "pending" ? "bg-amber-600 text-white shadow-md" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>Pending ({stats.pending})</button>
                <button onClick={() => setFilter("approved")} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filter === "approved" ? "bg-emerald-600 text-white shadow-md" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>Approved ({stats.approved})</button>
                <button onClick={() => setFilter("rejected")} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filter === "rejected" ? "bg-rose-600 text-white shadow-md" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>Rejected ({stats.rejected})</button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Sort:</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>

          {/* Appointments List */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-indigo-600" />
                  {searchTerm ? "Search Results" : filter === "all" ? "Your Appointments" : `${filter} Appointments`}
                </h2>
                <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {sortedAppointments.length} of {appointments.length}
                </span>
              </div>
            </div>
            
            <div className="p-5">
              {sortedAppointments.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-28 h-28 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-5">
                    <Calendar className="h-12 w-12 text-slate-400" />
                  </div>
                  <p className="text-slate-600 text-lg font-medium mb-2">
                    {searchTerm ? "No appointments match your search" : `No ${filter !== "all" ? filter : ""} appointments found`}
                  </p>
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
                <div className="space-y-4">
                  {sortedAppointments.map((app) => (
                    <div key={app.id} className="group bg-white border border-slate-100 rounded-xl p-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-semibold text-slate-800 text-lg">{app.serviceName}</h3>
                            {getStatusBadge(app.status)}
                            {getPriorityBadge(app.priority)}
                          </div>
                          <p className="text-sm text-slate-600 flex items-center gap-1">
                            <Briefcase className="h-3.5 w-3.5 text-indigo-500" /> with {app.providerName}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg">
                              <Calendar className="h-3 w-3 text-indigo-500" />
                              {formatDate(app.datetime)}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg">
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
                            <div className={`mt-3 p-3 rounded-xl flex items-start gap-2 ${app.status === "Approved" ? "bg-emerald-50 border border-emerald-100" : "bg-rose-50 border border-rose-100"}`}>
                              <MessageSquare className={`h-3.5 w-3.5 mt-0.5 ${app.status === "Approved" ? "text-emerald-500" : "text-rose-500"}`} />
                              <p className={`text-xs ${app.status === "Approved" ? "text-emerald-700" : "text-rose-700"}`}>
                                <span className="font-medium">Staff note:</span> {app.comment}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {app.status === "Pending" && (
                            <button
                              onClick={() => {
                                setSelectedAppointment(app);
                                setShowCancelModal(true);
                              }}
                              className="px-4 py-2 text-sm font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all duration-200"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedAppointment(app);
                              setShowDetailsModal(true);
                            }}
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
          </div>

          {!searchTerm && appointments.length > 5 && sortedAppointments.length === 5 && (
            <div className="mt-6 text-center">
              <button onClick={() => router.push("/appointments")} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium inline-flex items-center gap-1 group">
                View all appointments <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
              </button>
            </div>
          )}
        </div>

        {/* Cancel Modal */}
        {showCancelModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl transform animate-scaleIn">
              <div className="text-center">
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="h-8 w-8 text-rose-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Cancel Appointment</h3>
                <p className="text-slate-600 mb-4">
                  Are you sure you want to cancel your appointment for <span className="font-semibold text-slate-800">{selectedAppointment.serviceName}</span>?
                </p>
                <div className="flex gap-3">
                  <button onClick={handleCancelAppointment} className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl hover:bg-rose-700 transition font-medium">Yes, Cancel</button>
                  <button onClick={() => { setShowCancelModal(false); setSelectedAppointment(null); }} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl hover:bg-slate-200 transition font-medium">No, Keep</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Appointment Details</h2>
                    <p className="text-sm text-slate-500">ID: #{selectedAppointment.id}</p>
                  </div>
                </div>
                <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl"><p className="text-xs text-slate-500 mb-1">Service</p><p className="font-semibold text-slate-800">{selectedAppointment.serviceName}</p></div>
                  <div className="bg-slate-50 p-4 rounded-xl"><p className="text-xs text-slate-500 mb-1">Provider</p><p className="font-semibold text-slate-800">{selectedAppointment.providerName}</p></div>
                  <div className="bg-slate-50 p-4 rounded-xl"><p className="text-xs text-slate-500 mb-1">Date & Time</p><p className="font-semibold text-slate-800">{formatDate(selectedAppointment.datetime)} at {formatTime(selectedAppointment.datetime)}</p></div>
                  <div className="bg-slate-50 p-4 rounded-xl"><p className="text-xs text-slate-500 mb-1">Status</p><div>{getStatusBadge(selectedAppointment.status)}</div></div>
                  <div className="bg-slate-50 p-4 rounded-xl"><p className="text-xs text-slate-500 mb-1">Priority</p><p className="font-semibold text-slate-800">{selectedAppointment.priority || 'Normal'}</p></div>
                  <div className="bg-slate-50 p-4 rounded-xl"><p className="text-xs text-slate-500 mb-1">For</p><p className="font-semibold text-slate-800">{selectedAppointment.forSelf ? 'Myself' : selectedAppointment.patientName || 'Someone else'}</p></div>
                </div>

                {selectedAppointment.notes && (
                  <div><p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1"><MessageSquare className="h-4 w-4" /> Your Notes</p><p className="text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">{selectedAppointment.notes}</p></div>
                )}

                {selectedAppointment.comment && (
                  <div><p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1"><Shield className="h-4 w-4" /> Staff Comment</p><p className={`p-4 rounded-xl border ${selectedAppointment.status === "Approved" ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-100 text-rose-700"}`}>{selectedAppointment.comment}</p></div>
                )}

                {selectedAppointment.status === "Pending" && (
                  <button onClick={() => { setShowCancelModal(true); setShowDetailsModal(false); }} className="w-full bg-rose-600 text-white py-3 rounded-xl hover:bg-rose-700 transition font-medium">Cancel Appointment</button>
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
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
}