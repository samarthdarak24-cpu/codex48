"""Submissions + Review router (CONTRACT.md §Submissions)."""
from fastapi import APIRouter, Depends, HTTPException, status as http_status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db
from ..deps import get_current_user, require_manager, require_workspace
from ..services import submissions as svc

router = APIRouter(prefix="/submissions", tags=["submissions"])


class SubmissionIn(BaseModel):
    title: str
    excerpt: str = ""
    type: str = "Text"
    channel: str = ""
    brand: str = "PureGlow"
    text: str = ""
    asset: dict | None = None
    thumb: dict | None = None
    assetId: str | None = None


class VersionIn(BaseModel):
    text: str
    note: str = ""


class CommentIn(BaseModel):
    body: str


class DecideIn(BaseModel):
    action: str
    note: str = ""
    # The version the manager actually reviewed. If it no longer matches the
    # current version, the decision is rejected (409) rather than silently
    # applying to content the reviewer never saw.
    version: int | None = None


def _is_owner_or_manager(sub: models.Submission, user: models.User) -> bool:
    return user.role == "manager" or sub.creator_id == user.id


@router.get("")
def list_submissions(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(models.Submission)
    if current_user.workspace:
        query = query.filter(
            (models.Submission.workspace == current_user.workspace)
            | (models.Submission.workspace.is_(None) if current_user.workspace == "PureGlow" else False)
        )
    if current_user.role == "creator":
        query = query.filter(models.Submission.creator_id == current_user.id)
    subs = query.order_by(models.Submission.updated_at.desc()).all()
    return [svc.submission_to_dict(s) for s in subs]


@router.get("/{sub_id}")
def get_submission(
    sub_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    sub = db.get(models.Submission, sub_id)
    require_workspace(sub, current_user, detail="Submission not found")
    if current_user.role == "creator" and sub.creator_id != current_user.id:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Not allowed")
    return svc.submission_to_dict(sub)


@router.post("")
def create_submission(
    body: SubmissionIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    thumb = body.thumb or {"kind": "art", "palette": "lime", "glyph": "leaf"}
    sub = svc.create_submission(
        db,
        title=body.title,
        excerpt=body.excerpt,
        type=body.type,
        channel=body.channel,
        brand=body.brand,
        text=body.text,
        asset=body.asset,
        thumb=thumb,
        creator_id=current_user.id,
        asset_id=body.assetId,
        workspace=current_user.workspace,
    )
    return svc.submission_to_dict(sub)


@router.post("/{sub_id}/versions")
def add_version(
    sub_id: str,
    body: VersionIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    sub = db.get(models.Submission, sub_id)
    require_workspace(sub, current_user, detail="Submission not found")
    if not _is_owner_or_manager(sub, current_user):
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Not allowed")
    result = svc.add_version(db, sub_id, body.text, body.note, current_user.id)
    return svc.submission_to_dict(result)


@router.post("/{sub_id}/comments")
def add_comment(
    sub_id: str,
    body: CommentIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    sub = db.get(models.Submission, sub_id)
    require_workspace(sub, current_user, detail="Submission not found")
    if not _is_owner_or_manager(sub, current_user):
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Not allowed")
    result = svc.add_comment(db, sub_id, body.body, current_user.id)
    return svc.submission_to_dict(result)


@router.post("/{sub_id}/decide")
def decide(
    sub_id: str,
    body: DecideIn,
    db: Session = Depends(get_db),
    current_user=Depends(require_manager),
):
    sub = db.get(models.Submission, sub_id)
    require_workspace(sub, current_user, detail="Submission not found")
    if body.version is not None and body.version != sub.version:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=(
                f"Version changed: you reviewed v{body.version} but the current version is "
                f"v{sub.version}. Reload before deciding."
            ),
        )
    result = svc.decide(db, sub_id, body.action, body.note, current_user.id)
    if not result:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Submission not found")
    return svc.submission_to_dict(result)


# ---------------------------------------------------------------------------
# N16 Plain-Language and Hindi Explanations
# ---------------------------------------------------------------------------

_RULE_EXPLANATIONS = {
    "CL-03": {
        "plain_en": "This product claim is not in the brand's approved claims list. All efficacy statements must match pre-approved substantiated copy verbatim.",
        "plain_hi": "यह उत्पाद दावा ब्रांड की आधिकारिक स्वीकृत सूची में नहीं है। प्रभाव संबंधी सभी कथन पूर्व-स्वीकृत प्रमाणित पाठ से अक्षरशः मेल खाने चाहिए।",
        "fix_en": "Replace with an approved claim from the Approved Snippets library or request a claim substantiation.",
        "fix_hi": "स्वीकृत स्निपेट्स लाइब्रेरी से किसी स्वीकृत दावे का उपयोग करें अथवा नए दावे के लिए साक्ष्य प्रस्तुत करें।",
        "rationale_hi": "नियामक अनुपालन और उपभोक्ता विश्वास बनाए रखने के लिए बिना सत्यापन के कोई भी दावा प्रकाशित नहीं किया जा सकता।"
    },
    "CL-04": {
        "plain_en": "Superlatives like '100% safe' or 'guaranteed' cannot be made without an explicit substantiation reference on the asset.",
        "plain_hi": "'100% सुरक्षित' या 'गारंटीकृत' जैसे अतिशयोक्तिपूर्ण दावों के साथ विज्ञापन पर ही प्रत्यक्ष प्रमाण संदर्भ होना अनिवार्य है।",
        "fix_en": "Qualify the claim or append the clinical reference number.",
        "fix_hi": "दावे को स्पष्ट करें अथवा आधिकारिक क्लिनिकल अध्ययन संदर्भ जोड़ें।",
        "rationale_hi": "अतिशयोक्तिपूर्ण दावों को भ्रामक माना जाता है जब तक कि उन्हें स्वतंत्र परीक्षण से प्रमाणित न किया गया हो।"
    },
    "CL-06": {
        "plain_en": "Regulated language rule: Wellness cosmetic copy must not imply disease treatment, cure, or immune-system boosting.",
        "plain_hi": "विनियमित भाषा नियम: वेलनेस और कॉस्मेटिक विज्ञापनों में रोग निवारण, इलाज या रोग प्रतिरोधक क्षमता (इम्युनिटी) बढ़ाने का दावा वर्जित है।",
        "fix_en": "Rephrase to focus on skin nourishment and sensory benefits rather than medical immunity.",
        "fix_hi": "इम्युनिटी के बजाय त्वचा पोषण और सामान्य लाभों पर ध्यान केंद्रित करें।",
        "rationale_hi": "दवा और प्रसाधन सामग्री नियमों के तहत गैर-चिकित्सीय उत्पादों पर चिकित्सीय दावे प्रतिबंधित हैं।"
    },
    "LOGO-001": {
        "plain_en": "The official PureGlow brand logo mark was not detected or match confidence was low.",
        "plain_hi": "आधिकारिक PureGlow ब्रांड लोगो पोस्टर पर नहीं मिला अथवा पहचान का विश्वास स्तर कम है।",
        "fix_en": "Ensure the official SVG/PNG logo mark is placed in the designated corner.",
        "fix_hi": "कृपया निर्धारित कोने में उच्च गुणवत्ता वाला आधिकारिक लोगो लगाएं।",
        "rationale_hi": "ब्रांड पहचान और प्रामाणिकता की रक्षा के लिए आधिकारिक लोगो अनिवार्य है।"
    },
    "COLOR-001": {
        "plain_en": "The dominant background colour deviates from the approved palette tolerance (#7AB93B Primary Green or #F4EFE3 Sand Neutral).",
        "plain_hi": "पोस्टर का मुख्य पृष्ठभूमि रंग स्वीकृत ब्रांड पैलेट (#7AB93B हरा अथवा #F4EFE3 सैंड न्यूट्रल) से भिन्न है।",
        "fix_en": "Adjust background to approved brand colours or request a seasonal festival exception.",
        "fix_hi": "पृष्ठभूमि को स्वीकृत रंगों में बदलें अथवा मौसमी उत्सव छूट (Exception) का अनुरोध करें।",
        "rationale_hi": "सभी अभियानों में ब्रांड दृश्य एकरूपता बनाए रखना आवश्यक है।"
    },
    "CONTRAST-001": {
        "plain_en": "Text contrast against the background falls below WCAG AA legibility standards (4.5:1 for body copy).",
        "plain_hi": "पाठ (Text) और पृष्ठभूमि के बीच कंट्रास्ट WCAG AA सुपाठ्यता मानकों (4.5:1) से कम है।",
        "fix_en": "Increase text darkness or brighten the backing panel to ensure legibility.",
        "fix_hi": "पाठ का रंग गहरा करें अथवा पृष्ठभूमि को हल्का कर सुपाठ्यता सुनिश्चित करें।",
        "rationale_hi": "कम कंट्रास्ट वाले टेक्स्ट को मोबाइल स्क्रीन और धूप में पढ़ना कठिन होता है।"
    },
    "PRICE-001": {
        "plain_en": "Percentage-off discounts require a valid campaign window and reference base price.",
        "plain_hi": "प्रतिशत छूट विज्ञापनों के लिए एक वैध अभियान अवधि और संदर्भ आधार मूल्य होना अनिवार्य है।",
        "fix_en": "Add the offer expiry date and original price reference.",
        "fix_hi": "ऑफर की समाप्ति तिथि और मूल संदर्भ मूल्य जोड़ें।",
        "rationale_hi": "उपभोक्ता संरक्षण नियमों के अनुसार छूट के दावे स्पष्ट और सीमित समय के होने चाहिए।"
    },
    "PA-05": {
        "plain_en": "Paid partnership content must carry an explicit disclosure line in the first two lines of caption.",
        "plain_hi": "प्रायोजित साझेदारी सामग्री के कैप्शन की पहली दो पंक्तियों में स्पष्ट 'Paid partnership' प्रकटीकरण होना आवश्यक है।",
        "fix_en": "Add 'Paid partnership with PureGlow' to the caption.",
        "fix_hi": "कैप्शन में 'Paid partnership with PureGlow' जोड़ें।",
        "rationale_hi": "विज्ञापन मानक परिषद (ASCI) के दिशा-निर्देशों के अनुसार प्रायोजित सामग्री का प्रकटीकरण अनिवार्य है।"
    }
}


@router.get("/findings/{finding_id}/explain")
def explain_finding(
    finding_id: str,
    lang: str = "en",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> dict:
    """N16 Plain-language and Hindi explanations for a finding."""
    finding = db.get(models.Finding, finding_id)
    if not finding:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Finding not found")

    code = finding.rule_code
    precomputed = _RULE_EXPLANATIONS.get(code)

    if precomputed:
        plain_en = precomputed["plain_en"]
        plain_hi = precomputed["plain_hi"]
        fix_en = precomputed["fix_en"]
        fix_hi = precomputed["fix_hi"]
        rationale_hi = precomputed.get("rationale_hi", "अनुपालन सुनिश्चित करने के लिए यह नियम आवश्यक है।")
    else:
        plain_en = finding.explanation or f"Rule {finding.rule_code} was triggered by this content."
        plain_hi = f"नियम {finding.rule_code} के तहत यह समस्या पाई गई: {finding.rule_title}।"
        fix_en = "Review the guideline passage and adjust the content to match brand requirements."
        fix_hi = "दिशानिर्देश के अंश की समीक्षा करें और सामग्री को ब्रांड मानकों के अनुसार समायोजित करें।"
        rationale_hi = "ब्रांड नीति अनुपालन के लिए यह आवश्यक है।"

    return {
        "findingId": finding.id,
        "ruleCode": finding.rule_code,
        "ruleTitle": finding.rule_title,
        "severity": finding.severity,
        "language": lang,
        "english": {
            "plainExplanation": plain_en,
            "recommendedFix": fix_en,
            "sourcePassage": finding.source_passage or "",
            "docName": finding.source_doc_name or "",
            "page": finding.source_page or 0,
        },
        "hindi": {
            "plainExplanation": plain_hi,
            "recommendedFix": fix_hi,
            "rationale": rationale_hi,
            "label": "सरल भाषा में व्याख्या (हिन्दी)",
        },
        "disclaimer": "This explanation is generated from certified brand rule templates to assist creators. It does not replace manager review or legal advice.",
    }


@router.post("/{sub_id}/semantic-review")
def semantic_review_endpoint(
    sub_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from ..services import evidence as ev_svc

    sub = db.get(models.Submission, sub_id)
    if not sub:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Submission not found")
    require_workspace(sub, current_user, detail="Submission not found")
    latest_version = max(sub.versions, key=lambda v: v.version) if sub.versions else None
    text = latest_version.text if latest_version else ""
    if not text.strip():
        analysis = (
            db.query(models.AssetAnalysis)
            .filter(models.AssetAnalysis.submission_id == sub_id)
            .order_by(models.AssetAnalysis.created_at.desc())
            .first()
        )
        text = (analysis.ocr_text if analysis else "") or ""
    ws = getattr(current_user, "workspace", "PureGlow")
    rows = ev_svc.semantic_review(
        db,
        submission_id=sub.id,
        version_id=latest_version.id if latest_version else None,
        text=text,
        workspace=ws,
        created_by_id=current_user.id,
    )
    return {
        "submissionId": sub.id,
        "count": len(rows),
        "findings": [ev_svc.to_dict(r) for r in rows],
    }


@router.get("/{sub_id}/ai-findings")
def get_ai_findings_endpoint(
    sub_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from ..services import evidence as ev_svc

    sub = db.get(models.Submission, sub_id)
    if not sub:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Submission not found")
    require_workspace(sub, current_user, detail="Submission not found")
    ws = getattr(current_user, "workspace", "PureGlow")
    return ev_svc.list_ai_findings(db, sub.id, ws)


@router.post("/findings/{finding_id}/suggest-edits")
def suggest_finding_edits(
    finding_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    finding = db.get(models.Finding, finding_id)
    if not finding:
        ai_f = db.get(models.AiFinding, finding_id)
        if ai_f:
            return {
                "findingId": ai_f.id,
                "minimalEdit": ai_f.minimal_edit or "Revise copy to align with certified guidelines.",
                "rationale": ai_f.rationale or "Suggested minimal edit based on verified citation.",
                "quote": ai_f.quote,
                "citationVerified": ai_f.citation_verified,
            }
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Finding not found")
    sub = db.get(models.Submission, finding.submission_id)
    require_workspace(sub, current_user, detail="Finding not found")
    suggested = finding.suggested_fix or f"Adjust phrasing for rule {finding.rule_code}."
    return {
        "findingId": finding.id,
        "ruleCode": finding.rule_code,
        "minimalEdit": suggested,
        "rationale": finding.explanation or "Deterministic rule remediation.",
        "quote": finding.source_passage,
        "citationVerified": bool(finding.source_passage),
    }


@router.post("/suggestions/{suggestion_id}/apply")
def apply_suggestion_as_new_version(
    suggestion_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Applying a suggestion ALWAYS creates a new version and re-evaluates rules. Old versions are never mutated."""
    finding = db.get(models.Finding, suggestion_id)
    sub = None
    fix_text = ""
    if finding:
        sub = db.get(models.Submission, finding.submission_id)
        fix_text = finding.suggested_fix
    else:
        ai_f = db.get(models.AiFinding, suggestion_id)
        if ai_f:
            sub = db.get(models.Submission, ai_f.submission_id)
            fix_text = ai_f.minimal_edit

    if not sub:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Suggestion not found")
    require_workspace(sub, current_user, detail="Submission not found")

    latest_version = max(sub.versions, key=lambda v: v.version) if sub.versions else None
    current_text = latest_version.text if latest_version else ""

    new_text = fix_text if fix_text else current_text
    if current_text and fix_text and fix_text not in current_text:
        new_text = f"{current_text}\n\n[Applied Remediation]: {fix_text}"

    updated_sub = svc.add_version(
        db,
        sub_id=sub.id,
        text=new_text,
        note=f"Applied minimal edit suggestion ({suggestion_id[:8]})",
        author_id=current_user.id,
    )
    return svc.submission_to_dict(updated_sub)
