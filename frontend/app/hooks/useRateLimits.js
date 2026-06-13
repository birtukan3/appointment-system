"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export function useRateLimits(options = {}) {
  const { 
    autoFetch = true, 
    onLimitReached = null,
    showToastOnLimit = true,
    refreshInterval = 30000 
  } = options;

  const [limits, setLimits] = useState({
    activeBookings: 0,
    remainingActive: 3,
    todayBookings: 0,
    remainingToday: 2,
    weeklyBookings: 0,
    remainingWeekly: 5,
    monthlyBookings: 0,
    remainingMonthly: 15,
    cooldownRemaining: 0,
    limits: { 
      maxActiveBookings: 3, 
      maxDailyBookings: 2,
      maxWeeklyBookings: 5,
      maxMonthlyBookings: 15,
      bookingCooldownMinutes: 5
    },
    isLoading: true,
    error: null,
    canBook: true
  });

  const fetchLimits = useCallback(async () => {
    try {
      const response = await api.get('/appointments/user/booking-limits');
      const data = response.data || response;
      
      const canBook = data.remainingActive > 0 && 
                      data.remainingToday > 0 && 
                      data.remainingWeekly > 0 &&
                      data.remainingMonthly > 0 &&
                      data.cooldownRemaining === 0;
      
      setLimits(prev => ({
        ...data,
        isLoading: false,
        error: null,
        canBook
      }));
      
      if (!canBook && showToastOnLimit && onLimitReached) {
        onLimitReached(data);
        toast.error('Booking limit reached. Please try again later.', { id: 'rate-limit' });
      }
      
      return data;
    } catch (error) {
      console.error('Failed to fetch rate limits:', error);
      setLimits(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to load limits',
        canBook: true // Allow booking if we can't check limits
      }));
      return null;
    }
  }, [onLimitReached, showToastOnLimit]);

  // Cooldown timer effect
  useEffect(() => {
    if (limits.cooldownRemaining > 0) {
      const timer = setInterval(() => {
        setLimits(prev => {
          const newCooldown = Math.max(0, prev.cooldownRemaining - 1);
          return {
            ...prev,
            cooldownRemaining: newCooldown,
            canBook: newCooldown === 0 && 
                     prev.remainingActive > 0 && 
                     prev.remainingToday > 0 && 
                     prev.remainingWeekly > 0 &&
                     prev.remainingMonthly > 0
          };
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [limits.cooldownRemaining]);

  // Auto-fetch on mount and periodically
  useEffect(() => {
    if (autoFetch) {
      fetchLimits();
      const interval = setInterval(fetchLimits, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoFetch, fetchLimits, refreshInterval]);

  // Helper functions
  const getRemainingPercentage = useCallback((type) => {
    switch(type) {
      case 'active':
        return (limits.remainingActive / limits.limits.maxActiveBookings) * 100;
      case 'daily':
        return (limits.remainingToday / limits.limits.maxDailyBookings) * 100;
      case 'weekly':
        return (limits.remainingWeekly / limits.limits.maxWeeklyBookings) * 100;
      case 'monthly':
        return (limits.remainingMonthly / limits.limits.maxMonthlyBookings) * 100;
      default:
        return 0;
    }
  }, [limits]);

  const getLimitStatus = useCallback(() => {
    const isNearActive = limits.remainingActive <= 1;
    const isNearDaily = limits.remainingToday <= 1;
    const isNearWeekly = limits.remainingWeekly <= 2;
    const isNearMonthly = limits.remainingMonthly <= 3;
    
    const isAtActive = limits.remainingActive === 0;
    const isAtDaily = limits.remainingToday === 0;
    const isAtWeekly = limits.remainingWeekly === 0;
    const isAtMonthly = limits.remainingMonthly === 0;
    
    const hasWarning = isNearActive || isNearDaily || isNearWeekly || isNearMonthly;
    const hasError = isAtActive || isAtDaily || isAtWeekly || isAtMonthly;
    
    let message = '';
    if (isAtActive) message = 'You have reached the maximum active bookings limit';
    else if (isAtDaily) message = 'You have reached your daily booking limit';
    else if (isAtWeekly) message = 'You have reached your weekly booking limit';
    else if (isAtMonthly) message = 'You have reached your monthly booking limit';
    else if (hasWarning && !hasError) message = 'You are close to your booking limit';
    else message = 'You can book appointments';
    
    return { hasWarning, hasError, message };
  }, [limits]);

  const decrementActive = useCallback(() => {
    setLimits(prev => ({
      ...prev,
      activeBookings: prev.activeBookings + 1,
      remainingActive: Math.max(0, prev.remainingActive - 1),
      canBook: prev.remainingActive - 1 > 0 && prev.remainingToday > 0 && prev.cooldownRemaining === 0
    }));
  }, []);

  const incrementActive = useCallback(() => {
    setLimits(prev => ({
      ...prev,
      activeBookings: Math.max(0, prev.activeBookings - 1),
      remainingActive: Math.min(prev.limits.maxActiveBookings, prev.remainingActive + 1),
      canBook: true
    }));
  }, []);

  const startCooldown = useCallback(() => {
    setLimits(prev => ({
      ...prev,
      cooldownRemaining: prev.limits.bookingCooldownMinutes * 60
    }));
  }, []);

  return {
    ...limits,
    fetchLimits,
    getRemainingPercentage,
    getLimitStatus,
    decrementActive,
    incrementActive,
    startCooldown,
    // Convenience properties
    isActiveLimitReached: limits.remainingActive === 0,
    isDailyLimitReached: limits.remainingToday === 0,
    isWeeklyLimitReached: limits.remainingWeekly === 0,
    isMonthlyLimitReached: limits.remainingMonthly === 0,
    isOnCooldown: limits.cooldownRemaining > 0,
    canBookToday: limits.remainingToday > 0,
    canBookThisWeek: limits.remainingWeekly > 0,
    canBookThisMonth: limits.remainingMonthly > 0,
  };
}