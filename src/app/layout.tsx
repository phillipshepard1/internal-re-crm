'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import AuthGuard from '@/components/auth/AuthGuard'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'
  const isPublicPage = ['/login', '/privacy-policy', '/terms-of-service'].includes(pathname)

  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <AuthGuard>
            {isPublicPage ? (
              // Public pages - no sidebar/header
              <>{children}</>
            ) : (
              // Authenticated pages - with sidebar/header
              <div className="min-h-screen bg-background">
                <div className="flex">
                  <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
                  <div className="flex-1 flex flex-col">
                    <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                    <main className="flex-1">
                      {children}
                    </main>
                  </div>
                </div>
              </div>
            )}
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  )
}
