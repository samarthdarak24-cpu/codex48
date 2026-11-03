import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { DashboardLayout } from '@/components/layout/Shell'
import { BrandMark } from '@/components/layout/Shell'
import LoginPage from '@/pages/Login'
import SignupPage from '@/pages/Signup'
import HomePage from '@/pages/marketing/Home'
import CreatorOverview from '@/pages/content/Overview'
import NewContent from '@/pages/content/NewContent'
import MySubmissions from '@/pages/content/Submissions'
import CreatorGuidelines from '@/pages/content/Guidelines'
import ReviewFeedback from '@/pages/content/Feedback'
import CreatorExceptionRequestsPage from '@/pages/content/CreatorExceptionRequests'
import CreatorSentinelTasksPage from '@/pages/content/CreatorSentinelTasks'
import CreatorNotificationsPage from '@/pages/content/CreatorNotifications'
import CreatorApprovedContentPage from '@/pages/content/CreatorApprovedContent'
import CreatorProfilePage from '@/pages/content/CreatorProfile'
import CreatorAssistantsPage from '@/pages/content/CreatorAssistants'
import ManagerOverview from '@/pages/manager/Overview'
import ReviewQueue from '@/pages/manager/Queue'
import AllSubmissionsPage from '@/pages/manager/AllSubmissions'
import GuidelinesRules from '@/pages/manager/GuidelinesRules'
import ExceptionsPage from '@/pages/manager/Exceptions'
import Sandbox from '@/pages/manager/Sandbox'
import SentinelMonitoringPage from '@/pages/manager/SentinelMonitoring'
import AssetLibraryPage from '@/pages/manager/AssetLibrary'
import AnalyticsHealthPage from '@/pages/manager/AnalyticsHealth'
import AuditHistory from '@/pages/manager/Audit'
import AgentStudioPage from '@/pages/manager/AgentStudio'
import AgentDetailPage from '@/pages/manager/AgentDetail'
import WorkflowBuilderPage from '@/pages/manager/WorkflowBuilderPage'
import AgentRunsPage from '@/pages/manager/AgentRunsPage'
import AgentRunDetailPage from '@/pages/manager/AgentRunDetailPage'

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
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/register" element={<Navigate to="/signup" replace />} />

      {/* Aliases for Creator Routes */}
      <Route path="/creator" element={<Navigate to="/app/overview" replace />} />
      <Route path="/creator/dashboard" element={<Navigate to="/app/overview" replace />} />
      <Route path="/creator/new-content" element={<Navigate to="/app/new" replace />} />
      <Route path="/creator/submissions" element={<Navigate to="/app/submissions" replace />} />
      <Route path="/creator/guidelines" element={<Navigate to="/app/guidelines" replace />} />
      <Route path="/creator/ai-review" element={<Navigate to="/app/feedback" replace />} />
      <Route path="/creator/exception-requests" element={<Navigate to="/app/exceptions" replace />} />
      <Route path="/creator/sentinel-tasks" element={<Navigate to="/app/sentinel" replace />} />
      <Route path="/creator/notifications" element={<Navigate to="/app/notifications" replace />} />
      <Route path="/creator/approved-content" element={<Navigate to="/app/approved" replace />} />
      <Route path="/creator/profile" element={<Navigate to="/app/profile" replace />} />
      <Route path="/creator/ai-assistants" element={<Navigate to="/app/ai-assistants" replace />} />
      <Route path="/creator/ai-assistants/:agentId" element={<Navigate to="/app/ai-assistants" replace />} />

      {/* Primary Creator Workspace */}
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
        <Route path="exceptions" element={<CreatorExceptionRequestsPage />} />
        <Route path="sentinel" element={<CreatorSentinelTasksPage />} />
        <Route path="notifications" element={<CreatorNotificationsPage />} />
        <Route path="approved" element={<CreatorApprovedContentPage />} />
        <Route path="profile" element={<CreatorProfilePage />} />
        <Route path="ai-assistants" element={<CreatorAssistantsPage />} />
        <Route path="ai-assistants/:agentId" element={<CreatorAssistantsPage />} />
      </Route>

      {/* Manager Workspace */}
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
        <Route path="review-queue" element={<Navigate to="/manager/queue" replace />} />
        <Route path="submissions" element={<AllSubmissionsPage />} />
        <Route path="guidelines" element={<GuidelinesRules />} />
        <Route path="rules" element={<GuidelinesRules />} />
        <Route path="exceptions" element={<ExceptionsPage />} />
        <Route path="sandbox" element={<Sandbox />} />
        <Route path="sentinel" element={<SentinelMonitoringPage />} />
        <Route path="assets" element={<AssetLibraryPage />} />
        <Route path="analytics" element={<AnalyticsHealthPage />} />
        <Route path="audit" element={<AuditHistory />} />
        <Route path="agent-studio" element={<AgentStudioPage />} />
        <Route path="agents" element={<Navigate to="/manager/agent-studio" replace />} />
        <Route path="agents/:agentId" element={<AgentDetailPage />} />
        <Route path="agents/:agentId/builder" element={<WorkflowBuilderPage />} />
        <Route path="agents/:agentId/runs" element={<AgentRunsPage />} />
        <Route path="agent-runs" element={<AgentRunsPage />} />
        <Route path="agent-runs/:runId" element={<AgentRunDetailPage />} />
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
