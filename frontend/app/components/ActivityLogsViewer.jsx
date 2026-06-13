"use client";

import { useState, useEffect } from 'react';
import { Activity, Search, Filter, Download, RefreshCw, Eye, AlertTriangle, Shield, Clock, Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import api from '../lib/api';
import { format } from 'date-fns';
import { showSuccess, showError } from '../lib/toastUtils';

export default function ActivityLogsViewer({ userRole }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({ actionType: '', status: '', search: '', startDate: '', endDate: '' });
  const [summary, setSummary] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    if (userRole === 'admin') {
      fetchLogs();
      fetchSummary();
    }
  }, [pagination.page, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const result = await api.getActivityLogs({
        page: pagination.page,
        limit: itemsPerPage,
        ...filters,
      });
      setLogs(result.data || []);
      setPagination(result.pagination || { page: 1, total: 0, totalPages: 0 });
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      showError('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const result = await api.getActivitySummary();
      setSummary(result);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.exportActivityLogs(filters);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `activity-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`);
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

  const resetFilters = () => {
    setFilters({ actionType: '', status: '', search: '', startDate: '', endDate: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getActionBadge = (actionType) => {
    const colors = {
      LOGIN: 'bg-green-100 text-green-700',
      LOGOUT: 'bg-gray-100 text-gray-700',
      LOGIN_FAILED: 'bg-red-100 text-red-700',
      CREATE_APPOINTMENT: 'bg-blue-100 text-blue-700',
      UPDATE_APPOINTMENT: 'bg-purple-100 text-purple-700',
      DELETE_APPOINTMENT: 'bg-red-100 text-red-700',
      APPROVE_APPOINTMENT: 'bg-emerald-100 text-emerald-700',
      REJECT_APPOINTMENT: 'bg-rose-100 text-rose-700',
      ADMIN_ACTION: 'bg-indigo-100 text-indigo-700',
      STAFF_ACTION: 'bg-cyan-100 text-cyan-700',
    };
    return colors[actionType] || 'bg-gray-100 text-gray-600';
  };

  if (userRole !== 'admin') {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Admin access required to view activity logs</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Activities</p>
                <p className="text-2xl font-bold text-gray-800">{summary.totalLogs?.toLocaleString() || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Last 7 Days</p>
                <p className="text-2xl font-bold text-gray-800">{summary.recentLogs?.toLocaleString() || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Failed Logins</p>
                <p className="text-2xl font-bold text-red-600">{summary.failedLoginCount?.toLocaleString() || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Active Users</p>
                <p className="text-2xl font-bold text-purple-600">{summary.activeUserCount || 0}</p>
              </div>
              <Shield className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-4 border-b flex justify-between items-center flex-wrap gap-2">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            Activity Logs
            <span className="text-xs text-gray-400 ml-2">{pagination.total} entries</span>
          </h3>
          <div className="flex gap-2">
            <button onClick={() => setShowFilters(!showFilters)} className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 px-3 py-1.5 bg-indigo-50 rounded-lg">
              <Filter className="h-4 w-4" /> {showFilters ? 'Hide' : 'Show'} Filters
            </button>
            <button onClick={handleExport} disabled={exporting} className="text-sm text-gray-600 hover:text-gray-700 flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-lg disabled:opacity-50">
              <Download className="h-4 w-4" /> {exporting ? 'Exporting...' : 'Export'}
            </button>
            <button onClick={fetchLogs} className="text-sm text-gray-600 hover:text-gray-700 p-1.5 bg-gray-100 rounded-lg">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="p-4 border-b bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <input type="text" placeholder="Search..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              <select value={filters.actionType} onChange={(e) => setFilters({ ...filters, actionType: e.target.value, page: 1 })} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                <option value="">All Actions</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
                <option value="LOGIN_FAILED">Failed Login</option>
                <option value="CREATE_APPOINTMENT">Create Appointment</option>
                <option value="APPROVE_APPOINTMENT">Approve Appointment</option>
                <option value="REJECT_APPOINTMENT">Reject Appointment</option>
                <option value="ADMIN_ACTION">Admin Action</option>
                <option value="STAFF_ACTION">Staff Action</option>
              </select>
              <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                <option value="">All Status</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILURE">Failure</option>
              </select>
              <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
              <button onClick={resetFilters} className="px-3 py-2 text-gray-600 hover:text-gray-800 border rounded-lg text-sm flex items-center justify-center gap-1">
                <X className="h-3 w-3" /> Clear
              </button>
            </div>
          </div>
        )}

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan="6" className="px-4 py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mx-auto"></div></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">No activity logs found</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm text-gray-600">{format(new Date(log.createdAt), 'MMM d, h:mm a')}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{log.userName || 'System'}</div>
                      <div className="text-xs text-gray-500">{log.userEmail || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getActionBadge(log.actionType)}`}>
                        {log.actionType?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-md truncate" title={log.description}>{log.description}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">{log.ipAddress || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t flex justify-between items-center flex-wrap gap-2">
            <span className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * itemsPerPage) + 1} to {Math.min(pagination.page * itemsPerPage, pagination.total)} of {pagination.total}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })} disabled={pagination.page === 1} className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 py-1 text-sm">Page {pagination.page} of {pagination.totalPages}</span>
              <button onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })} disabled={pagination.page === pagination.totalPages} className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}