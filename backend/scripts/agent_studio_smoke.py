"""Agent Studio smoke test — exercises the real generator, validator and runtime.

Run from the backend directory:

    .venv/Scripts/python.exe scripts/agent_studio_smoke.py

Set AGENT_SMOKE_LLM=1 to let the configured LLM drive prompt generation. By
default the deterministic router is used so the check is repeatable offline.
"""
from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.agents import generator, runtime, templates, validator  # noqa: E402
from app.agents.models import StudioAgent  # noqa: E402
from app.db import SessionLocal, init_db  # noqa: E402
from app.models import Submission, User  # noqa: E402
from app.routers.agents import _create_agent, _current_version  # noqa: E402


PROMPT = (
    "Create an agent that checks marketing content against our active brand guidelines "
    "and identifies unsupported claims with exact evidence."
)


def main() -> int:
    if os.environ.get("AGENT_SMOKE_LLM") != "1":
        os.environ["LLM_API_KEY"] = ""
        os.environ["LLM_BASE_URL"] = ""

    init_db()
    db = SessionLocal()
    failures: list[str] = []
    try:
        manager = db.query(User).filter(User.role == "manager").first()
        if manager is None:
            print("SKIP: no manager user in the database")
            return 0

        submission = (
            db.query(Submission)
            .filter((Submission.workspace == manager.workspace) | (Submission.workspace.is_(None)))
            .first()
        )

        print("== 1. Templates ==")
        catalogue = templates.list_templates()
        print(f"templates={len(catalogue)} ids={[t['id'] for t in catalogue]}")
        if len(catalogue) != 6:
            failures.append("expected 6 templates")

        print("\n== 2. Prompt -> spec ==")
        spec, meta = generator.generate_from_prompt(PROMPT, brand=manager.workspace)
        print(f"name={spec.name!r} generatedBy={meta['generatedBy']} tools={spec.tools}")
        print(f"nodes={len(spec.workflow.nodes)} edges={len(spec.workflow.edges)}")

        print("\n== 3. Validation ==")
        result = validator.validate_spec(spec)
        print(json.dumps(result, indent=2)[:1200])
        if not result["ok"]:
            failures.append(f"spec invalid: {result['errors']}")

        print("\n== 4. Persist draft ==")
        agent = _create_agent(db, spec, manager, status_value="draft")
        version = _current_version(db, agent)
        print(f"agent={agent.id} version={version.version_number} status={agent.status}")

        print("\n== 5. Publish gate ==")
        gate = validator.publish_gate(spec)
        print(f"publish_ok={gate['ok']} errors={gate['errors']}")
        if not gate["ok"]:
            failures.append(f"publish gate failed: {gate['errors']}")

        if submission is not None:
            print(f"\n== 6. Execute (submission {submission.id}) ==")
            run = runtime.run_agent(
                db,
                agent=agent,
                version=version,
                user=manager,
                run_input={"submission_id": submission.id},
                trigger_type="test",
            )
            print(f"run={run.id} status={run.status} error={run.error}")
            for step in run.steps:
                print(f"  [{step.status:>16}] {step.label} ({step.node_type}/{step.node_subtype})")
                if step.error:
                    print(f"      error: {step.error}")

            if run.status == "waiting_approval":
                print("\n== 7. Resume with manager approval ==")
                run = runtime.run_agent(
                    db,
                    agent=agent,
                    version=version,
                    user=manager,
                    existing_run=run,
                    approved=True,
                )
                print(f"resumed status={run.status} error={run.error}")
                for step in run.steps:
                    print(f"  [{step.status:>16}] {step.label}")
            if run.status != "completed":
                failures.append(f"run did not complete (status={run.status}, error={run.error})")
        else:
            print("\n== 6. Execute ==")
            print("SKIP: no submission in the workspace")

        print("\n== RESULT ==")
        if failures:
            print("FAIL")
            for item in failures:
                print(" -", item)
            return 1
        print("PASS")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
