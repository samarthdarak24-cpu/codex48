import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import {
  AlertTriangle,
  Bot,
  CheckCircle,
  Clock,
  Cpu,
  FileCheck,
  FileText,
  Filter,
  Flame,
  GitBranch,
  Layers,
  PlayCircle,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wand2,
  Workflow,
  Zap,
} from 'lucide-react'

// 1. Trigger Node
export const TriggerNode = memo(({ data, selected }: { data: any; selected: boolean }) => {
  return (
    <div
      className={`min-w-[190px] rounded-xl border bg-white p-3 shadow-sm transition-all ${
        selected ? 'border-brand-500 ring-2 ring-brand-100 shadow-md' : 'border-[#E3DEC3]'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
          <Zap className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700">Trigger</span>
          <p className="truncate text-xs font-semibold text-ink">{data.label || 'Workflow Trigger'}</p>
        </div>
      </div>
      <div className="mt-2 text-[10px] text-muted">
        {data.trigger_type || 'manual'}
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !bg-amber-500 !border-2 !border-white" />
    </div>
  )
})

// 2. Tool Node
export const ToolNode = memo(({ data, selected }: { data: any; selected: boolean }) => {
  return (
    <div
      className={`min-w-[210px] rounded-xl border bg-white p-3 shadow-sm transition-all ${
        selected ? 'border-brand-500 ring-2 ring-brand-100 shadow-md' : 'border-[#E3DEC3]'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !bg-brand-500 !border-2 !border-white" />
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 border border-brand-200">
          <Cpu className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-700">Enterprise Tool</span>
          <p className="truncate text-xs font-semibold text-ink">{data.label || 'Tool Action'}</p>
        </div>
      </div>
      {data.tool_id && (
        <div className="mt-2 inline-block rounded bg-[#F4EFE3] px-2 py-0.5 font-mono text-[10px] text-brand-900 border border-[#E3DEC3]">
          {data.tool_id}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !bg-brand-500 !border-2 !border-white" />
    </div>
  )
})

// 3. AI Node
export const AiNode = memo(({ data, selected }: { data: any; selected: boolean }) => {
  return (
    <div
      className={`min-w-[200px] rounded-xl border bg-white p-3 shadow-sm transition-all ${
        selected ? 'border-brand-500 ring-2 ring-brand-100 shadow-md' : 'border-[#E3DEC3]'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !bg-sage-600 !border-2 !border-white" />
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EAF5EC] text-brand-700 border border-brand-200">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-700">AI Intelligence</span>
          <p className="truncate text-xs font-semibold text-ink">{data.label || 'AI Analysis'}</p>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-muted line-clamp-1">
        {data.model || 'fastapi-llm (OpenAI compatible)'}
      </p>
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !bg-sage-600 !border-2 !border-white" />
    </div>
  )
})

// 4. Human Approval Node
export const HumanApprovalNode = memo(({ data, selected }: { data: any; selected: boolean }) => {
  return (
    <div
      className={`min-w-[220px] rounded-xl border bg-white p-3 shadow-sm transition-all ${
        selected ? 'border-amber-500 ring-2 ring-amber-100 shadow-md' : 'border-[#ECD8B6]'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !bg-amber-600 !border-2 !border-white" />
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
          <ShieldAlert className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700">Human Approval</span>
          <p className="truncate text-xs font-semibold text-ink">{data.label || 'Manager Checkpoint'}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-800 font-medium">
        <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
        <span>Brand Manager sign-off required</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !bg-amber-600 !border-2 !border-white" />
    </div>
  )
})

// 5. Logic Node
export const LogicNode = memo(({ data, selected }: { data: any; selected: boolean }) => {
  return (
    <div
      className={`min-w-[190px] rounded-xl border bg-white p-3 shadow-sm transition-all ${
        selected ? 'border-brand-500 ring-2 ring-brand-100 shadow-md' : 'border-[#E3DEC3]'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !bg-ink-500 !border-2 !border-white" />
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink/5 text-ink border border-line">
          <GitBranch className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Condition Logic</span>
          <p className="truncate text-xs font-semibold text-ink">{data.label || 'If / Else Filter'}</p>
        </div>
      </div>
      <div className="mt-2 text-[10px] text-muted font-mono">
        {data.condition_field || 'violations_count'} &gt; 0
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !bg-ink-500 !border-2 !border-white" />
    </div>
  )
})

// 6. Output Node
export const OutputNode = memo(({ data, selected }: { data: any; selected: boolean }) => {
  return (
    <div
      className={`min-w-[190px] rounded-xl border bg-white p-3 shadow-sm transition-all ${
        selected ? 'border-brand-500 ring-2 ring-brand-100 shadow-md' : 'border-[#C2E4CD]'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !bg-brand-600 !border-2 !border-white" />
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700 border border-brand-200">
          <CheckCircle className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-700">Terminal Output</span>
          <p className="truncate text-xs font-semibold text-ink">{data.label || 'Return Result'}</p>
        </div>
      </div>
      <div className="mt-2 text-[10px] text-muted">Finalizes workflow and outputs</div>
    </div>
  )
})

export const nodeTypes = {
  trigger: TriggerNode,
  tool: ToolNode,
  ai: AiNode,
  human_approval: HumanApprovalNode,
  logic: LogicNode,
  output: OutputNode,
}

