# PRECEDENT — Automated Test Execution Report

**Execution Date:** 2026-11-02  
**Test Suite:** Pytest 8.2.1 / 9.1.1 on Python 3.12.10 (x86_64)  
**Configuration:** In-process test isolation, SQLite dialect, strict assertions  

---

## 1. Summary of Execution

```
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-8.2.1
rootdir: D:\tmp\codex48\backend
collected 50 items

tests/test_auth.py ....                                                  [  8%]
tests/test_canonical_v1_and_engine.py ........                          [ 24%]
tests/test_comprehensive_governance.py ...........                       [ 46%]
tests/test_conflicts.py .                                                [ 48%]
tests/test_exceptions.py ...                                             [ 54%]
tests/test_rbac.py ..                                                    [ 58%]
tests/test_regression_contract.py ..                                     [ 62%]
tests/test_simulation.py .                                               [ 64%]
tests/test_submissions.py ...                                            [ 70%]
tests/test_workspace_isolation.py ......                                 [100%]

======================== 50 passed, 84 warnings in 55.58s =====================
```

---

## 2. Verified Capabilities Breakdown

| Test Category | File | Count | Verification Target |
|---|---|---|---|
| **Auth & Sessions** | `test_auth.py` | 4 | Argon2 password verification, JWT issue/refresh, `/auth/me`, unauthenticated 401 |
| **Canonical v1 & Engine** | `test_canonical_v1_and_engine.py` | 8 | 13 condition types catalogue, brand kit RBAC, global search, publications workflow, sentinel summary/scan, deterministic engine checks, strict citation validation, ΔE76 color distance, WCAG AA contrast, PDF report generation |
| **Governance Workflows** | `test_comprehensive_governance.py` | 11 | End-to-end Creator -> Manager journey, MIME upload validation, passage extraction, evidence verification, approval reset on edit, exception lifecycle, conflict detection, simulation immutability, append-only audit, dynamic metrics |
| **Conflict Detection** | `test_conflicts.py` | 1 | Contradictory configs and overlapping scope conflict detection |
| **Exception Life Cycle** | `test_exceptions.py` | 3 | Approved exception finding waiver, expired exception rejection at decision time |
| **RBAC Matrix** | `test_rbac.py` | 2 | Creator blocked with 403 on manager endpoints; Manager allowed |
| **Regression Contract** | `test_regression_contract.py` | 2 | Auto-derivation of exception titles and rule codes |
| **Simulation Sandbox** | `test_simulation.py` | 1 | Non-mutating replay over stored content, impact breakdown |
| **Submission Versioning** | `test_submissions.py` | 3 | Finding creation, stale version decision rejection (409), audit recording |
| **Workspace Tenancy** | `test_workspace_isolation.py` | 6 | Strict tenant boundaries across users, claims, guidelines, rules, and exceptions |

**Total:** **50 passed, 0 failed, 100% pass rate.**

