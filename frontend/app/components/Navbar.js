"use client";

import { useState, useEffect, useContext, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '../providers';
import { 
  Calendar, Menu, X, LogOut, User, Home, 
  Shield, LogIn, UserPlus, LayoutDashboard, Clock,
  ChevronDown, Sparkles, Heart, Zap, Bell
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useContext(AppContext);
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && dropdownOpen) {
        setDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen, mobileMenuOpen]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logout();
    router.push('/');
    setMobileMenuOpen(false);
    setDropdownOpen(false);
    toast.success('Logged out successfully');
  };

  const handleNavigation = (path) => {
    router.push(path);
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getNavigationItems = () => {
    if (!isAuthenticated) return [{ name: 'Home', href: '/', icon: Home, color: 'from-blue-500 to-cyan-500' }];
    
    if (user?.role === 'user') {
      return [
        { name: 'Home', href: '/', icon: Home, color: 'from-blue-500 to-cyan-500' },
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'from-indigo-500 to-purple-500' },
        { name: 'Book', href: '/book', icon: Calendar, color: 'from-purple-500 to-pink-500' },
        { name: 'Appointments', href: '/appointments', icon: Clock, color: 'from-emerald-500 to-teal-500' },
        { name: 'Profile', href: '/profile', icon: User, color: 'from-amber-500 to-orange-500' },
      ];
    }
    
    if (user?.role === 'staff') {
      return [
        { name: 'Home', href: '/', icon: Home, color: 'from-blue-500 to-cyan-500' },
        { name: 'Staff Dashboard', href: '/staff', icon: Shield, color: 'from-purple-500 to-pink-500' },
        { name: 'Profile', href: '/profile', icon: User, color: 'from-amber-500 to-orange-500' },
      ];
    }
    
    if (user?.role === 'admin') {
      return [
        { name: 'Home', href: '/', icon: Home, color: 'from-blue-500 to-cyan-500' },
        { name: 'Admin Dashboard', href: '/admin', icon: Shield, color: 'from-purple-500 to-pink-500' },
        { name: 'Profile', href: '/profile', icon: User, color: 'from-amber-500 to-orange-500' },
      ];
    }
    
    return [];
  };

  const navigation = getNavigationItems();

  return (
    <>
      <nav className={`fixed w-full z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-xl shadow-2xl py-2' 
          : 'bg-white shadow-lg py-3'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Logo with Animation */}
            <button 
              onClick={() => handleNavigation('/')} 
              className="flex items-center space-x-2 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-10 rounded-lg transition-opacity duration-500"></div>
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-lg shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                <Calendar className="h-6 w-6 text-white group-hover:rotate-6 transition-transform duration-300" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                Smart<span className="text-blue-600 group-hover:text-purple-600 transition-colors">Office</span>
              </span>
              <Sparkles className="h-3 w-3 text-blue-500 absolute -right-2 -top-1 opacity-0 group-hover:opacity-100 animate-pulse transition-all" />
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex md:items-center md:space-x-1">
              {navigation.map((item, index) => (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  onMouseEnter={() => setHoveredItem(item.name)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className="relative px-4 py-2 rounded-lg text-gray-700 hover:text-blue-600 font-medium transition-all duration-300 group"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300"></span>
                  <span className="relative flex items-center space-x-2">
                    <item.icon className={`h-4 w-4 transition-all duration-300 ${
                      hoveredItem === item.name ? 'scale-125 rotate-12 text-blue-600' : ''
                    }`} />
                    <span className="relative">
                      {item.name}
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:w-full transition-all duration-300"></span>
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {/* Desktop Auth Section */}
            <div className="hidden md:flex md:items-center md:space-x-3">
              {isAuthenticated ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center space-x-3 px-3 py-2 rounded-xl bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all duration-300 border border-gray-200 shadow-md hover:shadow-lg group"
                  >
                    <div className="relative">
                      <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:scale-110 transition-transform duration-300">
                        {getInitials(user?.name)}
                      </div>
                      <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{user?.name?.split(' ')[0]}</p>
                      <p className="text-xs text-gray-500 capitalize flex items-center gap-1">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                          user?.role === 'admin' ? 'bg-purple-500' : user?.role === 'staff' ? 'bg-blue-500' : 'bg-green-500'
                        }`}></span>
                        {user?.role}
                      </p>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  <div className={`absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden transition-all duration-300 origin-top ${
                    dropdownOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'
                  }`}>
                    <div className="py-2">
                      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
                        <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                        {user?.role === 'staff' && user?.department && (
                          <p className="text-xs text-blue-600 mt-1">{user?.department}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleNavigation('/profile')}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center space-x-3 group"
                      >
                        <User className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        <span>My Profile</span>
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-3 group"
                      >
                        <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => handleNavigation('/login')} 
                    className="px-5 py-2 text-blue-600 font-medium hover:text-blue-700 transition-colors relative group"
                  >
                    Sign In
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:w-full transition-all duration-300"></span>
                  </button>
                  <button 
                    onClick={() => handleNavigation('/register')} 
                    className="relative overflow-hidden px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center gap-2 group"
                  >
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    <UserPlus className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                    <span>Register</span>
                    <Sparkles className="h-3 w-3 absolute -right-2 -top-1 opacity-0 group-hover:opacity-100 animate-pulse" />
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button with Animation */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="md:hidden p-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition-all duration-300 relative"
            >
              <div className="relative">
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu with Slide Animation */}
      <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-all duration-300 ${
        mobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
      }`} onClick={() => setMobileMenuOpen(false)} />
      
      <div
        ref={mobileMenuRef}
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 md:hidden transform transition-all duration-500 ease-out ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Smart<span className="text-blue-600">Office</span>
                </span>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)} 
                className="p-2 rounded-lg hover:bg-white/20 transition-all duration-300"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            
            {isAuthenticated && (
              <div className="flex items-center space-x-3 mt-2 p-3 bg-white/50 rounded-xl">
                <div className="relative">
                  <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {getInitials(user?.name)}
                  </div>
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                      user?.role === 'admin' ? 'bg-purple-500' : user?.role === 'staff' ? 'bg-blue-500' : 'bg-green-500'
                    }`}></span>
                    {user?.role}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto py-6">
            <div className="space-y-1 px-4">
              {navigation.map((item, index) => (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className="w-full text-left px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl font-medium flex items-center space-x-3 transition-all duration-300 group"
                >
                  <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gradient-to-br group-hover:from-blue-500 group-hover:to-purple-500 group-hover:scale-110 transition-all duration-300">
                    <item.icon className="h-5 w-5 group-hover:text-white transition-colors" />
                  </div>
                  <span className="flex-1">{item.name}</span>
                  <ChevronDown className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-gray-100 p-4 space-y-2">
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-300 group"
              >
                <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span>Sign Out</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleNavigation('/login')}
                  className="w-full px-4 py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-medium hover:bg-blue-50 transition-all duration-300 flex items-center justify-center space-x-2 group"
                >
                  <LogIn className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => handleNavigation('/register')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 group"
                >
                  <UserPlus className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                  <span>Create Account</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}