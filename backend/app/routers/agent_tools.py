"""FastAPI Router for Agent Studio — Tool Registry Catalogue."""
from typing import List
from fastapi import APIRouter, Depends

from app.deps import get_current_user
from app.models import User
from app.agents.registry import list_tools
from app.agents.schemas import ToolDefinitionOut

router = APIRouter(prefix="/api/v1", tags=["Agent Tools"])


@router.get("/agent-tools", response_model=List[ToolDefinitionOut])
def get_registered_agent_tools(user: User = Depends(get_current_user)) -> List[ToolDefinitionOut]:
    """Retrieves the catalogue of registered, safe enterprise tools."""
    return list_tools()

