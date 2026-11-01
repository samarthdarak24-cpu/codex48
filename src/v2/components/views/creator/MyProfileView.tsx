import React, { useState } from 'react';
import {
  Edit3,
  CheckCircle2,
  MapPin,
  Calendar,
  Mail,
  Camera,
  FileText,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Shield,
  Key,
  Smartphone,
  User,
  Globe,
  Briefcase,
  Bell,
  Palette,
  X
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';

export const MyProfileView: React.FC = () => {
  const { addToast, currentUser, submissions, refresh } = useApp();

  const [brandAlertsEnabled, setBrandAlertsEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  // Edit Profile Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser.name);
  const [titleInput, setTitleInput] = useState(currentUser.role);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Change Password Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const totalSubmissions = submissions.length;
  const approvedSubmissions = submissions.filter(s => s.status === 'Approved').length;
  const pendingSubmissions = submissions.filter(s => s.status === 'In Review' || s.status === 'Pending').length;
  const needsChangesSubmissions = submissions.filter(s => s.status === 'Needs Changes').length;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setIsSavingProfile(true);
    try {
      await api.updateProfile({ name: nameInput.trim(), title: titleInput.trim() });
      await refresh();
      addToast('Profile updated successfully', 'success');
      setIsEditModalOpen(false);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Could not update profile', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    setIsChangingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      addToast('Password changed successfully', 'success');
      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to change password', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header matching 8content.png */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">My Profile</h1>
          <p className="text-sm text-muted mt-0.5">
            Manage your profile, preferences and activity on Precedent.
          </p>
        </div>
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-line text-ink-700 rounded-lg text-xs font-semibold hover:bg-[#FAF7EF] shadow-xs cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5 text-muted" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* Top Section: Profile Card (Left) + 4 Stats Cards (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Profile Card (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-line p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start gap-4">
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-[#F1ECE0]"
              />
              <button
                disabled
                title="Avatar upload is not available in this build."
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-white border border-line shadow-xs flex items-center justify-center text-muted-light cursor-not-allowed"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-bold text-ink-900">{currentUser.name}</h2>
                <div className="w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold">
                  ✓
                </div>
              </div>
              <div className="text-xs font-semibold text-muted mt-0.5">{currentUser.role}</div>

              <div className="space-y-1 mt-2.5 text-xs text-ink-600">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-muted-light" />
                  <span>{currentUser.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-light" />
                  <span>{currentUser.workspace}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-muted-light" />
                  <span>Member of {currentUser.workspace}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs text-ink-600 leading-relaxed">
              Creating amazing content while keeping brand standards in mind. ✨
            </p>

            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {Array.from(new Set(submissions.map((s) => s.campaign).filter(Boolean))).slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-brand-50 text-brand-700 border border-brand-100"
                >
                  {tag}
                </span>
              ))}
              {submissions.length === 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F1ECE0] text-muted">
                  No campaigns yet
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 4 Stats Cards (7 Cols) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Total Submissions */}
          <div className="bg-white p-4.5 rounded-xl border border-line/80 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-muted">Total Submissions</div>
              <div className="text-2xl font-bold text-ink-900 mt-1">{totalSubmissions}</div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1">
                <span>live</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          {/* Approved */}
          <div className="bg-white p-4.5 rounded-xl border border-line/80 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-muted">Approved</div>
              <div className="text-2xl font-bold text-ink-900 mt-1">{approvedSubmissions}</div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1">
                <span>Certified</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          {/* Pending Review */}
          <div className="bg-white p-4.5 rounded-xl border border-line/80 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-muted">Pending Review</div>
              <div className="text-2xl font-bold text-ink-900 mt-1">{pendingSubmissions}</div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 mt-1">
                <span>In Queue</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Needs Changes */}
          <div className="bg-white p-4.5 rounded-xl border border-line/80 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-muted">Needs Changes</div>
              <div className="text-2xl font-bold text-ink-900 mt-1">{needsChangesSubmissions}</div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 mt-1">
                <span>Revisions</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-grape-50 text-grape-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Preferences & Security & Access (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Preferences Box */}
          <div className="bg-white rounded-xl border border-line p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-ink-900">Preferences</h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#FAF7EF] cursor-pointer border border-transparent hover:border-[#F1ECE0] transition-colors">
                <div className="flex items-center gap-2.5">
                  <Palette className="w-4 h-4 text-brand-600" />
                  <span className="font-semibold text-ink">Content Categories</span>
                </div>
                <div className="flex items-center gap-1 text-muted">
                  <span className="px-1.5 py-0.5 bg-[#F1ECE0] rounded text-[10px]">Product</span>
                  <span className="px-1.5 py-0.5 bg-[#F1ECE0] rounded text-[10px]">Campaign</span>
                  <span className="px-1.5 py-0.5 bg-[#F1ECE0] rounded text-[10px]">Social Media</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-light" />
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#FAF7EF] cursor-pointer border border-transparent hover:border-[#F1ECE0] transition-colors">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-brand-600" />
                  <span className="font-semibold text-ink">Notification Preferences</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted">
                  <span className="text-[11px]">Email, In-App</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-light" />
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-transparent transition-colors">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-brand-600" />
                  <span className="font-semibold text-ink">Brand Alerts</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBrandAlertsEnabled(!brandAlertsEnabled)}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    brandAlertsEnabled ? 'bg-brand-600' : 'bg-line-strong'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      brandAlertsEnabled ? 'left-5.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Security & Access Box */}
          <div className="bg-white rounded-xl border border-line p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-ink-900">Security &amp; Access</h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#F1ECE0]">
                <div className="flex items-center gap-2.5">
                  <Key className="w-4 h-4 text-muted" />
                  <div>
                    <div className="font-semibold text-ink">Change Password</div>
                    <div className="text-[10px] text-muted-light">Last changed: Mar 10, 2025</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 cursor-pointer"
                >
                  Change
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#F1ECE0]">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-muted" />
                  <div>
                    <div className="font-semibold text-ink">Two-Factor Authentication</div>
                    <div className="text-[10px] text-emerald-600 font-semibold">Enabled</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    twoFactorEnabled ? 'bg-brand-600' : 'bg-line-strong'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      twoFactorEnabled ? 'left-5.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#F1ECE0]">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-muted" />
                  <div>
                    <div className="font-semibold text-ink">Active Sessions</div>
                    <div className="text-[10px] text-muted-light">2 devices</div>
                  </div>
                </div>
                <button
                  disabled
                  title="Session management is not available in this build."
                  className="text-xs font-semibold text-muted/60 cursor-not-allowed"
                >
                  Manage
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Account Details & Recent Activity (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Account Details */}
          <div className="bg-white rounded-xl border border-line p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-900">Account Details</h3>
              <button
                disabled
                title="Full account configuration is not available in this build."
                className="text-xs font-semibold text-muted/60 cursor-not-allowed flex items-center gap-1"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-3 p-3 bg-[#FAF7EF]/70 rounded-xl border border-[#F1ECE0]">
                <div className="w-9 h-9 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
                  <div>
                    <div className="text-[11px] text-muted-light font-medium">Role</div>
                    <div className="font-bold text-ink-900 mt-0.5">
                      {currentUser.role === 'manager' ? 'Brand Manager' : 'Content Creator'}
                    </div>
                  </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-[#FAF7EF]/70 rounded-xl border border-[#F1ECE0]">
                <div className="w-9 h-9 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-muted-light font-medium">Time Zone</div>
                  <div className="font-bold text-ink-900 mt-0.5">Not set</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-[#FAF7EF]/70 rounded-xl border border-[#F1ECE0]">
                <div className="w-9 h-9 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-muted-light font-medium">Department</div>
                  <div className="font-bold text-ink-900 mt-0.5">Not set</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-[#FAF7EF]/70 rounded-xl border border-[#F1ECE0]">
                <div className="w-9 h-9 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-muted-light font-medium">Language</div>
                  <div className="font-bold text-ink-900 mt-0.5">English (UI)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-line p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-900">Recent Activity</h3>
              <button
                disabled
                title="The full activity log is shown in Audit History."
                className="text-xs font-semibold text-muted/60 cursor-not-allowed flex items-center gap-1"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Activity 1 */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#F1ECE0] hover:bg-[#FAF7EF] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    ✓
                  </div>
                  <div className="w-12 h-10 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-ink-900">
                      Your content "Summer Product Launch" was approved
                    </div>
                    <div className="text-[11px] text-muted-light mt-0.5">Mar 28, 2025 • 2:15 PM</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Approved
                </span>
              </div>

              {/* Activity 2 */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#F1ECE0] hover:bg-[#FAF7EF] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    ℹ
                  </div>
                  <div className="w-12 h-10 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-ink-900">
                      New comment on your submission "Weekend Offer"
                    </div>
                    <div className="text-[11px] text-muted-light mt-0.5">Mar 27, 2025 • 6:20 PM</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                  Comment
                </span>
              </div>

              {/* Activity 3 */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#F1ECE0] hover:bg-[#FAF7EF] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-grape-100 text-grape-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    🔔
                  </div>
                  <div className="w-12 h-10 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-ink-900">Brand guidelines updated</div>
                    <div className="text-[11px] text-muted-light mt-0.5">Mar 25, 2025 • 11:30 AM</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-grape-50 text-grape-700 border border-grape-100">
                  Update
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1ECE0] pb-3">
              <h3 className="text-sm font-bold text-ink-900">Edit Profile</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-muted-light hover:text-ink-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-ink-900 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-line rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-ink-900 mb-1">Professional Title</label>
                <input
                  type="text"
                  value={titleInput}
                  onChange={e => setTitleInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-line rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-ink-900 mb-1">Account Role</label>
                <input
                  type="text"
                  disabled
                  value={currentUser.role}
                  className="w-full px-3 py-2 bg-[#FAF7EF] border border-line rounded-lg text-muted cursor-not-allowed"
                />
                <span className="text-[10px] text-muted-light mt-0.5 block">Role permissions are strictly managed by Workspace Administrators.</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#F1ECE0]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-line rounded-lg text-ink-700 font-semibold hover:bg-[#FAF7EF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold shadow-xs disabled:opacity-60"
                >
                  {isSavingProfile ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1ECE0] pb-3">
              <h3 className="text-sm font-bold text-ink-900">Change Password</h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-muted-light hover:text-ink-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-ink-900 mb-1">Current Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-line rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-ink-900 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-line rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#F1ECE0]">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 border border-line rounded-lg text-ink-700 font-semibold hover:bg-[#FAF7EF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold shadow-xs disabled:opacity-60"
                >
                  {isChangingPassword ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
