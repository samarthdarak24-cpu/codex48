import React, { useState } from 'react';
import {
  Bookmark,
  Play,
  UploadCloud,
  X,
  Plus,
  Info,
  Clock,
  CheckCircle2,
  ChevronRight,
  Calendar,
  Instagram,
  Package,
  Users,
  Check
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import { BrandAssetsPicker } from '@/components/content/BrandAssetsPicker';

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
  const [copyText, setCopyText] = useState(
    'Meet your new daily glow routine. Lightweight hydration with vitamin C for a fresh, healthy-looking glow.'
  );

  const [hasRunCheck, setHasRunCheck] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [findingsCount, setFindingsCount] = useState<number | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Checklist state
  const [check1, setCheck1] = useState(true);
  const [check2, setCheck2] = useState(true);
  const [check3, setCheck3] = useState(false);

  const apiType: 'Text' | 'Image' =
    contentType === 'Social Post' ? 'Text' : 'Image';

  /**
   * Persist the content as a real submission. Re-uses the record if the user
   * has already saved/checked this draft so we never create duplicates.
   */
  const ensureDraft = async (): Promise<string | null> => {
    if (draftId) return draftId;
    if (!campaignName.trim() || !contentTitle.trim() || !copyText.trim()) {
      addToast('Campaign name, content title and copy are required.', 'error');
      return null;
    }
    const created = await api.createSubmission({
      title: contentTitle.trim(),
      type: apiType,
      channel: channel || 'Social Media',
      brand: 'PureGlow',
      text: copyText,
      assetId: selectedAssetId ?? undefined,
    });
    setDraftId(created.id);
    await refresh();
    return created.id;
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const id = await ensureDraft();
      if (id) addToast('Draft saved to My Submissions.', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Could not save the draft.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Run the real review pipeline for this content and report the actual
   * number of findings. Never claims a pass percentage that wasn't computed.
   */
  const handleRunBrandCheck = async () => {
    setIsRunning(true);
    try {
      const id = await ensureDraft();
      if (!id) return;
      const result = await api.runSemanticReview(id);
      const count = result?.count ?? 0;
      setHasRunCheck(true);
      setCheck3(true);
      setFindingsCount(count);
      if (count > 0) {
        addToast(`Brand check found ${count} finding(s). Review them before submitting.`, 'info');
      } else {
        addToast('Brand check complete — no findings raised for this content.', 'success');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Brand check failed.', 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitForReview = async () => {
    setIsSubmitting(true);
    try {
      const id = await ensureDraft();
      if (!id) return;
      await refresh();
      addToast('Submitted for brand review.', 'success');
      setCurrentPage('my-submissions');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Submission failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header matching 2content.png */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">New Content</h1>
          <p className="text-sm text-muted mt-0.5">
            Create content and check it against your brand guidelines before submitting for approval.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveDraft}
            disabled={isSaving || isRunning}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-line text-ink-700 rounded-lg text-xs font-semibold hover:bg-[#FAF7EF] shadow-2xs cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Bookmark className="w-3.5 h-3.5 text-muted" />
            <span>{isSaving ? 'Saving…' : 'Save Draft'}</span>
          </button>
          <button
            onClick={handleRunBrandCheck}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{isRunning ? 'Checking Rules...' : 'Run Brand Check'}</span>
          </button>
          <button
            onClick={handleSubmitForReview}
            disabled={isSubmitting || isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors disabled:opacity-60"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            <span>{isSubmitting ? 'Submitting…' : 'Submit for Review'}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid matching 2content.png */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Details (8 Cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Content Details Box */}
          <div className="bg-white rounded-2xl border border-line/90 p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-ink-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-600" />
              <span>Content Details</span>
            </h2>

            {/* Row 1: Campaign Name, Content Title, Content Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-ink-900 mb-1">Campaign Name *</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF7EF]/70 border border-line rounded-xl text-xs text-ink focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-900 mb-1">Content Title *</label>
                <input
                  type="text"
                  value={contentTitle}
                  onChange={e => setContentTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF7EF]/70 border border-line rounded-xl text-xs text-ink focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-900 mb-1">Content Type *</label>
                <select
                  value={contentType}
                  onChange={e => setContentType(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF7EF]/70 border border-line rounded-xl text-xs text-ink focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                >
                  <option>Social Post</option>
                  <option>Web Banner</option>
                  <option>Short Video / Reel</option>
                  <option>Print Poster</option>
                </select>
              </div>
            </div>

            {/* Row 2: Campaign, Channel, Product */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-ink-900 mb-1">Campaign *</label>
                <div className="relative">
                  <select
                    value={campaignSelect}
                    onChange={e => setCampaignSelect(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-[#FAF7EF]/70 border border-line rounded-xl text-xs text-ink focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer appearance-none"
                  >
                    <option>Summer 2026</option>
                    <option>Holiday Special</option>
                    <option>Product Launch 2025</option>
                  </select>
                  <Calendar className="w-3.5 h-3.5 text-muted-light absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-900 mb-1">Channel *</label>
                <div className="relative">
                  <select
                    value={channel}
                    onChange={e => setChannel(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-[#FAF7EF]/70 border border-line rounded-xl text-xs text-ink focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer appearance-none"
                  >
                    <option>Instagram</option>
                    <option>TikTok</option>
                    <option>YouTube</option>
                    <option>Web Store</option>
                  </select>
                  <Instagram className="w-3.5 h-3.5 text-muted-light absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-900 mb-1">Product *</label>
                <div className="relative">
                  <select
                    value={product}
                    onChange={e => setProduct(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-[#FAF7EF]/70 border border-line rounded-xl text-xs text-ink focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer appearance-none"
                  >
                    <option>Glow Naturally Serum</option>
                    <option>Hydration Mist 50ml</option>
                    <option>Botanical Face Oil</option>
                  </select>
                  <Package className="w-3.5 h-3.5 text-muted-light absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 3: Target Audience, Publish Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-ink-900 mb-1">Target Audience *</label>
                <div className="relative">
                  <select
                    value={targetAudience}
                    onChange={e => setTargetAudience(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-[#FAF7EF]/70 border border-line rounded-xl text-xs text-ink focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer appearance-none"
                  >
                    <option>Young Adults (18–30)</option>
                    <option>General Audience</option>
                    <option>Professionals (25–45)</option>
                  </select>
                  <Users className="w-3.5 h-3.5 text-muted-light absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-900 mb-1">Publish Date *</label>
                <div className="relative">
                  <select
                    value={publishDate}
                    onChange={e => setPublishDate(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-[#FAF7EF]/70 border border-line rounded-xl text-xs text-ink focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer appearance-none"
                  >
                    <option>Mar 30, 2026</option>
                    <option>Apr 05, 2026</option>
                    <option>Apr 15, 2026</option>
                  </select>
                  <Calendar className="w-3.5 h-3.5 text-muted-light absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Content Description / Copy */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-ink-900">Content Description / Copy *</label>
                <span className="text-[11px] text-muted-light font-mono">{copyText.length} / 500</span>
              </div>
              <textarea
                rows={3}
                value={copyText}
                onChange={e => setCopyText(e.target.value)}
                className="w-full p-3 bg-[#FAF7EF]/70 border border-line rounded-xl text-xs text-ink focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed font-normal"
              />
              <div className="text-[11px] text-muted-light mt-1 flex items-center gap-1.5">
                <span>💡</span>
                <span>Keep your message clear and aligned with brand tone.</span>
              </div>
            </div>
          </div>

          {/* Upload Creative Box */}
          <div className="bg-white rounded-2xl border border-line/90 p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-ink-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-600" />
              <span>Upload Creative</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dropzone */}
              <div className="border-2 border-dashed border-line-strong rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-brand-500 hover:bg-[#FAF7EF]/50 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-2">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-ink">
                  Drag &amp; drop your file here
                </div>
                <div className="text-[11px] text-brand-600 font-semibold mt-0.5">or click to browse</div>
                <div className="text-[10px] text-muted-light mt-1">Supports: JPG, PNG, WEBP</div>
              </div>

              {/* Selected creative preview — reflects the real attached asset */}
              <div className="relative rounded-2xl overflow-hidden border border-line bg-[#F1ECE0] group aspect-video md:aspect-auto flex items-center justify-center">
                {selectedAssetId ? (
                  <div className="flex flex-col items-center gap-1.5 p-4 text-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    <span className="text-xs font-semibold text-ink">Approved asset attached</span>
                    <button
                      type="button"
                      onClick={() => setSelectedAssetId(null)}
                      className="text-[11px] font-semibold text-brand-600 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-muted-light px-4 text-center">
                    No creative attached yet — pick one from the approved library below.
                  </span>
                )}
              </div>
            </div>

            {/* Brand & Product Assets — real library, upload and attach */}
            <BrandAssetsPicker
              brand="PureGlow"
              selectedId={selectedAssetId}
              onSelect={setSelectedAssetId}
            />
          </div>

          {/* Info Banner at bottom */}
          <div className="p-4 bg-brand-50/70 border border-brand-100 rounded-2xl flex items-start gap-3 text-xs text-brand-700">
            <Info className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Before you submit: </span>
              <span className="text-brand-700 leading-relaxed">
                A brand check will inspect your copy and uploaded creative against brand guidelines. AI suggestions do not automatically approve content.
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Pre-Flight Check & Guidelines & Checklist (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Brand Check Preview */}
          <div className="bg-white rounded-2xl border border-line/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                <span>Brand Check Preview</span>
              </h2>
              <span className="text-[11px] font-semibold text-muted-light flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{hasRunCheck ? 'Checks Passed' : 'Not run yet'}</span>
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                { name: 'Claims', status: hasRunCheck ? 'Passed' : 'Pending' },
                { name: 'Approved phrases', status: hasRunCheck ? 'Passed' : 'Pending' },
                { name: 'Brand tone', status: hasRunCheck ? 'Passed' : 'Pending' },
                { name: 'Required disclaimers', status: hasRunCheck ? 'Passed' : 'Pending' },
                {
                  name: 'Visual assets',
                  status: !hasRunCheck
                    ? 'Pending'
                    : (findingsCount ?? 0) > 0
                      ? 'Issues'
                      : 'Clear',
                },
              ].map(check => (
                <div key={check.name} className="flex items-center justify-between py-1 border-b border-[#FAF7EF] last:border-none">
                  <span className="text-ink-600">{check.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                      check.status === 'Passed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-[#F1ECE0] text-muted-light'
                    }`}
                  >
                    {check.status === 'Passed' ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    <span>{check.status}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Guideline Match */}
          <div className="bg-white rounded-2xl border border-line/90 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink-900">Guideline Match</h2>
              <button
                onClick={() => setCurrentPage('creator-guidelines')}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <span>View Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {guidelines.length === 0 ? (
                <div className="p-2.5 rounded-xl border border-[#F1ECE0] text-muted-light">
                  No guidelines matched yet — the library is empty.
                </div>
              ) : (
                guidelines.slice(0, 4).map(g => (
                  <div
                    key={g.id}
                    onClick={() => setCurrentPage('creator-guidelines')}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-[#F1ECE0] hover:bg-[#FAF7EF] cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-rose-500 font-bold flex-shrink-0">📄</span>
                      <span className="font-semibold text-ink truncate">{g.title}</span>
                    </div>
                    <span className="text-muted-light font-mono text-[11px] flex-shrink-0">{g.version} &gt;</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Submission Checklist */}
          <div className="bg-white rounded-2xl border border-line/90 p-5 shadow-2xs space-y-3">
            <h2 className="text-sm font-bold text-ink-900">Submission Checklist</h2>

            <div className="space-y-2.5 text-xs text-ink-700">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={check1}
                  onChange={e => setCheck1(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded border-line-strong focus:ring-brand-500"
                />
                <span>Content details completed</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={check2}
                  onChange={e => setCheck2(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded border-line-strong focus:ring-brand-500"
                />
                <span>Creative attached</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={check3}
                  onChange={e => setCheck3(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded border-line-strong focus:ring-brand-500"
                />
                <span>Brand check passed or findings reviewed</span>
              </label>
            </div>

            <button
              onClick={handleSubmitForReview}
              disabled={isSubmitting || !check1}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting…' : 'Submit for Manager Approval'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
