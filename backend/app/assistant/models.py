"""Precedent Assistant (In-App Chatbot) Data Models.

Implements Part 4 and Part 9 of PRECEDENT_MASTER.md:
- AssistantConversation
- AssistantMessage
- AssistantCitation
- AssistantFeedback
- AssistantActionDraft
"""
from datetime import datetime, timezone
from typing import Optional, List
import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def gen_uuid() -> str:
    return str(uuid.uuid4())


class AssistantConversation(Base):
    __tablename__ = "assistant_conversations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    workspace: Mapped[str] = mapped_column(String, nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String, default="New Conversation")
    context_route: Mapped[str] = mapped_column(String, default="")
    resource_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="active", index=True)  # active | archived
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class AssistantMessage(Base):
    __tablename__ = "assistant_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("assistant_conversations.id", ondelete="CASCADE"), index=True)
    sender: Mapped[str] = mapped_column(String, default="user")  # user | assistant | system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    citations: Mapped[list] = mapped_column(JSON, default=list)
    suggested_actions: Mapped[list] = mapped_column(JSON, default=list)
    draft: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class AssistantCitation(Base):
    __tablename__ = "assistant_citations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    message_id: Mapped[str] = mapped_column(ForeignKey("assistant_messages.id", ondelete="CASCADE"), index=True)
    passage_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    quote: Mapped[str] = mapped_column(Text, default="")
    verified: Mapped[bool] = mapped_column(Boolean, default=True)
    rejected_reason: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class AssistantFeedback(Base):
    __tablename__ = "assistant_feedback"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    message_id: Mapped[str] = mapped_column(ForeignKey("assistant_messages.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 (helpful) | -1 (unhelpful)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class AssistantActionDraft(Base):
    __tablename__ = "assistant_action_drafts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("assistant_conversations.id", ondelete="CASCADE"), index=True)
    action_type: Mapped[str] = mapped_column(String, nullable=False)  # draft_comment | draft_rewrite | draft_exception_reason | draft_notification
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String, default="pending", index=True)  # pending | confirmed | cancelled
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

