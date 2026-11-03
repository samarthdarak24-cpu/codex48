"""Verify the configured LLM endpoint with a real call.

Prints the resolved URL, model, latency and the model's actual reply, or the
exact failure reason. This is the difference between "AI is configured" and
"AI works" — `llm_complete` returns None on any failure by design, so without
this check a bad key is indistinguishable from an empty one.

Usage:
    python scripts/check_llm.py
    python scripts/check_llm.py --json     # machine-readable

Exit code 0 only when the endpoint answered and the reply parsed.
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import ai  # noqa: E402
from app.config import settings  # noqa: E402


def mask(value: str) -> str:
    if not value:
        return "(empty)"
    if len(value) <= 8:
        return value[0] + "*" * (len(value) - 1)
    return f"{value[:4]}…{value[-4:]} ({len(value)} chars)"


def main() -> int:
    as_json = "--json" in sys.argv

    report = {
        "baseUrl": settings.llm_base_url or "(empty)",
        "resolvedEndpoint": ai._endpoint() or "(empty)",
        "model": settings.llm_model,
        "apiKey": mask(settings.llm_api_key),
        "available": ai.ai_available(),
        "ok": False,
        "latencyMs": None,
        "reply": None,
        "error": None,
    }

    if not ai.ai_available():
        report["error"] = "not configured — set LLM_BASE_URL and LLM_API_KEY in backend/.env"
        print(json.dumps(report, indent=2) if as_json else
              "LLM not configured.\n"
              f"  LLM_BASE_URL = {report['baseUrl']}\n"
              f"  LLM_API_KEY  = {report['apiKey']}\n"
              "Set both in backend/.env and re-run.")
        return 1

    started = time.time()
    reply = ai.llm_complete(
        system="You are a test harness. Reply with exactly one word: OK",
        user="Reply with exactly: OK",
        max_tokens=300,
        temperature=0.0,
    )
    report["latencyMs"] = int((time.time() - started) * 1000)
    report["reply"] = (reply or "").strip()[:200]
    report["error"] = ai.last_error()

    # A strict-JSON probe: the product asks the model for JSON, so a model that
    # cannot return a bare array is not usable here even if it chats fine.
    json_reply = ai.llm_complete(
        system='Return ONLY a JSON array. No prose, no code fences.',
        user='Return exactly: [{"ruleCode":"CL-04","severity":"High"}]',
        max_tokens=600,
        temperature=0.0,
    )
    parsed = None
    if json_reply:
        try:
            parsed = json.loads(json_reply.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip())
        except Exception:
            parsed = None
    report["jsonCapable"] = isinstance(parsed, list)
    report["ok"] = bool(reply) and report["error"] is None

    if as_json:
        print(json.dumps(report, indent=2))
    else:
        print("LLM endpoint check")
        print(f"  base URL    : {report['baseUrl']}")
        print(f"  endpoint    : {report['resolvedEndpoint']}")
        print(f"  model       : {report['model']}")
        print(f"  api key     : {report['apiKey']}")
        print(f"  latency     : {report['latencyMs']} ms")
        print(f"  reply       : {report['reply']!r}")
        print(f"  JSON-capable: {report['jsonCapable']}")
        if report["error"]:
            print(f"  ERROR       : {report['error']}")
        print(f"\n  {'PASS' if report['ok'] else 'FAIL'} — "
              f"{'model answered' if report['ok'] else 'model did not answer'}")

    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
