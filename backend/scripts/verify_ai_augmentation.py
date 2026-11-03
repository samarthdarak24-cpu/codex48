"""Proof that the LLM layer actually persists findings (not a no-op).

The deterministic engine has no branch for CL-02 or MK-01, so any persisted
finding on those codes can only have come from `_augment_with_ai`. This script
creates a real submission in PureGlow with copy that trips no regex rule,
compares deterministic output against what landed in the `findings` table, and
then removes its own rows again (pass --keep to inspect it in the UI).

Run: ./.venv312/Scripts/python.exe scripts/verify_ai_augmentation.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import ai, models, rule_engine  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.services import submissions as sub_svc  # noqa: E402

KEEP = "--keep" in sys.argv

# No superlative, no health term, no unapproved claim, no discount, <2 urgency
# words, <=1 "!", no absolute claim -> the regex engine returns nothing.
COPY = (
    "Only 7 bottles remain from this batch. Our lab findings show a visible "
    "reduction in redness after four weeks, and the formula was developed "
    "with dermatologists in Pune."
)

results: list[tuple[bool, str, str]] = []


def check(ok: bool, name: str, detail: str = "") -> None:
    results.append((ok, name, detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))


def main() -> int:
    db = SessionLocal()
    sub_id = None
    try:
        check(ai.ai_available(), "LLM is configured", f"model={ai.settings.llm_model}")

        creator = (
            db.query(models.User)
            .filter(models.User.workspace == "PureGlow")
            .filter(models.User.role == "creator")
            .first()
        )
        if creator is None:
            check(False, "A PureGlow creator exists", "cannot continue")
            return 1

        active = (
            db.query(models.Rule)
            .filter(models.Rule.workspace == "PureGlow")
            .filter(models.Rule.status == "active")
            .all()
        )
        codes = {r.code for r in active}
        check("CL-02" in codes and "MK-01" in codes,
              "Gap rules CL-02 + MK-01 are active", f"{len(active)} active rules")

        # What the deterministic engine alone produces.
        det = rule_engine.run_rules(active, COPY, "Instagram", None)
        det_codes = {f.rule_code for f in det}
        check(not det_codes, "Deterministic engine finds nothing in the test copy",
              f"codes={sorted(det_codes) or '[]'}")

        sub = sub_svc.create_submission(
            db,
            title="QA_AI_AUGMENTATION_PROBE",
            excerpt="",
            type="Social post",
            channel="Instagram",
            brand="PureGlow",
            text=COPY,
            asset=None,
            thumb=None,
            creator_id=creator.id,
            workspace="PureGlow",
        )
        db.commit()
        sub_id = sub.id
        print(f"  created submission {sub_id}")

        rows = (
            db.query(models.Finding)
            .filter(models.Finding.submission_id == sub_id)
            .all()
        )
        persisted = {r.rule_code for r in rows}
        ai_only = persisted - det_codes

        check(bool(persisted), "Findings were persisted to the findings table",
              f"{len(rows)} rows, codes={sorted(persisted)}")
        check(bool(ai_only), "At least one finding came only from the LLM",
              f"AI-only={sorted(ai_only)}")

        # Evidence must come from the rule's stored passage, never the model.
        bad_evidence = [r.rule_code for r in rows if not (r.source_passage or "").strip()]
        check(not bad_evidence, "Every AI finding cites the rule's stored passage",
              f"missing={bad_evidence or 'none'}")

        # The model must not invent a code outside the active rule set.
        invented = persisted - codes
        check(not invented, "No invented rule codes", f"invented={sorted(invented) or 'none'}")

        check(sub.issue_count == len(rows), "issue_count matches persisted findings",
              f"issue_count={sub.issue_count} rows={len(rows)}")
        check((sub.compliance_score or 0) < 100, "Score reflects the extra findings",
              f"score={sub.compliance_score}")

        # Persisted twice? Re-read in a fresh session to prove it is on disk.
        db.expire_all()
        again = (
            db.query(models.Finding)
            .filter(models.Finding.submission_id == sub_id)
            .all()
        )
        check(len(again) == len(rows), "Findings survive a fresh read (real commit)",
              f"{len(again)} rows on re-read")

        print(f"  llm_error: {ai.last_error()}")
    finally:
        if sub_id and not KEEP:
            db.query(models.Finding).filter(models.Finding.submission_id == sub_id).delete()
            db.query(models.ContentVersion).filter(
                models.ContentVersion.submission_id == sub_id).delete()
            db.query(models.SubmissionVersion).filter(
                models.SubmissionVersion.submission_id == sub_id).delete()
            # Notifications have no entity_id column; they carry the submission
            # id inside the payload JSON, so match on that.
            db.query(models.Notification).filter(
                models.Notification.payload.like(f"%{sub_id}%")).delete(
                    synchronize_session=False)
            db.query(models.AuditEvent).filter(
                models.AuditEvent.entity_id == sub_id).delete()
            db.query(models.Submission).filter(models.Submission.id == sub_id).delete()
            db.commit()
            print(f"  cleaned up {sub_id}")
        elif sub_id:
            print(f"  kept {sub_id} (--keep)")
        db.close()

    passed = sum(1 for ok, _, _ in results if ok)
    print(f"\n{passed}/{len(results)} checks passed")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
