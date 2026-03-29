"use client";

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
  Search, RefreshCw, Phone, Mail, Briefcase, Award
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell } from 'recharts'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useContext(AppContext)
  const [appointments, setAppointments] = useState([])
  const [staffUsers, setStaffUsers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [stats, setStats] = useState({})
  const [chartData, setChartData] = useState([])
  const [pieData, setPieData] = useState([])
  const [loading, setLoading] = useState(true)
  const [staffStats, setStaffStats] = useState({})
  
  // Search and filter states
  const [staffSearch, setStaffSearch] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [appointmentSearch, setAppointmentSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Modal states
  const [showExportModal, setShowExportModal] = useState(false)
  const [showAddStaffModal, setShowAddStaffModal] = useState(false)
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false)
  const [showStaffDetailsModal, setShowStaffDetailsModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedStaff, setSelectedStaff] = useState(null)
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
  
  // New staff form with Ethiopian phone
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    specialization: '',
    experience: '',
    phone: '',
    countryCode: '+251',
  })

  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899']

  // Format Ethiopian phone for display
  const formatPhone = (phone) => {
    if (!phone) return '—'
    const clean = phone.replace(/[\s\-\(\)]/g, '')
    if (clean.startsWith('+251')) {
      return clean.replace(/(\+251)(\d{2})(\d{3})(\d{4})/, '$1 $2 $3 $4')
    }
    return phone
  }

  // Validate Ethiopian phone
  const validateEthiopianPhone = (phone) => {
    if (!phone) return true
    const clean = phone.replace(/[\s\-\(\)]/g, '')
    return /^(?:\+251|0)[1-9]\d{8}$/.test(clean)
  }

  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault()
        setShowExportModal(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        setShowAddStaffModal(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault()
        handleRefresh()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    if (user?.role !== 'admin') {
      router.push(user?.role === 'staff' ? '/staff' : '/dashboard')
      return
    }
    fetchAllData()
  }, [authLoading, isAuthenticated, user, router])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [appointmentsRes, staffRes, usersRes, statsRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/users/staff'),
        api.get('/users'),
        api.get('/appointments/stats')
      ])
      
      const apps = appointmentsRes.data?.data || appointmentsRes.data || []
      const staff = staffRes.data || []
      const users = usersRes.data?.data || usersRes.data || []
      const statsData = statsRes.data || {}
      
      setAppointments(apps)
      setStaffUsers(staff)
      setAllUsers(users)
      setStats(statsData)
      
      // Calculate staff statistics by department
      const deptStats = {}
      staff.forEach(s => {
        const dept = s.department || 'General'
        if (!deptStats[dept]) {
          deptStats[dept] = { count: 0, staff: [] }
        }
        deptStats[dept].count++
        deptStats[dept].staff.push(s)
      })
      setStaffStats(deptStats)
      
      // Prepare chart data (last 7 days)
      const last7Days = [...Array(7)].map((_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - i)
        return date.toISOString().split('T')[0]
      }).reverse()
      
      const chartDataPoints = last7Days.map(date => {
        const dayApps = apps.filter(a => a.datetime?.startsWith(date))
        return {
          date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          appointments: dayApps.length,
          approved: dayApps.filter(a => a.status === 'Approved').length,
          pending: dayApps.filter(a => a.status === 'Pending').length,
        }
      })
      setChartData(chartDataPoints)
      
      // Prepare pie data
      setPieData([
        { name: 'Approved', value: statsData.approved || 0 },
        { name: 'Pending', value: statsData.pending || 0 },
        { name: 'Rejected', value: statsData.rejected || 0 },
      ])
      
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to fetch data')
    } finally {
      setLoading(false)
      setActionLoading(prev => ({ ...prev, refresh: false }))
    }
  }

  const handleRefresh = () => {
    setActionLoading(prev => ({ ...prev, refresh: true }))
    fetchAllData()
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
      fetchAllData()
    } catch (error) {
      toast.error('Failed to update appointment')
    } finally {
      setActionLoading(prev => ({ ...prev, updateStatus: false }))
    }
  }

  // FIXED: Add staff with proper number conversion for experience
  const addStaff = async (e) => {
    e.preventDefault()
    
    // Validate phone if provided
    if (newStaff.phone && !validateEthiopianPhone(newStaff.phone)) {
      toast.error('Please enter a valid Ethiopian phone number')
      return
    }

    setActionLoading(prev => ({ ...prev, addStaff: true }))
    try {
      // Prepare staff data with proper type conversion
      let staffData = {
        name: newStaff.name.trim(),
        email: newStaff.email.toLowerCase().trim(),
        password: newStaff.password,
        role: 'staff',
        department: newStaff.department?.trim() || undefined,
        specialization: newStaff.specialization?.trim() || undefined,
        phone: newStaff.phone ? newStaff.phone.replace(/[\s\-\(\)]/g, '') : undefined,
        countryCode: newStaff.countryCode || '+251',
      }
      
      // CRITICAL FIX: Convert experience to number only if it's a valid number
      if (newStaff.experience !== '' && newStaff.experience !== null && newStaff.experience !== undefined) {
        const expNum = Number(newStaff.experience)
        if (!isNaN(expNum) && expNum >= 0) {
          staffData.experience = expNum
        }
      }
      
      // Remove experience if it's not a valid number
      if (staffData.experience === undefined || isNaN(staffData.experience)) {
        delete staffData.experience
      }
      
      console.log('Sending staff data:', staffData)
      
      const response = await api.post('/users/staff', staffData)
      
      toast.success('Staff member added successfully')
      setShowAddStaffModal(false)
      setNewStaff({ 
        name: '', email: '', password: '', 
        department: '', specialization: '', 
        experience: '', phone: '', countryCode: '+251' 
      })
      fetchAllData()
    } catch (error) {
      console.error('Add staff error:', error.response?.data)
      const errorMessage = error.response?.data?.message || 'Failed to add staff member'
      toast.error(errorMessage)
    } finally {
      setActionLoading(prev => ({ ...prev, addStaff: false }))
    }
  }

  const removeStaff = async (id) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return
    
    try {
      await api.delete(`/users/staff/${id}`)
      toast.success('Staff member removed')
      fetchAllData()
    } catch (error) {
      toast.error('Failed to remove staff member')
    }
  }

  const viewUserDetails = (user) => {
    setSelectedUser(user)
    setShowUserDetailsModal(true)
  }

  const viewStaffDetails = (staff) => {
    setSelectedStaff(staff)
    setShowStaffDetailsModal(true)
  }

  const exportToExcel = async () => {
    setActionLoading(prev => ({ ...prev, export: true }))
    try {
      const response = await api.post('/appointments/export', exportFilters, {
        responseType: 'blob'
      })
      
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
    if (statusFilter !== 'all' && app.status !== statusFilter) return false
    if (appointmentSearch) {
      const term = appointmentSearch.toLowerCase()
      return (
        app.serviceName?.toLowerCase().includes(term) ||
        app.providerName?.toLowerCase().includes(term) ||
        app.userEmail?.toLowerCase().includes(term)
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
      (staff.department || '').toLowerCase().includes(term) ||
      (staff.specialization || '').toLowerCase().includes(term)
    )
  })

  // Filter users
  const filteredUsers = allUsers.filter(u => {
    if (!userSearch) return true
    const term = userSearch.toLowerCase()
    return (
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      (u.role || '').toLowerCase().includes(term)
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

  if (authLoading || loading) {
    return (
      <>
        <ToastProvider />
        <Navbar />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
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
              <p className="text-gray-600 mt-2">Welcome back, {user?.name}</p>
            </div>
            <div className="flex gap-2 mt-4 md:mt-0">
              <button
                onClick={handleRefresh}
                disabled={actionLoading.refresh}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${actionLoading.refresh ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                onClick={() => setShowAddStaffModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Add Staff
              </button>
            </div>
          </div>

          {/* Stats Cards - same as before */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Appointments</p>
                  <p className="text-2xl font-bold mt-1">{stats.total || 0}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Users</p>
                  <p className="text-2xl font-bold mt-1">{allUsers.length}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Staff Members</p>
                  <p className="text-2xl font-bold mt-1">{staffUsers.length}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Briefcase className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold mt-1 text-yellow-600">{stats.pending || 0}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Approved</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">{stats.approved || 0}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts - same as before */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
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

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <PieChart className="h-5 w-5 text-blue-600" />
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

          {/* Recent Appointments Table - same as before */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
            <div className="p-6 border-b border-gray-100">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Appointments</h2>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search appointments..."
                      value={appointmentSearch}
                      onChange={(e) => setAppointmentSearch(e.target.value)}
                      className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAppointments.slice(0, 5).map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">{app.serviceName}</td>
                      <td className="px-6 py-4 text-sm">{app.userEmail}</td>
                      <td className="px-6 py-4 text-sm">{app.providerName}</td>
                      <td className="px-6 py-4 text-sm">{app.datetime ? new Date(app.datetime).toLocaleString() : 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          app.status === 'Approved' ? 'bg-green-100 text-green-700' :
                          app.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => setSelectedAppointment(app)} className="text-blue-600 hover:text-blue-700 text-sm font-medium">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredAppointments.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No appointments found</p>
                </div>
              )}
            </div>
          </div>

          {/* Staff List - same as before */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
            <div className="p-6 border-b border-gray-100">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-900">Staff Members</h2>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" placeholder="Search staff..." value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {filteredStaff.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No staff members found</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specialization</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStaff.map((staff) => (
                      <tr key={staff.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium">{staff.name}</td>
                        <td className="px-6 py-4 text-sm">{staff.email}</td>
                        <td className="px-6 py-4 text-sm">{staff.department || 'General'}</td>
                        <td className="px-6 py-4 text-sm">{staff.specialization || '—'}</td>
                        <td className="px-6 py-4 text-sm">{formatPhone(staff.phone)}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => viewStaffDetails(staff)} className="text-blue-600 hover:text-blue-700 text-sm font-medium">View</button>
                            <button onClick={() => removeStaff(staff.id)} className="text-red-600 hover:text-red-700 text-sm font-medium">Remove</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Users List - same as before */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-900">Registered Users</h2>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" placeholder="Search users..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((userItem) => (
                    <tr key={userItem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium">{userItem.name}</td>
                      <td className="px-6 py-4 text-sm">{userItem.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          userItem.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          userItem.role === 'staff' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {userItem.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{userItem.company || '—'}</td>
                      <td className="px-6 py-4 text-sm">{formatPhone(userItem.phone)}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => viewUserDetails(userItem)} className="text-blue-600 hover:text-blue-700 text-sm font-medium">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Export Modal - same as before */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold mb-4">Export Appointments</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quick Select</label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setQuickDateRange('today')} className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg">Today</button>
                    <button type="button" onClick={() => setQuickDateRange('week')} className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg">Last 7 Days</button>
                    <button type="button" onClick={() => setQuickDateRange('month')} className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg">Last 30 Days</button>
                    <button type="button" onClick={() => setQuickDateRange('quarter')} className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg">Last 3 Months</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Custom Date Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={exportFilters.startDate} onChange={(e) => setExportFilters({ ...exportFilters, startDate: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    <input type="date" value={exportFilters.endDate} onChange={(e) => setExportFilters({ ...exportFilters, endDate: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
                  <select value={exportFilters.status} onChange={(e) => setExportFilters({ ...exportFilters, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="all">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={exportToExcel} disabled={actionLoading.export} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">{actionLoading.export ? 'Exporting...' : 'Export'}</button>
                <button onClick={() => setShowExportModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Staff Modal - FIXED with proper experience handling */}
        {showAddStaffModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">Add Staff Member</h3>
              
              <form onSubmit={addStaff} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name <span className="text-red-500">*</span></label>
                  <input type="text" value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
                  <input type="email" value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value.toLowerCase() })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password <span className="text-red-500">*</span></label>
                  <input type="password" value={newStaff.password} onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required minLength={6} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <input type="text" value={newStaff.department} onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g., Cardiology" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                  <input type="text" value={newStaff.specialization} onChange={(e) => setNewStaff({ ...newStaff, specialization: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g., Cardiologist" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Experience (years)</label>
                  <input
                    type="number"
                    value={newStaff.experience}
                    onChange={(e) => setNewStaff({ 
                      ...newStaff, 
                      experience: e.target.value === '' ? '' : e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="1"
                    placeholder="e.g., 5"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter years of experience (optional)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone (Ethiopian)</label>
                  <input type="tel" value={newStaff.phone} onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="+251 91 234 5678" />
                  <p className="text-xs text-gray-500 mt-1">Format: +251 91 234 5678 or 091 234 5678</p>
                </div>

                <div className="flex gap-2 pt-4">
                  <button type="submit" disabled={actionLoading.addStaff} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                    {actionLoading.addStaff ? 'Adding...' : 'Add Staff'}
                  </button>
                  <button type="button" onClick={() => setShowAddStaffModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition">Cancel</button>
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
                <button onClick={() => setSelectedAppointment(null)} className="text-gray-400 hover:text-gray-600"><XCircle className="h-6 w-6" /></button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-sm text-gray-500">Service</p><p className="font-medium">{selectedAppointment.serviceName}</p></div>
                  <div><p className="text-sm text-gray-500">Staff</p><p className="font-medium">{selectedAppointment.providerName}</p></div>
                  <div><p className="text-sm text-gray-500">Customer</p><p className="font-medium">{selectedAppointment.userEmail}</p></div>
                  <div><p className="text-sm text-gray-500">Date/Time</p><p className="font-medium">{selectedAppointment.datetime ? new Date(selectedAppointment.datetime).toLocaleString() : 'N/A'}</p></div>
                  <div><p className="text-sm text-gray-500">Priority</p><p className={`font-medium ${selectedAppointment.priority === 'Urgent' ? 'text-red-600' : selectedAppointment.priority === 'High' ? 'text-orange-600' : ''}`}>{selectedAppointment.priority || 'Normal'}</p></div>
                  <div><p className="text-sm text-gray-500">Status</p><span className={`px-2 py-1 text-xs rounded-full ${selectedAppointment.status === 'Approved' ? 'bg-green-100 text-green-700' : selectedAppointment.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{selectedAppointment.status}</span></div>
                </div>
                {selectedAppointment.notes && (<div><p className="text-sm text-gray-500 mb-1">Notes</p><p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedAppointment.notes}</p></div>)}
                {selectedAppointment.status === 'Pending' && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Comment (required for rejection)</label>
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows="3" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter reason for rejection..." />
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => updateAppointmentStatus(selectedAppointment.id, 'Approved')} disabled={actionLoading.updateStatus} className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition">Approve</button>
                      <button onClick={() => updateAppointmentStatus(selectedAppointment.id, 'Rejected')} disabled={!comment || actionLoading.updateStatus} className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition">Reject</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* User Details Modal */}
        {showUserDetailsModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-lg w-full p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold">User Details</h2>
                <button onClick={() => setShowUserDetailsModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="h-6 w-6" /></button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">{selectedUser.name?.charAt(0)}</div>
                  <div><h3 className="text-lg font-bold">{selectedUser.name}</h3><p className="text-sm text-gray-600">{selectedUser.email}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">Role</p><p className="font-medium capitalize">{selectedUser.role}</p></div>
                  <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">Company</p><p className="font-medium">{selectedUser.company || '—'}</p></div>
                  <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">Phone</p><p className="font-medium">{formatPhone(selectedUser.phone)}</p></div>
                  <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">Joined</p><p className="font-medium">{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}</p></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Staff Details Modal */}
        {showStaffDetailsModal && selectedStaff && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-lg w-full p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold">Staff Details</h2>
                <button onClick={() => setShowStaffDetailsModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="h-6 w-6" /></button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">{selectedStaff.name?.charAt(0)}</div>
                  <div><h3 className="text-lg font-bold">{selectedStaff.name}</h3><p className="text-sm text-gray-600">{selectedStaff.email}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">Department</p><p className="font-medium">{selectedStaff.department || 'General'}</p></div>
                  <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">Specialization</p><p className="font-medium">{selectedStaff.specialization || '—'}</p></div>
                  <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">Experience</p><p className="font-medium">{selectedStaff.experience ? `${selectedStaff.experience} years` : '—'}</p></div>
                  <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">Phone</p><p className="font-medium">{formatPhone(selectedStaff.phone)}</p></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}