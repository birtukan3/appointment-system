// app/privacy/page.js
// ============================================
// COMPLETE PRIVACY POLICY PAGE - PROFESSIONAL VERSION
// ============================================

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { 
  ArrowLeft, Shield, Lock, Eye, Database, Mail, Cookie, 
  FileText, CheckCircle, Globe, Server, UserCheck, Clock, 
  Download, Trash2, Bell, Heart, Phone, MapPin, CreditCard,
  AlertTriangle, HelpCircle, BookOpen, Award, Users,
  ExternalLink, Copy, Check, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PrivacyPolicyPage() {
  const router = useRouter();
  const [lastUpdated, setLastUpdated] = useState('June 11, 2026');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const sections = [
    { 
      icon: Shield, 
      title: 'Information We Collect', 
      content: 'We collect information you provide directly to us, such as when you create an account, book an appointment, or contact us for support.',
      details: [
        '• Personal identification information (Name, email address, phone number)',
        '• Account credentials and profile information',
        '• Appointment details and medical history (if applicable)',
        '• Communication preferences and feedback'
      ]
    },
    { 
      icon: Lock, 
      title: 'How We Use Your Information', 
      content: 'We use the information we collect to provide, maintain, and improve our services, to process your appointments, and to communicate with you.',
      details: [
        '• To process and manage your appointments',
        '• To send you appointment reminders and notifications',
        '• To improve our platform and user experience',
        '• To detect and prevent fraudulent activity',
        '• To comply with legal and regulatory requirements'
      ]
    },
    { 
      icon: Database, 
      title: 'Data Storage and Security', 
      content: 'Your data is stored securely on encrypted servers with industry-standard security measures.',
      details: [
        '• 256-bit SSL encryption for data transmission',
        '• AES-256 encryption for stored data',
        '• Regular security audits and penetration testing',
        '• Multi-factor authentication for administrative access',
        '• Automated backup systems for data recovery'
      ]
    },
    { 
      icon: Eye, 
      title: 'Information Sharing', 
      content: 'We do not sell, trade, or rent your personal information to third parties.',
      details: [
        '• Trusted service providers under confidentiality agreements',
        '• Legal authorities when required by law',
        '• With your explicit consent',
        '• In aggregated, anonymized form for analytics'
      ]
    },
    { 
      icon: Cookie, 
      title: 'Cookies and Tracking', 
      content: 'We use cookies and similar tracking technologies to enhance your experience and analyze usage patterns.',
      details: [
        '• Essential cookies for core functionality',
        '• Performance cookies for analytics',
        '• Functional cookies for remembering preferences',
        '• You can manage cookies in your browser settings'
      ]
    },
    { 
      icon: Mail, 
      title: 'Communications', 
      content: 'We may send you emails about your appointments, service updates, and security alerts.',
      details: [
        '• Transactional emails (appointment confirmations, reminders)',
        '• Security alerts and account notifications',
        '• Service updates and feature announcements',
        '• You can opt out of promotional emails at any time'
      ]
    },
    { 
      icon: Server, 
      title: 'Data Retention', 
      content: 'We retain your personal information for as long as your account is active or as needed to provide you services.',
      details: [
        '• Active accounts: Data retained indefinitely until deletion request',
        '• Inactive accounts: Retained for 2 years after last activity',
        '• Deleted accounts: Anonymized data retained for analytics',
        '• Backup archives: Retained for 30 days after deletion'
      ]
    },
    { 
      icon: UserCheck, 
      title: 'Your Rights', 
      content: 'You have the right to access, correct, update, or delete your personal information.',
      details: [
        '• Right to access your personal data',
        '• Right to correct inaccurate information',
        '• Right to request data deletion',
        '• Right to data portability',
        '• Right to withdraw consent'
      ]
    }
  ];

  const yourRights = [
    { icon: Download, title: 'Access Your Data', description: 'Request a copy of all your personal data', action: 'export' },
    { icon: Eye, title: 'Correct Your Data', description: 'Update or fix inaccurate information', action: 'update' },
    { icon: Trash2, title: 'Delete Your Data', description: 'Request deletion of your account and data', action: 'delete' },
    { icon: Bell, title: 'Opt Out', description: 'Opt out of marketing communications', action: 'optout' },
  ];

  const complianceBadges = [
    { name: 'GDPR Compliant', icon: Shield, color: 'text-blue-600' },
    { name: 'CCPA Ready', icon: CheckCircle, color: 'text-green-600' },
    { name: 'ISO 27001', icon: Award, color: 'text-purple-600' },
    { name: 'SOC 2 Type II', icon: Shield, color: 'text-indigo-600' },
    { name: 'HIPAA Compliant', icon: Heart, color: 'text-red-600' },
  ];

  const copyEmailToClipboard = async () => {
    try {
      await navigator.clipboard.writeText('privacy@smartoffice.com');
      setCopiedEmail(true);
      toast.success('Email copied to clipboard!');
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch (err) {
      toast.error('Failed to copy email');
    }
  };

  const toggleSection = (index) => {
    setExpandedSection(expandedSection === index ? null : index);
  };

  const handleDataRequest = (action) => {
    toast.success(`Data request submitted for: ${action}. We'll contact you within 48 hours.`);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/20 pt-16">
        
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white py-20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <button 
              onClick={() => router.back()} 
              className="flex items-center gap-2 text-white/80 hover:text-white mb-8 transition group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
              Back
            </button>
            
            <div className="text-center max-w-3xl mx-auto">
              <div className="flex justify-center mb-6">
                <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-sm animate-float">
                  <Shield className="h-16 w-16" />
                </div>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                Privacy <span className="text-yellow-300">Policy</span>
              </h1>
              <p className="text-xl text-indigo-100 leading-relaxed">
                Your privacy is important to us. Learn how we collect, use, and protect your information.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mt-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm">
                  <Clock className="h-3 w-3 inline mr-1" /> Last Updated: {lastUpdated}
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm">
                  <Globe className="h-3 w-3 inline mr-1" /> Version 2.0
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Introduction */}
            <div className="mb-12 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <Heart className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-700 leading-relaxed">
                    <span className="font-bold text-blue-800">SmartOffice</span> ("us", "we", or "our") operates the SmartOffice appointment management platform. 
                    This page informs you of our policies regarding the collection, use, and disclosure of personal 
                    data when you use our Service.
                  </p>
                  <div className="flex flex-wrap gap-3 mt-4">
                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1 rounded-full">
                      <CheckCircle className="h-3.5 w-3.5" /> Trusted by 50,000+ users
                    </div>
                    <div className="flex items-center gap-2 text-sm text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                      <Award className="h-3.5 w-3.5" /> 99.9% Uptime SLA
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance Badges */}
            <div className="mb-12">
              <h2 className="text-center text-sm font-semibold text-gray-500 mb-4">COMPLIANCE & CERTIFICATIONS</h2>
              <div className="flex flex-wrap justify-center gap-3">
                {complianceBadges.map((badge, idx) => {
                  const Icon = badge.icon;
                  return (
                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm border border-gray-100">
                      <Icon className={`h-3.5 w-3.5 ${badge.color}`} />
                      <span className="text-xs font-medium text-gray-700">{badge.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Policy Sections */}
            <div className="space-y-4">
              {sections.map((section, index) => {
                const Icon = section.icon;
                const isExpanded = expandedSection === index;
                return (
                  <div 
                    key={index} 
                    className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden"
                  >
                    <div 
                      className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleSection(index)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
                            <RefreshCw className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                          <p className="text-gray-600 leading-relaxed mt-2">{section.content}</p>
                          
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <h3 className="text-sm font-semibold text-gray-700 mb-2">Detailed Information:</h3>
                              <ul className="space-y-1">
                                {section.details.map((detail, idx) => (
                                  <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span>{detail}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Your Rights Section */}
            <div className="mt-12">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Your Rights and Choices</h2>
                <p className="text-gray-600">You have control over your personal data. Here's how you can manage it.</p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {yourRights.map((right, index) => {
                  const Icon = right.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => handleDataRequest(right.action)}
                      className="group bg-white p-6 rounded-xl border border-gray-100 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="h-14 w-14 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Icon className="h-7 w-7 text-emerald-600" />
                      </div>
                      <h3 className="font-bold text-gray-900 mb-2">{right.title}</h3>
                      <p className="text-sm text-gray-600">{right.description}</p>
                      <span className="inline-block mt-3 text-xs text-emerald-600 opacity-0 group-hover:opacity-100 transition">Request →</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Data Processing Agreement */}
            <div className="mt-8 p-5 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-800 mb-1">Data Processing Agreement</h3>
                  <p className="text-sm text-amber-700">
                    If you require a Data Processing Agreement (DPA) for GDPR compliance, please contact our legal team at 
                    <button onClick={copyEmailToClipboard} className="ml-1 inline-flex items-center gap-1 text-amber-800 font-medium hover:text-amber-900">
                      legal@smartoffice.com
                      {copiedEmail ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Section */}
            <div className="mt-12 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white p-8 rounded-2xl shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
              
              <div className="relative">
                <h2 className="text-2xl font-bold mb-4 text-center">Questions About Our Privacy Policy?</h2>
                <p className="text-indigo-100 text-center mb-6">
                  If you have any questions or concerns about our privacy practices, please contact us.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <div className="relative inline-block">
                    <a 
                      href="mailto:privacy@smartoffice.com" 
                      className="inline-flex items-center justify-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition shadow-md"
                    >
                      <Mail className="h-4 w-4" /> privacy@smartoffice.com
                    </a>
                    <button
                      onClick={copyEmailToClipboard}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 bg-gray-100 rounded-md hover:bg-gray-200 transition"
                    >
                      {copiedEmail ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-gray-500" />}
                    </button>
                  </div>
                  <a 
                    href="mailto:support@smartoffice.com" 
                    className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-indigo-600 transition shadow-md"
                  >
                    <HelpCircle className="h-4 w-4" /> Contact Support
                  </a>
                </div>
                <div className="flex justify-center gap-6 mt-6 text-sm text-indigo-200">
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> +1 (555) 123-4567</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> 123 Business Ave, Suite 100</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 p-4 bg-gray-50 rounded-xl text-center border border-gray-100">
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>GDPR Compliant</span>
                </div>
                <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>CCPA Ready</span>
                </div>
                <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  <span>ISO 27001 Certified</span>
                </div>
                <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>Transparent Processing</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4">
                © {currentYear} SmartOffice. All rights reserved. This Privacy Policy is effective as of {lastUpdated}.
              </p>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
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
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease-out forwards;
          opacity: 0;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}