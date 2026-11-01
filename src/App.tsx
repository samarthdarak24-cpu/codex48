import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { BrandMark } from '@/components/layout/Shell'
import LoginPage from '@/pages/Login'
import ProofPassVerify from '@/pages/ProofPassVerify'

// v2 — 21 reference-matched pages, backed by the real API
import { AppProvider as V2AppProvider } from '@/v2/context/AppContext'
import { V2Layout } from '@/v2/V2Layout'
import { OverviewView } from '@/v2/components/views/manager/OverviewView'
import { ReviewQueueView } from '@/v2/components/views/manager/ReviewQueueView'
import { AllSubmissionsView } from '@/v2/components/views/manager/AllSubmissionsView'
import { BrandGuidelinesView } from '@/v2/components/views/manager/BrandGuidelinesView'
import { RulesConflictsView } from '@/v2/components/views/manager/RulesConflictsView'
import { ExceptionsView } from '@/v2/components/views/manager/ExceptionsView'
import { RuleImpactSandboxView } from '@/v2/components/views/manager/RuleImpactSandboxView'
import { SentinelMonitoringView } from '@/v2/components/views/manager/SentinelMonitoringView'
import { AssetLibraryView } from '@/v2/components/views/manager/AssetLibraryView'
import { AnalyticsHealthView } from '@/v2/components/views/manager/AnalyticsHealthView'
import { AuditHistoryView } from '@/v2/components/views/manager/AuditHistoryView'
import { CreatorDashboardView } from '@/v2/components/views/creator/CreatorDashboardView'
import { NewContentView } from '@/v2/components/views/creator/NewContentView'
import { MySubmissionsView } from '@/v2/components/views/creator/MySubmissionsView'
import { AIReviewView } from '@/v2/components/views/creator/AIReviewView'
import { NotificationsView } from '@/v2/components/views/creator/NotificationsView'
import { ApprovedContentView } from '@/v2/components/views/creator/ApprovedContentView'
import { CreatorSentinelTasksView } from '@/v2/components/views/creator/CreatorSentinelTasksView'
import { CreatorExceptionRequestsView } from '@/v2/components/views/creator/CreatorExceptionRequestsView'
import { CreatorGuidelinesView } from '@/v2/components/views/creator/CreatorGuidelinesView'
import { MyProfileView } from '@/v2/components/views/creator/MyProfileView'

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
    return <Navigate to={user.role === 'manager' ? '/manager/overview' : '/creator/dashboard'} replace />
  }
  return <>{children}</>
}

/** Shared screens need a session but accept either role. */
function RequireSession({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Splash />
  if (status === 'anonymous' || !user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}

/** Role-aware redirect for the old /notifications path (now served by the v2 UI). */
function NotificationsRedirect() {
  const { status, user } = useAuth()
  if (status === 'loading') return <Splash />
  return (
    <Navigate
      to={user?.role === 'manager' ? '/manager/notifications' : '/creator/notifications'}
      replace
    />
  )
}

export default function App() {
  const { status, user } = useAuth()

  return (
    <Routes>
      {/* Single entry point — the v2 21-page workspace is the one and only app UI. */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify" element={<ProofPassVerify />} />
      <Route path="/verify/:id" element={<ProofPassVerify />} />

      {/* Old /notifications path → v2 role-aware notifications. */}
      <Route
        path="/notifications"
        element={
          <RequireSession>
            <NotificationsRedirect />
          </RequireSession>
        }
      />

      {/* Legacy creator workspace bookmark compatibility → v2 single UI. */}
      <Route
        path="/app/*"
        element={
          <RequireRole role="creator">
            <Navigate to="/creator/dashboard" replace />
          </RequireRole>
        }
      />

      {/* v2 Content Creator — 10 pages */}
      <Route
        path="/creator"
        element={
          <RequireRole role="creator">
            <V2AppProvider>
              <V2Layout />
            </V2AppProvider>
          </RequireRole>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CreatorDashboardView />} />
        <Route path="new-content" element={<NewContentView />} />
        <Route path="submissions" element={<MySubmissionsView />} />
        <Route path="ai-review" element={<AIReviewView />} />
        <Route path="guidelines" element={<CreatorGuidelinesView />} />
        <Route path="exceptions" element={<CreatorExceptionRequestsView />} />
        <Route path="tasks" element={<CreatorSentinelTasksView />} />
        <Route path="sentinel-tasks" element={<CreatorSentinelTasksView />} />
        <Route path="notifications" element={<NotificationsView />} />
        <Route path="approved" element={<ApprovedContentView />} />
        <Route path="approved-content" element={<ApprovedContentView />} />
        <Route path="profile" element={<MyProfileView />} />
      </Route>

      {/* v2 Brand Manager — 11 pages */}
      <Route
        path="/manager"
        element={
          <RequireRole role="manager">
            <V2AppProvider>
              <V2Layout />
            </V2AppProvider>
          </RequireRole>
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<OverviewView />} />
        <Route path="review-queue" element={<ReviewQueueView />} />
        <Route path="all-submissions" element={<AllSubmissionsView />} />
        <Route path="submissions" element={<AllSubmissionsView />} />
        <Route path="brand-guidelines" element={<BrandGuidelinesView />} />
        <Route path="guidelines" element={<BrandGuidelinesView />} />
        <Route path="rules-conflicts" element={<RulesConflictsView />} />
        <Route path="exceptions" element={<ExceptionsView />} />
        <Route path="rule-impact-sandbox" element={<RuleImpactSandboxView />} />
        <Route path="sentinel" element={<SentinelMonitoringView />} />
        <Route path="asset-library" element={<AssetLibraryView />} />
        <Route path="assets" element={<AssetLibraryView />} />
        <Route path="analytics" element={<AnalyticsHealthView />} />
        <Route path="audit-history" element={<AuditHistoryView />} />
        <Route path="audit-events" element={<AuditHistoryView />} />
        <Route path="notifications" element={<NotificationsView />} />
      </Route>

      <Route
        path="*"
        element={
          status === 'loading' ? (
            <Splash />
          ) : status === 'authenticated' && user ? (
            <Navigate to={user.role === 'manager' ? '/manager/overview' : '/creator/dashboard'} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  )
}
