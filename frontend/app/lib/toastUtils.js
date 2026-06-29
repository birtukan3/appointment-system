// frontend/app/lib/toastUtils.js
// ============================================
// DEDUPLICATED TOAST UTILITY
// Prevents duplicate toast messages
// ============================================

import toast from 'react-hot-toast';

// Toast deduplication cache
const toastCache = new Map();
const TOAST_CACHE_DURATION = 2000; // 2 seconds

const generateKey = (message, type) => `${type}:${message}`;

const clearCacheEntry = (key) => {
  setTimeout(() => {
    toastCache.delete(key);
  }, TOAST_CACHE_DURATION);
};

export const showSuccess = (message, options = {}) => {
  const key = generateKey(message, 'success');
  if (toastCache.has(key)) return;
  
  toastCache.set(key, true);
  toast.success(message, {
    duration: 3000,
    position: 'top-right',
    style: {
      background: '#10b981',
      color: '#fff',
      borderRadius: '12px',
      padding: '12px 16px',
      fontSize: '14px',
      fontWeight: '500',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#10b981',
    },
    ...options,
  });
  clearCacheEntry(key);
};

export const showError = (message, options = {}) => {
  const key = generateKey(message, 'error');
  if (toastCache.has(key)) return;
  
  toastCache.set(key, true);
  toast.error(message, {
    duration: 4000,
    position: 'top-right',
    style: {
      background: '#ef4444',
      color: '#fff',
      borderRadius: '12px',
      padding: '12px 16px',
      fontSize: '14px',
      fontWeight: '500',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#ef4444',
    },
    ...options,
  });
  clearCacheEntry(key);
};

export const showInfo = (message, options = {}) => {
  const key = generateKey(message, 'info');
  if (toastCache.has(key)) return;
  
  toastCache.set(key, true);
  toast(message, {
    duration: 3000,
    position: 'top-right',
    icon: 'ℹ️',
    style: {
      background: '#3b82f6',
      color: '#fff',
      borderRadius: '12px',
      padding: '12px 16px',
      fontSize: '14px',
      fontWeight: '500',
    },
    ...options,
  });
  clearCacheEntry(key);
};

export const showWarning = (message, options = {}) => {
  const key = generateKey(message, 'warning');
  if (toastCache.has(key)) return;
  
  toastCache.set(key, true);
  toast(message, {
    duration: 4000,
    position: 'top-right',
    icon: '⚠️',
    style: {
      background: '#f59e0b',
      color: '#fff',
      borderRadius: '12px',
      padding: '12px 16px',
      fontSize: '14px',
      fontWeight: '500',
    },
    ...options,
  });
  clearCacheEntry(key);
};

export const showLoading = (message, options = {}) => {
  return toast.loading(message, {
    position: 'top-right',
    style: {
      background: '#6366f1',
      color: '#fff',
      borderRadius: '12px',
      padding: '12px 16px',
      fontSize: '14px',
      fontWeight: '500',
    },
    ...options,
  });
};

export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};

export const dismissAllToasts = () => {
  toast.dismiss();
  toastCache.clear();
};

export default {
  success: showSuccess,
  error: showError,
  info: showInfo,
  warning: showWarning,
  loading: showLoading,
  dismiss: dismissToast,
  dismissAll: dismissAllToasts,
};