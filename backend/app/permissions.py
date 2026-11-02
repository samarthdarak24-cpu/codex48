"""Central permission map implementing the RBAC matrix from DESIGN.md §1.2 & PRECEDENT_MASTER_BACKEND_PROMPT.md §4.2.

Roles:
- creator: writes copy, uploads creative assets, requests exceptions, views guidelines, views/responds to assigned sentinel tasks.
- manager: approves exact versions, manages rules/guidelines/claims/brand kit, decides exceptions, simulates rule changes, monitors sentinel alerts, views audit/analytics.
"""
from typing import Dict, Set

# Operation to allowed roles
OPERATION_PERMISSIONS: Dict[str, Set[str]] = {
    # Auth & Self
    "auth:me": {"creator", "manager"},
    "auth:update_profile": {"creator", "manager"},
    "auth:change_password": {"creator", "manager"},
    "auth:sessions": {"creator", "manager"},
    "auth:notifications": {"creator", "manager"},
    "auth:activity": {"creator", "manager"},

    # Submissions (Creator can create and view own; Manager reviews and decides)
    "submissions:create": {"creator"},
    "submissions:list_my": {"creator"},
    "submissions:view_own": {"creator"},
    "submissions:view_any": {"manager"},
    "submissions:update_draft": {"creator"},
    "submissions:submit": {"creator"},
    "submissions:withdraw": {"creator"},
    "submissions:comment": {"creator", "manager"},
    "submissions:analyze": {"creator", "manager"},
    "submissions:ai_review": {"creator", "manager"},
    "submissions:suggest_fixes": {"creator", "manager"},
    "submissions:apply_fix": {"creator"},
    "submissions:decide": {"manager"},
    "submissions:assign_reviewer": {"manager"},
    "submissions:compare": {"manager"},
    "submissions:export": {"manager"},
    "submissions:publish": {"manager", "creator"},

    # Guidelines
    "guidelines:view_active": {"creator", "manager"},
    "guidelines:view_passages": {"creator", "manager"},
    "guidelines:upload": {"manager"},
    "guidelines:extract": {"manager"},
    "guidelines:activate": {"manager"},
    "guidelines:archive": {"manager"},
    "guidelines:draft_rules": {"manager"},

    # Rules & Conflicts
    "rules:view": {"creator", "manager"},
    "rules:condition_types": {"creator", "manager"},
    "rules:create": {"manager"},
    "rules:update": {"manager"},
    "rules:test": {"manager"},
    "rules:activate": {"manager"},
    "rules:deactivate": {"manager"},
    "rules:archive": {"manager"},
    "rules:conflicts:view": {"creator", "manager"},
    "rules:conflicts:detect": {"manager"},
    "rules:conflicts:resolve": {"manager"},

    # Brand Kit & Claims
    "brand_kit:view": {"creator", "manager"},
    "brand_kit:update": {"manager"},
    "claims:view": {"creator", "manager"},
    "claims:manage": {"manager"},

    # Exceptions
    "exceptions:request": {"creator"},
    "exceptions:view_my": {"creator"},
    "exceptions:cancel": {"creator"},
    "exceptions:view_all": {"manager"},
    "exceptions:decide": {"manager"},
    "exceptions:revoke": {"manager"},

    # Simulations
    "simulations:run": {"manager"},
    "simulations:view": {"manager"},
    "simulations:export": {"manager"},
    "simulations:activate_rule": {"manager"},

    # Sentinel
    "sentinel:alerts": {"manager"},
    "sentinel:summary": {"manager"},
    "sentinel:scan": {"manager"},
    "sentinel:preview": {"manager"},
    "sentinel:tasks:my": {"creator"},
    "sentinel:tasks:all": {"manager"},
    "sentinel:tasks:resolve": {"creator"},
    "sentinel:tasks:verify": {"manager"},
    "sentinel:tasks:close": {"manager"},

    # Assets
    "assets:view": {"creator", "manager"},
    "assets:upload": {"creator", "manager"},
    "assets:decide": {"manager"},
    "assets:attach": {"creator", "manager"},

    # Analytics & Audit
    "analytics:view": {"manager"},
    "audit:view": {"manager"},
    "audit:export": {"manager"},

    # Agent Studio
    "agents:view": {"creator", "manager"},
    "agents:create": {"manager"},
    "agents:update": {"manager"},
    "agents:delete": {"manager"},
    "agents:validate": {"manager"},
    "agents:publish": {"manager"},
    "agents:pause": {"manager"},
    "agents:test": {"manager"},
    "agents:execute": {"creator", "manager"},
    "agents:runs:view": {"creator", "manager"},
    "agents:approve": {"manager"},
    "agents:tools:view": {"creator", "manager"},
}


def can_perform(role: str, operation: str) -> bool:
    allowed = OPERATION_PERMISSIONS.get(operation)
    if not allowed:
        return False
    return role in allowed

