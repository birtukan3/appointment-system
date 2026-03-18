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
  AlertCircle,
  User,
  ArrowRight,
  Filter,
  Search,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

export default function UserDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useContext(AppContext);
  
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

  useEffect(() => {
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
  }, [isAuthenticated, user]);

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

  // Filter by status
  const statusFiltered = appointments.filter(app => {
    if (filter === "all") return true;
    return app.status.toLowerCase() === filter.toLowerCase();
  });

  // Search across multiple fields
  const filteredAppointments = statusFiltered.filter(app => {
    if (!searchTerm.trim()) return true;
    
    const term = searchTerm.toLowerCase().trim();
    
    // Search in multiple fields
    return (
      app.serviceName?.toLowerCase().includes(term) ||
      app.providerName?.toLowerCase().includes(term) ||
      app.notes?.toLowerCase().includes(term) ||
      new Date(app.datetime).toLocaleDateString().toLowerCase().includes(term) ||
      new Date(app.datetime).toLocaleTimeString().toLowerCase().includes(term) ||
      app.status?.toLowerCase().includes(term) ||
      app.id?.toString().includes(term)
    );
  });

  // Sort by date
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const dateA = new Date(a.datetime);
    const dateB = new Date(b.datetime);
    return sortBy === "newest" ? dateB - dateA : dateA - dateB;
  });

  const getStatusBadge = (status) => {
    switch(status) {
      case "Approved":
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="h-3 w-3" /> Approved</span>;
      case "Rejected":
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="h-3 w-3" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3" /> Pending</span>;
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  if (loading) {
    return (
      <>
        <ToastProvider />
        <Navbar />
        <div className="min-h-screen flex items-center justify-center pt-16">
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
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl p-8 text-white mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name?.split(" ")[0]}! 👋</h1>
            <p className="text-blue-100">Manage your appointments and stay organized.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <Calendar className="h-4 w-4 text-blue-500 mt-2" />
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-4 border border-yellow-100">
              <p className="text-xs text-yellow-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <Clock className="h-4 w-4 text-yellow-500 mt-2" />
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-4 border border-green-100">
              <p className="text-xs text-green-600 mb-1">Approved</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              <CheckCircle className="h-4 w-4 text-green-500 mt-2" />
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-4 border border-red-100">
              <p className="text-xs text-red-600 mb-1">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              <XCircle className="h-4 w-4 text-red-500 mt-2" />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <button
              onClick={() => router.push("/book")}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition border border-gray-100 text-left group"
            >
              <Calendar className="h-8 w-8 text-blue-600 mb-3 group-hover:scale-110 transition" />
              <h3 className="font-semibold text-gray-900 mb-1">Book Appointment</h3>
              <p className="text-sm text-gray-500">Schedule a new appointment</p>
            </button>

            <button
              onClick={() => router.push("/appointments")}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition border border-gray-100 text-left group"
            >
              <Clock className="h-8 w-8 text-purple-600 mb-3 group-hover:scale-110 transition" />
              <h3 className="font-semibold text-gray-900 mb-1">All Appointments</h3>
              <p className="text-sm text-gray-500">View full history</p>
            </button>

            <button
              onClick={() => router.push("/profile")}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition border border-gray-100 text-left group"
            >
              <User className="h-8 w-8 text-green-600 mb-3 group-hover:scale-110 transition" />
              <h3 className="font-semibold text-gray-900 mb-1">Profile Settings</h3>
              <p className="text-sm text-gray-500">Update your information</p>
            </button>
          </div>

          {/* Search Bar - Enhanced */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by service, provider, date, notes, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-10 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {searchTerm && (
              <p className="text-xs text-gray-500 mt-2">
                Found {sortedAppointments.length} appointment{sortedAppointments.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Filter and Sort Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filter:</span>
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    filter === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 border hover:bg-gray-50"
                  }`}
                >
                  All ({stats.total})
                </button>
                <button
                  onClick={() => setFilter("pending")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    filter === "pending"
                      ? "bg-yellow-600 text-white"
                      : "bg-white text-gray-700 border hover:bg-gray-50"
                  }`}
                >
                  Pending ({stats.pending})
                </button>
                <button
                  onClick={() => setFilter("approved")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    filter === "approved"
                      ? "bg-green-600 text-white"
                      : "bg-white text-gray-700 border hover:bg-gray-50"
                  }`}
                >
                  Approved ({stats.approved})
                </button>
                <button
                  onClick={() => setFilter("rejected")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    filter === "rejected"
                      ? "bg-red-600 text-white"
                      : "bg-white text-gray-700 border hover:bg-gray-50"
                  }`}
                >
                  Rejected ({stats.rejected})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>

          {/* Appointments List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {searchTerm ? "Search Results" : filter === "all" ? "Your Appointments" : `${filter} Appointments`}
              </h2>
              <span className="text-sm text-gray-500">
                Showing {sortedAppointments.length} of {appointments.length}
              </span>
            </div>
            
            <div className="p-4">
              {sortedAppointments.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    {searchTerm 
                      ? "No appointments match your search" 
                      : `No ${filter !== "all" ? filter : ""} appointments found`}
                  </p>
                  {searchTerm ? (
                    <button
                      onClick={clearSearch}
                      className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      Clear search
                    </button>
                  ) : filter !== "all" ? (
                    <button
                      onClick={() => setFilter("all")}
                      className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      View all appointments
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push("/book")}
                      className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      Book your first appointment
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedAppointments.map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-medium text-gray-900">{app.serviceName}</h3>
                          {getStatusBadge(app.status)}
                        </div>
                        <p className="text-sm text-gray-600">with {app.providerName}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(app.datetime).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(app.datetime).toLocaleTimeString()}
                          </span>
                        </div>
                        {app.notes && (
                          <p className="text-xs text-gray-500 mt-2 italic bg-white p-2 rounded">
                            📝 {app.notes}
                          </p>
                        )}
                      </div>
                      {app.status === "Pending" && (
                        <button
                          onClick={() => {
                            setSelectedAppointment(app);
                            setShowCancelModal(true);
                          }}
                          className="ml-4 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* View All Link */}
          {!searchTerm && appointments.length > 5 && sortedAppointments.length === 5 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => router.push("/appointments")}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-1"
              >
                View all appointments <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Cancel Modal */}
        {showCancelModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold mb-4">Cancel Appointment</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to cancel your appointment for <span className="font-semibold">{selectedAppointment.serviceName}</span>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelAppointment}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition"
                >
                  Yes, Cancel
                </button>
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setSelectedAppointment(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  No
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}