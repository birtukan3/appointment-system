// frontend/app/admin/components/AuditDashboard.jsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { showSuccess, showError } from '../../lib/toastUtils';
import {
  Activity,
  Search,
  Filter,
  DAownload,
  RefreshCw,
  Eye,
  AlertTriangle,
  Shield,
  User,
  Mail,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  TrendingUp,
  BarChart3,
  PieChart,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Smartphone,
  Monitor,
  Globe,
  CalendarDays,
  FileText,
  Trash2,
} from 'lucide-react';
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
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';

const actionTypeColors = {
  LOGIN: 'text-green-600 bg-green-100',
  LOGOUT: 'text-gray-600 bg-gray-100',
  FAILED_LOGIN: 'text-red-600 bg-red-100',
  CREATE_APPOINTMENT: 'text-blue-600 bg-blue-100',
  UPDATE_APPOINTMENT: 'text-purple-600 bg-purple-100',
  DELETE_APPOINTMENT: 'text-red-600 bg-red-100',
  APPROVE_APPOINTMENT: 'text-emerald-600 bg-emerald-100',
  REJECT_APPOINTMENT: 'text-rose-600 bg-rose-100',
  CREATE_STAFF: 'text-teal-600 bg-teal-100',
  DELETE_STAFF: 'text-orange-600 bg-orange-100',
  UPLOAD_FILE: 'text-cyan-600 bg-cyan-100',
  UPDATE_PROFILE: 'text-indigo-600 bg-indigo-100',
  CHANGE_PASSWORD: 'text-amber-600 bg-amber-100',
  SEND_ANNOUNCEMENT: 'text-pink-600 bg-pink-100',
  VIEW_AUDIT_LOGS: 'text-slate-600 bg-slate-100',
};

const statusColors = {
  SUCCESS: 'text-emerald-600 bg-emerald-100',
  FAILURE: 'text-red-600 bg-red-100',
};

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function AuditDashboard() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [failedLogins, setFailedLogins] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeTab, setActiveTab] = useState('logs');
  const [exporting, setExporting] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    userEmail: '',
    userRole: '',
    actionType: '',
    actionCategory: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getAuditLogs({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });
      setLogs(response.data || []);
      setPagination(response.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      showError('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const statsData = await api.getAuditStats(filters.startDate, filters.endDate);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, [filters.startDate, filters.endDate]);

  const fetchFailedLogins = useCallback(async () => {
    try {
      const data = await api.getFailedLogins(24, 50);
      setFailedLogins(data);
    } catch (error) {
      console.error('Failed to fetch failed logins:', error);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    } else if (activeTab === 'stats') {
      fetchStats();
    } else if (activeTab === 'security') {
      fetchFailedLogins();
    }
  }, [activeTab, fetchLogs, fetchStats, fetchFailedLogins]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const applyFilters = () => {
    fetchLogs();
    setShowFilters(false);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      userEmail: '',
      userRole: '',
      actionType: '',
      actionCategory: '',
      status: '',
      startDate: '',
      endDate: '',
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    setTimeout(() => fetchLogs(), 100);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.exportAuditLogs(filters);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccess('Export completed successfully');
    } catch (error) {
      showError('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleCleanOldLogs = async () => {
    if (!confirm('Are you sure you want to delete audit logs older than 90 days? This action cannot be undone.')) {
      return;
    }
    
    setCleaning(true);
    try {
      const result = await api.cleanOldAuditLogs(90);
      showSuccess(result.message || `Cleaned ${result.deletedCount} old logs`);
      fetchLogs();
      fetchStats();
    } catch (error) {
      showError('Failed to clean old logs');
    } finally {
      setCleaning(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  const getDeviceIcon = (deviceInfo) => {
    if (!deviceInfo) return <Monitor className="h-4 w-4" />;
    if (deviceInfo.device === 'Mobile') return <Smartphone className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const actionTypeChartData = stats?.byActionType?.slice(0, 10) || [];
  const statusChartData = stats?.byStatus || [];
  const dailyActivityData = stats?.dailyActivity || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
            <Activity className="h-6 w-6 text-indigo-600" />
            Audit & Activity Monitoring
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Track all user activities, security events, and system actions
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'logs'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Activity className="h-4 w-4 inline mr-2" />
            Activity Logs
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'stats'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="h-4 w-4 inline mr-2" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'security'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Shield className="h-4 w-4 inline mr-2" />
            Security
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {Object.values(filters).some(v => v) && (
              <span className="ml-1 w-2 h-2 bg-indigo-600 rounded-full"></span>
            )}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            onClick={handleCleanOldLogs}
            disabled={cleaning}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition flex items-center gap-2 text-amber-600 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {cleaning ? 'Cleaning...' : 'Clean Old Logs'}
          </button>
        </div>
        <button
          onClick={activeTab === 'logs' ? fetchLogs : activeTab === 'stats' ? fetchStats : fetchFailedLogins}
          className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && activeTab === 'logs' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search in description..."
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">User Email</label>
              <input
                type="text"
                value={filters.userEmail}
                onChange={(e) => handleFilterChange('userEmail', e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">User Role</label>
              <select
                value={filters.userRole}
                onChange={(e) => handleFilterChange('userRole', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="user">User</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Action Type</label>
              <select
                value={filters.actionType}
                onChange={(e) => handleFilterChange('actionType', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Actions</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
                <option value="FAILED_LOGIN">Failed Login</option>
                <option value="CREATE_APPOINTMENT">Create Appointment</option>
                <option value="UPDATE_APPOINTMENT">Update Appointment</option>
                <option value="APPROVE_APPOINTMENT">Approve Appointment</option>
                <option value="REJECT_APPOINTMENT">Reject Appointment</option>
                <option value="CREATE_STAFF">Create Staff</option>
                <option value="DELETE_STAFF">Delete Staff</option>
                <option value="UPLOAD_FILE">Upload File</option>
                <option value="UPDATE_PROFILE">Update Profile</option>
                <option value="CHANGE_PASSWORD">Change Password</option>
                <option value="SEND_ANNOUNCEMENT">Send Announcement</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Status</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILURE">Failure</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Reset
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* LOGS TAB */}
      {activeTab === 'logs' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <p className="text-xs text-gray-500">Total Logs</p>
              <p className="text-2xl font-bold text-gray-800">{pagination.total}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <p className="text-xs text-gray-500">Success Rate</p>
              <p className="text-2xl font-bold text-green-600">
                {stats?.byStatus?.find(s => s.name === 'SUCCESS')?.value || 0}%
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <p className="text-xs text-gray-500">Failed Logins</p>
              <p className="text-2xl font-bold text-red-600">
                {stats?.failedLoginCount || 0}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <p className="text-xs text-gray-500">Active Users Tracked</p>
              <p className="text-2xl font-bold text-purple-600">
                {stats?.topActiveUsers?.length || 0}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mx-auto"></div>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                        <Activity className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        No audit logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            {formatDate(log.createdAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{log.userName || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{log.userEmail}</p>
                            {log.userRole && (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                log.userRole === 'admin' ? 'bg-purple-100 text-purple-700' :
                                log.userRole === 'staff' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {log.userRole}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${actionTypeColors[log.actionType] || 'bg-gray-100 text-gray-600'}`}>
                            {log.actionType?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-700 max-w-md truncate" title={log.description}>
                            {log.description}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[log.status] || 'bg-gray-100'}`}>
                            {log.status === 'SUCCESS' ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">{log.ipAddress || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            {getDeviceIcon(log.deviceInfo)}
                            <span>{log.browserInfo || 'Unknown'}</span>
                            <span className="mx-1">•</span>
                            <span>{log.osInfo || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => { setSelectedLog(log); setShowDetailsModal(true); }}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <span className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} logs
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50 hover:bg-white transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-3 py-1 text-sm">Page {pagination.page} of {pagination.totalPages}</span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50 hover:bg-white transition"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* STATS TAB */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-indigo-600" />
                Daily Activity (Last 30 Days)
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyActivityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Activities" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <PieChart className="h-5 w-5 text-purple-600" />
                Action Type Distribution
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RPieChart>
                    <Pie
                      data={actionTypeChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {actionTypeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-indigo-600">{stats.total?.toLocaleString()}</p>
                <p className="text-xs text-gray-600">Total Logs</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {stats.byStatus?.find(s => s.name === 'SUCCESS')?.value || 0}%
                </p>
                <p className="text-xs text-gray-600">Success Rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.failedLoginCount}</p>
                <p className="text-xs text-gray-600">Failed Logins</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.byActionType?.length || 0}</p>
                <p className="text-xs text-gray-600">Action Types</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECURITY TAB */}
      {activeTab === 'security' && failedLogins && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 uppercase tracking-wide">Failed Logins (24h)</p>
                  <p className="text-2xl font-bold text-red-700">{failedLogins.total}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-600 uppercase tracking-wide">Suspicious IPs</p>
                  <p className="text-2xl font-bold text-orange-700">{failedLogins.suspiciousIps?.length || 0}</p>
                </div>
                <Shield className="h-8 w-8 text-orange-500" />
              </div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-600 uppercase tracking-wide">Security Level</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {failedLogins.total > 20 ? '⚠️ High' : failedLogins.total > 5 ? '⚠️ Medium' : '✅ Good'}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
          </div>

          {failedLogins.suspiciousIps?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-red-50">
                <h3 className="font-semibold text-red-800 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Suspicious IP Addresses (5+ failed attempts)
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {failedLogins.suspiciousIps.map((ip, idx) => (
                  <div key={idx} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-mono font-bold text-red-700">{ip.ip}</p>
                        <p className="text-sm text-gray-500">{ip.count} failed attempts</p>
                      </div>
                      <Shield className="h-5 w-5 text-red-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-600" />
                Audit Log Details
              </h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">ID</p>
                  <p className="font-mono text-sm">#{selectedLog.id}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Timestamp</p>
                  <p className="text-sm">{formatDate(selectedLog.createdAt)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">User</p>
                  <p className="font-medium">{selectedLog.userName || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{selectedLog.userEmail}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Role</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    selectedLog.userRole === 'admin' ? 'bg-purple-100 text-purple-700' :
                    selectedLog.userRole === 'staff' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedLog.userRole || 'Unknown'}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Action Type</p>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${actionTypeColors[selectedLog.actionType] || 'bg-gray-100'}`}>
                    {selectedLog.actionType}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Status</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[selectedLog.status] || 'bg-gray-100'}`}>
                    {selectedLog.status === 'SUCCESS' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {selectedLog.status}
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-700">{selectedLog.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">IP Address</p>
                  <p className="font-mono text-sm">{selectedLog.ipAddress || '—'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Device Info</p>
                  <p className="text-sm flex items-center gap-2">
                    {getDeviceIcon(selectedLog.deviceInfo)}
                    <span>{selectedLog.browserInfo || 'Unknown'} • {selectedLog.osInfo || 'Unknown'}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}