"use client";

import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '../providers';
import Navbar from '../components/Navbar';
import { 
  User, Bell, Shield, Globe, Moon, Sun, 
  Smartphone, Mail, Lock, Key, Save, 
  ArrowLeft, CheckCircle, AlertCircle, Loader,
  Eye, EyeOff, Smartphone as PhoneIcon, Monitor,
  Palette, Volume2, VolumeX, Clock, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading, updateUser } = useContext(AppContext);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    // Profile Settings
    name: '',
    email: '',
    phone: '',
    company: '',
    
    // Notification Settings
    emailNotifications: true,
    smsNotifications: false,
    appointmentReminders: true,
    marketingEmails: false,
    
    // Appearance Settings
    theme: 'light',
    compactView: false,
    
    // Security Settings
    twoFactorEnabled: false,
    sessionTimeout: 30,
  });
  const [originalSettings, setOriginalSettings] = useState({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [isChanged, setIsChanged] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Tabs configuration
  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="h-4 w-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="h-4 w-4" /> },
  ];

  // Load user data
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user) {
      const userSettings = {
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        company: user.company || '',
        theme: user.preferences?.theme || 'light',
        compactView: user.preferences?.compactView || false,
        emailNotifications: user.preferences?.emailNotifications !== false,
        smsNotifications: user.preferences?.smsNotifications || false,
        appointmentReminders: user.preferences?.appointmentReminders !== false,
        marketingEmails: user.preferences?.marketingEmails || false,
        twoFactorEnabled: user.twoFactorEnabled || false,
        sessionTimeout: user.preferences?.sessionTimeout || 30,
      };
      setSettings(userSettings);
      setOriginalSettings(userSettings);
    }
  }, [user, isAuthenticated, authLoading, router]);

  // Check for changes
  useEffect(() => {
    const hasChanged = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setIsChanged(hasChanged);
  }, [settings, originalSettings]);

  // Handle setting change
  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Handle toggle change
  const handleToggleChange = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Save settings
  const handleSaveSettings = async () => {
    if (!isChanged) {
      toast.info('No changes to save');
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        name: settings.name,
        phone: settings.phone,
        company: settings.company,
        preferences: {
          theme: settings.theme,
          compactView: settings.compactView,
          emailNotifications: settings.emailNotifications,
          smsNotifications: settings.smsNotifications,
          appointmentReminders: settings.appointmentReminders,
          marketingEmails: settings.marketingEmails,
          sessionTimeout: settings.sessionTimeout,
        }
      };

      const response = await api.patch('/users/profile', updateData);
      
      if (updateUser) {
        updateUser({ ...user, ...updateData });
      }

      setOriginalSettings(settings);
      setSaving(false);
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
      setSaving(false);
    }
  };

  // Reset settings
  const resetSettings = () => {
    setSettings(originalSettings);
    setIsChanged(false);
    toast.info('Settings reset to last saved');
  };

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      toast.error('All password fields are required');
      return;
    }
    
    if (passwordData.new !== passwordData.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.new.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    setIsPasswordSubmitting(true);
    try {
      await api.post('/users/change-password', {
        currentPassword: passwordData.current,
        newPassword: passwordData.new
      });
      toast.success('Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (error) {
      toast.error('Current password is incorrect');
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium">Loading settings...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/10 to-purple-50/10 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-slate-500">Manage your account preferences and settings</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={resetSettings}
                disabled={!isChanged}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
              >
                Reset
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={!isChanged || saving}
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </button>
            </div>
          </div>

          {/* Settings Tabs */}
          <div className="flex gap-2 border-b border-slate-200 mb-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Settings Content */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-1">Profile Settings</h2>
                <p className="text-sm text-slate-500 mb-6">Update your personal information</p>
                
                <div className="space-y-5">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={settings.name}
                      onChange={(e) => handleSettingChange('name', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition"
                      placeholder="Your full name"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={settings.email}
                      disabled
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-100 text-slate-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      value={settings.phone}
                      onChange={(e) => handleSettingChange('phone', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition"
                      placeholder="+251 91 234 5678"
                    />
                  </div>

                  {/* Company */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Company</label>
                    <input
                      type="text"
                      value={settings.company}
                      onChange={(e) => handleSettingChange('company', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition"
                      placeholder="Your company"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-1">Notification Preferences</h2>
                <p className="text-sm text-slate-500 mb-6">Manage how you receive notifications</p>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-indigo-500" />
                      <div>
                        <p className="font-medium text-slate-800">Email Notifications</p>
                        <p className="text-xs text-slate-500">Receive updates via email</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleChange('emailNotifications')}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.emailNotifications ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        settings.emailNotifications ? 'translate-x-6' : ''
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-indigo-500" />
                      <div>
                        <p className="font-medium text-slate-800">SMS Notifications</p>
                        <p className="text-xs text-slate-500">Receive updates via SMS</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleChange('smsNotifications')}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.smsNotifications ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        settings.smsNotifications ? 'translate-x-6' : ''
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-indigo-500" />
                      <div>
                        <p className="font-medium text-slate-800">Appointment Reminders</p>
                        <p className="text-xs text-slate-500">Get reminders for upcoming appointments</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleChange('appointmentReminders')}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.appointmentReminders ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        settings.appointmentReminders ? 'translate-x-6' : ''
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-indigo-500" />
                      <div>
                        <p className="font-medium text-slate-800">Marketing Emails</p>
                        <p className="text-xs text-slate-500">Receive promotional emails</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleChange('marketingEmails')}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.marketingEmails ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        settings.marketingEmails ? 'translate-x-6' : ''
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-1">Appearance Settings</h2>
                <p className="text-sm text-slate-500 mb-6">Customize how the app looks</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Theme</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleSettingChange('theme', 'light')}
                        className={`p-4 border-2 rounded-xl text-center transition-all ${
                          settings.theme === 'light'
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Sun className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
                        <p className="text-sm font-medium">Light</p>
                      </button>
                      <button
                        onClick={() => handleSettingChange('theme', 'dark')}
                        className={`p-4 border-2 rounded-xl text-center transition-all ${
                          settings.theme === 'dark'
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Moon className="h-6 w-6 mx-auto mb-1 text-slate-700" />
                        <p className="text-sm font-medium">Dark</p>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Monitor className="h-5 w-5 text-indigo-500" />
                      <div>
                        <p className="font-medium text-slate-800">Compact View</p>
                        <p className="text-xs text-slate-500">Show more items per page</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleChange('compactView')}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.compactView ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        settings.compactView ? 'translate-x-6' : ''
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-1">Security Settings</h2>
                <p className="text-sm text-slate-500 mb-6">Manage your account security</p>
                
                <div className="space-y-4">
                  {/* Change Password */}
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition"
                  >
                    <div className="flex items-center gap-3">
                      <Key className="h-5 w-5 text-indigo-500" />
                      <div className="text-left">
                        <p className="font-medium text-slate-800">Change Password</p>
                        <p className="text-xs text-slate-500">Update your password</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </button>

                  {/* Two Factor Authentication */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-indigo-500" />
                      <div>
                        <p className="font-medium text-slate-800">Two-Factor Authentication</p>
                        <p className="text-xs text-slate-500">Extra security layer</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleChange('twoFactorEnabled')}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.twoFactorEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        settings.twoFactorEnabled ? 'translate-x-6' : ''
                      }`} />
                    </button>
                  </div>

                  {/* Session Timeout */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Session Timeout</label>
                    <select
                      value={settings.sessionTimeout}
                      onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition"
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="120">2 hours</option>
                      <option value="240">4 hours</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Lock className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Change Password</h3>
              </div>
              <button 
                onClick={() => setShowPasswordModal(false)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordData.current}
                    onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition"
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.new}
                    onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition"
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
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition"
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isPasswordSubmitting}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {isPasswordSubmitting ? <Loader className="h-5 w-5 animate-spin mx-auto" /> : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-semibold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </>
  );
}