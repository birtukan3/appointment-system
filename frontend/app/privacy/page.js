"use client"

import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import ToastProvider from '../components/ToastProvider'
import { ArrowLeft, Shield, Lock, Eye, Database, Mail, Cookie, FileText, CheckCircle } from 'lucide-react'

export default function PrivacyPolicyPage() {
  const router = useRouter()

  const sections = [
    { icon: Shield, title: 'Information We Collect', content: 'We collect information you provide directly to us, such as when you create an account, book an appointment, or contact us for support. This may include your name, email address, phone number, and appointment details.' },
    { icon: Lock, title: 'How We Use Your Information', content: 'We use the information we collect to provide, maintain, and improve our services, to process your appointments, to communicate with you, and to protect the security of our platform.' },
    { icon: Database, title: 'Data Storage and Security', content: 'Your data is stored securely on encrypted servers. We implement industry-standard security measures to protect your personal information.' },
    { icon: Eye, title: 'Information Sharing', content: 'We do not sell, trade, or rent your personal information to third parties. We may share information with service providers who assist us in operating our platform.' },
    { icon: Cookie, title: 'Cookies and Tracking', content: 'We use cookies and similar tracking technologies to enhance your experience and analyze usage patterns.' },
    { icon: Mail, title: 'Communications', content: 'We may send you emails about your appointments or service updates. You can opt out of promotional emails at any time.' },
  ]

  return (
    <>
      <ToastProvider />
      <Navbar />
      <div className="min-h-screen bg-white pt-16">
        <section className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white py-20">
          <div className="max-w-7xl mx-auto px-4">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-white/80 hover:text-white mb-8"><ArrowLeft className="h-4 w-4" /> Back</button>
            <div className="text-center max-w-3xl mx-auto">
              <div className="flex justify-center mb-6"><div className="bg-white/20 p-4 rounded-2xl"><Shield className="h-16 w-16" /></div></div>
              <h1 className="text-5xl font-bold mb-6">Privacy <span className="text-yellow-300">Policy</span></h1>
              <p className="text-xl text-blue-100">Your privacy is important to us. Learn how we collect, use, and protect your information.</p>
              <p className="text-blue-200 mt-4">Last Updated: March 2026</p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4">
            <div className="space-y-8">
              {sections.map((section, index) => {
                const Icon = section.icon
                return (
                  <div key={index} className="bg-white p-8 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center"><Icon className="h-6 w-6 text-white" /></div>
                      <div><h2 className="text-2xl font-bold text-gray-900 mb-4">{section.title}</h2><p className="text-gray-700 leading-relaxed">{section.content}</p></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="py-16 bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Your Rights and Choices</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[{ icon: CheckCircle, title: 'Access', desc: 'Request access to your personal data' }, { icon: CheckCircle, title: 'Correction', desc: 'Update or correct your information' }, { icon: CheckCircle, title: 'Deletion', desc: 'Request deletion of your data' }, { icon: CheckCircle, title: 'Opt-Out', desc: 'Opt out of marketing communications' }].map((right, index) => {
                const Icon = right.icon
                return (<div key={index} className="bg-white p-6 rounded-xl shadow-md flex items-start gap-4"><div className="h-10 w-10 bg-green-500 rounded-lg flex items-center justify-center"><Icon className="h-5 w-5 text-white" /></div><div><h3 className="font-bold text-gray-900 mb-1">{right.title}</h3><p className="text-gray-600">{right.desc}</p></div></div>)
              })}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white p-8 rounded-2xl shadow-xl">
              <h2 className="text-3xl font-bold mb-4">Questions About Our Privacy Policy?</h2>
              <p className="text-blue-100 mb-6">If you have any questions or concerns about our privacy practices, please contact us.</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="mailto:privacy@smartoffice.com" className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100"><Mail className="h-4 w-4" /> privacy@smartoffice.com</a>
                <a href="mailto:info@smartoffice.com" className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600">Contact Us</a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}