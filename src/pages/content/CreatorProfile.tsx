import React, { useState } from 'react'
import {
  User,
  Mail,
  Shield,
  KeyRound,
  Bell,
  LogOut,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'

export default function CreatorProfilePage() {
  const toast = useToast()
  const { user, logout } = useAuth()
  const [displayName, setDisplayName] = useState(user?.name || 'Emily Carter')
  const [timezone, setTimezone] = useState('America/New_York (EST)')
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [saved, setSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-widest text-muted uppercase">ACCOUNT & PREFERENCES</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink mt-0.5">Profile Settings</h1>
        <p className="text-sm text-muted">
          Manage your personal identity, role attributes, and governance notification settings.
        </p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>Profile preferences saved successfully.</span>
        </div>
      )}

      {/* Account Info Form */}
      <form onSubmit={handleSave} className="rounded-xl border border-line bg-white p-5 shadow-card space-y-4 text-xs">
        <h2 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-line pb-2.5">
          User Details
        </h2>

        <div>
          <label className="block font-semibold text-ink mb-1">Full Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-line bg-stone-50 p-2 text-ink focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block font-semibold text-muted mb-1">Email Address (Read-only)</label>
          <input
            type="email"
            disabled
            value={user?.email || 'emily.carter@pureglow.co'}
            className="w-full rounded-lg border border-line bg-stone-100 p-2 text-muted cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-muted mb-1">Assigned Role</label>
            <div className="rounded-lg border border-line bg-stone-100 p-2 font-semibold text-ink capitalize">
              {user?.role || 'Creator'}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-muted mb-1">Active Workspace</label>
            <div className="rounded-lg border border-line bg-stone-100 p-2 font-semibold text-ink">
              {user?.workspace || 'PureGlow'}
            </div>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-ink mb-1">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-lg border border-line bg-stone-50 p-2 text-ink focus:bg-white focus:outline-none"
          >
            <option value="America/New_York (EST)">America/New_York (EST)</option>
            <option value="America/Los_Angeles (PST)">America/Los_Angeles (PST)</option>
            <option value="Europe/London (GMT)">Europe/London (GMT)</option>
            <option value="Asia/Tokyo (JST)">Asia/Tokyo (JST)</option>
          </select>
        </div>

        <div className="pt-2 border-t border-line">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={emailNotifs}
              onChange={(e) => setEmailNotifs(e.target.checked)}
              className="rounded border-line text-brand-600 focus:ring-brand-500"
            />
            <span className="font-medium text-ink">Receive email digests for Sentinel reassessments and review decisions</span>
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="rounded-lg bg-[#1C3A27] px-4 py-2 font-semibold text-white hover:bg-[#254F35]"
          >
            Save Changes
          </button>
        </div>
      </form>

      {/* Security Actions */}
      <div className="rounded-xl border border-line bg-white p-5 shadow-card space-y-3 text-xs">
        <h2 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-line pb-2.5">
          Security & Sessions
        </h2>

        <div className="flex items-center justify-between py-1">
          <div>
            <span className="font-semibold text-ink block">Account Password</span>
            <span className="text-muted text-[11px]">Last changed 42 days ago</span>
          </div>
          <button
            onClick={() => toast.info('Password Reset', 'Password reset instructions have been sent to your registered email.')}
            className="rounded-lg border border-line px-3 py-1.5 font-semibold text-ink hover:bg-stone-50"
          >
            Change Password
          </button>
        </div>

        <div className="flex items-center justify-between py-1 pt-2 border-t border-line">
          <div>
            <span className="font-semibold text-ink block">Session Sign Out</span>
            <span className="text-muted text-[11px]">Log out from this browser session</span>
          </div>
          <button
            onClick={() => logout()}
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 font-semibold text-rose-700 hover:bg-rose-100"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

