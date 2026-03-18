"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { AppContext } from "../providers";
import api from "../lib/api";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Filter,
  Search,
  Eye,
  Star,
} from "lucide-react";

export default function AppointmentsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useContext(AppContext);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchAppointments();
  }, [isAuthenticated]);

  const fetchAppointments = async () => {
    try {
      const response = await api.get("/appointments/my");
      setAppointments(response.data || []);
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await api.delete(`/appointments/${id}`);
      fetchAppointments();
    } catch (error) {
      console.error("Failed to cancel appointment:", error);
    }
  };

  const filteredAppointments = appointments.filter((app) => {
    if (filter !== "all" && app.status?.toLowerCase() !== filter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        app.serviceName?.toLowerCase().includes(term) ||
        app.providerName?.toLowerCase().includes(term)
      );
    }
    return true;
  });

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
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
          <div className="w-20"></div> {/* Spacer */}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search appointments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Appointments List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No appointments found</p>
              <button
                onClick={() => router.push("/book")}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Book an appointment
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredAppointments.map((app) => (
                <div key={app.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {app.serviceName}
                        </h3>
                        {getStatusBadge(app.status)}
                      </div>
                      <p className="text-sm text-gray-600">
                        with {app.providerName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(app.datetime).toLocaleDateString()} at{" "}
                        {new Date(app.datetime).toLocaleTimeString()}
                      </p>
                      {app.notes && (
                        <p className="text-xs text-gray-500 mt-2 italic">
                          "{app.notes}"
                        </p>
                      )}
                      {app.comment && app.status === "Rejected" && (
                        <p className="text-xs text-red-500 mt-2">
                          Reason: {app.comment}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {app.status === "Pending" && (
                        <button
                          onClick={() => handleCancel(app.id)}
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}