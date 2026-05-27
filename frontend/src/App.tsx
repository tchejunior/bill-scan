import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { useAuth } from '@/hooks/useAuth'
import { useSSE } from '@/hooks/useSSE'
import { BottomNav } from '@/components/BottomNav'
import { FAB } from '@/components/FAB'
import { SideNav } from '@/components/SideNav'
import { LandingPage } from '@/pages/landing/LandingPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { ScanPage } from '@/pages/scan/ScanPage'
import { CropPage } from '@/pages/scan/CropPage'
import { BulkUploadPage } from '@/pages/scan/BulkUploadPage'
import { ExpensePage } from '@/pages/expense/ExpensePage'
import { ManualEntryPage } from '@/pages/expense/ManualEntryPage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'

const NO_NAV_ROUTES = ['/', '/login', '/register', '/scan', '/scan/crop', '/scan/bulk']

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-4xl">⏳</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location.pathname }} replace />
  }

  return <>{children}</>
}

function Shell() {
  const location = useLocation()
  const showNav = !NO_NAV_ROUTES.includes(location.pathname)
  useSSE()

  return (
    <div className={showNav ? 'pb-16 md:pb-0 md:pl-56' : ''}>
      {showNav && <SideNav />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/scan" element={<PrivateRoute><ScanPage /></PrivateRoute>} />
        <Route path="/scan/crop" element={<PrivateRoute><CropPage /></PrivateRoute>} />
        <Route path="/scan/bulk" element={<PrivateRoute><BulkUploadPage /></PrivateRoute>} />
        <Route path="/expense/new" element={<PrivateRoute><ManualEntryPage /></PrivateRoute>} />
        <Route path="/expense/:id" element={<PrivateRoute><ExpensePage /></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      {showNav && <BottomNav />}
      {showNav && <FAB />}
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
