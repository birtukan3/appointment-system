"use client"

import { useState, useEffect, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { AppContext } from '../providers'
import api from '../lib/api'
import { User, Mail, Building2, Phone, Save, ArrowLeft, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const router = useRouter()
  const { user, isAuthenticated, setUser } = useContext(AppContext)
  
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    department: '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        company: user.company || '',
        phone: user.phone || '',
        department: user.department || '',
      })
    }
  }, [user, isAuthenticated])

  const validateForm = () => {
    const newErrors = {}
    if (!profile.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (profile.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the errors')
      return
    }

    setLoading(true)
    
    try {
      // Prepare update data (only send fields that can be updated)
      const updateData = {
        name: profile.name,
        company: profile.company || undefined,
        phone: profile.phone || undefined,
        department: profile.department || undefined,
      }

      console.log('Sending update:', updateData)

      const response = await api.patch('/users/profile', updateData)
      
      console.log('Update response:', response.data)

      // Update user in context and localStorage
      const updatedUser = { 
        ...user, 
        ...updateData,
        email: user?.email // Keep original email
      }
      
      // Update context if setUser is available
      if (setUser) {
        setUser(updatedUser)
      }
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser))
      
      toast.success('Profile updated successfully!')
      
      // Force a re-render
      setProfile({
        ...profile,
        name: updatedUser.name,
        company: updatedUser.company,
        phone: updatedUser.phone,
        department: updatedUser.department,
      })
      
    } catch (error) {
      console.error('Profile update error:', error)
      console.error('Error response:', error.response?.data)
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to update profile'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <button
            onClick={() => router.push(user?.role === 'admin' ? '/admin' : '/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className={`w-full pl-10 pr-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500`}
                  required
                />
              </div>
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={profile.email}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  disabled
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={profile.company}
                  onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Your company"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>

            {/* Department (for staff/admin) */}
            {(user?.role === 'admin' || user?.role === 'staff') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  value={profile.department}
                  onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Your department"
                />
              </div>
            )}

            {/* Help text */}
            <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-2 text-sm text-blue-700">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>Changes will be saved to your account immediately.</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}