import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Search,
  CheckCircle2,
  FileCheck2,
  ArrowLeft,
  Copy,
  Clock,
  Fingerprint,
  Sparkles,
} from 'lucide-react'
import { api } from '@/services/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { BrandMark } from '@/components/layout/Shell'

interface VerificationResult {
  verified: boolean
  match_type: 'exact' | 'perceptual_near_match' | 'none'
  status: 'authentic' | 'visually_similar' | 'unverified' | 'revoked' | 'expired'
  passport_id?: string
  brand?: string
  title?: string
  version?: number
  approved_by?: string
  issued_at?: string
  valid_until?: string
  sha256?: string
  phash_distance?: number
  caveat?: string
  error?: string
}

export default function ProofPassVerify() {
  const { id } = useParams<{ id?: string }>()
  const [tokenInput, setTokenInput] = useState(id || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [copied, setCopied] = useState(false)

  const handleVerify = async (queryVal: string) => {
    if (!queryVal.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await api.verifyPassport(queryVal.trim())
      setResult(res)
    } catch (err: any) {
      setResult({
        verified: false,
        match_type: 'none',
        status: 'unverified',
        error: err?.message || 'Verification service unreachable or certificate invalid.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      handleVerify(id)
    }
  }, [id])

  const copyHash = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#0E131F] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Top Brand Nav */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-8">
        <Link to="/" className="flex items-center gap-3 text-slate-200 hover:text-white transition">
          <BrandMark size={28} />
          <span className="font-bold tracking-tight text-lg text-white">PRECEDENT</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            ProofPass™
          </span>
        </Link>
        <Link to="/login" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Workspace
        </Link>
      </div>

      {/* Main Verification Card */}
      <Card className="w-full max-w-2xl bg-[#151C2C]/90 border-slate-800 p-6 sm:p-8 shadow-2xl rounded-2xl backdrop-blur-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4 shadow-inner">
            <Fingerprint className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Public ProofPass™ Verification</h1>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
            Cryptographic proof and perceptual integrity passport issued by the Precedent Deterministic Rule Engine.
          </p>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleVerify(tokenInput)
          }}
          className="flex flex-col sm:flex-row gap-2.5 mb-8"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste Passport ID (pass_...) or JWT certificate token"
              className="w-full bg-[#0E131F] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition shadow-inner font-mono text-xs"
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !tokenInput.trim()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Verify Certificate
          </Button>
        </form>

        {/* Result Display */}
        {result && (
          <div className="rounded-xl border border-slate-800/80 bg-[#0E131F]/80 p-6 space-y-5 animate-in fade-in duration-300">
            {/* Status Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                {result.status === 'authentic' && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                )}
                {result.status === 'visually_similar' && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                )}
                {(result.status === 'unverified' || result.status === 'revoked' || result.status === 'expired') && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-white">
                      {result.status === 'authentic' && 'Cryptographically Authentic'}
                      {result.status === 'visually_similar' && 'Visually Similar (Perceptual Match)'}
                      {result.status === 'revoked' && 'Certificate Revoked'}
                      {result.status === 'expired' && 'Certificate Expired'}
                      {result.status === 'unverified' && 'Verification Failed'}
                    </h3>
                    <Badge
                      tone={
                        result.status === 'authentic'
                          ? 'success'
                          : result.status === 'visually_similar'
                          ? 'warn'
                          : 'danger'
                      }
                    >
                      {result.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {result.status === 'authentic' && 'Exact binary SHA-256 match confirmed against the immutable brand ledger.'}
                    {result.status === 'visually_similar' && result.caveat}
                    {result.status === 'revoked' && 'This certificate was formally revoked by a Brand Manager.'}
                    {result.status === 'unverified' && (result.error || 'No active approval passport found matching the provided token.')}
                  </p>
                </div>
              </div>
            </div>

            {/* Passport Metadata Fields */}
            {result.verified && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400">Approved Content:</span>
                  <p className="font-medium text-slate-200">{result.title || 'Marketing Asset'} (v{result.version || 1})</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400">Brand Authority:</span>
                  <p className="font-medium text-slate-200">{result.brand || 'PureGlow'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400">Approved By:</span>
                  <p className="font-medium text-slate-200">{result.approved_by || 'Brand Manager'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400">Valid Through:</span>
                  <p className="font-medium text-slate-200 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {result.valid_until ? new Date(result.valid_until).toLocaleDateString() : 'Active'}
                  </p>
                </div>
                {result.sha256 && (
                  <div className="sm:col-span-2 space-y-1 pt-2 border-t border-slate-800/60">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Immutable SHA-256 Digest:</span>
                      <button
                        onClick={() => copyHash(result.sha256!)}
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px]"
                      >
                        <Copy className="w-3 h-3" />
                        {copied ? 'Copied' : 'Copy Hash'}
                      </button>
                    </div>
                    <p className="font-mono text-[11px] text-slate-300 bg-slate-900/90 p-2 rounded-lg border border-slate-800 break-all select-all">
                      {result.sha256}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Security / Verification Rules Footer */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Precedent Deterministic Rule Engine is the sole authority for approvals.</span>
          </div>
          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
            ProofPass certificates are cryptographically signed with RS256/HS256 tokens and perceptual pHash verification. AI/ML layers operate purely in advisory roles.
          </p>
        </div>
      </Card>
    </div>
  )
}
