import React, { useState } from 'react';
import {
  Edit3, CheckCircle2, MapPin, Calendar, Mail, Camera, FileText, Clock,
  AlertCircle, ChevronRight, Shield, Key, Smartphone, Globe, Briefcase, Bell, X,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import { StatCardGrid } from '../../ui/StatCard';

export const MyProfileView: React.FC = () => {
  const { addToast, currentUser, submissions, refresh, updateProfile, changePassword } = useApp();

  const [brandAlertsEnabled, setBrandAlertsEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser.name);
  const [titleInput, setTitleInput] = useState(currentUser.role);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPasswordVal] = useState('');
  const [newPassword, setNewPasswordVal] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const totalSubmissions = submissions.length;
  const approvedSubmissions = submissions.filter((s) => s.status === 'Approved').length;
  const pendingSubmissions = submissions.filter((s) => s.status === 'In Review' || s.status === 'Pending').length;
  const needsChangesSubmissions = submissions.filter((s) => s.status === 'Needs Changes').length;

  const recentActivity = submissions.slice(0, 3).map((s) => ({
    id: s.id, title: s.title, action: s.status === 'Approved' ? 'was approved' : s.status === 'Needs Changes' ? 'needs changes' : 'was updated',
    time: s.submittedAt || 'Recently', thumbnail: s.thumbnail,
    badge: s.status === 'Approved' ? 'Approved' : s.status === 'Needs Changes' ? 'Comment' : 'Update',
    badgeColor: s.status === 'Approved' ? 'badge-approved' : s.status === 'Needs Changes' ? 'bg-violet-50 text-violet-700 border border-violet-200' : 'badge-inreview',
  }));

  const handleSaveProfile = async () => {
    if (!nameInput.trim()) { addToast('Name cannot be empty.', 'error'); return; }
    setIsSavingProfile(true);
    try { await updateProfile({ name: nameInput.trim() }); await refresh(); setIsEditModalOpen(false); addToast('Profile updated.'); }
    catch (err) { addToast(err instanceof Error ? err.message : 'Update failed.', 'error'); }
    finally { setIsSavingProfile(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) { addToast('Please fill in both password fields.', 'error'); return; }
    setIsChangingPassword(true);
    try { await changePassword(currentPassword, newPassword); setIsPasswordModalOpen(false); setCurrentPasswordVal(''); setNewPasswordVal(''); addToast('Password changed successfully.'); }
    catch (err) { addToast(err instanceof Error ? err.message : 'Password change failed.', 'error'); }
    finally { setIsChangingPassword(false); }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-black tracking-tight leading-none mt-1 animate-count-up">My Profile</h1>
          <p className="text-xs text-muted mt-0.5">Manage your profile, preferences and activity on Precedent.</p>
        </div>
        <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] shadow-2xs transition-colors cursor-pointer">
          <Edit3 className="w-4 h-4" />Edit Profile
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Profile card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-line shadow-2xs p-5">
            {/* Avatar */}
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-3">
                <img src={currentUser.avatar} alt={currentUser.name} className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-md" />
                <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-brand-600 border-2 border-white flex items-center justify-center cursor-pointer hover:bg-brand-700 transition-colors">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
              <p className="text-base font-bold text-ink-900 flex items-center gap-1.5">
                {currentUser.name}
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
              </p>
              <p className="text-xs text-muted mt-0.5">{currentUser.role}</p>
              <div className="space-y-1 mt-3 text-xs text-muted-light">
                <div className="flex items-center gap-2 justify-center"><Mail className="w-3.5 h-3.5" />{currentUser.email}</div>
                <div className="flex items-center gap-2 justify-center"><MapPin className="w-3.5 h-3.5" />Pune, India</div>
                <div className="flex items-center gap-2 justify-center"><Calendar className="w-3.5 h-3.5" />Joined Mar 2025</div>
              </div>
              <p className="text-[11px] text-muted mt-3 leading-relaxed">Creating amazing content while keeping brand standards in mind. ✨</p>
              <div className="flex items-center gap-1.5 mt-3 flex-wrap justify-center">
                {['Marketing', 'Product', 'Social Media'].map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-[#F1ECE0] rounded-full text-[10px] font-medium text-ink-700">{tag}</span>
                ))}
                <span className="px-2 py-0.5 bg-[#F1ECE0] rounded-full text-[10px] font-medium text-ink-700">+2</span>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-2xl border border-line shadow-2xs p-4 space-y-3">
            <h3 className="text-sm font-bold text-ink-900">Preferences</h3>
            {[
              { icon: <FileText className="w-4 h-4 text-muted" />, label: 'Content Categories', value: 'Product, Campaign, Social Media', arrow: true },
              { icon: <Bell className="w-4 h-4 text-muted" />, label: 'Notification Preferences', value: 'Email, In-App', arrow: true },
            ].map((pref) => (
              <div key={pref.label} className="flex items-center justify-between py-2 border-b border-[#F5F0E8] last:border-0">
                <div className="flex items-center gap-2.5">
                  {pref.icon}
                  <div>
                    <p className="text-xs font-medium text-ink-900">{pref.label}</p>
                    <p className="text-[11px] text-muted-light">{pref.value}</p>
                  </div>
                </div>
                {pref.arrow && <ChevronRight className="w-4 h-4 text-muted-light cursor-pointer" />}
              </div>
            ))}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-muted" />
                <div>
                  <p className="text-xs font-medium text-ink-900">Brand Alerts</p>
                </div>
              </div>
              <button onClick={() => setBrandAlertsEnabled(!brandAlertsEnabled)}
                className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative ${brandAlertsEnabled ? 'bg-brand-600' : 'bg-[#F1ECE0]'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${brandAlertsEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="lg:col-span-8 space-y-5">
          {/* KPI Cards */}
          <StatCardGrid cards={[
    { label: 'Total Submissions', value: totalSubmissions, icon: <FileText className="w-5 h-5" />, variant: 'blue', trend: 12, sparkPathIndex: 0 },
    { label: 'Approved', value: approvedSubmissions, icon: <CheckCircle2 className="w-5 h-5" />, variant: 'green', trend: 8, sparkPathIndex: 1 },
    { label: 'Pending Review', value: pendingSubmissions, icon: <Clock className="w-5 h-5" />, variant: 'amber', trend: 0, sparkPathIndex: 2 },
    { label: 'Needs Changes', value: needsChangesSubmissions, icon: <AlertCircle className="w-5 h-5" />, variant: 'purple', trend: -50, sparkPathIndex: 3 },
  ]} />

          {/* Account Details */}
          <div className="bg-white rounded-2xl border border-line shadow-2xs p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-ink-900">Account Details</h3>
              <button className="text-xs font-semibold text-brand-600 hover:underline cursor-pointer">View All →</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Briefcase className="w-4 h-4 text-brand-600" />, label: 'Role', value: 'Content Creator' },
                { icon: <Clock className="w-4 h-4 text-brand-600" />, label: 'Time Zone', value: 'IST (GMT+5:30)' },
                { icon: <Globe className="w-4 h-4 text-brand-600" />, label: 'Department', value: 'Content & Marketing' },
                { icon: <Globe className="w-4 h-4 text-brand-600" />, label: 'Language', value: 'English' },
              ].map((detail) => (
                <div key={detail.label} className="flex items-start gap-3 p-3 bg-[#FAF7EF] rounded-xl border border-line">
                  {detail.icon}
                  <div>
                    <p className="text-[10px] text-muted">{detail.label}</p>
                    <p className="text-xs font-semibold text-ink-900 mt-0.5">{detail.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl border border-line shadow-2xs p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-ink-900">Recent Activity</h3>
              <button className="text-xs font-semibold text-brand-600 hover:underline cursor-pointer">View All →</button>
            </div>
            <div className="space-y-3">
              {recentActivity.length === 0 && <p className="text-xs text-muted text-center py-4">No recent activity.</p>}
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <img src={item.thumbnail} alt="" className="w-10 h-10 rounded-xl object-cover border border-line shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-ink-900">Your content "{item.title}" {item.action}</p>
                    <p className="text-[11px] text-muted-light mt-0.5">{item.time}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${item.badgeColor}`}>{item.badge}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Security & Access */}
          <div className="bg-white rounded-2xl border border-line shadow-2xs p-4">
            <h3 className="text-sm font-bold text-ink-900 mb-3">Security & Access</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-[#F5F0E8]">
                <div className="flex items-center gap-3"><Key className="w-4 h-4 text-muted" /><div><p className="text-xs font-medium text-ink-900">Change Password</p><p className="text-[11px] text-muted-light">Last changed: Mar 10, 2025</p></div></div>
                <button onClick={() => setIsPasswordModalOpen(true)} className="text-xs font-semibold text-brand-600 hover:text-brand-700 cursor-pointer">Change</button>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#F5F0E8]">
                <div className="flex items-center gap-3"><Shield className="w-4 h-4 text-muted" /><div><p className="text-xs font-medium text-ink-900">Two-Factor Authentication</p><span className="text-[11px] text-emerald-600 font-semibold">Enabled</span></div></div>
                <button onClick={() => setTwoFactorEnabled(!twoFactorEnabled)} className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative ${twoFactorEnabled ? 'bg-brand-600' : 'bg-[#F1ECE0]'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${twoFactorEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3"><Smartphone className="w-4 h-4 text-muted" /><div><p className="text-xs font-medium text-ink-900">Active Sessions</p><p className="text-[11px] text-muted-light">2 devices</p></div></div>
                <button className="text-xs font-semibold text-brand-600 hover:text-brand-700 cursor-pointer">Manage</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-line">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <h3 className="font-bold text-ink-900 text-sm">Edit Profile</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 rounded-lg text-muted-light hover:text-ink-700"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-xs font-semibold text-ink-700 mb-1">Display Name</label><input value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="w-full px-3 py-2 text-xs border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20" /></div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-2 border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] transition-colors">Cancel</button>
                <button onClick={handleSaveProfile} disabled={isSavingProfile} className="flex-1 py-2 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer transition-colors disabled:opacity-50">{isSavingProfile ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-line">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <h3 className="font-bold text-ink-900 text-sm">Change Password</h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="p-1 rounded-lg text-muted-light hover:text-ink-700"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-xs font-semibold text-ink-700 mb-1">Current Password</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPasswordVal(e.target.value)} className="w-full px-3 py-2 text-xs border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20" /></div>
              <div><label className="block text-xs font-semibold text-ink-700 mb-1">New Password</label><input type="password" value={newPassword} onChange={(e) => setNewPasswordVal(e.target.value)} className="w-full px-3 py-2 text-xs border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20" /></div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setIsPasswordModalOpen(false)} className="flex-1 py-2 border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] transition-colors">Cancel</button>
                <button onClick={handleChangePassword} disabled={isChangingPassword} className="flex-1 py-2 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer transition-colors disabled:opacity-50">{isChangingPassword ? 'Changing…' : 'Change Password'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
