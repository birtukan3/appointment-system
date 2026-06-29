"use client";

import io from 'socket.io-client';
import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext, getDefaultRouteForRole } from '../providers';
import Navbar from '../components/Navbar';
import api from '../lib/api';
import { showSuccess, showError, showInfo } from '../lib/toastUtils';
import AuditDashboard from './components/AuditDashboard';
import LimitsManagement from './components/LimitsManagement';
import { 
  Users, Calendar, Clock, CheckCircle, XCircle, 
  Activity, Download, Filter, Plus, Trash2, 
  Settings, BarChart3, PieChart, UserPlus,
  Search, RefreshCw, Phone, Mail, Briefcase, Award,
  MessageSquare, TrendingUp, Zap, Shield, Bell,
  Eye, Edit, Archive, Lock, AlertTriangle, Star,
  ChevronLeft, ChevronRight, Upload, FileText,
  Target, Sparkles, Settings2, ShieldCheck, UsersRound,
  Megaphone, X as XIcon, ThumbsUp
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart as RPieChart, Pie, Cell,
  LineChart, Line, Legend, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

let socket;

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useContext(AppContext);
  
  // ============ STATE MANAGEMENT ============
  const [appointments, setAppointments] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [chartData, setChartData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [radarData, setRadarData] = useState([]);
  const [areaData, setAreaData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffStats, setStaffStats] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('week');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [systemHealth, setSystemHealth] = useState({});
  const [feedbackStats, setFeedbackStats] = useState({});
  const [activeAdminTab, setActiveAdminTab] = useState('overview');
  
  // ============ PAGINATION ============
  const [appointmentPage, setAppointmentPage] = useState(1);
  const [staffPage, setStaffPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  
  // ============ SEARCH & FILTERS ============
  const [staffSearch, setStaffSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [appointmentSearch, setAppointmentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  
  // ============ MODAL STATES ============
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [showStaffDetailsModal, setShowStaffDetailsModal] = useState(false);
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [comment, setComment] = useState('');
  const [bulkAction, setBulkAction] = useState('');
  const [selectedAppointments, setSelectedAppointments] = useState([]);
  const [announcement, setAnnouncement] = useState({ title: '', message: '', target: 'all' });
  const [approvalCode, setApprovalCode] = useState('');
  
  // ============ LOADING STATES ============
  const [actionLoading, setActionLoading] = useState({
    export: false,
    addStaff: false,
    updateStatus: false,
    refresh: false,
    archive: false,
    bulkUpdate: false,
    sendAnnouncement: false
  });
  
  // ============ EXPORT FILTERS ============
  const [exportFilters, setExportFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
    format: 'excel'
  });
  
  // ============ NEW STAFF FORM ============
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    specialization: '',
    experience: '',
    phone: '',
    countryCode: '+251',
    bio: '',
    qualifications: []
  });

  // ============ CONSTANTS ============
  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
  const ITEMS_PER_PAGE = 5;
  
  const initializedForUserRef = useRef(null);
  const authRedirectHandledRef = useRef(false);
  const lastToastRef = useRef({ message: '', time: 0 });

  // ============ HELPER FUNCTIONS ============
  const showDeduplicatedToast = (message, type = 'success') => {
    const now = Date.now();
    if (lastToastRef.current.message === message && now - lastToastRef.current.time < 3000) {
      return;
    }
    lastToastRef.current = { message, time: now };
    if (type === 'success') showSuccess(message);
    else if (type === 'error') showError(message);
    else showInfo(message);
  };

  const formatPhone = (phone) => {
    if (!phone) return '—';
    const clean = phone.replace(/[\s\-\(\)]/g, '');
    if (clean.startsWith('+251')) {
      return clean.replace(/(\+251)(\d{2})(\d{3})(\d{4})/, '$1 $2 $3 $4');
    }
    return phone;
  };

  const validateEthiopianPhone = (phone) => {
    if (!phone) return true;
    const clean = phone.replace(/[\s\-\(\)]/g, '');
    return /^(?:\+251|0)[1-9]\d{8}$/.test(clean);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getGrowthRate = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ============ WEBSOCKET CONNECTION ============
  useEffect(() => {
    if (typeof window !== 'undefined' && user && isAuthenticated) {
      try {
        const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3002';
        socket = io(socketUrl, {
          query: { userId: user.id }
        });
        
        socket.on('newNotification', (notification) => {
          setNotifications(prev => [notification, ...prev].slice(0, 50));
          setUnreadCount(prev => prev + 1);
          showDeduplicatedToast(notification.message, 'info');
        });
        
        socket.on('appointmentUpdate', () => {
          fetchAllData();
        });
        
        socket.on('statsUpdate', (newStats) => {
          setStats(newStats);
        });
        
        socket.on('systemAlert', (alert) => {
          setSystemHealth(prev => ({ ...prev, alerts: [alert, ...(prev.alerts || [])] }));
          showDeduplicatedToast(alert.message, 'error');
        });
      } catch (error) {
        console.log('WebSocket not available:', error);
      }
      
      return () => {
        if (socket) socket.disconnect();
      };
    }
  }, [user, isAuthenticated]);

  // ============ AUTHENTICATION CHECK ============
  useEffect(() => {
    console.log('🔍 Admin Page - Auth Check:', { 
      authLoading, 
      isAuthenticated, 
      userRole: user?.role,
      userEmail: user?.email 
    });

    if (authLoading) return;

    if (!isAuthenticated) {
      if (!authRedirectHandledRef.current) {
        authRedirectHandledRef.current = true;
        router.replace('/login');
      }
      return;
    }

    const userRole = user?.role?.toLowerCase();
    
    if (userRole !== 'admin') {
      if (!authRedirectHandledRef.current) {
        authRedirectHandledRef.current = true;
        const redirectPath = userRole === 'staff' ? '/staff' : '/dashboard';
        router.replace(redirectPath);
      }
      return;
    }

    authRedirectHandledRef.current = false;
    
    if (initializedForUserRef.current === user?.email) return;
    
    initializedForUserRef.current = user?.email;
    console.log('✅ Admin authenticated, loading dashboard');
    
    fetchAllData();
    fetchNotifications();
    fetchAuditLogs();
    fetchTestimonials();
    fetchUploadedFiles();
    fetchActivityLogs();
    fetchSystemHealth();
    fetchFeedbackStats();
    
    const interval = setInterval(() => {
      fetchAllData();
      fetchSystemHealth();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [authLoading, isAuthenticated, user, router]);

  // ============ FETCH FUNCTIONS ============
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [appointmentsRes, staffRes, usersRes, statsRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/users/staff'),
        api.get('/users'),
        api.get('/appointments/stats')
      ]);
      
      const apps = appointmentsRes.data?.data || appointmentsRes.data || [];
      const staff = Array.isArray(staffRes.data) ? staffRes.data : [];
      const users = usersRes.data?.data || usersRes.data || [];
      const statsData = statsRes.data || {};
      
      setAppointments(apps);
      setStaffUsers(staff);
      setAllUsers(users);
      setStats(statsData);
      
      // Staff statistics by department
      const deptStats = {};
      staff.forEach(s => {
        const dept = s.department || 'General';
        if (!deptStats[dept]) {
          deptStats[dept] = { count: 0, staff: [], totalAppointments: 0, completedAppointments: 0 };
        }
        deptStats[dept].count++;
        deptStats[dept].staff.push(s);
        deptStats[dept].totalAppointments += apps.filter(a => a.providerName === s.name).length;
        deptStats[dept].completedAppointments += apps.filter(a => a.providerName === s.name && a.status === 'Approved').length;
      });
      setStaffStats(deptStats);
      
      // Radar chart data
      const radarPoints = Object.entries(deptStats).map(([dept, data]) => ({
        department: dept,
        appointments: data.totalAppointments,
        staffCount: data.count,
        efficiency: (data.completedAppointments / (data.totalAppointments || 1)) * 100,
        avgPerStaff: data.totalAppointments / (data.count || 1)
      }));
      setRadarData(radarPoints);
      
      // Chart data based on selected period
      let daysToShow = 7;
      if (analyticsPeriod === 'month') daysToShow = 30;
      if (analyticsPeriod === 'quarter') daysToShow = 90;
      
      const lastNDays = [...Array(daysToShow)].map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();
      
      const chartDataPoints = lastNDays.map(date => {
        const dayApps = apps.filter(a => a.datetime?.startsWith(date));
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          appointments: dayApps.length,
          approved: dayApps.filter(a => a.status === 'Approved').length,
          pending: dayApps.filter(a => a.status === 'Pending').length,
          rejected: dayApps.filter(a => a.status === 'Rejected').length,
          expired: dayApps.filter(a => a.isExpired).length,
        };
      });
      setChartData(chartDataPoints);
      
      // Area chart data (cumulative)
      let cumulative = 0;
      const areaPoints = chartDataPoints.map(point => {
        cumulative += point.appointments;
        return { ...point, cumulative };
      });
      setAreaData(areaPoints);
      
      // Trend data (weekly)
      const weeks = {};
      apps.forEach(app => {
        if (app.datetime) {
          const weekKey = new Date(app.datetime).toISOString().split('T')[0].slice(0, 7);
          if (!weeks[weekKey]) weeks[weekKey] = { total: 0, approved: 0, rejected: 0 };
          weeks[weekKey].total++;
          if (app.status === 'Approved') weeks[weekKey].approved++;
          if (app.status === 'Rejected') weeks[weekKey].rejected++;
        }
      });
      
      const trendPoints = Object.entries(weeks).slice(-12).map(([week, data]) => ({
        week: week.slice(5),
        appointments: data.total,
        approved: data.approved,
        rejected: data.rejected,
        approvalRate: data.total > 0 ? ((data.approved / data.total) * 100).toFixed(1) : 0
      }));
      setTrendData(trendPoints);
      
      // Pie data
      setPieData([
        { name: 'Approved', value: statsData.approved || 0, color: '#10b981' },
        { name: 'Pending', value: statsData.pending || 0, color: '#f59e0b' },
        { name: 'Rejected', value: statsData.rejected || 0, color: '#ef4444' },
        { name: 'Expired', value: statsData.expired || 0, color: '#6b7280' },
      ]);
      
    } catch (error) {
      console.error('Failed to fetch data:', error);
      showError('Failed to fetch data');
    } finally {
      setLoading(false);
      setActionLoading(prev => ({ ...prev, refresh: false }));
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications/admin');
      setNotifications(response.data || []);
      setUnreadCount((response.data || []).filter(n => !n.read).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await api.get('/audit-logs');
      setAuditLogs(response.data || []);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    }
  };

  const fetchTestimonials = async () => {
    try {
      const response = await api.get('/testimonials');
      setTestimonials(response.data || []);
    } catch (error) {
      console.error('Failed to fetch testimonials:', error);
    }
  };

  const fetchUploadedFiles = async () => {
    try {
      const response = await api.get('/uploads');
      if (Array.isArray(response.data)) {
        setUploadedFiles(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const response = await api.get('/activity-logs');
      setActivityLogs(response.data || []);
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const response = await api.get('/system/health');
      setSystemHealth(response.data || {});
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    }
  };

  const fetchFeedbackStats = async () => {
    try {
      const response = await api.get('/feedback/stats');
      setFeedbackStats(response.data || {});
    } catch (error) {
      console.error('Failed to fetch feedback stats:', error);
    }
  };

  const handleRefresh = () => {
    setActionLoading(prev => ({ ...prev, refresh: true }));
    fetchAllData();
    fetchNotifications();
    fetchAuditLogs();
    fetchTestimonials();
    fetchUploadedFiles();
    fetchActivityLogs();
    fetchSystemHealth();
    fetchFeedbackStats();
  };

  // ============ BULK OPERATIONS ============
  const archiveExpiredAppointments = async () => {
    setActionLoading(prev => ({ ...prev, archive: true }));
    try {
      const response = await api.post('/appointments/archive');
      if (response.data?.success) {
        const count = response.data.data?.archivedCount || 0;
        showSuccess(`Successfully archived ${count} expired appointments`);
      } else {
        showSuccess('Expired appointments archived successfully');
      }
      fetchAllData();
    } catch (error) {
      console.error('Failed to archive appointments:', error);
      showError(error.response?.data?.message || 'Failed to archive appointments');
    } finally {
      setActionLoading(prev => ({ ...prev, archive: false }));
    }
  };

  const handleBulkAction = async () => {
    if (selectedAppointments.length === 0) {
      showError('Please select appointments first');
      return;
    }
    
    setActionLoading(prev => ({ ...prev, bulkUpdate: true }));
    try {
      await api.post('/appointments/bulk', {
        appointmentIds: selectedAppointments,
        action: bulkAction
      });
      showSuccess(`${selectedAppointments.length} appointments ${bulkAction}d successfully`);
      setSelectedAppointments([]);
      setShowBulkActionModal(false);
      fetchAllData();
    } catch (error) {
      showError('Failed to perform bulk action');
    } finally {
      setActionLoading(prev => ({ ...prev, bulkUpdate: false }));
    }
  };

  const toggleAppointmentSelection = (id) => {
    setSelectedAppointments(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllAppointments = () => {
    if (selectedAppointments.length === paginatedAppointments.length) {
      setSelectedAppointments([]);
    } else {
      setSelectedAppointments(paginatedAppointments.map(a => a.id));
    }
  };

  // ============ APPROVE WITH CODE ============
  const approveWithCode = async () => {
    if (!approvalCode) {
      showError('Please enter approval code');
      return;
    }
    
    try {
      await api.post('/appointments/approve', { approvalCode });
      showSuccess('Appointment approved successfully');
      setShowApprovalModal(false);
      setApprovalCode('');
      fetchAllData();
    } catch (error) {
      showError(error.response?.data?.message || 'Invalid approval code');
    }
  };

  // ============ ADD STAFF ============
  const addStaff = async (e) => {
    e.preventDefault();
    
    if (newStaff.phone && !validateEthiopianPhone(newStaff.phone)) {
      showError('Please enter a valid Ethiopian phone number');
      return;
    }

    setActionLoading(prev => ({ ...prev, addStaff: true }));
    try {
      let staffData = {
        name: newStaff.name.trim(),
        email: newStaff.email.toLowerCase().trim(),
        password: newStaff.password,
        role: 'staff',
        department: newStaff.department?.trim() || undefined,
        specialization: newStaff.specialization?.trim() || undefined,
        phone: newStaff.phone ? newStaff.phone.replace(/[\s\-\(\)]/g, '') : undefined,
        countryCode: newStaff.countryCode || '+251',
        bio: newStaff.bio?.trim() || undefined,
        qualifications: newStaff.qualifications || []
      };
      
      if (newStaff.experience !== '' && newStaff.experience !== null) {
        const expNum = Number(newStaff.experience);
        if (!isNaN(expNum) && expNum >= 0) {
          staffData.experience = expNum;
        }
      }
      
      if (staffData.experience === undefined || isNaN(staffData.experience)) {
        delete staffData.experience;
      }
      
      await api.post('/users/staff', staffData);
      showSuccess('Staff member added successfully');
      setShowAddStaffModal(false);
      setNewStaff({ 
        name: '', email: '', password: '', 
        department: '', specialization: '', 
        experience: '', phone: '', countryCode: '+251',
        bio: '', qualifications: []
      });
      fetchAllData();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to add staff member';
      showError(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, addStaff: false }));
    }
  };

  const removeStaff = async (id) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;
    
    try {
      await api.delete(`/users/staff/${id}`);
      showSuccess('Staff member removed');
      fetchAllData();
    } catch (error) {
      showError('Failed to remove staff member');
    }
  };

  const viewUserDetails = (userItem) => {
    setSelectedUser(userItem);
    setShowUserDetailsModal(true);
  };

  const viewStaffDetails = (staff) => {
    setSelectedStaff(staff);
    setShowStaffDetailsModal(true);
  };

  // ============ SEND ANNOUNCEMENT ============
  const sendAnnouncement = async () => {
    if (!announcement.title || !announcement.message) {
      showError('Please fill in both title and message');
      return;
    }
    
    setActionLoading(prev => ({ ...prev, sendAnnouncement: true }));
    try {
      await api.post('/notifications/announcement', announcement);
      showSuccess(`Announcement sent to ${announcement.target === 'all' ? 'all users' : announcement.target}s`);
      setShowAnnouncementModal(false);
      setAnnouncement({ title: '', message: '', target: 'all' });
    } catch (error) {
      showError('Failed to send announcement');
    } finally {
      setActionLoading(prev => ({ ...prev, sendAnnouncement: false }));
    }
  };

  // ============ EXPORT ============
  const exportData = async () => {
    setActionLoading(prev => ({ ...prev, export: true }));
    try {
      const response = await api.post('/appointments/export', exportFilters, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const extension = exportFilters.format === 'excel' ? 'xlsx' : 'csv';
      link.setAttribute('download', `appointments-export-${new Date().toISOString().split('T')[0]}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setShowExportModal(false);
      showSuccess('Export completed successfully');
    } catch (error) {
      showError('Export failed');
    } finally {
      setActionLoading(prev => ({ ...prev, export: false }));
    }
  };

  // ============ FILTER FUNCTIONS ============
  const filterByDate = (app) => {
    if (!app.datetime || dateFilter === 'all') return true;
    const appDate = new Date(app.datetime);
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    switch(dateFilter) {
      case 'today':
        return appDate.toDateString() === today.toDateString();
      case 'week':
        return appDate >= sevenDaysAgo;
      case 'month':
        return appDate >= thirtyDaysAgo;
      default:
        return true;
    }
  };

  const filteredAppointments = appointments.filter(app => {
    if (statusFilter !== 'all' && app.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && app.priority !== priorityFilter) return false;
    if (!filterByDate(app)) return false;
    if (appointmentSearch) {
      const term = appointmentSearch.toLowerCase();
      return (
        app.serviceName?.toLowerCase().includes(term) ||
        app.providerName?.toLowerCase().includes(term) ||
        app.userEmail?.toLowerCase().includes(term) ||
        app.userName?.toLowerCase().includes(term) ||
        app.bookingCode?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const filteredStaff = staffUsers.filter(staff => {
    if (!staffSearch) return true;
    const term = staffSearch.toLowerCase();
    return (
      staff.name?.toLowerCase().includes(term) ||
      staff.email?.toLowerCase().includes(term) ||
      (staff.department || '').toLowerCase().includes(term) ||
      (staff.specialization || '').toLowerCase().includes(term)
    );
  });

  const filteredUsers = allUsers.filter(u => {
    if (!userSearch) return true;
    const term = userSearch.toLowerCase();
    return (
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      (u.role || '').toLowerCase().includes(term) ||
      (u.company || '').toLowerCase().includes(term)
    );
  });

  // ============ PAGINATION ============
  const appointmentTotalPages = Math.max(1, Math.ceil(filteredAppointments.length / ITEMS_PER_PAGE));
  const staffTotalPages = Math.max(1, Math.ceil(filteredStaff.length / ITEMS_PER_PAGE));
  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));

  const paginatedAppointments = filteredAppointments.slice(
    (appointmentPage - 1) * ITEMS_PER_PAGE,
    appointmentPage * ITEMS_PER_PAGE,
  );
  const paginatedStaff = filteredStaff.slice(
    (staffPage - 1) * ITEMS_PER_PAGE,
    staffPage * ITEMS_PER_PAGE,
  );
  const paginatedUsers = filteredUsers.slice(
    (userPage - 1) * ITEMS_PER_PAGE,
    userPage * ITEMS_PER_PAGE,
  );

  // ============ LOADING SCREEN ============
  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Loading admin dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  // ============ MAIN RENDER ============
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
            <button
              onClick={() => setActiveAdminTab('overview')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                activeAdminTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="h-4 w-4" /> Overview
            </button>
            <button
              onClick={() => setActiveAdminTab('audit')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                activeAdminTab === 'audit'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Activity className="h-4 w-4" /> Audit Logs
            </button>
            <button
              onClick={() => setActiveAdminTab('limits')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                activeAdminTab === 'limits'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Shield className="h-4 w-4" /> Limits Management
            </button>
          </div>

          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                Welcome back, {user?.name || user?.firstName || 'Admin'}!
              </p>
            </div>
            <div className="flex gap-2 mt-4 md:mt-0 flex-wrap">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300 flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              <button onClick={() => setShowAnalyticsModal(true)} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 flex items-center gap-2 shadow-sm hover:shadow-md">
                <TrendingUp className="h-4 w-4" /> Analytics
              </button>

              <button onClick={() => setShowApprovalModal(true)} className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 flex items-center gap-2 shadow-sm hover:shadow-md">
                <CheckCircle className="h-4 w-4" /> Approve with Code
              </button>

              <button onClick={() => setShowBulkActionModal(true)} className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all duration-300 flex items-center gap-2 shadow-sm hover:shadow-md">
                <Zap className="h-4 w-4" /> Bulk Actions
              </button>

              <button onClick={archiveExpiredAppointments} disabled={actionLoading.archive} className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl hover:from-yellow-700 hover:to-orange-700 transition-all duration-300 flex items-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50">
                <Archive className={`h-4 w-4 ${actionLoading.archive ? 'animate-spin' : ''}`} /> Archive Expired
              </button>

              <button onClick={handleRefresh} disabled={actionLoading.refresh} className="px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300 flex items-center gap-2 shadow-sm hover:shadow-md">
                <RefreshCw className={`h-4 w-4 ${actionLoading.refresh ? 'animate-spin' : ''}`} /> Refresh
              </button>

              <button onClick={() => setShowExportModal(true)} className="px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300 flex items-center gap-2 shadow-sm hover:shadow-md">
                <Download className="h-4 w-4" /> Export
              </button>

              <button onClick={() => setShowAddStaffModal(true)} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 flex items-center gap-2 shadow-sm hover:shadow-md">
                <UserPlus className="h-4 w-4" /> Add Staff
              </button>
            </div>
          </div>

          {/* STATS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Appointments</p>
                  <p className="text-3xl font-bold mt-2 text-blue-600">{formatNumber(stats.total || 0)}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Users</p>
                  <p className="text-3xl font-bold mt-2 text-purple-600">{formatNumber(allUsers.length)}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Staff Members</p>
                  <p className="text-3xl font-bold mt-2 text-green-600">{formatNumber(staffUsers.length)}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Briefcase className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-3xl font-bold mt-2 text-yellow-600">{formatNumber(stats.pending || 0)}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>

          {/* APPOINTMENTS TABLE */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Recent Appointments
              </h2>
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
                  {paginatedAppointments.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">No appointments found</td>
                    </tr>
                  ) : (
                    paginatedAppointments.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{app.serviceName}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{app.userEmail}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{app.providerName}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {app.datetime ? new Date(app.datetime).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            app.status === 'Approved' ? 'bg-green-100 text-green-700' :
                            app.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                            app.status === 'Expired' ? 'bg-gray-100 text-gray-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedAppointment(app)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            <Eye className="h-4 w-4 inline mr-1" /> View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {filteredAppointments.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
                <span className="text-sm text-gray-500">
                  Showing {((appointmentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(appointmentPage * ITEMS_PER_PAGE, filteredAppointments.length)} of {filteredAppointments.length} results
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAppointmentPage(p => Math.max(1, p - 1))}
                    disabled={appointmentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-white transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-600">Page {appointmentPage} of {appointmentTotalPages}</span>
                  <button
                    onClick={() => setAppointmentPage(p => Math.min(appointmentTotalPages, p + 1))}
                    disabled={appointmentPage === appointmentTotalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-white transition"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* STAFF LIST */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Staff Members
                <span className="ml-2 text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  {staffUsers.length} total
                </span>
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              {filteredStaff.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No staff members found</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedStaff.map((staff) => (
                      <tr key={staff.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {staff.name?.charAt(0).toUpperCase()}
                            </div>
                            {staff.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{staff.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                            {staff.department || 'General'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => removeStaff(staff.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            <Trash2 className="h-4 w-4 inline mr-1" /> Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            {filteredStaff.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
                <span className="text-sm text-gray-500">
                  Showing {((staffPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(staffPage * ITEMS_PER_PAGE, filteredStaff.length)} of {filteredStaff.length} staff
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStaffPage(p => Math.max(1, p - 1))}
                    disabled={staffPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-white transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-600">Page {staffPage} of {staffTotalPages}</span>
                  <button
                    onClick={() => setStaffPage(p => Math.min(staffTotalPages, p + 1))}
                    disabled={staffPage === staffTotalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-white transition"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* USERS LIST */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Registered Users
                <span className="ml-2 text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                  {allUsers.length} total
                </span>
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedUsers.map((userItem) => (
                    <tr key={userItem.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {userItem.name?.charAt(0).toUpperCase()}
                          </div>
                          {userItem.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{userItem.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          userItem.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          userItem.role === 'staff' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {userItem.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => viewUserDetails(userItem)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          <Eye className="h-4 w-4 inline mr-1" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredUsers.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
                <span className="text-sm text-gray-500">
                  Showing {((userPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(userPage * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} users
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setUserPage(p => Math.max(1, p - 1))}
                    disabled={userPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-white transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-600">Page {userPage} of {userTotalPages}</span>
                  <button
                    onClick={() => setUserPage(p => Math.min(userTotalPages, p + 1))}
                    disabled={userPage === userTotalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-white transition"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ============ MODALS ============ */}
          {/* Add Staff Modal */}
          {showAddStaffModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Add Staff Member</h3>
                  <button onClick={() => setShowAddStaffModal(false)} className="text-gray-400 hover:text-gray-600">
                    <XIcon className="h-5 w-5" />
                  </button>
                </div>
                <form onSubmit={addStaff} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={newStaff.name}
                      onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <input
                      type="password"
                      value={newStaff.password}
                      onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      required
                      minLength="8"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      value={newStaff.department}
                      onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                    <input
                      type="text"
                      value={newStaff.specialization}
                      onChange={(e) => setNewStaff({ ...newStaff, specialization: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      placeholder="+251 91 234 5678"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience (years)</label>
                    <input
                      type="number"
                      value={newStaff.experience}
                      onChange={(e) => setNewStaff({ ...newStaff, experience: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                    <textarea
                      value={newStaff.bio}
                      onChange={(e) => setNewStaff({ ...newStaff, bio: e.target.value })}
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={actionLoading.addStaff}
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
                    >
                      {actionLoading.addStaff ? <Loader className="h-5 w-5 animate-spin mx-auto" /> : 'Add Staff'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddStaffModal(false)}
                      className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Export Modal */}
          {showExportModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Export Appointments</h3>
                  <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600">
                    <XIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={exportFilters.startDate}
                      onChange={(e) => setExportFilters({ ...exportFilters, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={exportFilters.endDate}
                      onChange={(e) => setExportFilters({ ...exportFilters, endDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={exportFilters.status}
                      onChange={(e) => setExportFilters({ ...exportFilters, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                    <select
                      value={exportFilters.format}
                      onChange={(e) => setExportFilters({ ...exportFilters, format: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="excel">Excel (.xlsx)</option>
                      <option value="csv">CSV (.csv)</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={exportData}
                      disabled={actionLoading.export}
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
                    >
                      {actionLoading.export ? <Loader className="h-5 w-5 animate-spin mx-auto" /> : 'Export'}
                    </button>
                    <button
                      onClick={() => setShowExportModal(false)}
                      className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}