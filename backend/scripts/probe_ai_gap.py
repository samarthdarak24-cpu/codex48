"""Probe: find copy the deterministic engine misses but the LLM maps to a rule.

CL-02 ("no unsubstantiated clinical language") and MK-01 ("no fake scarcity")
have no branch in rule_engine.evaluate_text_rule — they return [] for every
input. That makes them the honest test bed for _augment_with_ai: any finding on
those codes can only have come from the model.

Run: ./.venv312/Scripts/python.exe scripts/probe_ai_gap.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import ai  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app import models  # noqa: E402
from app import rule_engine  # noqa: E402

CANDIDATES = [
    (
        "scarcity+clinical",
        "Only 7 bottles remain from this batch. Our lab findings show a visible "
        "reduction in redness after four weeks, and the formula was developed "
        "with dermatologists in Pune.",
    ),
    (
        "scarcity-only",
        "Only 7 bottles remain from this batch. Once they are gone we will not "
        "make more.",
    ),
    (
        "clinical-only",
        "Our lab findings show a visible reduction in redness after four weeks "
        "of daily use.",
    ),
]


def main() -> int:
    print("ai_available:", ai.ai_available())
    db = SessionLocal()
    try:
        rules = (
            db.query(models.Rule)
            .filter(models.Rule.workspace == "PureGlow")
            .filter(models.Rule.status == "active")
            .all()
        )
        print(f"active PureGlow rules: {len(rules)}")
        payload = [
            {"code": r.code, "title": r.title, "summary": r.summary} for r in rules
        ]

        for name, text in CANDIDATES:
            print("\n" + "=" * 70)
            print(f"CASE {name}")
            print(f'  text: {text}')
            det = rule_engine.run_rules(rules, text, "Instagram")
            print(f"  deterministic codes: {[f.rule_code for f in det]}")
            out = ai.semantic_findings(text, payload)
            print(f"  llm_error: {ai.last_error()}")
            if not out:
                print("  llm codes: []")
                continue
            for item in out:
                print(
                    f"  llm -> {item.get('ruleCode')} | {item.get('severity')} | "
                    f"{str(item.get('explanation'))[:110]}"
                )
            new = [i.get("ruleCode") for i in out if i.get("ruleCode") not in {f.rule_code for f in det}]
            print(f"  NEW codes (AI-only): {new}")
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
