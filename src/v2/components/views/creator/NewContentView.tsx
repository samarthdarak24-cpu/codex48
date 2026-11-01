import React, { useState } from 'react';
import {
  Bookmark, Play, UploadCloud, X, Plus, Info, Clock, CheckCircle2,
  ChevronRight, Calendar, Instagram, Package, Users, Check, FileText,
  ShieldCheck, Loader2,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';

export const NewContentView: React.FC = () => {
  const { addToast, setCurrentPage, refresh, guidelines } = useApp();

  const [campaignName, setCampaignName] = useState('Summer Product Launch');
  const [contentTitle, setContentTitle] = useState('Glow Naturally');
  const [contentType, setContentType] = useState('Social Post');
  const [campaignSelect, setCampaignSelect] = useState('Summer 2026');
  const [channel, setChannel] = useState('Instagram');
  const [product, setProduct] = useState('Glow Naturally Serum');
  const [targetAudience, setTargetAudience] = useState('Young Adults (18–30)');
  const [publishDate, setPublishDate] = useState('Mar 30, 2026');
  const [copyText, setCopyText] = useState('Meet your new daily glow routine. Lightweight hydration with vitamin C for a fresh, healthy-looking glow.');
  const [hasRunCheck, setHasRunCheck] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);
  const [findingsCount, setFindingsCount] = useState<number | null>(null);
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [check3, setCheck3] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const charCount = copyText.length;

  const handleFileChange = (file: File) => {
    setPosterFile(file);
    const url = URL.createObjectURL(file);
    setPosterPreviewUrl(url);
    setCheck2(true);
  };

  const handleRunBrandCheck = async () => {
    if (!copyText.trim()) { addToast('Please enter content copy before running a brand check.', 'error'); return; }
    setIsRunning(true);
    try {
      const sub = await api.createSubmission({ title: contentTitle || 'Untitled', type: 'Text', channel, brand: 'PureGlow', text: copyText });
      const review = await api.runSemanticReview(sub.id);
      setFindingsCount(review.count ?? 0);
      setHasRunCheck(true);
      setCheck3(true);
      addToast(review.count === 0 ? 'Brand check passed — no issues found.' : `Brand check: ${review.count} finding(s) detected.`);
    } catch (err) { addToast(err instanceof Error ? err.message : 'Brand check failed.', 'error'); }
    finally { setIsRunning(false); }
  };

  const handleSaveDraft = async () => {
    if (!contentTitle.trim()) { addToast('Please enter a content title.', 'error'); return; }
    setIsSaving(true);
    try {
      await api.createSubmission({ title: contentTitle, type: 'Text', channel, brand: 'PureGlow', text: copyText });
      await refresh(); addToast('Draft saved.'); setCheck1(true);
    } catch (err) { addToast(err instanceof Error ? err.message : 'Save failed.', 'error'); }
    finally { setIsSaving(false); }
  };

  const checkItems = [
    { id: 'details', label: 'Content details completed', checked: check1, onClick: () => setCheck1(!check1) },
    { id: 'creative', label: 'Creative attached', checked: check2, onClick: () => setCheck2(!check2) },
    { id: 'brandcheck', label: 'Brand check passed or findings reviewed', checked: check3, onClick: () => setCheck3(!check3) },
  ];

  const guidelineMatchItems = [
    { name: 'Product claims policy', version: 'v2.1' },
    { name: 'Visual identity guide', version: 'v3.0' },
    { name: 'Social media guidelines', version: 'v2.5' },
  ];

  const brandCheckItems = [
    { label: 'Claims', icon: <FileText className="w-3.5 h-3.5" /> },
    { label: 'Approved phrases', icon: <Check className="w-3.5 h-3.5" /> },
    { label: 'Brand tone', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { label: 'Required disclaimers', icon: <Info className="w-3.5 h-3.5" /> },
    { label: 'Visual assets', icon: <Package className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[32px] font-black tracking-tight leading-none mt-1 animate-count-up">New Content</h1>
          <p className="text-xs text-muted mt-0.5">Create content and check it against your brand guidelines before submitting for approval.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSaveDraft} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-white border border-line rounded-xl text-xs font-semibold text-ink-700 hover:bg-[#FAF7EF] shadow-2xs transition-colors cursor-pointer disabled:opacity-50">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4" />}Save Draft
          </button>
          <button onClick={handleRunBrandCheck} disabled={isRunning} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer shadow-2xs transition-colors cursor-pointer disabled:opacity-50">
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}Run Brand Check
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Content Details */}
          <div className="bg-white rounded-2xl border border-line shadow-2xs p-5">
            <h3 className="text-sm font-bold text-ink-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600" />Content Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1.5">Campaign Name <span className="text-red-500">*</span></label>
                <input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-line rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1.5">Content Title <span className="text-red-500">*</span></label>
                <input value={contentTitle} onChange={(e) => setContentTitle(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-line rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1.5">Content Type <span className="text-red-500">*</span></label>
                <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-line rounded-xl text-xs focus:outline-none cursor-pointer">
                  <option>Social Post</option><option>Poster</option><option>Video</option><option>Document</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1.5">Campaign <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-muted-light absolute left-3 top-2.5 pointer-events-none" />
                  <select value={campaignSelect} onChange={(e) => setCampaignSelect(e.target.value)} className="w-full pl-8 pr-3 py-2.5 bg-white border border-line rounded-xl text-xs focus:outline-none cursor-pointer">
                    <option>Summer 2026</option><option>Spring 2026</option><option>Holiday 2026</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1.5">Channel <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Instagram className="w-3.5 h-3.5 text-muted-light absolute left-3 top-2.5 pointer-events-none" />
                  <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full pl-8 pr-3 py-2.5 bg-white border border-line rounded-xl text-xs focus:outline-none cursor-pointer">
                    <option>Instagram</option><option>Facebook</option><option>Twitter</option><option>LinkedIn</option><option>Poster</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1.5">Product <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Package className="w-3.5 h-3.5 text-muted-light absolute left-3 top-2.5 pointer-events-none" />
                  <input value={product} onChange={(e) => setProduct(e.target.value)} className="w-full pl-8 pr-3 py-2.5 bg-white border border-line rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1.5">Target Audience</label>
                <div className="relative">
                  <Users className="w-3.5 h-3.5 text-muted-light absolute left-3 top-2.5 pointer-events-none" />
                  <select value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} className="w-full pl-8 pr-3 py-2.5 bg-white border border-line rounded-xl text-xs focus:outline-none cursor-pointer">
                    <option>Young Adults (18–30)</option><option>Adults (30–45)</option><option>All Ages</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1.5">Publish Date <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-muted-light absolute left-3 top-2.5 pointer-events-none" />
                  <input value={publishDate} onChange={(e) => setPublishDate(e.target.value)} className="w-full pl-8 pr-3 py-2.5 bg-white border border-line rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                </div>
              </div>
            </div>
          </div>

          {/* Content Description */}
          <div className="bg-white rounded-2xl border border-line shadow-2xs p-5">
            <label className="block text-sm font-bold text-ink-900 mb-3">Content Description / Copy <span className="text-red-500">*</span></label>
            <textarea value={copyText} onChange={(e) => setCopyText(e.target.value)} rows={5}
              className="w-full px-3 py-2.5 bg-white border border-line rounded-xl text-xs resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
              placeholder="Write your content copy here..." />
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[11px] text-muted-light flex items-center gap-1"><Info className="w-3 h-3" />Keep your message clear and aligned with brand tone.</p>
              <span className={`text-[11px] font-semibold ${charCount > 450 ? 'text-amber-600' : 'text-muted'}`}>{charCount} / 500</span>
            </div>
          </div>

          {/* Upload Creative */}
          <div className="bg-white rounded-2xl border border-line shadow-2xs p-5">
            <h3 className="text-sm font-bold text-ink-900 mb-3 flex items-center gap-2"><UploadCloud className="w-4 h-4 text-brand-600" />Upload Creative</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Drop zone */}
              <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center border-2 border-dashed border-line rounded-xl p-6 cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-colors">
                <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }} />
                <UploadCloud className="w-8 h-8 text-brand-400 mb-2" />
                <p className="text-xs font-semibold text-ink-700">Drag & drop your file here</p>
                <p className="text-[11px] text-brand-600 font-semibold mt-0.5">or click to browse</p>
                <p className="text-[10px] text-muted-light mt-1.5">Supports: JPG, PNG, WEBP</p>
              </div>
              {/* Preview */}
              {posterPreviewUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-line bg-[#F1ECE0]">
                  <img src={posterPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button onClick={() => { setPosterFile(null); setPosterPreviewUrl(null); setCheck2(false); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center text-ink-700 hover:bg-white shadow-sm cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl bg-[#FAF7EF] border border-line p-4 text-center">
                  <Package className="w-8 h-8 text-muted-light mb-2" />
                  <p className="text-xs text-muted">No file selected yet</p>
                </div>
              )}
            </div>
            <button className="mt-3 flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 cursor-pointer">
              <Plus className="w-3.5 h-3.5" />Add another asset
            </button>
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-blue-800 leading-relaxed"><strong>Before you submit:</strong> A brand check will inspect your copy and uploaded creative against brand guidelines. AI suggestions do not automatically approve content.</p>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Brand Check Preview */}
          <div className="bg-white rounded-2xl border border-line shadow-2xs p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-brand-600" />Brand Check Preview</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${hasRunCheck ? (findingsCount === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200') : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                {hasRunCheck ? (findingsCount === 0 ? '✓ Passed' : `⚠ ${findingsCount} issues`) : '⏱ Not run yet'}
              </span>
            </div>
            <div className="space-y-2">
              {brandCheckItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-[#F5F0E8] last:border-0 text-xs">
                  <div className="flex items-center gap-2 text-muted">
                    <span className="text-brand-500">{item.icon}</span>{item.label}
                  </div>
                  <span className={`text-[10px] font-semibold flex items-center gap-1 ${hasRunCheck && findingsCount === 0 ? 'text-emerald-600' : 'text-muted-light'}`}>
                    {hasRunCheck && findingsCount === 0 ? <><Check className="w-3 h-3" />Passed</> : <><Clock className="w-3 h-3" />Pending</>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Guideline Match */}
          <div className="bg-white rounded-2xl border border-line shadow-2xs p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2"><FileText className="w-4 h-4 text-brand-600" />Guideline Match</h3>
              <button className="text-[11px] text-brand-600 font-semibold hover:underline cursor-pointer">View Details →</button>
            </div>
            <div className="space-y-2">
              {guidelineMatchItems.map((g) => (
                <div key={g.name} className="flex items-center gap-2 p-2.5 bg-[#FAF7EF] rounded-xl border border-line cursor-pointer hover:bg-[#F1ECE0] transition-colors">
                  <span className="text-[10px] font-bold text-red-500 shrink-0">PDF</span>
                  <span className="flex-1 text-xs font-medium text-ink-700 truncate">{g.name}</span>
                  <span className="text-[10px] text-muted-light shrink-0">{g.version}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-light shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Submission Checklist */}
          <div className="bg-white rounded-2xl border border-line shadow-2xs p-4">
            <h3 className="text-sm font-bold text-ink-900 mb-3">Submission Checklist</h3>
            <div className="space-y-2.5">
              {checkItems.map((item) => (
                <label key={item.id} className="flex items-center gap-3 cursor-pointer">
                  <div onClick={item.onClick}
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer ${item.checked ? 'bg-brand-600 border-brand-600' : 'border-line bg-white hover:border-brand-400'}`}>
                    {item.checked && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-xs ${item.checked ? 'text-ink-900 font-medium line-through text-muted' : 'text-ink-700'}`}>{item.label}</span>
                </label>
              ))}
            </div>
            {check1 && check2 && check3 && (
              <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />Ready to submit!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
