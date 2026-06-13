// frontend/app/admin/components/LimitConfigPanel.jsx
"use client";

import { useState, useEffect } from 'react';
import { Settings, Save, Users, Calendar, Clock, AlertCircle, Shield, Zap } from 'lucide-react';
import api from '../../lib/api';
import { showSuccess, showError } from '../../lib/toastUtils';

export default function LimitConfigPanel({ userId, userName, onClose }) {
  const [limits, setLimits] = useState({
    maxActiveBookings: 3,
    maxDailyBookings: 2,
    maxWeeklyBookings: 5,
    bookingCooldownMinutes: 5,
    isBlocked: false,
    spamScore: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLimits();
  }, [userId]);

  const fetchLimits = async () => {
    try {
      const response = await api.getUserLimits(userId);
      setLimits(response.data);
    } catch (error) {
      showError('Failed to fetch user limits');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateUserLimits(userId, limits);
      showSuccess(`Booking limits updated for ${userName}`);
      onClose?.();
    } catch (error) {
      showError('Failed to update limits');
    } finally {
      setSaving(false);
    }
  };

  const handleBlockToggle = async () => {
    try {
      if (limits.isBlocked) {
        await api.unblockUser(userId);
        setLimits(prev => ({ ...prev, isBlocked: false }));
        showSuccess(`User ${userName} unblocked`);
      } else {
        await api.blockUser(userId, 'Excessive spam activity');
        setLimits(prev => ({ ...prev, isBlocked: true }));
        showSuccess(`User ${userName} blocked`);
      }
    } catch (error) {
      showError('Failed to update block status');
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Settings className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Booking Limits - {userName}</h3>
          <p className="text-xs text-gray-500">Configure per-user booking restrictions</p>
        </div>
      </div>

      {/* Spam Score Display */}
      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">Spam Score</span>
          </div>
          <span className={`text-sm font-bold ${limits.spamScore >= 15 ? 'text-red-600' : limits.spamScore >= 10 ? 'text-amber-600' : 'text-green-600'}`}>
            {limits.spamScore}
          </span>
        </div>
        <div className="w-full bg-amber-200 rounded-full h-1.5">
          <div 
            className="bg-amber-600 rounded-full h-1.5 transition-all duration-500"
            style={{ width: `${Math.min(100, (limits.spamScore / 20) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-amber-700 mt-2">
          {limits.spamScore >= 15 ? '⚠️ High risk - Consider blocking' : limits.spamScore >= 10 ? '⚠️ Medium risk - Monitor activity' : '✓ Normal activity'}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-500" />
            Max Active Bookings
          </label>
          <input
            type="number"
            value={limits.maxActiveBookings}
            onChange={(e) => setLimits({ ...limits, maxActiveBookings: parseInt(e.target.value) })}
            min="1"
            max="100"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-400 mt-1">Pending + Approved bookings allowed</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-500" />
            Max Daily Bookings
          </label>
          <input
            type="number"
            value={limits.maxDailyBookings}
            onChange={(e) => setLimits({ ...limits, maxDailyBookings: parseInt(e.target.value) })}
            min="1"
            max="50"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-500" />
            Max Weekly Bookings
          </label>
          <input
            type="number"
            value={limits.maxWeeklyBookings}
            onChange={(e) => setLimits({ ...limits, maxWeeklyBookings: parseInt(e.target.value) })}
            min="1"
            max="100"
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
            value={limits.bookingCooldownMinutes}
            onChange={(e) => setLimits({ ...limits, bookingCooldownMinutes: parseInt(e.target.value) })}
            min="0"
            max="60"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-400 mt-1">Time between booking attempts</p>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-500" />
            <div>
              <p className="font-medium text-gray-900">Block User</p>
              <p className="text-xs text-gray-500">Prevent from making new bookings</p>
            </div>
          </div>
          <button
            onClick={handleBlockToggle}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              limits.isBlocked ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {limits.isBlocked ? 'Blocked' : 'Block User'}
          </button>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-200 transition">
          Cancel
        </button>
      </div>
    </div>
  );
}