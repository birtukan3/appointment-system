// frontend/app/components/StatusBadge.jsx
"use client";

import { 
  Clock, CheckCircle, XCircle, UserCheck, CalendarCheck, 
  Ban, Archive, UserX, AlertCircle
} from 'lucide-react';

const statusConfig = {
  pending: {
    label: 'Pending',
    color: 'bg-amber-100 text-amber-700',
    border: 'border-amber-200',
    icon: Clock,
    animation: 'animate-pulse'
  },
  approved: {
    label: 'Approved',
    color: 'bg-emerald-100 text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle,
    animation: ''
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-rose-100 text-rose-700',
    border: 'border-rose-200',
    icon: XCircle,
    animation: ''
  },
  checked_in: {
    label: 'Checked In',
    color: 'bg-blue-100 text-blue-700',
    border: 'border-blue-200',
    icon: UserCheck,
    animation: ''
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-700',
    border: 'border-green-200',
    icon: CalendarCheck,
    animation: ''
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-600',
    border: 'border-gray-200',
    icon: Ban,
    animation: ''
  },
  expired: {
    label: 'Expired',
    color: 'bg-gray-100 text-gray-500',
    border: 'border-gray-200',
    icon: Archive,
    animation: ''
  },
  no_show: {
    label: 'No Show',
    color: 'bg-red-100 text-red-600',
    border: 'border-red-200',
    icon: UserX,
    animation: ''
  },
  archived: {
    label: 'Archived',
    color: 'bg-slate-100 text-slate-500',
    border: 'border-slate-200',
    icon: Archive,
    animation: ''
  }
};

export default function StatusBadge({ status, showIcon = true, className = '', size = 'md' }) {
  const config = statusConfig[status?.toLowerCase()] || statusConfig.pending;
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]} ${config.color} ${config.border} ${config.animation} ${className}`}>
      {showIcon && <Icon className={`${size === 'sm' ? 'h-2.5 w-2.5' : size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'}`} />}
      {config.label}
    </span>
  );
}