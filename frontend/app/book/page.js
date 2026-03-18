"use client"

import { useState, useEffect, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { AppContext } from '../providers'
import api from '../lib/api'
import { Calendar, Clock, User, Briefcase, AlertCircle, Search, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export default function BookPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useContext(AppContext)
  
  const [formData, setFormData] = useState({
    serviceName: '',
    providerName: '',
    datetime: '',
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

  // Fetch all staff from database
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await api.get('/users/staff')
        setAllStaff(response.data)
      } catch (error) {
        console.error('Failed to fetch staff:', error)
        toast.error('Failed to load staff list')
      }
    }
    if (isAuthenticated) {
      fetchStaff()
    }
  }, [isAuthenticated])

  // Search staff in real-time from database
  useEffect(() => {
    if (!staffSearch.trim() || !showSearch) {
      setSearchResults([])
      return
    }

    const results = allStaff.filter(staff => 
      staff.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
      (staff.department && staff.department.toLowerCase().includes(staffSearch.toLowerCase()))
    ).slice(0, 5)
    
    setSearchResults(results)
  }, [staffSearch, allStaff, showSearch])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/book')
      return
    }
    if (user?.role !== 'user') {
      router.push('/dashboard')
      return
    }
  }, [isAuthenticated, user])

  const handleSelectStaff = (staff) => {
    setFormData({ ...formData, providerName: staff.name })
    setSelectedStaffObj(staff)
    setStaffSearch('')
    setShowSearch(false)
    toast.success(`Selected: ${staff.name}`)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Validate required fields
      if (!formData.serviceName || !formData.providerName || !formData.datetime) {
        toast.error('Please fill in all required fields')
        setLoading(false)
        return
      }

      if (!formData.forSelf && !formData.patientName.trim()) {
        toast.error('Please enter the patient name')
        setLoading(false)
        return
      }

      const selectedDate = new Date(formData.datetime)
      const now = new Date()
      if (selectedDate <= now) {
        toast.error('Please select a future date and time')
        setLoading(false)
        return
      }

      const oneYearFromNow = new Date()
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
      if (selectedDate > oneYearFromNow) {
        toast.error('Please select a date within the next year')
        setLoading(false)
        return
      }

      const appointmentData = {
        serviceName: formData.serviceName,
        providerName: formData.providerName,
        datetime: formData.datetime,
        age: formData.age ? String(formData.age) : undefined,
        gender: formData.gender || undefined,
        company: formData.company || user?.company || undefined,
        priority: formData.priority,
        forSelf: formData.forSelf,
        notes: formData.forSelf 
          ? (formData.notes || undefined) 
          : `For: ${formData.patientName}${formData.notes ? `\n${formData.notes}` : ''}`,
      }

      await api.post('/appointments', appointmentData)
      toast.success('Appointment booked successfully!')
      router.push('/appointments')
    } catch (error) {
      console.error('Booking error:', error)
      toast.error(error.response?.data?.message || 'Failed to book appointment')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Book Appointment</h1>
        
        <form onSubmit={handleSubmit} className="card space-y-6">
          {/* Row 1: Service Type and Staff Selection */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Service Type - Left Side */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.serviceName}
                onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                className="input-field"
                required
              >
                <option value="">Select service</option>
                <option value="General Consultation">General Consultation</option>
                <option value="Specialist Appointment">Specialist Appointment</option>
                <option value="Health Checkup">Health Checkup</option>
                <option value="Follow-up Visit">Follow-up Visit</option>
                <option value="Vaccination">Vaccination</option>
                <option value="Lab Test">Lab Test</option>
              </select>
            </div>

            {/* Staff Selection with Search - Right Side */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Staff <span className="text-red-500">*</span>
              </label>
              
              {!showSearch ? (
                /* Normal Dropdown Mode - Using Database Staff */
                <div className="flex gap-2">
                  <select
                    value={formData.providerName}
                    onChange={(e) => {
                      setFormData({ ...formData, providerName: e.target.value })
                      const selected = allStaff.find(s => s.name === e.target.value)
                      setSelectedStaffObj(selected)
                    }}
                    className="input-field flex-1"
                    required
                  >
                    <option value="">Choose staff</option>
                    {allStaff.map(staff => (
                      <option key={staff.id} value={staff.name}>
                        {staff.name} {staff.department ? `- ${staff.department}` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowSearch(true)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-1"
                    title="Search all staff"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                /* Search Mode - Search Database Staff */
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={staffSearch}
                        onChange={(e) => setStaffSearch(e.target.value)}
                        placeholder="Search by name or department..."
                        className="input-field pl-9 pr-8"
                        autoFocus
                      />
                      {staffSearch && (
                        <button
                          type="button"
                          onClick={() => setStaffSearch('')}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSearch(false)
                        setStaffSearch('')
                      }}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition whitespace-nowrap"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Search Results Dropdown - From Database */}
                  {staffSearch && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {searchResults.map(staff => (
                        <button
                          key={staff.id}
                          type="button"
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-0 flex items-center gap-3"
                          onClick={() => handleSelectStaff(staff)}
                        >
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {staff.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{staff.name}</p>
                            <p className="text-xs text-gray-500">{staff.department || 'General'}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {staffSearch && searchResults.length === 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-4 text-center text-gray-500">
                      <Search className="h-5 w-5 mx-auto mb-1 text-gray-300" />
                      <p className="text-sm">No staff found</p>
                      <p className="text-xs">Try a different search term</p>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Staff Display (when selected from dropdown) */}
              {selectedStaffObj && !showSearch && formData.providerName && (
                <div className="mt-2 p-2 bg-blue-50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {selectedStaffObj.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-blue-700">{selectedStaffObj.name}</span>
                    {selectedStaffObj.department && (
                      <span className="text-xs text-gray-500">({selectedStaffObj.department})</span>
                    )}
                  </div>
                  <Check className="h-4 w-4 text-green-600" />
                </div>
              )}
            </div>
          </div>

          {/* Rest of your form remains exactly the same */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.datetime}
              onChange={(e) => setFormData({ ...formData, datetime: e.target.value })}
              className="input-field"
              required
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age
              </label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="input-field"
                placeholder="30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="input-field"
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company/Organization
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="input-field"
              placeholder={user?.company || "Your company name"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="input-field"
            >
              <option value="Normal">Normal</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.forSelf}
              onChange={(e) => setFormData({ ...formData, forSelf: e.target.checked })}
              className="h-4 w-4 text-primary-600 rounded border-gray-300"
            />
            <label className="text-sm text-gray-700">This appointment is for myself</label>
          </div>

          {!formData.forSelf && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient Name *
              </label>
              <input
                type="text"
                value={formData.patientName}
                onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                className="input-field"
                placeholder="Enter name of person"
                required={!formData.forSelf}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows="3"
              className="input-field"
              placeholder="Any special requirements or information..."
            />
          </div>

          <button
            type="submit"
            disabled={loading || !formData.serviceName || !formData.providerName || !formData.datetime || (!formData.forSelf && !formData.patientName.trim())}
            className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Booking...
              </div>
            ) : (
              'Book Appointment'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}