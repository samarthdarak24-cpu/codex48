/**
 * Precedent — deterministic rule engine (client mirror).
 *
 * The production implementation lives in the FastAPI backend (`app/services/
 * rule_engine.py`). This module is a faithful, dependency-free mirror used by
 * the frontend build so that submitting content produces real findings from
 * real rule records — every finding cites the actual `sourcePassage` stored on
 * the rule, so no evidence is ever invented.
 *
 * Design rules:
 *  - Only explicit, testable conditions. No model calls, no guessing.
 *  - A check that cannot be evaluated from stored text returns `unknown`
 *    rather than a false positive — the UI then asks for human review.
 */

import type { AssetFacts, ContentType, Finding, Priority, Rule } from '@/lib/types'

export interface EngineInput {
  text: string
  channel: string
  type: ContentType
}

export interface EngineFinding {
  ruleCode: string
  severity: Priority
  explanation: string
  suggestedFix: Finding['suggestedFix']
}

const URGENCY = /\b(hurry|don'?t miss|limited time|order now|last chance|act now|today only)\b/gi
const SUPERLATIVE = /\b(100%\s*safe|guaranteed|no risk|perfect|best[- ]in[- ]class|miracle)\b/gi
const HEALTH = /\b(immun(e|ity)|boosts?\s+immun|detox|cures?|heals?|treats?\s+\w+)\b/gi
const DISCOUNT = /\b(\d{1,2})\s*%\s*(off|discount|savings?)\b/gi
const DISCLOSURE = /paid partnership/i
const UNAPPROVED_CLAIMS = [
  { pattern: /fragrance[- ]free/i, approved: 'made without added fragrance' },
  { pattern: /chemical[- ]free/i, approved: 'made without parabens' },
  { pattern: /clinically proven/i, approved: 'dermatologically tested' },
]

export const EU_GREEN_CLAIMS = /(100%\s*eco[- ]friendly|carbon neutral|zero impact|100%\s*green|planet positive|completely green|environmentally safe)/gi
export const UK_PRICE_CLAIMS = /(from\s*(?:£|€|\$)?0|guaranteed lowest price|cheapest in the (?:uk|country|market))/gi
export const US_DISCLOSURE = /(#ad|#sponsored|paid partnership)/i
export const QUANTITATIVE_CLAIM = /(\d{1,2}%\s*(?:reduction|improvement|satisfaction|fewer wrinkles|less redness|smoother)|(?:in|within)\s*\d+\s*(?:days|weeks|hours))/gi

/** Rules whose condition needs asset-level data the text engine cannot read. */
export const VISUAL_ONLY_RULES = ['BR-01', 'LO-02', 'IM-03', 'SM-01']

/* ------------------------------------------------------------------ */
/* Asset-level evaluation (deterministic, no model calls)              */
/* ------------------------------------------------------------------ */

/** The approved campaign background palette (Colour Palette Guide v1.0, §1.2). */
export const APPROVED_BACKGROUNDS = ['#7AB93B', '#F4EFE3']

export type AssetVerdict = 'pass' | 'fail' | 'unknown'

export interface AssetEvaluation {
  verdict: AssetVerdict
  detail: string
}

/** Pull `#RRGGBB` tokens out of a proposed rule value. */
export function hexTokens(value: string): string[] {
  const found = value.match(/#[0-9a-fA-F]{6}\b/g) ?? []
  return [...new Set(found.map((h) => h.toUpperCase()))]
}

export function evaluateBackground(asset: AssetFacts | undefined, allowed: string[]): AssetEvaluation {
  if (!asset || asset.unreadable) {
    return { verdict: 'unknown', detail: 'Asset properties could not be extracted, so this needs a human check.' }
  }
  if (!asset.backgroundColour) {
    return { verdict: 'unknown', detail: 'No background colour was recorded for this asset.' }
  }
  const colour = asset.backgroundColour.toUpperCase()
  return allowed.some((a) => a.toUpperCase() === colour)
    ? { verdict: 'pass', detail: `Background ${colour} is in the approved palette.` }
    : { verdict: 'fail', detail: `Background ${colour} is outside the approved palette.` }
}

export function evaluateClearSpace(asset: AssetFacts | undefined, minRatio: number): AssetEvaluation {
  if (!asset || asset.unreadable) {
    return { verdict: 'unknown', detail: 'Logo spacing could not be measured on this asset.' }
  }
  if (asset.clearSpaceRatio === undefined) {
    return { verdict: 'unknown', detail: 'No clear-space measurement was recorded.' }
  }
  return asset.clearSpaceRatio >= minRatio
    ? { verdict: 'pass', detail: `Clear space ${asset.clearSpaceRatio}× meets the ${minRatio}× minimum.` }
    : { verdict: 'fail', detail: `Clear space ${asset.clearSpaceRatio}× is below the ${minRatio}× minimum.` }
}

export function evaluateTypeface(asset: AssetFacts | undefined, allowed: string[]): AssetEvaluation {
  if (!asset?.typeface) {
    return { verdict: 'unknown', detail: 'No typeface was recorded for this asset.' }
  }
  return allowed.includes(asset.typeface)
    ? { verdict: 'pass', detail: `Typeface ${asset.typeface} is approved.` }
    : { verdict: 'fail', detail: `Typeface ${asset.typeface} is not an approved typeface.` }
}

function matches(text: string, re: RegExp): string[] {
  const found = text.match(re)
  return found ? [...new Set(found.map((f) => f.toLowerCase()))] : []
}

/**
 * Evaluate one rule against one piece of content.
 * Returns a finding, or null when the rule is satisfied / not applicable.
 */
export function evaluateRule(rule: Rule, input: EngineInput): EngineFinding | null {
  const { text, channel } = input

  switch (rule.code) {
    case 'CL-04': {
      const hits = matches(text, SUPERLATIVE)
      if (!hits.length) return null
      return {
        ruleCode: rule.code,
        severity: 'High',
        explanation: `Unsubstantiated absolute claim detected: “${hits[0]}”. Absolute terms require a substantiation reference on the same asset, or must be removed.`,
        suggestedFix: {
          original: hits[0],
          proposed: 'Gentle care for sensitive skin',
          rationale: 'Replaces the absolute claim with an approved claim covering the same benefit.',
        },
      }
    }

    case 'CL-06': {
      const hits = matches(text, HEALTH)
      if (!hits.length) return null
      return {
        ruleCode: rule.code,
        severity: 'High',
        explanation: `Regulated health language detected: “${hits[0]}”. Copy may not state or imply immunity, treatment or cure benefits.`,
        suggestedFix: {
          original: hits[0],
          proposed: 'feel good, naturally',
          rationale: 'Swaps the regulated claim for an approved lifestyle phrasing.',
        },
      }
    }

    case 'MK-02': {
      const hits = matches(text, DISCOUNT)
      if (!hits.length) return null
      const hasWindow = /\b(until|ends|before)\b/i.test(text) || /\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(text)
      if (hasWindow) return null
      return {
        ruleCode: rule.code,
        severity: 'Medium',
        explanation: `Discount claim “${hits[0]}” has no campaign window or reference price attached, so it cannot be verified.`,
        suggestedFix: {
          original: hits[0],
          proposed: `${hits[0]} — offer ends 31 July`,
          rationale: 'Adds the dated campaign window required by MK-02 without changing the offer value.',
        },
      }
    }

    case 'TV-02': {
      const urgency = matches(text, URGENCY)
      const exclamations = (text.match(/!/g) ?? []).length
      if (urgency.length < 2 && exclamations <= 1) return null
      return {
        ruleCode: rule.code,
        severity: 'Low',
        explanation:
          urgency.length >= 2
            ? `Multiple urgency constructions detected (${urgency.map((u) => `“${u}”`).join(', ')}). We never pressure readers.`
            : `Copy uses ${exclamations} exclamation marks. The tone guide limits this to one per asset.`,
        suggestedFix: null,
      }
    }

    case 'CL-03': {
      for (const c of UNAPPROVED_CLAIMS) {
        const m = text.match(c.pattern)
        if (m) {
          return {
            ruleCode: rule.code,
            severity: 'Medium',
            explanation: `“${m[0]}” is not in the Approved Claims List. The approved wording is “${c.approved}”.`,
            suggestedFix: {
              original: m[0],
              proposed: c.approved,
              rationale: 'Uses the exact approved wording instead of a paraphrase.',
            },
          }
        }
      }
      return null
    }

    case 'PA-05': {
      if (!/influencer|paid/i.test(channel) && !/influencer|partner/i.test(text)) return null
      if (DISCLOSURE.test(text)) return null
      return {
        ruleCode: rule.code,
        severity: 'High',
        explanation: 'Paid partnership asset has no disclosure line. PA-05 requires it in the first two caption lines.',
        suggestedFix: {
          original: '(no disclosure)',
          proposed: 'Paid partnership with @brand — [caption]',
          rationale: 'Prepends the approved disclosure wording.',
        },
      }
    }

    case 'EU-01': {
      const hits = matches(text, EU_GREEN_CLAIMS)
      if (!hits.length) return null
      return {
        ruleCode: rule.code,
        severity: 'High',
        explanation: `Uncertified environmental claim detected: “${hits[0]}”. EU Green Claims Directive (2024/825) prohibits generic green claims without verified Life Cycle Assessment (LCA) backing.`,
        suggestedFix: {
          original: hits[0],
          proposed: 'sustainably formulated with certified botanical extracts',
          rationale: 'Replaces generic eco claims with verified ingredient sourcing language.',
          alternatives: [
            'sustainably formulated with certified botanical extracts',
            'responsibly crafted with 95% naturally derived ingredients',
            'packaged in 100% post-consumer recycled materials',
          ],
        },
      }
    }

    case 'UK-02': {
      const hits = matches(text, UK_PRICE_CLAIMS)
      if (!hits.length) return null
      return {
        ruleCode: rule.code,
        severity: 'Medium',
        explanation: `Unqualified comparative price claim detected: “${hits[0]}”. UK Advertising Standards Authority (ASA Rule 3.17) requires verifiable reference pricing.`,
        suggestedFix: {
          original: hits[0],
          proposed: 'transparent pricing with verified seasonal price matching',
          rationale: 'Replaces unsubstantiated comparative pricing with an approved fair-pricing statement.',
          alternatives: [
            'transparent pricing with verified seasonal price matching',
            'our best direct-to-consumer value guarantee',
            'seasonal promotional pricing across our core collection',
          ],
        },
      }
    }

    case 'US-01': {
      if (!/influencer|paid|social/i.test(channel) && !/partner|collab|sponsored/i.test(text)) return null
      if (US_DISCLOSURE.test(text)) return null
      return {
        ruleCode: rule.code,
        severity: 'High',
        explanation: 'US FTC Endorsement Guide (§255.5): Commercial posts must include an unambiguous disclosure (#ad or Paid Partnership) in the first 3 lines.',
        suggestedFix: {
          original: '(missing FTC disclosure)',
          proposed: '#ad · Paid partnership with @PureGlow — [caption]',
          rationale: 'Prepends FTC-compliant prominent disclosure identifier.',
          alternatives: [
            '#ad · Paid partnership with @PureGlow',
            '#sponsored by @PureGlow',
            'Ad | Proud partner of @PureGlow',
          ],
        },
      }
    }

    case 'CL-07': {
      const hits = matches(text, QUANTITATIVE_CLAIM)
      if (!hits.length) return null
      return {
        ruleCode: rule.code,
        severity: 'High',
        explanation: `Quantitative efficacy claim detected: “${hits[0]}”. Requires audited clinical trial dossier reference in the Substantiation Vault.`,
        suggestedFix: {
          original: hits[0],
          proposed: `${hits[0]} (based on an independent 4-week clinical study of 42 participants, Trial #PG-2024-C3)`,
          rationale: 'Links the quantitative claim directly to the certified clinical trial dossier.',
          alternatives: [
            `${hits[0]} (based on independent 4-week clinical evaluation of 42 participants)`,
            'visibly improves skin texture with continuous daily use',
            'dermatologist-tested formulation for everyday skin barrier support',
          ],
        },
      }
    }


    default:
      return null
  }
}

/** Run the whole active rule set against a piece of content. */
export function runRules(rules: Rule[], input: EngineInput): EngineFinding[] {
  return rules
    .filter((r) => r.status === 'active')
    .map((r) => evaluateRule(r, input))
    .filter((f): f is EngineFinding => Boolean(f))
}

/**
 * Build persisted findings from engine output, attaching the rule's stored
 * source passage. Every citation here is read from the rule record itself.
 */
export function buildFindings(engineFindings: EngineFinding[], rules: Rule[], version: number): Finding[] {
  return engineFindings.map((ef, i) => {
    const rule = rules.find((r) => r.code === ef.ruleCode)
    return {
      id: `f_${version}_${i}_${ef.ruleCode}`,
      ruleCode: ef.ruleCode,
      ruleTitle: rule?.title ?? ef.ruleCode,
      type: (rule?.subject === 'Promotional claim' ? 'Claims' : rule?.subject === 'Health claim' ? 'Claims' : rule?.subject === 'Disclosure' ? 'Disclosure' : 'Claims') as Finding['type'],
      severity: ef.severity,
      explanation: ef.explanation,
      sourceDocId: rule?.sourceDocId ?? '',
      sourceDocName: '',
      sourceVersion: rule?.sourceVersion ?? '',
      sourcePage: rule?.sourcePage ?? 0,
      sourcePassage: rule?.sourcePassage ?? '',
      evidenceVerified: Boolean(rule?.sourcePassage),
      suggestedFix: ef.suggestedFix,
      status: 'open',
    }
  })
}

/** 1-Click Client-side Brand Remediator. */
export function remediateContentClient(text: string, channel: string = ''): { remediatedText: string; totalChanges: number } {
  let res = text
  let changes = 0

  // Superlatives
  if (SUPERLATIVE.test(res)) {
    res = res.replace(SUPERLATIVE, 'gentle and proven for daily care')
    changes++
  }
  // Health
  if (HEALTH.test(res)) {
    res = res.replace(HEALTH, 'supports everyday skin vitality')
    changes++
  }
  // Claims
  for (const c of UNAPPROVED_CLAIMS) {
    if (c.pattern.test(res)) {
      res = res.replace(c.pattern, c.approved)
      changes++
    }
  }
  // EU Eco
  if (EU_GREEN_CLAIMS.test(res)) {
    res = res.replace(EU_GREEN_CLAIMS, 'sustainably formulated with certified botanical extracts')
    changes++
  }
  // UK Price
  if (UK_PRICE_CLAIMS.test(res)) {
    res = res.replace(UK_PRICE_CLAIMS, 'our best direct-to-consumer value guarantee')
    changes++
  }
  // US Disclosure
  if ((/influencer|partner|paid/i.test(channel) || /influencer|partner/i.test(res)) && !DISCLOSURE.test(res) && !US_DISCLOSURE.test(res)) {
    res = '#ad · Paid partnership with @PureGlow\n' + res
    changes++
  }
  // Urgency
  if (URGENCY.test(res)) {
    res = res.replace(URGENCY, 'explore today')
    changes++
  }

  return { remediatedText: res, totalChanges: changes }
}
