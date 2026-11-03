"""Seed script for the Precedent backend.

Mirrors the fictional dataset in src/lib/demo-data.ts with a 2-user workspace.
Run with:  python seed.py
"""
import os
import json
import shutil
from jose import jwt
from datetime import datetime, timedelta, timezone

from app.config import settings
from app.db import SessionLocal, init_db, engine
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
    # Rebuild the schema from the current models before seeding. `create_all`
    # only creates *missing* tables — it never adds columns to an existing one —
    # so a dev DB built by an older version would otherwise drift from the ORM
    # (e.g. the `workspace` columns). Dropping and recreating guarantees the
    # seeded database always matches the models.
    models.Base.metadata.drop_all(bind=engine)
    init_db()
    print("schema rebuilt from models")
    db = SessionLocal()
    try:
        # Tables are freshly created above, so no row-clearing is needed.

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
            # --- A1 VisualGuard rules (measured by the poster pipeline) ---
            dict(code="LOGO-001", title="Official logo must be present",
                 summary="The approved wordmark must be detected on the asset. A low-confidence "
                         "match goes to human review rather than being called a violation.",
                 subject="Logo usage", condition='logo.match.confidence < approvedThreshold',
                 action="Request changes — place the approved logo, or send for human review",
                 scope="All brands · All channels", priority="High",
                 source_doc_id=doc_colour.id, source_version="v1.0",
                 source_passage="Section 2.2 — Logo integrity. Only the approved wordmark may appear. "
                                "Do not redraw, recolour or substitute the mark.",
                 source_page=17, overrides_this_quarter=2),
            dict(code="COLOR-001", title="Background within approved palette",
                 summary="The measured background must sit inside the approved palette tolerance.",
                 subject="Brand colour", condition='background.distance > paletteTolerance',
                 action="Request changes — use an approved background",
                 scope="All brands · All channels", priority="Medium",
                 source_doc_id=doc_colour.id, source_version="v1.0",
                 source_passage="Section 1.2 — Brand Colours. Primary green (#7AB93B) and neutral "
                                "sand (#F4EFE3) are the approved campaign backgrounds.",
                 source_page=12, overrides_this_quarter=4),
            dict(code="CONTRAST-001", title="Text meets WCAG AA contrast",
                 summary="Measured text contrast must meet 4.5:1 (3:1 for large text). This is an "
                         "automated check, not an accessibility certification.",
                 subject="Readability", condition='text.contrast < wcag.minimum',
                 action="Request changes — raise the contrast",
                 scope="All brands · All channels", priority="Medium",
                 source_doc_id=doc_colour.id, source_version="v1.0",
                 source_passage="Section 3.1 — Legibility. Text must remain legible on the campaign "
                                "background at the smallest published size.",
                 source_page=20, overrides_this_quarter=1),
            dict(code="FORMAT-001", title="Approved channel format",
                 summary="The aspect ratio must be one of the approved channel formats.",
                 subject="Layout", condition='asset.aspectRatio NOT IN approvedFormats',
                 action="Request changes — re-export at an approved ratio",
                 scope="All brands · All channels", priority="Low",
                 source_doc_id=doc_colour.id, source_version="v1.0",
                 source_passage="Section 1.3 — Formats. Assets are exported at 1:1, 4:5, 9:16, "
                                "16:9, 3:2 or 2:3 depending on channel.",
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
        # Brand / product assets (demo images from public/images/assets)
        # Each asset belongs to a particular brand, so the content list can
        # show the real attached image instead of the generated glyph.
        # ------------------------------------------------------------------
        public_assets = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "public", "images", "assets",
        )
        os.makedirs(settings.uploads_dir, exist_ok=True)
        demo_assets_spec = [
            ("summer", "Summer Vibes", "PureGlow", "approved", "Seasonal campaign key visual.", "Product Image", "jpg"),
            ("festival", "Festival Special", "PureGlow", "approved", "Festival campaign banner.", "Product Image", "jpg"),
            ("ingredients", "Better Together", "PureGlow", "approved", "Ingredient story visual.", "Product Image", "jpg"),
            ("sensitive", "Sensitive Skin", "PureGlow", "approved", "Product hero for sensitive skin.", "Product Image", "jpg"),
            ("awareness", "Brand Awareness", "PureGlow", "approved", "Brand awareness creative.", "Product Image", "jpg"),
            ("holiday", "Holiday Gift Set", "PureGlow", "approved", "Festive gift set visual.", "Product Image", "jpg"),
            ("wellness", "Wellness Life", "WellnessLife", "approved", "WellnessLife lifestyle visual.", "Product Image", "jpg"),
            ("partner", "Partner Co-brand", "WellnessLife", "pending", "Influencer co-brand visual.", "Product Image", "jpg"),
            # A1 VisualGuard demo assets. The wordmark is the template the poster
            # analyser matches against; the poster is a deliberately imperfect
            # creative that exercises the measured rules end to end.
            ("logo_pureglow", "PureGlow Wordmark", "PureGlow", "approved",
             "Approved wordmark used by VisualGuard logo matching.", "Brand logo", "png"),
            ("poster_audit", "Sensitive Skin Launch Poster", "PureGlow", "approved",
             "Poster creative used for the VisualGuard walkthrough.", "Product Image", "jpg"),
        ]
        demo_assets = {}
        for key, name, abrand, astatus, anotes, acategory, aext in demo_assets_spec:
            src = os.path.join(public_assets, f"{key}.{aext}")
            if not os.path.exists(src):
                continue
            dst = os.path.join(settings.uploads_dir, f"demo_{key}.{aext}")
            shutil.copyfile(src, dst)
            asset = models.BrandAsset(
                id=new_id("asset"), workspace="PureGlow", name=name, brand=abrand,
                category=acategory, file_path=dst, source="upload",
                status=astatus, notes=anotes, uploaded_by_id=david.id,
            )
            db.add(asset)
            demo_assets[key] = asset
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
            # A1 VisualGuard demo: the facts for this one come from the poster
            # pipeline (measured), not from the manual dict above.
            (14, "Sensitive Skin Launch Poster", "Poster for the sensitive skin range.",
             "Image", "Social Media", "PureGlow", "Pending",
             ("art", "lime", "leaf"),
             {},
             "New poster for the sensitive skin range.",
             [], None),
        ]

        active_rules = db.query(models.Rule).filter_by(status="active").all()
        # Which demo image (if any) each submission carries as its reference.
        demo_asset_for = {
            0: "summer", 1: "ingredients", 2: "wellness", 3: "partner",
            4: "sensitive", 5: "awareness", 6: "festival", 11: "holiday",
            14: "poster_audit",
        }
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

            demo_key = demo_asset_for.get(idx)
            if demo_key and demo_key in demo_assets:
                attached = demo_assets[demo_key]
                sub.asset_id = attached.id
                sub.asset_name = attached.name
                sub.asset_url = f"/assets/{attached.id}/file"
                sub.asset_source = attached.source
                sub.asset_attribution = attached.notes

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
                    suggested_fix=f.suggested_fix,
                    outcome=getattr(f, "outcome", "violation"),
                    status="open",
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
        # A1 VisualGuard: run the real poster analysis once, so the demo opens
        # with measured facts instead of a pending spinner. If the imaging
        # stack or Tesseract is unavailable this is skipped and the poster
        # simply shows as pending — the app stays usable either way.
        # ------------------------------------------------------------------
        try:
            from app.services.visual import pipeline as visual_pipeline

            poster_asset = demo_assets.get("poster_audit")
            poster_sub = next(
                (s for s in created_subs if poster_asset and s.asset_id == poster_asset.id),
                None,
            )
            if poster_asset is not None and poster_sub is not None:
                analysis = visual_pipeline.create_analysis(
                    db,
                    file_path=poster_asset.file_path,
                    workspace=poster_sub.workspace or "PureGlow",
                    user_id=emily.id,
                    asset_id=poster_asset.id,
                    submission_id=poster_sub.id,
                )
                visual_pipeline.analyze_asset(db, analysis.id)
                db.commit()
                print(f"  A1 VisualGuard: analysis {analysis.status} for '{poster_sub.title}'")
        except Exception as exc:  # never let a demo extra break the seed
            db.rollback()
            print(f"  A1 VisualGuard: skipped ({type(exc).__name__}: {exc})")

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
        # A3 Sentinel demo scenario (fictional, deterministic)
        # ------------------------------------------------------------------
        # Scenario 6 from the Round 3 brief: an approved item that a later rule
        # change affects. The publication record proves the version shipped; the
        # task + notifications show what Sentinel raises. Real triggers create
        # exactly the same rows through services/sentinel.py.
        published_sub = created_subs[4]
        published_version = (
            db.query(models.ContentVersion)
            .filter(models.ContentVersion.submission_id == published_sub.id)
            .order_by(models.ContentVersion.version.desc())
            .first()
        )
        db.add(models.Publication(
            id=new_id("pub"),
            workspace=published_sub.brand,
            submission_id=published_sub.id,
            submission_version_id=published_version.id if published_version else None,
            channel="Instagram",
            published_at=now() - timedelta(days=2),
            published_by=david.id,
            status="published",
        ))
        task = models.ReassessmentTask(
            id=new_id("rt"),
            workspace=published_sub.brand,
            submission_id=published_sub.id,
            submission_version_id=published_version.id if published_version else None,
            trigger_type="rule_edited",
            trigger_ref=rule_objs[1].id,
            reason=(
                f"{rule_objs[1].code} was tightened after this version was approved: "
                "the prohibited-term list now covers wording used in the published copy."
            ),
            affected_rule_codes=[rule_objs[1].code],
            assignee_id=emily.id,
            status="open",
            due_at=now() + timedelta(days=settings.sentinel_sla_days),
            created_at=now() - timedelta(hours=6),
        )
        db.add(task)
        for uid, title in (
            (emily.id, f"Re-check needed: {published_sub.title}"),
            (david.id, f"Sentinel raised a reassessment task for {published_sub.title}"),
        ):
            db.add(models.Notification(
                id=new_id("nt"),
                workspace=published_sub.brand,
                user_id=uid,
                type="sentinel_task",
                title=title,
                payload={
                    "taskId": task.id,
                    "submissionId": published_sub.id,
                    "triggerType": "rule_edited",
                    "ruleCode": rule_objs[1].code,
                },
                created_at=now() - timedelta(hours=6),
            ))
        db.commit()

        # ------------------------------------------------------------------
        # N10 Approved Snippets & N11 Finding Feedback
        # ------------------------------------------------------------------
        snippets_data = [
            models.ApprovedSnippet(
                id=new_id('snp'),
                workspace='PureGlow',
                text='100% Recyclable Glass & FSC-Certified Outer Carton (Packaging §4.2)',
                category='Claim',
                rule_codes=['CL-03', 'CL-04'],
                valid_from=now() - timedelta(days=10),
                valid_until=now() + timedelta(days=90),
                status='active',
                created_by=david.name,
                created_at=now() - timedelta(days=10),
            ),
            models.ApprovedSnippet(
                id=new_id('snp'),
                workspace='PureGlow',
                text='Dermatologically Tested under ISO-22716 Clinical Safety Protocol (Study PG-2026-B)',
                category='Claim',
                rule_codes=['CL-02', 'CL-03'],
                valid_from=now() - timedelta(days=20),
                valid_until=now() + timedelta(days=180),
                status='active',
                created_by=david.name,
                created_at=now() - timedelta(days=20),
            ),
            models.ApprovedSnippet(
                id=new_id('snp'),
                workspace='PureGlow',
                text='Paid partnership with PureGlow. Terms & Conditions apply.',
                category='Disclaimer',
                rule_codes=['PA-05'],
                valid_from=now() - timedelta(days=30),
                valid_until=now() + timedelta(days=365),
                status='active',
                created_by=david.name,
                created_at=now() - timedelta(days=30),
            ),
            models.ApprovedSnippet(
                id=new_id('snp'),
                workspace='PureGlow',
                text='Festive Glow Special · 20% off with promo code GLOW20 · Valid until Nov 14, 2026',
                category='Promotion',
                rule_codes=['MK-02', 'PRICE-001'],
                valid_from=now() - timedelta(days=2),
                valid_until=now() + timedelta(days=12),
                status='active',
                created_by=david.name,
                created_at=now() - timedelta(days=2),
            ),
            models.ApprovedSnippet(
                id=new_id('snp'),
                workspace='PureGlow',
                text='Cruelty-Free International Leaping Bunny Certification (Audit Batch #91)',
                category='Legal',
                rule_codes=['CL-03'],
                valid_from=now() - timedelta(days=85),
                valid_until=now() + timedelta(days=5),
                status='active',
                created_by=david.name,
                created_at=now() - timedelta(days=85),
            ),
        ]
        db.add_all(snippets_data)

        sample_finding = db.query(models.Finding).filter(models.Finding.rule_code == 'CL-03').first()
        if sample_finding:
            fb = models.FindingFeedback(
                id=new_id('fbk'),
                workspace='PureGlow',
                finding_id=sample_finding.id,
                submission_id=sample_finding.submission_id,
                rule_code=sample_finding.rule_code,
                user_id=emily.id,
                user_name=emily.name,
                reason='exception_applies',
                notes='This phrasing matches the Diwali seasonal campaign exception approved by David Kim.',
                status='submitted',
                created_at=now() - timedelta(hours=3),
            )
            db.add(fb)
        db.commit()

        # ------------------------------------------------------------------
        # Round 3 & Multi-Agent System Seeding:
        # AssetAnalysis, AiFinding, AiCallLog, ApprovalPassport, AgentTraceRecord,
        # Publications & Sentinel ReassessmentTasks
        # ------------------------------------------------------------------
        print("  Seeding Round 3 Innovations & Review Crew multi-agent data...")

        # 1. AssetAnalysis records
        # Point at a poster that actually exists on disk. The old code named
        # "demo_poster_diwali.png", which was never written, so every seeded
        # analysis served a 404 and the review screen logged a console error.
        _poster_candidates = [
            "demo_poster.png",
            "demo_festival.jpg",
            "demo_holiday.jpg",
            "demo_awareness.jpg",
            "demo_summer.jpg",
        ]
        demo_asset_path = next(
            (
                os.path.join(settings.uploads_dir, name)
                for name in _poster_candidates
                if os.path.exists(os.path.join(settings.uploads_dir, name))
            ),
            None,
        )

        analysis_01 = models.AssetAnalysis(
            id=new_id("aa"),
            workspace="PureGlow",
            submission_id=created_subs[0].id,
            file_path=demo_asset_path,
            status="complete",
            error=None,
            width=1080,
            height=1080,
            ocr_text="PureGlow Festive Radiance\n100% natural and safe with organic saffron\nFlat 20% off with code GLOW20\nदिवाली स्पेशल ऑफर\nTerms & conditions apply",
            text_blocks=[
                {"box": [80, 120, 920, 210], "text": "PureGlow Festive Radiance", "conf": 0.98},
                {"box": [80, 240, 950, 310], "text": "100% natural and safe with organic saffron", "conf": 0.94},
                {"box": [80, 340, 800, 410], "text": "Flat 20% off with code GLOW20", "conf": 0.96},
                {"box": [80, 440, 600, 510], "text": "दिवाली स्पेशल ऑफर", "conf": 0.93},
                {"box": [80, 920, 650, 970], "text": "Terms & conditions apply", "conf": 0.95},
            ],
            dominant_colors=[
                {"hex": "#7AB93B", "percent": 44.2, "name": "PureGlow Green"},
                {"hex": "#F4EFE3", "percent": 34.6, "name": "Sand Neutral"},
                {"hex": "#2E7D8F", "percent": 15.1, "name": "Teal Accent"},
            ],
            logo_matches=[
                {"box": [64, 48, 240, 108], "template": "logo_pureglow_main", "score": 0.95, "clear_space_pass": True}
            ],
            layout_metrics={"aspect_ratio": "1:1", "clear_space_ratio": 0.24, "typeface": "Inter Display", "primary_color": "#7AB93B"},
            contrast_findings=[
                {"box": [80, 120, 920, 210], "text_color": "#FFFFFF", "bg_color": "#7AB93B", "contrast_ratio": 4.82, "wcag_aa_pass": True, "wcag_aaa_pass": False}
            ],
            analyzer_versions={"ocr": "tesseract-5.3+rapidocr", "colors": "opencv-kmeans", "logo": "orb-matcher"},
            unreadable=False,
            created_by_id=emily.id,
            created_at=now() - timedelta(days=3),
            completed_at=now() - timedelta(days=3, minutes=-2),
        )

        analysis_02 = models.AssetAnalysis(
            id=new_id("aa"),
            workspace="PureGlow",
            submission_id=created_subs[1].id,
            file_path=demo_asset_path,
            status="complete",
            error=None,
            width=1080,
            height=1350,
            ocr_text="PureGlow Clinical Care\nDermatologically Tested Under ISO-22716\nActive 15% Vitamin C Complex\n30ml e 1.0 fl oz",
            text_blocks=[
                {"box": [60, 80, 800, 150], "text": "PureGlow Clinical Care", "conf": 0.99},
                {"box": [60, 180, 920, 250], "text": "Dermatologically Tested Under ISO-22716", "conf": 0.97},
                {"box": [60, 280, 850, 340], "text": "Active 15% Vitamin C Complex", "conf": 0.98},
            ],
            dominant_colors=[
                {"hex": "#F4EFE3", "percent": 55.4, "name": "Sand Neutral"},
                {"hex": "#7AB93B", "percent": 28.2, "name": "PureGlow Green"},
            ],
            logo_matches=[
                {"box": [50, 40, 210, 96], "template": "logo_pureglow_main", "score": 0.97, "clear_space_pass": True}
            ],
            layout_metrics={"aspect_ratio": "4:5", "clear_space_ratio": 0.28, "typeface": "Inter Display", "primary_color": "#F4EFE3"},
            contrast_findings=[
                {"box": [60, 80, 800, 150], "text_color": "#1C2024", "bg_color": "#F4EFE3", "contrast_ratio": 12.4, "wcag_aa_pass": True, "wcag_aaa_pass": True}
            ],
            analyzer_versions={"ocr": "tesseract-5.3+rapidocr", "colors": "opencv-kmeans", "logo": "orb-matcher"},
            unreadable=False,
            created_by_id=emily.id,
            created_at=now() - timedelta(days=5),
            completed_at=now() - timedelta(days=5, minutes=-2),
        )

        analysis_03 = models.AssetAnalysis(
            id=new_id("aa"),
            workspace="PureGlow",
            submission_id=created_subs[4].id,
            file_path=demo_asset_path,
            status="complete",
            error=None,
            width=1200,
            height=628,
            ocr_text="PureGlow Daily Moisture\n100% Recyclable Glass Packaging\nNo Artificial Fragrance Added",
            text_blocks=[
                {"box": [80, 60, 820, 130], "text": "PureGlow Daily Moisture", "conf": 0.98},
                {"box": [80, 160, 900, 220], "text": "100% Recyclable Glass Packaging", "conf": 0.96},
            ],
            dominant_colors=[
                {"hex": "#7AB93B", "percent": 58.0, "name": "PureGlow Green"},
                {"hex": "#FFFFFF", "percent": 30.5, "name": "White"},
            ],
            logo_matches=[
                {"box": [60, 50, 220, 105], "template": "logo_pureglow_main", "score": 0.94, "clear_space_pass": True}
            ],
            layout_metrics={"aspect_ratio": "1.91:1", "clear_space_ratio": 0.25, "typeface": "Inter Display", "primary_color": "#7AB93B"},
            contrast_findings=[
                {"box": [80, 60, 820, 130], "text_color": "#FFFFFF", "bg_color": "#7AB93B", "contrast_ratio": 4.95, "wcag_aa_pass": True, "wcag_aaa_pass": False}
            ],
            analyzer_versions={"ocr": "tesseract-5.3+rapidocr", "colors": "opencv-kmeans", "logo": "orb-matcher"},
            unreadable=False,
            created_by_id=emily.id,
            created_at=now() - timedelta(days=7),
            completed_at=now() - timedelta(days=7, minutes=-2),
        )

        analysis_04 = models.AssetAnalysis(
            id=new_id("aa"),
            workspace="PureGlow",
            submission_id=created_subs[6].id,
            file_path=demo_asset_path,
            status="complete",
            error=None,
            width=1080,
            height=1080,
            ocr_text="PureGlow Equinox Awakening\nCelebrate renewal with botanical essentials\nShop the Autumn Collection",
            text_blocks=[
                {"box": [70, 90, 850, 160], "text": "PureGlow Equinox Awakening", "conf": 0.97},
                {"box": [70, 180, 920, 240], "text": "Celebrate renewal with botanical essentials", "conf": 0.95},
            ],
            dominant_colors=[
                {"hex": "#2E7D8F", "percent": 49.0, "name": "Teal Accent"},
                {"hex": "#F4EFE3", "percent": 36.0, "name": "Sand Neutral"},
            ],
            logo_matches=[
                {"box": [70, 50, 240, 110], "template": "logo_pureglow_main", "score": 0.92, "clear_space_pass": True}
            ],
            layout_metrics={"aspect_ratio": "1:1", "clear_space_ratio": 0.22, "typeface": "Inter Display", "primary_color": "#2E7D8F"},
            contrast_findings=[
                {"box": [70, 90, 850, 160], "text_color": "#FFFFFF", "bg_color": "#2E7D8F", "contrast_ratio": 5.4, "wcag_aa_pass": True, "wcag_aaa_pass": True}
            ],
            analyzer_versions={"ocr": "tesseract-5.3+rapidocr", "colors": "opencv-kmeans", "logo": "orb-matcher"},
            unreadable=False,
            created_by_id=emily.id,
            created_at=now() - timedelta(days=9),
            completed_at=now() - timedelta(days=9, minutes=-2),
        )

        db.add_all([analysis_01, analysis_02, analysis_03, analysis_04])
        db.commit()

        # 2. AiFinding records
        v0 = db.query(models.ContentVersion).filter_by(submission_id=created_subs[0].id).first()
        v1 = db.query(models.ContentVersion).filter_by(submission_id=created_subs[1].id).first()
        v3 = db.query(models.ContentVersion).filter_by(submission_id=created_subs[3].id).first()
        v4 = db.query(models.ContentVersion).filter_by(submission_id=created_subs[4].id).first()

        ai_findings_data = [
            models.AiFinding(
                id=new_id("aif"),
                workspace="PureGlow",
                submission_id=created_subs[0].id,
                submission_version_id=v0.id if v0 else None,
                rule_code="CL-03",
                rule_title="Only approved product claims",
                passage_id="doc_claims_p5",
                source_type="guideline_passage",
                confidence=0.96,
                similarity=0.89,
                rationale="The headline asserts '100% natural and safe' which does not appear in the Approved Claims list.",
                minimal_edit="Replace '100% natural and safe' with approved claim 'Formulated with 100% certified organic ingredients'.",
                quote="Section 4.1 — Claims. Only claims recorded in the Approved Claims List may appear in external communication. Use the exact wording listed.",
                citation_verified=True,
                rejected_reason=None,
                model="gpt-4o",
                prompt_version="2.1",
                created_at=now() - timedelta(days=3),
            ),
            models.AiFinding(
                id=new_id("aif"),
                workspace="PureGlow",
                submission_id=created_subs[0].id,
                submission_version_id=v0.id if v0 else None,
                rule_code="MK-02",
                rule_title="Discount claims must be verifiable",
                passage_id="doc_claims_p22",
                source_type="guideline_passage",
                confidence=0.92,
                similarity=0.86,
                rationale="The promotional code GLOW20 offers 20% off but lacks the mandatory expiration window on the visual asset.",
                minimal_edit="Add promotional footer line: 'Valid until Nov 14, 2026. T&Cs apply.'",
                quote="Section 6.2 — Promotional claims. Any \"% off\" statement must be tied to a dated campaign window and a reference price.",
                citation_verified=True,
                rejected_reason=None,
                model="gpt-4o",
                prompt_version="2.1",
                created_at=now() - timedelta(days=3),
            ),
            models.AiFinding(
                id=new_id("aif"),
                workspace="PureGlow",
                submission_id=created_subs[3].id,
                submission_version_id=v3.id if v3 else None,
                rule_code="PA-05",
                rule_title="Paid partnership disclosure",
                passage_id="doc_claims_p15",
                source_type="guideline_passage",
                confidence=0.98,
                similarity=0.93,
                rationale="Influencer caption lacks the explicit paid disclosure line within the first two lines of text.",
                minimal_edit="Prefix caption with: 'Paid partnership with PureGlow.'",
                quote='Section 5.1 — Disclosure. Every paid partnership asset must include the line \"Paid partnership with {brand}\" in the first two lines of caption.',
                citation_verified=True,
                rejected_reason=None,
                model="gpt-4o",
                prompt_version="2.1",
                created_at=now() - timedelta(days=4),
            ),
            models.AiFinding(
                id=new_id("aif"),
                workspace="PureGlow",
                submission_id=created_subs[4].id,
                submission_version_id=v4.id if v4 else None,
                rule_code="CL-04",
                rule_title="No unqualified superlatives",
                passage_id="doc_claims_p9",
                source_type="guideline_passage",
                confidence=0.88,
                similarity=0.84,
                rationale="Copy references packaging recyclability without citing the audited certification batch on the carton.",
                minimal_edit="Add packaging citation: '(Packaging Certification §4.2, FSC-C104231)'.",
                quote='Section 2.4 — Superlatives. Terms including \"100% safe\", \"guaranteed\" and \"no risk\" must be supported by a substantiation reference on the same asset, or removed.',
                citation_verified=True,
                rejected_reason=None,
                model="gpt-4o",
                prompt_version="2.1",
                created_at=now() - timedelta(days=7),
            ),
        ]
        db.add_all(ai_findings_data)
        db.commit()

        # 3. AiCallLog records (18 records spread across 14 days)
        call_logs = []
        purposes = ["retrieval", "semantic_review", "minimal_edit", "visual_ocr"]
        for i in range(18):
            purp = purposes[i % len(purposes)]
            call_logs.append(
                models.AiCallLog(
                    id=new_id("log"),
                    workspace="PureGlow",
                    purpose=purp,
                    model="gpt-4o",
                    prompt_version="2.1",
                    latency_ms=135 + (i * 11) % 140,
                    tokens_in=480 + (i * 47) % 550,
                    tokens_out=110 + (i * 19) % 220,
                    status="success",
                    error=None,
                    citations_verified=3 + (i % 4),
                    citations_rejected=0,
                    redaction_count=0,
                    created_at=now() - timedelta(days=14 - (i * 0.75)),
                )
            )
        db.add_all(call_logs)
        db.commit()

        # 4. ApprovalPassport records (Cryptographic passports for approved items)
        passport_01 = models.ApprovalPassport(
            id="pass_pg_hydragel",
            workspace="PureGlow",
            submission_id=created_subs[4].id,
            version_id=v4.id if v4 else "v_04",
            version_number=1,
            brand="PureGlow",
            title=created_subs[4].title,
            sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            phash="a8f4c2b1e0d93765",
            dhash="7b2c9a1f3e8d0452",
            token=jwt.encode(
                {"sub": created_subs[4].id, "ver": 1, "iss": "precedent-proofpass", "exp": int((now() + timedelta(days=85)).timestamp())},
                settings.secret_key,
                algorithm="HS256",
            ),
            approved_by=david.name,
            status="active",
            revocation_reason=None,
            created_at=now() - timedelta(days=5),
            expires_at=now() + timedelta(days=85),
        )

        passport_02 = models.ApprovalPassport(
            id="pass_pg_vitc",
            workspace="PureGlow",
            submission_id=created_subs[1].id,
            version_id=v1.id if v1 else "v_01",
            version_number=1,
            brand="PureGlow",
            title=created_subs[1].title,
            sha256="9f83c24d9e851639cfa3204c3caf7319e02d8696ec47a885cb14dada79666f47",
            phash="b4d2e8c1f0a93876",
            dhash="6c1b8a2e4d9f0563",
            token=jwt.encode(
                {"sub": created_subs[1].id, "ver": 1, "iss": "precedent-proofpass", "exp": int((now() + timedelta(days=78)).timestamp())},
                settings.secret_key,
                algorithm="HS256",
            ),
            approved_by=david.name,
            status="active",
            revocation_reason=None,
            created_at=now() - timedelta(days=12),
            expires_at=now() + timedelta(days=78),
        )

        passport_03 = models.ApprovalPassport(
            id="pass_pg_awareness",
            workspace="PureGlow",
            submission_id=created_subs[5].id,
            version_id="v_05",
            version_number=1,
            brand="PureGlow",
            title=created_subs[5].title,
            sha256="d5a83b2e7c4f1906a2e4b8d1c7f0a93b5e8c1d4a7f2e0b9c3d6a8f1b4e7c0d2a",
            phash="c1e9a2b8d4f03765",
            dhash="5a9b2c1e7f0d4832",
            token=jwt.encode(
                {"sub": created_subs[5].id, "ver": 1, "iss": "precedent-proofpass", "exp": int((now() + timedelta(days=72)).timestamp())},
                settings.secret_key,
                algorithm="HS256",
            ),
            approved_by=david.name,
            status="active",
            revocation_reason=None,
            created_at=now() - timedelta(days=18),
            expires_at=now() + timedelta(days=72),
        )

        db.add_all([passport_01, passport_02, passport_03])
        db.commit()

        # 5. AgentTraceRecord (Review Crew 5-Agent Execution Traces)
        crew_traces_data = [
            models.AgentTraceRecord(
                id=new_id("trc"),
                workspace="PureGlow",
                submission_id=created_subs[0].id,
                version_num=1,
                orchestrator_status="complete",
                total_duration_ms=2180,
                summary_text="Review Crew 5-Agent Pipeline: Intake validated copy; VisualGuard OCR identified 5 text blocks with 95% logo match; Hybrid retrieval matched 4 guideline passages; Verifier confirmed 100% citation grounding; Summary recommended 1 minimal-edit for unapproved claim.",
                steps_json=json.dumps([
                    {
                        "agent": "intake",
                        "agent_name": "Intake Agent",
                        "status": "success",
                        "duration_ms": 210,
                        "output": {"text_extracted": True, "word_count": 68, "aspect_ratio": "1:1", "language": "en+hi", "channel": "Social Media"},
                    },
                    {
                        "agent": "visual",
                        "agent_name": "VisualGuard Agent",
                        "status": "success",
                        "duration_ms": 640,
                        "output": {"ocr_blocks": 5, "logo_matched": True, "logo_confidence": 0.95, "contrast_pass": True, "dominant_color": "#7AB93B"},
                    },
                    {
                        "agent": "retrieval",
                        "agent_name": "Retrieval Agent",
                        "status": "success",
                        "duration_ms": 380,
                        "output": {"method": "rrf_hybrid", "passages_retrieved": 4, "top_passage": "Claims & Compliance Playbook v1.3 §4.1"},
                    },
                    {
                        "agent": "verifier",
                        "agent_name": "Evidence Verifier",
                        "status": "success",
                        "duration_ms": 420,
                        "output": {"citations_tested": 2, "verified_grounded": 2, "hallucinations": 0, "status": "grounded"},
                    },
                    {
                        "agent": "summary",
                        "agent_name": "Synthesis Agent",
                        "status": "success",
                        "duration_ms": 530,
                        "output": {"findings_count": 2, "suggested_fixes": 2, "risk_level": "medium", "recommended_action": "Request Changes"},
                    },
                ]),
                created_at=now() - timedelta(days=3),
            ),
            models.AgentTraceRecord(
                id=new_id("trc"),
                workspace="PureGlow",
                submission_id=created_subs[1].id,
                version_num=1,
                orchestrator_status="complete",
                total_duration_ms=1960,
                summary_text="Review Crew 5-Agent Pipeline: Verified ISO-22716 study code PG-2026-B. Verifier confirmed full evidence grounding.",
                steps_json=json.dumps([
                    {
                        "agent": "intake",
                        "agent_name": "Intake Agent",
                        "status": "success",
                        "duration_ms": 190,
                        "output": {"text_extracted": True, "word_count": 42, "aspect_ratio": "4:5", "language": "en"},
                    },
                    {
                        "agent": "visual",
                        "agent_name": "VisualGuard Agent",
                        "status": "success",
                        "duration_ms": 580,
                        "output": {"ocr_blocks": 4, "logo_matched": True, "logo_confidence": 0.97, "contrast_pass": True, "dominant_color": "#F4EFE3"},
                    },
                    {
                        "agent": "retrieval",
                        "agent_name": "Retrieval Agent",
                        "status": "success",
                        "duration_ms": 350,
                        "output": {"method": "rrf_hybrid", "passages_retrieved": 3, "top_passage": "Claims & Compliance Playbook v1.3 §3.2"},
                    },
                    {
                        "agent": "verifier",
                        "agent_name": "Evidence Verifier",
                        "status": "success",
                        "duration_ms": 390,
                        "output": {"citations_tested": 2, "verified_grounded": 2, "hallucinations": 0, "status": "grounded"},
                    },
                    {
                        "agent": "summary",
                        "agent_name": "Synthesis Agent",
                        "status": "success",
                        "duration_ms": 450,
                        "output": {"findings_count": 0, "suggested_fixes": 0, "risk_level": "low", "recommended_action": "Approve"},
                    },
                ]),
                created_at=now() - timedelta(days=5),
            ),
            models.AgentTraceRecord(
                id=new_id("trc"),
                workspace="PureGlow",
                submission_id=created_subs[4].id,
                version_num=1,
                orchestrator_status="complete",
                total_duration_ms=1850,
                summary_text="Review Crew 5-Agent Pipeline: All checks passed. 0 deterministic violations, 1 advisory packaging note with verified citation.",
                steps_json=json.dumps([
                    {
                        "agent": "intake",
                        "agent_name": "Intake Agent",
                        "status": "success",
                        "duration_ms": 180,
                        "output": {"text_extracted": True, "word_count": 35, "aspect_ratio": "1.91:1", "language": "en"},
                    },
                    {
                        "agent": "visual",
                        "agent_name": "VisualGuard Agent",
                        "status": "success",
                        "duration_ms": 520,
                        "output": {"ocr_blocks": 3, "logo_matched": True, "logo_confidence": 0.94, "contrast_pass": True, "dominant_color": "#7AB93B"},
                    },
                    {
                        "agent": "retrieval",
                        "agent_name": "Retrieval Agent",
                        "status": "success",
                        "duration_ms": 330,
                        "output": {"method": "rrf_hybrid", "passages_retrieved": 3, "top_passage": "Packaging Guide §4.2"},
                    },
                    {
                        "agent": "verifier",
                        "agent_name": "Evidence Verifier",
                        "status": "success",
                        "duration_ms": 380,
                        "output": {"citations_tested": 1, "verified_grounded": 1, "hallucinations": 0, "status": "grounded"},
                    },
                    {
                        "agent": "summary",
                        "agent_name": "Synthesis Agent",
                        "status": "success",
                        "duration_ms": 440,
                        "output": {"findings_count": 1, "suggested_fixes": 1, "risk_level": "low", "recommended_action": "Approve with Notes"},
                    },
                ]),
                created_at=now() - timedelta(days=7),
            ),
        ]
        db.add_all(crew_traces_data)
        db.commit()

        # 6. Additional Sentinel Publications and Reassessment Tasks
        pub_02 = models.Publication(
            id=new_id("pub"),
            workspace="PureGlow",
            submission_id=created_subs[1].id,
            submission_version_id=v1.id if v1 else None,
            channel="Website",
            published_at=now() - timedelta(days=10),
            published_by=david.id,
            status="published",
        )
        pub_03 = models.Publication(
            id=new_id("pub"),
            workspace="PureGlow",
            submission_id=created_subs[5].id,
            submission_version_id=None,
            channel="LinkedIn",
            published_at=now() - timedelta(days=15),
            published_by=david.id,
            status="published",
        )
        db.add_all([pub_02, pub_03])

        task_02 = models.ReassessmentTask(
            id=new_id("rt"),
            workspace="PureGlow",
            submission_id=created_subs[1].id,
            submission_version_id=v1.id if v1 else None,
            trigger_type="claim_withdrawn",
            trigger_ref="clm_iso22716",
            reason="Approved clinical safety claim wording updated in Claims Playbook §3.2. Published packaging requires re-validation.",
            affected_rule_codes=["CL-03", "CL-06"],
            assignee_id=emily.id,
            status="open",
            due_at=now() + timedelta(days=5),
            created_at=now() - timedelta(hours=14),
        )

        task_03 = models.ReassessmentTask(
            id=new_id("rt"),
            workspace="PureGlow",
            submission_id=created_subs[5].id,
            submission_version_id=None,
            trigger_type="exception_expired",
            trigger_ref="exc_2039",
            reason="Seasonal color exemption EXC-2039 expired on active social banner.",
            affected_rule_codes=["BR-01"],
            assignee_id=david.id,
            status="resolved",
            due_at=now() - timedelta(days=1),
            resolution="reapproved",
            resolution_note="Emily updated asset background to approved Brand Sand #F4EFE3.",
            resolved_by_id=david.id,
            resolved_at=now() - timedelta(hours=5),
            created_at=now() - timedelta(days=3),
        )
        db.add_all([task_02, task_03])
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
