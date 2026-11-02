import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bookmark, Calendar, Check, CheckCircle2, ChevronRight, FileText, Info, Instagram, Loader2,
  Package, Play, ShieldCheck, UploadCloud, Users, X,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import {
  AnimatedBadge, AnimatedCard, AnimatedCounter, EASE, HoverLiftCard, PageTransition,
  ProcessingSpinner, ScrollReveal, SectionHeader, SuccessCheck, UploadAnimation,
} from '../../motion';

const FIELD =
  'w-full rounded-xl border border-line bg-white px-3 py-2.5 text-xs text-ink placeholder:text-muted-light focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20';

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const NewContentView: React.FC = () => {
  const { addToast, refresh, guidelines } = useApp();

  const [campaignName, setCampaignName] = useState('');
  const [contentTitle, setContentTitle] = useState('');
  const [contentType, setContentType] = useState('Social Post');
  const [campaignSelect, setCampaignSelect] = useState('Summer 2026');
  const [channel, setChannel] = useState('Instagram');
  const [product, setProduct] = useState('');
  const [targetAudience, setTargetAudience] = useState('Young Adults (18–30)');
  const [publishDate, setPublishDate] = useState('');
  const [copyText, setCopyText] = useState('');
  const [hasRunCheck, setHasRunCheck] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [findingsCount, setFindingsCount] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [check3, setCheck3] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const reduce = useReducedMotion();
  const charCount = copyText.length;

  /* Release the local preview URL when it is replaced or the view unmounts. */
  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const handleFileChange = useCallback((file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setFormError('That file type is not supported. Choose a JPG, PNG, WEBP or video file.');
      return;
    }
    setFormError(null);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPosterFile(file);
    setPosterPreviewUrl(url);
    setPreviewLoaded(false);
    setCheck2(true);
  }, []);

  const clearFile = useCallback(() => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setPosterFile(null);
    setPosterPreviewUrl(null);
    setPreviewLoaded(false);
    setCheck2(false);
  }, []);

  const handleRunBrandCheck = async () => {
    if (!copyText.trim()) {
      setFormError('Add your content copy before running a brand check.');
      addToast('Please enter content copy before running a brand check.', 'error');
      return;
    }
    setFormError(null);
    setIsRunning(true);
    try {
      const sub = await api.createSubmission({
        title: contentTitle || 'Untitled',
        type: 'Text',
        channel,
        brand: 'PureGlow',
        text: copyText,
      });
      const review = await api.runSemanticReview(sub.id);
      setFindingsCount(review.count ?? 0);
      setHasRunCheck(true);
      setCheck3(true);
      addToast(review.count === 0 ? 'Brand check passed — no issues found.' : `Brand check: ${review.count} finding(s) detected.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Brand check failed.';
      setFormError(message);
      addToast(message, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!contentTitle.trim()) {
      setFormError('Please enter a content title.');
      addToast('Please enter a content title.', 'error');
      return;
    }
    setFormError(null);
    setIsSaving(true);
    try {
      await api.createSubmission({
        title: contentTitle,
        type: 'Text',
        channel,
        brand: 'PureGlow',
        text: copyText,
      });
      addToast('Draft saved.');
      setCheck1(true);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed.';
      setFormError(message);
      addToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const checkItems = [
    { id: 'details', label: 'Content details completed', checked: check1, onChange: () => setCheck1(!check1) },
    { id: 'creative', label: 'Creative attached', checked: check2, onChange: () => setCheck2(!check2) },
    { id: 'brandcheck', label: 'Brand check passed or findings reviewed', checked: check3, onChange: () => setCheck3(!check3) },
  ];

  const matchedGuidelines = guidelines.filter((g) => g.status === 'Active').slice(0, 4);
  const brandCheckItems = [
    { label: 'Claims', icon: <FileText className="h-3.5 w-3.5" /> },
    { label: 'Approved phrases', icon: <Check className="h-3.5 w-3.5" /> },
    { label: 'Brand tone', icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    { label: 'Required disclaimers', icon: <Info className="h-3.5 w-3.5" /> },
    { label: 'Visual assets', icon: <Package className="h-3.5 w-3.5" /> },
  ];

  return (
    <PageTransition className="p-4 sm:p-6">
      <div className="mx-auto max-w-[1400px] space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-brand-600">Creator workspace</p>
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-ink">New Content</h1>
            <p className="mt-1 text-sm text-muted">
              Write the copy, attach a creative and check it against your brand guidelines before submitting.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSaveDraft}
              disabled={isSaving || isRunning}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-semibold text-ink-700 shadow-card transition-colors hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4" />}
              {isSaving ? 'Saving…' : 'Save draft'}
            </button>
            <button
              onClick={handleRunBrandCheck}
              disabled={isRunning || isSaving}
              className="btn-primary-glow inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isRunning ? 'Checking…' : 'Run brand check'}
            </button>
          </div>
        </div>

        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-xs text-danger-700"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-danger-500" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">

          {/* Main form */}
          <div className="space-y-5">
            {/* Content details */}
            <ScrollReveal className="rounded-2xl border border-line bg-white p-5 shadow-card" direction="up">
              <SectionHeader title="Content details" subtitle="Fields marked * are required." />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="campaign-name" className="mb-1.5 block text-xs font-semibold text-ink-700">
                    Campaign name <span className="text-danger-500">*</span>
                  </label>
                  <input
                    id="campaign-name"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g. Summer launch"
                    className={FIELD}
                  />
                </div>
                <div>
                  <label htmlFor="content-title" className="mb-1.5 block text-xs font-semibold text-ink-700">
                    Content title <span className="text-danger-500">*</span>
                  </label>
                  <input
                    id="content-title"
                    value={contentTitle}
                    onChange={(e) => setContentTitle(e.target.value)}
                    placeholder="Name this piece"
                    className={FIELD}
                  />
                </div>
                <div>
                  <label htmlFor="content-type" className="mb-1.5 block text-xs font-semibold text-ink-700">
                    Content type <span className="text-danger-500">*</span>
                  </label>
                  <select
                    id="content-type"
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    className={`${FIELD} cursor-pointer`}
                  >
                    <option>Social Post</option>
                    <option>Poster</option>
                    <option>Video</option>
                    <option>Document</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="campaign-select" className="mb-1.5 block text-xs font-semibold text-ink-700">
                    Campaign <span className="text-danger-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-muted-light" />
                    <select
                      id="campaign-select"
                      value={campaignSelect}
                      onChange={(e) => setCampaignSelect(e.target.value)}
                      className={`${FIELD} cursor-pointer pl-8`}
                    >
                      <option>Summer 2026</option>
                      <option>Spring 2026</option>
                      <option>Holiday 2026</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="channel" className="mb-1.5 block text-xs font-semibold text-ink-700">
                    Channel <span className="text-danger-500">*</span>
                  </label>
                  <div className="relative">
                    <Instagram className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-muted-light" />
                    <select
                      id="channel"
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                      className={`${FIELD} cursor-pointer pl-8`}
                    >
                      <option>Instagram</option>
                      <option>Facebook</option>
                      <option>Twitter</option>
                      <option>LinkedIn</option>
                      <option>Poster</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="product" className="mb-1.5 block text-xs font-semibold text-ink-700">
                    Product <span className="text-danger-500">*</span>
                  </label>
                  <div className="relative">
                    <Package className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-muted-light" />
                    <input
                      id="product"
                      value={product}
                      onChange={(e) => setProduct(e.target.value)}
                      placeholder="Product name"
                      className={`${FIELD} pl-8`}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="audience" className="mb-1.5 block text-xs font-semibold text-ink-700">
                    Target audience
                  </label>
                  <div className="relative">
                    <Users className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-muted-light" />
                    <select
                      id="audience"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      className={`${FIELD} cursor-pointer pl-8`}
                    >
                      <option>Young Adults (18–30)</option>
                      <option>Adults (30–45)</option>
                      <option>All Ages</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="publish-date" className="mb-1.5 block text-xs font-semibold text-ink-700">
                    Publish date <span className="text-danger-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-muted-light" />
                    <input
                      id="publish-date"
                      value={publishDate}
                      onChange={(e) => setPublishDate(e.target.value)}
                      placeholder="e.g. Mar 30, 2026"
                      className={`${FIELD} pl-8`}
                    />
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Copy */}
            <ScrollReveal className="rounded-2xl border border-line bg-white p-5 shadow-card" direction="up" delay={0.05}>
              <label htmlFor="copy" className="block text-sm font-semibold text-ink">
                Content description / copy <span className="text-danger-500">*</span>
              </label>
              <p className="mt-0.5 text-xs text-muted">This is the text the rule engine evaluates.</p>
              <textarea
                id="copy"
                value={copyText}
                onChange={(e) => setCopyText(e.target.value)}
                rows={6}
                className={`${FIELD} mt-3 resize-none leading-relaxed`}
                placeholder="Write your content copy here…"
              />
              <div className="mt-1.5 flex items-center justify-between">
                <p className="flex items-center gap-1 text-2xs text-muted-light">
                  <Info className="h-3 w-3" />Keep the message clear and aligned with brand tone.
                </p>
                <span className="text-2xs font-medium tabular-nums text-muted">
                  {charCount} character{charCount === 1 ? '' : 's'}
                </span>
              </div>
            </ScrollReveal>

            {/* Upload */}
            <ScrollReveal className="rounded-2xl border border-line bg-white p-5 shadow-card" direction="up" delay={0.1}>
              <SectionHeader
                title="Upload creative"
                subtitle="The file is previewed locally in your browser and is not uploaded to the server."
              />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                >
                  <UploadAnimation
                    isDragging={isDragging}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileChange(file);
                    }}
                    className="flex min-h-[190px] flex-col items-center justify-center p-6 text-center"
                  >
                    <motion.div
                      className="flex flex-col items-center"
                      animate={reduce ? undefined : { y: isDragging ? -3 : 0 }}
                      transition={{ duration: 0.2, ease: EASE }}
                    >
                      <UploadCloud
                        className={`mb-2 h-8 w-8 transition-colors ${isDragging ? 'text-brand-600' : 'text-brand-400'}`}
                      />
                      <p className="text-xs font-semibold text-ink-700">
                        {isDragging ? 'Drop to attach' : 'Drag and drop your file here'}
                      </p>
                      <label
                        htmlFor="creative-file"
                        className="mt-1 cursor-pointer text-2xs font-semibold text-brand-600 underline-offset-2 hover:underline focus-within:underline"
                      >
                        or browse your device
                      </label>
                      <input
                        id="creative-file"
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileChange(f);
                        }}
                      />
                      <p className="mt-2 text-2xs text-muted-light">JPG, PNG, WEBP or MP4</p>
                    </motion.div>
                  </UploadAnimation>
                </div>

                {posterPreviewUrl && posterFile ? (
                  <AnimatedCard className="flex flex-col gap-2 p-2">
                    <div className="relative min-h-[150px] flex-1 overflow-hidden rounded-xl border border-line bg-cream-100">
                      {!previewLoaded && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-cream-100">
                          <ProcessingSpinner size={28} />
                          <span className="text-2xs font-medium text-muted">Preparing preview…</span>
                        </div>
                      )}
                      <motion.div
                        className="h-full w-full"
                        initial={false}
                        animate={{ opacity: previewLoaded ? 1 : 0 }}
                        transition={{ duration: 0.35, ease: EASE }}
                      >
                        {posterFile.type.startsWith('video/') ? (
                          <video
                            src={posterPreviewUrl}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                            controls
                            onLoadedData={() => setPreviewLoaded(true)}
                          />
                        ) : (
                          <img
                            src={posterPreviewUrl}
                            alt="Preview of the attached creative"
                            className="h-full w-full object-cover"
                            onLoad={() => setPreviewLoaded(true)}
                          />
                        )}
                      </motion.div>
                      <button
                        onClick={clearFile}
                        aria-label="Remove attached creative"
                        className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-ink-700 shadow-card transition-colors hover:bg-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="rounded-xl border border-line bg-cream-50 px-3 py-2">
                      <p className="truncate text-2xs font-semibold text-ink-700">{posterFile.name}</p>
                      <p className="mt-0.5 text-2xs text-muted">
                        {formatBytes(posterFile.size)} · preview only, not uploaded
                      </p>
                    </div>
                  </AnimatedCard>
                ) : (
                  <div className="flex min-h-[190px] flex-col items-center justify-center rounded-2xl border border-line bg-cream-50 p-6 text-center">
                    <Package className="mb-2 h-8 w-8 text-muted-light" />
                    <p className="text-xs font-medium text-muted">No file selected</p>
                    <p className="mt-0.5 text-2xs text-muted-light">A preview will appear here.</p>
                  </div>
                )}
              </div>
            </ScrollReveal>

            {/* Info */}
            <ScrollReveal
              className="flex items-start gap-3 rounded-2xl border border-olive-200 bg-olive-50/70 p-4"
              direction="up"
              delay={0.15}
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-olive-600" />
              <p className="text-xs leading-relaxed text-olive-800">
                <strong>Before you submit:</strong> the brand check inspects your copy against stored guideline
                passages. AI suggestions are advisory and never approve content automatically.
              </p>
            </ScrollReveal>
          </div>

          {/* Right rail */}
          <div className="space-y-5">
            {/* Brand check result */}
            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <SectionHeader
                title="Brand check"
                subtitle={hasRunCheck ? 'Result of the last run.' : 'Not run in this session.'}
                actions={
                  hasRunCheck ? (
                    <AnimatedBadge tone={findingsCount === 0 ? 'sage' : 'amber'} variant="solid">
                      {findingsCount === 0 ? (
                        'Passed'
                      ) : (
                        <>
                          <AnimatedCounter value={findingsCount ?? 0} />
                          {` finding${findingsCount === 1 ? '' : 's'}`}
                        </>
                      )}
                    </AnimatedBadge>
                  ) : (
                    <AnimatedBadge tone="brand">Not run</AnimatedBadge>
                  )
                }
              />

              {isRunning && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-cream-50 px-3 py-2.5 text-2xs text-muted">
                  <ProcessingSpinner size={16} />
                  Evaluating your copy against the active rules…
                </div>
              )}

              {hasRunCheck && findingsCount === 0 && !isRunning && (
                <motion.div
                  className="mt-3 flex items-start gap-2 rounded-xl border border-sage-200 bg-sage-50 px-3 py-2.5 text-sage-700"
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <SuccessCheck size={16} />
                  <div>
                    <p className="text-xs font-semibold">No findings raised</p>
                    <p className="mt-0.5 text-2xs text-sage-700/80">
                      Every active rule passed or could not be evaluated.
                    </p>
                  </div>
                </motion.div>
              )}

              {hasRunCheck && findingsCount !== null && findingsCount > 0 && !isRunning && (
                <motion.div
                  className="mt-3 rounded-xl border border-warn-200 bg-warn-50 px-3 py-2.5"
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <p className="text-xs font-semibold text-warn-800">
                    <AnimatedCounter value={findingsCount} /> finding{findingsCount === 1 ? '' : 's'} to review
                  </p>
                  <p className="mt-0.5 text-2xs text-warn-700">
                    Open the submission in AI Review to read each finding before submitting.
                  </p>
                </motion.div>
              )}

              <div className="mt-3 space-y-1">
                {brandCheckItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between border-b border-line-soft py-1.5 text-xs last:border-0"
                  >
                    <span className="flex items-center gap-2 text-muted">
                      <span className="text-brand-500">{item.icon}</span>
                      {item.label}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-2xs font-semibold ${
                        hasRunCheck && findingsCount === 0 ? 'text-sage-600' : 'text-muted-light'
                      }`}
                    >
                      {hasRunCheck && findingsCount === 0 ? (
                        <>
                          <Check className="h-3 w-3" />Passed
                        </>
                      ) : hasRunCheck ? (
                        'Reviewed'
                      ) : (
                        'Pending'
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Guideline match */}
            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <SectionHeader
                title="Guideline match"
                subtitle={matchedGuidelines.length > 0 ? 'Active documents in this workspace.' : 'No active documents.'}
              />
              {matchedGuidelines.length === 0 ? (
                <p className="mt-3 rounded-xl border border-line bg-cream-50 px-3 py-5 text-center text-2xs text-muted">
                  No active guidelines are published yet, so nothing can be matched.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {matchedGuidelines.map((g, i) => (
                    <li key={g.id}>
                      <HoverLiftCard
                        elevation="medium"
                        delay={i * 0.05}
                        className="flex items-center gap-2 px-2.5 py-2"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-ink-700">{g.title}</span>
                          <span className="block truncate text-2xs text-muted">
                            {g.category} · {g.version}
                          </span>
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-light" />
                      </HoverLiftCard>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Checklist */}
            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <SectionHeader title="Submission checklist" subtitle="Your own record before you submit." />
              <div className="mt-3 space-y-2.5">
                {checkItems.map((item) => (
                  <label key={item.id} className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={item.onChange}
                      className="peer sr-only"
                    />
                    <motion.span
                      aria-hidden="true"
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                        item.checked
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-line-strong bg-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/30'
                      }`}
                      animate={reduce ? undefined : { scale: item.checked ? [1, 1.12, 1] : 1 }}
                      transition={{ duration: 0.26, ease: EASE }}
                    >
                      {item.checked && (
                        <motion.span
                          className="flex items-center justify-center"
                          initial={reduce ? false : { scale: 0, rotate: -25, opacity: 0 }}
                          animate={{ scale: 1, rotate: 0, opacity: 1 }}
                          transition={{ duration: 0.22, ease: EASE }}
                        >
                          <Check className="h-3 w-3" />
                        </motion.span>
                      )}
                    </motion.span>
                    <span className={`text-xs ${item.checked ? 'text-muted line-through' : 'text-ink-700'}`}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
              {check1 && check2 && check3 && (
                <motion.div
                  className="mt-3 flex items-center gap-2 rounded-xl border border-sage-200 bg-sage-50 px-2.5 py-2 text-xs font-semibold text-sage-700"
                  initial={reduce ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, ease: EASE }}
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />Ready to submit
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};
