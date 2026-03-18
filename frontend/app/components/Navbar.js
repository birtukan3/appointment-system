'use client'

import { useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppContext } from '../providers'
import { 
  Calendar, Menu, X, LogOut, User, Home, Briefcase, 
  Shield, Users, LogIn, UserPlus, ChevronDown, 
  LayoutDashboard, Clock, BarChart3, Settings, BookOpen 
} from 'lucide-react'

export default function Navbar() {
  const { user, logout, isAuthenticated, hasRole } = useContext(AppContext)
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Detect scroll for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = () => {
    logout()
    router.push('/')
    setMobileMenuOpen(false)
  }

  const handleNavigation = (path) => {
    router.push(path)
    setMobileMenuOpen(false)
  }

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  }

  // Navigation items based on user role
  const getNavigationItems = () => {
    const items = [
      { name: 'Home', href: '/', icon: Home, show: true }
    ]

    if (!isAuthenticated) return items

    // Regular User Navigation
    if (user?.role === 'user') {
      items.push(
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, show: true },
        { name: 'Book', href: '/book', icon: Calendar, show: true },
        { name: 'Appointments', href: '/appointments', icon: Briefcase, show: true },
        { name: 'Profile', href: '/profile', icon: User, show: true }
      )
    }

    // Staff Navigation
    if (user?.role === 'staff') {
      items.push(
        { name: 'Staff Dashboard', href: '/staff', icon: Shield, show: true },
        { name: 'Manage', href: '/staff', icon: Clock, show: true },
        { name: 'Profile', href: '/profile', icon: User, show: true }
      )
    }

    // Admin Navigation
    if (user?.role === 'admin') {
      items.push(
        { name: 'Admin Dashboard', href: '/admin', icon: Shield, show: true },
        { name: 'Staff', href: '/admin', icon: Users, show: true },
        { name: 'Reports', href: '/admin', icon: BarChart3, show: true },
        { name: 'Profile', href: '/profile', icon: User, show: true }
      )
    }

    return items.filter(item => item.show)
  }

  const navigation = getNavigationItems()

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg py-2' : 'bg-white shadow-md py-3'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center">
            <button
              onClick={() => handleNavigation('/')}
              className="flex items-center space-x-2 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-10 rounded-lg transition-opacity"></div>
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-lg shadow-md group-hover:shadow-lg transition-all">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Smart<span className="text-blue-600">Office</span>
              </span>
            </button>
          </div>

          {/* Desktop Navigation - Role-based */}
          <div className="hidden md:flex md:items-center md:space-x-1">
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className="relative px-4 py-2 rounded-lg text-gray-700 hover:text-blue-600 font-medium transition-all group overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                <span className="relative flex items-center space-x-1">
                  <item.icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>{item.name}</span>
                </span>
              </button>
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex md:items-center md:space-x-3">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                {/* User profile dropdown */}
                <div className="relative group">
                  <button className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 transition-all border border-gray-200">
                    <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {getInitials(user?.name)}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                    </div>
                  </button>
                  
                  {/* Dropdown menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform translate-y-2 group-hover:translate-y-0">
                    <div className="py-2">
                      <button
                        onClick={() => handleNavigation('/profile')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center space-x-2"
                      >
                        <User className="h-4 w-4" />
                        <span>My Profile</span>
                      </button>
                      <button
                        onClick={() => handleNavigation('/settings')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center space-x-2"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </button>
                      <div className="border-t border-gray-100 my-2"></div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleNavigation('/login')}
                  className="px-5 py-2 text-blue-600 font-medium hover:text-blue-700 transition-colors relative group"
                >
                  <span className="relative z-10">Sign In</span>
                  <span className="absolute inset-0 bg-blue-50 rounded-lg scale-0 group-hover:scale-100 transition-transform"></span>
                </button>
                <button
                  onClick={() => handleNavigation('/register')}
                  className="relative px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-blue-200 transition-all transform hover:-translate-y-0.5 overflow-hidden group"
                >
                  <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></span>
                  <span className="relative flex items-center gap-1">
                    <UserPlus className="h-4 w-4" />
                    Register
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition-all"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-xl animate-slideDown">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-2">
            {/* User info for mobile */}
            {isAuthenticated && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {getInitials(user?.name)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user?.name}</p>
                    <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Navigation Links */}
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className="w-full text-left px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium flex items-center space-x-3 transition-all group"
              >
                <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-white group-hover:text-blue-600 transition-all">
                  <item.icon className="h-5 w-5" />
                </div>
                <span>{item.name}</span>
              </button>
            ))}

            {/* Divider */}
            {navigation.length > 0 && (
              <div className="border-t border-gray-200 my-4"></div>
            )}

            {/* Mobile Auth Buttons */}
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-medium flex items-center space-x-3 transition-all"
              >
                <div className="p-2 bg-red-100 rounded-lg">
                  <LogOut className="h-5 w-5" />
                </div>
                <span>Logout</span>
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => handleNavigation('/login')}
                  className="w-full px-4 py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-all flex items-center justify-center space-x-2"
                >
                  <LogIn className="h-5 w-5" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => handleNavigation('/register')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center space-x-2"
                >
                  <UserPlus className="h-5 w-5" />
                  <span>Register</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add animation keyframes */}
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </nav>
  )
}