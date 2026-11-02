import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Sparkles, CheckCircle2, FileText, ScanLine, RotateCw, Search, BadgeCheck, Gauge, Quote,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import { api } from '@/services/api';
import type { AssetAnalysis, AiFinding } from '@/lib/types';
import { PosterCanvas, type PosterBox } from '@/components/visual/PosterCanvas';
import {
  AgentStatusCard, AnimatedBadge, AnimatedCounter, AnimatedProgress, EmptyState,
  ImageHoverEffect, ProcessingSpinner, PulseDot, RingProgress, ScanningEffect,
  SectionHeader, Stagger, StaggerItem, type AgentState,
} from '../../motion';
import { StepTrail, type StepTrailItem } from '../../detail';

type Group = 'violation' | 'review' | 'passed';

/** Maps a stored finding onto the three result groups the UI promises. */
function groupOf(type: string | undefined): Group {
  if (type === 'error') return 'violation';
  if (type === 'warning') return 'review';
  return 'passed';
}

export const AIReviewView: React.FC = () => {
  const { submissions, selectedSubmission, setSelectedSubmission, addToast, runSemanticReview } = useApp();
  const navigate = useNavigate();
  const current = selectedSubmission || submissions[0];

  const [analysis, setAnalysis] = useState<AssetAnalysis | null>(null);
  const [analysisState, setAnalysisState] = useState<'idle' | 'loading' | 'missing' | 'error'>('idle');
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [aiFindings, setAiFindings] = useState<AiFinding[]>([]);
  const [scanning, setScanning] = useState(false);
  const [activeBox, setActiveBox] = useState<number | null>(null);

  /* ---- Load the real analysis + AI findings for the selected submission ---- */
  useEffect(() => {
    let cancelled = false;
    setAnalysis(null);
    setAiFindings([]);
    setPosterUrl(null);
    setActiveBox(null);
    if (!current) { setAnalysisState('idle'); return; }

    setAnalysisState('loading');
    (async () => {
      try {
        const a = await api.analysisForSubmission(current.id);
        if (cancelled) return;
        setAnalysis(a);
        setAnalysisState('idle');
      } catch {
        if (cancelled) return;
        setAnalysisState('missing');
      }
      try {
        const findings = await api.aiFindings(current.id);
        if (!cancelled) setAiFindings(findings);
      } catch {
        if (!cancelled) setAiFindings([]);
      }
      const url = await api.fetchPosterBlobUrl(current.id);
      if (!cancelled && url) setPosterUrl(url);
    })();

    return () => { cancelled = true; };
  }, [current?.id]);

  /* ---- Overlay boxes from real measurements only ---- */
  const boxes = useMemo<PosterBox[]>(() => {
    if (!analysis) return [];
    const out: PosterBox[] = [];
    for (const c of analysis.contrastFindings || []) {
      if (!c.region) continue;
      out.push({
        box: c.region,
        tone: c.status === 'fail' ? 'danger' : 'warn',
        label: c.status === 'fail'
          ? `Contrast ${c.value?.toFixed(2)}:1`
          : 'Contrast unknown',
      });
    }
    for (const m of analysis.logoMatches || []) {
      if (!m.box) continue;
      out.push({ box: m.box, tone: 'info', label: `Logo ${Math.round((m.confidence ?? 0) * 100)}%` });
    }
    return out;
  }, [analysis]);

  const findings = current?.findings ?? [];
  const violations = findings.filter((f) => groupOf(f.type) === 'violation');
  const needsReview = findings.filter((f) => groupOf(f.type) === 'review');
  const passed = findings.filter((f) => groupOf(f.type) === 'passed');

  const score = current?.complianceScore ?? 0;

  /* ---- Review Crew states derived from stored artefacts, never invented ---- */
  const analysisReady = analysis?.status === 'complete';
  const analysisRunning = analysis?.status === 'pending' || analysis?.status === 'processing';
  const verified = aiFindings.filter((f) => f.citationVerified).length;
  const rejected = aiFindings.filter((f) => !f.citationVerified).length;

  const crew: { name: string; role: string; state: AgentState; detail: string; icon: React.ReactNode }[] = [
    {
      name: 'Intake', role: 'Submission parsing', icon: <FileText className="h-4 w-4" />,
      state: current ? 'done' : 'idle',
      detail: current ? `${current.version || 'v1'} · ${current.assetType || 'content'}` : 'No submission',
    },
    {
      name: 'VisualGuard', role: 'OCR · colour · contrast', icon: <ScanLine className="h-4 w-4" />,
      state: analysisRunning ? 'running' : analysisReady ? 'done' : analysisState === 'missing' ? 'idle' : 'idle',
      detail: analysisReady
        ? `${analysis?.textBlocks?.length ?? 0} text regions`
        : analysisRunning ? 'Analysing image…' : 'No image analysis',
    },
    {
      name: 'Retrieval', role: 'Guideline passages', icon: <Search className="h-4 w-4" />,
      state: findings.length > 0 || aiFindings.length > 0 ? 'done' : 'idle',
      detail: findings.length > 0 ? `${findings.length} findings cited` : 'Nothing retrieved yet',
    },
    {
      name: 'Evidence Verifier', role: 'Citation validation', icon: <BadgeCheck className="h-4 w-4" />,
      state: rejected > 0 ? 'error' : verified > 0 ? 'done' : 'idle',
      detail: verified + rejected > 0
        ? `${verified} verified · ${rejected} rejected`
        : 'No AI citations',
    },
    {
      name: 'Synthesis', role: 'Compliance score', icon: <Gauge className="h-4 w-4" />,
      state: current ? 'done' : 'idle',
      detail: current ? `${score}% compliance` : '—',
    },
  ];

  /* ---- The analysis pipeline — every state derived from stored artefacts ---- */
  const pipeline: StepTrailItem[] = [
    {
      label: 'Content uploaded', tone: 'olive', icon: <FileText className="h-3 w-3" />,
      state: current ? 'done' : 'pending',
      hint: current.version || current.assetType || 'content',
    },
    {
      label: 'OCR analysis', tone: 'brand', icon: <ScanLine className="h-3 w-3" />,
      state: analysisRunning ? 'active' : analysisReady ? 'done' : 'pending',
      hint: analysisReady ? `${analysis?.textBlocks?.length ?? 0} regions` : analysisRunning ? 'running…' : 'not run',
    },
    {
      label: 'Guideline search', tone: 'sage', icon: <Search className="h-3 w-3" />,
      state: findings.length > 0 || aiFindings.length > 0 ? 'done' : 'pending',
      hint: findings.length > 0 ? `${findings.length} cited` : 'no passages',
    },
    {
      label: 'Rule check', tone: 'terracotta', icon: <ShieldCheck className="h-3 w-3" />,
      state: current ? 'done' : 'pending',
      hint: `${violations.length} violation${violations.length === 1 ? '' : 's'}`,
    },
    {
      label: 'Evidence verification', tone: 'amber', icon: <BadgeCheck className="h-3 w-3" />,
      state: rejected > 0 ? 'error' : verified > 0 ? 'done' : 'pending',
      hint: verified + rejected > 0 ? `${verified} verified` : 'no citations',
    },
    {
      label: 'Review findings', tone: 'brand', icon: <Gauge className="h-3 w-3" />,
      state: current ? 'done' : 'pending',
      hint: `${score}% compliance`,
    },
  ];

  const runReview = useCallback(async () => {
    if (!current) return;
    setScanning(true);
    try {
      const res = await runSemanticReview(current.id);
      if (!res.llmConfigured) {
        addToast(
          `Review complete: ${res.count} deterministic finding(s). No language model is configured, so no AI suggestions were generated.`,
          'info',
        );
      } else {
        addToast(`Review complete: ${res.count} finding(s).`);
      }
      const fresh = await api.aiFindings(current.id).catch(() => []);
      setAiFindings(fresh);
    } catch {
      /* the context surfaces the error toast */
    } finally {
      setScanning(false);
    }
  }, [current, runSemanticReview, addToast]);

  if (!current) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title="No submissions to review"
          description="Submit content first, then run an AI review. The crew only ever reports on work that already exists in this workspace."
          action={{ label: 'Create content', onClick: () => navigate('/creator/new-content') }}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-[1400px] space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-brand-600">
              AI Review Crew
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-ink">AI Review</h1>
            <p className="mt-1 text-sm text-muted">
              Deterministic checks decide the verdict. AI only ever adds advisory suggestions.
            </p>
          </div>
          <button
            onClick={runReview}
            disabled={scanning}
            className="btn-primary-glow inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {scanning
              ? <><RotateCw className="h-3.5 w-3.5 animate-spin" />Running review…</>
              : <><Sparkles className="h-3.5 w-3.5" />Run semantic review</>}
          </button>
        </div>

        {/* Review Crew */}
        <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Review Crew</h2>
            <span className="text-2xs text-muted">
              States reflect stored analysis — not simulated progress
            </span>
          </div>
          <StepTrail steps={pipeline} label="AI analysis pipeline" className="mb-3.5" />
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            {crew.map((a, i) => (
              <AgentStatusCard
                key={a.name}
                name={a.name}
                role={a.role}
                state={a.state}
                detail={a.detail}
                icon={a.icon}
                index={i}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">

          {/* Left: poster + measured facts */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <SectionHeader
                title="Submitted creative"
                subtitle={current.title}
                actions={
                  analysisReady ? (
                    <AnimatedBadge tone="sage" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />Analysis complete
                    </AnimatedBadge>
                  ) : (
                    <AnimatedBadge tone="brand">No image analysis</AnimatedBadge>
                  )
                }
              />

              <div className="mt-4">
                {analysisState === 'loading' ? (
                  <div className="h-[320px] animate-pulse rounded-xl bg-cream-100" />
                ) : posterUrl ? (
                  <div className="relative overflow-hidden rounded-xl border border-line bg-cream-100">
                    <ImageHoverEffect>
                      <ScanningEffect active={scanning}>
                        <PosterCanvas
                          imageUrl={posterUrl}
                          boxes={boxes}
                          onBoxClick={(i) => setActiveBox(i)}
                        />
                      </ScanningEffect>
                    </ImageHoverEffect>
                    {scanning && (
                      <div className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 shadow-card">
                        <ProcessingSpinner size={14} />
                        <span className="text-2xs font-semibold text-brand-700">Scanning creative…</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-line bg-cream-50 text-center">
                    <ScanLine className="h-6 w-6 text-muted-light" />
                    <p className="mt-2 text-xs font-medium text-ink-600">No poster attached</p>
                    <p className="mt-0.5 text-2xs text-muted">
                      This submission is text-only, so there is nothing to overlay.
                    </p>
                  </div>
                )}
              </div>

              {/* Measured facts — every value comes from the analysis row */}
              {analysisReady && analysis && (
                <Stagger className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {[
                    { label: 'Text regions', value: analysis.textBlocks?.length ?? 0 },
                    { label: 'Logos found', value: analysis.logoMatches?.length ?? 0 },
                    {
                      label: 'Contrast fails',
                      value: (analysis.contrastFindings || []).filter((c) => c.status === 'fail').length,
                    },
                    { label: 'Findings', value: findings.length },
                  ].map((s) => (
                    <StaggerItem key={s.label}>
                      <div className="h-full rounded-xl border border-line bg-cream-50 px-3 py-2.5 transition-colors hover:border-brand-200">
                        <p className="text-2xs font-medium uppercase tracking-[0.05em] text-muted">{s.label}</p>
                        <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">
                          <AnimatedCounter value={s.value} />
                        </p>
                      </div>
                    </StaggerItem>
                  ))}
                </Stagger>
              )}

              {analysisReady && analysis?.summary?.background && (
                <div className="mt-2.5 flex items-center gap-2 text-2xs text-muted">
                  <span
                    className="h-4 w-4 rounded border border-line"
                    style={{ backgroundColor: analysis.summary.background }}
                  />
                  Background {analysis.summary.background} · {analysis.width}×{analysis.height}
                  {analysis.summary.aspectRatio ? ` · ${analysis.summary.aspectRatio}` : ''}
                </div>
              )}
            </div>

            {/* Deterministic violations */}
            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <SectionHeader
                title="Deterministic violations"
                subtitle="Raised by the rule engine against stored guideline passages. This is the verdict."
                actions={<AnimatedBadge tone="danger" variant="solid">{violations.length}</AnimatedBadge>}
              />
              <div className="mt-3 space-y-2">
                {violations.length === 0 ? (
                  <div className="rounded-xl border border-line bg-cream-50 px-4 py-6 text-center">
                    <CheckCircle2 className="mx-auto h-5 w-5 text-sage-500" />
                    <p className="mt-2 text-xs font-medium text-ink-600">No deterministic violations</p>
                    <p className="mt-0.5 text-2xs text-muted">Every active rule passed or could not be evaluated.</p>
                  </div>
                ) : (
                  <Stagger key={current.id} className="space-y-2">
                    {violations.map((f) => (
                      <StaggerItem key={f.id}>
                        <div className="rounded-xl border border-danger-200 bg-danger-50/60 p-3 transition-all hover:border-danger-300 hover:shadow-lift">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-ink">{f.title}</p>
                            {f.badge && (
                              <AnimatedBadge tone="danger" variant="solid" className="shrink-0">
                                {f.badge}
                              </AnimatedBadge>
                            )}
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-ink-600">{f.description}</p>
                          {f.guidelineRef && (
                            <p className="mt-1.5 flex items-center gap-1 text-2xs text-muted">
                              <FileText className="h-3 w-3" />{f.guidelineRef}
                            </p>
                          )}
                        </div>
                      </StaggerItem>
                    ))}
                  </Stagger>
                )}
              </div>
            </div>
          </div>

          {/* Right: score, review queue, AI suggestions */}
          <aside className="space-y-5">
            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                Compliance score
                {scanning && <PulseDot />}
              </h2>
              <p className="mt-0.5 text-2xs text-muted">
                100 minus weighted open findings — derived, never estimated.
              </p>
              <div className="mt-4 flex items-center gap-4">
                <div
                  className="shrink-0 rounded-full transition-shadow duration-500"
                  style={{
                    boxShadow: score >= 80
                      ? '0 0 24px -6px rgba(78,122,61,.45)'
                      : score >= 50
                        ? '0 0 24px -6px rgba(196,137,28,.45)'
                        : '0 0 24px -6px rgba(194,84,70,.45)',
                  }}
                >
                  <RingProgress
                    value={score}
                    max={100}
                    size={116}
                    stroke={10}
                    tone={score >= 80 ? 'brand' : score >= 50 ? 'amber' : 'danger'}
                    centerLabel={<AnimatedCounter value={score} suffix="%" />}
                    centerSublabel="Compliant"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <AnimatedProgress value={violations.length} max={Math.max(findings.length, 1)} tone="danger" label="Violations" showValue={false} />
                  <AnimatedProgress value={needsReview.length} max={Math.max(findings.length, 1)} tone="amber" label="Needs review" showValue={false} />
                  <AnimatedProgress value={passed.length} max={Math.max(findings.length, 1)} tone="sage" label="Passed" showValue={false} />
                </div>
              </div>
            </div>

            {/* Needs human review */}
            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <SectionHeader
                title="Needs human review"
                subtitle="The engine could not evaluate these from available evidence."
                actions={<AnimatedBadge tone="amber">{needsReview.length}</AnimatedBadge>}
              />
              <div className="mt-3 space-y-2">
                {needsReview.length === 0 ? (
                  <p className="rounded-xl border border-line bg-cream-50 px-3 py-4 text-center text-2xs text-muted">
                    Nothing is waiting on a human.
                  </p>
                ) : (
                  <Stagger key={current.id} className="space-y-2">
                    {needsReview.map((f) => (
                      <StaggerItem key={f.id}>
                        <div className="rounded-xl border border-warn-200 bg-warn-50/60 p-3 transition-all hover:border-warn-300 hover:shadow-lift">
                          <p className="text-xs font-semibold text-ink">{f.title}</p>
                          <p className="mt-1 text-2xs leading-relaxed text-ink-600">{f.description}</p>
                        </div>
                      </StaggerItem>
                    ))}
                  </Stagger>
                )}
              </div>
            </div>

            {/* AI suggestions */}
            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <SectionHeader
                title="AI suggestions"
                subtitle="Advisory only — AI never changes the verdict."
                actions={<AnimatedBadge tone="brand">{aiFindings.length}</AnimatedBadge>}
              />
              <div className="mt-3 space-y-2">
                {aiFindings.length === 0 ? (
                  <p className="rounded-xl border border-line bg-cream-50 px-3 py-4 text-center text-2xs text-muted">
                    No AI suggestions. A language model is not configured on this server, so the
                    deterministic engine is the only source of findings.
                  </p>
                ) : (
                  <Stagger key={current.id} className="space-y-2">
                    {aiFindings.map((f) => (
                      <StaggerItem key={f.id}>
                        <div className="group rounded-xl border border-olive-200 bg-olive-50/50 p-3 transition-all hover:border-olive-300 hover:shadow-lift">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-ink">{f.ruleTitle || f.ruleCode}</p>
                            <AnimatedBadge
                              tone={f.citationVerified ? 'sage' : 'danger'}
                              className="shrink-0"
                            >
                              {f.citationVerified ? 'Verified' : 'Rejected'}
                            </AnimatedBadge>
                          </div>
                          <p className="mt-1 text-2xs leading-relaxed text-ink-600">{f.rationale}</p>
                          {f.quote && (
                            <p className="mt-1.5 flex gap-1 border-l-2 border-olive-300 pl-2 text-2xs italic text-muted transition-colors group-hover:border-brand-400">
                              <Quote className="mt-0.5 h-3 w-3 shrink-0" />{f.quote}
                            </p>
                          )}
                          {!f.citationVerified && f.rejectedReason && (
                            <p className="mt-1.5 text-2xs text-danger-600">{f.rejectedReason}</p>
                          )}
                        </div>
                      </StaggerItem>
                    ))}
                  </Stagger>
                )}
              </div>
            </div>

            {/* Submission switcher */}
            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <SectionHeader title="Review another" subtitle={`${submissions.length} submissions in scope`} />
              <div className="mt-3 max-h-[240px] space-y-1.5 overflow-y-auto styled-scroll">
                {submissions.slice(0, 12).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSubmission(s)}
                    className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors ${
                      s.id === current.id
                        ? 'border-brand-300 bg-brand-50'
                        : 'border-line hover:bg-cream-50'
                    }`}
                  >
                    <img src={s.thumbnail} alt="" className="h-7 w-7 shrink-0 rounded-lg object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-2xs font-semibold text-ink">{s.title}</span>
                      <span className="block truncate text-2xs text-muted">{s.status}</span>
                    </span>
                    <span className="shrink-0 text-2xs font-semibold tabular-nums text-ink-600">
                      {s.complianceScore}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>

      </div>
    </div>
  );
};
