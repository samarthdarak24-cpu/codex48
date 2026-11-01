"""Precedent Brand Governance MCP (Model Context Protocol) Server.

Exposes read-only brand governance tools to LLM agents and external developer workflows:
- `check_copy`: Fast deterministic evaluation of marketing copy against brand rules.
- `search_guidelines`: Semantic hybrid search over brand guideline passages.
- `get_rule`: Exact rule definitions, severity, and source citations.
- `list_active_exceptions`: Active policy exceptions and exemptions.

All tools are strictly read-only (SELECT queries only), audited, and bound to workspaces.
"""

from __future__ import annotations

import json
import logging
import os
import sys
from typing import Any, Dict, List, Optional

# Ensure backend root is in python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcp.server.mcpserver import MCPServer

from app import models
from app.db import SessionLocal
from app.rule_engine import run_rules
from app.services.evidence import hybrid_retrieve

log = logging.getLogger("precedent.mcp")

mcp_server = MCPServer("precedent-brand-governance")


@mcp_server.tool()
def check_copy(text: str, channel: str = "instagram", workspace: str = "PureGlow") -> Dict[str, Any]:
    """Audit marketing copy against active brand rules and guidelines.
    
    Returns deterministic rule findings, severity levels, and matched text spans.
    Read-only, advisory inspection.
    """
    db = SessionLocal()
    try:
        rules = (
            db.query(models.Rule)
            .filter(models.Rule.status == "active")
            .filter((models.Rule.workspace == workspace) | (models.Rule.workspace.is_(None)))
            .all()
        )
        findings = run_rules(
            rules=rules,
            text=text,
            channel=channel,
        )
        findings_data = [
            {
                "ruleCode": f.rule_code,
                "ruleTitle": f.rule_title,
                "severity": f.severity,
                "outcome": f.outcome,
                "explanation": f.explanation,
                "suggestedFix": f.suggested_fix,
                "sourcePassage": f.source_passage,
            }
            for f in findings
        ]
        return {
            "status": "flagged" if findings_data else "clean",
            "findingsCount": len(findings_data),
            "findings": findings_data,
            "workspace": workspace,
        }
    finally:
        db.close()



@mcp_server.tool()
def search_guidelines(query: str, workspace: str = "PureGlow", limit: int = 5) -> List[Dict[str, Any]]:
    """Search brand guidelines using hybrid BM25 + ONNX dense vector retrieval.
    
    Returns relevant guideline passages with source citations and section headings.
    """
    db = SessionLocal()
    try:
        passages = hybrid_retrieve(db=db, query=query, workspace=workspace, limit=limit)
        return [
            {
                "passageId": p.get("id"),
                "heading": p.get("heading"),
                "text": p.get("text"),
                "score": p.get("score"),
                "method": p.get("method", "hybrid"),
            }
            for p in passages
        ]
    finally:
        db.close()


@mcp_server.tool()
def get_rule(code: str, workspace: str = "PureGlow") -> Dict[str, Any]:
    """Retrieve full details for an exact rule code (e.g., 'NO-FREE', 'COLOR-001').
    
    Returns rule definition, severity, category, source document, and source passage.
    """
    db = SessionLocal()
    try:
        rule = (
            db.query(models.Rule)
            .filter(models.Rule.code == code)
            .filter((models.Rule.workspace == workspace) | (models.Rule.workspace.is_(None)))
            .first()
        )
        if not rule:
            return {"error": f"Rule '{code}' not found in workspace '{workspace}'"}
        return {
            "id": rule.id,
            "code": rule.code,
            "title": rule.title,
            "summary": rule.summary,
            "subject": rule.subject,
            "condition": rule.condition,
            "action": rule.action,
            "priority": rule.priority,
            "sourceDocId": rule.source_doc_id,
            "sourcePassage": rule.source_passage,
            "status": rule.status,
            "workspace": rule.workspace,
        }

    finally:
        db.close()


@mcp_server.tool()
def list_active_exceptions(workspace: str = "PureGlow") -> List[Dict[str, Any]]:
    """List all currently active brand policy exceptions and exemptions.
    
    Returns allowed scopes, creator limits, expiration dates, and justification.
    """
    db = SessionLocal()
    try:
        exceptions = (
            db.query(models.ExceptionRequest)
            .filter(models.ExceptionRequest.status == "Approved")
            .filter((models.ExceptionRequest.workspace == workspace) | (models.ExceptionRequest.workspace.is_(None)))
            .all()
        )
        return [
            {
                "id": exc.id,
                "ruleCode": exc.rule_code,
                "ruleTitle": exc.rule_title,
                "reason": exc.reason,
                "scope": exc.scope,
                "expiresAt": exc.expires_at.isoformat() if exc.expires_at else None,
                "status": exc.status,
            }
            for exc in exceptions
        ]
    finally:
        db.close()



if __name__ == "__main__":
    mcp_server.run()
