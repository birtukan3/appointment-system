// frontend/app/components/VerificationModal.jsx
"use client";

import { useState } from 'react';
import { X, CheckCircle, XCircle, Search, Loader, Shield, UserCheck, Calendar, Clock } from 'lucide-react';
import api from '../lib/api';
import { showSuccess, showError } from '../lib/toastUtils';
import StatusBadge from './StatusBadge';
import { format } from 'date-fns';

export default function VerificationModal({ isOpen, onClose, onVerified }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const handleVerify = async () => {
    if (!code.trim()) {
      showError('Please enter a verification code');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const response = await api.verifyAppointment(code);
      setAppointment(response.appointment);
      setResult({ success: true, message: 'Appointment verified successfully!' });
      showSuccess('Appointment verified!');
    } catch (error) {
      setResult({ success: false, message: error.response?.data?.message || 'Invalid verification code' });
      showError(error.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!appointment) return;
    setCheckingIn(true);
    try {
      const response = await api.checkInAppointment(appointment.id);
      showSuccess('User checked in successfully!');
      setAppointment(response);
      onVerified?.(response);
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      showError(error.response?.data?.message || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2"><div className="p-2 bg-indigo-100 rounded-lg"><Shield className="h-5 w-5 text-indigo-600" /></div><h2 className="text-xl font-bold text-gray-900">Verify Appointment</h2></div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Enter Verification Code</label>
            <div className="flex gap-2">
              <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="APP-2026-XXXXXX" className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500" autoFocus />
              <button onClick={handleVerify} disabled={loading || !code} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2">{loading ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Verify</button>
            </div>
          </div>
          {result && (
            <div className={`p-4 rounded-xl mb-4 animate-scaleIn ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2">{result.success ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}<span className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>{result.message}</span></div>
            </div>
          )}
          {appointment && (
            <div className="space-y-4 animate-slideUp">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4">
                <div className="flex justify-between items-start mb-3"><div><p className="text-xs text-gray-500">Service</p><p className="font-semibold text-gray-900">{appointment.serviceName}</p></div><StatusBadge status={appointment.status} /></div>
                <div className="grid grid-cols-2 gap-3 mb-3"><div><p className="text-xs text-gray-500">Client</p><p className="font-medium text-gray-900">{appointment.userName || appointment.userEmail}</p></div><div><p className="text-xs text-gray-500">Provider</p><p className="font-medium text-gray-900">{appointment.providerName}</p></div></div>
                <div className="flex items-center gap-4 text-sm"><div className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-gray-400" />{format(new Date(appointment.datetime), 'MMM d, yyyy')}</div><div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-gray-400" />{format(new Date(appointment.datetime), 'h:mm a')}</div></div>
                {appointment.verificationCode && (<div className="mt-3 p-2 bg-white/50 rounded-lg"><p className="text-xs text-gray-500">Verification Code</p><p className="font-mono font-bold text-indigo-700 text-sm">{appointment.verificationCode}</p></div>)}
              </div>
              {appointment.status === 'approved' && (<button onClick={handleCheckIn} disabled={checkingIn} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-lg">{checkingIn ? <Loader className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}{checkingIn ? 'Checking In...' : 'Check In User'}</button>)}
              {appointment.status === 'checked_in' && (<div className="p-3 bg-blue-50 rounded-lg text-center"><p className="text-sm text-blue-700">✓ Already checked in</p></div>)}
              {appointment.status === 'completed' && (<div className="p-3 bg-green-50 rounded-lg text-center"><p className="text-sm text-green-700">✓ Appointment completed</p></div>)}
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.2s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
      `}</style>
    </div>
  );
}