import re

# 1. Update evidence.py hybrid_retrieve signature
with open("backend/app/services/evidence.py", "r", encoding="utf-8") as f:
    text = f.read()

pattern = r"def hybrid_retrieve\(\s*db:\s*Session,\s*query:\s*str,\s*workspace:\s*str,\s*top_k:\s*Optional\[int\]\s*=\s*None\s*\)"
replacement = """def hybrid_retrieve(
    db: Session,
    query: str,
    workspace: str = "",
    top_k: Optional[int] = None,
    limit: Optional[int] = None,
)"""

text = re.sub(pattern, replacement, text, count=1)

k_target = "k = top_k if isinstance(top_k, int) and top_k > 0 else settings.retrieval_top_k"
k_rep = """effective_k = limit if (limit is not None and top_k is None) else top_k
    k = effective_k if isinstance(effective_k, int) and effective_k > 0 else settings.retrieval_top_k"""
text = text.replace(k_target, k_rep, 1)

with open("backend/app/services/evidence.py", "w", encoding="utf-8") as f:
    f.write(text)
print("Updated evidence.py")

# 2. Update scheduler.py to expose get_scheduler_status
with open("backend/app/services/scheduler.py", "r", encoding="utf-8") as f:
    sched_text = f.read()

if "get_scheduler_status" not in sched_text:
    sched_text += "\n\n# Public alias for health and auditing\nget_scheduler_status = status\n"
    with open("backend/app/services/scheduler.py", "w", encoding="utf-8") as f:
        f.write(sched_text)
    print("Updated scheduler.py")

# 3. Update proofpass.py generate_passport signature & resilience
with open("backend/app/services/proofpass.py", "r", encoding="utf-8") as f:
    pp_text = f.read()

pp_target = "def generate_passport(\n    db: Session,\n    submission_id: str,\n    version_id: str,\n    user: models.User,\n) -> models.ApprovalPassport:"
pp_target_crlf = "def generate_passport(\r\n    db: Session,\r\n    submission_id: str,\r\n    version_id: str,\r\n    user: models.User,\r\n) -> models.ApprovalPassport:"

pp_replacement = """def generate_passport(
    db: Session,
    submission_id: str,
    version_id: Optional[str] = None,
    user: Any = None,
) -> models.ApprovalPassport:
    # Resolve user if None or string
    if user is None:
        user = db.query(models.User).first()
    elif isinstance(user, str):
        found_user = db.query(models.User).filter(
            (models.User.email == user) | (models.User.name == user) | (models.User.id == user)
        ).first()
        user = found_user or db.query(models.User).first()

    # Resolve version_id if not supplied or if submission_id was actually a version
    if submission_id and submission_id.startswith("v_"):
        actual_ver = db.get(models.ContentVersion, submission_id)
        if actual_ver:
            version_id = actual_ver.id
            submission_id = actual_ver.submission_id

    if version_id is None:
        latest_ver = (
            db.query(models.ContentVersion)
            .filter(models.ContentVersion.submission_id == submission_id)
            .order_by(models.ContentVersion.version.desc())
            .first()
        )
        version_id = latest_ver.id if latest_ver else ""
"""

if pp_target in pp_text:
    pp_text = pp_text.replace(pp_target, pp_replacement, 1)
elif pp_target_crlf in pp_text:
    pp_text = pp_text.replace(pp_target_crlf, pp_replacement, 1)
else:
    # Use regex
    pp_text = re.sub(
        r"def generate_passport\(\s*db:\s*Session,\s*submission_id:\s*str,\s*version_id:\s*str,\s*user:\s*models\.User,?\s*\)\s*->\s*models\.ApprovalPassport:",
        pp_replacement,
        pp_text,
        count=1
    )

with open("backend/app/services/proofpass.py", "w", encoding="utf-8") as f:
    f.write(pp_text)
print("Updated proofpass.py")

# 4. Update crew.py to accept both submission_id and version_id
with open("backend/app/services/crew.py", "r", encoding="utf-8") as f:
    crew_text = f.read()

crew_sub_check = """    # Fetch submission
    sub = db.query(models.Submission).filter(models.Submission.id == submission_id).first()"""

crew_sub_rep = """    # Fetch submission (resolve if version_id passed)
    if submission_id and submission_id.startswith("v_"):
        ver_row = db.query(models.ContentVersion).filter(models.ContentVersion.id == submission_id).first()
        if ver_row:
            submission_id = ver_row.submission_id

    sub = db.query(models.Submission).filter(models.Submission.id == submission_id).first()"""

crew_text = crew_text.replace(crew_sub_check, crew_sub_rep, 1)
with open("backend/app/services/crew.py", "w", encoding="utf-8") as f:
    f.write(crew_text)
print("Updated crew.py")

# 5. Add PDF synthesis fallback for guideline files
with open("backend/app/routers/guidelines.py", "r", encoding="utf-8") as f:
    guide_text = f.read()

helper = '''def _generate_guideline_pdf(doc, db: Session) -> str:
    import re
    import fitz
    upload_dir = os.path.abspath(os.path.join(settings.uploads_dir, "guidelines"))
    os.makedirs(upload_dir, exist_ok=True)
    clean_name = re.sub(r'[^a-zA-Z0-9_\\-\\.]', '_', doc.name or doc.id)
    pdf_path = os.path.join(upload_dir, f"{clean_name}.pdf")

    pdf = fitz.open()
    page = pdf.new_page(width=595, height=842)
    y = 50
    page.insert_text((50, y), f"{doc.name} (v{doc.version or '1.0'})", fontsize=15, fontname="helv", color=(0.1, 0.1, 0.2))
    y += 24
    page.insert_text((50, y), f"Category: {doc.category} | Workspace: {doc.workspace or 'Global'}", fontsize=10, fontname="helv", color=(0.4, 0.4, 0.4))
    y += 18
    page.draw_line((50, y), (545, y), color=(0.7, 0.7, 0.7), width=1)
    y += 24

    passages = (
        db.query(models.GuidelinePassage)
        .filter(models.GuidelinePassage.doc_id == doc.id)
        .order_by(models.GuidelinePassage.page_number, models.GuidelinePassage.paragraph_number)
        .all()
    )
    for p in passages:
        if y > 760:
            page = pdf.new_page(width=595, height=842)
            y = 50
        if p.heading:
            page.insert_text((50, y), str(p.heading), fontsize=11, fontname="helv", color=(0.2, 0.2, 0.3))
            y += 16
        txt = (p.passage_text or "").strip()
        rect = fitz.Rect(50, y, 545, min(y + 100, 800))
        page.insert_textbox(rect, txt, fontsize=9, fontname="helv", color=(0.1, 0.1, 0.1))
        y += max(35, min(110, len(txt) // 3 + 20))

    pdf.save(pdf_path)
    pdf.close()
    doc.file_path = pdf_path
    db.commit()
    return pdf_path
'''

old_endpoint = """    if not doc.file_path or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="File not found")"""

new_endpoint = """    if not doc.file_path or not os.path.exists(doc.file_path):
        try:
            doc.file_path = _generate_guideline_pdf(doc, db)
        except Exception:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="File not found")"""

if "_generate_guideline_pdf" not in guide_text:
    guide_text = helper + "\n\n" + guide_text
guide_text = guide_text.replace(old_endpoint, new_endpoint, 1)

with open("backend/app/routers/guidelines.py", "w", encoding="utf-8") as f:
    f.write(guide_text)
print("Updated guidelines.py with PDF generation fallback")

# 6. Fix crew.py passage.section
with open("backend/app/services/crew.py", "r", encoding="utf-8") as f:
    crew_code = f.read()

crew_code = crew_code.replace(
    'reason=f"Verified rule {rule.code or rule_id} and passage {passage.section or passage_id}."',
    'reason=f"Verified rule {rule.code or rule_id} and passage {getattr(passage, \'heading\', \'\') or passage_id}."'
)

with open("backend/app/services/crew.py", "w", encoding="utf-8") as f:
    f.write(crew_code)
print("Updated crew.py passage attribute")

# 7. Fix guidelines.py _generate_guideline_pdf placement
with open("backend/app/routers/guidelines.py", "r", encoding="utf-8") as f:
    gl_code = f.read()

# If _generate_guideline_pdf is before imports, move it after imports
if gl_code.startswith("def _generate_guideline_pdf"):
    parts = gl_code.split('"""Guidelines + Documents router with passage indexing, validation, and full-text search."""')
    helper_part = parts[0].strip()
    rest = '"""Guidelines + Documents router with passage indexing, validation, and full-text search."""' + parts[1]
    
    # insert helper after router = APIRouter(...)
    marker = 'router = APIRouter(prefix="/guidelines", tags=["guidelines"])\n'
    rest = rest.replace(marker, marker + "\n" + helper_part + "\n\n", 1)
    with open("backend/app/routers/guidelines.py", "w", encoding="utf-8") as f:
        f.write(rest)
    print("Re-positioned _generate_guideline_pdf in guidelines.py")
