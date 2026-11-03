"""Debug the prompt -> agent generation JSON failure.

Prints the raw model reply and finish reason so the fallback note
("did not return valid JSON") can be traced to its real cause.

Run: ./.venv312/Scripts/python.exe scripts/debug_agent_generation.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import ai  # noqa: E402
from app.agents import generator  # noqa: E402

PROMPT = (
    "Build an agent that reviews a winter skincare poster against our approved "
    "claims list and flags unqualified superlatives."
)


def main() -> int:
    print("ai_available:", ai.ai_available())
    print("endpoint:", ai._endpoint())
    print("model:", ai.settings.llm_model)
    print("system prompt chars:", len(generator.SYSTEM_PROMPT))

    user = (
        f"User request:\n{PROMPT}\n\n"
        f"Brand/workspace: PureGlow\n"
        f"Preferred category: auto\n\n"
        f"Allow-listed tools:\n{generator._tool_catalogue_text()}\n"
    )
    print("user prompt chars:", len(user))

    for budget in (1800, 4096):
        print("\n" + "=" * 70)
        print(f"budget={budget}")
        content, meta = ai._post(generator.SYSTEM_PROMPT, user, budget, 0.2)
        print("meta:", json.dumps(meta, indent=2))
        print("last_error:", ai.last_error())
        if content is None:
            print("content: None")
            continue
        print(f"content chars: {len(content)}")
        print("--- raw head ---")
        print(content[:900])
        print("--- raw tail ---")
        print(content[-400:])
        data = generator._extract_json(content)
        print("extract_json ->", "dict" if data else None,
              list(data.keys()) if isinstance(data, dict) else "")
        if data:
            spec = generator._spec_from_llm(data, PROMPT, None)
            print("_spec_from_llm ->", "spec" if spec else "None")
            if spec is None:
                print("  name:", data.get("name"))
                print("  tools:", data.get("tools"))
                print("  keys:", list(data.keys()))
            break
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
