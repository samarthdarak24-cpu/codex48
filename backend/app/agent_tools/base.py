"""Base classes and execution contract for Precedent Agent Tools."""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session


class ToolExecutionContext(BaseModel):
    workspace: str = "PureGlow"
    user_id: Optional[str] = None
    agent_id: Optional[str] = None
    agent_name: str = "Agent"
    run_id: Optional[str] = None
    approval_required_for_write: bool = True

    class Config:
        arbitrary_types_allowed = True


class ToolResult(BaseModel):
    success: bool
    data: Dict[str, Any] = Field(default_factory=dict)
    summary: str = ""
    error: Optional[str] = None
    ms: int = 0
    requires_approval: bool = False
    approval_action_type: Optional[str] = None
    approval_payload: Optional[Dict[str, Any]] = None


class AgentTool(ABC):
    id: str
    name: str
    description: str
    category: str
    permission_class: Literal["read", "draft", "write", "action"] = "read"
    requires_approval: bool = False
    timeout_seconds: int = 30
    input_schema: Dict[str, Any] = {}
    output_schema: Dict[str, Any] = {}

    @abstractmethod
    def run(self, db: Session, inputs: Dict[str, Any], context: ToolExecutionContext) -> ToolResult:
        """Executes the tool with database session and context."""
        pass

