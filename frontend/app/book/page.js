"use client"

import { useState, useEffect, useContext, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AppContext } from '../providers'
import api from '../lib/api'
import { 
  Calendar, Search, Check, Loader, Clock, AlertCircle, User, 
  Building2, CalendarIcon, ChevronRight, Bell, Sparkles, 
  Heart, Star, Shield, Zap, ArrowRight, Info, 
  Briefcase, Mail, Phone, MapPin, Smile
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function BookPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useContext(AppContext)
  const [greeting, setGreeting] = useState('')
  
  const [formData, setFormData] = useState({
    serviceName: '',
    providerName: '',
    date: '',
    time: '',
    age: '',
    gender: '',
    company: '',
    priority: 'Normal',
    forSelf: true,
    patientName: '',
    notes: '',
  })
  
  const [loading, setLoading] = useState(false)
  const [allStaff, setAllStaff] = useState([])
  const [staffSearch, setStaffSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [selectedStaffObj, setSelectedStaffObj] = useState(null)
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [searchingStaff, setSearchingStaff] = useState(false)
  const [availableSlots, setAvailableSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedTime, setSelectedTime] = useState('')
  const [currentStep, setCurrentStep] = useState(1)

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting("Good Morning")
    else if (hour < 18) setGreeting("Good Afternoon")
    else setGreeting("Good Evening")
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.push('/login?redirect=/book')
      return
    }
    if (user?.role !== 'user') {
      router.push(user?.role === 'admin' ? '/admin' : '/staff')
      return
    }
    fetchStaff()
  }, [authLoading, isAuthenticated, user, router])

  const fetchStaff = async () => {
    try {
      setLoadingStaff(true)
      const response = await api.get('/users/staff')
      const staffData = Array.isArray(response.data) ? response.data : response.data?.data || []
      setAllStaff(staffData)
      if (staffData.length === 0) {
        toast.error('No staff members available. Please contact administrator.')
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error)
      toast.error('Failed to load staff list')
    } finally {
      setLoadingStaff(false)
    }
  }

  useEffect(() => {
    if (!formData.providerName) {
      setSelectedStaffObj(null)
      return
    }
    const matchingStaff = allStaff.find((staff) => staff.name === formData.providerName)
    if (matchingStaff) setSelectedStaffObj(matchingStaff)
  }, [allStaff, formData.providerName])

  const searchStaff = async (query) => {
    if (!query.trim()) {
      setSearchResults([])
      setSearchingStaff(false)
      return
    }
    try {
      setSearchingStaff(true)
      const response = await api.get('/users/staff/search', { params: { q: query, limit: 10 } })
      const results = Array.isArray(response.data) ? response.data : response.data?.data || []
      setSearchResults(results)
    } catch (error) {
      const filtered = allStaff.filter(staff => 
        staff.name?.toLowerCase().includes(query.toLowerCase()) ||
        staff.department?.toLowerCase().includes(query.toLowerCase()) ||
        staff.specialization?.toLowerCase().includes(query.toLowerCase())
      )
      setSearchResults(filtered.slice(0, 10))
    } finally {
      setSearchingStaff(false)
    }
  }

  useEffect(() => {
    if (!showSearch) {
      setSearchResults([])
      return
    }
    const timeoutId = setTimeout(() => {
      if (staffSearch.trim()) searchStaff(staffSearch)
      else setSearchResults([])
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [staffSearch, showSearch])

  useEffect(() => {
    if (formData.providerName && formData.date) {
      checkAvailability(formData.providerName, formData.date)
    } else {
      setAvailableSlots([])
    }
  }, [formData.providerName, formData.date])

  const checkAvailability = async (providerName, date) => {
    try {
      setLoadingSlots(true)
      const response = await api.get('/appointments/availability', { params: { providerName, date } })
      const bookedSlots = response.data?.bookedSlots || []
      
      const slots = []
      for (let hour = 9; hour <= 17; hour++) {
        for (let minute of [0, 30]) {
          if (hour === 17 && minute === 30) continue
          const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          const isBooked = bookedSlots.includes(timeStr)
          slots.push({
            time: timeStr,
            available: !isBooked,
            display: new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
          })
        }
      }
      setAvailableSlots(slots)
      if (slots.filter(s => s.available).length === 0) {
        toast.error('No available slots on this date')
      }
    } catch (error) {
      console.error('Failed to check availability:', error)
      toast.error('Failed to check availability')
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleSelectStaff = (staff) => {
    setFormData(prev => ({ ...prev, providerName: staff?.name || '', time: '' }))
    setSelectedStaffObj(staff || null)
    setStaffSearch('')
    setSearchResults([])
    setShowSearch(false)
    setAvailableSlots([])
    setSelectedTime('')
    setCurrentStep(2)
    toast.success(`Selected: ${staff.name}`)
  }

  const handleSelectTime = (time) => {
    setFormData(prev => ({ ...prev, time }))
    setSelectedTime(time)
    setCurrentStep(3)
  }

  // Fixed isFormValid function
  const isFormValid = () => {
    const serviceValid = formData.serviceName && formData.serviceName !== ''
    const providerValid = formData.providerName && formData.providerName !== ''
    const dateValid = formData.date && formData.date !== ''
    const timeValid = formData.time && formData.time !== ''
    const patientValid = formData.forSelf || (formData.patientName && formData.patientName.trim() !== '')
    
    return serviceValid && providerValid && dateValid && timeValid && patientValid
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('=== SUBMIT BUTTON CLICKED ===')
    console.log('Form Data:', formData)
    
    // Validate form with detailed checks
    if (!formData.serviceName || formData.serviceName === '') { 
      toast.error('Please select a service type')
      return
    }
    if (!formData.providerName || formData.providerName === '') { 
      toast.error('Please select a staff member')
      return
    }
    if (!formData.date || formData.date === '') { 
      toast.error('Please select a date')
      return
    }
    if (!formData.time || formData.time === '') { 
      toast.error('Please select a time')
      return
    }
    if (!formData.forSelf && (!formData.patientName || formData.patientName.trim() === '')) { 
      toast.error('Please enter the patient name')
      return
    }

    setLoading(true)
    
    try {
      const selectedDate = new Date(formData.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedDate < today) { 
        toast.error('Please select a future date')
        setLoading(false)
        return
      }

      const appointmentData = {
        serviceName: formData.serviceName,
        providerName: formData.providerName,
        datetime: `${formData.date}T${formData.time}:00`,
        age: formData.age ? Number(formData.age) : undefined,
        gender: formData.gender || undefined,
        company: formData.company?.trim() || user?.company || undefined,
        priority: formData.priority,
        forSelf: formData.forSelf,
        patientName: formData.forSelf ? undefined : formData.patientName?.trim(),
        notes: formData.notes?.trim() || undefined,
      }

      console.log('Sending appointment data:', appointmentData)
      const response = await api.post('/appointments', appointmentData)
      console.log('Response:', response.data)
      
      toast.success(
        <div>
          <p className="font-bold">🎉 Appointment Booked Successfully!</p>
          <p className="text-sm mt-1">Your request has been sent to {formData.providerName}</p>
          <p className="text-xs mt-1">You will be notified when approved</p>
        </div>,
        { duration: 5000 }
      )
      
      router.push('/appointments')
    } catch (error) {
      console.error('Booking error:', error)
      console.error('Error response:', error.response?.data)
      const errorMessage = error.response?.data?.message
      if (errorMessage?.includes('already booked')) {
        toast.error('⏰ This time slot is already taken. Please select another time.')
        checkAvailability(formData.providerName, formData.date)
      } else {
        toast.error(errorMessage || 'Failed to book appointment. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <p className="text-slate-600 font-medium">Loading booking system...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  const suggestedStaff = staffSearch.trim() ? searchResults : allStaff.slice(0, 8)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-indigo-100 rounded-full px-4 py-2 mb-4">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-600">Book Your Appointment</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-3">
            Schedule a <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Meeting</span>
          </h1>
          <p className="text-slate-600 text-lg">{greeting}, {user?.name?.split(' ')[0]}! Let's get you scheduled</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  currentStep >= step 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  {currentStep > step ? <Check className="h-5 w-5" /> : step}
                </div>
                {step < 3 && (
                  <div className={`w-16 h-0.5 mx-2 ${currentStep > step ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-100">
          {/* Service Type */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-indigo-600" />
              Service Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.serviceName}
              onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition"
              required
            >
              <option value="">Select a service</option>
              <option value="General Consultation">🏥 General Consultation</option>
              <option value="Specialist Appointment">👨‍⚕️ Specialist Appointment</option>
              <option value="Health Checkup">🩺 Health Checkup</option>
              <option value="Follow-up Visit">📋 Follow-up Visit</option>
              <option value="Vaccination">💉 Vaccination</option>
            </select>
          </div>

          {/* Staff Selection */}
          <div className="relative mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-600" />
              Select Staff <span className="text-rose-500">*</span>
            </label>
            
            {!showSearch ? (
              <div className="flex gap-3">
                <select
                  value={formData.providerName}
                  onChange={(e) => {
                    const selected = allStaff.find(s => s.name === e.target.value)
                    if (selected) handleSelectStaff(selected)
                  }}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition"
                  required
                >
                  <option value="">Choose a staff member</option>
                  {loadingStaff ? <option disabled>Loading staff...</option> : allStaff.map(staff => (
                    <option key={staff.id} value={staff.name}>
                      {staff.name} {staff.department ? `• ${staff.department}` : ''}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => setShowSearch(true)} className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  <span className="hidden sm:inline">Search</span>
                </button>
              </div>
            ) : (
              <div>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input 
                      type="text" 
                      value={staffSearch} 
                      onChange={(e) => setStaffSearch(e.target.value)}
                      placeholder="Search by name, department, or specialization..." 
                      className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition" 
                      autoFocus 
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => { setShowSearch(false); setStaffSearch(''); setSearchResults([]); }} 
                    className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                </div>
                {(searchingStaff || suggestedStaff.length > 0) && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                    {searchingStaff ? (
                      <div className="flex items-center justify-center gap-2 px-4 py-6">
                        <Loader className="h-5 w-5 animate-spin text-indigo-600" />
                        <span className="text-slate-500">Searching staff...</span>
                      </div>
                    ) : suggestedStaff.map(staff => (
                      <button
                        key={staff.id}
                        type="button"
                        className="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b last:border-0 flex items-center gap-3 transition group"
                        onClick={() => handleSelectStaff(staff)}
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:scale-110 transition">
                          {staff.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">{staff.name}</p>
                          <div className="flex gap-2 text-xs text-slate-500">
                            {staff.department && <span>{staff.department}</span>}
                            {staff.specialization && <span>• {staff.specialization}</span>}
                          </div>
                        </div>
                        <Check className="h-5 w-5 text-emerald-500 opacity-0 group-hover:opacity-100 transition" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedStaffObj && !showSearch && formData.providerName && (
              <div className="mt-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow">
                    {selectedStaffObj.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-semibold text-indigo-800">{selectedStaffObj.name}</span>
                    {selectedStaffObj.department && (
                      <span className="text-xs text-slate-500 ml-2">({selectedStaffObj.department})</span>
                    )}
                  </div>
                </div>
                <Check className="h-5 w-5 text-emerald-500" />
              </div>
            )}
          </div>

          {/* Date & Time Selection */}
          {selectedStaffObj && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-600" />
                Date & Time <span className="text-rose-500">*</span>
              </label>
              <div className="grid md:grid-cols-2 gap-4">
                <input 
                  type="date" 
                  value={formData.date} 
                  onChange={(e) => { 
                    setFormData(prev => ({ ...prev, date: e.target.value, time: '' }))
                    setAvailableSlots([])
                    setSelectedTime('')
                  }}
                  min={new Date().toISOString().split('T')[0]} 
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition" 
                  required 
                />
                <div>
                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-3 border border-slate-200 rounded-xl bg-slate-50">
                      <Loader className="h-5 w-5 animate-spin text-indigo-600" />
                      <span className="ml-2 text-sm text-slate-600">Checking availability...</span>
                    </div>
                  ) : formData.date ? (
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
                      {availableSlots.length > 0 ? (
                        availableSlots.map((slot) => (
                          <button
                            key={slot.time}
                            type="button"
                            onClick={() => {
                              if (slot.available) {
                                handleSelectTime(slot.time)
                                console.log('Time selected:', slot.time)
                              }
                            }}
                            disabled={!slot.available}
                            className={`px-2 py-2 text-sm rounded-lg transition-all ${
                              formData.time === slot.time
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                                : slot.available
                                ? 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer'
                                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed line-through'
                            }`}
                          >
                            {slot.display}
                          </button>
                        ))
                      ) : (
                        <div className="col-span-3 text-center py-4 text-sm text-slate-500">
                          No available slots
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-3 text-sm text-slate-500 border border-slate-200 rounded-xl bg-slate-50">
                      Select a date first
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Personal Information */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-600" />
                Age
              </label>
              <input 
                type="number" 
                value={formData.age} 
                onChange={(e) => setFormData({ ...formData, age: e.target.value })} 
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition" 
                placeholder="Your age" 
                min="0" 
                max="150" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Smile className="h-4 w-4 text-indigo-600" />
                Gender
              </label>
              <select 
                value={formData.gender} 
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })} 
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition"
              >
                <option value="">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-600" />
              Company/Organization
            </label>
            <input 
              type="text" 
              value={formData.company} 
              onChange={(e) => setFormData({ ...formData, company: e.target.value })} 
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition" 
              placeholder={user?.company || "Your company name"} 
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-indigo-600" />
              Priority Level
            </label>
            <select 
              value={formData.priority} 
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })} 
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition"
            >
              <option value="Normal">🟢 Normal</option>
              <option value="High">🟠 High</option>
              <option value="Urgent">🔴 Urgent</option>
            </select>
          </div>

          <div className="flex items-center gap-3 mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <input 
              type="checkbox" 
              id="forSelf" 
              checked={formData.forSelf} 
              onChange={(e) => setFormData({ ...formData, forSelf: e.target.checked })} 
              className="h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500" 
            />
            <label htmlFor="forSelf" className="text-sm text-slate-700 font-medium">This appointment is for myself</label>
          </div>

          {!formData.forSelf && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-600" />
                Patient Name <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                value={formData.patientName} 
                onChange={(e) => setFormData({ ...formData, patientName: e.target.value })} 
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition" 
                placeholder="Enter name of person" 
                required 
              />
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Info className="h-4 w-4 text-indigo-600" />
              Additional Notes
            </label>
            <textarea 
              value={formData.notes} 
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
              rows="3" 
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition" 
              placeholder="Any special requirements or information..." 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || !isFormValid()}
            className={`w-full py-4 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-lg ${
              loading || !isFormValid()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
            }`}
          >
            {loading ? (
              <><Loader className="h-5 w-5 animate-spin" /> Booking Appointment...</>
            ) : (
              <><Calendar className="h-5 w-5" /> Book Appointment</>
            )}
          </button>

          {/* Debug Info - Remove in production */}
          <div className="mt-4 p-3 bg-gray-100 rounded-xl text-xs text-gray-500 hidden">
            <p>Debug: Service: {formData.serviceName || '❌'} | Staff: {formData.providerName || '❌'} | Date: {formData.date || '❌'} | Time: {formData.time || '❌'} | Valid: {isFormValid() ? '✅' : '❌'}</p>
          </div>

          {/* Info Banner */}
          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-emerald-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-700">Your appointment is secure</p>
                <p className="text-xs text-slate-500 mt-1">You will receive a confirmation once your appointment is approved by the staff member.</p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}