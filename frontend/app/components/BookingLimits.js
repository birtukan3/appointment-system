"use client";

import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Clock, Shield, Calendar, TrendingUp, Zap, CheckCircle, XCircle } from 'lucide-react';
import api from '../lib/api';

export default function BookingLimitsDisplay({ compact = false, onLimitReached }) {
  const [limits, setLimits] = useState({
    activeBookings: 0,
    remainingActive: 3,
    todayBookings: 0,
    remainingToday: 2,
    weeklyBookings: 0,
    remainingWeekly: 5,
    cooldownRemaining: 0,
    limits: { 
      maxActiveBookings: 3, 
      maxDailyBookings: 2,
      maxWeeklyBookings: 5,
      bookingCooldownMinutes: 5
    },
    isLoading: true
  });

  const fetchLimits = useCallback(async () => {
    try {
      const response = await api.getUserBookingLimits();
      setLimits(prev => ({ ...response, isLoading: false }));
      if (response.remainingActive === 0 || response.remainingToday === 0) {
        onLimitReached?.(response);
      }
    } catch (error) {
      console.error('Failed to fetch limits');
      setLimits(prev => ({ ...prev, isLoading: false }));
    }
  }, [onLimitReached]);

  useEffect(() => {
    fetchLimits();
    const interval = setInterval(fetchLimits, 30000);
    return () => clearInterval(interval);
  }, [fetchLimits]);

  useEffect(() => {
    if (limits.cooldownRemaining > 0) {
      const timer = setInterval(() => {
        setLimits(prev => ({
          ...prev,
          cooldownRemaining: Math.max(0, prev.cooldownRemaining - 1)
        }));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [limits.cooldownRemaining]);

  if (limits.isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32 mb-3"></div>
        <div className="space-y-3">
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const isNearActive = limits.remainingActive <= 1;
  const isNearDaily = limits.remainingToday <= 1;
  const isNearWeekly = limits.remainingWeekly <= 2;
  const isAtActive = limits.remainingActive === 0;
  const isAtDaily = limits.remainingToday === 0;
  const isAtWeekly = limits.remainingWeekly === 0;
  const hasWarning = isNearActive || isNearDaily || isNearWeekly;
  const hasError = isAtActive || isAtDaily || isAtWeekly;

  if (compact) {
    return (
      <div className={`rounded-lg p-3 mb-4 transition-all duration-300 ${hasError ? 'bg-red-50 border border-red-200' : hasWarning ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className={`h-4 w-4 ${hasError ? 'text-red-500' : hasWarning ? 'text-amber-500' : 'text-blue-500'}`} />
            <span className="text-xs font-medium">Booking Limits</span>
          </div>
          {limits.cooldownRemaining > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
              <Clock className="h-3 w-3" />
              {limits.cooldownRemaining}s
            </div>
          )}
        </div>
        <div className="flex gap-4 mt-2 text-xs">
          <div className="flex-1">
            <div className="flex justify-between mb-0.5">
              <span className="text-gray-500">Active</span>
              <span className={`font-medium ${isAtActive ? 'text-red-600' : isNearActive ? 'text-amber-600' : 'text-green-600'}`}>
                {limits.activeBookings}/{limits.limits.maxActiveBookings}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div className={`rounded-full h-1 transition-all duration-500 ${isAtActive ? 'bg-red-500' : isNearActive ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${(limits.activeBookings / limits.limits.maxActiveBookings) * 100}%` }} />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between mb-0.5">
              <span className="text-gray-500">Today</span>
              <span className={`font-medium ${isAtDaily ? 'text-red-600' : isNearDaily ? 'text-amber-600' : 'text-green-600'}`}>
                {limits.todayBookings}/{limits.limits.maxDailyBookings}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div className={`rounded-full h-1 transition-all duration-500 ${isAtDaily ? 'bg-red-500' : isNearDaily ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${(limits.todayBookings / limits.limits.maxDailyBookings) * 100}%` }} />
            </div>
          </div>
        </div>
        {hasError && (
          <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Booking limit reached. Please try again later.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Shield className="h-4 w-4 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-gray-800">Your Booking Limits</h3>
          </div>
          {limits.cooldownRemaining > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 rounded-full">
              <Clock className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
              <span className="text-xs font-medium text-amber-700">Cooldown: {limits.cooldownRemaining}s</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-gray-600 flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-indigo-500" /> Active Bookings</span>
            <span className={`font-semibold ${isAtActive ? 'text-red-600' : isNearActive ? 'text-amber-600' : 'text-green-600'}`}>
              {limits.activeBookings} / {limits.limits.maxActiveBookings}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className={`rounded-full h-2 transition-all duration-500 ${isAtActive ? 'bg-red-500' : isNearActive ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ width: `${(limits.activeBookings / limits.limits.maxActiveBookings) * 100}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">Pending + Approved bookings</p>
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-gray-600 flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-emerald-500" /> Today's Bookings</span>
            <span className={`font-semibold ${isAtDaily ? 'text-red-600' : isNearDaily ? 'text-amber-600' : 'text-green-600'}`}>
              {limits.todayBookings} / {limits.limits.maxDailyBookings}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className={`rounded-full h-2 transition-all duration-500 ${isAtDaily ? 'bg-red-500' : isNearDaily ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${(limits.todayBookings / limits.limits.maxDailyBookings) * 100}%` }} />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-gray-600 flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-purple-500" /> This Week</span>
            <span className={`font-semibold ${isAtWeekly ? 'text-red-600' : isNearWeekly ? 'text-amber-600' : 'text-blue-600'}`}>
              {limits.weeklyBookings} / {limits.limits.maxWeeklyBookings}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className={`rounded-full h-2 transition-all duration-500 ${isAtWeekly ? 'bg-red-500' : isNearWeekly ? 'bg-amber-500' : 'bg-purple-500'}`} style={{ width: `${(limits.weeklyBookings / limits.limits.maxWeeklyBookings) * 100}%` }} />
          </div>
        </div>
      </div>
      
      {hasError && (
        <div className="px-5 py-3 bg-red-50 border-t border-red-100">
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            You've reached your booking limit. Please cancel existing bookings or try again later.
          </p>
        </div>
      )}
    </div>
  );
}