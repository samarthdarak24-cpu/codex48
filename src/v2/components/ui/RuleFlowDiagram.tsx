/**
 * RuleFlowDiagram — the stored logic of a rule, drawn with React Flow.
 *
 * Every node is a real column on the rule record: the source document and page
 * the rule was extracted from, its `subject` + `condition`, the `action` the
 * engine takes, and the `scope` it applies to. Nothing is inferred, and a rule
 * with no condition simply renders "no condition stored" rather than a
 * plausible-looking placeholder.
 *
 * React Flow's attribution badge is deliberately left visible: the MIT build
 * asks that it stay unless you hold a Pro licence.
 */
import { useMemo } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useReducedMotion } from 'motion/react';
import { BookOpen, GitBranch, ShieldCheck, Target } from 'lucide-react';
import type { Rule } from '@/lib/types';

type RuleNodeData = {
  eyebrow: string;
  value: string;
  detail?: string;
  tone: 'brand' | 'sage' | 'olive' | 'terracotta';
  icon: React.ReactNode;
};

const TONE: Record<RuleNodeData['tone'], { ring: string; chip: string; eyebrow: string }> = {
  brand: { ring: 'border-brand-200', chip: 'bg-brand-50 text-brand-600', eyebrow: 'text-brand-600' },
  sage: { ring: 'border-sage-200', chip: 'bg-sage-50 text-sage-600', eyebrow: 'text-sage-600' },
  olive: { ring: 'border-olive-200', chip: 'bg-olive-50 text-olive-600', eyebrow: 'text-olive-600' },
  terracotta: {
    ring: 'border-terracotta-200',
    chip: 'bg-terracotta-50 text-terracotta-600',
    eyebrow: 'text-terracotta-600',
  },
};

function RuleNode({ data }: NodeProps) {
  const { eyebrow, value, detail, tone, icon } = data as unknown as RuleNodeData;
  const t = TONE[tone];
  return (
    <div
      className={`w-[228px] rounded-2xl border bg-white px-3.5 py-3 shadow-card ${t.ring}`}
    >
      <Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-line-strong" />
      <div className="flex items-center gap-2">
        <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${t.chip}`}>{icon}</span>
        <span className={`text-2xs font-semibold uppercase tracking-[0.08em] ${t.eyebrow}`}>
          {eyebrow}
        </span>
      </div>
      <p className="mt-1.5 line-clamp-3 text-xs font-semibold leading-snug text-ink">{value}</p>
      {detail && <p className="mt-1 line-clamp-2 text-2xs leading-relaxed text-muted">{detail}</p>}
      <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-line-strong" />
    </div>
  );
}

const nodeTypes = { rule: RuleNode };

export interface RuleFlowDiagramProps {
  rule: Rule;
  /** Human title of `rule.sourceDocId`, when the caller can resolve it. */
  sourceLabel?: string;
  height?: number;
}

export const RuleFlowDiagram: React.FC<RuleFlowDiagramProps> = ({
  rule,
  sourceLabel,
  height = 210,
}) => {
  const reduce = useReducedMotion();

  const { nodes, edges } = useMemo(() => {
    const built: Node[] = [
      {
        id: 'source',
        type: 'rule',
        position: { x: 0, y: 0 },
        data: {
          eyebrow: 'Source',
          value: sourceLabel || rule.sourceDocId || 'No source document',
          detail:
            rule.sourcePage > 0
              ? `${rule.sourceVersion || 'v1'} · page ${rule.sourcePage}`
              : rule.sourceVersion || undefined,
          tone: 'olive',
          icon: <BookOpen className="h-3 w-3" />,
        } satisfies RuleNodeData,
      },
      {
        id: 'condition',
        type: 'rule',
        position: { x: 268, y: 0 },
        data: {
          eyebrow: 'When',
          value: rule.condition?.trim() || 'No condition stored',
          detail: rule.subject?.trim() || undefined,
          tone: 'brand',
          icon: <GitBranch className="h-3 w-3" />,
        } satisfies RuleNodeData,
      },
      {
        id: 'action',
        type: 'rule',
        position: { x: 536, y: 0 },
        data: {
          eyebrow: 'Then',
          value: rule.action?.trim() || 'No action stored',
          detail: `${rule.priority} priority`,
          tone: 'terracotta',
          icon: <ShieldCheck className="h-3 w-3" />,
        } satisfies RuleNodeData,
      },
      {
        id: 'scope',
        type: 'rule',
        position: { x: 804, y: 0 },
        data: {
          eyebrow: 'Applies to',
          value: rule.scope?.trim() || 'No scope stored',
          detail: rule.code,
          tone: 'sage',
          icon: <Target className="h-3 w-3" />,
        } satisfies RuleNodeData,
      },
    ];

    const builtEdges: Edge[] = [
      { id: 'e1', source: 'source', target: 'condition' },
      { id: 'e2', source: 'condition', target: 'action' },
      { id: 'e3', source: 'action', target: 'scope' },
    ].map((e) => ({
      ...e,
      type: 'smoothstep',
      animated: !reduce,
      style: { stroke: '#DAD2C0', strokeWidth: 1.6 },
    }));

    return { nodes: built, edges: builtEdges };
  }, [rule, sourceLabel, reduce]);

  return (
    <div
      className="overflow-hidden rounded-xl border border-line bg-cream-50/60"
      style={{ height }}
      role="img"
      aria-label={`Rule logic for ${rule.code}: ${rule.condition || 'no condition'} then ${rule.action || 'no action'}`}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.16 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        minZoom={0.4}
        maxZoom={1.2}
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#E7E1D3" />
        <Controls
          showInteractive={false}
          className="!rounded-lg !border !border-line !bg-white !shadow-card [&_button]:!border-line [&_button]:!bg-white [&_button]:!text-ink-600 [&_button:hover]:!bg-cream-50"
        />
      </ReactFlow>
    </div>
  );
};
