import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Eye,
  GitBranch,
  Layers,
  Loader2,
  Play,
  Plus,
  Save,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wand2,
  Workflow,
  X,
  Zap,
} from 'lucide-react'
import { nodeTypes } from './WorkflowNodes'
import type { Agent, AgentTool, WorkflowGraph } from '@/lib/types'
import { api } from '@/services/api'

interface WorkflowEditorProps {
  agent: Agent
  tools: AgentTool[]
  onSave: (workflow: WorkflowGraph) => Promise<void>
  onPublish: () => Promise<void>
  onTest: () => void
  onBack: () => void
}

const PALETTE_CATEGORIES = [
  {
    title: 'Trigger Nodes',
    items: [
      { type: 'trigger', label: 'Manual Trigger', data: { trigger_type: 'manual' }, icon: Zap, tone: 'amber' },
      { type: 'trigger', label: 'Submission Created', data: { trigger_type: 'submission_created' }, icon: Zap, tone: 'amber' },
      { type: 'trigger', label: 'Guideline Updated', data: { trigger_type: 'guideline_updated' }, icon: Zap, tone: 'amber' },
      { type: 'trigger', label: 'Rule Changed', data: { trigger_type: 'rule_changed' }, icon: Zap, tone: 'amber' },
      { type: 'trigger', label: 'Scheduled Trigger', data: { trigger_type: 'scheduled' }, icon: Zap, tone: 'amber' },
    ],
  },
  {
    title: 'AI Intelligence Nodes',
    items: [
      { type: 'ai', label: 'AI Review Summary', data: { model: 'fastapi-llm' }, icon: Sparkles, tone: 'green' },
      { type: 'ai', label: 'Claim Verification Agent', data: { model: 'fastapi-llm' }, icon: Sparkles, tone: 'green' },
      { type: 'ai', label: 'Visual Findings Synthesis', data: { model: 'fastapi-llm' }, icon: Sparkles, tone: 'green' },
      { type: 'ai', label: 'Policy Sourced Answer', data: { model: 'fastapi-llm' }, icon: Sparkles, tone: 'green' },
    ],
  },
  {
    title: 'Tool Nodes',
    items: [
      { type: 'tool', label: 'Get Submission', data: { tool_id: 'get_submission' }, icon: Cpu, tone: 'brand' },
      { type: 'tool', label: 'Run Brand Rules', data: { tool_id: 'run_brand_rules' }, icon: Cpu, tone: 'brand' },
      { type: 'tool', label: 'Search Brand Guidelines', data: { tool_id: 'search_guidelines' }, icon: Cpu, tone: 'brand' },
      { type: 'tool', label: 'Verify Evidence Citation', data: { tool_id: 'retrieve_evidence' }, icon: Cpu, tone: 'brand' },
      { type: 'tool', label: 'Check Approved Claims', data: { tool_id: 'check_approved_claims' }, icon: Cpu, tone: 'brand' },
      { type: 'tool', label: 'Get Exception Details', data: { tool_id: 'get_exception_details' }, icon: Cpu, tone: 'brand' },
      { type: 'tool', label: 'Create Review Draft', data: { tool_id: 'create_review_draft' }, icon: Cpu, tone: 'brand' },
      { type: 'tool', label: 'Analyze Visuals & OCR', data: { tool_id: 'analyze_image_visuals' }, icon: Cpu, tone: 'brand' },
      { type: 'tool', label: 'Extract Document Text', data: { tool_id: 'extract_document_text' }, icon: Cpu, tone: 'brand' },
      { type: 'tool', label: 'Get Audit History', data: { tool_id: 'get_audit_history' }, icon: Cpu, tone: 'brand' },
      { type: 'tool', label: 'Create Notification', data: { tool_id: 'create_notification' }, icon: Cpu, tone: 'brand' },
      { type: 'tool', label: 'Create Sentinel Task', data: { tool_id: 'create_sentinel_task' }, icon: Cpu, tone: 'brand' },
    ],
  },
  {
    title: 'Logic & Control Nodes',
    items: [
      { type: 'logic', label: 'If Violations > 0', data: { condition_field: 'violations_count', operator: '>', threshold: 0 }, icon: GitBranch, tone: 'ink' },
      { type: 'logic', label: 'Check Exception Status', data: { condition_field: 'has_exception', operator: '==', threshold: 1 }, icon: GitBranch, tone: 'ink' },
    ],
  },
  {
    title: 'Human Approval Nodes',
    items: [
      { type: 'human_approval', label: 'Manager Sign-Off Checkpoint', data: { action_type: 'manager_approval' }, icon: ShieldCheck, tone: 'amber' },
      { type: 'human_approval', label: 'Confirm Review Draft', data: { action_type: 'create_review_draft' }, icon: ShieldCheck, tone: 'amber' },
    ],
  },
  {
    title: 'Output Nodes',
    items: [
      { type: 'output', label: 'Return Compliance Findings', data: {}, icon: CheckCircle2, tone: 'green' },
      { type: 'output', label: 'Export Governance Summary', data: {}, icon: CheckCircle2, tone: 'green' },
    ],
  },
]

export function WorkflowEditor({
  agent,
  tools,
  onSave,
  onPublish,
  onTest,
  onBack,
}: WorkflowEditorProps) {
  const initialNodes = useMemo(() => {
    return agent.workflow?.nodes?.length
      ? agent.workflow.nodes
      : [
          { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Start' } },
          { id: 'n2', type: 'output', position: { x: 250, y: 250 }, data: { label: 'Finish' } },
        ]
  }, [agent.workflow])

  const initialEdges = useMemo(() => {
    return agent.workflow?.edges?.length
      ? agent.workflow.edges
      : [{ id: 'e1-2', source: 'n1', target: 'n2', markerEnd: { type: MarkerType.ArrowClosed } }]
  }, [agent.workflow])

  const [nodes, setNodes, onNodesChange] = useNodesState<any>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>(initialEdges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || null
  }, [nodes, selectedNodeId])

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source === params.target) return
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#2FB86B', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#2FB86B' },
          } as any,
          eds,
        ),
      )
    },
    [setEdges],
  )

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id)
  }

  const handlePaneClick = () => {
    setSelectedNodeId(null)
  }

  const handleAddNode = (template: { type: string; label: string; data: any }) => {
    const id = `node_${Date.now()}`
    const newNode: Node = {
      id,
      type: template.type,
      position: { x: 280 + Math.random() * 80, y: 180 + Math.random() * 80 },
      data: { label: template.label, ...template.data },
    }
    setNodes((nds) => [...nds, newNode])
    setSelectedNodeId(id)
  }

  const handleDeleteNode = (id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id))
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
    if (selectedNodeId === id) setSelectedNodeId(null)
  }

  const handleUpdateNodeData = (key: string, value: any) => {
    if (!selectedNodeId) return
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNodeId) {
          return {
            ...n,
            data: { ...n.data, [key]: value },
          }
        }
        return n
      }),
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveSuccess(false)
    setValidationErrors([])
    try {
      const graph: WorkflowGraph = {
        nodes,
        edges,
      }
      await onSave(graph)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    } catch (err: any) {
      setValidationErrors([err.message || 'Failed to save workflow'])
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    setValidationErrors([])
    try {
      // Save current graph first
      const graph: WorkflowGraph = { nodes, edges }
      await onSave(graph)
      // Publish
      await onPublish()
    } catch (err: any) {
      setValidationErrors([err.message || 'Validation failed. Fix errors before publishing.'])
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col overflow-hidden bg-canvas">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between border-b border-line bg-white px-5 py-3 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:bg-[#F6F4ED] hover:text-ink transition-colors"
            title="Back to Agent Studio"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-ink">{agent.name}</h1>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  agent.status === 'published'
                    ? 'bg-brand-50 text-brand-700 border border-brand-200'
                    : agent.status === 'paused'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-muted/15 text-muted border border-muted/30'
                }`}
              >
                {agent.status} (v{agent.current_version})
              </span>
            </div>
            <p className="text-[11px] text-muted truncate max-w-md">{agent.description || 'Custom workflow'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {validationErrors.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 max-w-sm truncate">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />
              <span className="truncate">{validationErrors[0]}</span>
            </div>
          )}

          {saveSuccess && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 animate-in fade-in">
              <Check className="h-3.5 w-3.5" />
              Saved
            </span>
          )}

          <button
            onClick={onTest}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-[#F6F4ED] transition-colors"
          >
            <Play className="h-3.5 w-3.5 text-brand-600 fill-brand-600" />
            <span>Test Playground</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>Save Workflow</span>
          </button>

          <button
            onClick={handlePublish}
            disabled={publishing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            <span>Publish Agent</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: 3 Columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Node Library */}
        <div className="w-64 border-r border-line bg-white p-4 overflow-y-auto space-y-5 shrink-0">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Node Library</h2>
            <p className="text-[11px] text-muted mt-0.5">Click any node to append to canvas</p>
          </div>

          <div className="space-y-4">
            {PALETTE_CATEGORIES.map((cat, idx) => (
              <div key={idx} className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-600">{cat.title}</span>
                <div className="space-y-1">
                  {cat.items.map((item, itemIdx) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={itemIdx}
                        type="button"
                        onClick={() => handleAddNode(item)}
                        className="group flex w-full items-center gap-2.5 rounded-lg border border-line/70 bg-[#FCFBF8] p-2 text-left hover:border-brand-400 hover:bg-brand-50/50 transition-all"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white border border-line group-hover:border-brand-200">
                          <Icon className="h-3.5 w-3.5 text-muted group-hover:text-brand-600" />
                        </div>
                        <span className="truncate text-xs font-medium text-ink group-hover:text-brand-800">
                          {item.label}
                        </span>
                        <Plus className="ml-auto h-3 w-3 text-muted/60 opacity-0 group-hover:opacity-100" />
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Interactive Workflow Canvas */}
        <div className="flex-1 relative h-full bg-[#FAF8F5]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            fitView
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: '#2FB86B', strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#2FB86B' },
            }}
          >
            <Background gap={16} size={1} color="#E8E2D2" />
            <Controls className="!bg-white !border-line !shadow-sm !rounded-xl" />
            <MiniMap
              nodeColor={(node) => {
                switch (node.type) {
                  case 'trigger':
                    return '#F59E0B'
                  case 'tool':
                    return '#2FB86B'
                  case 'ai':
                    return '#1E9E5A'
                  case 'human_approval':
                    return '#D97706'
                  default:
                    return '#CBD5E1'
                }
              }}
              className="!border-line !shadow-sm !rounded-xl !bg-white/80"
            />
          </ReactFlow>

          {/* Canvas Floating Info */}
          <div className="absolute bottom-4 left-4 rounded-lg bg-white/90 backdrop-blur-xs border border-line px-3 py-1.5 text-[11px] text-muted shadow-xs pointer-events-none">
            {nodes.length} nodes · {edges.length} connections · Click connection or press Del to disconnect
          </div>
        </div>

        {/* Right: Selected Node Configuration Inspector */}
        <div className="w-80 border-l border-line bg-white p-4 overflow-y-auto shrink-0 space-y-4">
          {selectedNode ? (
            <>
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700">
                    Node Configuration
                  </span>
                  <h3 className="text-sm font-bold text-ink">{selectedNode.data.label || selectedNode.id}</h3>
                </div>
                <button
                  onClick={() => handleDeleteNode(selectedNode.id)}
                  className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Delete Node"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Label Property */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-ink">Node Display Name</label>
                <input
                  type="text"
                  value={selectedNode.data.label || ''}
                  onChange={(e) => handleUpdateNodeData('label', e.target.value)}
                  className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
                />
              </div>

              {/* Tool Specific Properties */}
              {selectedNode.type === 'tool' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-ink">Bound Enterprise Tool</label>
                    <select
                      value={selectedNode.data.tool_id || ''}
                      onChange={(e) => handleUpdateNodeData('tool_id', e.target.value)}
                      className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none font-mono"
                    >
                      <option value="">-- Select Tool --</option>
                      {tools.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedNode.data.tool_id && (
                    <div className="rounded-xl border border-line bg-[#FAF9F5] p-3 text-[11px] space-y-1">
                      <span className="font-semibold text-ink">Tool Permissions:</span>
                      <p className="text-muted">
                        Category: {tools.find((t) => t.id === selectedNode.data.tool_id)?.category || 'general'}
                      </p>
                      <p className="text-muted">
                        Class: {tools.find((t) => t.id === selectedNode.data.tool_id)?.permission_class || 'read'}
                      </p>
                      {tools.find((t) => t.id === selectedNode.data.tool_id)?.requires_approval && (
                        <div className="mt-1 flex items-center gap-1 text-amber-700 font-semibold text-[10px]">
                          <Shield className="h-3 w-3" />
                          Requires Manager Approval
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Trigger Specific Properties */}
              {selectedNode.type === 'trigger' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-ink">Trigger Event Type</label>
                  <select
                    value={selectedNode.data.trigger_type || 'manual'}
                    onChange={(e) => handleUpdateNodeData('trigger_type', e.target.value)}
                    className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
                  >
                    <option value="manual">Manual / API Trigger</option>
                    <option value="submission_created">Submission Created</option>
                    <option value="guideline_updated">Guideline Updated</option>
                    <option value="rule_changed">Rule Changed</option>
                    <option value="exception_expired">Exception Expired</option>
                    <option value="scheduled">Scheduled Cron</option>
                  </select>
                </div>
              )}

              {/* AI Specific Properties */}
              {selectedNode.type === 'ai' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-ink">Inference Engine</label>
                  <input
                    type="text"
                    value={selectedNode.data.model || 'fastapi-llm'}
                    onChange={(e) => handleUpdateNodeData('model', e.target.value)}
                    className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none font-mono"
                  />
                  <p className="text-[10px] text-muted">
                    Prompt injection fence wraps untrusted text before calling the engine.
                  </p>
                </div>
              )}

              {/* Human Approval Specific Properties */}
              {selectedNode.type === 'human_approval' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
                  <span className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-amber-600" />
                    Human Review Checkpoint
                  </span>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Execution automatically halts at this node and creates an approval item. Authorized Brand Managers must confirm the action to proceed.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-center p-4 text-muted">
              <Workflow className="h-8 w-8 text-muted/40 mb-2" />
              <p className="text-xs font-semibold text-ink">No Node Selected</p>
              <p className="text-[11px] text-muted mt-1">
                Click any node on the canvas to configure its parameters, tool bindings, or triggers.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
