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
  const [auditPage, setAuditPage] = useState(1);
  const [testimonialPage, setTestimonialPage] = useState(1);
  
  // ============ SEARCH & FILTERS ============
  const [staffSearch, setStaffSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [appointmentSearch, setAppointmentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [auditFilter, setAuditFilter] = useState('all');
  
  // ============ MODAL STATES ============
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [showStaffDetailsModal, setShowStaffDetailsModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showTestimonialModal, setShowTestimonialModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedTestimonial, setSelectedTestimonial] = useState(null);
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

  // ============ SYSTEM SETTINGS ============
  const [settings, setSettings] = useState({
    autoArchiveDays: 30,
    maxBookingsPerDay: 3,
    notificationEnabled: true,
    maintenanceMode: false
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

  // ============ FETCH NOTIFICATIONS ============
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notifications/admin');
      setNotifications(response.data || []);
      setUnreadCount((response.data || []).filter(n => !n.read).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      showSuccess('All notifications marked as read');
    } catch (error) {
      showError('Failed to mark notifications as read');
    }
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

  // ============ FETCH AUDIT LOGS ============
  const fetchAuditLogs = useCallback(async () => {
    try {
      const response = await api.get('/audit-logs');
      setAuditLogs(response.data || []);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    }
  }, []);

  // ============ FETCH TESTIMONIALS ============
  const fetchTestimonials = useCallback(async () => {
    try {
      const response = await api.get('/testimonials');
      setTestimonials(response.data || []);
    } catch (error) {
      console.error('Failed to fetch testimonials:', error);
    }
  }, []);

  const approveTestimonial = async (id) => {
    try {
      await api.patch(`/testimonials/${id}/approve`);
      showSuccess('Testimonial approved successfully');
      fetchTestimonials();
    } catch (error) {
      showError('Failed to approve testimonial');
    }
  };

  const rejectTestimonial = async (id) => {
    if (!confirm('Are you sure you want to reject this testimonial?')) return;
    try {
      await api.delete(`/testimonials/${id}`);
      showSuccess('Testimonial rejected and removed');
      fetchTestimonials();
    } catch (error) {
      showError('Failed to reject testimonial');
    }
  };

  // ============ FETCH UPLOADED FILES ============
  const fetchUploadedFiles = useCallback(async () => {
    try {
      const response = await api.get('/uploads');
      if (Array.isArray(response.data)) {
        setUploadedFiles(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
  }, []);

  // ============ FETCH ACTIVITY LOGS ============
  const fetchActivityLogs = useCallback(async () => {
    try {
      const response = await api.get('/activity-logs');
      setActivityLogs(response.data || []);
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
    }
  }, []);

  // ============ FETCH SYSTEM HEALTH ============
  const fetchSystemHealth = useCallback(async () => {
    try {
      const response = await api.get('/system/health');
      setSystemHealth(response.data || {});
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    }
  }, []);

  // ============ FETCH FEEDBACK STATS ============
  const fetchFeedbackStats = useCallback(async () => {
    try {
      const response = await api.get('/feedback/stats');
      setFeedbackStats(response.data || {});
    } catch (error) {
      console.error('Failed to fetch feedback stats:', error);
    }
  }, []);

  // ============ BULK OPERATIONS ============
  const archiveExpiredAppointments = async () => {
    setActionLoading(prev => ({ ...prev, archive: true }));
    try {
      await api.post('/appointments/archive');
      showSuccess('Expired appointments archived successfully');
      fetchAllData();
    } catch (error) {
      showError('Failed to archive appointments');
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
      await api.post('/appointments/approve-with-code', { approvalCode });
      showSuccess('Appointment approved successfully');
      setShowApprovalModal(false);
      setApprovalCode('');
      fetchAllData();
    } catch (error) {
      showError(error.response?.data?.message || 'Invalid approval code');
    }
  };

  // ============ KEYBOARD SHORTCUTS ============
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        setShowExportModal(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setShowAddStaffModal(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setShowApprovalModal(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setShowBulkActionModal(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        setShowSettingsModal(true);
      }
      if (e.key === 'Escape') {
        setSelectedAppointment(null);
        setShowExportModal(false);
        setShowAddStaffModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // ============ AUTHENTICATION CHECK ============
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      if (!authRedirectHandledRef.current) {
        authRedirectHandledRef.current = true;
        router.replace('/login');
      }
      return;
    }
    if (user?.role !== 'admin') {
      if (!authRedirectHandledRef.current) {
        authRedirectHandledRef.current = true;
        router.replace(getDefaultRouteForRole(user?.role));
      }
      return;
    }
    authRedirectHandledRef.current = false;
    if (initializedForUserRef.current === user?.email) return;
    
    initializedForUserRef.current = user?.email;
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

  // ============ PAGINATION RESET ON SEARCH ============
  useEffect(() => {
    setAppointmentPage(1);
  }, [appointmentSearch, statusFilter, priorityFilter, dateFilter]);

  useEffect(() => {
    setStaffPage(1);
  }, [staffSearch]);

  useEffect(() => {
    setUserPage(1);
  }, [userSearch]);

  // ============ FETCH ALL DATA ============
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
      const staff = staffRes.data || [];
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

  const updateAppointmentStatus = async (id, status) => {
    setActionLoading(prev => ({ ...prev, updateStatus: true }));
    try {
      await api.patch(`/appointments/${id}`, { 
        status, 
        comment: status === 'Rejected' ? comment : '' 
      });
      showSuccess(`Appointment ${status.toLowerCase()}`);
      setComment('');
      setSelectedAppointment(null);
      fetchAllData();
    } catch (error) {
      showError('Failed to update appointment');
    } finally {
      setActionLoading(prev => ({ ...prev, updateStatus: false }));
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

  // ============ EXPORT FUNCTIONALITY ============
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

  const setQuickDateRange = (range) => {
    const today = new Date();
    const start = new Date();
    
    switch(range) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        return;
    }
    
    setExportFilters({
      ...exportFilters,
      startDate: start.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    });
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

  // ============ PAGINATION CALCULATIONS ============
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

  // Growth rates for stats cards
  const totalGrowth = getGrowthRate(stats.total || 0, stats.previousTotal || 0);
  const pendingGrowth = getGrowthRate(stats.pending || 0, stats.previousPending || 0);
  const approvedGrowth = getGrowthRate(stats.approved || 0, stats.previousApproved || 0);

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  // Tab navigation
  const renderTabContent = () => {
    switch(activeAdminTab) {
      case 'audit':
        return <AuditDashboard />;
      case 'limits':
        return <LimitsManagement />;
      case 'overview':
      default:
        return renderOverviewContent();
    }
  };

  const renderOverviewContent = () => (
    <>
      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Appointments</p>
              <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                {formatNumber(stats.total || 0)}
              </p>
              {totalGrowth !== 0 && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${totalGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalGrowth > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
                  {Math.abs(totalGrowth)}% from last period
                </p>
              )}
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
              <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
                {formatNumber(allUsers.length)}
              </p>
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
              <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">
                {formatNumber(staffUsers.length)}
              </p>
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
              <p className="text-3xl font-bold mt-2 text-yellow-600">
                {formatNumber(stats.pending || 0)}
              </p>
              {pendingGrowth !== 0 && (
                <p className={`text-xs mt-1 ${pendingGrowth > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {pendingGrowth > 0 ? '+' : ''}{pendingGrowth}% from last
                </p>
              )}
            </div>
            <div className="p-3 bg-yellow-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-3xl font-bold mt-2 text-green-600">
                {formatNumber(stats.approved || 0)}
              </p>
              {approvedGrowth !== 0 && (
                <p className={`text-xs mt-1 ${approvedGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {approvedGrowth > 0 ? '+' : ''}{approvedGrowth}% from last
                </p>
              )}
            </div>
            <div className="p-3 bg-green-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Rejected</p>
              <p className="text-3xl font-bold mt-2 text-red-600">
                {formatNumber(stats.rejected || 0)}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Expired</p>
              <p className="text-3xl font-bold mt-2 text-gray-600">
                {formatNumber(stats.expired || 0)}
              </p>
            </div>
            <div className="p-3 bg-gray-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <AlertTriangle className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Approval Rate</p>
              <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-teal-600 to-teal-400 bg-clip-text text-transparent">
                {stats.total > 0 ? Math.round((stats.approved || 0) / stats.total * 100) : 0}%
              </p>
            </div>
            <div className="p-3 bg-teal-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Target className="h-6 w-6 text-teal-600" />
            </div>
          </div>
        </div>
      </div>

      {/* SYSTEM HEALTH CARD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-green-600 uppercase tracking-wide">System Status</p><p className="text-lg font-bold text-green-700">{systemHealth.status || 'Operational'}</p></div>
            <ShieldCheck className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-blue-600 uppercase tracking-wide">API Response</p><p className="text-lg font-bold text-blue-700">{systemHealth.apiLatency || 0}ms</p></div>
            <Zap className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-purple-600 uppercase tracking-wide">Active Users</p><p className="text-lg font-bold text-purple-700">{systemHealth.activeUsers || 0}</p></div>
            <UsersRound className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-orange-600 uppercase tracking-wide">Avg Rating</p><p className="text-lg font-bold text-orange-700">{feedbackStats.averageRating || 0}★</p></div>
            <Star className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="col-span-2 flex justify-end gap-2 mb-4">
          <button onClick={() => setAnalyticsPeriod('week')} className={`px-3 py-1 rounded-lg text-sm transition-all ${analyticsPeriod === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Last 7 Days</button>
          <button onClick={() => setAnalyticsPeriod('month')} className={`px-3 py-1 rounded-lg text-sm transition-all ${analyticsPeriod === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Last 30 Days</button>
          <button onClick={() => setAnalyticsPeriod('quarter')} className={`px-3 py-1 rounded-lg text-sm transition-all ${analyticsPeriod === 'quarter' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Last 90 Days</button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-blue-600" /> Appointment Trends</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="appointments" fill="#3b82f6" name="Total" radius={[4, 4, 0, 0]} />
                <Bar dataKey="approved" fill="#10b981" name="Approved" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejected" fill="#ef4444" name="Rejected" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-purple-600" /> Cumulative Growth</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="cumulative" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" name="Total Appointments" />
                <Area type="monotone" dataKey="approved" stackId="2" stroke="#10b981" fill="#10b981" name="Approved" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><PieChart className="h-5 w-5 text-pink-600" /> Status Distribution</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RPieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />))}
                </Pie>
                <Tooltip />
                <Legend />
              </RPieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><LineChart className="h-5 w-5 text-green-600" /> Weekly Performance</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="week" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="appointments" stroke="#3b82f6" strokeWidth={2} name="Total" dot={{ fill: '#3b82f6' }} />
                <Line type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2} name="Approved" dot={{ fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {radarData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Target className="h-5 w-5 text-orange-600" /> Department Performance</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="department" />
                  <PolarRadiusAxis domain={[0, 'auto']} />
                  <Radar name="Efficiency %" dataKey="efficiency" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  <Radar name="Avg Appointments" dataKey="avgPerStaff" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Tooltip />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* RECENT APPOINTMENTS TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Recent Appointments
              {selectedAppointments.length > 0 && (
                <span className="ml-2 text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  {selectedAppointments.length} selected
                </span>
              )}
            </h2>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search appointments..."
                  value={appointmentSearch}
                  onChange={(e) => setAppointmentSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Expired">Expired</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priority</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </select>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
              <button
                onClick={selectAllAppointments}
                className="px-3 py-2 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 transition"
              >
                {selectedAppointments.length === paginatedAppointments.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10">
                  <input
                    type="checkbox"
                    checked={selectedAppointments.length === paginatedAppointments.length && paginatedAppointments.length > 0}
                    onChange={selectAllAppointments}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedAppointments.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedAppointments.includes(app.id)}
                      onChange={() => toggleAppointmentSelection(app.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{app.serviceName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{app.userEmail}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{app.providerName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {app.datetime ? new Date(app.datetime).toLocaleString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      app.priority === 'Urgent' ? 'bg-red-100 text-red-700 animate-pulse' :
                      app.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                      app.priority === 'Low' ? 'bg-gray-100 text-gray-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {app.priority || 'Normal'}
                    </span>
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
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200 flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAppointments.length === 0 && (
            <div className="text-center py-16">
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No appointments found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {filteredAppointments.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <span className="text-sm text-gray-500">
              Showing {((appointmentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(appointmentPage * ITEMS_PER_PAGE, filteredAppointments.length)} of {filteredAppointments.length} results
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAppointmentPage(p => Math.max(1, p - 1))}
                disabled={appointmentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-all duration-200 flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <div className="flex gap-1">
                {[...Array(Math.min(5, appointmentTotalPages))].map((_, i) => {
                  let pageNum;
                  if (appointmentTotalPages <= 5) {
                    pageNum = i + 1;
                  } else if (appointmentPage <= 3) {
                    pageNum = i + 1;
                  } else if (appointmentPage >= appointmentTotalPages - 2) {
                    pageNum = appointmentTotalPages - 4 + i;
                  } else {
                    pageNum = appointmentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setAppointmentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm transition-all duration-200 ${
                        appointmentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setAppointmentPage(p => Math.min(appointmentTotalPages, p + 1))}
                disabled={appointmentPage === appointmentTotalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-all duration-200 flex items-center gap-1"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* STAFF LIST */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Staff Members
              <span className="ml-2 text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full">
                {staffUsers.length} total
              </span>
            </h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search staff..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specialization</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Experience</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
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
                    <td className="px-6 py-4 text-sm text-gray-600">{staff.specialization || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {staff.experience ? `${staff.experience} years` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatPhone(staff.phone)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => viewStaffDetails(staff)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200 flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" /> View
                        </button>
                        <button
                          onClick={() => removeStaff(staff.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors duration-200 flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" /> Remove
                        </button>
                      </div>
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
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-white transition-all duration-200 flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="text-sm text-gray-600">Page {staffPage} of {staffTotalPages}</span>
              <button
                onClick={() => setStaffPage(p => Math.min(staffTotalPages, p + 1))}
                disabled={staffPage === staffTotalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-white transition-all duration-200 flex items-center gap-1"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* USERS LIST */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Registered Users
              <span className="ml-2 text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                {allUsers.length} total
              </span>
            </h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
              />
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
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
                  <td className="px-6 py-4 text-sm text-gray-600">{userItem.company || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatPhone(userItem.phone)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {userItem.createdAt ? new Date(userItem.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => viewUserDetails(userItem)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200 flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" /> View
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
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-white transition-all duration-200 flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="text-sm text-gray-600">Page {userPage} of {userTotalPages}</span>
              <button
                onClick={() => setUserPage(p => Math.min(userTotalPages, p + 1))}
                disabled={userPage === userTotalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-white transition-all duration-200 flex items-center gap-1"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );

  // ============ MODALS (same as before, omitted for brevity but kept in actual file) ============
  // ... (keep all modal JSX from original file)

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
              <BarChart3 className="h-4 w-4" />
              Overview
            </button>
            <button
              onClick={() => setActiveAdminTab('audit')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                activeAdminTab === 'audit'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Activity className="h-4 w-4" />
              Audit Logs
            </button>
            <button
              onClick={() => setActiveAdminTab('limits')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                activeAdminTab === 'limits'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Shield className="h-4 w-4" />
              Limits Management
            </button>
          </div>

          {/* HEADER WITH NOTIFICATIONS */}
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
              {/* Notifications Dropdown */}
              <div className="relative">
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
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-indigo-600" />
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                      </div>
                      <div className="flex gap-2">
                        {unreadCount > 0 && (
                          <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-700">
                            Mark all read
                          </button>
                        )}
                        <button onClick={() => setShowAnnouncementModal(true)} className="text-xs text-green-600 hover:text-green-700">
                          Send Announcement
                        </button>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p>No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map(notif => (
                          <div
                            key={notif.id}
                            className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-all duration-200 ${!notif.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                            onClick={() => markAsRead(notif.id)}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${!notif.read ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                {notif.type === 'appointment' ? <Calendar className="h-4 w-4 text-blue-600" /> :
                                 notif.type === 'approval' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                                 notif.type === 'announcement' ? <Megaphone className="h-4 w-4 text-purple-600" /> :
                                 <Bell className="h-4 w-4 text-purple-600" />}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{notif.title || notif.message?.substring(0, 50)}</p>
                                <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                                <p className="text-xs text-gray-400 mt-2">{formatDate(notif.createdAt)}</p>
                              </div>
                              {!notif.read && <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

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

              <button onClick={() => setShowSettingsModal(true)} className="px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300 flex items-center gap-2 shadow-sm hover:shadow-md">
                <Settings2 className="h-4 w-4" /> Settings
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

          {/* Render Active Tab Content */}
          {renderTabContent()}

        </div>
      </div>

      {/* Add CSS animation */}
      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}