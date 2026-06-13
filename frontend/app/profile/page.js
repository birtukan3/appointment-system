"use client";

import { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '../providers';
import api from '../lib/api';
import { 
  User, Mail, Building2, Phone, Save, ArrowLeft, AlertCircle, 
  Briefcase, Loader, CheckCircle, RefreshCw, Sparkles, Shield, 
  Key, Fingerprint, Bell, Calendar, Clock, Award, TrendingUp,
  CalendarCheck, Clock8, Camera, Upload, X, Eye, EyeOff, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

// Toast debouncing - PREVENT profile success toasts completely
let toastDebounceTimer = null;
let lastToastMessage = '';
let lastToastTime = 0;

const showToast = (message, type = 'success', duration = 3000) => {
  if (message === 'Profile updated successfully!') {
    console.log('[TOAST BLOCKED] Profile update message suppressed');
    return;
  }
  
  if (message.toLowerCase().includes('profile') && message.toLowerCase().includes('success')) {
    console.log('[TOAST BLOCKED] Profile-related success message suppressed');
    return;
  }
  
  const now = Date.now();
  
  if (toastDebounceTimer) {
    clearTimeout(toastDebounceTimer);
  }
  
  if (lastToastMessage === message && (now - lastToastTime) < 2000) {
    return;
  }
  
  lastToastMessage = message;
  lastToastTime = now;
  
  if (type === 'success') {
    toast.success(message, { duration });
  } else if (type === 'error') {
    toast.error(message, { duration });
  } else if (type === 'info') {
    toast(message, { icon: 'ℹ️', duration });
  }
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading, updateUser } = useContext(AppContext);
  
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
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [stats, setStats] = useState({ 
    totalAppointments: 0, 
    completedAppointments: 0, 
    pendingAppointments: 0, 
    upcomingAppointments: 0, 
    memberSince: '' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  const fileInputRef = useRef(null);
  const isMounted = useRef(true);
  const successTimeoutRef = useRef(null);

  const fetchUserStats = useCallback(async () => {
    try {
      const statsResponse = await api.get('/appointments/stats');
      const appointmentsResponse = await api.get('/appointments/my', { limit: 100 });
      
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

  useEffect(() => {
    isMounted.current = true;
    
    if (authLoading) return;
    if (!isAuthenticated) { 
      router.push('/login'); 
      return; 
    }
    
    const loadProfile = async () => {
      try {
        const response = await api.get('/users/profile');
        const userData = response.data || response;
        
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
    };
    
    loadProfile();
    fetchUserStats();
    
    return () => {
      isMounted.current = false;
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, [authLoading, isAuthenticated, user, router, updateUser, fetchUserStats]);

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
      }, 3000);
      return () => {
        if (successTimeoutRef.current) {
          clearTimeout(successTimeoutRef.current);
        }
      };
    }
  }, [showSuccess]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    if (profile.phone && !validatePhone(profile.phone)) {
      setErrors({ phone: 'Please enter a valid Ethiopian phone number' });
      showToast('Please enter a valid Ethiopian phone number', 'error');
      return;
    }
    
    setIsSubmitting(true);
    setLoading(true);
    setErrors({});
    
    try {
      const updateData = {};
      if (profile.name !== originalProfile.name) updateData.name = profile.name;
      if (profile.company !== originalProfile.company) updateData.company = profile.company;
      if (profile.phone !== originalProfile.phone) updateData.phone = profile.phone;
      if (profile.department !== originalProfile.department) updateData.department = profile.department;
      if (profile.preferences !== originalProfile.preferences) updateData.preferences = profile.preferences;

      if (Object.keys(updateData).length === 0) { 
        showToast('No changes to save', 'info'); 
        setIsSubmitting(false);
        setLoading(false);
        return; 
      }

      const response = await api.patch('/users/profile', updateData);
      const updatedData = response.data || response;
      
      if (updateUser) updateUser(updatedData);
      setProfile(prev => ({ ...prev, ...updatedData }));
      setOriginalProfile(prev => ({ ...prev, ...updatedData }));
      
      setShowSuccess(true);
      
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to update profile';
      showToast(errorMsg, 'error');
      setErrors({ general: errorMsg });
    } finally { 
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (isPasswordSubmitting) return;
    
    if (!passwordData.current) {
      showToast('Current password is required', 'error');
      return;
    }
    
    if (passwordData.new !== passwordData.confirm) {
      showToast('New passwords do not match', 'error');
      return;
    }
    
    if (passwordData.new.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    
    if (passwordStrength < 3) {
      showToast('Please choose a stronger password', 'error');
      return;
    }
    
    setIsPasswordSubmitting(true);
    try {
      await api.post('/users/change-password', {
        currentPassword: passwordData.current,
        newPassword: passwordData.new
      });
      showToast('Password changed successfully!', 'success');
      setShowChangePassword(false);
      setPasswordData({ current: '', new: '', confirm: '' });
      setPasswordStrength(0);
    } catch (error) {
      console.error('Change password error:', error);
      const errorMsg = error.response?.data?.message || 'Current password is incorrect';
      showToast(errorMsg, 'error');
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Only image files are allowed (JPEG, PNG, GIF, WEBP)', 'error');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      showToast('File size must be less than 2MB', 'error');
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
      showToast('Profile picture updated!', 'success');
      setShowAvatarUpload(false);
    } catch (error) {
      console.error('Avatar upload error:', error);
      showToast('Failed to upload avatar', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    try {
      await api.delete('/users/avatar');
      setProfile(prev => ({ ...prev, avatar: null }));
      if (updateUser) updateUser({ ...user, avatar: null });
      showToast('Profile picture removed', 'success');
      setShowAvatarUpload(false);
    } catch (error) {
      console.error('Remove avatar error:', error);
      showToast('Failed to remove avatar', 'error');
    }
  };

  const handleRefresh = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      const response = await api.get('/users/profile');
      const freshData = response.data || response;
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
      showToast('Profile refreshed', 'success');
    } catch (error) { 
      console.error('Refresh error:', error);
      showToast('Failed to refresh profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const memberSince = useMemo(() => {
    if (!stats.memberSince) return 'Recently';
    const date = new Date(stats.memberSince);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [stats.memberSince]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 py-8 relative">
      {/* Toast Overlay Fix: Shifted banner position to a fixed layer so it cannot stack or break document layout */}
      {showSuccess && (
        <div className="fixed top-5 right-5 z-50 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl flex items-center gap-3 shadow-xl animate-fade-in-down max-w-sm">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-green-700 font-medium">Profile updated successfully!</p>
          <button onClick={() => setShowSuccess(false)} className="ml-auto text-green-800 hover:opacity-70">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-slide-up flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Profile Settings
            </h1>
            <p className="text-gray-500 mt-1">Manage your personal information and preferences</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button 
              onClick={handleRefresh} 
              disabled={loading}
              className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 bg-white px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group"
            >
              <RefreshCw className={`h-4 w-4 group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} /> 
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button 
              onClick={() => router.push(user?.role === 'admin' ? '/admin' : user?.role === 'staff' ? '/staff' : '/dashboard')} 
              className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 bg-white px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>
          </div>
        </div>
        
        {/* Two Column Layout */}
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Left Column - Profile Card & Stats */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-in">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 relative overflow-hidden text-center">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
                </div>
                <div className="relative">
                  <div className="relative inline-block">
                    <div className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center shadow-lg mx-auto relative group cursor-pointer" onClick={() => setShowAvatarUpload(true)}>
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

              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Account Statistics</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                    <Calendar className="h-5 w-5 text-indigo-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-gray-800">{stats.totalAppointments}</p>
                    <p className="text-xs text-gray-500">Total Appointments</p>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl">
                    <CheckCircle className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-gray-800">{stats.completedAppointments}</p>
                    <p className="text-xs text-gray-500">Completed</p>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl">
                    <Clock8 className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-gray-800">{stats.pendingAppointments}</p>
                    <p className="text-xs text-gray-500">Pending</p>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                    <CalendarCheck className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-gray-800">{stats.upcomingAppointments}</p>
                    <p className="text-xs text-gray-500">Upcoming</p>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl col-span-2">
                    <Clock className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                    <p className="text-sm font-medium text-gray-700">Member since {memberSince}</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-2">
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-300 text-gray-700 hover:text-indigo-600"
                >
                  <Key className="h-4 w-4" />
                  <span>Change Password</span>
                  <Shield className="h-3 w-3 ml-auto text-gray-400" />
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

          {/* Right Column - Profile Form */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-in">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Edit Profile</h2>
                </div>
                <p className="text-xs text-gray-500 mt-1">Update your personal information</p>
              </div>

              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
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

                  <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
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
    </div>
  );
}