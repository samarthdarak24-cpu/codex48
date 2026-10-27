import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { DashboardLayout } from '@/components/layout/Shell'
import { BrandMark } from '@/components/layout/Shell'
import LoginPage from '@/pages/Login'
import HomePage from '@/pages/marketing/Home'
import CreatorOverview from '@/pages/content/Overview'
import NewContent from '@/pages/content/NewContent'
import MySubmissions from '@/pages/content/Submissions'
import CreatorGuidelines from '@/pages/content/Guidelines'
import ReviewFeedback from '@/pages/content/Feedback'
import ManagerOverview from '@/pages/manager/Overview'
import ReviewQueue from '@/pages/manager/Queue'
import GuidelinesRules from '@/pages/manager/GuidelinesRules'
import ExceptionsPage from '@/pages/manager/Exceptions'
import Sandbox from '@/pages/manager/Sandbox'
import AuditHistory from '@/pages/manager/Audit'
import SentinelPage from '@/pages/manager/Sentinel'

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas">
      <div className="animate-float">
        <BrandMark size={40} />
      </div>
      <p className="text-xs font-medium tracking-[0.08em] text-muted">LOADING WORKSPACE</p>
    </div>
  )
}

/** Route guard — mirrors the server-side permission check. */
function RequireRole({ role, children }: { role: 'creator' | 'manager'; children: React.ReactNode }) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Splash />
  if (status === 'anonymous' || !user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (user.role !== role) {
    return <Navigate to={user.role === 'manager' ? '/manager/overview' : '/app/overview'} replace />
  }
  return <>{children}</>
}

export default function App() {
  const { status, user } = useAuth()

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/app"
        element={
          <RequireRole role="creator">
            <DashboardLayout />
          </RequireRole>
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<CreatorOverview />} />
        <Route path="new" element={<NewContent />} />
        <Route path="submissions" element={<MySubmissions />} />
        <Route path="guidelines" element={<CreatorGuidelines />} />
        <Route path="feedback" element={<ReviewFeedback />} />
        <Route path="feedback/:id" element={<ReviewFeedback />} />
      </Route>

      <Route
        path="/manager"
        element={
          <RequireRole role="manager">
            <DashboardLayout />
          </RequireRole>
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<ManagerOverview />} />
        <Route path="queue" element={<ReviewQueue />} />
        <Route path="queue/:id" element={<ReviewQueue />} />
        <Route path="sentinel" element={<SentinelPage />} />
        <Route path="guidelines" element={<GuidelinesRules />} />
        <Route path="exceptions" element={<ExceptionsPage />} />
        <Route path="sandbox" element={<Sandbox />} />
        <Route path="audit" element={<AuditHistory />} />
      </Route>

      <Route
        path="*"
        element={
          status === 'loading' ? (
            <Splash />
          ) : status === 'authenticated' && user ? (
            <Navigate to={user.role === 'manager' ? '/manager/overview' : '/app/overview'} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  )
}
