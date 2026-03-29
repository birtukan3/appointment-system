"use client";

import { useState, useEffect, useContext, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '../providers';
import api from '../lib/api';
import { 
  User, Mail, Building2, Phone, Save, ArrowLeft, AlertCircle, 
  Briefcase, Loader, CheckCircle, RefreshCw, Sparkles, Shield, 
  Heart, Zap, Calendar, Clock, Award, Star, Crown, Gem
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading, updateUser } = useContext(AppContext);
  
  const [profile, setProfile] = useState({ name: '', email: '', company: '', phone: '', department: '' });
  const [originalProfile, setOriginalProfile] = useState({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isChanged, setIsChanged] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user) {
      const userProfile = { 
        name: user.name || '', 
        email: user.email || '', 
        company: user.company || '', 
        phone: user.phone || '', 
        department: user.department || '' 
      };
      setProfile(userProfile);
      setOriginalProfile(userProfile);
    }
  }, [authLoading, user, isAuthenticated, router]);

  useEffect(() => {
    const hasChanged = profile.name !== originalProfile.name || 
                       profile.company !== originalProfile.company || 
                       profile.phone !== originalProfile.phone || 
                       profile.department !== originalProfile.department;
    setIsChanged(hasChanged);
  }, [profile, originalProfile]);

  const validatePhone = (phone) => {
    if (!phone) return true;
    const clean = phone.replace(/[\s\-\(\)]/g, '');
    const ethiopianPhoneRegex = /^(?:\+251|0)[1-9]\d{8}$/;
    return ethiopianPhoneRegex.test(clean);
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
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally { 
      setLoading(false); 
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
        department: freshData.department || '' 
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

  const formatPhoneForDisplay = (phone) => {
    if (!phone) return '';
    const clean = phone.replace(/[\s\-\(\)]/g, '');
    if (clean.startsWith('+251')) {
      return clean.replace(/(\+251)(\d{2})(\d{3})(\d{4})/, '$1 $2 $3 $4');
    }
    return phone;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (authLoading || !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 py-8">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-slide-up">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Profile Settings
            </h1>
            <p className="text-gray-500 mt-1">Manage your personal information</p>
          </div>
          <div className="flex gap-2">
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
              <span className="hidden sm:inline">Back</span>
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

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-in">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
            </div>
            <div className="relative flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg animate-float">
                  <span className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {getInitials(profile.name)}
                  </span>
                </div>
                <div className="absolute -top-2 -right-2">
                  <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
                </div>
              </div>
              <div className="text-white">
                <h2 className="text-2xl font-bold">{profile.name || 'Your Name'}</h2>
                <p className="text-indigo-200 flex items-center gap-1 mt-1">
                  <Mail className="h-3 w-3" /> {profile.email}
                </p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                    {user?.role === 'admin' ? 'Administrator' : user?.role === 'staff' ? 'Staff Member' : 'User'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
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

        {/* Profile Info Card */}
        <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-100 animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Star className="h-4 w-4 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Profile Information</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <User className="h-4 w-4 text-indigo-500" />
              <div>
                <span className="text-gray-500">Name:</span>
                <span className="ml-2 font-medium text-gray-900">{profile.name || 'Not set'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Mail className="h-4 w-4 text-indigo-500" />
              <div>
                <span className="text-gray-500">Email:</span>
                <span className="ml-2 font-medium text-gray-900">{profile.email}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Building2 className="h-4 w-4 text-indigo-500" />
              <div>
                <span className="text-gray-500">Company:</span>
                <span className="ml-2 font-medium text-gray-900">{profile.company || 'Not set'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Phone className="h-4 w-4 text-indigo-500" />
              <div>
                <span className="text-gray-500">Phone:</span>
                <span className="ml-2 font-medium text-gray-900">{formatPhoneForDisplay(profile.phone) || 'Not set'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animate-slide-up {
          animation: slideUp 0.5s ease-out;
        }
        .animate-scale-in {
          animation: scaleIn 0.4s ease-out;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}