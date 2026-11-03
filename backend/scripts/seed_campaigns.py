"""Link submissions to real campaigns and backfill the stored compliance score.

Spec: PRECEDENT_MASTER Part 4 (campaigns) + observation O2/O4, GAP_REPORT G1/G2.

Before this script the `campaigns` table was empty and every `campaign_id` was
NULL, so the UI fell back to showing the *channel* ("Email", "Website") in the
Campaign column. This creates one campaign row per real initiative and links
each existing submission by its title, then writes the score that
`app/services/scoring.py` computes from the stored findings.

Run:  python scripts/seed_campaigns.py
Idempotent: safe to run more than once.
"""
from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import models  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.ids import new_id  # noqa: E402
from app.services.scoring import FORMULA_VERSION, compute_breakdown  # noqa: E402


def now() -> datetime:
    return datetime.now(timezone.utc)


# name, brand, channel, product, objective
CAMPAIGNS = [
    ("Summer 2026", "PureGlow", "Instagram", "Glow Serum", "Seasonal acquisition push"),
    ("Product Launch — Glow Serum", "PureGlow", "Website", "Glow Serum", "Launch a new hero product"),
    ("Always-On Social", "PureGlow", "Instagram", "General", "Keep the brand present between campaigns"),
    ("Wellness Campaign 2026", "WellnessLife", "Email", "Wellness Pack", "Retention and education"),
    ("Influencer Programme", "WellnessLife", "Influencer", "Wellness Pack", "Creator-led awareness"),
]

# First matching keyword wins, so order matters.
TITLE_RULES = [
    ("summer", "Summer 2026"),
    ("launch", "Product Launch — Glow Serum"),
    ("product", "Product Launch — Glow Serum"),
    ("wellness", "Wellness Campaign 2026"),
    ("influencer", "Influencer Programme"),
    ("collaboration", "Influencer Programme"),
]

BRAND_FALLBACK = {
    "PureGlow": "Always-On Social",
    "WellnessLife": "Wellness Campaign 2026",
}


def campaign_for(title: str, brand: str) -> str:
    lowered = (title or "").lower()
    for needle, name in TITLE_RULES:
        if needle in lowered:
            return name
    return BRAND_FALLBACK.get(brand, "Always-On Social")


def main() -> None:
    db = SessionLocal()
    created = linked = scored = 0
    try:
        by_name: dict[str, models.Campaign] = {}
        for name, brand, channel, product, objective in CAMPAIGNS:
            row = db.query(models.Campaign).filter(models.Campaign.name == name).first()
            if row is None:
                row = models.Campaign(
                    id=new_id("camp"),
                    workspace_id=brand,
                    name=name,
                    objective=objective,
                    channel=channel,
                    product=product,
                    audience="Global",
                    status="active",
                    is_demo=True,
                )
                db.add(row)
                created += 1
            else:
                row.is_demo = True
            by_name[name] = row

        db.flush()

        applicable = db.query(models.Rule).filter(models.Rule.status == "active").count()

        for sub in db.query(models.Submission).all():
            target = campaign_for(sub.title, sub.brand)
            campaign = by_name.get(target)
            if campaign is None:
                continue
            if sub.campaign_id != campaign.id:
                sub.campaign_id = campaign.id
                linked += 1
            sub.is_demo = True

            breakdown = compute_breakdown(sub.findings, applicable_rules=applicable)
            if sub.compliance_score != breakdown.score or sub.score_formula_version != FORMULA_VERSION:
                sub.compliance_score = breakdown.score
                sub.score_formula_version = FORMULA_VERSION
                sub.score_computed_at = now()
                scored += 1

        db.commit()
        print(f"campaigns created: {created}")
        print(f"submissions linked: {linked}")
        print(f"scores written:     {scored}")
        print(f"formula:            {FORMULA_VERSION}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
