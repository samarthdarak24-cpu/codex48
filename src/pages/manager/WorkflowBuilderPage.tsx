import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { api } from '@/services/api'
import type { Agent, AgentTool, WorkflowGraph } from '@/lib/types'
import { WorkflowEditor } from '@/components/agents/WorkflowEditor'
import { TestPlaygroundModal } from '@/components/agents/TestPlaygroundModal'

export default function WorkflowBuilderPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [tools, setTools] = useState<AgentTool[]>([])
  const [loading, setLoading] = useState(true)
  const [isTestOpen, setIsTestOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    if (!agentId) return
    setLoading(true)
    try {
      const [fetchedAgent, fetchedTools] = await Promise.all([
        api.agent(agentId),
        api.agentTools(),
      ])
      setAgent(fetchedAgent)
      setTools(fetchedTools)
    } catch (err: any) {
      setError(err?.message || 'Failed to load agent workflow.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [agentId])

  const handleSaveWorkflow = async (workflow: WorkflowGraph) => {
    if (!agent) return
    const updated = await api.updateAgent(agent.id, { workflow })
    setAgent(updated)
  }

  const handlePublish = async () => {
    if (!agent) return
    const updated = await api.publishAgent(agent.id)
    setAgent(updated)
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="mx-auto max-w-md p-8 text-center text-xs text-red-600">
        {error || 'Agent not found.'}
      </div>
    )
  }

  return (
    <>
      <WorkflowEditor
        agent={agent}
        tools={tools}
        onSave={handleSaveWorkflow}
        onPublish={handlePublish}
        onTest={() => setIsTestOpen(true)}
        onBack={() => navigate('/manager/agent-studio')}
      />

      {isTestOpen && (
        <TestPlaygroundModal
          isOpen={isTestOpen}
          agent={agent}
          onClose={() => setIsTestOpen(false)}
          onPublish={handlePublish}
        />
      )}
    </>
  )
}

