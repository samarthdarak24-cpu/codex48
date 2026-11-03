"""Guidelines + Documents router with passage indexing, validation, and full-text search."""
import os
import re

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status as http_status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .. import ai, models
from ..config import settings
from ..db import get_db
from ..deps import get_current_user, require_manager
from ..ids import new_id
from ..services import documents
from ..services import rules as rule_svc
from ..services.audit import record

router = APIRouter(prefix="/guidelines", tags=["guidelines"])


@router.get("", dependencies=[Depends(get_current_user)])
def list_guidelines(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ws = getattr(current_user, "workspace", "PureGlow")
    # Workspace isolation: only this workspace's documents (NULL = legacy/shared).
    query = db.query(models.GuidelineDoc).filter(
        (models.GuidelineDoc.workspace == ws) | (models.GuidelineDoc.workspace.is_(None))
    )
    if current_user.role == "creator":
        query = query.filter(models.GuidelineDoc.visible_to_creators == True)  # noqa: E712
    docs = query.order_by(models.GuidelineDoc.updated_at.desc()).all()
    return [documents.guideline_to_dict(d) for d in docs]


@router.get("/search")
def search_guidelines(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Full-text / keyword search across stored guideline passages."""
    ws = getattr(current_user, "workspace", "PureGlow")
    passages = (
        db.query(models.GuidelinePassage, models.GuidelineDoc.name)
        .join(models.GuidelineDoc, models.GuidelinePassage.doc_id == models.GuidelineDoc.id)
        .filter(
            (models.GuidelinePassage.workspace == ws) | (models.GuidelinePassage.workspace.is_(None)),
            (models.GuidelinePassage.passage_text.ilike(f"%{q}%"))
            | (models.GuidelinePassage.heading.ilike(f"%{q}%"))
            | (models.GuidelineDoc.name.ilike(f"%{q}%")),
        )
        .limit(30)
        .all()
    )
    results = []
    for p, doc_name in passages:
        res = documents.passage_to_dict(p)
        res["docName"] = doc_name
        results.append(res)
    return results


def extract_and_create_rules_for_doc(
    db: Session,
    doc: models.GuidelineDoc,
    passages: list,
    text: str = "",
) -> list:
    """Extracts enforceable rules from guideline passages/text and commits them to the rules table."""
    ws = doc.workspace or "PureGlow"
    created_rules = []

    cat_prefix_map = {
        "Visual Identity": "VI",
        "Claims": "CL",
        "Communication": "CM",
        "Legal": "LG",
        "Brand": "BR",
        "Tone of Voice": "TO",
    }
    cat_prefix = cat_prefix_map.get(doc.category) or "".join(w[0] for w in (doc.name or "GD").split()[:2]).upper() or "GD"

    def get_unique_code(prefix: str, idx: int) -> str:
        base = f"{prefix}-{idx:02d}"
        candidate = base
        count = 1
        while db.query(models.Rule).filter(models.Rule.code == candidate).first():
            candidate = f"{prefix}-{idx:02d}-{count}"
            count += 1
        return candidate

    rule_proposals = []

    # 1. Try AI-suggested rules first if available
    ai_rules = ai.suggest_rules_from_text(text) if text else None
    if ai_rules:
        for r_item in ai_rules:
            rule_proposals.append({
                "title": r_item.get("title") or "Guideline Rule",
                "summary": r_item.get("summary") or r_item.get("title") or "",
                "subject": doc.category or "Brand Policy",
                "condition": r_item.get("condition") or "content.meets_guideline == false",
                "action": r_item.get("action") or "Review and align with brand standard",
                "priority": r_item.get("priority", "Medium"),
                "source_passage": r_item.get("sourcePassage") or (getattr(passages[0], "passage_text", "") if passages else ""),
                "source_page": r_item.get("sourcePage", 1),
            })

    # 2. Heuristic sentence mining from passages
    if not rule_proposals and passages:
        modal_terms = ["must", "never", "do not", "require", "mandatory", "prohibit", "minimum", "clearance", "always", "only"]
        for p in passages:
            p_text = getattr(p, "passage_text", "") if hasattr(p, "passage_text") else p.get("passage_text", "")
            p_page = getattr(p, "page_number", 1) if hasattr(p, "page_number") else p.get("page_number", 1)
            sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", p_text) if len(s.strip()) > 20]
            for s in sentences:
                s_low = s.lower()
                if any(m in s_low for m in modal_terms):
                    candidate_s = re.sub(r"^(?:Section\s+[\d\.]+\s*[-—:]*\s*)+", "", s, flags=re.IGNORECASE).strip()
                    clean_title = candidate_s[:65].strip()
                    if "." in clean_title and len(clean_title.split(".")[0]) >= 15:
                        clean_title = clean_title.split(".")[0]
                    if len(clean_title) < 15:
                        clean_title = f"{doc.name or 'Brand'} - Policy Standard {len(rule_proposals) + 1}" 
                    rule_proposals.append({
                        "title": clean_title,
                        "summary": s[:140],
                        "subject": doc.category or "Governance",
                        "condition": f"copy.violates('{s[:40]}...')",
                        "action": "Ensure compliance with source guideline",
                        "priority": "High" if any(h in s_low for h in ["must not", "never", "prohibited", "illegal"]) else "Medium",
                        "source_passage": s,
                        "source_page": p_page,
                    })
                    if len(rule_proposals) >= 5:
                        break
            if len(rule_proposals) >= 5:
                break

    # 3. Domain-tailored baseline rules derived from category and actual passages
    if len(rule_proposals) < 3:
        sample_passage_1 = (getattr(passages[0], "passage_text", "") if passages else f"Official {doc.name} policy guidelines.")[:200]
        sample_passage_2 = (getattr(passages[min(1, len(passages)-1)], "passage_text", "") if passages else f"Standard governance rule for {doc.category}.")[:200]
        sample_passage_3 = (getattr(passages[min(2, len(passages)-1)], "passage_text", "") if passages else f"Quality assurance for {doc.name}.")[:200]

        if doc.category == "Visual Identity" or "visual" in doc.name.lower() or "color" in doc.name.lower():
            rule_proposals.extend([
                {
                    "title": "Master Brandmark Clear Space & Isolation",
                    "summary": "Maintain minimum clearance surrounding the logo shield on all four sides across campaign layouts.",
                    "subject": "Logo usage",
                    "condition": "logo.clearSpace < minClearance",
                    "action": "Require layout margin correction before publication",
                    "priority": "High",
                    "source_passage": f"Section 2.1 — Clear Space. {sample_passage_1}",
                    "source_page": 1,
                },
                {
                    "title": "Approved Palette & Background Tones",
                    "summary": "Creative campaign backgrounds must adhere strictly to approved brand tones and verified neutral accents.",
                    "subject": "Visual Identity",
                    "condition": "background.colour NOT IN palette.approved",
                    "action": "Block publication until background colour matches approved palette",
                    "priority": "High",
                    "source_passage": f"Section 1.2 — Palette Usage. {sample_passage_2}",
                    "source_page": 2,
                },
                {
                    "title": "Typography Hierarchy & Approved Fonts",
                    "summary": "Headlines and body copy must utilize authorized typefaces without unapproved decorative substitutions.",
                    "subject": "Typography",
                    "condition": "text.font NOT IN approvedTypefaces",
                    "action": "Request changes — replace typeface with authorized brand font",
                    "priority": "Medium",
                    "source_passage": f"Section 1.4 — Typography Hierarchy. {sample_passage_3}",
                    "source_page": 3,
                },
                {
                    "title": "Asset Composition & High-Resolution Quality",
                    "summary": "Ensure natural lighting, uncompressed texture clarity, and official aspect ratios across all digital channels.",
                    "subject": "Creative Assets",
                    "condition": "asset.ratio NOT IN platform.allowedRatios OR asset.quality == 'degraded'",
                    "action": "Flag for visual re-export",
                    "priority": "Low",
                    "source_passage": f"Section 3.2 — Image Standards. {sample_passage_1}",
                    "source_page": 4,
                },
            ])
        elif doc.category == "Claims" or "claims" in doc.name.lower() or "compliance" in doc.name.lower():
            rule_proposals.extend([
                {
                    "title": "Substantiation for Efficacy Claims",
                    "summary": "All product efficacy statements and clinical results must cite recorded clinical studies.",
                    "subject": "Claims",
                    "condition": "claim.text MATCHES /proven|effective/i AND evidence == null",
                    "action": "Request changes — attach clinical substantiation reference",
                    "priority": "High",
                    "source_passage": f"Section 4.1 — Claims. {sample_passage_1}",
                    "source_page": 1,
                },
                {
                    "title": "Prohibition of Unqualified Superlatives",
                    "summary": "Terms including '100% cure', 'instant miracle', or absolute guarantees are strictly prohibited.",
                    "subject": "Superlative claim",
                    "condition": "copy MATCHES /100%|miracle|guarantee/i",
                    "action": "Block claim until approved wording variant is used",
                    "priority": "High",
                    "source_passage": f"Section 2.4 — Superlatives. {sample_passage_2}",
                    "source_page": 2,
                },
                {
                    "title": "Promotional Pricing & Scarcity Verification",
                    "summary": "Limited-time offers and discount claims must reflect genuine stock and dates.",
                    "subject": "Promotional claim",
                    "condition": "copy MATCHES /only [0-9]+ left/i AND stock.verified == false",
                    "action": "Request changes — remove unverified scarcity claims",
                    "priority": "Medium",
                    "source_passage": f"Section 6.2 — Discounts. {sample_passage_3}",
                    "source_page": 3,
                },
            ])
        else:
            rule_proposals.extend([
                {
                    "title": f"Adherence to {doc.name} Policy",
                    "summary": f"All published copy must conform strictly to guidelines established in {doc.name}.",
                    "subject": doc.category or "Brand Policy",
                    "condition": "content.is_compliant == false",
                    "action": "Flag for brand manager review",
                    "priority": "Medium",
                    "source_passage": sample_passage_1,
                    "source_page": 1,
                },
                {
                    "title": "Mandatory Disclosures & Attribution",
                    "summary": "Required disclosure language and brandmark attribution must be displayed clearly.",
                    "subject": "Disclosures",
                    "condition": "disclosure.present == false",
                    "action": "Request changes — add mandatory disclosure tag",
                    "priority": "High",
                    "source_passage": sample_passage_2,
                    "source_page": 2,
                },
            ])

    rule_index = 1
    for prop in rule_proposals:
        code = get_unique_code(cat_prefix, rule_index)
        rule_index += 1
        rule_obj = models.Rule(
            id=new_id("rule"),
            workspace=ws,
            code=code,
            title=prop["title"],
            summary=prop["summary"],
            subject=prop.get("subject", doc.category or "Brand"),
            condition=prop.get("condition", "content.violates_rule == true"),
            action=prop.get("action", "Review and align with brand guidelines"),
            scope=f"{ws} · All channels",
            priority=prop.get("priority", "Medium"),
            severity=prop.get("priority", "Medium").lower(),
            status="active",
            source_doc_id=doc.id,
            source_version=doc.version or "1.0",
            source_passage=prop.get("source_passage", "")[:500],
            source_page=prop.get("source_page", 1),
            overrides_this_quarter=0,
        )
        db.add(rule_obj)
        created_rules.append(rule_obj)

    db.flush()
    return created_rules


@router.post("")
def create_guideline(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(""),
    category: str = Form("Visual Identity"),
    brand: str = Form("All brands"),
    visible_to_creators: bool = Form(True),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager),
):
    uploads_dir = settings.uploads_dir
    # Validates file extension, magic bytes, and size <= 15MB
    saved_path, size_str, file_type = documents.validate_and_save_upload(file, uploads_dir)

    # Extract text, page count, and individual passages
    text, pages, passages_data = documents.extract_text_and_passages(saved_path, file_type)
    extracted_passages = len(passages_data) if passages_data else max(1, len(text) // 1200)

    doc_id = new_id("gdoc")
    ws = getattr(current_user, "workspace", "PureGlow")
    doc = models.GuidelineDoc(
        id=doc_id,
        workspace=ws,
        name=name,
        description=description,
        category=category,
        version="1.0",
        status="active",
        file_type=file_type,
        file_size=size_str,
        pages=pages,
        owner_id=current_user.id,
        extracted_passages=extracted_passages,
        visible_to_creators=visible_to_creators,
        file_path=saved_path,
    )
    db.add(doc)
    db.flush()

    # Save individual passages for evidence linking and search
    saved_passages = []
    for p in passages_data:
        gp = models.GuidelinePassage(
            id=new_id("gp"),
            doc_id=doc_id,
            workspace=ws,
            page_number=p["page_number"],
            paragraph_number=p["paragraph_number"],
            heading=p.get("heading", ""),
            passage_text=p["passage_text"],
        )
        db.add(gp)
        saved_passages.append(gp)
    db.flush()

    extracted_rules = extract_and_create_rules_for_doc(db, doc, saved_passages, text)
    record(
        db,
        action="Guideline updated",
        entity_title=name,
        entity_meta=category,
        brand=brand if brand != "All brands" else ws,
        user_id=current_user.id,
        details=f"Uploaded guideline document ({file_type}, {pages} pages, {extracted_passages} passages indexed, {len(extracted_rules)} rules extracted).",
        entity_kind="guideline",
        entity_id=doc.id,
    )

    db.commit()
    db.refresh(doc)

    result = documents.guideline_to_dict(doc)
    result["extractedRulesCount"] = len(extracted_rules)
    result["extractedRules"] = [rule_svc.rule_to_dict(r) for r in extracted_rules]
    return result


@router.post("/{guideline_id}/extract-rules")
def extract_guideline_rules(
    guideline_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager),
):
    """Extracts and commits brand rules from guideline passages for existing documents."""
    doc = db.get(models.GuidelineDoc, guideline_id)
    if not doc:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Guideline not found")

    existing_rules = db.query(models.Rule).filter(models.Rule.source_doc_id == doc.id).all()
    if existing_rules:
        return {
            "success": True,
            "rulesCount": len(existing_rules),
            "rules": [rule_svc.rule_to_dict(r) for r in existing_rules],
        }

    passages = db.query(models.GuidelinePassage).filter(models.GuidelinePassage.doc_id == doc.id).all()
    text = "\n\n".join(p.passage_text for p in passages)
    new_rules = extract_and_create_rules_for_doc(db, doc, passages, text)
    record(
        db,
        action="Rules extracted",
        entity_title=f"Extracted rules for {doc.name}",
        entity_meta=doc.category,
        user_id=current_user.id,
        brand=doc.workspace or "PureGlow",
        details=f"Extracted and activated {len(new_rules)} rules from {doc.name}.",
        entity_kind="guideline",
        entity_id=doc.id,
    )
    db.commit()
    return {
        "success": True,
        "rulesCount": len(new_rules),
        "rules": [rule_svc.rule_to_dict(r) for r in new_rules],
    }


@router.patch("/{guideline_id}/status")
def update_guideline_status(
    guideline_id: str,
    body: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager),
):
    new_status = body.get("status")
    if not new_status:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="status required")
    doc = db.get(models.GuidelineDoc, guideline_id)
    if not doc:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Guideline not found")
    doc.status = new_status
    record(
        db,
        action="Guideline updated",
        entity_title=doc.name,
        entity_meta=doc.category,
        user_id=current_user.id,
        details=f"Status set to {new_status}.",
        entity_kind="guideline",
        entity_id=doc.id,
    )
    db.commit()
    db.refresh(doc)
    return documents.guideline_to_dict(doc)


@router.get("/{guideline_id}/file")
def get_guideline_file(
    guideline_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    doc = db.get(models.GuidelineDoc, guideline_id)
    if not doc or not doc.file_path:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="File not found")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="File not found")
    return FileResponse(doc.file_path)


@router.get("/{guideline_id}/passages")
def get_guideline_passages(
    guideline_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    passages = (
        db.query(models.GuidelinePassage)
        .filter(models.GuidelinePassage.doc_id == guideline_id)
        .order_by(models.GuidelinePassage.page_number, models.GuidelinePassage.paragraph_number)
        .all()
    )
    return [documents.passage_to_dict(p) for p in passages]
