"use client";

import { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '../providers';
import api from '../lib/api';
import { 
  User, Mail, Building2, Phone, Save, ArrowLeft, AlertCircle, 
  Briefcase, Loader, CheckCircle, RefreshCw, Sparkles, Shield, 
  Heart, Zap, Calendar, Clock, Award, Star, Crown, Gem,
  Key, Fingerprint, Bell, Moon, Sun, Palette, Globe, Lock,
  Eye, EyeOff, Smartphone, Camera, Upload, X, Edit2
} from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

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
  const [show2FA, setShow2FA] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [stats, setStats] = useState({ totalAppointments: 0, completedAppointments: 0, memberSince: '' });
  
  // Password change state
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  const fileInputRef = useRef(null);

  // Fetch user stats
  useEffect(() => {
    if (user && user.id) {
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      const response = await api.get('/users/stats');
      setStats({
        totalAppointments: response.totalAppointments || 0,
        completedAppointments: response.completedAppointments || 0,
        memberSince: response.memberSince || user?.createdAt || new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { 
      router.push('/login'); 
      return; 
    }
    if (user) {
      const userProfile = { 
        name: user.name || '', 
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
  }, [authLoading, user, isAuthenticated, router]);

  useEffect(() => {
    const hasChanged = profile.name !== originalProfile.name || 
                       profile.company !== originalProfile.company || 
                       profile.phone !== originalProfile.phone || 
                       profile.department !== originalProfile.department ||
                       profile.preferences?.theme !== originalProfile.preferences?.theme ||
                       profile.preferences?.notifications !== originalProfile.preferences?.notifications;
    setIsChanged(hasChanged);
  }, [profile, originalProfile]);

  // Password strength checker
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
    
    if (profile.phone && !validatePhone(profile.phone)) {
      setErrors({ phone: 'Please enter a valid Ethiopian phone number' });
      toast.error('Please enter a valid Ethiopian phone number');
      return;
    }
    
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
        toast.info('No changes to save'); 
        setLoading(false); 
        return; 
      }

      const response = await api.patch('/users/profile', updateData);
      updateUser(response.data);
      setProfile(prev => ({ ...prev, ...response.data }));
      setOriginalProfile(prev => ({ ...prev, ...response.data }));
      setShowSuccess(true);
      toast.success('Profile updated successfully!');
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to update profile';
      toast.error(errorMsg);
      setErrors({ general: errorMsg });
    } finally { 
      setLoading(false); 
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.new !== passwordData.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.new.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    if (passwordStrength < 3) {
      toast.error('Please choose a stronger password');
      return;
    }
    
    setChangingPassword(true);
    try {
      await api.post('/users/change-password', {
        currentPassword: passwordData.current,
        newPassword: passwordData.new
      });
      toast.success('Password changed successfully!');
      setShowChangePassword(false);
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only image files are allowed (JPEG, PNG, GIF, WEBP)');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
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
      updateUser({ ...user, avatar: newAvatar });
      toast.success('Profile picture updated!');
      setShowAvatarUpload(false);
    } catch (error) {
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    try {
      await api.delete('/users/avatar');
      setProfile(prev => ({ ...prev, avatar: null }));
      updateUser({ ...user, avatar: null });
      toast.success('Profile picture removed');
    } catch (error) {
      toast.error('Failed to remove avatar');
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/profile');
      const freshData = response.data;
      const refreshedProfile = { 
        name: freshData.name || '', 
        email: freshData.email || '', 
        company: freshData.company || '', 
        phone: freshData.phone || '', 
        department: freshData.department || '',
        avatar: freshData.avatar || null,
        preferences: freshData.preferences || { theme: 'light', notifications: true }
      };
      updateUser(freshData);
      setProfile(refreshedProfile);
      setOriginalProfile(refreshedProfile);
      toast.success('Profile refreshed');
    } catch (error) { 
      toast.error('Failed to refresh profile'); 
    } finally { 
      setLoading(false); 
    }
  };

  const memberSince = useMemo(() => {
    if (!stats.memberSince) return 'Recently';
    const date = new Date(stats.memberSince);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [stats.memberSince]);

  if (authLoading || !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 py-8">
      {/* Animated Background */}
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
        
        {/* Success Message */}
        {showSuccess && (
          <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl flex items-center gap-3 animate-slide-up">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-700 font-medium">Profile updated successfully!</p>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Left Column - Profile Card & Stats */}
          <div className="space-y-6">
            {/* Profile Avatar Card */}
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
                        <img 
                          src={profile.avatar} 
                          alt="Avatar" 
                          className="w-full h-full object-cover rounded-2xl"
                        />
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
                    <span className="text-xs bg-white/20 px-3 py-1 rounded-full">
                      {user?.role === 'admin' ? '👑 Administrator' : user?.role === 'staff' ? '👨‍⚕️ Staff Member' : '👤 User'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats Section */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Award className="h-4 w-4 text-indigo-600" />
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
                  <div className="text-center p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl col-span-2">
                    <Clock className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                    <p className="text-sm font-medium text-gray-700">Member since {memberSince}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
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
                  onClick={() => setShow2FA(true)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-300 text-gray-700 hover:text-indigo-600"
                >
                  <Fingerprint className="h-4 w-4" />
                  <span>Two-Factor Authentication</span>
                  <span className="text-xs text-gray-400 ml-auto">Coming Soon</span>
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
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <User className="h-4 w-4 text-indigo-500" />
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors ${
                        focusedField === 'name' ? 'text-indigo-500' : 'text-gray-400'
                      }`} />
                      <input 
                        type="text" 
                        value={profile.name} 
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                        className={`w-full pl-10 pr-3 py-3 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white ${
                          focusedField === 'name' ? 'border-indigo-300 shadow-md' : 'border-gray-200'
                        }`}
                        placeholder="John Doe" 
                        required 
                      />
                    </div>
                  </div>

                  {/* Email (Disabled) */}
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
                      <Building2 className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors ${
                        focusedField === 'company' ? 'text-indigo-500' : 'text-gray-400'
                      }`} />
                      <input 
                        type="text" 
                        value={profile.company} 
                        onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                        onFocus={() => setFocusedField('company')}
                        onBlur={() => setFocusedField(null)}
                        className={`w-full pl-10 pr-3 py-3 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white ${
                          focusedField === 'company' ? 'border-indigo-300 shadow-md' : 'border-gray-200'
                        }`}
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
                      <Phone className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors ${
                        focusedField === 'phone' ? 'text-indigo-500' : 'text-gray-400'
                      }`} />
                      <input 
                        type="tel" 
                        value={profile.phone} 
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        onFocus={() => setFocusedField('phone')}
                        onBlur={() => setFocusedField(null)}
                        className={`w-full pl-10 pr-3 py-3 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white ${
                          focusedField === 'phone' ? 'border-indigo-300 shadow-md' : 'border-gray-200'
                        } ${errors.phone ? 'border-red-500' : ''}`}
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

                  {/* Department (Staff/Admin Only) */}
                  {(user?.role === 'admin' || user?.role === 'staff') && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-indigo-500" />
                        Department
                      </label>
                      <div className="relative">
                        <Briefcase className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors ${
                          focusedField === 'department' ? 'text-indigo-500' : 'text-gray-400'
                        }`} />
                        <input 
                          type="text" 
                          value={profile.department} 
                          onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                          onFocus={() => setFocusedField('department')}
                          onBlur={() => setFocusedField(null)}
                          className={`w-full pl-10 pr-3 py-3 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white ${
                            focusedField === 'department' ? 'border-indigo-300 shadow-md' : 'border-gray-200'
                          }`}
                          placeholder="Your department" 
                        />
                      </div>
                    </div>
                  )}

                  {/* Preferences */}
                  <div className="space-y-3 pt-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Bell className="h-4 w-4 text-indigo-500" />
                      Preferences
                    </label>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-indigo-500" />
                        <span className="text-sm text-gray-700">Email Notifications</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={profile.preferences?.notifications !== false}
                          onChange={(e) => setProfile({ 
                            ...profile, 
                            preferences: { ...profile.preferences, notifications: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>

                  {/* Unsaved Changes Alert */}
                  {isChanged && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 animate-shake">
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-800 font-medium">You have unsaved changes. Click "Save Changes" to update your profile.</p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button 
                    type="submit" 
                    disabled={loading || !isChanged}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                  >
                    {loading ? (
                      <>
                        <Loader className="h-5 w-5 animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Upload Modal */}
      {showAvatarUpload && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Profile Picture</h3>
              <button onClick={() => setShowAvatarUpload(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="text-center mb-6">
              <div className="w-32 h-32 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl font-bold text-indigo-600">{getInitials(profile.name)}</span>
                )}
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition mb-3 flex items-center justify-center gap-2"
            >
              {uploadingAvatar ? <Loader className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploadingAvatar ? 'Uploading...' : 'Upload New Picture'}
            </button>
            
            {profile.avatar && (
              <button
                onClick={removeAvatar}
                className="w-full bg-red-50 text-red-600 py-2.5 rounded-xl font-semibold hover:bg-red-100 transition flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" /> Remove Picture
              </button>
            )}
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-indigo-600" />
                <h3 className="text-xl font-bold text-gray-900">Change Password</h3>
              </div>
              <button onClick={() => setShowChangePassword(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordData.current}
                    onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.new}
                    onChange={(e) => {
                      setPasswordData({ ...passwordData, new: e.target.value });
                      checkPasswordStrength(e.target.value);
                    }}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordData.new && (
                  <div className="mt-2">
                    <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${strengthInfo.color} transition-all duration-500 rounded-full`} style={{ width: strengthInfo.width }} />
                    </div>
                    <p className="text-xs mt-1 text-gray-500">Password strength: {strengthInfo.text}</p>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirm}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordData.confirm && passwordData.new !== passwordData.confirm && (
                  <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                )}
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
                >
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowChangePassword(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animate-slide-up { animation: slideUp 0.5s ease-out; }
        .animate-scale-in { animation: scaleIn 0.4s ease-out; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
}