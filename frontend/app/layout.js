// frontend/app/layout.js
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';

export const metadata = {
  title: 'SmartOffice - Appointment Management System',
  description: 'Professional appointment scheduling and management system',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport = {
  themeColor: '#4f46e5',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <ErrorBoundary>
          <Providers>
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '12px 16px',
                },
                success: {
                  duration: 3000,
                  iconTheme: { primary: '#10b981', secondary: '#fff' },
                },
                error: {
                  duration: 4000,
                  iconTheme: { primary: '#ef4444', secondary: '#fff' },
                },
              }}
            />
            <main className="min-h-screen">
              {children}
            </main>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}