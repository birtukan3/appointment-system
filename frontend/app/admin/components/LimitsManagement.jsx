// frontend/app/admin/components/LimitsManagement.jsx
"use client";

import { useState, useEffect } from 'react';
import { Settings, Save, Users, Calendar, Clock, AlertCircle, Shield, Zap, Award, TrendingUp, Search, X, Edit, CheckCircle, XCircle } from 'lucide-react';
import api from '../../lib/api';
import { showSuccess, showError } from '../../lib/toastUtils';

export default function LimitsManagement() {
  const [globalLimits, setGlobalLimits] = useState({
    maxActiveBookings: 3,
    maxDailyBookings: 2,
    maxWeeklyBookings: 5,
    maxMonthlyBookings: 15,
    bookingCooldownMinutes: 5,
    allowedTimeWindowStart: '09:00',
    allowedTimeWindowEnd: '17:00',
    allowedDaysOfWeek: [1, 2, 3, 4, 5],
    enableTimeWindowRestriction: true,
    enableWeekdayRestriction: true,
  });
  
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userLimits, setUserLimits] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, users]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [globalRes, usersRes] = await Promise.all([
        api.get('/admin/limits/global'),
        api.get('/admin/users/limits'),
      ]);
      setGlobalLimits(globalRes.data);
      setUsers(usersRes.data);
      setFilteredUsers(usersRes.data);
    } catch (error) {
      showError('Failed to load limits data');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredUsers(users.filter(u => 
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.role?.toLowerCase().includes(term)
      ));
    }
  };

  const updateGlobalLimits = async () => {
    setSaving(true);
    try {
      await api.put('/admin/limits/global', globalLimits);
      showSuccess('Global limits updated successfully');
    } catch (error) {
      showError('Failed to update global limits');
    } finally {
      setSaving(false);
    }
  };

  const updateUserLimits = async () => {
    if (!selectedUser) return;
    
    setSaving(true);
    try {
      await api.put(`/admin/limits/user/${selectedUser.id}`, userLimits);
      showSuccess(`Limits updated for ${selectedUser.name}`);
      setShowUserModal(false);
      fetchData();
    } catch (error) {
      showError('Failed to update user limits');
    } finally {
      setSaving(false);
    }
  };

  const blockUser = async (userId, userName) => {
    if (!confirm(`Are you sure you want to block ${userName}?`)) return;
    
    try {
      await api.post(`/admin/users/${userId}/block`, { reason: 'Blocked by admin' });
      showSuccess(`${userName} has been blocked`);
      fetchData();
    } catch (error) {
      showError('Failed to block user');
    }
  };

  const unblockUser = async (userId, userName) => {
    try {
      await api.post(`/admin/users/${userId}/unblock`);
      showSuccess(`${userName} has been unblocked`);
      fetchData();
    } catch (error) {
      showError('Failed to unblock user');
    }
  };

  const resetSpamCounter = async (userId, userName) => {
    try {
      await api.post(`/admin/users/${userId}/reset-spam`);
      showSuccess(`Spam counter reset for ${userName}`);
      fetchData();
    } catch (error) {
      showError('Failed to reset spam counter');
    }
  };

  const openUserModal = (user) => {
    setSelectedUser(user);
    setUserLimits({
      maxActiveBookings: user.limits?.maxActiveBookings || globalLimits.maxActiveBookings,
      maxDailyBookings: user.limits?.maxDailyBookings || globalLimits.maxDailyBookings,
      maxWeeklyBookings: user.limits?.maxWeeklyBookings || globalLimits.maxWeeklyBookings,
      maxMonthlyBookings: user.limits?.maxMonthlyBookings || globalLimits.maxMonthlyBookings,
      bookingCooldownMinutes: user.limits?.bookingCooldownMinutes || globalLimits.bookingCooldownMinutes,
      isTrusted: user.limits?.isTrusted || false,
    });
    setShowUserModal(true);
  };

  const weekdays = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 0, label: 'Sunday' },
  ];

  const toggleWeekday = (day) => {
    if (globalLimits.allowedDaysOfWeek.includes(day)) {
      setGlobalLimits({
        ...globalLimits,
        allowedDaysOfWeek: globalLimits.allowedDaysOfWeek.filter(d => d !== day),
      });
    } else {
      setGlobalLimits({
        ...globalLimits,
        allowedDaysOfWeek: [...globalLimits.allowedDaysOfWeek, day].sort(),
      });
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading limits...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Limits Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Settings className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Global Booking Limits</h2>
            </div>
            <button
              onClick={updateGlobalLimits}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
            >
              {saving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Zap className="h-4 w-4 text-indigo-500" />
                Max Active Bookings
              </label>
              <input
                type="number"
                value={globalLimits.maxActiveBookings}
                onChange={(e) => setGlobalLimits({ ...globalLimits, maxActiveBookings: parseInt(e.target.value) })}
                min="1"
                max="100"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">Pending + Approved + Checked In</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-500" />
                Max Daily Bookings
              </label>
              <input
                type="number"
                value={globalLimits.maxDailyBookings}
                onChange={(e) => setGlobalLimits({ ...globalLimits, maxDailyBookings: parseInt(e.target.value) })}
                min="1"
                max="50"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                Max Weekly Bookings
              </label>
              <input
                type="number"
                value={globalLimits.maxWeeklyBookings}
                onChange={(e) => setGlobalLimits({ ...globalLimits, maxWeeklyBookings: parseInt(e.target.value) })}
                min="1"
                max="200"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-500" />
                Max Monthly Bookings
              </label>
              <input
                type="number"
                value={globalLimits.maxMonthlyBookings}
                onChange={(e) => setGlobalLimits({ ...globalLimits, maxMonthlyBookings: parseInt(e.target.value) })}
                min="1"
                max="500"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Cooldown (minutes)
              </label>
              <input
                type="number"
                value={globalLimits.bookingCooldownMinutes}
                onChange={(e) => setGlobalLimits({ ...globalLimits, bookingCooldownMinutes: parseInt(e.target.value) })}
                min="0"
                max="60"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">Time between booking attempts</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                Time Window
              </label>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={globalLimits.allowedTimeWindowStart}
                  onChange={(e) => setGlobalLimits({ ...globalLimits, allowedTimeWindowStart: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="time"
                  value={globalLimits.allowedTimeWindowEnd}
                  onChange={(e) => setGlobalLimits({ ...globalLimits, allowedTimeWindowEnd: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={globalLimits.enableTimeWindowRestriction}
                  onChange={(e) => setGlobalLimits({ ...globalLimits, enableTimeWindowRestriction: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Enable Time Window Restriction</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={globalLimits.enableWeekdayRestriction}
                  onChange={(e) => setGlobalLimits({ ...globalLimits, enableWeekdayRestriction: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Enable Weekday Restriction</span>
              </label>
            </div>
            
            {globalLimits.enableWeekdayRestriction && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Days</label>
                <div className="flex flex-wrap gap-2">
                  {weekdays.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => toggleWeekday(day.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        globalLimits.allowedDaysOfWeek.includes(day.value)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* User Limits Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            User Limits Overrides
          </h2>
          <p className="text-sm text-gray-500 mt-1">Override global limits for specific users</p>
        </div>
        
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active Limit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Daily Limit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trusted</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'staff' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {user.limits?.maxActiveBookings || globalLimits.maxActiveBookings}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {user.limits?.maxDailyBookings || globalLimits.maxDailyBookings}
                  </td>
                  <td className="px-4 py-3">
                    {user.limits?.isTrusted ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <Award className="h-3 w-3" /> Trusted
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.limits?.isBlocked ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        <XCircle className="h-3 w-3" /> Blocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle className="h-3 w-3" /> Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openUserModal(user)}
                        className="text-indigo-600 hover:text-indigo-800"
                        title="Edit Limits"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {user.limits?.isBlocked ? (
                        <button
                          onClick={() => unblockUser(user.id, user.name)}
                          className="text-green-600 hover:text-green-800"
                          title="Unblock User"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => blockUser(user.id, user.name)}
                          className="text-red-600 hover:text-red-800"
                          title="Block User"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                      {user.limits?.spamScore > 0 && (
                        <button
                          onClick={() => resetSpamCounter(user.id, user.name)}
                          className="text-amber-600 hover:text-amber-800"
                          title="Reset Spam Counter"
                        >
                          <AlertCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* User Limits Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">User Limits - {selectedUser.name}</h3>
              <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Active Bookings</label>
                <input
                  type="number"
                  value={userLimits.maxActiveBookings}
                  onChange={(e) => setUserLimits({ ...userLimits, maxActiveBookings: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1"
                  max="100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Daily Bookings</label>
                <input
                  type="number"
                  value={userLimits.maxDailyBookings}
                  onChange={(e) => setUserLimits({ ...userLimits, maxDailyBookings: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1"
                  max="50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Weekly Bookings</label>
                <input
                  type="number"
                  value={userLimits.maxWeeklyBookings}
                  onChange={(e) => setUserLimits({ ...userLimits, maxWeeklyBookings: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1"
                  max="200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Monthly Bookings</label>
                <input
                  type="number"
                  value={userLimits.maxMonthlyBookings}
                  onChange={(e) => setUserLimits({ ...userLimits, maxMonthlyBookings: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1"
                  max="500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cooldown (minutes)</label>
                <input
                  type="number"
                  value={userLimits.bookingCooldownMinutes}
                  onChange={(e) => setUserLimits({ ...userLimits, bookingCooldownMinutes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="0"
                  max="60"
                />
              </div>
              
              <label className="flex items-center gap-2 cursor-pointer p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={userLimits.isTrusted}
                  onChange={(e) => setUserLimits({ ...userLimits, isTrusted: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <p className="font-medium text-gray-900">Trusted User</p>
                  <p className="text-xs text-gray-500">Increased limits and reduced restrictions</p>
                </div>
              </label>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={updateUserLimits}
                disabled={saving}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <Save className="h-4 w-4" />}
                Save Changes
              </button>
              <button onClick={() => setShowUserModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}