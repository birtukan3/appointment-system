"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!email) { setError('Please enter your email address'); setLoading(false); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError('Please enter a valid email address'); setLoading(false); return; }
    try {
      const response = await api.post('/auth/forgot-password', { email });
      setMessage(response.data?.message || 'Recovery request received.');
      setSubmitted(true);
      toast.success('Recovery request submitted');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit recovery request');
      toast.error(err.response?.data?.message || 'Failed to submit recovery request');
    } finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Recovery Request Received</h1>
          <p className="text-gray-600 mb-6">{message || <>We received a password recovery request for <strong>{email}</strong>.</>}</p>
          <p className="text-sm text-gray-500 mb-6">Need to try a different email? <button onClick={() => setSubmitted(false)} className="text-blue-600 hover:text-blue-700 font-medium">try again</button></p>
          <button onClick={() => router.push('/login')} className="text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-2 mx-auto">
            <ArrowLeft className="h-4 w-4" /> Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <button onClick={() => router.push('/login')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </button>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Recovery</h1>
          <p className="text-gray-600 mt-2">Enter your email to submit a password recovery request</p>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"><AlertCircle className="h-5 w-5" /><p className="text-sm">{error}</p></div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="you@example.com" required disabled={loading} />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50">
            {loading ? <span className="flex items-center justify-center gap-2"><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>Sending...</span> : 'Submit Recovery Request'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-6">Don't have an account? <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">Register here</Link></p>
      </div>
    </div>
  );
}