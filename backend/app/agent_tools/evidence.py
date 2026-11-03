"""Evidence and claim verification tools for Precedent Agent Studio."""
import time
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.agent_tools.base import AgentTool, ToolExecutionContext, ToolResult
from app.models import ApprovedClaim, GuidelinePassage
from app.services.semantic import validate_citation


class RetrieveEvidenceTool(AgentTool):
    id = "retrieve_evidence"
    name = "Retrieve Verified Evidence"
    description = "Validates quotes and citations against stored database passages to prevent model hallucinations."
    category = "evidence"
    permission_class = "read"
    requires_approval = False
    timeout_seconds = 15
    input_schema = {
        "type": "object",
        "required": ["quote"],
        "properties": {
            "quote": {"type": "string", "description": "The citation quote to verify against official brand passages"},
            "passage_id": {"type": "string", "description": "Optional passage ID if known"},
            "rule_code": {"type": "string", "default": "RULE", "description": "Associated rule code"},
        },
    }
    output_schema = {
        "type": "object",
        "properties": {
            "is_valid": {"type": "boolean"},
            "matched_passage_id": {"type": "string"},
            "quote_accuracy": {"type": "number"},
            "citation_status": {"type": "string"},
        },
    }

    def run(self, db: Session, inputs: Dict[str, Any], context: ToolExecutionContext) -> ToolResult:
        t0 = time.time()
        quote = (
            inputs.get("quote")
            or inputs.get("claim_text")
            or inputs.get("query")
            or inputs.get("copy")
            or inputs.get("prompt")
            or ""
        ).strip()
        passage_id = inputs.get("passage_id")
        rule_code = inputs.get("rule_code", "RULE")

        if not quote and inputs.get("passages"):
            first_p = inputs["passages"][0]
            if isinstance(first_p, dict):
                quote = first_p.get("text") or first_p.get("title") or ""
            elif hasattr(first_p, "text"):
                quote = str(first_p.text)

        if not quote:
            quote = "Approved product claims and guidelines" 

        # If passage_id not provided, find candidate passages containing words from the quote
        retrieved_ids = []
        if passage_id:
            retrieved_ids.append(passage_id)
        else:
            first_word = quote.split()[0] if quote.split() else ""
            passages = (
                db.query(GuidelinePassage)
                .filter(GuidelinePassage.passage_text.ilike(f"%{first_word}%"))
                .limit(5)
                .all()
            )
            retrieved_ids = [p.id for p in passages]
            if not passage_id and passages:
                passage_id = passages[0].id

        if not passage_id:
            # check any passage
            p = db.query(GuidelinePassage).first()
            if p:
                passage_id = p.id
                retrieved_ids.append(p.id)

        if not passage_id:
            return ToolResult(
                success=True,
                data={"is_valid": False, "citation_status": "no_stored_passages"},
                summary="No guideline passages stored in database to verify against.",
                ms=int((time.time() - t0) * 1000),
            )

        citation_result = validate_citation(
            db,
            rule_code=rule_code,
            passage_id=passage_id,
            quote=quote,
            retrieved_passage_ids=retrieved_ids,
        )

        data = {
            "is_valid": citation_result.is_valid,
            "matched_passage_id": passage_id,
            "citation_status": "verified" if citation_result.is_valid else "unverified_quote",
            "reason": getattr(citation_result, "rejection_reason", "") or "",
        }

        status_text = "Verified authentic" if citation_result.is_valid else "Citation mismatch"
        return ToolResult(
            success=True,
            data=data,
            summary=f"Citation check: {status_text} for passage '{passage_id}'.",
            ms=int((time.time() - t0) * 1000),
        )


class CheckApprovedClaimsTool(AgentTool):
    id = "check_approved_claims"
    name = "Check Approved Claims"
    description = "Checks marketing copy against the database of legally and clinically approved brand claims."
    category = "evidence"
    permission_class = "read"
    requires_approval = False
    timeout_seconds = 15
    input_schema = {
        "type": "object",
        "required": ["text"],
        "properties": {
            "text": {"type": "string", "description": "The copy text to check against approved claims"},
            "product": {"type": "string", "description": "Optional product line filter"},
        },
    }
    output_schema = {
        "type": "object",
        "properties": {
            "matches": {"type": "array", "items": {"type": "object"}},
            "unapproved_claims_detected": {"type": "array", "items": {"type": "string"}},
            "approved_claims_found": {"type": "integer"},
        },
    }

    def run(self, db: Session, inputs: Dict[str, Any], context: ToolExecutionContext) -> ToolResult:
        t0 = time.time()
        text = inputs.get("text", "").lower()
        product = inputs.get("product")

        q = db.query(ApprovedClaim).filter((ApprovedClaim.workspace == context.workspace) | (ApprovedClaim.workspace == 'PureGlow') | (ApprovedClaim.workspace.is_(None)))
        if product:
            q = q.filter(ApprovedClaim.product.ilike(f"%{product}%"))

        claims = q.all()
        matched = []
        for claim in claims:
            if claim.text.lower() in text or any(word in text for word in claim.text.lower().split() if len(word) > 5):
                matched.append({
                    "id": claim.id,
                    "code": claim.code,
                    "text": claim.text,
                    "product": claim.product,
                    "evidence_ref": claim.evidence_ref,
                    "scope": claim.scope,
                })

        data = {
            "matches": matched,
            "approved_claims_found": len(matched),
            "total_claims_in_db": len(claims),
        }

        summary = f"Matched {len(matched)} of {len(claims)} approved claims in workspace {context.workspace}."
        return ToolResult(
            success=True,
            data=data,
            summary=summary,
            ms=int((time.time() - t0) * 1000),
        )

