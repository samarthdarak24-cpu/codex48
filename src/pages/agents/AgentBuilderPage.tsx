import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  GitBranch,
  GripVertical,
  Lock,
  Play,
  Redo2,
  Save,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  Undo2,
  Workflow,
  X,
} from 'lucide-react'
import { agentApi } from '@/services/api'
import type {
  AgentDetail,
  AgentRun,
  NodeCategory,
  ToolCatalog,
  ValidationResult,
  WorkflowGraph,
} from '@/lib/agentTypes'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Misc'
import { cn } from '@/lib/utils'
import { AgentGlyph, AgentStatusPill, RunStatusPill, formatDuration } from './shared'
import { RunTimeline } from './RunTimeline'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface BuilderData extends Record<string, unknown> {
  label: string
  subtype: string
  toolId?: string | null
  description?: string
  category?: string
  status?: string
  permission?: string
  approvalRequired?: boolean
  config?: Record<string, unknown>
}

type BuilderNode = Node<BuilderData>

const CATEGORY_STYLE: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  trigger: { border: 'border-brand-300', bg: 'bg-brand-50/80', text: 'text-brand-800', dot: 'bg-brand-500' },
  ai: { border: 'border-sage-300', bg: 'bg-sage-50/80', text: 'text-sage-800', dot: 'bg-sage-500' },
  tool: { border: 'border-line-strong', bg: 'bg-white', text: 'text-ink', dot: 'bg-olive-500' },
  logic: { border: 'border-warn-200', bg: 'bg-warn-50/70', text: 'text-warn-800', dot: 'bg-warn-500' },
  approval: { border: 'border-terracotta-200', bg: 'bg-terracotta-50/70', text: 'text-terracotta-800', dot: 'bg-terracotta-500' },
  output: { border: 'border-ink-200', bg: 'bg-cream-100/80', text: 'text-ink-800', dot: 'bg-ink-500' },
}

const STATUS_RING: Record<string, string> = {
  completed: 'ring-2 ring-success-400',
  running: 'ring-2 ring-brand-400 animate-pulse',
  failed: 'ring-2 ring-danger-400',
  waiting_approval: 'ring-2 ring-warn-400',
  skipped: 'opacity-60',
}

/* ------------------------------------------------------------------ */
/* Custom node                                                         */
/* ------------------------------------------------------------------ */

function BuilderNodeView({ data, selected, type }: NodeProps) {
  const node = data as unknown as BuilderData
  const style = CATEGORY_STYLE[type ?? node.category ?? 'tool'] ?? CATEGORY_STYLE.tool
  const statusRing = node.status ? STATUS_RING[node.status] ?? '' : ''

  return (
    <div
      className={cn(
        'w-[220px] rounded-xl border-2 bg-white shadow-card transition-all',
        style.border,
        style.bg,
        selected && 'shadow-lift ring-2 ring-brand-400/60',
        statusRing,
      )}
    >
      {type !== 'trigger' && (
        <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-brand-500" />
      )}
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', style.dot)} />
          <div className="min-w-0 flex-1">
            <p className={cn('truncate text-[12px] font-semibold leading-tight', style.text)}>{node.label}</p>
            <p className="mt-0.5 truncate text-[9.5px] uppercase tracking-wide text-muted">
              {node.subtype}
              {node.toolId ? ` · ${node.toolId}` : ''}
            </p>
          </div>
          {node.status === 'completed' && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success-500" />}
          {node.status === 'failed' && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-danger-500" />}
          {node.status === 'waiting_approval' && <Clock className="h-3.5 w-3.5 shrink-0 text-warn-500" />}
        </div>
        {node.description && (
          <p className="mt-1.5 line-clamp-2 text-[9.5px] leading-[13px] text-muted">{node.description}</p>
        )}
        {node.approvalRequired && (
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-warn-100 px-1.5 py-0.5 text-[8.5px] font-semibold text-warn-700">
            <Lock className="h-2.5 w-2.5" />
            Approval required
          </span>
        )}
      </div>
      {type !== 'output' && (
        <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-brand-500" />
      )}
    </div>
  )
}

const nodeTypes = {
  trigger: BuilderNodeView,
  ai: BuilderNodeView,
  tool: BuilderNodeView,
  logic: BuilderNodeView,
  approval: BuilderNodeView,
  output: BuilderNodeView,
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AgentBuilderPage() {
  return (
    <ReactFlowProvider>
      <BuilderInner />
    </ReactFlowProvider>
  )
}

function BuilderInner() {
  const { agentId = '' } = useParams()
  const navigate = useNavigate()
  const { screenToFlowPosition } = useReactFlow()

  const [agent, setAgent] = useState<AgentDetail | null>(null)
  const [catalog, setCatalog] = useState<ToolCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState<BuilderNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [testOpen, setTestOpen] = useState(false)
  const [run, setRun] = useState<AgentRun | null>(null)
  const [sideTab, setSideTab] = useState<'node' | 'run'>('node')
  const [runBusy, setRunBusy] = useState(false)

  const past = useRef<{ nodes: BuilderNode[]; edges: Edge[] }[]>([])
  const future = useRef<{ nodes: BuilderNode[]; edges: Edge[] }[]>([])

  const selected = useMemo(() => nodes.find((n) => n.id === selectedId) ?? null, [nodes, selectedId])

  /* ---------------------------- load ---------------------------- */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const [agentData, catalogData] = await Promise.all([agentApi.get(agentId), agentApi.tools()])
        if (cancelled) return
        setAgent(agentData)
        setCatalog(catalogData)
        const graph = agentData.version.workflow
        const mapped = toFlow(graph)
        setNodes(mapped.nodes)
        setEdges(mapped.edges)
        setValidation(agentData.version.validation)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the builder')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [agentId, setNodes, setEdges])

  /* ---------------------------- history ---------------------------- */
  const record = useCallback(() => {
    past.current.push({
      nodes: nodes.map((n) => ({ ...n, data: { ...n.data } })),
      edges: edges.map((e) => ({ ...e })),
    })
    if (past.current.length > 40) past.current.shift()
    future.current = []
  }, [nodes, edges])

  const undo = () => {
    const previous = past.current.pop()
    if (!previous) return
    future.current.push({ nodes, edges })
    setNodes(previous.nodes)
    setEdges(previous.edges)
  }

  const redo = () => {
    const next = future.current.pop()
    if (!next) return
    past.current.push({ nodes, edges })
    setNodes(next.nodes)
    setEdges(next.edges)
  }

  /* ---------------------------- graph editing ---------------------------- */
  const onConnect = useCallback(
    (connection: Connection) => {
      record()
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `edge-${Date.now()}`,
            animated: true,
            style: { stroke: '#4E7A3D', strokeWidth: 1.6 },
          },
          eds,
        ),
      )
    },
    [record, setEdges],
  )

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const source = nodes.find((n) => n.id === connection.source)
      const target = nodes.find((n) => n.id === connection.target)
      if (!source || !target || source.id === target.id) return false
      if (target.type === 'trigger') return false
      if (source.type === 'output') return false
      if (edges.some((e) => e.source === connection.source && e.target === connection.target)) return false
      // Cycle guard: if target can already reach source, adding this edge closes a loop.
      const adjacency = new Map<string, string[]>()
      for (const edge of edges) {
        adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge.target])
      }
      adjacency.set(source.id, [...(adjacency.get(source.id) ?? []), target.id])
      const stack = [target.id]
      const seen = new Set<string>()
      while (stack.length) {
        const current = stack.pop()!
        if (current === source.id) return false
        if (seen.has(current)) continue
        seen.add(current)
        stack.push(...(adjacency.get(current) ?? []))
      }
      return true
    },
    [nodes, edges],
  )

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const raw = event.dataTransfer.getData('application/precedent-node')
      if (!raw) return
      let payload: Record<string, unknown>
      try {
        payload = JSON.parse(raw)
      } catch {
        return
      }
      const category = String(payload.category ?? 'tool') as NodeCategory
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      record()
      const node: BuilderNode = {
        id: `${category}-${Date.now()}`,
        type: category,
        position,
        data: {
          label: String(payload.label ?? 'Node'),
          subtype: String(payload.subtype ?? category),
          toolId: (payload.toolId as string | undefined) ?? null,
          description: String(payload.description ?? ''),
          category,
          permission: payload.permission as string | undefined,
          approvalRequired: Boolean(payload.approvalRequired),
          config: {},
        },
      }
      setNodes((nds) => [...nds, node])
      setSelectedId(node.id)
      setSideTab('node')
    },
    [record, screenToFlowPosition, setNodes],
  )

  const updateSelected = (patch: Partial<BuilderData>) => {
    if (!selected) return
    record()
    setNodes((nds) =>
      nds.map((node) => (node.id === selected.id ? { ...node, data: { ...node.data, ...patch } } : node)),
    )
  }

  const deleteSelected = () => {
    if (!selected) return
    record()
    setNodes((nds) => nds.filter((n) => n.id !== selected.id))
    setEdges((eds) => eds.filter((e) => e.source !== selected.id && e.target !== selected.id))
    setSelectedId(null)
  }

  /* ---------------------------- save / publish ---------------------------- */
  const graphFromState = (): WorkflowGraph => ({
    nodes: nodes.map((node) => ({
      id: node.id,
      type: (node.type ?? 'tool') as NodeCategory,
      position: { x: node.position.x, y: node.position.y },
      data: {
        label: node.data.label,
        subtype: node.data.subtype,
        toolId: node.data.toolId ?? null,
        description: node.data.description ?? '',
        config: node.data.config ?? {},
      },
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: typeof edge.label === 'string' ? edge.label : null,
    })),
  })

  const save = async (silent = false) => {
    setSaving(true)
    setNotice(null)
    try {
      const result = await agentApi.saveWorkflow(agentId, graphFromState())
      setAgent(result.agent)
      setValidation(result.validation)
      if (!silent) {
        setNotice(
          result.validation.ok
            ? 'Workflow saved and validated.'
            : 'Workflow saved, but validation found issues.',
        )
      }
      return result.validation
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not save the workflow')
      return null
    } finally {
      setSaving(false)
    }
  }

  const publish = async () => {
    setPublishing(true)
    setNotice(null)
    try {
      const saved = await save(true)
      if (saved && !saved.ok) {
        setNotice('Fix the validation errors before publishing.')
        return
      }
      const result = await agentApi.publish(agentId)
      setAgent(result.agent)
      setValidation(result.validation)
      setNotice('Agent published.')
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Publishing failed')
    } finally {
      setPublishing(false)
    }
  }

  /* ---------------------------- test ---------------------------- */
  const runTest = async (input: Record<string, unknown>, message?: string) => {
    setRunBusy(true)
    setNotice(null)
    try {
      await save(true)
      const result = await agentApi.test(agentId, input, message)
      setRun(result.run)
      applyRunStatuses(result.run)
      setSideTab('run')
      setTestOpen(false)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'The test could not run')
    } finally {
      setRunBusy(false)
    }
  }

  const applyRunStatuses = (result: AgentRun) => {
    const byNode = new Map((result.steps ?? []).map((step) => [step.nodeId, step.status]))
    setNodes((nds) =>
      nds.map((node) => ({ ...node, data: { ...node.data, status: byNode.get(node.id) ?? 'pending' } })),
    )
  }

  const approveRun = async (decision: 'approve' | 'reject') => {
    if (!run) return
    setRunBusy(true)
    try {
      const result = await agentApi.approveRun(run.id, decision, '')
      setRun(result.run)
      applyRunStatuses(result.run)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not record the approval')
    } finally {
      setRunBusy(false)
    }
  }

  const cancelRun = async () => {
    if (!run) return
    setRunBusy(true)
    try {
      const result = await agentApi.cancelRun(run.id)
      setRun(result.run)
      applyRunStatuses(result.run)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not cancel the run')
    } finally {
      setRunBusy(false)
    }
  }

  /* ---------------------------- render ---------------------------- */
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <div className="flex items-center gap-2.5 text-xs font-medium text-muted">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
          Loading builder…
        </div>
      </div>
    )
  }

  if (error || !agent || !catalog) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-canvas px-6 text-center">
        <AlertTriangle className="h-6 w-6 text-danger-500" />
        <p className="text-sm font-semibold text-ink">{error ?? 'Builder unavailable'}</p>
        <Button variant="outline" onClick={() => navigate('/manager/agent-studio')}>
          Back to Agent Studio
        </Button>
      </div>
    )
  }

  const errorCount = validation?.errors.length ?? 0
  const warningCount = validation?.warnings.length ?? 0

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      {/* Toolbar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            onClick={() => navigate(`/manager/agents/${agent.id}`)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-cream-100 hover:text-ink"
            aria-label="Back to agent"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <AgentGlyph icon={agent.icon} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-ink">{agent.name}</p>
              <AgentStatusPill status={agent.status} />
            </div>
            <p className="text-[10px] text-muted">Workflow builder · v{agent.version.versionNumber}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {errorCount > 0 ? (
            <span className="hidden items-center gap-1 rounded-full bg-danger-50 px-2 py-1 text-[10px] font-semibold text-danger-700 sm:inline-flex">
              <AlertTriangle className="h-3 w-3" />
              {errorCount} error{errorCount === 1 ? '' : 's'}
            </span>
          ) : warningCount > 0 ? (
            <span className="hidden items-center gap-1 rounded-full bg-warn-50 px-2 py-1 text-[10px] font-semibold text-warn-700 sm:inline-flex">
              <AlertTriangle className="h-3 w-3" />
              {warningCount} warning{warningCount === 1 ? '' : 's'}
            </span>
          ) : (
            <span className="hidden items-center gap-1 rounded-full bg-success-50 px-2 py-1 text-[10px] font-semibold text-success-700 sm:inline-flex">
              <CheckCircle2 className="h-3 w-3" />
              Valid workflow
            </span>
          )}

          <Button variant="ghost" size="icon-sm" onClick={undo} disabled={past.current.length === 0} aria-label="Undo">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={redo} disabled={future.current.length === 0} aria-label="Redo">
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => save()} disabled={saving}>
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTestOpen(true)}>
            <Play className="h-3.5 w-3.5" />
            Test
          </Button>
          <Button size="sm" onClick={publish} disabled={publishing}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            {publishing ? 'Publishing…' : 'Publish'}
          </Button>
        </div>
      </header>

      {notice && (
        <div className="flex items-center justify-between gap-2 border-b border-line bg-brand-50 px-4 py-2 text-xs text-brand-800">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {notice}
          </span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="max-h-24 overflow-y-auto border-b border-line bg-cream-50 px-4 py-2 text-[11px]">
          {validation.errors.map((item) => (
            <p key={item} className="flex items-start gap-1.5 text-danger-700">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              {item}
            </p>
          ))}
          {validation.warnings.map((item) => (
            <p key={item} className="flex items-start gap-1.5 text-warn-700">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              {item}
            </p>
          ))}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Node library */}
        <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-line bg-white lg:flex">
          <div className="border-b border-line px-4 py-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <Workflow className="h-3.5 w-3.5 text-brand-500" />
              Node library
            </p>
            <p className="mt-0.5 text-[10px] text-muted">Drag a node onto the canvas.</p>
          </div>
          <div className="space-y-4 p-3">
            <LibrarySection
              title="Triggers"
              items={catalog.nodeVocabulary.triggers
                .filter((t) => t.available !== false)
                .map((t) => ({
                  category: 'trigger',
                  subtype: t.subtype,
                  label: t.label,
                  description: t.description,
                }))}
            />
            <LibrarySection
              title="AI"
              items={catalog.nodeVocabulary.ai.map((t) => ({
                category: 'ai',
                subtype: t.subtype,
                label: t.label,
              }))}
            />
            <LibrarySection
              title="Tools"
              items={catalog.tools.map((tool) => ({
                category: 'tool',
                subtype: 'tool',
                label: tool.name,
                description: tool.description,
                toolId: tool.id,
                permission: tool.permission,
                approvalRequired: tool.approvalRequired,
              }))}
            />
            <LibrarySection
              title="Logic"
              items={catalog.nodeVocabulary.logic.map((t) => ({
                category: 'logic',
                subtype: t.subtype,
                label: t.label,
              }))}
            />
            <LibrarySection
              title="Human approval"
              items={catalog.nodeVocabulary.approval.map((t) => ({
                category: 'approval',
                subtype: t.subtype,
                label: t.label,
              }))}
            />
            <LibrarySection
              title="Output"
              items={catalog.nodeVocabulary.output.map((t) => ({
                category: 'output',
                subtype: t.subtype,
                label: t.label,
              }))}
            />
          </div>
        </aside>

        {/* Canvas */}
        <div className="relative min-w-0 flex-1" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => {
              setSelectedId(node.id)
              setSideTab('node')
            }}
            onPaneClick={() => setSelectedId(null)}
            onNodeDragStart={record}
            isValidConnection={isValidConnection}
            nodeTypes={nodeTypes}
            fitView
            colorMode="light"
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ animated: true, style: { stroke: '#4E7A3D', strokeWidth: 1.6 } }}
            deleteKeyCode={['Backspace', 'Delete']}
            className="precedent-flow"
          >
            <Background gap={18} size={1.4} color="#E7E1D3" />
            <Controls showInteractive={false} className="!rounded-xl !border !border-line !bg-white !shadow-card" />
            <MiniMap
              pannable
              zoomable
              className="!rounded-xl !border !border-line !bg-white !shadow-card"
              nodeColor={(node) => {
                const category = (node.type ?? 'tool') as string
                return (
                  {
                    trigger: '#4E7A3D',
                    ai: '#7A9064',
                    tool: '#6B7350',
                    logic: '#C4891C',
                    approval: '#C2664A',
                    output: '#33393B',
                  }[category] ?? '#6B7350'
                )
              }}
            />
          </ReactFlow>

          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-2xl border border-dashed border-line-strong bg-white/80 px-6 py-5 text-center backdrop-blur">
                <Workflow className="mx-auto h-5 w-5 text-brand-500" />
                <p className="mt-2 text-sm font-semibold text-ink">Start with a trigger</p>
                <p className="mt-0.5 text-xs text-muted">Drag a node from the library onto the canvas.</p>
              </div>
            </div>
          )}
        </div>

        {/* Inspector */}
        <aside className="flex w-[320px] shrink-0 flex-col overflow-hidden border-l border-line bg-white">
          <div className="flex shrink-0 border-b border-line">
            <button
              onClick={() => setSideTab('node')}
              className={cn(
                'flex-1 px-3 py-2.5 text-xs font-semibold transition-colors',
                sideTab === 'node' ? 'border-b-2 border-brand-500 text-brand-700' : 'text-muted hover:text-ink',
              )}
            >
              Node
            </button>
            <button
              onClick={() => setSideTab('run')}
              className={cn(
                'flex-1 px-3 py-2.5 text-xs font-semibold transition-colors',
                sideTab === 'run' ? 'border-b-2 border-brand-500 text-brand-700' : 'text-muted hover:text-ink',
              )}
            >
              Run {run ? <span className="ml-1 text-[10px] text-muted">({run.status})</span> : null}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sideTab === 'node' ? (
              selected ? (
                <NodeInspector
                  node={selected}
                  catalog={catalog}
                  onUpdate={updateSelected}
                  onDelete={deleteSelected}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                  <GitBranch className="h-5 w-5 text-muted-light" />
                  <p className="text-xs font-semibold text-ink">Select a node</p>
                  <p className="text-[11px] leading-relaxed text-muted">
                    Choose a node on the canvas to edit its label, tool and configuration.
                  </p>
                </div>
              )
            ) : run ? (
              <div className="p-3">
                <RunTimeline
                  run={run}
                  busy={runBusy}
                  onApprove={() => approveRun('approve')}
                  onReject={() => approveRun('reject')}
                  onCancel={cancelRun}
                />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                <Play className="h-5 w-5 text-muted-light" />
                <p className="text-xs font-semibold text-ink">No test run yet</p>
                <p className="text-[11px] leading-relaxed text-muted">
                  Run a test to see real node statuses, tool inputs and outputs.
                </p>
                <Button size="sm" variant="outline" onClick={() => setTestOpen(true)}>
                  Run test
                </Button>
              </div>
            )}
          </div>
        </aside>
      </div>

      <TestModal
        open={testOpen}
        onClose={() => setTestOpen(false)}
        agent={agent}
        busy={runBusy}
        onRun={runTest}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Library                                                             */
/* ------------------------------------------------------------------ */

function LibrarySection({
  title,
  items,
}: {
  title: string
  items: { category: string; subtype: string; label: string; description?: string; toolId?: string; permission?: string; approvalRequired?: boolean }[]
}) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="mb-1.5 flex w-full items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted"
      >
        {title}
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && (
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={`${item.category}-${item.subtype}-${item.toolId ?? ''}-${item.label}`}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('application/precedent-node', JSON.stringify(item))
                event.dataTransfer.effectAllowed = 'move'
              }}
              className="group flex cursor-grab items-start gap-2 rounded-lg border border-transparent px-2 py-1.5 transition-colors hover:border-line hover:bg-cream-50 active:cursor-grabbing"
            >
              <GripVertical className="mt-0.5 h-3 w-3 shrink-0 text-muted-light" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium text-ink-600 group-hover:text-ink">{item.label}</p>
                {item.toolId && <p className="truncate font-mono text-[9px] text-muted-light">{item.toolId}</p>}
              </div>
              {item.approvalRequired && <Lock className="mt-0.5 h-2.5 w-2.5 shrink-0 text-warn-500" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Inspector                                                           */
/* ------------------------------------------------------------------ */

function NodeInspector({
  node,
  catalog,
  onUpdate,
  onDelete,
}: {
  node: BuilderNode
  catalog: ToolCatalog
  onUpdate: (patch: Partial<BuilderData>) => void
  onDelete: () => void
}) {
  const category = (node.type ?? 'tool') as string
  const vocabulary =
    category === 'trigger'
      ? catalog.nodeVocabulary.triggers.filter((t) => t.available !== false)
      : category === 'ai'
        ? catalog.nodeVocabulary.ai
        : category === 'logic'
          ? catalog.nodeVocabulary.logic
          : category === 'approval'
            ? catalog.nodeVocabulary.approval
            : category === 'output'
              ? catalog.nodeVocabulary.output
              : []

  const [configText, setConfigText] = useState(() => JSON.stringify(node.data.config ?? {}, null, 2))
  const [configError, setConfigError] = useState<string | null>(null)

  useEffect(() => {
    setConfigText(JSON.stringify(node.data.config ?? {}, null, 2))
    setConfigError(null)
  }, [node.id, node.data.config])

  const applyConfig = () => {
    try {
      const parsed = configText.trim() ? JSON.parse(configText) : {}
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        setConfigError('Configuration must be a JSON object.')
        return
      }
      setConfigError(null)
      onUpdate({ config: parsed })
    } catch {
      setConfigError('Invalid JSON.')
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-cream-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-600">
            {category}
          </span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label="Delete node">
          <Trash2 className="h-3.5 w-3.5 text-danger-500" />
        </Button>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">Label</label>
        <Input
          value={node.data.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="text-xs"
        />
      </div>

      {category === 'tool' ? (
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">Tool</label>
          <Select
            value={node.data.toolId ?? ''}
            onChange={(e) => {
              const tool = catalog.tools.find((t) => t.id === e.target.value)
              onUpdate({
                toolId: e.target.value,
                label: tool?.name ?? node.data.label,
                description: tool?.description ?? node.data.description,
                permission: tool?.permission,
                approvalRequired: tool?.approvalRequired,
              })
            }}
            className="text-xs"
          >
            <option value="">Select a tool…</option>
            {catalog.tools.map((tool) => (
              <option key={tool.id} value={tool.id}>
                {tool.name} ({tool.permission})
              </option>
            ))}
          </Select>
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">Type</label>
          <Select
            value={node.data.subtype}
            onChange={(e) => {
              const item = vocabulary.find((v) => v.subtype === e.target.value)
              onUpdate({ subtype: e.target.value, label: item?.label ?? node.data.label })
            }}
            className="text-xs"
          >
            {vocabulary.map((item) => (
              <option key={item.subtype} value={item.subtype}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">Description</label>
        <Textarea
          value={node.data.description ?? ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          rows={3}
          className="text-xs"
          placeholder="What does this step do?"
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">Config (JSON)</label>
          <button onClick={applyConfig} className="text-[10px] font-semibold text-brand-600 hover:text-brand-700">
            Apply
          </button>
        </div>
        <Textarea
          value={configText}
          onChange={(e) => setConfigText(e.target.value)}
          rows={5}
          className="font-mono text-[10.5px]"
          placeholder="{}"
        />
        {configError && <p className="mt-1 text-[10px] text-danger-600">{configError}</p>}
        <p className="mt-1 text-[10px] leading-relaxed text-muted">
          Static values passed to this node. Runtime input from the run is merged on top.
        </p>
      </div>

      {node.data.approvalRequired && (
        <div className="rounded-lg border border-warn-200 bg-warn-50 px-2.5 py-2 text-[10px] leading-relaxed text-warn-800">
          This tool is protected. The runtime pauses and creates an approval request before it runs.
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Test modal                                                          */
/* ------------------------------------------------------------------ */

function TestModal({
  open,
  onClose,
  agent,
  busy,
  onRun,
}: {
  open: boolean
  onClose: () => void
  agent: AgentDetail
  busy: boolean
  onRun: (input: Record<string, unknown>, message?: string) => void
}) {
  const [submissionId, setSubmissionId] = useState('')
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')

  const properties = (agent.version.spec.input_schema?.properties as Record<string, unknown> | undefined) ?? {}
  const wantsSubmission = 'submission_id' in properties || agent.version.tools.some((t) => t.id === 'get_submission')
  const wantsQuery = 'query' in properties

  const submit = () => {
    const input: Record<string, unknown> = {}
    if (submissionId.trim()) input.submission_id = submissionId.trim()
    if (query.trim()) input.query = query.trim()
    if (message.trim()) input.text = message.trim()
    onRun(input, message.trim() || undefined)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Test this workflow"
      description="The test runs against real workspace data and records every step."
      width="max-w-lg"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            <Play className="h-3.5 w-3.5" />
            {busy ? 'Running…' : 'Run test'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {wantsSubmission && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-700">Submission ID</label>
            <Input
              value={submissionId}
              onChange={(e) => setSubmissionId(e.target.value)}
              placeholder="sub_dfac9746ad2c"
              className="font-mono text-xs"
            />
          </div>
        )}
        {wantsQuery && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-700">Query</label>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="What should the agent look up?" />
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-700">Message</label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Optional context" />
        </div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Graph mapping                                                       */
/* ------------------------------------------------------------------ */

function toFlow(graph: WorkflowGraph): { nodes: BuilderNode[]; edges: Edge[] } {
  const nodes: BuilderNode[] = (graph.nodes ?? []).map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position ?? { x: 0, y: 0 },
    data: {
      label: node.data.label,
      subtype: node.data.subtype,
      toolId: node.data.toolId ?? null,
      description: node.data.description ?? '',
      category: node.type,
      config: node.data.config ?? {},
    },
  }))
  const edges: Edge[] = (graph.edges ?? []).map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    animated: true,
    style: { stroke: '#4E7A3D', strokeWidth: 1.6 },
  }))
  return { nodes, edges }
}
