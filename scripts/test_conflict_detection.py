import sys
sys.path.insert(0, 'backend')
from app.db import SessionLocal
from app import models

db = SessionLocal()
rules = db.query(models.Rule).all()
_PROHIBIT_WORDS = ('must not', "mustn't", 'never', 'avoid', 'prohibited', 'prohibit', 'forbidden', 'cannot', "can't", 'not in', '!=', 'block')
_REQUIRE_WORDS = ('must', 'required', 'only', 'needs', 'need', 'should', 'allow', 'permit')

def _dir(cond, act):
    t = f"{cond or ''} {act or ''}".lower()
    if any(w in t for w in _PROHIBIT_WORDS):
        return 'prohibit'
    if any(w in t for w in _REQUIRE_WORDS):
        return 'require'
    return None

conflicts = []
for i in range(len(rules)):
    for j in range(i + 1, len(rules)):
        a, b = rules[i], rules[j]
        da, db_ = _dir(a.condition, a.action), _dir(b.condition, b.action)
        if a.subject and b.subject and a.subject.lower() == b.subject.lower():
            if da and db_ and da != db_:
                conflicts.append((a.code, b.code, a.subject, da, db_))

print('Potential rule-vs-rule conflicts:', len(conflicts))
for c in conflicts:
    print('Conflict:', c)
