"use client";

import { useState, useEffect, useCallback, useContext } from 'react';
import { AppContext } from '../providers';
import api from '../lib/api';
import { showSuccess, showError, showInfo } from '../lib/toastUtils';
import io from 'socket.io-client';

let socket = null;

export function useNotifications() {
  const { user, isAuthenticated } = useContext(AppContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [showToast, setShowToast] = useState(true);

  // Connect to WebSocket
  useEffect(() => {
    if (isAuthenticated && user && !socket) {
      const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3002';
      socket = io(socketUrl, {
        query: { userId: user.id },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        console.log('Notifications socket connected');
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('Notifications socket disconnected');
        setIsConnected(false);
      });

      socket.on('newNotification', (notification) => {
        addNotification(notification);
        if (showToast) {
          showInfo(notification.message || 'New notification received');
        }
      });

      socket.on('appointmentUpdate', (data) => {
        if (data.message && showToast) {
          showInfo(data.message);
        }
        fetchNotifications();
      });
    }

    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [isAuthenticated, user, showToast]);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const response = await api.get('/notifications');
      const data = response.data || response;
      const notificationsList = Array.isArray(data) ? data : (data.notifications || []);
      setNotifications(notificationsList);
      setUnreadCount(notificationsList.filter(n => !n.read).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Add a new notification
  const addNotification = useCallback((notification) => {
    setNotifications(prev => {
      const newNotifications = [notification, ...prev].slice(0, 100);
      return newNotifications;
    });
    if (!notification.read) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  // Mark a single notification as read
  const markAsRead = useCallback(async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
      showSuccess('All notifications marked as read');
    } catch (error) {
      showError('Failed to mark notifications as read');
    }
  }, []);

  // Delete a notification
  const deleteNotification = useCallback(async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (notifications.find(n => n.id === id && !n.read)) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      showSuccess('Notification deleted');
    } catch (error) {
      showError('Failed to delete notification');
    }
  }, [notifications]);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    try {
      await api.delete('/notifications/clear');
      setNotifications([]);
      setUnreadCount(0);
      showSuccess('All notifications cleared');
    } catch (error) {
      showError('Failed to clear notifications');
    }
  }, []);

  // Get notifications by type
  const getByType = useCallback((type) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  // Get unread notifications
  const getUnread = useCallback(() => {
    return notifications.filter(n => !n.read);
  }, [notifications]);

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    isConnected,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    addNotification,
    getByType,
    getUnread,
    setShowToast,
  };
}