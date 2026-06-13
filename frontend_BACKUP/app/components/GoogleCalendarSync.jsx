"use client";

import { useState, useEffect } from 'react';
import { Calendar as GoogleCalendarIcon, CheckCircle, XCircle, Loader, RefreshCw, ExternalLink, Trash2, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function GoogleCalendarSync({ userId, onSyncComplete }) {
  const [isConnected, setIsConnected] = useState(false);
  const [calendarEmail, setCalendarEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, [userId]);

  const fetchStatus = async () => {
    try {
      const response = await api.get('/google-calendar/status');
      setIsConnected(response.connected);
      setCalendarEmail(response.email);
    } catch (error) {
      console.error('Failed to fetch calendar status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await api.get('/google-calendar/auth-url');
      const authUrl = response.url;
      
      // Open popup for OAuth
      const popup = window.open(
        authUrl,
        'Connect Google Calendar',
        'width=600,height=700,left=200,top=100'
      );
      
      // Listen for message from popup
      const handleMessage = async (event) => {
        if (event.data.type === 'google-calendar-connected') {
          popup?.close();
          window.removeEventListener('message', handleMessage);
          await fetchStatus();
          toast.success('Google Calendar connected successfully!');
          onSyncComplete?.();
        }
      };
      
      window.addEventListener('message', handleMessage);
    } catch (error) {
      toast.error('Failed to connect Google Calendar');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar? Your events will no longer sync.')) {
      return;
    }
    
    setDisconnecting(true);
    try {
      await api.delete('/google-calendar/disconnect');
      setIsConnected(false);
      setCalendarEmail(null);
      toast.success('Google Calendar disconnected');
      onSyncComplete?.();
    } catch (error) {
      toast.error('Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await api.post('/google-calendar/sync');
      toast.success('Calendar synced successfully');
      onSyncComplete?.();
    } catch (error) {
      toast.error('Failed to sync calendar');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader className="h-5 w-5 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <GoogleCalendarIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Google Calendar Sync</h3>
            <p className="text-xs text-gray-500">Sync your appointments with Google Calendar</p>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {isConnected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Connected</span>
              </div>
              <span className="text-xs text-gray-600">{calendarEmail}</span>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {syncing ? <Loader className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sync Now
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition disabled:opacity-50 flex items-center gap-2"
              >
                {disconnecting ? <Loader className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Disconnect
              </button>
            </div>
            
            <div className="p-2 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Your appointments will automatically sync to your Google Calendar
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <GoogleCalendarIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Connect your Google Calendar to:</p>
              <ul className="text-xs text-gray-500 mt-2 space-y-1">
                <li>✓ Automatically add appointments to your calendar</li>
                <li>✓ Get reminders before your appointments</li>
                <li>✓ Avoid double-booking conflicts</li>
                <li>✓ Access your schedule anywhere</li>
              </ul>
            </div>
            
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              {connecting ? <Loader className="h-4 w-4 animate-spin" /> : <GoogleCalendarIcon className="h-4 w-4" />}
              Connect Google Calendar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}