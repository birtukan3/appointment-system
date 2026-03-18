"use client"

import { useState, useEffect, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { AppContext } from '../providers'
import Navbar from '../components/Navbar'
import ToastProvider from '../components/ToastProvider'
import api from '../lib/api'
import { 
  Users, Calendar, Clock, CheckCircle, XCircle, 
  Activity, Download, Filter, Plus, Trash2, 
  Settings, BarChart3, PieChart, UserPlus,
  Search, RefreshCw
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell } from 'recharts'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const router = useRouter()
  const { user, isAuthenticated, hasRole } = useContext(AppContext)
  
  const [appointments, setAppointments] = useState([])
  const [staffUsers, setStaffUsers] = useState([])
  const [stats, setStats] = useState({})
  const [chartData, setChartData] = useState([])
  const [pieData, setPieData] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Search and filter states
  const [staffSearch, setStaffSearch] = useState('')
  const [appointmentSearch, setAppointmentSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Modal states
  const [showExportModal, setShowExportModal] = useState(false)
  const [showAddStaffModal, setShowAddStaffModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [comment, setComment] = useState('')
  
  // Loading states for actions
  const [actionLoading, setActionLoading] = useState({
    export: false,
    addStaff: false,
    updateStatus: false,
    refresh: false
  })
  
  // Export filters
  const [exportFilters, setExportFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
  })
  
  // New staff form
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
  })

  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444']

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl/Cmd + E to open export modal
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault()
        setShowExportModal(true)
      }
      // Ctrl/Cmd + N to open add staff modal
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        setShowAddStaffModal(true)
      }
      // Ctrl/Cmd + R to refresh data
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault()
        handleRefresh()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !hasRole('admin')) {
      router.push('/login')
      return
    }
    fetchData()
  }, [isAuthenticated])

  const fetchData = async () => {
    try {
      const [appointmentsRes, staffRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/users/staff')
      ])
      
      const apps = appointmentsRes.data
      const staff = staffRes.data
      
      setAppointments(apps)
      setStaffUsers(staff)
      
      // Calculate stats
      const total = apps.length
      const pending = apps.filter(a => a.status === 'Pending').length
      const approved = apps.filter(a => a.status === 'Approved').length
      const rejected = apps.filter(a => a.status === 'Rejected').length
      
      setStats({
        total,
        pending,
        approved,
        rejected,
        staffCount: staff.length,
      })
      
      // Prepare chart data (last 7 days)
      const last7Days = [...Array(7)].map((_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - i)
        return date.toISOString().split('T')[0]
      }).reverse()
      
      const chartData = last7Days.map(date => {
        const dayApps = apps.filter(a => a.datetime.startsWith(date))
        return {
          date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          appointments: dayApps.length,
          approved: dayApps.filter(a => a.status === 'Approved').length,
          pending: dayApps.filter(a => a.status === 'Pending').length,
        }
      })
      setChartData(chartData)
      
      // Prepare pie data
      setPieData([
        { name: 'Approved', value: approved },
        { name: 'Pending', value: pending },
        { name: 'Rejected', value: rejected },
      ])
      
    } catch (error) {
      toast.error('Failed to fetch data')
    } finally {
      setLoading(false)
      setActionLoading(prev => ({ ...prev, refresh: false }))
    }
  }

  const handleRefresh = () => {
    setActionLoading(prev => ({ ...prev, refresh: true }))
    setLoading(true)
    fetchData()
  }

  const updateAppointmentStatus = async (id, status) => {
    setActionLoading(prev => ({ ...prev, updateStatus: true }))
    try {
      await api.patch(`/appointments/${id}`, { 
        status, 
        comment: status === 'Rejected' ? comment : '' 
      })
      toast.success(`Appointment ${status.toLowerCase()}`)
      setComment('')
      setSelectedAppointment(null)
      fetchData()
    } catch (error) {
      toast.error('Failed to update appointment')
    } finally {
      setActionLoading(prev => ({ ...prev, updateStatus: false }))
    }
  }

  const addStaff = async (e) => {
    e.preventDefault()
    setActionLoading(prev => ({ ...prev, addStaff: true }))
    try {
      console.log("Sending staff data:", newStaff); // Log what we're sending
      
      const response = await api.post('/users/staff', {
        ...newStaff,
        role: 'staff'
      })
      
      console.log("Response:", response.data);
      toast.success('Staff member added successfully')
      setShowAddStaffModal(false)
      setNewStaff({ name: '', email: '', password: '', department: '' })
      fetchData()
    } catch (error) {
      console.error('Full error object:', error)
      console.error('Error response:', error.response)
      console.error('Error data:', error.response?.data)
      console.error('Error status:', error.response?.status)
      console.error('Error message:', error.response?.data?.message)
      
      // Show the exact error message from backend
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to add staff member'
      toast.error(errorMessage)
    } finally {
      setActionLoading(prev => ({ ...prev, addStaff: false }))
    }
  }

  const removeStaff = async (id) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return
    
    try {
      await api.delete(`/users/${id}`)
      toast.success('Staff member removed')
      fetchData()
    } catch (error) {
      toast.error('Failed to remove staff member')
    }
  }

  const exportToExcel = async () => {
    setActionLoading(prev => ({ ...prev, export: true }))
    try {
      const response = await api.post('/appointments/export', exportFilters, {
        responseType: 'blob'
      })
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `appointments-export-${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      setShowExportModal(false)
      toast.success('Export completed')
    } catch (error) {
      toast.error('Export failed')
    } finally {
      setActionLoading(prev => ({ ...prev, export: false }))
    }
  }

  // Filter appointments
  const filteredAppointments = appointments.filter(app => {
    // Status filter
    if (statusFilter !== 'all' && app.status !== statusFilter) return false
    
    // Search filter
    if (appointmentSearch) {
      const term = appointmentSearch.toLowerCase()
      return (
        app.serviceName?.toLowerCase().includes(term) ||
        app.providerName?.toLowerCase().includes(term) ||
        app.userEmail?.toLowerCase().includes(term) ||
        app.id?.toString().includes(term)
      )
    }
    return true
  })

  // Filter staff
  const filteredStaff = staffUsers.filter(staff => {
    if (!staffSearch) return true
    const term = staffSearch.toLowerCase()
    return (
      staff.name?.toLowerCase().includes(term) ||
      staff.email?.toLowerCase().includes(term) ||
      (staff.department || '').toLowerCase().includes(term)
    )
  })

  const setQuickDateRange = (range) => {
    const today = new Date()
    const start = new Date()
    
    switch(range) {
      case 'today':
        start.setHours(0, 0, 0, 0)
        break
      case 'week':
        start.setDate(start.getDate() - 7)
        break
      case 'month':
        start.setMonth(start.getMonth() - 1)
        break
      case 'quarter':
        start.setMonth(start.getMonth() - 3)
        break
      default:
        return
    }
    
    setExportFilters({
      ...exportFilters,
      startDate: start.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    })
  }

  if (loading) {
    return (
      <>
        <ToastProvider />
        <Navbar />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
        </div>
      </>
    )
  }

  return (
    <>
      <ToastProvider />
      <Navbar />
      <div className="min-h-screen bg-gray-50 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-2">Manage appointments and staff</p>
            </div>
            <div className="flex gap-2 mt-4 md:mt-0">
              <button
                onClick={handleRefresh}
                disabled={actionLoading.refresh}
                className="btn-secondary p-2 relative group"
                title="Refresh Data (Ctrl+R)"
              >
                <RefreshCw className={`h-4 w-4 ${actionLoading.refresh ? 'animate-spin' : ''}`} />
                <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                  Refresh
                </span>
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                disabled={actionLoading.export}
                className="btn-secondary flex items-center gap-2 disabled:opacity-50 relative group"
                title="Export Data (Ctrl+E)"
              >
                {actionLoading.export ? (
                  <div className="h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export
                <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                  Ctrl+E
                </span>
              </button>
              <button
                onClick={() => setShowAddStaffModal(true)}
                className="btn-primary flex items-center gap-2 relative group"
                title="Add Staff Member (Ctrl+N)"
              >
                <UserPlus className="h-4 w-4" />
                Add Staff
                <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                  Ctrl+N
                </span>
              </button>
            </div>
          </div>

          {/* Stats Grid with Tooltips */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            {[
              { label: 'Total', value: stats.total, icon: Calendar, color: 'blue', tooltip: 'Total appointments in system' },
              { label: 'Pending', value: stats.pending, icon: Clock, color: 'yellow', tooltip: 'Awaiting approval' },
              { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'green', tooltip: 'Confirmed appointments' },
              { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'red', tooltip: 'Declined appointments' },
              { label: 'Staff', value: stats.staffCount, icon: Users, color: 'purple', tooltip: 'Active staff members' },
            ].map((stat, index) => {
              const Icon = stat.icon
              const colors = {
                blue: 'bg-blue-100 text-blue-600',
                yellow: 'bg-yellow-100 text-yellow-600',
                green: 'bg-green-100 text-green-600',
                red: 'bg-red-100 text-red-600',
                purple: 'bg-purple-100 text-purple-600'
              }
              
              return (
                <div key={index} className="card relative group">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{stat.label}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${colors[stat.color]}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-all rounded-xl"></div>
                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                    {stat.tooltip}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary-600" />
                Daily Appointments
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip />
                    <Bar dataKey="appointments" fill="#3b82f6" name="Total" />
                    <Bar dataKey="approved" fill="#10b981" name="Approved" />
                    <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary-600" />
                Status Distribution
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RPieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Appointments Section with Search and Filter */}
          <div className="card mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Appointments</h2>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search appointments..."
                    value={appointmentSearch}
                    onChange={(e) => setAppointmentSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAppointments.slice(0, 5).map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{app.serviceName}</td>
                      <td className="px-4 py-3">{app.userEmail}</td>
                      <td className="px-4 py-3">{app.providerName}</td>
                      <td className="px-4 py-3">
                        {new Date(app.datetime).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${
                          app.status === 'Approved' ? 'badge-approved' :
                          app.status === 'Rejected' ? 'badge-rejected' :
                          'badge-pending'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedAppointment(app)}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredAppointments.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No appointments found</p>
                </div>
              )}
            </div>
          </div>

          {/* Staff List with Search */}
          <div className="card">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Staff Members</h2>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {filteredStaff.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No staff members found</p>
                  <button
                    onClick={() => setShowAddStaffModal(true)}
                    className="mt-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Add your first staff member
                  </button>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStaff.map((staff) => (
                      <tr key={staff.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{staff.name}</td>
                        <td className="px-4 py-3">{staff.email}</td>
                        <td className="px-4 py-3">{staff.department || 'General'}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removeStaff(staff.id)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold mb-4">Export Appointments</h3>
              
              <div className="space-y-4">
                {/* Quick date ranges */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick Select
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setQuickDateRange('today')}
                      className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDateRange('week')}
                      className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    >
                      Last 7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDateRange('month')}
                      className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    >
                      Last 30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDateRange('quarter')}
                      className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    >
                      Last 3 Months
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Date Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={exportFilters.startDate}
                      onChange={(e) => setExportFilters({ ...exportFilters, startDate: e.target.value })}
                      className="input-field"
                      placeholder="Start"
                    />
                    <input
                      type="date"
                      value={exportFilters.endDate}
                      onChange={(e) => setExportFilters({ ...exportFilters, endDate: e.target.value })}
                      className="input-field"
                      placeholder="End"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status Filter
                  </label>
                  <select
                    value={exportFilters.status}
                    onChange={(e) => setExportFilters({ ...exportFilters, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="all">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={exportToExcel}
                  disabled={actionLoading.export}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {actionLoading.export ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    'Export'
                  )}
                </button>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Staff Modal */}
        {showAddStaffModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold mb-4">Add Staff Member</h3>
              
              <form onSubmit={addStaff} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={newStaff.password}
                    onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                    className="input-field"
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    value={newStaff.department}
                    onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Cardiology"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={actionLoading.addStaff}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {actionLoading.addStaff ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Staff'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddStaffModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Appointment Details Modal */}
        {selectedAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold">Appointment Details</h2>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Service</p>
                    <p className="font-medium">{selectedAppointment.serviceName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Staff</p>
                    <p className="font-medium">{selectedAppointment.providerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Customer</p>
                    <p className="font-medium">{selectedAppointment.userEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date/Time</p>
                    <p className="font-medium">
                      {new Date(selectedAppointment.datetime).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Priority</p>
                    <p className={`font-medium ${
                      selectedAppointment.priority === 'Urgent' ? 'text-red-600' :
                      selectedAppointment.priority === 'High' ? 'text-orange-600' :
                      ''
                    }`}>
                      {selectedAppointment.priority || 'Normal'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`badge ${
                      selectedAppointment.status === 'Approved' ? 'badge-approved' :
                      selectedAppointment.status === 'Rejected' ? 'badge-rejected' :
                      'badge-pending'
                    }`}>
                      {selectedAppointment.status}
                    </span>
                  </div>
                </div>

                {selectedAppointment.notes && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Notes</p>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {selectedAppointment.notes}
                    </p>
                  </div>
                )}

                {selectedAppointment.status === 'Pending' && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comment (required for rejection)
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows="3"
                      className="input-field"
                      placeholder="Enter reason for rejection..."
                    />
                    
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => updateAppointmentStatus(selectedAppointment.id, 'Approved')}
                        disabled={actionLoading.updateStatus}
                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                      >
                        {actionLoading.updateStatus ? (
                          <>
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Approve'
                        )}
                      </button>
                      <button
                        onClick={() => updateAppointmentStatus(selectedAppointment.id, 'Rejected')}
                        disabled={!comment || actionLoading.updateStatus}
                        className="btn-danger flex-1 flex items-center justify-center gap-2"
                      >
                        {actionLoading.updateStatus ? (
                          <>
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Reject'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}