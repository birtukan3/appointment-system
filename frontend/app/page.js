"use client"

import { useRouter } from 'next/navigation'
import { useContext } from 'react'
import { AppContext } from './providers'
import Navbar from './components/Navbar'
import ToastProvider from './components/ToastProvider'
import { 
  Calendar, 
  Clock, 
  Shield, 
  Users, 
  Building2, 
  CheckCircle, 
  ArrowRight, 
  Star, 
  Briefcase, 
  Phone, 
  Mail, 
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  ChevronRight
} from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated } = useContext(AppContext)

  const services = [
    { 
      name: 'General Consultation', 
      icon: Users, 
      description: 'Regular office visits and checkups with our experienced staff',
      color: 'from-blue-500 to-blue-600'
    },
    { 
      name: 'Specialist Appointment', 
      icon: Briefcase, 
      description: 'Expert consultation for specific needs and concerns',
      color: 'from-purple-500 to-purple-600'
    },
    { 
      name: 'Document Processing', 
      icon: Building2, 
      description: 'Official document handling, approvals, and certifications',
      color: 'from-green-500 to-green-600'
    },
    { 
      name: 'Meeting Scheduling', 
      icon: Calendar, 
      description: 'Schedule meetings with departments and management',
      color: 'from-orange-500 to-orange-600'
    },
  ]

  const features = [
    { 
      icon: Clock, 
      title: 'Save Time', 
      description: 'Skip the queue with our smart scheduling system',
      stats: '85% faster booking'
    },
    { 
      icon: Shield, 
      title: 'Secure & Private', 
      description: 'Your data is protected with enterprise-grade encryption',
      stats: 'Bank-level security'
    },
    { 
      icon: CheckCircle, 
      title: 'Instant Confirmation', 
      description: 'Get immediate booking confirmation via email',
      stats: 'Real-time updates'
    },
    { 
      icon: Users, 
      title: 'Easy Management', 
      description: 'Manage all your appointments in one centralized dashboard',
      stats: '24/7 access'
    },
  ]

  const testimonials = [
    { 
      name: 'John Smith', 
      role: 'Business Owner', 
      comment: 'This system has revolutionized how we handle office appointments. Highly recommended!',
      rating: 5,
      company: 'Smith Enterprises'
    },
    { 
      name: 'Sarah Johnson', 
      role: 'Office Manager', 
      comment: 'Saves us hours of administrative work every week. The staff love it!',
      rating: 5,
      company: 'Johnson & Co'
    },
    { 
      name: 'Michael Chen', 
      role: 'Healthcare Provider', 
      comment: 'Seamless integration with our existing workflow. Excellent support team.',
      rating: 5,
      company: 'Chen Medical Center'
    },
  ]

  const stats = [
    { value: '500+', label: 'Daily Appointments' },
    { value: '98%', label: 'Satisfaction Rate' },
    { value: '24/7', label: 'Online Booking' },
    { value: '10k+', label: 'Happy Users' },
  ]

  const handleGetStarted = () => {
    if (isAuthenticated) {
      router.push('/book')
    } else {
      router.push('/register')
    }
  }

  const handleDashboard = () => {
    if (isAuthenticated) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }

  return (
    <>
      <ToastProvider />
      <Navbar />
      <div className="min-h-screen bg-white pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white">
          {/* Animated background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-white rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
                Professional{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-400">
                  Appointment
                </span>{' '}
                System
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-2xl mx-auto">
                Streamline your office appointments with our intelligent booking platform.
                Perfect for medical offices, corporate services, and professional consultations.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleGetStarted}
                  className="group bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300 text-lg shadow-xl hover:shadow-2xl flex items-center justify-center gap-2"
                >
                  Get Started Now
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={handleDashboard}
                  className="group bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300 text-lg flex items-center justify-center gap-2"
                >
                  {isAuthenticated ? 'Go to Dashboard' : 'Sign In'}
                  <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-8 border-t border-blue-300">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-3xl md:text-4xl font-bold text-yellow-300 mb-2">
                      {stat.value}
                    </div>
                    <div className="text-sm md:text-base text-blue-100">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Our Services
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Comprehensive appointment solutions tailored to your professional needs
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {services.map((service, index) => {
                const Icon = service.icon
                return (
                  <div
                    key={index}
                    onClick={handleGetStarted}
                    className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer"
                  >
                    <div className={`h-2 bg-gradient-to-r ${service.color}`}></div>
                    <div className="p-8">
                      <div className={`h-16 w-16 bg-gradient-to-br ${service.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">
                        {service.name}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {service.description}
                      </p>
                      <div className="text-blue-600 font-semibold flex items-center gap-2 group-hover:gap-3 transition-all">
                        Learn more
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Why Choose Us?
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Designed for professionals who demand efficiency and reliability
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <div key={index} className="text-center group">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity"></div>
                      <div className="relative h-20 w-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Icon className="h-10 w-10 text-white" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 mb-2">
                      {feature.description}
                    </p>
                    <p className="text-sm font-semibold text-blue-600">
                      {feature.stats}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                What Our Clients Say
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Trusted by professionals across industries
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-6 italic text-lg">
                    "{testimonial.comment}"
                  </p>
                  <div className="border-t pt-4">
                    <p className="font-bold text-gray-900">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {testimonial.role} • {testimonial.company}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-700 py-20">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative max-w-4xl mx-auto text-center px-4">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of satisfied professionals who have streamlined their operations
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleGetStarted}
                className="group bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300 text-lg shadow-xl hover:shadow-2xl flex items-center justify-center gap-2"
              >
                Create Free Account
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => window.location.href = 'mailto:sales@smartoffice.com'}
                className="group bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300 text-lg"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Calendar className="h-8 w-8 text-blue-400" />
                  <span className="text-2xl font-bold">Smart<span className="text-blue-400">Office</span></span>
                </div>
                <p className="text-gray-400 text-sm">
                  Professional appointment management system for modern businesses.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-lg mb-4">Quick Links</h4>
                <ul className="space-y-2">
                  <li>
                    <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white transition">
                      Home
                    </button>
                  </li>
                  <li>
                    <button onClick={() => router.push('/about')} className="text-gray-400 hover:text-white transition">
                      About
                    </button>
                  </li>
                  <li>
                    <button onClick={() => router.push('/contact')} className="text-gray-400 hover:text-white transition">
                      Contact
                    </button>
                  </li>
                  <li>
                    <button onClick={() => router.push('/privacy')} className="text-gray-400 hover:text-white transition">
                      Privacy Policy
                    </button>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-lg mb-4">Contact Info</h4>
                <ul className="space-y-3 text-gray-400">
                  <li className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-blue-400 flex-shrink-0" />
                    <a href="tel:+15551234567" className="hover:text-white transition">
                      +1 (555) 123-4567
                    </a>
                  </li>
                  <li className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-blue-400 flex-shrink-0" />
                    <a href="mailto:info@smartoffice.com" className="hover:text-white transition">
                      info@smartoffice.com
                    </a>
                  </li>
                  <li className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-blue-400 flex-shrink-0" />
                    <span>123 Business Ave, Suite 100<br />New York, NY 10001</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-lg mb-4">Follow Us</h4>
                <div className="flex gap-4">
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-400 transition transform hover:scale-110"
                  >
                    <Facebook className="h-6 w-6" />
                  </a>
                  <a
                    href="https://twitter.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-400 transition transform hover:scale-110"
                  >
                    <Twitter className="h-6 w-6" />
                  </a>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-400 transition transform hover:scale-110"
                  >
                    <Linkedin className="h-6 w-6" />
                  </a>
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-400 transition transform hover:scale-110"
                  >
                    <Instagram className="h-6 w-6" />
                  </a>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
              <p>&copy; {new Date().getFullYear()} SmartOffice. All rights reserved.</p>
            </div>
          </div>
        </footer>

        <style jsx>{`
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .animate-fade-in {
            animation: fade-in 1s ease-out;
          }
        `}</style>
      </div>
    </>
  )
}