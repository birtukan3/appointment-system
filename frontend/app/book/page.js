"use client";

import { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppContext } from "../providers";
import api from "../lib/api";
import { 
  Calendar, Clock, CheckCircle, ArrowLeft, Sparkles, Shield, 
  Star, Users, CalendarDays, Clock4, Briefcase, 
  Rocket, Loader, X, Upload, FileText, ChevronRight,
  Search, User, Building2, Coffee, Wifi, Monitor, Printer,
  AlertCircle, Info, Trophy, Flag, Circle, Heart, Smile, 
  Phone, Mail, UserPlus, UserCheck, Sun, Sunrise, TrendingUp,
  Award, Zap, Gift, Crown, ThumbsUp, ShieldCheck, StarHalf,
  Video, Headphones, MessageCircle, MapPin, CreditCard,
  ChevronLeft, ArrowRight, Sparkle, BadgeCheck, RefreshCw, History,
  Code, Terminal, Cpu, GitBranch, Cloud, Database, Server, Smartphone,
  BookOpen, Target, Zap as ZapIcon, Layers, Box, Code2, Bug,
  ChevronDown
} from "lucide-react";
import toast from "react-hot-toast";
import { format, addDays, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, isBefore, startOfDay, isWeekend } from "date-fns";

// ============================================
// GOOGLE CALENDAR SYNC COMPONENT
// ============================================
const GoogleCalendarSync = ({ userId, onSyncComplete, selectedDate, selectedStaff, onSlotsUpdated }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [calendarEmail, setCalendarEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, [userId]);

  const fetchStatus = async () => {
    try {
      const response = await api.getGoogleCalendarStatus();
      setIsConnected(response.connected || false);
      setCalendarEmail(response.email || null);
    } catch (error) {
      console.error("Failed to fetch calendar status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await api.getGoogleCalendarAuthUrl();
      const authUrl = response.url;
      const popup = window.open(authUrl, "Connect Google Calendar", "width=600,height=700,left=200,top=100");
      const handleMessage = async (event) => {
        if (event.data.type === "google-calendar-connected") {
          popup?.close();
          window.removeEventListener("message", handleMessage);
          await fetchStatus();
          toast.success("Google Calendar connected successfully!");
          onSyncComplete?.();
          if (selectedDate && selectedStaff) onSlotsUpdated?.();
        }
      };
      window.addEventListener("message", handleMessage);
    } catch (error) {
      toast.error("Failed to connect Google Calendar");
    } finally {
      setConnecting(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await api.syncGoogleCalendar();
      toast.success("Calendar synced successfully");
      onSyncComplete?.();
      if (selectedDate && selectedStaff) onSlotsUpdated?.();
    } catch (error) {
      toast.error("Failed to sync calendar");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center p-4"><Loader className="h-5 w-5 animate-spin text-indigo-500" /></div>;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm"><Calendar className="h-5 w-5 text-blue-600" /></div>
          <div><h3 className="font-semibold text-gray-900">Google Calendar Sync</h3><p className="text-xs text-gray-500">Sync consultations with your calendar</p></div>
        </div>
      </div>
      <div className="p-4">
        {isConnected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /><span className="text-sm font-medium text-green-700">Connected</span></div>
              <span className="text-xs text-gray-600">{calendarEmail}</span>
            </div>
            <button onClick={handleSyncNow} disabled={syncing} className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {syncing ? <Loader className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync Now
            </button>
            <div className="p-2 bg-blue-50 rounded-lg"><p className="text-xs text-blue-700 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Your consultations will automatically sync to Google Calendar</p></div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg text-center"><Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" /><p className="text-sm text-gray-600">Connect to Google Calendar to:</p><ul className="text-xs text-gray-500 mt-2 space-y-1"><li>✓ Auto-add sessions to your calendar</li><li>✓ Get reminders before consultations</li><li>✓ Avoid double-booking conflicts</li><li>✓ Access schedule anywhere</li></ul></div>
            <button onClick={handleConnect} disabled={connecting} className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition flex items-center justify-center gap-2">
              {connecting ? <Loader className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />} Connect Google Calendar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// FULL CALENDAR DATE PICKER (FIXED)
// ============================================
const FullCalendar = ({ selectedDate, onDateSelect, bookedDates = [] }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);

  useEffect(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    const days = [];
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    setCalendarDays(days);
  }, [currentMonth]);

  const goPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onDateSelect(format(today, 'yyyy-MM-dd'));
  };

  const isDateBooked = (date) => bookedDates.includes(format(date, 'yyyy-MM-dd'));
  const isDateDisabled = (date) => isBefore(date, startOfDay(new Date())) && !isSameDay(date, new Date());
  const isDateSelected = (date) => selectedDate === format(date, 'yyyy-MM-dd');

  const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <button onClick={goPrevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition"><ChevronLeft className="h-5 w-5 text-slate-600" /></button>
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-slate-800">{format(currentMonth, 'MMMM yyyy')}</span>
          <button onClick={goToday} className="text-sm text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded-lg transition">Today</button>
        </div>
        <button onClick={goNextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition"><ChevronRight className="h-5 w-5 text-slate-600" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, idx) => {
          const isCurrentMonth = isSameMonth(date, currentMonth);
          const disabled = isDateDisabled(date);
          const booked = isDateBooked(date);
          const selected = isDateSelected(date);
          let classes = "h-10 rounded-lg flex items-center justify-center text-sm transition-all";
          if (!isCurrentMonth) classes += " text-slate-300";
          else if (selected) classes += " bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md";
          else if (disabled) classes += " text-slate-300 bg-slate-50 cursor-not-allowed";
          else if (booked) classes += " text-red-400 bg-red-50 cursor-not-allowed line-through";
          else classes += " text-slate-700 hover:bg-indigo-100 hover:text-indigo-700 cursor-pointer";
          return (
            <button
              key={idx}
              onClick={() => !disabled && !booked && onDateSelect(format(date, 'yyyy-MM-dd'))}
              disabled={disabled || booked}
              className={classes}
            >
              {format(date, 'd')}
              {!disabled && !booked && isCurrentMonth && !selected && <div className="w-1 h-1 bg-green-400 rounded-full mx-auto mt-0.5"></div>}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex justify-center gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-400 rounded-full"></div><span>Available</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-400 rounded-full"></div><span>Booked (GC)</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-indigo-600 rounded-full"></div><span>Selected</span></div>
      </div>
    </div>
  );
};

// ============================================
// FULLY VISIBLE TIME PICKER
// ============================================
const TimePicker = ({ timeSlots, selectedTime, onTimeSelect, bookedSlots, selectedDate }) => {
  const [visibleCount, setVisibleCount] = useState(8);
  
  const isTimeSlotBooked = (time) => {
    if (!bookedSlots || bookedSlots.length === 0) return false;
    return bookedSlots.some(slot => {
      if (slot.start === time) return true;
      if (typeof slot === 'string') return slot === time;
      return false;
    });
  };

  const isTimeSlotPast = (time) => {
    if (!selectedDate) return false;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (selectedDate !== todayStr) return false;
    const now = new Date();
    const [hour, minute] = time.split(':');
    const timeDate = new Date();
    timeDate.setHours(parseInt(hour), parseInt(minute), 0, 0);
    return timeDate < now;
  };

  const morningSlots = timeSlots.filter(s => parseInt(s.time.split(':')[0]) < 12);
  const afternoonSlots = timeSlots.filter(s => parseInt(s.time.split(':')[0]) >= 12);
  const visibleMorning = morningSlots.slice(0, visibleCount);
  const visibleAfternoon = afternoonSlots.slice(0, visibleCount);
  const hasMoreSlots = morningSlots.length > visibleCount || afternoonSlots.length > visibleCount;

  if (morningSlots.length === 0 && afternoonSlots.length === 0) {
    return (
      <div className="text-center py-10 bg-slate-50 rounded-xl">
        <Clock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">No available time slots</p>
        <p className="text-xs text-slate-400 mt-1">Please select another date</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {morningSlots.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sunrise className="h-5 w-5 text-amber-500" />
            <p className="text-base font-semibold text-amber-600">Morning Sessions</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {visibleMorning.map((slot) => {
              const isBooked = isTimeSlotBooked(slot.time);
              const isPast = isTimeSlotPast(slot.time);
              const isSelected = selectedTime === slot.time;
              let classes = "py-3.5 px-3 rounded-xl border-2 text-base font-medium transition-all duration-200 text-center";
              if (isSelected) classes += " bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-md transform scale-105";
              else if (isBooked) classes += " border-red-200 bg-red-50 text-red-400 cursor-not-allowed line-through";
              else if (isPast) classes += " border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed";
              else classes += " border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md cursor-pointer";
              return (
                <button key={slot.time} onClick={() => !isBooked && !isPast && onTimeSelect(slot.time)} disabled={isBooked || isPast} className={classes}>
                  {slot.display}
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {afternoonSlots.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sun className="h-5 w-5 text-orange-500" />
            <p className="text-base font-semibold text-orange-600">Afternoon Sessions</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {visibleAfternoon.map((slot) => {
              const isBooked = isTimeSlotBooked(slot.time);
              const isPast = isTimeSlotPast(slot.time);
              const isSelected = selectedTime === slot.time;
              let classes = "py-3.5 px-3 rounded-xl border-2 text-base font-medium transition-all duration-200 text-center";
              if (isSelected) classes += " bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-md transform scale-105";
              else if (isBooked) classes += " border-red-200 bg-red-50 text-red-400 cursor-not-allowed line-through";
              else if (isPast) classes += " border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed";
              else classes += " border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md cursor-pointer";
              return (
                <button key={slot.time} onClick={() => !isBooked && !isPast && onTimeSelect(slot.time)} disabled={isBooked || isPast} className={classes}>
                  {slot.display}
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {hasMoreSlots && (
        <button onClick={() => setVisibleCount(prev => prev + 8)} className="w-full mt-2 text-center py-2.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium border border-dashed border-indigo-200 rounded-xl hover:bg-indigo-50 transition">
          + Show More Times
        </button>
      )}
    </div>
  );
};

// ============================================
// MAIN BOOKING PAGE COMPONENT
// ============================================
export default function BookConsultationPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useContext(AppContext);
  
  // ============ STATE MANAGEMENT ============
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedService, setSelectedService] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [calculatedDuration, setCalculatedDuration] = useState(0);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [bookedDates, setBookedDates] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [notes, setNotes] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [bookingCode, setBookingCode] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [durationError, setDurationError] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("Normal");
  const [forSelf, setForSelf] = useState(true);
  const [clientName, setClientName] = useState("");
  const [clientAge, setClientAge] = useState("");
  const [clientGender, setClientGender] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [dailyBookingCount, setDailyBookingCount] = useState(0);
  const [pendingBookingCount, setPendingBookingCount] = useState(0);
  const [bookingLocked, setBookingLocked] = useState(false);
  const [rateLimitError, setRateLimitError] = useState("");
  const [fetchingStats, setFetchingStats] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [bookingLimits, setBookingLimits] = useState(null);
  const [currentStepProgress, setCurrentStepProgress] = useState(20);
  const [recentBookings, setRecentBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ============ CONSTANTS ============
  const WORK_START = 9.0;
  const WORK_END = 18.0;
  const LUNCH_START = 12.5;
  const LUNCH_END = 13.5;

  const steps = [
    { number: 1, name: "Select Expert", icon: Users, description: "Choose your preferred tech expert" },
    { number: 2, name: "Choose Service", icon: Briefcase, description: "Select the consultation service" },
    { number: 3, name: "Pick Schedule", icon: Calendar, description: "Select date and time" },
    { number: 4, name: "Your Details", icon: User, description: "Tell us about yourself" },
    { number: 5, name: "Set Priority", icon: Flag, description: "Choose response speed" }
  ];

  const priorityOptions = [
    { value: "Normal", label: "Standard Priority", description: "Best for general tech consultations", icon: Circle, color: "blue", bg: "bg-blue-50", text: "text-blue-600", estimatedTime: "24 hours", badge: "Standard" },
    { value: "High", label: "High Priority", description: "Get faster response for urgent issues", icon: Flag, color: "orange", bg: "bg-orange-50", text: "text-orange-600", estimatedTime: "12 hours", badge: "Recommended" },
    { value: "Urgent", label: "Critical Priority", description: "Production issues, immediate attention", icon: AlertCircle, color: "red", bg: "bg-red-50", text: "text-red-600", estimatedTime: "4 hours", badge: "Emergency" }
  ];

  const timeSlots = useMemo(() => [
    { time: "09:00", display: "9:00 AM", hour: 9.0 },
    { time: "09:30", display: "9:30 AM", hour: 9.5 },
    { time: "10:00", display: "10:00 AM", hour: 10.0 },
    { time: "10:30", display: "10:30 AM", hour: 10.5 },
    { time: "11:00", display: "11:00 AM", hour: 11.0 },
    { time: "11:30", display: "11:30 AM", hour: 11.5 },
    { time: "12:00", display: "12:00 PM", hour: 12.0 },
    { time: "13:30", display: "1:30 PM", hour: 13.5 },
    { time: "14:00", display: "2:00 PM", hour: 14.0 },
    { time: "14:30", display: "2:30 PM", hour: 14.5 },
    { time: "15:00", display: "3:00 PM", hour: 15.0 },
    { time: "15:30", display: "3:30 PM", hour: 15.5 },
    { time: "16:00", display: "4:00 PM", hour: 16.0 },
    { time: "16:30", display: "4:30 PM", hour: 16.5 },
    { time: "17:00", display: "5:00 PM", hour: 17.0 },
    { time: "17:30", display: "5:30 PM", hour: 17.5 },
  ], []);

  // ============ HELPER FUNCTIONS ============
  const parseTimeToHour = (time) => {
    const [hour, minute] = time.split(':');
    return parseInt(hour) + parseInt(minute) / 60;
  };

  const isTimeInPast = (time, date) => {
    if (!date) return false;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (date !== todayStr) return false;
    const now = new Date();
    const [hour, minute] = time.split(':');
    const timeDate = new Date();
    timeDate.setHours(parseInt(hour), parseInt(minute), 0, 0);
    return timeDate < now;
  };

  const isTimeSlotBooked = (time) => {
    const timeHour = parseTimeToHour(time);
    return bookedSlots.some(booked => {
      const bookedStart = parseTimeToHour(booked.start);
      const bookedEnd = parseTimeToHour(booked.end);
      return timeHour >= bookedStart && timeHour < bookedEnd;
    });
  };

  const isTimeRangeAvailable = (start, end) => {
    const startHour = parseTimeToHour(start);
    const endHour = parseTimeToHour(end);
    if (startHour < WORK_START || endHour > WORK_END) return false;
    if ((startHour >= LUNCH_START && startHour < LUNCH_END) || (endHour > LUNCH_START && endHour <= LUNCH_END) || (startHour < LUNCH_START && endHour > LUNCH_START)) return false;
    for (const booked of bookedSlots) {
      const bookedStart = parseTimeToHour(booked.start);
      const bookedEnd = parseTimeToHour(booked.end);
      if ((startHour >= bookedStart && startHour < bookedEnd) || (endHour > bookedStart && endHour <= bookedEnd) || (startHour <= bookedStart && endHour >= bookedEnd)) return false;
    }
    return true;
  };

  const calculateDuration = () => {
    if (!startTime || !endTime) return;
    const startHour = parseTimeToHour(startTime);
    const endHour = parseTimeToHour(endTime);
    const durationMinutes = Math.round((endHour - startHour) * 60);
    if (durationMinutes <= 0) setDurationError("End time must be after start time");
    else {
      const selectedServiceData = services.find(s => s.name === selectedService);
      const minDuration = selectedServiceData?.minDuration || 30;
      const maxDuration = selectedServiceData?.maxDuration || 180;
      if (durationMinutes < minDuration) setDurationError(`Minimum duration is ${minDuration} minutes`);
      else if (durationMinutes > maxDuration) setDurationError(`Maximum duration is ${maxDuration} minutes`);
      else if (!isTimeRangeAvailable(startTime, endTime)) setDurationError("This time slot conflicts with existing bookings");
      else setDurationError("");
    }
    setCalculatedDuration(durationMinutes);
  };

  const getAvailableStartTimes = useCallback(() => {
    return timeSlots.filter(slot => {
      const hour = slot.hour;
      if (hour < WORK_START || hour >= WORK_END) return false;
      if (hour >= LUNCH_START && hour < LUNCH_END) return false;
      if (isTimeSlotBooked(slot.time)) return false;
      if (isTimeInPast(slot.time, selectedDate)) return false;
      return true;
    });
  }, [timeSlots, bookedSlots, selectedDate]);

  const getAvailableEndTimes = (start) => {
    if (!start) return [];
    const startHour = parseTimeToHour(start);
    return timeSlots.filter(slot => {
      const endHour = slot.hour;
      if (endHour <= startHour) return false;
      if (!isTimeRangeAvailable(start, slot.time)) return false;
      if (isTimeInPast(slot.time, selectedDate)) return false;
      const duration = Math.round((endHour - startHour) * 60);
      const selectedServiceData = services.find(s => s.name === selectedService);
      const maxDuration = selectedServiceData?.maxDuration || 180;
      return duration <= maxDuration;
    });
  };

  // ============ FETCH FUNCTIONS ============
  const fetchServices = useCallback(async () => {
    setLoadingServices(true);
    try {
      const servicesData = await api.getServices();
      if (servicesData && Array.isArray(servicesData)) setServices(servicesData);
      else setServices([
        { id: 1, name: "Code Review & Best Practices", minDuration: 30, maxDuration: 90 },
        { id: 2, name: "Architecture Design", minDuration: 60, maxDuration: 180 },
        { id: 3, name: "DevOps & CI/CD Setup", minDuration: 45, maxDuration: 120 },
        { id: 4, name: "Debugging & Troubleshooting", minDuration: 30, maxDuration: 60 },
        { id: 5, name: "Tech Interview Prep", minDuration: 45, maxDuration: 90 },
        { id: 6, name: "Database Optimization", minDuration: 30, maxDuration: 60 }
      ]);
    } catch (error) { console.error("Failed to fetch services:", error); }
    finally { setLoadingServices(false); }
  }, []);

  const fetchBookingLimits = async () => {
    try { const limits = await api.getUserBookingLimits(); if (limits) setBookingLimits(limits); } catch (error) { console.error("Failed to fetch booking limits:", error); }
  };

  const fetchUserBookingStats = async () => {
    if (fetchingStats) return;
    setFetchingStats(true);
    try {
      const stats = await api.getUserBookingStats();
      setDailyBookingCount(stats?.todayCount || 0);
      setPendingBookingCount(0);
      setBookingLocked(false);
      setRateLimitError("");
    } catch (error) { console.error("Failed to fetch booking stats", error); setDailyBookingCount(0); setPendingBookingCount(0); setBookingLocked(false); setRateLimitError(""); }
    finally { setFetchingStats(false); }
  };

  const fetchRecentBookings = async () => {
    try { const bookings = await api.getRecentConsultations(); if (bookings && Array.isArray(bookings)) setRecentBookings(bookings.slice(0, 3)); } catch (error) { console.error("Failed to fetch recent bookings:", error); }
  };

  const fetchStaff = async () => {
    try {
      const experts = await api.getExperts();
      let staffData = [];
      if (Array.isArray(experts)) staffData = experts;
      else if (experts && Array.isArray(experts.data)) staffData = experts.data;
      if (staffData.length === 0) {
        staffData = [
          { id: 1, name: "Dr. Sarah Johnson", position: "Senior AI/ML Consultant", department: "AI Research", rating: 4.9, techStack: "Python, TensorFlow" },
          { id: 2, name: "Michael Chen", position: "DevOps Architect", department: "Cloud Infrastructure", rating: 4.8, techStack: "Kubernetes, AWS" },
          { id: 3, name: "Emily Rodriguez", position: "Full Stack Expert", department: "Web Development", rating: 4.9, techStack: "React, Node.js" }
        ];
      }
      const validStaff = staffData.map(s => ({ ...s, id: s.id || Math.random(), rating: s.rating || 4.8, position: s.position || "Tech Expert", department: s.department || "Engineering", techStack: s.techStack || "JavaScript, React" }));
      setStaff(validStaff);
      setFilteredStaff(validStaff);
    } catch (error) { console.error("Failed to fetch experts:", error); setStaff([{ id: 1, name: "Dr. Sarah Johnson", position: "Tech Expert", rating: 4.8, techStack: "JavaScript" }]); setFilteredStaff([{ id: 1, name: "Dr. Sarah Johnson", position: "Tech Expert", rating: 4.8, techStack: "JavaScript" }]); }
  };

  const fetchBookedSlots = async () => {
    if (!selectedStaff?.id || !selectedDate) return;
    setLoadingSlots(true);
    setBookedSlots([]);
    setStartTime("");
    setEndTime("");
    try {
      const systemResponse = await api.post("/appointments/available-slots", { expertId: selectedStaff.id, date: selectedDate });
      let systemSlots = systemResponse?.bookedSlots || [];
      let googleSlots = [];
      try {
        const googleEvents = await api.getGoogleCalendarAvailableSlots(selectedStaff.id, selectedDate);
        if (googleEvents && Array.isArray(googleEvents)) googleSlots = googleEvents;
      } catch (err) { console.log("Google Calendar not available"); }
      const merged = [...systemSlots, ...googleSlots];
      setBookedSlots(merged);
    } catch (error) { console.error("Failed to fetch booked slots:", error); setBookedSlots([]); }
    finally { setLoadingSlots(false); }
  };

  const fetchGoogleCalendarEvents = async () => {
    if (!selectedStaff?.id) return;
    try {
      const events = await api.getGoogleCalendarEvents(selectedStaff.id);
      if (events && Array.isArray(events)) {
        const bookedDateList = events.map(event => format(new Date(event.start), 'yyyy-MM-dd'));
        setBookedDates([...new Set(bookedDateList)]);
      }
    } catch (error) { console.log("Failed to fetch Google Calendar events"); }
  };

  const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) { 
    toast.error("Please select a file"); 
    return; 
  }
  
  // ✅ Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
  const fileType = file.type || file.name?.split('.').pop()?.toLowerCase();
  
  // Check by MIME type or extension
  const isValidType = allowedTypes.includes(file.type) || 
                      ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt'].includes(fileType);
  
  if (!isValidType) { 
    toast.error("Only images, PDF, and text files are allowed"); 
    return; 
  }
  
  // ✅ Validate file size
  if (file.size > 10 * 1024 * 1024) { 
    toast.error("File size must be less than 10MB"); 
    return; 
  }
  
  setUploading(true);
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // ✅ Use the correct API endpoint
    const response = await api.post('/uploads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    if (response.data?.success) {
      const uploadedFile = response.data.data;
      setUploadedFiles(prev => [...prev, uploadedFile]);
      toast.success(`${file.name} uploaded successfully!`);
      event.target.value = '';
    } else {
      toast.error(response.data?.message || 'Upload failed');
    }
  } catch (error) {
    console.error("Upload error:", error);
    const errorMsg = error.response?.data?.message || error.message || "Upload failed. Please try again.";
    toast.error(errorMsg);
  } finally {
    setUploading(false);
  }
};

  const removeFile = (fileId) => { setUploadedFiles(prev => prev.filter(f => f.id !== fileId)); toast.success("File removed"); };

  // ============ HANDLERS ============
  const handleExpertSelect = (expert) => {
    setSelectedStaff(expert);
    fetchGoogleCalendarEvents();
    setTimeout(() => { if (activeStep === 1) setActiveStep(2); }, 300);
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setTimeout(() => { if (activeStep === 2) setActiveStep(3); }, 300);
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setStartTime("");
    setEndTime("");
    setDurationError("");
  };

  const handleStartTimeSelect = (time) => { setStartTime(time); setEndTime(""); setDurationError(""); };
  const handleEndTimeSelect = (time) => { setEndTime(time); };

  const validateStep = () => {
    switch(activeStep) {
      case 1: if (!selectedStaff) { toast.error("Please select an expert"); return false; } break;
      case 2: if (!selectedService) { toast.error("Please select a service"); return false; } break;
      case 3:
        if (!selectedDate) { toast.error("Please select a date"); return false; }
        if (!startTime) { toast.error("Please select start time"); return false; }
        if (!endTime) { toast.error("Please select end time"); return false; }
        if (durationError) { toast.error(durationError); return false; }
        if (!isTimeRangeAvailable(startTime, endTime)) { toast.error("This time slot is no longer available"); fetchBookedSlots(); return false; }
        break;
      case 4:
        if (!forSelf && (!clientName || !clientName.trim())) { toast.error("Please enter the client's name"); return false; }
        break;
    }
    return true;
  };

  const handleNext = () => { if (validateStep() && activeStep < steps.length) setActiveStep(activeStep + 1); };
  const handleBack = () => { if (activeStep > 1) setActiveStep(activeStep - 1); };

  // ============================================
  // ✅ FIXED: HANDLE SUBMIT - Added userName & userEmail
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;
    if (cooldown > 0) {
      toast.error(`Please wait ${cooldown} seconds before booking again`);
      return;
    }
    if (bookingLocked) {
      toast.error(rateLimitError || "You cannot book at this time due to limits");
      return;
    }
    if (dailyBookingCount >= 5) {
      toast.error("You have reached the maximum of 5 consultations per day");
      return;
    }
    
    setIsSubmitting(true);
    setLoading(true);
    try {
      const startDateTime = new Date(`${selectedDate}T${startTime}`);
      const endDateTime = new Date(`${selectedDate}T${endTime}`);
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        throw new Error("Invalid date/time selected");
      }
      
      // ✅ FIX: ALWAYS include userName and userEmail
      const consultationData = {
        expertId: selectedStaff.id,
        serviceName: selectedService,
        datetime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        duration: calculatedDuration,
        notes: notes.trim() || undefined,
        priority: selectedPriority.toLowerCase(),
        
        // ✅ CRITICAL FIX: These MUST be sent to the backend
        userName: user?.name || user?.firstName || clientName || 'User',
        userEmail: user?.email || clientEmail || 'user@example.com',
        
        // Client details
        clientName: forSelf ? (user?.name || user?.firstName || 'User') : clientName.trim(),
        clientEmail: forSelf ? (user?.email || 'user@example.com') : clientEmail,
        clientPhone: forSelf ? (user?.phone || '') : clientPhone,
        fileIds: uploadedFiles.map(f => f.id),
        createCalendarEvent: true
      };

      console.log('📤 Sending booking data:', consultationData);
      
      let response;
      try {
        response = await api.post("/appointments", consultationData);
      } catch (error) {
        if (error.response?.status === 404) {
          console.warn("Backend endpoint /appointments not found – using mock booking");
          response = { data: { bookingCode: `MOCK-${Date.now()}`, calendarEventCreated: false } };
          toast.info("Demo mode: Booking recorded locally (backend missing)", { duration: 4000 });
        } else {
          throw error;
        }
      }
      
      const bookingReference = response.data?.bookingCode || response.data?.code || `BOOK-${Date.now()}`;
      setBookingCode(bookingReference);
      if (response.data?.calendarEventCreated) {
        toast.success("Consultation booked and added to your Google Calendar!");
      } else {
        toast.success("Consultation booked successfully!");
      }
      
      setShowSuccess(true);
      setCooldown(30);
      setDailyBookingCount(prev => prev + 1);
      setTimeout(() => {
        setShowSuccess(false);
        router.push(`/dashboard?booking=success&code=${bookingReference}`);
      }, 3000);
    } catch (error) {
      console.error("Booking error:", error);
      const errorMsg = error.response?.data?.message || error.message || "Failed to book consultation";
      toast.error(errorMsg);
      if (errorMsg.toLowerCase().includes("limit") || errorMsg.toLowerCase().includes("pending")) {
        setBookingLocked(true);
        setRateLimitError(errorMsg);
      }
      await fetchBookedSlots();
      await fetchUserBookingStats();
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const availableStartTimes = getAvailableStartTimes();
  const availableEndTimes = getAvailableEndTimes(startTime);
  const hasReachedLimit = () => {
    if (!bookingLimits) return false;
    const { remaining } = bookingLimits;
    if (!remaining) return false;
    return remaining.daily <= 0 || remaining.weekly <= 0 || remaining.monthly <= 0 || remaining.active <= 0;
  };

  // ============ EFFECTS ============
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning 🌅");
    else if (hour < 18) setGreeting("Good Afternoon ☀️");
    else setGreeting("Good Evening 🌙");
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.push("/login?redirect=/book"); return; }
    if (user?.role !== "user") { router.push(user?.role === "admin" ? "/admin" : "/staff"); return; }
    fetchStaff();
    fetchUserBookingStats();
    fetchBookingLimits();
    fetchRecentBookings();
    fetchServices();
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    setFilteredStaff(staff.filter(s => 
      s.name?.toLowerCase().includes(staffSearch.toLowerCase()) ||
      s.department?.toLowerCase().includes(staffSearch.toLowerCase()) ||
      s.specialization?.toLowerCase().includes(staffSearch.toLowerCase()) ||
      s.techStack?.toLowerCase().includes(staffSearch.toLowerCase())
    ));
  }, [staffSearch, staff]);

  useEffect(() => { if (selectedDate && selectedStaff) fetchBookedSlots(); }, [selectedDate, selectedStaff]);
  useEffect(() => { if (startTime && endTime) calculateDuration(); else if (startTime && !endTime) { setCalculatedDuration(0); setDurationError(""); } }, [startTime, endTime, selectedService, services]);
  useEffect(() => { if (cooldown > 0) { const timer = setTimeout(() => setCooldown(c => c - 1), 1000); return () => clearTimeout(timer); } }, [cooldown]);
  useEffect(() => { setCurrentStepProgress((activeStep / steps.length) * 100); }, [activeStep]);
  useEffect(() => { setStartTime(""); setEndTime(""); setDurationError(""); }, [selectedDate]);

  // ============ LOADING & SUCCESS ============
  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent"></div></div>;
  
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-xl">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="h-10 w-10 text-white" /></div>
          <h2 className="text-2xl font-bold mb-2">Consultation Confirmed! 🎉</h2>
          <p className="text-gray-600 mb-4">Your consultation has been scheduled</p>
          <div className="bg-gray-100 rounded-lg p-3 mb-4"><p className="text-sm text-gray-500">Booking Reference</p><p className="font-mono font-bold text-indigo-600">{bookingCode}</p></div>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  const CurrentStepIcon = steps[activeStep - 1].icon;
  const getIconComponent = (iconName) => {
    const icons = { Code2, Layers, GitBranch, Target, Database, Bug };
    return icons[iconName] || Code2;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-purple-50/20 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-indigo-100 rounded-full px-4 py-1.5 mb-4"><Sparkles className="h-4 w-4 text-indigo-600" /><span className="text-sm font-semibold text-indigo-600">TECH CONSULTATION BOOKING</span></div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-3">Book a <span className="text-indigo-600">Tech Consultation</span></h1>
          <p className="text-slate-500">{greeting}, {user?.firstName || 'Developer'}! Get expert guidance from our tech professionals</p>
        </div>

        {(bookingLocked || cooldown > 0 || hasReachedLimit()) && (
          <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-start gap-3"><div className="p-2 bg-amber-100 rounded-lg"><AlertCircle className="h-5 w-5 text-amber-600" /></div><div className="flex-1"><p className="text-sm font-semibold text-amber-800">Booking Status</p>{bookingLocked && <p className="text-sm text-amber-700">{rateLimitError}</p>}{cooldown > 0 && <p className="text-sm text-amber-700">Please wait {cooldown} seconds before booking another consultation</p>}{hasReachedLimit() && <p className="text-sm text-amber-700">You have reached your booking limit for this period</p>}</div></div>
          </div>
        )}

        <div className="mb-6 bg-white rounded-xl shadow-sm p-4 flex justify-between items-center">
          <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-indigo-500" /><span className="text-sm font-medium">Today's Consultations</span></div>
          <span className={`text-sm font-semibold ${dailyBookingCount >= 5 ? 'text-red-600' : 'text-indigo-600'}`}>{dailyBookingCount} / 5</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl border overflow-hidden">
              <div className="p-5 border-b bg-slate-50">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2"><div className="p-1.5 bg-indigo-100 rounded-lg"><CurrentStepIcon className="h-5 w-5 text-indigo-600" /></div><span className="font-semibold">Step {activeStep} of {steps.length}</span></div>
                  <span className="text-sm text-indigo-600">{Math.round(currentStepProgress)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${currentStepProgress}%` }} /></div>
                <div className="flex justify-between mt-3">
                  {steps.map(step => (
                    <div key={step.number} className="text-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold mx-auto ${activeStep >= step.number ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{activeStep > step.number ? <CheckCircle className="h-4 w-4" /> : step.number}</div>
                      <span className="text-xs text-slate-500 hidden sm:inline">{step.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {activeStep === 1 && (
                  <div className="space-y-4">
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="text" placeholder="Search experts..." value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredStaff.map(expert => (
                        <div key={expert.id} onClick={() => handleExpertSelect(expert)} className={`p-3 rounded-lg border cursor-pointer transition ${selectedStaff?.id === expert.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}>
                          <div className="flex items-center gap-3"><div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold">{expert.name?.charAt(0)}</div><div><div className="flex items-center justify-between"><h4 className="font-semibold">{expert.name}</h4><div className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500 fill-yellow-500" /><span>{expert.rating}</span></div></div><p className="text-sm text-indigo-600">{expert.position}</p><p className="text-xs text-slate-500">{expert.department}</p></div></div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setActiveStep(2)} disabled={!selectedStaff} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-semibold disabled:opacity-50">Continue</button>
                  </div>
                )}

                {activeStep === 2 && (
                  <div className="space-y-4">
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="text" placeholder="Search services..." value={serviceSearch} onChange={(e) => setServiceSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {services.filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase())).map(service => (
                        <button key={service.id} onClick={() => handleServiceSelect(service.name)} className={`w-full p-3 rounded-lg border text-left transition ${selectedService === service.name ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}>
                          <p className="font-semibold text-indigo-600">{service.name}</p>
                          <p className="text-xs text-slate-500">{service.minDuration}-{service.maxDuration} min</p>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-3"><button onClick={() => setActiveStep(1)} className="flex-1 py-2 border rounded-lg">Back</button><button onClick={() => setActiveStep(3)} disabled={!selectedService} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-semibold disabled:opacity-50">Continue</button></div>
                  </div>
                )}

                {activeStep === 3 && (
                  <div className="space-y-5">
                    <div className="p-3 bg-indigo-50 rounded-lg text-center"><p className="text-sm text-indigo-600">{selectedStaff?.name} • {selectedService}</p></div>
                    
                    <FullCalendar selectedDate={selectedDate} onDateSelect={handleDateSelect} bookedDates={bookedDates} />
                    
                    {selectedDate && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Select Start Time</label>
                        {loadingSlots ? <div className="text-center py-8"><Loader className="h-6 w-6 animate-spin mx-auto" /></div> : (
                          <TimePicker timeSlots={availableStartTimes} selectedTime={startTime} onTimeSelect={handleStartTimeSelect} bookedSlots={bookedSlots} selectedDate={selectedDate} />
                        )}
                      </div>
                    )}
                    
                    {startTime && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Select End Time</label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {availableEndTimes.map(slot => {
                            const isSelected = endTime === slot.time;
                            return (
                              <button key={slot.time} onClick={() => handleEndTimeSelect(slot.time)} className={`py-2 rounded-lg border text-sm font-medium transition ${isSelected ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50'}`}>
                                {slot.display}
                              </button>
                            );
                          })}
                          {availableEndTimes.length === 0 && <p className="col-span-4 text-center text-slate-500 py-4">No available end times</p>}
                        </div>
                      </div>
                    )}
                    
                    {startTime && endTime && (
                      <div className={`p-3 rounded-lg ${durationError ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                        <div className="flex justify-between"><div><p className="text-xs">Duration</p><p className="text-lg font-bold">{calculatedDuration} min</p></div><div><p className="text-xs">Time Slot</p><p className="font-semibold">{startTime} - {endTime}</p></div></div>
                        {durationError && <p className="text-sm text-red-600 mt-1">{durationError}</p>}
                      </div>
                    )}
                    
                    <div className="flex gap-3"><button onClick={() => setActiveStep(2)} className="flex-1 py-2 border rounded-lg">Back</button><button onClick={() => setActiveStep(4)} disabled={!startTime || !endTime || !!durationError} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-semibold disabled:opacity-50">Continue</button></div>
                  </div>
                )}

                {activeStep === 4 && (
                  <div className="space-y-4">
                    <div className="flex gap-3"><button onClick={() => setForSelf(true)} className={`flex-1 py-2 rounded-lg border ${forSelf ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200'}`}>For Myself</button><button onClick={() => setForSelf(false)} className={`flex-1 py-2 rounded-lg border ${!forSelf ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200'}`}>For Someone Else</button></div>
                    {!forSelf && <input type="text" placeholder="Full Name *" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full p-2 border rounded-lg" />}
                    <textarea placeholder="Additional Notes (Optional)" value={notes} onChange={e => setNotes(e.target.value)} rows="3" className="w-full p-2 border rounded-lg resize-none" />
                    <div className="border-2 border-dashed rounded-lg p-4 text-center"><input type="file" id="file" className="hidden" onChange={handleFileUpload} disabled={uploading} /><label htmlFor="file" className="cursor-pointer block">{uploading ? <Loader className="h-5 w-5 animate-spin mx-auto" /> : <Upload className="h-5 w-5 mx-auto text-indigo-600" />}<p className="text-sm text-slate-500 mt-1">{uploading ? "Uploading..." : "Click to upload files"}</p></label></div>
                    {uploadedFiles.map((f, idx) => <div key={f.id || idx} className="flex justify-between items-center bg-slate-50 p-2 rounded"><span className="text-sm">{f.name}</span><button onClick={() => removeFile(f.id)} className="text-red-500"><X className="h-4 w-4" /></button></div>)}
                    <div className="flex gap-3"><button onClick={() => setActiveStep(3)} className="flex-1 py-2 border rounded-lg">Back</button><button onClick={() => setActiveStep(5)} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-semibold">Continue</button></div>
                  </div>
                )}

                {activeStep === 5 && (
                  <div className="space-y-4">
                    {priorityOptions.map(p => (
                      <button key={p.value} onClick={() => setSelectedPriority(p.value)} className={`w-full p-3 rounded-lg border text-left transition ${selectedPriority === p.value ? `border-${p.color}-500 bg-${p.color}-50` : 'border-slate-200'}`}>
                        <p className={`font-semibold text-${p.color}-600`}>{p.label}</p>
                        <p className="text-xs text-slate-500">Response within {p.estimatedTime}</p>
                      </button>
                    ))}
                    <div className="flex gap-3"><button onClick={() => setActiveStep(4)} className="flex-1 py-2 border rounded-lg">Back</button><button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-semibold disabled:opacity-50">{isSubmitting ? <Loader className="h-4 w-4 animate-spin mx-auto" /> : "Confirm Booking"}</button></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-lg p-5 sticky top-24">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Calendar className="h-4 w-4 text-indigo-600" /> Booking Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Expert</span><span className="font-medium">{selectedStaff?.name || "—"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Service</span><span className="font-medium">{selectedService || "—"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Date</span><span className="font-medium">{selectedDate ? format(new Date(selectedDate), 'MMM dd') : "—"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Time</span><span className="font-medium text-indigo-600">{startTime || "—"} {endTime && `- ${endTime}`}</span></div>
                {calculatedDuration > 0 && <div className="flex justify-between"><span className="text-slate-500">Duration</span><span className="font-medium">{calculatedDuration} min</span></div>}
                <div className="flex justify-between"><span className="text-slate-500">Priority</span><span className="font-medium">{selectedPriority}</span></div>
                <div className="border-t pt-2 mt-2"><div className="flex justify-between"><span className="font-bold">Total</span><span className="font-bold text-indigo-600">Free</span></div></div>
              </div>
            </div>
            
            <GoogleCalendarSync userId={user?.id} selectedDate={selectedDate} selectedStaff={selectedStaff} onSlotsUpdated={fetchBookedSlots} onSyncComplete={() => { if (selectedDate && selectedStaff) { fetchBookedSlots(); fetchGoogleCalendarEvents(); } }} />
            
            <div className="bg-indigo-50 rounded-2xl p-4"><h4 className="font-semibold mb-2">Business Hours</h4><ul className="text-sm space-y-1"><li className="flex justify-between"><span>Mon-Fri</span><span>9:00 AM - 6:00 PM</span></li><li className="flex justify-between"><span>Lunch</span><span>12:30 PM - 1:30 PM</span></li><li className="flex justify-between text-red-500"><span>Sat-Sun</span><span>Closed</span></li></ul></div>
          </div>
        </div>
      </div>
    </div>
  );
}