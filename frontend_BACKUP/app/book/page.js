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
  ChevronLeft, ArrowRight, Sparkle, BadgeCheck, Google
} from "lucide-react";
import toast from "react-hot-toast";
import { format, addDays, isWeekend, differenceInMinutes } from "date-fns";

// Google Calendar Sync Component
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
      const response = await api.get("/google-calendar/status");
      setIsConnected(response.connected);
      setCalendarEmail(response.email);
    } catch (error) {
      console.error("Failed to fetch calendar status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await api.get("/google-calendar/auth-url");
      const authUrl = response.url;
      
      const popup = window.open(
        authUrl,
        "Connect Google Calendar",
        "width=600,height=700,left=200,top=100"
      );
      
      const handleMessage = async (event) => {
        if (event.data.type === "google-calendar-connected") {
          popup?.close();
          window.removeEventListener("message", handleMessage);
          await fetchStatus();
          toast.success("Google Calendar connected successfully!");
          onSyncComplete?.();
          if (selectedDate && selectedStaff) {
            onSlotsUpdated?.();
          }
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
      await api.post("/google-calendar/sync");
      toast.success("Calendar synced successfully");
      onSyncComplete?.();
      if (selectedDate && selectedStaff) {
        onSlotsUpdated?.();
      }
    } catch (error) {
      toast.error("Failed to sync calendar");
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
            <Google className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Google Calendar Sync</h3>
            <p className="text-xs text-gray-500">Sync appointments with your calendar</p>
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
            
            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {syncing ? <Loader className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync Now
            </button>
            
            <div className="p-2 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Your appointments will automatically sync to Google Calendar
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <Google className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Connect to Google Calendar to:</p>
              <ul className="text-xs text-gray-500 mt-2 space-y-1">
                <li>✓ Auto-add appointments to your calendar</li>
                <li>✓ Get reminders before appointments</li>
                <li>✓ Avoid double-booking conflicts</li>
                <li>✓ Access schedule anywhere</li>
              </ul>
            </div>
            
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              {connecting ? <Loader className="h-4 w-4 animate-spin" /> : <Google className="h-4 w-4" />}
              Connect Google Calendar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function BookAppointmentPage() {
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
  const [showStaffDetails, setShowStaffDetails] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [popularServices, setPopularServices] = useState([]);
  const [showCalendarSync, setShowCalendarSync] = useState(false);

  // ============ CONSTANTS ============
  const WORK_START = 8.5;
  const WORK_END = 17.5;
  const LUNCH_START = 12.5;
  const LUNCH_END = 13.5;

  const steps = [
    { number: 1, name: "Select Staff", icon: Users, description: "Choose your preferred professional" },
    { number: 2, name: "Choose Service", icon: Briefcase, description: "Select the service you need" },
    { number: 3, name: "Pick Schedule", icon: Calendar, description: "Select date and time" },
    { number: 4, name: "Client Info", icon: User, description: "Tell us about the patient" },
    { number: 5, name: "Set Priority", icon: Flag, description: "Choose response speed" }
  ];

  const priorityOptions = [
    { value: "Normal", label: "Standard Priority", description: "Best for non-urgent consultations", icon: Circle, color: "blue", bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200", estimatedTime: "24 hours", badge: "Standard", price: 0 },
    { value: "High", label: "High Priority", description: "Get faster response and earlier slots", icon: Flag, color: "orange", bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200", estimatedTime: "12 hours", badge: "Recommended", price: 0 },
    { value: "Urgent", label: "Urgent Priority", description: "Immediate attention required", icon: AlertCircle, color: "red", bg: "bg-red-50", text: "text-red-600", border: "border-red-200", estimatedTime: "4 hours", badge: "Emergency", price: 0 }
  ];

  const services = [
    { id: 1, name: "General Consultation", icon: "🏥", bg: "bg-blue-50", text: "text-blue-600", description: "Standard medical consultation for general health concerns", minDuration: 15, maxDuration: 60, popularity: 95 },
    { id: 2, name: "Specialist Appointment", icon: "👨‍⚕️", bg: "bg-emerald-50", text: "text-emerald-600", description: "Consultation with specialized doctors", minDuration: 30, maxDuration: 120, popularity: 88 },
    { id: 3, name: "Health Checkup", icon: "🩺", bg: "bg-purple-50", text: "text-purple-600", description: "Complete health examination and screening", minDuration: 45, maxDuration: 180, popularity: 92 },
    { id: 4, name: "Follow-up Visit", icon: "📋", bg: "bg-amber-50", text: "text-amber-600", description: "Follow-up consultation for ongoing treatment", minDuration: 15, maxDuration: 45, popularity: 85 },
    { id: 5, name: "Vaccination", icon: "💉", bg: "bg-rose-50", text: "text-rose-600", description: "Vaccination and immunization services", minDuration: 10, maxDuration: 30, popularity: 78 }
  ];

  const timeSlots = useMemo(() => [
    { time: "08:30", display: "8:30 AM", hour: 8.5 },
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
  ], []);

  // ============ EFFECTS ============
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning 🌅");
    else if (hour < 18) setGreeting("Good Afternoon ☀️");
    else setGreeting("Good Evening 🌙");
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/login?redirect=/book");
      return;
    }
    if (user?.role !== "user") {
      router.push(user?.role === "admin" ? "/admin" : "/staff");
      return;
    }
    fetchStaff();
    fetchUserBookingStats();
    fetchBookingLimits();
    fetchRecentBookings();
    generateAvailableDates();
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    const filtered = staff.filter(s => 
      s.name?.toLowerCase().includes(staffSearch.toLowerCase()) ||
      s.department?.toLowerCase().includes(staffSearch.toLowerCase()) ||
      s.specialization?.toLowerCase().includes(staffSearch.toLowerCase())
    );
    setFilteredStaff(filtered);
  }, [staffSearch, staff]);

  useEffect(() => {
    if (selectedDate && selectedStaff) {
      fetchBookedSlots();
    }
  }, [selectedDate, selectedStaff]);

  useEffect(() => {
    if (startTime && endTime) {
      calculateDuration();
    }
  }, [startTime, endTime]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    setCurrentStepProgress((activeStep / steps.length) * 100);
  }, [activeStep]);

  // ============ API FUNCTIONS ============
  const generateAvailableDates = () => {
    const dates = [];
    let date = new Date();
    for (let i = 1; i <= 14; i++) {
      const nextDate = addDays(date, i);
      if (!isWeekend(nextDate)) {
        dates.push(format(nextDate, 'yyyy-MM-dd'));
      }
    }
    setAvailableDates(dates);
  };

  const fetchBookingLimits = async () => {
    try {
      const response = await api.get("/appointments/my-limits");
      if (response?.success && response?.data) {
        setBookingLimits(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch booking limits:", error);
    }
  };

  const fetchUserBookingStats = async () => {
    if (fetchingStats) return;
    setFetchingStats(true);
    
    try {
      const statsRes = await api.get("/appointments/user-stats");
      const appointmentsRes = await api.get("/appointments/my");
      let appointments = [];
      if (Array.isArray(appointmentsRes)) {
        appointments = appointmentsRes;
      } else if (appointmentsRes && Array.isArray(appointmentsRes.data)) {
        appointments = appointmentsRes.data;
      }
      
      const now = new Date();
      const futurePendingApps = appointments.filter(app => {
        return app.status === "pending" && new Date(app.datetime) > now;
      });
      
      const realPendingCount = futurePendingApps.length;
      setDailyBookingCount(statsRes?.todayCount || 0);
      setPendingBookingCount(realPendingCount);
      
      const todayCount = statsRes?.todayCount || 0;
      if (todayCount >= 3) {
        setBookingLocked(true);
        setRateLimitError("You have reached the maximum of 3 appointments per day.");
      } else if (realPendingCount >= 2) {
        setBookingLocked(true);
        setRateLimitError(`You have ${realPendingCount} pending appointment(s). Please wait for them to be processed.`);
      } else {
        setBookingLocked(false);
        setRateLimitError("");
      }
    } catch (error) {
      console.error("Failed to fetch booking stats", error);
      setBookingLocked(false);
      setRateLimitError("");
    } finally {
      setFetchingStats(false);
    }
  };

  const fetchRecentBookings = async () => {
    try {
      const response = await api.get("/appointments/my/recent");
      if (response?.data && Array.isArray(response.data)) {
        setRecentBookings(response.data.slice(0, 3));
      }
    } catch (error) {
      console.error("Failed to fetch recent bookings:", error);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await api.get("/users/staff");
      let staffData = [];
      if (Array.isArray(response)) {
        staffData = response;
      } else if (response && Array.isArray(response.data)) {
        staffData = response.data;
      }
      
      const validStaff = staffData.filter(s => s && s.name && s.name !== "N/A").map(s => ({
        ...s,
        rating: s.rating || 4.5,
        reviews: s.reviews || Math.floor(30 + Math.random() * 100),
        experience: s.experience || Math.floor(3 + Math.random() * 10),
        position: s.position || s.specialization || "Medical Professional",
        department: s.department || "General Medicine",
        availability: Math.floor(70 + Math.random() * 25),
        calendarConnected: s.googleCalendarConnected || false
      }));
      
      setStaff(validStaff);
      setFilteredStaff(validStaff);
    } catch (error) {
      console.error("Failed to fetch staff:", error);
      setStaff([]);
      setFilteredStaff([]);
      toast.error("Unable to load staff list. Please refresh the page.");
    }
  };

  const fetchBookedSlots = async () => {
    if (!selectedStaff?.id) return;
    
    setLoadingSlots(true);
    setBookedSlots([]);
    setStartTime("");
    setEndTime("");
    
    try {
      // First try to get slots from Google Calendar if connected
      let calendarSlots = [];
      try {
        const calendarResponse = await api.get(`/google-calendar/available-slots`, {
          params: {
            staffId: selectedStaff.id,
            date: selectedDate
          }
        });
        if (calendarResponse && calendarResponse.length) {
          calendarSlots = calendarResponse;
        }
      } catch (error) {
        console.log("Google Calendar not available, using system slots");
      }
      
      // Get system booked slots
      const response = await api.post("/appointments/available-slots", {
        staffId: selectedStaff.id,
        date: selectedDate,
      });
      
      let systemSlots = [];
      if (response && response.bookedSlots && Array.isArray(response.bookedSlots)) {
        systemSlots = response.bookedSlots;
      } else if (response && response.data && response.data.bookedSlots && Array.isArray(response.data.bookedSlots)) {
        systemSlots = response.data.bookedSlots;
      }
      
      // Merge both sources
      const allBookedSlots = [...systemSlots, ...calendarSlots];
      setBookedSlots(allBookedSlots);
    } catch (error) {
      console.error("Failed to fetch booked slots:", error);
      toast.error("Could not check availability. Please try again.");
    } finally {
      setLoadingSlots(false);
    }
  };

  // ============ HELPER FUNCTIONS ============
  const parseTimeToHour = (time) => {
    const [hour, minute] = time.split(':');
    return parseInt(hour) + parseInt(minute) / 60;
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
    if ((startHour >= LUNCH_START && startHour < LUNCH_END) || 
        (endHour > LUNCH_START && endHour <= LUNCH_END) ||
        (startHour < LUNCH_START && endHour > LUNCH_START)) return false;
    
    for (const booked of bookedSlots) {
      const bookedStart = parseTimeToHour(booked.start);
      const bookedEnd = parseTimeToHour(booked.end);
      
      if ((startHour >= bookedStart && startHour < bookedEnd) ||
          (endHour > bookedStart && endHour <= bookedEnd) ||
          (startHour <= bookedStart && endHour >= bookedEnd)) {
        return false;
      }
    }
    return true;
  };

  const calculateDuration = () => {
    if (!startTime || !endTime) return;
    
    const startHour = parseTimeToHour(startTime);
    const endHour = parseTimeToHour(endTime);
    const durationMinutes = Math.round((endHour - startHour) * 60);
    
    if (durationMinutes <= 0) {
      setDurationError("End time must be after start time");
      setCalculatedDuration(0);
      return;
    }
    
    const selectedServiceData = services.find(s => s.name === selectedService);
    const minDuration = selectedServiceData?.minDuration || 15;
    const maxDuration = selectedServiceData?.maxDuration || 180;
    
    if (durationMinutes < minDuration) {
      setDurationError(`Minimum duration is ${minDuration} minutes`);
    } else if (durationMinutes > maxDuration) {
      setDurationError(`Maximum duration is ${maxDuration} minutes`);
    } else if (!isTimeRangeAvailable(startTime, endTime)) {
      setDurationError("This time slot conflicts with existing bookings");
    } else {
      setDurationError("");
    }
    
    setCalculatedDuration(durationMinutes);
  };

  const getAvailableStartTimes = () => {
    return timeSlots.filter(slot => {
      const hour = slot.hour;
      if (hour < WORK_START || hour >= WORK_END) return false;
      if (hour >= LUNCH_START && hour < LUNCH_END) return false;
      if (isTimeSlotBooked(slot.time)) return false;
      return true;
    });
  };

  const getAvailableEndTimes = (start) => {
    if (!start) return [];
    const startHour = parseTimeToHour(start);
    return timeSlots.filter(slot => {
      const endHour = slot.hour;
      if (endHour <= startHour) return false;
      if (!isTimeRangeAvailable(start, slot.time)) return false;
      
      const duration = Math.round((endHour - startHour) * 60);
      const selectedServiceData = services.find(s => s.name === selectedService);
      const maxDuration = selectedServiceData?.maxDuration || 180;
      return duration <= maxDuration;
    });
  };

  const getMinDate = () => {
    let date = addDays(new Date(), 1);
    while (isWeekend(date)) {
      date = addDays(date, 1);
    }
    return format(date, 'yyyy-MM-dd');
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      toast.error("Please select a file");
      return;
    }
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only images and PDF files are allowed");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post("/uploads", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      let uploadedFile = response?.data || response;
      
      if (uploadedFile) {
        setUploadedFiles(prev => [...prev, uploadedFile]);
        toast.success(`${file.name} uploaded successfully!`);
        event.target.value = '';
      } else {
        throw new Error('Upload failed - no data returned');
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    toast.success("File removed");
  };

  const validateStep = () => {
    switch(activeStep) {
      case 1:
        if (!selectedStaff) {
          toast.error("Please select a staff member");
          return false;
        }
        break;
      case 2:
        if (!selectedService) {
          toast.error("Please select a service");
          return false;
        }
        break;
      case 3:
        if (!selectedDate) {
          toast.error("Please select a date");
          return false;
        }
        if (!startTime) {
          toast.error("Please select start time");
          return false;
        }
        if (!endTime) {
          toast.error("Please select end time");
          return false;
        }
        if (durationError) {
          toast.error(durationError);
          return false;
        }
        if (!isTimeRangeAvailable(startTime, endTime)) {
          toast.error("This time slot is no longer available");
          fetchBookedSlots();
          return false;
        }
        break;
      case 4:
        if (!forSelf && (!clientName || !clientName.trim())) {
          toast.error("Please enter the client's name");
          return false;
        }
        if (!forSelf && !clientAge) {
          toast.error("Please enter the client's age");
          return false;
        }
        if (!forSelf && !clientGender) {
          toast.error("Please select the client's gender");
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (activeStep < steps.length) {
        setActiveStep(activeStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    }
  };

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
    
    if (dailyBookingCount >= 3) {
      toast.error("You have reached the maximum of 3 appointments per day");
      return;
    }
    
    if (pendingBookingCount >= 2) {
      toast.error(`You already have ${pendingBookingCount} pending appointment(s). Please wait for them to be processed.`);
      return;
    }
    
    setLoading(true);
    
    const startDateTime = new Date(`${selectedDate}T${startTime}`);
    const endDateTime = new Date(`${selectedDate}T${endTime}`);
    
    const appointmentData = {
      serviceName: selectedService,
      providerName: selectedStaff.name,
      providerId: selectedStaff.id,
      datetime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      duration: calculatedDuration,
      notes: notes.trim() || undefined,
      priority: selectedPriority.toLowerCase(),
      forSelf: forSelf,
      patientName: forSelf ? undefined : clientName.trim(),
      age: forSelf ? user?.age : clientAge,
      gender: forSelf ? user?.gender : clientGender,
      email: forSelf ? user?.email : clientEmail,
      phone: forSelf ? user?.phone : clientPhone,
      fileIds: uploadedFiles.map(f => f.id),
      createCalendarEvent: true // Request calendar event creation
    };
    
    try {
      const response = await api.post("/appointments", appointmentData);
      setBookingCode(response.data.bookingCode);
      
      // Show calendar event creation status
      if (response.data.calendarEventCreated) {
        toast.success("Appointment booked and added to your Google Calendar!");
      } else {
        toast.success("Appointment booked successfully!");
      }
      
      setShowSuccess(true);
      
      setCooldown(30);
      setDailyBookingCount(prev => prev + 1);
      
      setTimeout(() => {
        setShowSuccess(false);
        router.push("/appointments");
      }, 3000);
      
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to book appointment";
      toast.error(errorMsg);
      
      if (errorMsg.toLowerCase().includes("limit") || 
          errorMsg.toLowerCase().includes("pending")) {
        setBookingLocked(true);
        setRateLimitError(errorMsg);
      }
      
      fetchBookedSlots();
      fetchUserBookingStats();
    } finally {
      setLoading(false);
    }
  };

  const availableStartTimes = getAvailableStartTimes();
  const availableEndTimes = getAvailableEndTimes(startTime);
  const morningSlots = availableStartTimes.filter(s => s.hour < 12);
  const afternoonSlots = availableStartTimes.filter(s => s.hour > 13);
  const hasReachedLimit = () => {
    if (!bookingLimits) return false;
    const { remaining } = bookingLimits;
    if (!remaining) return false;
    return remaining.daily <= 0 || remaining.weekly <= 0 || remaining.monthly <= 0 || remaining.active <= 0;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-500">Loading SmartOffice...</p>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center animate-fade-in-up">
          <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed! 🎉</h2>
          <p className="text-gray-600 mb-4">
            {forSelf ? "Your appointment" : `Appointment for ${clientName}`} has been scheduled.
          </p>
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-600 mb-1">Booking Reference</p>
            <p className="text-2xl font-mono font-bold text-indigo-600 tracking-wider">{bookingCode}</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-4">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(selectedDate), 'MMM dd, yyyy')}</span>
            <Clock className="h-4 w-4 ml-2" />
            <span>{startTime} - {endTime} ({calculatedDuration} min)</span>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-center gap-2 text-sm text-blue-700">
              <Google className="h-4 w-4" />
              <span>Added to your Google Calendar</span>
            </div>
          </div>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          <div className="mt-4 w-full bg-gray-200 rounded-full h-1 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-1 animate-progress"></div>
          </div>
        </div>
      </div>
    );
  }

  // Get current step component
  const CurrentStepIcon = steps[activeStep - 1].icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-purple-50/20 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ============ HEADER SECTION ============ */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full px-4 py-1.5 mb-4 shadow-lg">
            <Sparkles className="h-4 w-4 text-white animate-pulse" />
            <span className="text-sm font-semibold text-white">SMART APPOINTMENT BOOKING</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-3">
            Schedule Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Appointment</span>
          </h1>
          <p className="text-slate-500 max-w-md mx-auto">
            {greeting}, {user?.firstName || user?.name?.split(' ')[0] || 'Valued Patient'}! Let's get you scheduled with our expert team
          </p>
        </div>

        {/* ============ WARNING BANNERS ============ */}
        {(bookingLocked || cooldown > 0 || hasReachedLimit()) && (
          <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">Booking Status</p>
                {bookingLocked && <p className="text-sm text-amber-700">{rateLimitError}</p>}
                {cooldown > 0 && <p className="text-sm text-amber-700">Please wait {cooldown} seconds before booking another appointment</p>}
                {hasReachedLimit() && <p className="text-sm text-amber-700">You have reached your booking limit for this period</p>}
              </div>
            </div>
          </div>
        )}

        {/* ============ BOOKING LIMITS BANNER ============ */}
        {bookingLimits && bookingLimits.limits && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-800">Your Booking Limits</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                  <div>
                    <p className="text-xs text-blue-700">Today</p>
                    <p className="text-lg font-bold text-blue-800">
                      {bookingLimits.remaining?.daily === Infinity ? '∞' : (bookingLimits.remaining?.daily || 0)}
                      <span className="text-xs font-normal">/ {bookingLimits.limits?.daily === Infinity ? '∞' : bookingLimits.limits?.daily}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700">This Week</p>
                    <p className="text-lg font-bold text-blue-800">
                      {bookingLimits.remaining?.weekly === Infinity ? '∞' : (bookingLimits.remaining?.weekly || 0)}
                      <span className="text-xs font-normal">/ {bookingLimits.limits?.weekly === Infinity ? '∞' : bookingLimits.limits?.weekly}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700">This Month</p>
                    <p className="text-lg font-bold text-blue-800">
                      {bookingLimits.remaining?.monthly === Infinity ? '∞' : (bookingLimits.remaining?.monthly || 0)}
                      <span className="text-xs font-normal">/ {bookingLimits.limits?.monthly === Infinity ? '∞' : bookingLimits.limits?.monthly}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700">Active</p>
                    <p className="text-lg font-bold text-blue-800">
                      {bookingLimits.remaining?.active === Infinity ? '∞' : (bookingLimits.remaining?.active || 0)}
                      <span className="text-xs font-normal">/ {bookingLimits.limits?.active === Infinity ? '∞' : bookingLimits.limits?.active}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ DAILY LIMIT INDICATOR ============ */}
        <div className="mb-6 bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-medium text-gray-700">Today's Bookings</span>
            </div>
            <span className={`text-sm font-semibold ${dailyBookingCount >= 3 ? 'text-red-600' : 'text-indigo-600'}`}>
              {dailyBookingCount} / 3
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`rounded-full h-2 transition-all duration-300 ${dailyBookingCount >= 3 ? 'bg-red-500' : 'bg-indigo-600'}`}
              style={{ width: `${(dailyBookingCount / 3) * 100}%` }}
            />
          </div>
          {pendingBookingCount > 0 && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <Clock className="h-3 w-3" /> You have {pendingBookingCount} pending appointment(s) awaiting approval.
            </p>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* ============ MAIN FORM SECTION ============ */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
              
              {/* ============ STEP INDICATORS ============ */}
              <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-xl">
                      <CurrentStepIcon className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Step {activeStep} of {steps.length}</h2>
                      <p className="text-sm text-slate-500">{steps[activeStep - 1].description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-indigo-600">{Math.round(currentStepProgress)}%</span>
                    <p className="text-xs text-slate-400">completed</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full h-2 transition-all duration-500"
                    style={{ width: `${currentStepProgress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-4">
                  {steps.map((step, index) => (
                    <button
                      key={step.number}
                      onClick={() => {
                        if (index + 1 <= activeStep) {
                          setActiveStep(step.number);
                        }
                      }}
                      className={`flex flex-col items-center transition-all ${index + 1 <= activeStep ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                        index + 1 === activeStep ? 'bg-indigo-600 text-white shadow-md' :
                        index + 1 < activeStep ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {index + 1 < activeStep ? <CheckCircle className="h-4 w-4" /> : step.number}
                      </div>
                      <span className="text-xs text-slate-500 mt-1 hidden sm:block">{step.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                
                {/* ============ STEP 1: STAFF SELECTION ============ */}
                {activeStep === 1 && (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by name, department, or specialization..."
                        value={staffSearch}
                        onChange={(e) => setStaffSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                      />
                    </div>
                    
                    {staff.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No staff members available</p>
                      </div>
                    ) : filteredStaff.length === 0 ? (
                      <div className="text-center py-12">
                        <Search className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No staff match your search</p>
                        <button onClick={() => setStaffSearch("")} className="mt-2 text-indigo-600 text-sm hover:text-indigo-700">
                          Clear search
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto pr-2">
                        {filteredStaff.map((staffMember) => (
                          <div
                            key={staffMember.id}
                            onClick={() => { setSelectedStaff(staffMember); handleNext(); }}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                              selectedStaff?.id === staffMember.id
                                ? "border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-md"
                                : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50 hover:shadow-sm"
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-md">
                                {staffMember.name?.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <h4 className="font-semibold text-slate-800">{staffMember.name}</h4>
                                  <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                    <span className="text-sm font-medium">{staffMember.rating}</span>
                                    <span className="text-xs text-slate-400">({staffMember.reviews})</span>
                                  </div>
                                </div>
                                <p className="text-sm text-indigo-600">{staffMember.position}</p>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{staffMember.department}</span>
                                  <span className="text-xs text-slate-500">{staffMember.experience}+ years exp</span>
                                  <span className="text-xs text-green-600">{staffMember.availability}% available</span>
                                  {staffMember.calendarConnected && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                                      <Google className="h-3 w-3" /> Calendar Connected
                                    </span>
                                  )}
                                </div>
                              </div>
                              {selectedStaff?.id === staffMember.id && (
                                <CheckCircle className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ============ STEP 2: SERVICE SELECTION ============ */}
                {activeStep === 2 && (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search services..." 
                        value={serviceSearch} 
                        onChange={(e) => setServiceSearch(e.target.value)} 
                        className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50" 
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                      {services.filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase())).map((service) => (
                        <button 
                          key={service.id} 
                          type="button" 
                          onClick={() => { setSelectedService(service.name); handleNext(); }} 
                          className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${service.bg} ${
                            selectedService === service.name ? "ring-2 ring-indigo-500 shadow-md" : "hover:shadow-md hover:-translate-y-0.5"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-3xl">{service.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className={`font-semibold ${service.text}`}>{service.name}</p>
                                <div className="flex items-center gap-0.5">
                                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                  <span className="text-xs">{service.popularity}%</span>
                                </div>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">{service.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Clock className="h-3 w-3 text-slate-400" />
                                <span className="text-xs text-slate-500">{service.minDuration}-{service.maxDuration} min</span>
                                <div className="h-1 w-1 bg-slate-300 rounded-full"></div>
                                <span className="text-xs text-green-600">✓ Available</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ============ STEP 3: SCHEDULE SELECTION ============ */}
                {activeStep === 3 && (
                  <div className="space-y-5">
                    <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs text-slate-500">Selected Staff</p>
                          <p className="font-semibold">{selectedStaff?.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Service</p>
                          <p className="font-semibold">{selectedService}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-indigo-500" />
                        Select Date <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {availableDates.slice(0, 10).map((date) => (
                          <button
                            key={date}
                            onClick={() => setSelectedDate(date)}
                            className={`p-2 rounded-lg border text-center transition-all ${
                              selectedDate === date
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                                : "border-slate-200 hover:border-indigo-400 hover:bg-indigo-50"
                            }`}
                          >
                            <div className="text-xs font-medium">{format(new Date(date), 'EEE')}</div>
                            <div className="text-sm font-bold">{format(new Date(date), 'dd')}</div>
                            <div className="text-xs">{format(new Date(date), 'MMM')}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {selectedDate && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                          <Clock4 className="h-4 w-4 text-indigo-500" />
                          Select Time Slot <span className="text-rose-500">*</span>
                        </label>
                        {loadingSlots ? (
                          <div className="text-center py-8">
                            <Loader className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
                            <p className="text-sm text-slate-500 mt-2">Checking availability from system and Google Calendar...</p>
                          </div>
                        ) : (
                          <>
                            {morningSlots.length > 0 && (
                              <div className="mb-4">
                                <p className="text-xs font-medium text-amber-600 mb-2 flex items-center gap-1">
                                  <Sunrise className="h-3 w-3" /> Morning Slots
                                </p>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                  {morningSlots.map((slot) => {
                                    const isBooked = isTimeSlotBooked(slot.time);
                                    return (
                                      <button
                                        key={slot.time}
                                        type="button"
                                        onClick={() => {
                                          if (!isBooked && !bookingLocked && cooldown === 0 && !hasReachedLimit()) {
                                            setStartTime(slot.time);
                                            setEndTime("");
                                            setDurationError("");
                                          } else if (hasReachedLimit()) {
                                            toast.error("You have reached your booking limit");
                                          } else if (bookingLocked) {
                                            toast.error(rateLimitError);
                                          } else if (cooldown > 0) {
                                            toast.error(`Please wait ${cooldown} seconds`);
                                          }
                                        }}
                                        disabled={isBooked || bookingLocked || cooldown > 0 || hasReachedLimit()}
                                        className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                                          startTime === slot.time 
                                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-md" 
                                            : isBooked || bookingLocked || cooldown > 0 || hasReachedLimit()
                                              ? "border-red-200 bg-red-50 text-red-400 cursor-not-allowed line-through" 
                                              : "border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer"
                                        }`}
                                      >
                                        {slot.display}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {afternoonSlots.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-orange-600 mb-2 flex items-center gap-1">
                                  <Sun className="h-3 w-3" /> Afternoon Slots
                                </p>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                  {afternoonSlots.map((slot) => {
                                    const isBooked = isTimeSlotBooked(slot.time);
                                    return (
                                      <button
                                        key={slot.time}
                                        type="button"
                                        onClick={() => {
                                          if (!isBooked && !bookingLocked && cooldown === 0 && !hasReachedLimit()) {
                                            setStartTime(slot.time);
                                            setEndTime("");
                                            setDurationError("");
                                          }
                                        }}
                                        disabled={isBooked || bookingLocked || cooldown > 0 || hasReachedLimit()}
                                        className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                                          startTime === slot.time 
                                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-md" 
                                            : isBooked || bookingLocked || cooldown > 0 || hasReachedLimit()
                                              ? "border-red-200 bg-red-50 text-red-400 cursor-not-allowed line-through" 
                                              : "border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer"
                                        }`}
                                      >
                                        {slot.display}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {availableStartTimes.length === 0 && (
                              <div className="text-center py-8 text-slate-500">
                                <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                                <p>No available time slots for this date</p>
                                <p className="text-xs mt-1">Please select another date</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    
                    {startTime && !loadingSlots && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                          <Clock4 className="h-4 w-4 text-indigo-500" />
                          Select End Time <span className="text-rose-500">*</span>
                        </label>
                        {availableEndTimes.length === 0 ? (
                          <div className="p-4 bg-amber-50 rounded-lg text-amber-700 text-sm flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            No available end times for this start time
                            <button onClick={() => setStartTime("")} className="text-indigo-600 underline ml-2">Choose different start time</button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {availableEndTimes.map((slot) => (
                              <button
                                key={slot.time}
                                type="button"
                                onClick={() => setEndTime(slot.time)}
                                className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                                  endTime === slot.time 
                                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-md" 
                                    : "border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer"
                                }`}
                              >
                                {slot.display}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {startTime && endTime && calculatedDuration > 0 && (
                      <div className={`p-3 rounded-lg border ${durationError ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500">Duration</p>
                            <p className={`font-semibold ${durationError ? "text-red-600" : "text-emerald-700"}`}>
                              {calculatedDuration} minutes
                              {calculatedDuration >= 60 && ` (${Math.floor(calculatedDuration/60)}h ${calculatedDuration%60}m)`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Time Slot</p>
                            <p className="font-semibold">{startTime} - {endTime}</p>
                          </div>
                        </div>
                        {durationError && (
                          <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {durationError}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Info className="h-3 w-3" /> Business hours: 8:30 AM - 5:30 PM | Lunch break: 12:30 PM - 1:30 PM
                    </p>
                  </div>
                )}

                {/* ============ STEP 4: CLIENT INFORMATION ============ */}
                {activeStep === 4 && (
                  <div className="space-y-5">
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full px-3 py-1 mb-3">
                        <User className="h-3 w-3 text-white" />
                        <span className="text-xs font-semibold text-white">PATIENT INFORMATION</span>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800">Who is this appointment for?</h3>
                      <p className="text-sm text-slate-500 mt-1">Select whether you're booking for yourself or someone else</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <button 
                        type="button" 
                        onClick={() => setForSelf(true)} 
                        className={`p-4 rounded-xl border-2 text-center transition-all ${forSelf ? "border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-md" : "border-slate-200 hover:border-slate-300"}`}
                      >
                        <UserCheck className={`h-6 w-6 mx-auto mb-2 ${forSelf ? "text-indigo-600" : "text-slate-400"}`} />
                        <p className={`font-semibold ${forSelf ? "text-indigo-700" : "text-slate-600"}`}>For Myself</p>
                        <p className="text-xs text-slate-400 mt-1">Book for yourself</p>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setForSelf(false)} 
                        className={`p-4 rounded-xl border-2 text-center transition-all ${!forSelf ? "border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-md" : "border-slate-200 hover:border-slate-300"}`}
                      >
                        <UserPlus className={`h-6 w-6 mx-auto mb-2 ${!forSelf ? "text-indigo-600" : "text-slate-400"}`} />
                        <p className={`font-semibold ${!forSelf ? "text-indigo-700" : "text-slate-600"}`}>For Someone Else</p>
                        <p className="text-xs text-slate-400 mt-1">Family member, friend, or colleague</p>
                      </button>
                    </div>
                    
                    {forSelf ? (
                      <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-md">
                            <User className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{user?.firstName || user?.name}</p>
                            <p className="text-xs text-slate-500">{user?.email}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          {user?.age && (
                            <div>
                              <p className="text-xs text-slate-500">Age</p>
                              <p className="font-medium">{user.age} years</p>
                            </div>
                          )}
                          {user?.gender && (
                            <div>
                              <p className="text-xs text-slate-500">Gender</p>
                              <p className="font-medium">{user.gender}</p>
                            </div>
                          )}
                          {user?.phone && (
                            <div>
                              <p className="text-xs text-slate-500">Phone</p>
                              <p className="font-medium">{user.phone}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                            <User className="h-4 w-4 text-indigo-500" />
                            Full Name <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            value={clientName} 
                            onChange={(e) => setClientName(e.target.value)} 
                            placeholder="Enter patient's full name" 
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50" 
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-indigo-500" />
                              Age <span className="text-rose-500">*</span>
                            </label>
                            <input 
                              type="number" 
                              value={clientAge} 
                              onChange={(e) => setClientAge(e.target.value)} 
                              placeholder="Age" 
                              min="0" 
                              max="150" 
                              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50" 
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                              <Smile className="h-4 w-4 text-indigo-500" />
                              Gender <span className="text-rose-500">*</span>
                            </label>
                            <select 
                              value={clientGender} 
                              onChange={(e) => setClientGender(e.target.value)} 
                              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                            >
                              <option value="">Select Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                              <Mail className="h-4 w-4 text-indigo-500" />
                              Email (Optional)
                            </label>
                            <input 
                              type="email" 
                              value={clientEmail} 
                              onChange={(e) => setClientEmail(e.target.value)} 
                              placeholder="patient@example.com" 
                              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50" 
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                              <Phone className="h-4 w-4 text-indigo-500" />
                              Phone (Optional)
                            </label>
                            <input 
                              type="tel" 
                              value={clientPhone} 
                              onChange={(e) => setClientPhone(e.target.value)} 
                              placeholder="+251 XXX XXX XXX" 
                              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50" 
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="pt-4">
                      <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-indigo-500" />
                        Additional Notes (Optional)
                      </label>
                      <textarea 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)} 
                        rows="3" 
                        placeholder="Add any special requirements or additional information..." 
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 resize-none" 
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                        <Upload className="h-4 w-4 text-indigo-500" />
                        Upload Medical Documents (Optional)
                      </label>
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-indigo-300 transition bg-slate-50">
                        <input 
                          type="file" 
                          id="file-upload" 
                          className="hidden" 
                          accept="image/jpeg,image/png,image/gif,application/pdf" 
                          onChange={handleFileUpload} 
                          disabled={uploading} 
                        />
                        <label htmlFor="file-upload" className="cursor-pointer block">
                          <div className="flex flex-col items-center gap-2">
                            <div className="p-3 bg-indigo-100 rounded-full">
                              {uploading ? <Loader className="h-5 w-5 animate-spin text-indigo-600" /> : <Upload className="h-5 w-5 text-indigo-600" />}
                            </div>
                            <p className="text-sm text-slate-500">{uploading ? "Uploading..." : "Click to upload or drag and drop"}</p>
                            <p className="text-xs text-slate-400">PDF, JPG, PNG (Max 5MB)</p>
                          </div>
                        </label>
                      </div>
                      {uploadedFiles.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {uploadedFiles.map((file) => (
                            <div key={file.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                              <span className="text-sm text-slate-600 truncate">{file.originalName}</span>
                              <button onClick={() => removeFile(file.id)} className="text-red-500 hover:text-red-700">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ============ STEP 5: PRIORITY SELECTION ============ */}
                {activeStep === 5 && (
                  <div className="space-y-5">
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full px-3 py-1 mb-3">
                        <Flag className="h-3 w-3 text-white" />
                        <span className="text-xs font-semibold text-white">PRIORITY LEVEL</span>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800">Choose Appointment Priority</h3>
                      <p className="text-sm text-slate-500 mt-1">Higher priority means faster response time</p>
                    </div>
                    
                    <div className="space-y-3">
                      {priorityOptions.map((priority) => {
                        const PriorityIcon = priority.icon;
                        return (
                          <button
                            key={priority.value}
                            onClick={() => setSelectedPriority(priority.value)}
                            className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                              selectedPriority === priority.value 
                                ? `${priority.bg} border-${priority.color}-500 shadow-md transform scale-[1.01]` 
                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              <div className={`p-2 rounded-lg ${priority.bg} ${priority.text}`}>
                                <PriorityIcon className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <h4 className={`font-semibold ${priority.text}`}>{priority.label}</h4>
                                    {priority.badge === "Recommended" && (
                                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <ThumbsUp className="h-3 w-3" /> Recommended
                                      </span>
                                    )}
                                    {priority.badge === "Emergency" && (
                                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full animate-pulse">
                                        Emergency
                                      </span>
                                    )}
                                  </div>
                                  {selectedPriority === priority.value && <CheckCircle className="h-5 w-5 text-indigo-600" />}
                                </div>
                                <p className="text-sm text-slate-500 mt-1">{priority.description}</p>
                                <div className="flex items-center gap-3 mt-2">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-slate-400" />
                                    <span className="text-xs text-slate-500">Est. response: {priority.estimatedTime}</span>
                                  </div>
                                  <div className="h-1 w-1 bg-slate-300 rounded-full"></div>
                                  <div className="flex items-center gap-1">
                                    <Zap className="h-3 w-3 text-slate-400" />
                                    <span className="text-xs text-slate-500">Free of charge</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-800">Priority Information</p>
                          <p className="text-xs text-blue-600 mt-1">Normal: Standard processing (24h) • High: Fast-tracked (12h) • Urgent: Immediate attention (4h)</p>
                          <p className="text-xs text-blue-500 mt-2">All priority levels are provided at no additional cost.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ============ NAVIGATION BUTTONS ============ */}
                <div className="flex justify-between gap-3 pt-6 mt-4 border-t border-slate-100">
                  {activeStep > 1 && (
                    <button 
                      onClick={handleBack} 
                      className="px-6 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 font-medium"
                    >
                      <ChevronLeft className="h-4 w-4" /> Back
                    </button>
                  )}
                  <div className="flex-1"></div>
                  {activeStep < steps.length ? (
                    <button 
                      onClick={handleNext} 
                      className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      Continue <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button 
                      onClick={handleSubmit} 
                      disabled={loading || bookingLocked || cooldown > 0 || hasReachedLimit()} 
                      className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading ? <Loader className="h-5 w-5 animate-spin" /> : <Rocket className="h-5 w-5" />}
                      {loading ? "Booking..." : cooldown > 0 ? `Wait ${cooldown}s` : bookingLocked ? "Limit Reached" : hasReachedLimit() ? "Limit Reached" : "Confirm Booking"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ============ RIGHT SIDEBAR ============ */}
          <div className="space-y-6">
            {/* Booking Summary */}
            <div className="bg-white rounded-2xl shadow-xl border overflow-hidden sticky top-24">
              <div className="p-5 bg-gradient-to-r from-indigo-600 to-purple-600">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5" /> Booking Summary
                </h3>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500 text-sm">Selected Staff</span>
                  <span className="font-medium text-sm">{selectedStaff?.name || "—"}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500 text-sm">Service</span>
                  <span className="font-medium text-sm">{selectedService || "—"}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500 text-sm">Date</span>
                  <span className="font-medium text-sm">{selectedDate ? format(new Date(selectedDate), 'MMM dd, yyyy') : "—"}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500 text-sm">Time</span>
                  <span className="font-medium text-sm text-indigo-600">{startTime || "—"} {endTime && `- ${endTime}`}</span>
                </div>
                {calculatedDuration > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-500 text-sm">Duration</span>
                    <span className="font-medium text-sm">{calculatedDuration} minutes</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500 text-sm">Patient</span>
                  <span className="font-medium text-sm">{forSelf ? (user?.firstName || user?.name) : (clientName || "—")}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500 text-sm">Priority</span>
                  {selectedPriority && (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      selectedPriority === "Urgent" ? "bg-red-100 text-red-700" : 
                      selectedPriority === "High" ? "bg-orange-100 text-orange-700" : 
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {selectedPriority}
                    </span>
                  )}
                </div>
                <div className="border-t pt-3 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Total Cost</span>
                    <span className="font-bold text-indigo-600">Free</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">No payment required at booking</p>
                </div>
              </div>
            </div>
            
            {/* Google Calendar Sync */}
            <GoogleCalendarSync 
              userId={user?.id} 
              selectedDate={selectedDate}
              selectedStaff={selectedStaff}
              onSlotsUpdated={fetchBookedSlots}
              onSyncComplete={() => {
                if (selectedDate && selectedStaff) {
                  fetchBookedSlots();
                }
              }}
            />
            
            {/* Business Hours */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-5 border">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" /> Business Hours
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-slate-600">Monday - Friday</span>
                  <span className="font-medium text-indigo-600">8:30 AM - 5:30 PM</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-600">Lunch Break</span>
                  <span className="text-amber-600">12:30 PM - 1:30 PM</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-600">Saturday - Sunday</span>
                  <span className="text-red-500">Closed</span>
                </li>
              </ul>
            </div>
            
            {/* Amenities */}
            <div className="bg-white rounded-2xl p-5 border">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" /> Our Amenities
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2"><Wifi className="h-4 w-4 text-green-500" /> Free WiFi</div>
                <div className="flex items-center gap-2"><Monitor className="h-4 w-4 text-green-500" /> Digital Check-in</div>
                <div className="flex items-center gap-2"><Coffee className="h-4 w-4 text-green-500" /> Refreshments</div>
                <div className="flex items-center gap-2"><Printer className="h-4 w-4 text-green-500" /> Printing Services</div>
                <div className="flex items-center gap-2"><Video className="h-4 w-4 text-green-500" /> Telemedicine</div>
                <div className="flex items-center gap-2"><Heart className="h-4 w-4 text-green-500" /> Emergency Care</div>
              </div>
            </div>
            
            {/* Recent Bookings */}
            {recentBookings.length > 0 && (
              <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-5 border">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <History className="h-5 w-5 text-indigo-600" /> Your Recent Appointments
                </h4>
                <div className="space-y-2">
                  {recentBookings.map((booking, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm p-2 bg-white rounded-lg">
                      <div>
                        <p className="font-medium text-slate-700">{booking.serviceName}</p>
                        <p className="text-xs text-slate-500">{format(new Date(booking.datetime), 'MMM dd, h:mm a')}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        booking.status === 'approved' ? 'bg-green-100 text-green-700' : 
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => router.push('/appointments')}
                  className="mt-3 text-center w-full text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  View All →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-progress { 
          animation: progress 3s ease-out forwards; 
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}