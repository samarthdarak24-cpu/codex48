"""Seed script for the Precedent backend.

Mirrors the fictional dataset in src/lib/demo-data.ts with a 2-user workspace.
Run with:  python seed.py
"""
from datetime import datetime, timedelta, timezone

from app.db import SessionLocal, init_db
from app import models
from app.ids import new_id
from app.security import hash_password
from app.rule_engine import run_rules, VISUAL_ONLY_RULES


def now() -> datetime:
    return datetime.now(timezone.utc)


# Simple asset object the rule engine reads via getattr.
class Asset:
    def __init__(self, d: dict):
        self.background_colour = d.get("backgroundColour")
        self.clear_space_ratio = d.get("clearSpaceRatio")
        self.typeface = d.get("typeface")
        self.aspect_ratio = d.get("aspectRatio")
        self.unreadable = bool(d.get("unreadable", False))


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        # Idempotent: clear and reseed for a dev environment.
        if db.query(models.User).count() > 0:
            print("already seeded — clearing tables for a clean reseed")
            for table in reversed(models.Base.metadata.sorted_tables):
                db.execute(table.delete())
            db.commit()

        # ------------------------------------------------------------------
        # Users
        # ------------------------------------------------------------------
        pw = hash_password("precedent")
        david = models.User(
            id=new_id("u"), name="David Kim", email="david.kim@pureglow.co",
            role="manager", title="Brand Manager", initials="DK",
            avatar_tone="green", workspace="PureGlow",
            workspace_status="active", password_hash=pw,
        )
        emily = models.User(
            id=new_id("u"), name="Emily Carter", email="emily.carter@pureglow.co",
            role="creator", title="Content Creator", initials="EC",
            avatar_tone="teal", workspace="PureGlow",
            workspace_status="active", password_hash=pw,
        )
        sarah = models.User(
            id=new_id("u"), name="Sarah Chen", email="sarah.chen@wellnesslife.co",
            role="creator", title="Content Specialist", initials="SC",
            avatar_tone="amber", workspace="WellnessLife",
            workspace_status="active", password_hash=pw,
        )
        db.add_all([david, emily, sarah])
        db.commit()

        # ------------------------------------------------------------------
        # Guideline docs (3: active / active / draft)
        # ------------------------------------------------------------------
        doc_colour = models.GuidelineDoc(
            id=new_id("doc"), name="Brand Colour Palette Guide v1.0",
            description="Official brand colours, gradients and usage examples.",
            category="Visual Identity", version="v1.0", status="active",
            file_type="PDF", file_size="8.8 MB", pages=26, owner_id=david.id,
            extracted_passages=96, visible_to_creators=True,
        )
        doc_tone = models.GuidelineDoc(
            id=new_id("doc"), name="Tone of Voice Guide v2.1",
            description="Writing style, language and messaging guidelines.",
            category="Communication", version="v2.1", status="active",
            file_type="DOCX", file_size="3.4 MB", pages=22, owner_id=david.id,
            extracted_passages=118, visible_to_creators=True,
        )
        doc_claims = models.GuidelineDoc(
            id=new_id("doc"), name="Claims & Compliance Playbook v1.3",
            description="Approved claims, disclaimers and regulated-language rules.",
            category="Claims", version="v1.3", status="draft",
            file_type="PDF", file_size="2.1 MB", pages=32, owner_id=david.id,
            extracted_passages=138, visible_to_creators=True,
        )
        db.add_all([doc_colour, doc_tone, doc_claims])
        db.commit()
        doc_name = {doc_colour.id: doc_colour.name, doc_tone.id: doc_tone.name,
                    doc_claims.id: doc_claims.name}

        # ------------------------------------------------------------------
        # Rules (~15: 14 active + 1 needs_confirmation)
        # ------------------------------------------------------------------
        rules_data = [
            # --- text rules ---
            dict(code="CL-03", title="Only approved product claims",
                 summary="Product efficacy statements must match the approved claims list verbatim.",
                 subject="Product claim", condition='claim.text NOT IN approvedClaims',
                 action="Block claim until an approved variant is used",
                 scope="PureGlow · All channels", priority="High",
                 source_doc_id=doc_claims.id, source_version="v1.3",
                 source_passage="Section 4.1 — Claims. Only claims recorded in the Approved Claims List may appear in external communication. Use the exact wording listed.",
                 source_page=5, overrides_this_quarter=7),
            dict(code="CL-04", title="No unqualified superlatives",
                 summary='Absolute claims such as "100% safe" require substantiation on the asset.',
                 subject="Absolute claim", condition='claim.type = "superlative" AND substantiation = null',
                 action="Request changes — remove or substantiate the claim",
                 scope="All brands · All channels", priority="High",
                 source_doc_id=doc_claims.id, source_version="v1.3",
                 source_passage='Section 2.4 — Superlatives. Terms including "100% safe", "guaranteed" and "no risk" must be supported by a substantiation reference on the same asset, or removed.',
                 source_page=9, overrides_this_quarter=3),
            dict(code="CL-06", title="No medical or immunity claims",
                 summary="Wellness copy may not imply treatment, cure or immune-system effects.",
                 subject="Health claim", condition='claim.text MATCHES /(immun|boost|cure|treat|heal)/i',
                 action="Block claim and require rewrite",
                 scope="WellnessLife · All channels", priority="High",
                 source_doc_id=doc_claims.id, source_version="v1.3",
                 source_passage="Section 3.2 — Regulated language. Copy must not state or imply that a product boosts immunity, treats, cures or heals a condition.",
                 source_page=11, overrides_this_quarter=5),
            dict(code="MK-02", title="Discount claims must be verifiable",
                 summary="Percentage-off claims need a valid campaign window and reference price.",
                 subject="Promotional claim", condition='claim.discount > 0 AND campaign.end = null',
                 action="Request changes — add campaign window",
                 scope="All brands · All channels", priority="Medium",
                 source_doc_id=doc_claims.id, source_version="v1.3",
                 source_passage="Section 6.2 — Promotional claims. Any \"% off\" statement must be tied to a dated campaign window and a reference price.",
                 source_page=22, overrides_this_quarter=3),
            dict(code="TV-02", title="Warm, plain-spoken tone",
                 summary="Avoid hype, urgency pressure and exclamation stacking.",
                 subject="Tone of voice", condition='copy.urgencyPhrases >= 2 OR copy.exclamations > 1',
                 action="Flag for editorial review",
                 scope="All brands · All channels", priority="Low",
                 source_doc_id=doc_tone.id, source_version="v2.1",
                 source_passage="Section 2.2 — What we avoid. We never pressure. Avoid countdown language and repeated exclamation marks.",
                 source_page=8, overrides_this_quarter=0),
            dict(code="PA-05", title="Paid partnership disclosure",
                 summary="Influencer assets must carry the approved disclosure line.",
                 subject="Disclosure", condition='channel = "Influencer" AND disclosure.present = false',
                 action="Block publication",
                 scope="All brands · Social", priority="High",
                 source_doc_id=doc_claims.id, source_version="v1.3",
                 source_passage='Section 5.1 — Disclosure. Every paid partnership asset must include the line "Paid partnership with {brand}" in the first two lines of caption.',
                 source_page=14, overrides_this_quarter=2),
            dict(code="CL-02", title="No unsubstantiated clinical language",
                 summary='"Clinically proven" requires an evidence reference on the asset.',
                 subject="Clinical claim", condition='claim.text MATCHES /clinically proven/i AND evidence = null',
                 action="Request changes — attach evidence",
                 scope="PureGlow · All channels", priority="Medium",
                 source_doc_id=doc_claims.id, source_version="v1.3",
                 source_passage="Section 2.1 — Evidence. 'Clinically proven' may only appear with a cited study reference.",
                 source_page=3, overrides_this_quarter=1),
            dict(code="MK-01", title="No fake scarcity",
                 summary="Scarcity claims must reflect real stock or a real deadline.",
                 subject="Promotional claim", condition='copy MATCHES /only [0-9]+ left/i',
                 action="Request changes — remove false scarcity",
                 scope="All brands · All channels", priority="Medium",
                 source_doc_id=doc_claims.id, source_version="v1.3",
                 source_passage="Section 6.4 — Scarcity. Scarcity language must reflect a genuine, verifiable limit.",
                 source_page=24, overrides_this_quarter=0),
            dict(code="LO-01", title="Logo minimum size",
                 summary="The wordmark may not be reproduced below the minimum size.",
                 subject="Logo", condition='logo.size < minSize',
                 action="Require rescale before approval",
                 scope="All brands · All channels", priority="Medium",
                 source_doc_id=doc_colour.id, source_version="v1.0",
                 source_passage="Section 2.1 — Minimum size. The wordmark must never be reproduced below 24px on screen.",
                 source_page=16, overrides_this_quarter=1),
            # --- visual rules ---
            dict(code="BR-01", title="Approved background colours",
                 summary="Campaign backgrounds must use the approved green or neutral palette.",
                 subject="Visual background", condition='background.colour NOT IN palette.approved',
                 action="Block publication until background matches an approved colour",
                 scope="All brands · All channels", priority="High",
                 source_doc_id=doc_colour.id, source_version="v1.0",
                 source_passage="Section 1.2 — Brand Colours. Primary green (#7AB93B) and neutral sand (#F4EFE3) are the only approved campaign background colours.",
                 source_page=12, overrides_this_quarter=4),
            dict(code="LO-02", title="Logo clear space and placement",
                 summary="The wordmark needs clear space equal to the shield height on all sides.",
                 subject="Logo usage", condition='logo.clearSpace < shield.height',
                 action="Require layout correction before approval",
                 scope="All brands · All channels", priority="High",
                 source_doc_id=doc_colour.id, source_version="v1.0",
                 source_passage="Section 2.3 — Clear space. Maintain clear space equal to the height of the shield on all four sides of the wordmark.",
                 source_page=18, overrides_this_quarter=2),
            dict(code="TY-01", title="Approved typefaces only",
                 summary="Headlines use Inter; body copy uses Instrument Serif. No decorative substitutions.",
                 subject="Typography", condition='text.font NOT IN [Inter, Instrument Serif]',
                 action="Request changes — replace the typeface",
                 scope="All brands · All channels", priority="Medium",
                 source_doc_id=doc_colour.id, source_version="v1.0",
                 source_passage="Section 1.1 — Typefaces. Inter is used for headlines and display; Instrument Serif for body copy. Substituting decorative fonts is not permitted.",
                 source_page=6, overrides_this_quarter=1),
            dict(code="IM-03", title="Natural-light product photography",
                 summary="Product imagery must use natural light with visible texture.",
                 subject="Visual Identity", condition='image.lighting != "natural"',
                 action="Flag for visual review",
                 scope="PureGlow · All channels", priority="Low",
                 source_doc_id=doc_colour.id, source_version="v1.0",
                 source_passage="Section 2.1 — Photography. Shoot in natural daylight and keep ingredient texture visible.",
                 source_page=10, overrides_this_quarter=0),
            dict(code="SM-01", title="Platform aspect ratios",
                 summary="Instagram assets must be 4:5 or 1:1; Stories must be 9:16.",
                 subject="Logo usage", condition='asset.ratio NOT IN platform.allowedRatios',
                 action="Request changes — re-export at a supported ratio",
                 scope="All brands · Social", priority="Low",
                 source_doc_id=doc_colour.id, source_version="v1.0",
                 source_passage="Section 1.3 — Formats. Feed assets are produced at 4:5 or 1:1.",
                 source_page=4, overrides_this_quarter=0),
            # --- needs_confirmation ---
            dict(code="BR-08", title="Seasonal accent palette (proposed)",
                 summary="Adds a seasonal 'Teal' accent for festival campaigns.",
                 subject="Visual background", condition='background.colour IN palette.seasonal',
                 action="Allow with campaign tag", status="needs_confirmation",
                 scope="All brands · Campaign", priority="Medium",
                 source_doc_id=doc_colour.id, source_version="v1.0",
                 source_passage="Section 1.4 — Seasonal accents. A seasonal accent may be introduced for a single campaign window.",
                 source_page=14, overrides_this_quarter=0),
        ]
        rule_objs = []
        for r in rules_data:
            r.setdefault("status", "active")
            rule = models.Rule(id=new_id("rule"), **r)
            rule_objs.append(rule)
            if r.get("source_passage") and r.get("source_doc_id"):
                db.add(
                    models.GuidelinePassage(
                        id=new_id("gp"),
                        doc_id=r["source_doc_id"],
                        workspace="PureGlow",
                        page_number=r.get("source_page", 1),
                        paragraph_number=1,
                        heading=r.get("subject", ""),
                        passage_text=r["source_passage"],
                    )
                )
        db.add_all(rule_objs)
        db.commit()

        # ------------------------------------------------------------------
        # Approved claims (~6)
        # ------------------------------------------------------------------
        claims = [
            ("made without added fragrance", "PureGlow Skincare", "Claims & Compliance Playbook v1.3", "PureGlow · All channels"),
            ("Dermatologically tested", "PureGlow Skincare", "Claims & Compliance Playbook v1.3", "PureGlow · All channels"),
            ("Made with 98% naturally derived ingredients", "PureGlow Skincare", "Claims & Compliance Playbook v1.3", "PureGlow · All channels"),
            ("Gentle care for sensitive skin", "PureGlow Skincare", "Claims & Compliance Playbook v1.3", "PureGlow · All channels"),
            ("Recyclable glass jar", "PureGlow Packaging", "Claims & Compliance Playbook v1.3", "PureGlow · All channels"),
            ("Vegan and cruelty free", "PureGlow Skincare", "Claims & Compliance Playbook v1.3", "PureGlow · All channels"),
        ]
        for text, product, source, scope in claims:
            db.add(models.ApprovedClaim(
                id=new_id("cl"), text=text, product=product, source=source,
                scope=scope, status="approved", approved_at=now(), approved_by=david.id,
            ))
        db.commit()

        # ------------------------------------------------------------------
        # Submissions (~14)
        # ------------------------------------------------------------------
        # (index, title, excerpt, type, channel, brand, status, thumb, asset, v1_text, comments, decision)
        submissions_data = [
            (0, "Summer Sale Campaign", "Up to 50% off on all organic skincare products.",
             "Image", "Social Media", "PureGlow", "Changes Requested",
             ("art", "lime", "bottle"),
             {"backgroundColour": "#FF0000", "clearSpaceRatio": 1.0, "typeface": "Söhne"},
             "Summer sale! Up to 50% off everything. Limited time only!",
             [("u", "The background colour is outside the approved palette — please use green or request an exception."),
              ("e", "Got it! I'll update the background to green.")],
             ("Changes Requested", "Background outside palette; discount claim needs a campaign window.")),
            (1, "New Product Launch", "Introducing our new organic skincare line.",
             "Text", "Website", "PureGlow", "Pending",
             ("art", "mint", "leaf"),
             {"backgroundColour": "#7AB93B", "typeface": "Inter"},
             "Introducing our new organic skincare line. Dermatologically tested. Made with 98% naturally derived ingredients.",
             [], None),
            (2, "Wellness Campaign", "Feel good. Naturally.",
             "Text", "Email", "WellnessLife", "Pending",
             ("art", "rose", "wave"),
             {"typeface": "Inter"},
             "Feel good. Naturally. Made with simple, familiar ingredients.",
             [], None),
            (3, "Influencer Collaboration", "Paid partnership with @cleanbeautyco",
             "Image", "Influencer", "WellnessLife", "Pending",
             ("art", "violet", "wave"),
             {"unreadable": True},
             "Check out our new serum, together with @cleanbeautyco.",
             [], None),
            (4, "Product Highlight", "Gentle care for sensitive skin.",
             "Image", "Instagram", "PureGlow", "Approved",
             ("art", "sky", "bag"),
             {"backgroundColour": "#7AB93B", "clearSpaceRatio": 1.2, "typeface": "Inter"},
             "Gentle care for sensitive skin. Made without added fragrance.",
             [("d", "Claims match the Approved Claims List. Approved for Instagram.")],
             ("Approved", "Claims verified against the Approved Claims List.")),
            (5, "Brand Awareness Post", "Real ingredients. Real results.",
             "Image", "Instagram", "PureGlow", "Pending",
             ("art", "violet", "star"),
             {"backgroundColour": "#7AB93B", "clearSpaceRatio": 1.0, "typeface": "Söhne"},
             "Real ingredients. Real results. Our botanical serum, photographed in natural light.",
             [], None),
            (6, "Festival Special", "Limited time offer – 40% off!",
             "Text", "Email", "PureGlow", "Changes Requested",
             ("art", "peach", "star"),
             {"typeface": "Inter"},
             "Festival Special! 40% off everything! Hurry, don't miss out!",
             [("d", "Narrow the offer to selected sets and add a campaign window.")],
             ("Changes Requested", "Discount claim needs a verifiable window.")),
            (7, "Special Offer Banner", "Don't miss out!",
             "Image", "Website", "PureGlow", "Pending",
             ("art", "rose", "bag"),
             {"backgroundColour": "#FF0000", "typeface": "Söhne"},
             "Don't miss out! 100% safe for all skin types. Order now!",
             [], None),
            (8, "Healthy Living Series", "Simple habits. Better you.",
             "Image", "Website", "WellnessLife", "Pending",
             ("art", "mint", "leaf"),
             {"backgroundColour": "#7AB93B", "clearSpaceRatio": 1.4, "typeface": "Söhne"},
             "Simple habits. Better you. A four-part series on everyday rituals.",
             [], None),
            (9, "Limited Offer Banner", "50% off selected sets",
             "Image", "Website", "PureGlow", "Pending",
             ("art", "sand", "bag"),
             {"backgroundColour": "#F4EFE3", "clearSpaceRatio": 1.0, "typeface": "Inter"},
             "50% off selected sets — no end date stated.",
             [], None),
            (10, "Spring Collection", "A lighter start to the season.",
             "Image", "Website", "PureGlow", "Pending",
             ("art", "lime", "leaf"),
             {"backgroundColour": "#7AB93B", "clearSpaceRatio": 1.3, "typeface": "Söhne"},
             "A lighter start to the season. Spring Collection, now available.",
             [], None),
            (11, "Holiday Offer", "Gift sets for the festive season.",
             "Image", "Social Media", "PureGlow", "Pending",
             ("art", "peach", "star"),
             {"backgroundColour": "#FF0000", "typeface": "Söhne"},
             "Gift sets for the festive season, wrapped in recyclable paper.",
             [], None),
            (12, "Sustainability Report", "Our 2025 packaging progress.",
             "Document", "Website", "PureGlow", "Pending",
             ("doc", "sky", "text"),
             {"typeface": "Inter"},
             "Our 2025 packaging progress: 84% of jars are now recyclable glass.",
             [], None),
            (13, "Autumn Ritual Landing Page", "Landing page copy for the autumn ritual set.",
             "URL", "Website", "PureGlow", "Pending",
             ("doc", "indigo", "text"),
             {"typeface": "Comic Sans"},
             "The autumn ritual: three steps, five minutes, every evening.",
             [], None),
        ]

        active_rules = db.query(models.Rule).filter_by(status="active").all()
        created_subs = []
        for (idx, title, excerpt, stype, channel, brand, status,
             thumb, asset_d, v1_text, comments, decision) in submissions_data:
            sub = models.Submission(
                id=new_id("sub"),
                code=f"SUB-{1042 - idx}",
                title=title, excerpt=excerpt, type=stype, channel=channel,
                brand=brand, status=status, creator_id=emily.id,
                version=1,
                created_at=now() - timedelta(days=idx * 2 + 1),
                updated_at=now() - timedelta(days=max(0, idx - 1)),
                thumb_kind=thumb[0], thumb_palette=thumb[1], thumb_glyph=thumb[2],
                asset_background_colour=asset_d.get("backgroundColour"),
                asset_clear_space_ratio=asset_d.get("clearSpaceRatio"),
                asset_typeface=asset_d.get("typeface"),
                asset_aspect_ratio=asset_d.get("aspectRatio"),
                asset_unreadable=bool(asset_d.get("unreadable", False)),
            )
            db.add(sub)
            db.flush()

            db.add(models.ContentVersion(
                id=new_id("v"), submission_id=sub.id, version=1, text=v1_text,
                author_id=emily.id, note="Initial submission",
                created_at=sub.created_at,
            ))

            asset_obj = Asset(asset_d)
            findings = run_rules(active_rules, v1_text, channel, asset_obj)
            for f in findings:
                db.add(models.Finding(
                    id=new_id("f"), submission_id=sub.id,
                    rule_code=f.rule_code, rule_title=f.rule_title,
                    type=f.type, severity=f.severity,
                    explanation=f.explanation,
                    source_doc_id=f.source_doc_id,
                    source_doc_name=doc_name.get(f.source_doc_id, ""),
                    source_version=f.source_version, source_page=f.source_page,
                    source_passage=f.source_passage,
                    evidence_verified=f.evidence_verified,
                    suggested_fix=f.suggested_fix, status="open",
                ))

            sub.issue_count = len(findings)
            sub.priority = "High" if any(f.severity == "High" for f in findings) else (
                "Low" if not findings else "Medium")

            for author_tag, body in comments:
                author_id = david.id if author_tag == "d" else emily.id
                db.add(models.Comment(
                    id=new_id("c"), submission_id=sub.id, author_id=author_id,
                    body=body, created_at=now() - timedelta(hours=4),
                ))
            if decision:
                action, note = decision
                db.add(models.ReviewDecision(
                    id=new_id("d"), submission_id=sub.id, action=action,
                    version=1, reviewer_id=david.id, note=note,
                    created_at=now() - timedelta(hours=3),
                ))
            created_subs.append(sub)
        db.commit()

        # ------------------------------------------------------------------
        # Exceptions (~4: one Expired, one Approved, two Pending)
        # ------------------------------------------------------------------
        excs = [
            dict(code="EXC-2041", content=created_subs[0], rule_code="BR-01",
                 rule_title="Approved background colours",
                 reason="Seasonal colour palette not in guidelines",
                 scope="Campaign · Summer Sale 2025", status="Pending",
                 expires=now() + timedelta(days=30)),
            dict(code="EXC-2040", content=created_subs[4], rule_code="TY-01",
                 rule_title="Approved typefaces only",
                 reason="Custom font usage on the product page hero",
                 scope="Product page · Hero", status="Approved",
                 decided=david.id, conditions="Hero only; remove in paid media.",
                 expires=now() + timedelta(days=20)),
            dict(code="EXC-2039", content=created_subs[8], rule_code="LO-02",
                 rule_title="Logo clear space and placement",
                 reason="Studio lighting used for series consistency",
                 scope="Series · Website", status="Expired",
                 decided=david.id, conditions="Series-scoped; expired automatically.",
                 expires=now() - timedelta(days=14)),
            dict(code="EXC-2038", content=created_subs[3], rule_code="PA-05",
                 rule_title="Paid partnership disclosure",
                 reason="Third-party logo co-branding on influencer post",
                 scope="Influencer · Paid partnership", status="Pending",
                 expires=now() + timedelta(days=10)),
        ]
        for e in excs:
            ex_id = new_id("exc")
            db.add(models.ExceptionRequest(
                id=ex_id, code=e["code"], content_id=e["content"].id,
                content_title=e["content"].title,
                content_meta=f"{e['content'].type} · {e['content'].channel}",
                brand=e["content"].brand, rule_code=e["rule_code"],
                rule_title=e["rule_title"], reason=e["reason"], scope=e["scope"],
                requested_by_id=emily.id,
                decided_by_id=e.get("decided"),
                effective_from=now() - timedelta(days=2),
                expires_at=e["expires"], status=e["status"],
                conditions=e.get("conditions", ""),
                decided_at=(now() - timedelta(days=1)) if e.get("decided") else None,
                thumb_kind=e["content"].thumb_kind,
                thumb_palette=e["content"].thumb_palette,
                thumb_glyph=e["content"].thumb_glyph,
            ))
            db.add(models.ExceptionRulingHistory(
                id=new_id("erh"),
                exception_id=ex_id,
                action="Requested",
                actor_id=emily.id,
                actor_name=emily.name,
                actor_role="creator",
                reason_or_conditions=e["reason"],
                at=now() - timedelta(days=2),
            ))
            if e.get("decided"):
                db.add(models.ExceptionRulingHistory(
                    id=new_id("erh"),
                    exception_id=ex_id,
                    action=e["status"],
                    actor_id=david.id,
                    actor_name=david.name,
                    actor_role="manager",
                    reason_or_conditions=e.get("conditions", ""),
                    at=now() - timedelta(days=1),
                ))
        db.commit()

        # ------------------------------------------------------------------
        # Simulations (~2 static records)
        # ------------------------------------------------------------------
        def sim_items(entries):
            out = []
            for sub, impact, note in entries:
                out.append(dict(
                    submissionId=sub.id, title=sub.title,
                    meta=f"{sub.type} · {sub.channel}",
                    thumb=dict(kind=sub.thumb_kind, palette=sub.thumb_palette,
                               glyph=sub.thumb_glyph),
                    type=sub.type, currentStatus=sub.status,
                    impact=impact, note=note,
                ))
            return out

        sim1 = models.Simulation(
            id=new_id("sim"), name="Added Teal to Brand Colours",
            rule_id=rule_objs[9].id, rule_code="BR-01",
            change_type="Update allowed colours",
            current_value="Green #7AB93B, Sand #F4EFE3",
            new_value="Green #7AB93B, Sand #F4EFE3, Teal #2E7D8F",
            status="Completed", created_at=now() - timedelta(days=1),
            created_by_id=david.id,
            items=sim_items([
                (created_subs[0], "Needs Review", "Teal background would now be allowed for this campaign."),
                (created_subs[4], "Compliant", "No background change; already compliant."),
                (created_subs[5], "Compliant", "Uses approved green background."),
                (created_subs[7], "Needs Review", "Teal plus a separate open claims issue."),
                (created_subs[11], "Non-Compliant", "Background #FF0000 is outside both palettes."),
            ]),
            insight=[
                "Adding 'Teal' has minimal impact on most checked assets.",
                "No conflicts detected with text or claims guidelines.",
            ],
            totals=dict(checked=5, compliant=2, needsReview=2, nonCompliant=1),
        )
        sim2 = models.Simulation(
            id=new_id("sim"), name="Updated Claim Wording",
            rule_id=rule_objs[0].id, rule_code="CL-03",
            change_type="Replace approved wording",
            current_value="fragrance free",
            new_value="made without added fragrance",
            status="Completed", created_at=now() - timedelta(days=3),
            created_by_id=david.id,
            items=sim_items([
                (created_subs[4], "Non-Compliant", "Approved version still uses the old wording."),
                (created_subs[1], "Compliant", "Uses only claims unaffected by the change."),
                (created_subs[7], "Needs Review", "Contains a different open claim issue."),
            ]),
            insight=[
                "1 previously approved asset becomes non-compliant if this change is activated.",
                "Notify the owner before activation.",
            ],
            totals=dict(checked=3, compliant=1, needsReview=1, nonCompliant=1),
        )
        db.add_all([sim1, sim2])
        db.commit()

        # ------------------------------------------------------------------
        # Audit events (~10)
        # ------------------------------------------------------------------
        def thumb_for(sub):
            return dict(kind=sub.thumb_kind, palette=sub.thumb_palette, glyph=sub.thumb_glyph)

        audit = [
            ("Login", "David Kim signed in", "PureGlow", david.id, None, "auth", None, 9),
            ("Login", "Emily Carter signed in", "PureGlow", emily.id, None, "auth", None, 8),
            ("Approved", created_subs[4].title, created_subs[4].brand, david.id,
             created_subs[4].id, "submission", thumb_for(created_subs[4]), 7),
            ("Rejected", created_subs[7].title, created_subs[7].brand, david.id,
             created_subs[7].id, "submission", thumb_for(created_subs[7]), 6),
            ("Exception", "Exception requested for " + created_subs[0].title,
             created_subs[0].brand, emily.id, created_subs[0].id, "exception",
             thumb_for(created_subs[0]), 5),
            ("Revised", created_subs[0].title + " v2 uploaded", created_subs[0].brand,
             emily.id, created_subs[0].id, "submission", thumb_for(created_subs[0]), 4),
            ("Rule updated", "BR-01 Approved background colours", "PureGlow", david.id,
             rule_objs[9].id, "rule", None, 3),
            ("Guideline updated", doc_colour.name, "PureGlow", david.id,
             doc_colour.id, "guideline", None, 3),
            ("Simulation", "Simulation run: Added Teal to Brand Colours", "PureGlow",
             david.id, sim1.id, "simulation", None, 2),
            ("Exception", "Exception approved for " + created_subs[4].title,
             created_subs[4].brand, david.id, created_subs[4].id, "exception",
             thumb_for(created_subs[4]), 1),
        ]
        for action, title, brand, uid, eid, kind, thumb, days_ago in audit:
            db.add(models.AuditEvent(
                id=new_id("ae"), at=now() - timedelta(days=days_ago),
                action=action, entity_title=title, entity_meta="", brand=brand,
                user_id=uid, details="", status="Recorded", entity_kind=kind,
                entity_id=eid or "", version=None, thumb=thumb,
            ))
        db.commit()

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        print(
            "Seeded: {} users, {} docs, {} rules, {} claims, {} submissions, "
            "{} exceptions, {} simulations, {} audit events.".format(
                db.query(models.User).count(),
                db.query(models.GuidelineDoc).count(),
                db.query(models.Rule).count(),
                db.query(models.ApprovedClaim).count(),
                db.query(models.Submission).count(),
                db.query(models.ExceptionRequest).count(),
                db.query(models.Simulation).count(),
                db.query(models.AuditEvent).count(),
            )
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
