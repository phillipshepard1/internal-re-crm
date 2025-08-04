'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import AuthGuard from '@/components/auth/AuthGuard'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import { Toaster } from 'sonner'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const inter = Inter({ subsets: ['latin'] })

function AppContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const isPublicPage = ['/login', '/privacy-policy', '/terms-of-service', '/debug'].includes(pathname)

  return (
    <ErrorBoundary>
      <AuthGuard>
        {isPublicPage ? (
          // Public pages - no sidebar/header
          <>{children}</>
        ) : (
          // Authenticated pages - with sidebar/header
          <div className="h-screen bg-background overflow-hidden">
            <div className="flex h-full">
              {/* Fixed Sidebar */}
              <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Fixed Header */}
                <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                {/* Scrollable Content Area */}
                <main className="flex-1 overflow-y-auto">
                  <div className="h-full">
                    {children}
                  </div>
                </main>
              </div>
            </div>
          </div>
        )}
      </AuthGuard>
    </ErrorBoundary>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <title>Internal-Re-CRM</title>
        <meta name="description" content="Internal Real Estate CRM System" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <AppContent>
            {children}
          </AppContent>
          <Toaster 
            position="top-right"
            richColors
            closeButton
            duration={4000}
            toastOptions={{
              style: {
                background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                fontSize: '14px',
                fontWeight: '500',
                minWidth: '300px',
                zIndex: 9999,
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
