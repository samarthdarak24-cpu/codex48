import React, { useEffect, useState } from 'react';
import {
  AlertCircle, Bell, CheckCircle2, Clock, FileText, Key, Loader2, Mail, Pencil, Shield,
  ShieldCheck, UserRound,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { motion, useReducedMotion } from 'motion/react';
import {
  AnimatedCounter, AnimatedModal, EASE, PageTransition, SectionHeader, SuccessCheck, Timeline,
  type TimelineItem,
} from '../../motion';

const Metric: React.FC<{ label: string; value: number; tone: 'brand' | 'sage' | 'warn' | 'terracotta'; icon: React.ReactNode }> = ({
  label, value, tone, icon,
}) => {
  const toneMap = {
    brand: 'bg-brand-50 text-brand-600',
    sage: 'bg-sage-50 text-sage-600',
    warn: 'bg-warn-50 text-warn-600',
    terracotta: 'bg-terracotta-50 text-terracotta-600',
  } as const;
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneMap[tone]}`}>{icon}</span>
      <p className="mt-2.5 text-2xs font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold leading-none tabular-nums text-ink">
        <AnimatedCounter value={value} />
      </p>
    </div>
  );
};

export const MyProfileView: React.FC = () => {
  const { addToast, currentUser, submissions, refresh, updateProfile, changePassword, loading, error, setCurrentPage } = useApp();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser.name);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const reduce = useReducedMotion();

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPasswordVal] = useState('');
  const [newPassword, setNewPasswordVal] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    setNameInput(currentUser.name);
  }, [currentUser.name]);

  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(false), 3200);
    return () => window.clearTimeout(t);
  }, [saved]);

  const totalSubmissions = submissions.length;
  const approvedSubmissions = submissions.filter((s) => s.status === 'Approved').length;
  const pendingSubmissions = submissions.filter((s) => s.status === 'In Review' || s.status === 'Pending').length;
  const needsChangesSubmissions = submissions.filter((s) => s.status === 'Needs Changes' || s.status === 'Rejected').length;

  const activity: TimelineItem[] = submissions.slice(0, 5).map((s) => ({
    id: s.id,
    title: s.title,
    description: `${s.status} · ${s.campaign || 'No campaign'} · ${s.version || 'v1.0'}`,
    time: s.relativeTime || s.submittedDate || s.submittedAt || '—',
    tone:
      s.status === 'Approved'
        ? 'sage'
        : s.status === 'Needs Changes'
          ? 'terracotta'
          : s.status === 'Rejected'
            ? 'danger'
            : 'brand',
  }));

  const handleSaveProfile = async () => {
    if (!nameInput.trim()) {
      setProfileError('Name cannot be empty.');
      addToast('Name cannot be empty.', 'error');
      return;
    }
    setProfileError(null);
    setIsSavingProfile(true);
    try {
      await updateProfile({ name: nameInput.trim() });
      await refresh();
      setIsEditModalOpen(false);
      setSaved(true);
      addToast('Profile updated.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed.';
      setProfileError(message);
      addToast(message, 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      setPasswordError('Please fill in both password fields.');
      addToast('Please fill in both password fields.', 'error');
      return;
    }
    setPasswordError(null);
    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setIsPasswordModalOpen(false);
      setCurrentPasswordVal('');
      setNewPasswordVal('');
      addToast('Password changed successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password change failed.';
      setPasswordError(message);
      addToast(message, 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5 p-4 sm:p-6" aria-busy="true" aria-label="Loading profile">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-cream-100" />
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="h-[320px] animate-pulse rounded-2xl border border-line bg-white lg:col-span-4" />
          <div className="h-[320px] animate-pulse rounded-2xl border border-line bg-white lg:col-span-8" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div role="alert" className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-center">
          <p className="text-sm font-semibold text-danger-700">Your profile could not load.</p>
          <p className="mt-1 text-xs text-danger-600">{error}</p>
          <button
            onClick={() => void refresh()}
            className="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="p-4 sm:p-6">
      <div className="mx-auto max-w-[1400px] space-y-5">

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-brand-600">Account</p>
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-ink">My Profile</h1>
            <p className="mt-1 text-sm text-muted">
              Your identity in this workspace, your submission record and your security settings.
            </p>
          </div>
          <button
            onClick={() => { setProfileError(null); setIsEditModalOpen(true); }}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-semibold text-ink-700 shadow-card transition-colors hover:bg-cream-50"
          >
            <Pencil className="h-4 w-4" />Edit profile
          </button>
        </div>

        {saved && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-2xl border border-sage-200 bg-sage-50 px-4 py-3 text-xs font-semibold text-sage-700"
          >
            <SuccessCheck size={16} />Profile saved.
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-12">

          {/* Identity */}
          <div className="space-y-5 lg:col-span-4">
            <div className="rounded-2xl border border-line bg-white p-6 text-center shadow-card">
              <motion.div
                className="mx-auto h-20 w-20 rounded-full"
                whileHover={
                  reduce
                    ? undefined
                    : { scale: 1.04, boxShadow: '0 0 0 4px rgba(36,76,58,.14), 0 10px 26px -12px rgba(36,76,58,.45)' }
                }
                transition={{ duration: 0.25, ease: EASE }}
              >
                <img
                  src={currentUser.avatar}
                  alt=""
                  className="h-20 w-20 rounded-full object-cover ring-4 ring-cream-100"
                />
              </motion.div>
              <p className="mt-3 text-lg font-semibold text-ink">{currentUser.name}</p>
              <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-2xs font-semibold text-brand-700">
                <ShieldCheck className="h-3 w-3" />{currentUser.role}
              </span>
              <dl className="mt-4 space-y-1.5 text-left">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{currentUser.email || 'No email on this account'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <UserRound className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{currentUser.workspace}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span>{totalSubmissions} submission{totalSubmissions === 1 ? '' : 's'} on record</span>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <SectionHeader title="Shortcuts" subtitle="Where your work lives." />
              <div className="mt-3 space-y-2">
                <button
                  onClick={() => setCurrentPage('notifications')}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 text-left transition-colors hover:border-brand-200 hover:bg-cream-50"
                >
                  <span className="flex items-center gap-2.5 text-xs font-medium text-ink-700">
                    <Bell className="h-4 w-4 text-brand-600" />Notifications
                  </span>
                  <span className="text-2xs text-muted">Open</span>
                </button>
                <button
                  onClick={() => setCurrentPage('my-submissions')}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 text-left transition-colors hover:border-brand-200 hover:bg-cream-50"
                >
                  <span className="flex items-center gap-2.5 text-xs font-medium text-ink-700">
                    <FileText className="h-4 w-4 text-brand-600" />My submissions
                  </span>
                  <span className="text-2xs text-muted">Open</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="space-y-5 lg:col-span-8">
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <Metric label="Total submissions" value={totalSubmissions} tone="brand" icon={<FileText className="h-4 w-4" />} />
              <Metric label="Approved" value={approvedSubmissions} tone="sage" icon={<CheckCircle2 className="h-4 w-4" />} />
              <Metric label="In review" value={pendingSubmissions} tone="warn" icon={<Clock className="h-4 w-4" />} />
              <Metric label="Needs changes" value={needsChangesSubmissions} tone="terracotta" icon={<AlertCircle className="h-4 w-4" />} />
            </div>

            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <SectionHeader
                title="Recent activity"
                subtitle="Derived from the submissions stored against your account."
                actions={
                  <button
                    onClick={() => setCurrentPage('my-submissions')}
                    className="text-2xs font-semibold text-brand-600 transition-colors hover:text-brand-700"
                  >
                    See all
                  </button>
                }
              />
              {activity.length === 0 ? (
                <div className="mt-3 rounded-xl border border-line bg-cream-50 px-4 py-8 text-center">
                  <FileText className="mx-auto h-5 w-5 text-muted-light" />
                  <p className="mt-2 text-xs font-medium text-ink-600">No activity yet</p>
                  <p className="mt-0.5 text-2xs text-muted">
                    Your submission history will appear here once you create content.
                  </p>
                </div>
              ) : (
                <Timeline items={activity} className="mt-3" />
              )}
            </div>

            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <SectionHeader title="Security & access" subtitle="Managed by your workspace administrator." />
              <div className="mt-2 divide-y divide-line-soft">
                <div className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <Key className="h-4 w-4 text-muted" />
                    <div>
                      <p className="text-xs font-medium text-ink">Password</p>
                      <p className="text-2xs text-muted-light">Change the password used to sign in.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setPasswordError(null); setIsPasswordModalOpen(true); }}
                    className="rounded-xl border border-line px-3 py-1.5 text-2xs font-semibold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
                  >
                    Change
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-muted" />
                    <div>
                      <p className="text-xs font-medium text-ink">Role & permissions</p>
                      <p className="text-2xs text-muted-light">
                        Assigned by the workspace administrator and cannot be changed here.
                      </p>
                    </div>
                  </div>
                  <span className="badge-draft">{currentUser.role}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit profile */}
      <AnimatedModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit profile"
        description="Your display name is shown on submissions and review comments."
        footer={
          <>
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="btn-primary-glow inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingProfile && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isSavingProfile ? 'Saving…' : 'Save changes'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label htmlFor="profile-name" className="block text-xs font-semibold text-ink-700">
            Display name
          </label>
          <input
            id="profile-name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-xs text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          {profileError && (
            <p role="alert" className="text-2xs font-medium text-danger-600">{profileError}</p>
          )}
          <p className="text-2xs text-muted">Email, role and workspace are managed by your administrator.</p>
        </div>
      </AnimatedModal>

      {/* Change password */}
      <AnimatedModal
        open={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Change password"
        description="Use at least the same strength your workspace policy requires."
        footer={
          <>
            <button
              onClick={() => setIsPasswordModalOpen(false)}
              className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-50"
            >
              Cancel
            </button>
            <button
              onClick={handleChangePassword}
              disabled={isChangingPassword}
              className="btn-primary-glow inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isChangingPassword && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isChangingPassword ? 'Changing…' : 'Change password'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label htmlFor="current-password" className="mb-1 block text-xs font-semibold text-ink-700">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPasswordVal(e.target.value)}
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-xs text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label htmlFor="new-password" className="mb-1 block text-xs font-semibold text-ink-700">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPasswordVal(e.target.value)}
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-xs text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          {passwordError && (
            <p role="alert" className="text-2xs font-medium text-danger-600">{passwordError}</p>
          )}
        </div>
      </AnimatedModal>
    </PageTransition>
  );
};
