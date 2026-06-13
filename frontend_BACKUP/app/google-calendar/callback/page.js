"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function GoogleCalendarCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setMessage('Failed to connect Google Calendar. Please try again.');
      setTimeout(() => {
        window.opener?.postMessage({ type: 'google-calendar-error' }, '*');
        window.close();
      }, 2000);
      return;
    }

    if (code) {
      handleCallback(code);
    } else {
      setStatus('error');
      setMessage('No authorization code received');
    }
  }, [searchParams]);

  const handleCallback = async (code) => {
    try {
      await api.post('/google-calendar/connect', { code });
      
      setStatus('success');
      setMessage('Google Calendar connected successfully!');
      
      // Notify parent window
      if (window.opener) {
        window.opener.postMessage({ type: 'google-calendar-connected' }, '*');
      }
      
      setTimeout(() => {
        window.close();
      }, 2000);
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.message || 'Failed to connect Google Calendar');
      
      window.opener?.postMessage({ type: 'google-calendar-error' }, '*');
      
      setTimeout(() => {
        window.close();
      }, 3000);
    }
  };

  const statusConfig = {
    loading: { icon: Loader, color: 'text-blue-600', bg: 'bg-blue-50', title: 'Connecting...' },
    success: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', title: 'Success!' },
    error: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', title: 'Connection Failed' },
  };

  const config = statusConfig[status];
  const Icon = config?.icon || Loader;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className={`max-w-md w-full ${config?.bg} rounded-2xl p-8 text-center shadow-xl`}>
        <div className={`w-20 h-20 ${config?.bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
          <Icon className={`h-10 w-10 ${config?.color} ${status === 'loading' ? 'animate-spin' : ''}`} />
        </div>
        <h2 className={`text-2xl font-bold ${config?.color} mb-2`}>{config?.title}</h2>
        <p className="text-gray-600">{message || 'Please wait while we connect your calendar...'}</p>
        {status !== 'loading' && (
          <p className="text-sm text-gray-500 mt-4">This window will close automatically...</p>
        )}
      </div>
    </div>
  );
}