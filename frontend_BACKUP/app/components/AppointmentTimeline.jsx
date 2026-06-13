"use client";

import { Calendar, Clock, UserCheck, CheckCircle, XCircle, Ban, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

const timelineSteps = [
  { key: 'pending', label: 'Booking Request', icon: Calendar, color: 'bg-amber-500', description: 'Your appointment request has been submitted' },
  { key: 'approved', label: 'Approved', icon: Clock, color: 'bg-emerald-500', description: 'Appointment has been approved by staff' },
  { key: 'checked_in', label: 'Checked In', icon: UserCheck, color: 'bg-blue-500', description: 'You have checked in for your appointment' },
  { key: 'completed', label: 'Completed', icon: CheckCircle, color: 'bg-green-500', description: 'Appointment has been completed' },
];

const alternateSteps = {
  rejected: { key: 'rejected', label: 'Rejected', icon: XCircle, color: 'bg-rose-500', description: 'Appointment was rejected' },
  cancelled: { key: 'cancelled', label: 'Cancelled', icon: Ban, color: 'bg-gray-500', description: 'Appointment was cancelled' },
  expired: { key: 'expired', label: 'Expired', icon: Calendar, color: 'bg-gray-400', description: 'Appointment has expired' },
};

export default function AppointmentTimeline({ appointment }) {
  if (!appointment) return null;
  
  const status = appointment?.status?.toLowerCase();
  const isTerminal = ['rejected', 'cancelled', 'expired'].includes(status);
  const steps = isTerminal ? [timelineSteps[0], alternateSteps[status]] : timelineSteps;

  const getCurrentStepIndex = () => {
    if (isTerminal) return status === 'rejected' || status === 'cancelled' || status === 'expired' ? 1 : 0;
    const index = steps.findIndex(step => step.key === status);
    return index >= 0 ? index : 0;
  };

  const currentStep = getCurrentStepIndex();

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-6 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-indigo-600" />
        Appointment Timeline
      </h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-gray-200" />

        {/* Timeline steps */}
        <div className="space-y-6 relative">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index <= currentStep;
            const isCurrent = index === currentStep;

            return (
              <div key={step.key} className="flex gap-4">
                {/* Icon circle */}
                <div className="relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted ? step.color : 'bg-gray-100'
                  } ${isCurrent ? 'ring-4 ring-opacity-30 shadow-lg' : ''}`}
                  style={isCurrent ? { boxShadow: `0 0 0 3px ${step.color === 'bg-amber-500' ? '#fbbf24' : step.color === 'bg-emerald-500' ? '#10b981' : '#3b82f6'}33` } : {}}>
                    <Icon className={`h-5 w-5 ${isCompleted ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className={`font-semibold ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </h4>
                    {isCurrent && appointment?.updatedAt && (
                      <span className="text-xs text-gray-400">
                        {format(new Date(appointment.updatedAt), 'MMM d, h:mm a')}
                      </span>
                    )}
                  </div>
                  
                  <p className={`text-sm mt-1 ${isCompleted ? 'text-gray-600' : 'text-gray-400'}`}>
                    {step.description}
                  </p>

                  {isCurrent && appointment?.comment && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-indigo-500 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-indigo-600">Staff Comment:</p>
                          <p className="text-sm text-gray-700 mt-0.5">{appointment.comment}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {step.key === 'approved' && appointment?.bookingCode && (
                    <div className="mt-2 p-2 bg-indigo-50 rounded-lg border border-indigo-100 inline-block">
                      <p className="text-xs text-indigo-600 font-medium">Booking Code:</p>
                      <p className="text-sm font-mono font-bold text-indigo-700">
                        {appointment.bookingCode}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Date info */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex justify-between text-sm">
          <div>
            <p className="text-gray-500">Booked on</p>
            <p className="font-medium text-gray-700">{format(new Date(appointment.createdAt), 'MMM d, yyyy')}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">Last updated</p>
            <p className="font-medium text-gray-700">{format(new Date(appointment.updatedAt), 'MMM d, yyyy')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}