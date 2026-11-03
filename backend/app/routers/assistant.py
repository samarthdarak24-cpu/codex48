"""FastAPI Router for Precedent Assistant.

Implements Part 9 of PRECEDENT_MASTER.md:
- Status probe with degraded notice
- Conversations CRUD & persistence
- Message exchange with grounded retrieval & citation validation
- Feedback & prompt suggestions
- Action draft confirmation
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import User, AuditEvent, utcnow
from app.assistant.models import (
    AssistantConversation,
    AssistantMessage,
    AssistantFeedback,
    AssistantActionDraft,
)
from app.assistant.service import AssistantEngine

router = APIRouter(prefix="/api/v1/assistant", tags=["Precedent Assistant"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CreateConversationIn(BaseModel):
    title: Optional[str] = None
    context_route: Optional[str] = ""
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None


class SendMessageIn(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)
    context_route: Optional[str] = None
    resource_id: Optional[str] = None


class FeedbackIn(BaseModel):
    rating: int = Field(..., description="1 for helpful, -1 for unhelpful")
    comment: Optional[str] = None


class ActionDraftConfirmIn(BaseModel):
    confirmed: bool = True
    note: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/status")
def get_assistant_status():
    """Returns the operational status of Precedent Assistant."""
    return AssistantEngine.get_status()


@router.post("/conversations")
def create_conversation(
    payload: CreateConversationIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Creates a new conversation session for the current user."""
    conv = AssistantConversation(
        workspace=current_user.workspace or "PureGlow",
        user_id=current_user.id,
        title=payload.title or "New Conversation",
        context_route=payload.context_route or "",
        resource_type=payload.resource_type,
        resource_id=payload.resource_id,
        status="active",
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)

    # Initial greeting message
    greeting = AssistantMessage(
        conversation_id=conv.id,
        sender="assistant",
        content=(
            f"Hello {current_user.name or 'there'}! I'm your Precedent Brand Governance Assistant. "
            f"I can help you review guidelines, explain compliance findings, draft copy rewrites, "
            f"and check policy rules across **{current_user.workspace}**. How can I help today?"
        ),
        citations=[],
        suggested_actions=[
            {"label": "Check Guidelines", "action_type": "navigate", "route": "/app/guidelines"},
            {"label": "Review My Content", "action_type": "navigate", "route": "/app/submissions"},
        ],
    )
    db.add(greeting)
    db.commit()

    return {
        "id": conv.id,
        "title": conv.title,
        "context_route": conv.context_route,
        "created_at": conv.created_at.isoformat() if conv.created_at else None,
        "messages": [
            {
                "id": greeting.id,
                "sender": greeting.sender,
                "content": greeting.content,
                "citations": greeting.citations,
                "suggested_actions": greeting.suggested_actions,
                "created_at": greeting.created_at.isoformat() if greeting.created_at else None,
            }
        ],
    }


@router.get("/conversations")
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists conversations for the current user in their workspace."""
    convs = (
        db.query(AssistantConversation)
        .filter(
            AssistantConversation.user_id == current_user.id,
            AssistantConversation.workspace == current_user.workspace,
            AssistantConversation.status == "active",
        )
        .order_by(AssistantConversation.updated_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": c.id,
            "title": c.title,
            "context_route": c.context_route,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }
        for c in convs
    ]


@router.get("/conversations/{conv_id}")
def get_conversation(
    conv_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves conversation details and messages."""
    conv = (
        db.query(AssistantConversation)
        .filter(
            AssistantConversation.id == conv_id,
            AssistantConversation.workspace == current_user.workspace,
        )
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = (
        db.query(AssistantMessage)
        .filter(AssistantMessage.conversation_id == conv.id)
        .order_by(AssistantMessage.created_at.asc())
        .all()
    )
    return {
        "id": conv.id,
        "title": conv.title,
        "context_route": conv.context_route,
        "status": conv.status,
        "messages": [
            {
                "id": m.id,
                "sender": m.sender,
                "content": m.content,
                "citations": m.citations or [],
                "suggested_actions": m.suggested_actions or [],
                "draft": m.draft,
                "latency_ms": m.latency_ms,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ],
    }


@router.post("/conversations/{conv_id}/messages")
def send_message(
    conv_id: str,
    payload: SendMessageIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sends a user message and generates a grounded assistant reply."""
    conv = (
        db.query(AssistantConversation)
        .filter(
            AssistantConversation.id == conv_id,
            AssistantConversation.workspace == current_user.workspace,
        )
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if payload.context_route:
        conv.context_route = payload.context_route

    # Save user message
    user_msg = AssistantMessage(
        conversation_id=conv.id,
        sender="user",
        content=payload.content,
    )
    db.add(user_msg)
    db.commit()

    # Generate assistant reply via grounded engine
    assistant_msg = AssistantEngine.process_message(
        db=db,
        user=current_user,
        conversation=conv,
        content=payload.content,
    )

    conv.updated_at = utcnow()
    db.commit()

    return {
        "user_message": {
            "id": user_msg.id,
            "sender": user_msg.sender,
            "content": user_msg.content,
            "created_at": user_msg.created_at.isoformat() if user_msg.created_at else None,
        },
        "assistant_message": {
            "id": assistant_msg.id,
            "sender": assistant_msg.sender,
            "content": assistant_msg.content,
            "citations": assistant_msg.citations or [],
            "suggested_actions": assistant_msg.suggested_actions or [],
            "draft": assistant_msg.draft,
            "latency_ms": assistant_msg.latency_ms,
            "created_at": assistant_msg.created_at.isoformat() if assistant_msg.created_at else None,
        },
    }


@router.post("/messages/{message_id}/feedback")
def submit_feedback(
    message_id: str,
    payload: FeedbackIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Records helpfulness feedback on an assistant message."""
    fb = AssistantFeedback(
        message_id=message_id,
        user_id=current_user.id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(fb)
    db.commit()
    return {"status": "ok", "message": "Feedback recorded."}


@router.post("/conversations/{conv_id}/archive")
def archive_conversation(
    conv_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Archives a conversation."""
    conv = (
        db.query(AssistantConversation)
        .filter(
            AssistantConversation.id == conv_id,
            AssistantConversation.user_id == current_user.id,
        )
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv.status = "archived"
    db.commit()
    return {"status": "ok", "message": "Conversation archived."}


@router.get("/suggestions")
def get_prompt_suggestions(
    route: str = Query("", description="Current frontend route"),
    current_user: User = Depends(get_current_user),
):
    """Returns contextual prompt suggestions based on user role and current page."""
    role = current_user.role or "creator"
    if role == "manager":
        if "queue" in route:
            return [
                "Summarise this submission's governance risks",
                "Draft a request-changes comment for the creator",
                "Which rules are violated in this revision?",
                "Has an exception been requested for this claim?",
            ]
        elif "sandbox" in route:
            return [
                "What would change if I tighten rule HEALTH-001?",
                "How many approved submissions are affected by this change?",
                "Are there overlapping date windows for this rule?",
            ]
        elif "agent-studio" in route:
            return [
                "How do I configure human approval checkpoints?",
                "Which tools can inspect OCR text on posters?",
                "Explain the execution limits for published agents.",
            ]
        return [
            "Which rule is violated most this month?",
            "Which exceptions expire in the next 14 days?",
            "Summarise recent Sentinel reassessment tasks",
            "Show high-risk submissions in the Review Queue",
        ]

    # Creator role
    if "new" in route:
        return [
            "Rewrite this claim to comply with our guidelines",
            "Which guideline covers hashtags and disclaimers?",
            "What claims are pre-approved for PureGlow serum?",
            "Help me write an exception request",
        ]
    elif "feedback" in route:
        return [
            "Why was my post flagged by the rules engine?",
            "Show me the exact brand guideline passage for this rule",
            "Suggest compliant wording for this headline",
            "What are the next steps to get this approved?",
        ]
    return [
        "Why was my latest submission flagged?",
        "Rewrite this marketing copy to pass compliance",
        "Which brand guideline covers superlatives?",
        "What does my open Sentinel task mean?",
    ]


@router.post("/actions/{draft_id}/confirm")
def confirm_action_draft(
    draft_id: str,
    payload: ActionDraftConfirmIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Confirms and applies a low-risk draft action created by the assistant."""
    draft = db.query(AssistantActionDraft).filter(AssistantActionDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Action draft not found")

    if not payload.confirmed:
        draft.status = "cancelled"
        db.commit()
        return {"status": "cancelled", "message": "Draft action cancelled."}

    draft.status = "confirmed"
    draft.confirmed_at = utcnow()
    
    # Audit event
    audit_evt = AuditEvent(
        workspace=current_user.workspace or "PureGlow",
        actor=current_user.email,
        action="assistant_action_confirmed",
        resource_type="action_draft",
        resource_id=draft.id,
        before=None,
        after=draft.payload,
    )
    db.add(audit_evt)
    db.commit()

    return {"status": "confirmed", "message": "Action applied successfully."}

