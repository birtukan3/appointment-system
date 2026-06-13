// hooks/useBookings.js
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export function useBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toastShownRef = useRef(false);
  const abortControllerRef = useRef(null);

  const fetchBookings = useCallback(async (silent = false) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    if (!silent) setLoading(true);
    
    try {
      const response = await api.get('/appointments/bookings', {
        signal: controller.signal
      });
      setBookings(response.data || []);
      setError(null);
      toastShownRef.current = false;
    } catch (err) {
      if (err.name === 'CanceledError') return;
      
      setError(err.message);
      if (!silent && !toastShownRef.current) {
        toastShownRef.current = true;
        toast.error('Failed to load bookings. Please refresh.');
        setTimeout(() => { toastShownRef.current = false; }, 5000);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    
    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchBookings]);

  return { bookings, loading, error, refetch: () => fetchBookings(false) };
}