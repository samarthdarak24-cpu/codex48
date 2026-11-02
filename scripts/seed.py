"""Master seed script for Precedent.

Compliant with PRECEDENT_MASTER_BACKEND_PROMPT.md §12:
- Refuses to run if APP_ENV=production
- Populates Demo Brand Co / PureGlow workspace (timezone Asia/Kolkata)
- Brand Kit with green palette, official logos, approved phrases & disclaimers
- Users: 1 manager (David Kim), 2 creators (Emily Carter, Sarah Chen)
- Campaigns A (Festival Instagram) & B (General)
- Generated guidelines with chunked passages
- Active rules (LOGO-001, COLOR-001, HEALTH-001, DISC-001, CONTR-001) + 1 conflict
- Content submissions across statuses (Approved + Published, in_review, changes_requested)
- Scoped exceptions (Approved with conditions & pending request)
"""
import os
import sys

# Ensure backend is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.config import settings

if settings.app_env.lower() == "production":
    print("ERROR: Seed script is strictly disabled when APP_ENV=production")
    sys.exit(1)

import seed

if __name__ == "__main__":
    print(f"Running deterministic seed for Precedent ({settings.app_name})...")
    seed.main()
    print("Deterministic seed successfully completed!")

