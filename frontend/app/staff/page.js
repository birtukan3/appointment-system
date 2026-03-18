"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { AppContext } from "../providers";
import Navbar from "../components/Navbar";
import api from "../lib/api";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Activity,
  Filter,
  Eye,
  Search,
  RefreshCw,
  LogOut,
  Bell,
  Star,
  Phone,
  Mail,
  User,
  CalendarCheck,
  AlertCircle,
  CheckSquare,
  XSquare,
  BarChart3,
  PieChart,
  Download,
  ChevronRight,
  ChevronLeft,
  FileText,
  Tag,
  MapPin,
  Briefcase,
  UserCircle,
  FilterX,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RPieChart,
  Pie,
  Cell,
} from "recharts";

export default function StaffDashboard() {
  const router = useRouter();
  const { user, logout } = useContext(AppContext);

  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    today: 0,
    thisWeek: 0,
    urgent: 0,
    high: 0,
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
  const [detailsAppointment, setDetailsAppointment] = useState(null);
  const [dateRange, setDateRange] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterProvider, setFilterProvider] = useState("all");
  const itemsPerPage = 9;

  const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'staff') {
      router.push('/dashboard');
      return;
    }
    fetchAppointments();
  }, [user]);

  const fetchAppointments = async () => {
    try {
      setRefreshing(true);
      const response = await api.get("/appointments");
      const data = Array.isArray(response.data) ? response.data : [];

      // Staff sees ALL appointments (not filtered by provider)
      setAppointments(data);

      // Calculate stats for ALL appointments
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      setStats({
        total: data.length,
        pending: data.filter((a) => a?.status === "Pending").length,
        approved: data.filter((a) => a?.status === "Approved").length,
        rejected: data.filter((a) => a?.status === "Rejected").length,
        today: data.filter((a) => a?.datetime?.startsWith(today)).length,
        thisWeek: data.filter((a) => new Date(a?.datetime) >= weekAgo).length,
        urgent: data.filter((a) => a?.priority === "Urgent").length,
        high: data.filter((a) => a?.priority === "High").length,
      });
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error(error.response?.data?.message || "Failed to fetch appointments");
      setAppointments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateAppointmentStatus = async (id, status) => {
    if (actionLoading) return;
    
    try {
      setActionLoading(true);
      
      if (!id) {
        toast.error("Invalid appointment ID");
        return;
      }

      const payload = {
        status,
        ...(status === "Rejected" && { comment: comment.trim() }),
      };

      const response = await api.patch(`/appointments/${id}`, payload);

      if (response.data) {
        toast.success(
          <div className="flex items-center gap-2">
            {status === "Approved" ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <span>Appointment {status.toLowerCase()} successfully</span>
          </div>
        );

        setComment("");
        setSelectedAppointment(null);
        setShowDetailsModal(false);
        await fetchAppointments();
      }
    } catch (error) {
      console.error("Update error:", error);
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

  const clearAllFilters = () => {
    setFilter("all");
    setSearchTerm("");
    setDateRange("all");
    setFilterProvider("all");
    setCurrentPage(1);
  };

  // Filter and search logic
  const filteredAppointments = appointments.filter((app) => {
    if (!app) return false;

    // Provider filter (optional - staff can filter by provider)
    if (filterProvider !== "all" && app.providerName !== filterProvider) {
      return false;
    }

    // Status filter
    if (filter !== "all" && app.status?.toLowerCase() !== filter) {
      return false;
    }

    // Date range filter
    if (dateRange !== "all") {
      const appDate = new Date(app.datetime);
      const today = new Date();

      switch (dateRange) {
        case "today":
          if (appDate.toDateString() !== today.toDateString()) return false;
          break;
        case "week":
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (appDate < weekAgo) return false;
          break;
        case "month":
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          if (appDate < monthAgo) return false;
          break;
      }
    }

    // Search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        app.serviceName?.toLowerCase().includes(term) ||
        app.providerName?.toLowerCase().includes(term) ||
        app.userEmail?.toLowerCase().includes(term) ||
        app.id?.toString().includes(term) ||
        app.notes?.toLowerCase().includes(term) ||
        app.priority?.toLowerCase().includes(term)
      );
    }

    return true;
  });

  // Get unique providers for filter dropdown
  const uniqueProviders = [...new Set(appointments.map(app => app.providerName).filter(Boolean))];

  // Pagination
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Chart data preparation
  const getChartData = () => {
    const last7Days = [...Array(7)]
      .map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split("T")[0];
      })
      .reverse();

    return last7Days.map((date) => {
      const dayApps = appointments.filter((a) => a.datetime?.startsWith(date));
      return {
        date: new Date(date).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        appointments: dayApps.length,
        approved: dayApps.filter((a) => a.status === "Approved").length,
        pending: dayApps.filter((a) => a.status === "Pending").length,
      };
    });
  };

  const getPieData = () => [
    { name: "Approved", value: stats.approved, color: "#10b981" },
    { name: "Pending", value: stats.pending, color: "#f59e0b" },
    { name: "Rejected", value: stats.rejected, color: "#ef4444" },
  ];

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "Urgent":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
            <AlertCircle className="h-3 w-3" />
            Urgent
          </span>
        );
      case "High":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
            <AlertCircle className="h-3 w-3" />
            High
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="h-3 w-3" />
            Normal
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
            <CheckCircle className="h-3 w-3" />
            Approved
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
            <XCircle className="h-3 w-3" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with Actions */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Staff Dashboard
              </h1>
              <p className="text-gray-600 mt-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Welcome back, <span className="font-semibold text-primary-600">{user?.name}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Viewing all {appointments.length} appointments in the system
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="btn-secondary flex items-center gap-2 px-4 py-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                onClick={() => setShowStatsModal(true)}
                className="btn-secondary flex items-center gap-2 px-4 py-2"
              >
                <BarChart3 className="h-4 w-4" />
                Statistics
              </button>
              <button
                onClick={handleLogout}
                className="btn-danger flex items-center gap-2 px-4 py-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition cursor-pointer active:scale-95"
                 onClick={() => setFilter("all")}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500">Total</p>
                <Calendar className="h-4 w-4 text-primary-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-400 mt-1">All appointments</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 border border-yellow-100 hover:shadow-md transition cursor-pointer active:scale-95"
                 onClick={() => setFilter("pending")}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-yellow-600">Pending</p>
                <Clock className="h-4 w-4 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-xs text-gray-400 mt-1">Need review</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 border border-green-100 hover:shadow-md transition cursor-pointer active:scale-95"
                 onClick={() => setFilter("approved")}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-green-600">Approved</p>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              <p className="text-xs text-gray-400 mt-1">Confirmed</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 border border-red-100 hover:shadow-md transition cursor-pointer active:scale-95"
                 onClick={() => setFilter("rejected")}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-red-600">Rejected</p>
                <XCircle className="h-4 w-4 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              <p className="text-xs text-gray-400 mt-1">Cancelled</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 border border-purple-100 hover:shadow-md transition cursor-pointer active:scale-95"
                 onClick={() => setDateRange("today")}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-purple-600">Today</p>
                <Star className="h-4 w-4 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-purple-600">{stats.today}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleDateString()}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 border border-indigo-100 hover:shadow-md transition cursor-pointer active:scale-95"
                 onClick={() => setDateRange("week")}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-indigo-600">This Week</p>
                <Activity className="h-4 w-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-bold text-indigo-600">{stats.thisWeek}</p>
              <p className="text-xs text-gray-400 mt-1">Last 7 days</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 border border-orange-100 hover:shadow-md transition cursor-pointer active:scale-95">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-orange-600">Urgent</p>
                <AlertCircle className="h-4 w-4 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-orange-600">{stats.urgent}</p>
              <p className="text-xs text-gray-400 mt-1">High priority</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100 hover:shadow-md transition cursor-pointer active:scale-95">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-blue-600">High</p>
                <AlertCircle className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats.high}</p>
              <p className="text-xs text-gray-400 mt-1">Medium priority</p>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by service, client, provider, priority..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                {/* Provider Filter */}
                <select
                  value={filterProvider}
                  onChange={(e) => setFilterProvider(e.target.value)}
                  className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-base min-w-[140px]"
                >
                  <option value="all">All Providers</option>
                  <option value={user?.name}>My Appointments</option>
                  {uniqueProviders.filter(p => p !== user?.name).map(provider => (
                    <option key={provider} value={provider}>{provider}</option>
                  ))}
                </select>

                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-base min-w-[140px]"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>

                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-base min-w-[140px]"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>

                <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`px-4 py-3 text-base ${
                      viewMode === "grid"
                        ? "bg-primary-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    } transition min-w-[70px]`}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`px-4 py-3 text-base ${
                      viewMode === "list"
                        ? "bg-primary-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    } transition min-w-[70px]`}
                  >
                    List
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filters Display */}
            {(searchTerm || filter !== "all" || dateRange !== "all" || filterProvider !== "all") && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-gray-600">Active filters:</span>
                {filterProvider !== "all" && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm">
                    Provider: {filterProvider === user?.name ? 'My appointments' : filterProvider}
                    <button onClick={() => setFilterProvider("all")} className="ml-1 hover:text-primary-900">
                      ×
                    </button>
                  </span>
                )}
                {filter !== "all" && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm">
                    Status: {filter}
                    <button onClick={() => setFilter("all")} className="ml-1 hover:text-primary-900">
                      ×
                    </button>
                  </span>
                )}
                {dateRange !== "all" && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm">
                    Period: {dateRange}
                    <button onClick={() => setDateRange("all")} className="ml-1 hover:text-primary-900">
                      ×
                    </button>
                  </span>
                )}
                {searchTerm && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm">
                    Search: "{searchTerm}"
                    <button onClick={() => setSearchTerm("")} className="ml-1 hover:text-primary-900">
                      ×
                    </button>
                  </span>
                )}
                <button
                  onClick={clearAllFilters}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium ml-2 flex items-center gap-1"
                >
                  <FilterX className="h-3 w-3" />
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Appointments Display */}
          {filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No appointments found</h3>
              <p className="text-gray-500 mb-6">Try adjusting your filters or search criteria</p>
              <button
                onClick={clearAllFilters}
                className="btn-primary px-6 py-3 text-base"
              >
                Clear Filters
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedAppointments.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 overflow-hidden cursor-pointer active:scale-[0.98]"
                    onClick={() => handleViewDetails(app)}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-1">
                            {app.serviceName}
                          </h3>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <UserCircle className="h-4 w-4" />
                            {app.providerName}
                          </p>
                        </div>
                        {getPriorityBadge(app.priority)}
                      </div>

                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="truncate">{app.userEmail}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{new Date(app.datetime).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{new Date(app.datetime).toLocaleTimeString()}</span>
                        </div>
                        {app.age && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span>Age: {app.age} • {app.gender || 'N/A'}</span>
                          </div>
                        )}
                      </div>

                      {app.notes && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                          <p className="text-gray-600 line-clamp-2 italic">
                            "{app.notes}"
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        {getStatusBadge(app.status)}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(app);
                          }}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                        >
                          View Details <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex justify-center items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-lg ${
                          currentPage === pageNum
                            ? "bg-primary-600 text-white"
                            : "border border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Provider
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedAppointments.map((app) => (
                      <tr 
                        key={app.id} 
                        className="hover:bg-gray-50 transition cursor-pointer"
                        onClick={() => handleViewDetails(app)}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{app.serviceName}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">{app.userEmail}</div>
                          {app.age && (
                            <div className="text-xs text-gray-400">
                              {app.age} yrs • {app.gender}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">{app.providerName}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">
                            {new Date(app.datetime).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(app.datetime).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getPriorityBadge(app.priority)}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(app.status)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {app.status === "Pending" && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateAppointmentStatus(app.id, "Approved");
                                  }}
                                  className="text-green-600 hover:text-green-700 p-2 rounded-full hover:bg-green-50"
                                  title="Approve"
                                  disabled={actionLoading}
                                >
                                  <CheckCircle className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAppointment(app);
                                  }}
                                  className="text-red-600 hover:text-red-700 p-2 rounded-full hover:bg-red-50"
                                  title="Reject"
                                  disabled={actionLoading}
                                >
                                  <XCircle className="h-5 w-5" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(app);
                              }}
                              className="text-primary-600 hover:text-primary-700 p-2 rounded-full hover:bg-primary-50"
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
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex justify-center items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Enhanced Details Modal */}
          {showDetailsModal && detailsAppointment && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-fadeIn">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Appointment Details</h2>
                      <p className="text-sm text-gray-500">ID: #{detailsAppointment.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Service Info */}
                  <div className="bg-gradient-to-r from-primary-50 to-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary-600" />
                      Service Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Service</p>
                        <p className="font-medium text-gray-900">{detailsAppointment.serviceName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Provider</p>
                        <p className="font-medium text-gray-900">{detailsAppointment.providerName}</p>
                      </div>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <User className="h-5 w-5 text-primary-600" />
                      Client Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium text-gray-900 flex items-center gap-1">
                          <Mail className="h-4 w-4 text-gray-400" />
                          {detailsAppointment.userEmail}
                        </p>
                      </div>
                      {detailsAppointment.age && (
                        <div>
                          <p className="text-sm text-gray-500">Age/Gender</p>
                          <p className="font-medium text-gray-900">
                            {detailsAppointment.age} years • {detailsAppointment.gender || 'N/A'}
                          </p>
                        </div>
                      )}
                      {detailsAppointment.company && (
                        <div>
                          <p className="text-sm text-gray-500">Company</p>
                          <p className="font-medium text-gray-900 flex items-center gap-1">
                            <Briefcase className="h-4 w-4 text-gray-400" />
                            {detailsAppointment.company}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Appointment Details */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary-600" />
                      Appointment Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Date</p>
                        <p className="font-medium text-gray-900">
                          {new Date(detailsAppointment.datetime).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Time</p>
                        <p className="font-medium text-gray-900">
                          {new Date(detailsAppointment.datetime).toLocaleTimeString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Priority</p>
                        <div className="mt-1">{getPriorityBadge(detailsAppointment.priority)}</div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">For</p>
                        <p className="font-medium text-gray-900">
                          {detailsAppointment.forSelf ? 'Self' : 'Someone else'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Notes Section */}
                  {detailsAppointment.notes && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary-600" />
                        Client Notes
                      </h3>
                      <p className="text-gray-700 bg-white p-3 rounded-lg border border-gray-200">
                        {detailsAppointment.notes}
                      </p>
                    </div>
                  )}

                  {/* Staff Comment */}
                  {detailsAppointment.comment && (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        Staff Comment
                      </h3>
                      <p className="text-gray-700 bg-white p-3 rounded-lg border border-red-200">
                        {detailsAppointment.comment}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {detailsAppointment.status === "Pending" && (
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Comment (required for rejection)
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows="3"
                        className="input-field w-full mb-4"
                        placeholder="Enter reason for rejection..."
                      />
                      
                      <div className="flex gap-3">
                        <button
                          onClick={() => updateAppointmentStatus(detailsAppointment.id, "Approved")}
                          className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                          disabled={actionLoading}
                        >
                          <CheckCircle className="h-5 w-5" />
                          {actionLoading ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => updateAppointmentStatus(detailsAppointment.id, "Rejected")}
                          className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                          disabled={!comment.trim() || actionLoading}
                        >
                          <XCircle className="h-5 w-5" />
                          {actionLoading ? 'Processing...' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  )}

                  {detailsAppointment.status !== "Pending" && (
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={() => setShowDetailsModal(false)}
                        className="btn-primary px-6 py-3"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Rejection Modal */}
          {selectedAppointment && !showDetailsModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl max-w-md w-full p-6 animate-fadeIn">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Reject Appointment</h3>
                </div>

                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Service:</span> {selectedAppointment.serviceName}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Client:</span> {selectedAppointment.userEmail}
                  </p>
                </div>

                <p className="text-gray-600 mb-3">Please provide a reason for rejection:</p>

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="input-field w-full h-24 resize-none mb-4"
                  placeholder="Reason for rejection (required)..."
                  autoFocus
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => updateAppointmentStatus(selectedAppointment.id, "Rejected")}
                    className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!comment.trim() || actionLoading}
                  >
                    {actionLoading ? 'Processing...' : 'Confirm Rejection'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAppointment(null);
                      setComment("");
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Statistics Modal */}
          {showStatsModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Appointment Statistics</h2>
                  <button
                    onClick={() => setShowStatsModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Bar Chart */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary-600" />
                      Daily Trend (Last 7 Days)
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getChartData()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="date" stroke="#6b7280" />
                          <YAxis stroke="#6b7280" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "white",
                              border: "1px solid #e5e7eb",
                              borderRadius: "8px",
                            }}
                          />
                          <Bar dataKey="appointments" fill="#3b82f6" name="Total" />
                          <Bar dataKey="approved" fill="#10b981" name="Approved" />
                          <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Pie Chart */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-primary-600" />
                      Status Distribution
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RPieChart>
                          <Pie
                            data={getPieData()}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {getPieData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RPieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-primary-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-primary-600">{stats.total}</p>
                    <p className="text-xs text-gray-600">Total</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                    <p className="text-xs text-gray-600">Pending</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                    <p className="text-xs text-gray-600">Approved</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                    <p className="text-xs text-gray-600">Rejected</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {stats.total ? ((stats.approved / stats.total) * 100).toFixed(1) : 0}%
                    </p>
                    <p className="text-xs text-gray-600">Success Rate</p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowStatsModal(false)}
                    className="btn-primary px-6 py-2"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          .animate-fadeIn {
            animation: fadeIn 0.2s ease-out;
          }
        `}</style>
      </div>
    </>
  );
}