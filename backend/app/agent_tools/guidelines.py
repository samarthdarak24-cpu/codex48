"""Guideline and Rule search tools for Precedent Agent Studio."""
import time
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.agent_tools.base import AgentTool, ToolExecutionContext, ToolResult
from app.models import GuidelineDoc, Rule
from app.services.semantic import search_passages_hybrid


class SearchGuidelinesTool(AgentTool):
    id = "search_guidelines"
    name = "Search Brand Guidelines"
    description = "Searches official brand guideline documents and retrieves exact verified passages with citations."
    category = "guidelines"
    permission_class = "read"
    requires_approval = False
    timeout_seconds = 20
    input_schema = {
        "type": "object",
        "required": ["query"],
        "properties": {
            "query": {"type": "string", "description": "Search query or statement to verify against brand guidelines"},
            "top_k": {"type": "integer", "default": 3, "description": "Maximum number of passages to return"},
        },
    }
    output_schema = {
        "type": "object",
        "properties": {
            "passages": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "doc_name": {"type": "string"},
                        "category": {"type": "string"},
                        "page": {"type": "integer"},
                        "text": {"type": "string"},
                        "score": {"type": "number"},
                    },
                },
            },
            "retrieval_mode": {"type": "string"},
            "count": {"type": "integer"},
        },
    }

    def run(self, db: Session, inputs: Dict[str, Any], context: ToolExecutionContext) -> ToolResult:
        t0 = time.time()
        query = inputs.get("query", "")
        top_k = int(inputs.get("top_k", 3))

        if not query:
            return ToolResult(
                success=False,
                error="Query string is required for searching guidelines",
                ms=int((time.time() - t0) * 1000),
            )

        passages, mode = search_passages_hybrid(db, query=query, top_k=top_k)

        data = {
            "passages": passages,
            "retrieval_mode": mode,
            "count": len(passages),
        }

        summary = f"Retrieved {len(passages)} guideline passages via {mode} for query '{query[:40]}...'"
        return ToolResult(
            success=True,
            data=data,
            summary=summary,
            ms=int((time.time() - t0) * 1000),
        )


class ListActiveRulesTool(AgentTool):
    id = "list_active_rules"
    name = "List Active Brand Rules"
    description = "Lists active, published brand compliance rules and their enforcement conditions."
    category = "rules"
    permission_class = "read"
    requires_approval = False
    timeout_seconds = 15
    input_schema = {
        "type": "object",
        "properties": {
            "category": {"type": "string", "description": "Optional category filter (e.g., Claims, Visual Identity)"},
            "limit": {"type": "integer", "default": 20, "description": "Max rules to return"},
        },
    }
    output_schema = {
        "type": "object",
        "properties": {
            "rules": {"type": "array", "items": {"type": "object"}},
            "count": {"type": "integer"},
        },
    }

    def run(self, db: Session, inputs: Dict[str, Any], context: ToolExecutionContext) -> ToolResult:
        t0 = time.time()
        category = inputs.get("category")
        limit = int(inputs.get("limit", 20))

        q = db.query(Rule).filter((Rule.workspace == context.workspace) | (Rule.workspace == 'PureGlow') | (Rule.workspace.is_(None)))
        if category:
            q = q.filter(Rule.category.ilike(f"%{category}%"))

        rules = q.limit(limit).all()

        rule_list = [
            {
                "id": r.id,
                "code": r.code,
                "title": r.title,
                "summary": r.summary,
                "subject": r.subject,
                "condition": r.condition,
                "action": r.action,
                "priority": r.priority,
                "category": r.category,
                "source_passage": r.source_passage[:150] if r.source_passage else "",
            }
            for r in rules
        ]

        return ToolResult(
            success=True,
            data={"rules": rule_list, "count": len(rule_list)},
            summary=f"Found {len(rule_list)} active rules in workspace {context.workspace}.",
            ms=int((time.time() - t0) * 1000),
        )

