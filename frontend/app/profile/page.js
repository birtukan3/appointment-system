"use client";

import { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '../providers';
import api from '../lib/api';
import { 
  User, Mail, Building2, Phone, Save, ArrowLeft, AlertCircle, 
  Briefcase, Loader, CheckCircle, RefreshCw, Sparkles, Shield, 
  Key, Fingerprint, Bell, Calendar, Clock, Award, TrendingUp,
  CalendarCheck, Clock8, Camera, Upload, X, Eye, EyeOff, Trash2,
  Lock, UserX
} from 'lucide-react';
import toast from 'react-hot-toast';

// ============================================
// TOAST MANAGER
// ============================================
const ToastManager = {
  lastMessage: '',
  lastTime: 0,
  timer: null,
  showing: false,

  show(message, type = 'success', duration = 3000) {
    if (message && message.toLowerCase().includes('profile updated')) {
      console.log('[TOAST BLOCKED] Profile success toast suppressed');
      return;
    }
    
    const now = Date.now();
    if (this.lastMessage === message && (now - this.lastTime) < 3000) return;
    if (this.showing) return;
    
    this.lastMessage = message;
    this.lastTime = now;
    this.showing = true;
    
    if (type === 'success') {
      toast.success(message, { duration });
    } else if (type === 'error') {
      toast.error(message, { duration });
    } else {
      toast(message, { icon: 'ℹ️', duration });
    }
    
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.showing = false;
    }, duration + 500);
  },

  clear() {
    if (this.timer) clearTimeout(this.timer);
    this.showing = false;
  }
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading, updateUser, logout } = useContext(AppContext);
  
  // ============ STATE ============
  const [profile, setProfile] = useState({ 
    name: '', email: '', company: '', phone: '', department: '', 
    avatar: null, preferences: { theme: 'light', notifications: true }
  });
  const [originalProfile, setOriginalProfile] = useState({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isChanged, setIsChanged] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  
  // ============ MODALS ============
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  
  // ============ LOADING STATES ============
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  
  // ============ FORM DATA ============
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [deactivateReason, setDeactivateReason] = useState('');
  
  // ============ STATS ============
  const [stats, setStats] = useState({ 
    totalAppointments: 0, 
    completedAppointments: 0, 
    pendingAppointments: 0, 
    upcomingAppointments: 0, 
    memberSince: '' 
  });
  
  // ============ REFS ============
  const fileInputRef = useRef(null);
  const isMounted = useRef(true);
  const successTimeoutRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const isPasswordSubmittingRef = useRef(false);

  // ============ GREETING ============
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅 Good Morning';
    if (hour < 18) return '☀️ Good Afternoon';
    return '🌙 Good Evening';
  }, []);

  // ============ API CALLS ============
  const fetchUserStats = useCallback(async () => {
    try {
      const [statsResponse, appointmentsResponse] = await Promise.all([
        api.get('/appointments/stats'),
        api.get('/appointments/my', { limit: 100 })
      ]);
      
      let appointments = [];
      if (Array.isArray(appointmentsResponse.data)) {
        appointments = appointmentsResponse.data;
      } else if (appointmentsResponse.data?.data && Array.isArray(appointmentsResponse.data.data)) {
        appointments = appointmentsResponse.data.data;
      }
      
      const now = new Date();
      const completed = appointments.filter(a => 
        a.status === 'approved' && new Date(a.datetime) < now
      ).length;
      const pending = appointments.filter(a => 
        a.status === 'pending'
      ).length;
      const upcoming = appointments.filter(a => 
        a.status === 'approved' && new Date(a.datetime) > now
      ).length;
      
      if (isMounted.current) {
        setStats({
          totalAppointments: statsResponse.total || appointments.length,
          completedAppointments: statsResponse.completed || completed,
          pendingAppointments: pending,
          upcomingAppointments: upcoming,
          memberSince: user?.createdAt || new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, [user]);

  const loadProfile = useCallback(async () => {
    if (hasLoadedRef.current) return;
    
    try {
      hasLoadedRef.current = true;
      const response = await api.get('/users/profile');
      const userData = response.data?.data || response.data || response;
      
      const userProfile = { 
        name: userData.name || user?.name || user?.firstName || '', 
        email: userData.email || user?.email || '', 
        company: userData.company || user?.company || '', 
        phone: userData.phone || user?.phone || '', 
        department: userData.department || user?.department || '',
        avatar: userData.avatar || user?.avatar || null,
        preferences: userData.preferences || user?.preferences || { theme: 'light', notifications: true }
      };
      
      if (isMounted.current) {
        setProfile(userProfile);
        setOriginalProfile(userProfile);
      }
      
      if (updateUser && userData.id) {
        updateUser(userData);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      if (user && isMounted.current) {
        const userProfile = { 
          name: user.name || user.firstName || '', 
          email: user.email || '', 
          company: user.company || '', 
          phone: user.phone || '', 
          department: user.department || '',
          avatar: user.avatar || null,
          preferences: user.preferences || { theme: 'light', notifications: true }
        };
        setProfile(userProfile);
        setOriginalProfile(userProfile);
      }
    }
  }, [user, updateUser]);

  // ============ EFFECTS ============
  useEffect(() => {
    isMounted.current = true;
    
    if (authLoading) return;
    if (!isAuthenticated) { 
      router.push('/login'); 
      return; 
    }
    
    loadProfile();
    fetchUserStats();
    
    return () => {
      isMounted.current = false;
      hasLoadedRef.current = false;
      ToastManager.clear();
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    const hasChanged = profile.name !== originalProfile.name || 
                       profile.company !== originalProfile.company || 
                       profile.phone !== originalProfile.phone || 
                       profile.department !== originalProfile.department ||
                       profile.preferences?.theme !== originalProfile.preferences?.theme ||
                       profile.preferences?.notifications !== originalProfile.preferences?.notifications;
    setIsChanged(hasChanged);
  }, [profile, originalProfile]);

  useEffect(() => {
    if (showSuccess) {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      successTimeoutRef.current = setTimeout(() => {
        if (isMounted.current) {
          setShowSuccess(false);
        }
      }, 4000);
      return () => {
        if (successTimeoutRef.current) {
          clearTimeout(successTimeoutRef.current);
        }
      };
    }
  }, [showSuccess]);

  // ============ UTILITY FUNCTIONS ============
  const checkPasswordStrength = useCallback((password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
    return strength;
  }, []);

  const strengthInfo = useMemo(() => {
    if (passwordStrength === 0) return { color: "bg-gray-200", text: "No password", width: "0%" };
    if (passwordStrength === 1) return { color: "bg-red-500", text: "Very Weak", width: "20%" };
    if (passwordStrength === 2) return { color: "bg-orange-500", text: "Weak", width: "40%" };
    if (passwordStrength === 3) return { color: "bg-yellow-500", text: "Medium", width: "60%" };
    if (passwordStrength === 4) return { color: "bg-blue-500", text: "Strong", width: "80%" };
    return { color: "bg-green-500", text: "Very Strong", width: "100%" };
  }, [passwordStrength]);

  const validatePhone = (phone) => {
    if (!phone) return true;
    const clean = phone.replace(/[\s\-\(\)]/g, '');
    const ethiopianPhoneRegex = /^(?:\+251|0)[1-9]\d{8}$/;
    return ethiopianPhoneRegex.test(clean);
  };

  const formatPhoneForDisplay = (phone) => {
    if (!phone) return '';
    const clean = phone.replace(/[\s\-\(\)]/g, '');
    if (clean.startsWith('+251')) {
      return clean.replace(/(\+251)(\d{2})(\d{3})(\d{4})/, '$1 $2 $3 $4');
    }
    if (clean.startsWith('0')) {
      return clean.replace(/(0)(\d{2})(\d{3})(\d{4})/, '$1$2 $3 $4');
    }
    return phone;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // ============ HANDLERS ============
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmittingRef.current || isSubmitting) return;
    
    if (profile.phone && !validatePhone(profile.phone)) {
      setErrors({ phone: 'Please enter a valid Ethiopian phone number' });
      ToastManager.show('Please enter a valid Ethiopian phone number', 'error');
      return;
    }
    
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setLoading(true);
    setErrors({});
    
    try {
      const updateData = {};
      if (profile.name !== originalProfile.name) updateData.name = profile.name;
      if (profile.company !== originalProfile.company) updateData.company = profile.company;
      if (profile.phone !== originalProfile.phone) updateData.phone = profile.phone;
      if (profile.department !== originalProfile.department) updateData.department = profile.department;
      if (JSON.stringify(profile.preferences) !== JSON.stringify(originalProfile.preferences)) {
        updateData.preferences = profile.preferences;
      }

      if (Object.keys(updateData).length === 0) { 
        ToastManager.show('No changes to save', 'info');
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        setLoading(false);
        return; 
      }

      const response = await api.patch('/users/profile', updateData);
      
      if (response.data?.success === false) {
        throw new Error(response.data.message || 'Update failed');
      }
      
      const updatedData = response.data?.data || response.data || {};
      
      if (updateUser && updatedData.id) {
        const updatedUser = {
          ...user,
          ...updatedData,
          name: updatedData.name || user?.name,
          company: updatedData.company || user?.company,
          phone: updatedData.phone || user?.phone,
          department: updatedData.department || user?.department,
        };
        updateUser(updatedUser);
      }
      
      setProfile(prev => ({ 
        ...prev, 
        ...updatedData,
        name: updatedData.name || prev.name,
        company: updatedData.company || prev.company,
        phone: updatedData.phone || prev.phone,
        department: updatedData.department || prev.department,
      }));
      setOriginalProfile(prev => ({ 
        ...prev, 
        ...updatedData,
        name: updatedData.name || prev.name,
        company: updatedData.company || prev.company,
        phone: updatedData.phone || prev.phone,
        department: updatedData.department || prev.department,
      }));
      
      setShowSuccess(true);
      
      await fetchUserStats();
      
    } catch (error) {
      console.error('❌ Update error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to update profile';
      ToastManager.show(errorMsg, 'error');
      setErrors({ general: errorMsg });
    } finally { 
      setLoading(false);
      setIsSubmitting(false);
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 1000);
    }
  };

  // ✅ FIXED: Change Password Handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (isPasswordSubmittingRef.current || isPasswordSubmitting) {
      return;
    }
    
    // ✅ Validate current password
    if (!passwordData.current || passwordData.current.trim() === '') {
      ToastManager.show('Current password is required', 'error');
      return;
    }
    
    // ✅ Validate new password
    if (!passwordData.new || passwordData.new.length < 8) {
      ToastManager.show('Password must be at least 8 characters', 'error');
      return;
    }
    
    // ✅ Check if passwords match
    if (passwordData.new !== passwordData.confirm) {
      ToastManager.show('New passwords do not match', 'error');
      return;
    }
    
    // ✅ Check password strength
    if (passwordStrength < 3) {
      ToastManager.show('Please choose a stronger password', 'error');
      return;
    }
    
    isPasswordSubmittingRef.current = true;
    setIsPasswordSubmitting(true);
    
    try {
      console.log('📤 Sending change password request...');
      
      const response = await api.post('/users/change-password', {
        currentPassword: passwordData.current,
        newPassword: passwordData.new
      });
      
      console.log('📥 Response:', response);
      
      if (response.data?.success === false) {
        throw new Error(response.data.message || 'Failed to change password');
      }
      
      ToastManager.show('Password changed successfully!', 'success');
      
      // ✅ Reset form
      setShowChangePassword(false);
      setPasswordData({ current: '', new: '', confirm: '' });
      setPasswordStrength(0);
      
    } catch (error) {
      console.error('❌ Change password error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Current password is incorrect';
      ToastManager.show(errorMsg, 'error');
    } finally {
      setIsPasswordSubmitting(false);
      isPasswordSubmittingRef.current = false;
    }
  };

  // ✅ FIXED: Deactivate Account Handler
  const handleDeactivate = async () => {
    if (isDeactivating) return;
    
    setIsDeactivating(true);
    try {
      const response = await api.post('/users/deactivate', { 
        reason: deactivateReason || 'User initiated deactivation' 
      });
      
      if (response.data?.success === false) {
        throw new Error(response.data.message || 'Failed to deactivate account');
      }
      
      ToastManager.show('Account deactivated successfully', 'success');
      setShowDeactivateModal(false);
      
      // ✅ Logout and redirect
      if (logout) {
        await logout();
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      router.push('/login');
      
    } catch (error) {
      console.error('❌ Deactivation error:', error);
      ToastManager.show(error.message || 'Failed to deactivate account', 'error');
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      ToastManager.show('Only image files are allowed (JPEG, PNG, GIF, WEBP)', 'error');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      ToastManager.show('File size must be less than 2MB', 'error');
      return;
    }
    
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      const response = await api.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const newAvatar = response.data.avatar;
      setProfile(prev => ({ ...prev, avatar: newAvatar }));
      if (updateUser) updateUser({ ...user, avatar: newAvatar });
      ToastManager.show('Profile picture updated!', 'success');
      setShowAvatarUpload(false);
    } catch (error) {
      console.error('Avatar upload error:', error);
      ToastManager.show('Failed to upload avatar', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    try {
      await api.delete('/users/avatar');
      setProfile(prev => ({ ...prev, avatar: null }));
      if (updateUser) updateUser({ ...user, avatar: null });
      ToastManager.show('Profile picture removed', 'success');
      setShowAvatarUpload(false);
    } catch (error) {
      console.error('Remove avatar error:', error);
      ToastManager.show('Failed to remove avatar', 'error');
    }
  };

  const handleRefresh = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      const response = await api.get('/users/profile');
      const freshData = response.data?.data || response.data || response;
      const refreshedProfile = { 
        name: freshData.name || '', 
        email: freshData.email || '', 
        company: freshData.company || '', 
        phone: freshData.phone || '', 
        department: freshData.department || '',
        avatar: freshData.avatar || null,
        preferences: freshData.preferences || { theme: 'light', notifications: true }
      };
      if (updateUser) updateUser(freshData);
      setProfile(refreshedProfile);
      setOriginalProfile(refreshedProfile);
      await fetchUserStats();
      ToastManager.show('Profile refreshed', 'success');
    } catch (error) { 
      console.error('Refresh error:', error);
      ToastManager.show('Failed to refresh profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const memberSince = useMemo(() => {
    if (!stats.memberSince) return 'Recently';
    const date = new Date(stats.memberSince);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [stats.memberSince]);

  const statsCards = [
    { key: 'total', label: 'Total Appointments', value: stats.totalAppointments, icon: Calendar, color: 'from-blue-500 to-blue-600' },
    { key: 'completed', label: 'Completed', value: stats.completedAppointments, icon: CheckCircle, color: 'from-green-500 to-green-600' },
    { key: 'pending', label: 'Pending', value: stats.pendingAppointments, icon: Clock, color: 'from-amber-500 to-amber-600' },
    { key: 'upcoming', label: 'Upcoming', value: stats.upcomingAppointments, icon: CalendarCheck, color: 'from-purple-500 to-purple-600' },
  ];

  // ============ LOADING ============
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // ============ RENDER ============
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 py-8 relative">
      
      {/* ===== SUCCESS BANNER ===== */}
      {showSuccess && (
        <div className="fixed top-5 right-5 z-50 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl flex items-center gap-3 shadow-xl animate-fade-in-down max-w-sm">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-green-700 font-medium">Profile updated successfully!</p>
          <button onClick={() => setShowSuccess(false)} className="ml-auto text-green-800 hover:opacity-70">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ===== BACKGROUND DECORATIONS ===== */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ===== HEADER ===== */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
              <User className="h-8 w-8 text-indigo-600" />
              Profile Settings
            </h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
              <span>{greeting}, {user?.firstName || 'User'}!</span>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                {user?.role === 'admin' ? '👑 Admin' : user?.role === 'staff' ? '👨‍⚕️ Staff' : '👤 User'}
              </span>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button 
              onClick={handleRefresh} 
              disabled={loading}
              className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 bg-white px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} /> 
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button 
              onClick={() => router.push('/dashboard')} 
              className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 bg-white px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          </div>
        </div>
        
        {/* ===== MAIN GRID ===== */}
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* ===== LEFT COLUMN ===== */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-in">
              
              {/* Profile Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 relative overflow-hidden text-center">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
                </div>
                <div className="relative">
                  <div className="relative inline-block">
                    <div 
                      className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center shadow-lg mx-auto relative group cursor-pointer transition-transform hover:scale-105" 
                      onClick={() => setShowAvatarUpload(true)}
                    >
                      {profile.avatar ? (
                        <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <span className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                          {getInitials(profile.name)}
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2">
                      <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-white mt-4">{profile.name || 'Your Name'}</h2>
                  <p className="text-indigo-200 flex items-center justify-center gap-1 mt-1">
                    <Mail className="h-3 w-3" /> {profile.email}
                  </p>
                  <div className="flex justify-center gap-2 mt-3">
                    <span className="text-xs bg-white/20 px-3 py-1 rounded-full text-white">
                      {user?.role === 'admin' ? '👑 Administrator' : user?.role === 'staff' ? '👨‍⚕️ Staff Member' : '👤 User'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Account Statistics</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {statsCards.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.key} className={`text-center p-3 bg-gradient-to-r ${stat.color} rounded-xl text-white`}>
                        <Icon className="h-5 w-5 mx-auto mb-1 opacity-80" />
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-xs opacity-80">{stat.label}</p>
                      </div>
                    );
                  })}
                  <div className="text-center p-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-white col-span-2">
                    <Clock className="h-5 w-5 mx-auto mb-1 opacity-80" />
                    <p className="text-sm font-medium">Member since {memberSince}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-5 space-y-2">
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-300 text-gray-700 hover:text-indigo-600 group"
                >
                  <Key className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Change Password</span>
                  <Shield className="h-3 w-3 ml-auto text-gray-400" />
                </button>
                <button
                  onClick={() => setShowDeactivateModal(true)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-300 text-red-600 group"
                >
                  <UserX className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Deactivate Account</span>
                  <AlertCircle className="h-3 w-3 ml-auto text-red-400" />
                </button>
                <button
                  disabled
                  className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl text-gray-400 cursor-not-allowed"
                >
                  <Fingerprint className="h-4 w-4" />
                  <span>Two-Factor Authentication</span>
                  <span className="text-xs ml-auto">Coming Soon</span>
                </button>
              </div>
            </div>
          </div>

          {/* ===== RIGHT COLUMN ===== */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-in">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Edit Profile</h2>
                  <span className="ml-auto text-xs text-gray-400">
                    {isChanged ? '⚠️ Unsaved changes' : '✅ All saved'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Update your personal information</p>
              </div>

              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <User className="h-4 w-4 text-indigo-500" />
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors ${focusedField === 'name' ? 'text-indigo-500' : 'text-gray-400'}`} />
                      <input 
                        type="text" 
                        value={profile.name} 
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                        className={`w-full pl-10 pr-3 py-3 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white ${focusedField === 'name' ? 'border-indigo-300 shadow-md' : 'border-gray-200'}`}
                        placeholder="John Doe" 
                        required 
                      />
                    </div>
                  </div>

                  {/* Email - Disabled */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-indigo-500" />
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input 
                        type="email" 
                        value={profile.email} 
                        className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl bg-gray-100 cursor-not-allowed text-gray-500" 
                        disabled 
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Email cannot be changed
                    </p>
                  </div>

                  {/* Company */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-indigo-500" />
                      Company
                    </label>
                    <div className="relative">
                      <Building2 className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors ${focusedField === 'company' ? 'text-indigo-500' : 'text-gray-400'}`} />
                      <input 
                        type="text" 
                        value={profile.company} 
                        onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                        onFocus={() => setFocusedField('company')}
                        onBlur={() => setFocusedField(null)}
                        className={`w-full pl-10 pr-3 py-3 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white ${focusedField === 'company' ? 'border-indigo-300 shadow-md' : 'border-gray-200'}`}
                        placeholder="Your company" 
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-indigo-500" />
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors ${focusedField === 'phone' ? 'text-indigo-500' : 'text-gray-400'}`} />
                      <input 
                        type="tel" 
                        value={profile.phone} 
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        onFocus={() => setFocusedField('phone')}
                        onBlur={() => setFocusedField(null)}
                        className={`w-full pl-10 pr-3 py-3 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white ${focusedField === 'phone' ? 'border-indigo-300 shadow-md' : 'border-gray-200'} ${errors.phone ? 'border-red-500' : ''}`}
                        placeholder="+251 91 234 5678" 
                      />
                    </div>
                    {profile.phone && !errors.phone && (
                      <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Format: {formatPhoneForDisplay(profile.phone)}
                      </p>
                    )}
                    {errors.phone && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {errors.phone}
                      </p>
                    )}
                  </div>

                  {/* Department - Admin/Staff only */}
                  {(user?.role === 'admin' || user?.role === 'staff') && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-indigo-500" />
                        Department
                      </label>
                      <div className="relative">
                        <Briefcase className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors ${focusedField === 'department' ? 'text-indigo-500' : 'text-gray-400'}`} />
                        <input 
                          type="text" 
                          value={profile.department || ''} 
                          onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                          onFocus={() => setFocusedField('department')}
                          onBlur={() => setFocusedField(null)}
                          className={`w-full pl-10 pr-3 py-3 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white ${focusedField === 'department' ? 'border-indigo-300 shadow-md' : 'border-gray-200'}`}
                          placeholder="Engineering"
                        />
                      </div>
                    </div>
                  )}

                  {/* Form Actions */}
                  <div className="pt-4 border-t border-gray-100 flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      disabled={!isChanged || loading}
                      onClick={() => setProfile(originalProfile)}
                      className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reset Changes
                    </button>
                    <button
                      type="submit"
                      disabled={!isChanged || loading}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:opacity-90 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Profile
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CHANGE PASSWORD MODAL ===== */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Lock className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Change Password</h3>
              </div>
              <button onClick={() => { setShowChangePassword(false); setPasswordData({ current: '', new: '', confirm: '' }); setPasswordStrength(0); }} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                <div className="relative">
                  <input 
                    type={showCurrentPassword ? "text" : "password"} 
                    value={passwordData.current} 
                    onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })} 
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition" 
                    placeholder="Enter current password" 
                    required 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)} 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <div className="relative">
                  <input 
                    type={showNewPassword ? "text" : "password"} 
                    value={passwordData.new} 
                    onChange={(e) => { 
                      setPasswordData({ ...passwordData, new: e.target.value });
                      checkPasswordStrength(e.target.value);
                    }} 
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition" 
                    placeholder="Enter new password" 
                    required 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowNewPassword(!showNewPassword)} 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordData.new && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 flex-1 rounded-full ${strengthInfo.color}`} style={{ width: strengthInfo.width }}></div>
                      <span className="text-xs font-medium text-slate-600">{strengthInfo.text}</span>
                    </div>
                    <ul className="text-xs text-slate-500 mt-1 space-y-0.5">
                      <li className={passwordData.new.length >= 8 ? "text-green-500" : ""}>• Minimum 8 characters</li>
                      <li className={/[A-Z]/.test(passwordData.new) ? "text-green-500" : ""}>• At least 1 uppercase letter</li>
                      <li className={/[a-z]/.test(passwordData.new) ? "text-green-500" : ""}>• At least 1 lowercase letter</li>
                      <li className={/[0-9]/.test(passwordData.new) ? "text-green-500" : ""}>• At least 1 number</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    value={passwordData.confirm} 
                    onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} 
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition ${passwordData.confirm && passwordData.confirm !== passwordData.new ? 'border-red-500' : 'border-slate-200'}`} 
                    placeholder="Confirm new password" 
                    required 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordData.confirm && passwordData.confirm !== passwordData.new && (
                  <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="submit" 
                  disabled={isPasswordSubmitting || passwordData.new !== passwordData.confirm || passwordStrength < 3 || !passwordData.current} 
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPasswordSubmitting ? <Loader className="h-5 w-5 animate-spin mx-auto" /> : 'Update Password'}
                </button>
                <button 
                  type="button" 
                  onClick={() => { setShowChangePassword(false); setPasswordData({ current: '', new: '', confirm: '' }); setPasswordStrength(0); }} 
                  className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== DEACTIVATE MODAL ===== */}
      {showDeactivateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Deactivate Account?</h3>
              <p className="text-slate-500 text-sm mt-1">This action cannot be undone. All your data will be archived.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason (Optional)</label>
                <textarea 
                  value={deactivateReason} 
                  onChange={(e) => setDeactivateReason(e.target.value)} 
                  rows="3" 
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 bg-slate-50 focus:bg-white transition resize-none" 
                  placeholder="Tell us why you're leaving..." 
                />
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleDeactivate} 
                  disabled={isDeactivating} 
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition disabled:opacity-50"
                >
                  {isDeactivating ? <Loader className="h-5 w-5 animate-spin mx-auto" /> : 'Yes, Deactivate'}
                </button>
                <button 
                  onClick={() => { setShowDeactivateModal(false); setDeactivateReason(''); }} 
                  className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== AVATAR UPLOAD MODAL ===== */}
      {showAvatarUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-fade-in">
            <div className="text-center">
              <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-slate-400" />
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-800">Update Profile Picture</h3>
              <p className="text-slate-500 text-sm mt-1">Upload a new profile picture</p>
            </div>
            <div className="space-y-3 mt-4">
              <label className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-600 rounded-xl cursor-pointer hover:bg-indigo-100 transition w-full">
                <Upload className="h-4 w-4" /> Choose Image
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
              </label>
              {profile.avatar && (
                <button 
                  onClick={removeAvatar} 
                  disabled={uploadingAvatar} 
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition w-full disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" /> Remove Picture
                </button>
              )}
              <button 
                onClick={() => setShowAvatarUpload(false)} 
                className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              {uploadingAvatar && (
                <div className="flex items-center justify-center gap-2 text-slate-500">
                  <Loader className="h-4 w-4 animate-spin" /> Uploading...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== STYLES ===== */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.5s ease-out; }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in { animation: scale-in 0.3s ease-out; }
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down { animation: fade-in-down 0.3s ease-out; }
      `}</style>
    </div>
  );
}