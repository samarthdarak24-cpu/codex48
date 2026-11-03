import sys
import os
import json

sys.path.insert(0, 'backend')
os.environ["PYTHONPATH"] = "backend"

from app.db import SessionLocal
from app import models

results = {}

print("==================================================")
print("TESTING ALL BACKEND TECHNOLOGIES FROM MASTER SPEC")
print("==================================================")

# 1. OCR (Tesseract & RapidOCR)
try:
    from app.services.visual.ocr import run_ocr, tesseract_ready, rapidocr_ready
    t_ready, t_reason = tesseract_ready()
    r_ready, r_reason = rapidocr_ready()
    results['OCR'] = f"Tesseract: {t_ready}, RapidOCR: {r_ready}"
    print(f"[1] OCR: OK (Tesseract={t_ready}, RapidOCR={r_ready})")
except Exception as e:
    results['OCR'] = f"FAIL: {e}"
    print(f"[1] OCR FAIL: {e}")

# 2. Computer Vision (OpenCV, Pillow, Colors, Contrast, Logo)
try:
    import cv2
    import PIL
    import numpy as np
    from app.services.visual.colors import extract_palette
    from app.services.visual.contrast import evaluate_contrast
    from app.services.visual.logo_match import match_logo

    img = np.zeros((100, 100, 3), dtype=np.uint8)
    img[:] = (200, 240, 200) # pale green
    colors = extract_palette(img)
    contrast = evaluate_contrast(img)
    results['ComputerVision'] = f"OpenCV {cv2.__version__}, Pillow {PIL.__version__}, Palette count: {len(colors)}"
    print(f"[2] Computer Vision: OK (OpenCV {cv2.__version__}, Colors: {len(colors)}, Contrast: {contrast.get('status', 'ok')})")
except Exception as e:
    results['ComputerVision'] = f"FAIL: {e}"
    print(f"[2] Computer Vision FAIL: {e}")

# 3. Embeddings (multilingual-e5-small ONNX)
try:
    from app.services.semantic.embeddings import get_encoder
    enc = get_encoder()
    loaded = enc.load() if enc else False
    if loaded and enc:
        vec = enc.encode_query("natural radiant glow serum")
        results['Embeddings'] = f"Loaded {enc.model_name}, Dim: {len(vec) if vec is not None else 0}"
        print(f"[3] Embeddings: OK (Model: {enc.model_name}, Dim: {len(vec) if vec is not None else 0})")
    else:
        results['Embeddings'] = f"Failed to load: {getattr(enc, 'error', 'No encoder')}"
        print(f"[3] Embeddings FAIL: {getattr(enc, 'error', 'No encoder')}")
except Exception as e:
    results['Embeddings'] = f"FAIL: {e}"
    print(f"[3] Embeddings FAIL: {e}")

# 4. Hybrid Retrieval (BM25 + Dense RRF)
try:
    from app.services.evidence import hybrid_retrieve
    db = SessionLocal()
    passages = hybrid_retrieve(db, "natural botanical ingredients", workspace="PureGlow", limit=3)
    results['Hybrid_Retrieval'] = f"Passages found: {len(passages)}"
    print(f"[4] Hybrid Retrieval (BM25+RRF): OK (Found: {len(passages)} passages)")
    db.close()
except Exception as e:
    results['Hybrid_Retrieval'] = f"FAIL: {e}"
    print(f"[4] Hybrid Retrieval FAIL: {e}")

# 5. Document Extraction (PyMuPDF & python-docx)
try:
    import fitz
    import docx
    results['DocumentExtraction'] = f"PyMuPDF: {fitz.__version__}, python-docx: {docx.__version__}"
    print(f"[5] Document Extraction: OK (PyMuPDF: {fitz.__version__}, docx: {docx.__version__})")
except Exception as e:
    results['DocumentExtraction'] = f"FAIL: {e}"
    print(f"[5] Document Extraction FAIL: {e}")

# 6. Sentinel & APScheduler
try:
    from app.services.scheduler import get_scheduler_status
    status = get_scheduler_status()
    results['Sentinel_Scheduler'] = f"Enabled: {status.get('enabled')}, Running: {status.get('running')}"
    print(f"[6] Sentinel Scheduler: OK (Running: {status.get('running')}, Cron: {status.get('cron')})")
except Exception as e:
    results['Sentinel_Scheduler'] = f"FAIL: {e}"
    print(f"[6] Sentinel Scheduler FAIL: {e}")

# 7. ProofPass (SHA-256 + ImageHash)
try:
    import imagehash
    from PIL import Image
    test_img = Image.new('RGB', (60, 60), color = 'red')
    phash = str(imagehash.phash(test_img))
    from app.services.proofpass import generate_passport
    db = SessionLocal()
    sub = db.query(models.Submission).filter(models.Submission.status == 'Approved').first()
    if sub:
        v = sub.versions[-1] if sub.versions else None
        if v:
            passport = generate_passport(db, sub.id, v.id)
            token = getattr(passport, 'token', '')
            results['ProofPass'] = f"Generated token: {token[:16]}... (pHash: {phash})"
        else:
            results['ProofPass'] = f"ImageHash OK: {phash}"
    else:
        results['ProofPass'] = f"ImageHash OK: {phash}"
    print(f"[7] ProofPass: OK (ImageHash: {phash})")
    db.close()
except Exception as e:
    results['ProofPass'] = f"FAIL: {e}"
    print(f"[7] ProofPass FAIL: {e}")

# 8. Review Crew Multi-Agent (PydanticAI)
try:
    from app.services.crew import run_review_crew
    db = SessionLocal()
    sub = db.query(models.Submission).first()
    if sub:
        crew_res = run_review_crew(db, sub.id, "PureGlow")
        steps = getattr(crew_res, 'steps', [])
        summary = getattr(crew_res, 'summary', None)
        risk = getattr(summary, 'risk_level', 'evaluated') if summary else 'evaluated'
        results['ReviewCrew'] = f"Steps completed: {len(steps)}, Risk: {risk}"
        print(f"[8] Review Crew (PydanticAI): OK (Completed {len(steps)} agent steps, Risk: {risk})")
    else:
        results['ReviewCrew'] = "No submission found"
    db.close()
except Exception as e:
    results['ReviewCrew'] = f"FAIL: {e}"
    print(f"[8] Review Crew FAIL: {e}")

# 9. MCP (Model Context Protocol) Server
try:
    from app.mcp_server import check_copy, search_guidelines, get_rule, list_active_exceptions
    chk = check_copy("Get 100% cure guaranteed bottles today")
    rule = get_rule("CL-03")
    exc = list_active_exceptions()
    results['MCP'] = f"check_copy: {chk['findingsCount']} findings, get_rule: {rule.get('code')}, exceptions: {len(exc)}"
    print(f"[9] MCP Tools: OK (check_copy={chk['findingsCount']} findings, rule={rule.get('code')}, exceptions={len(exc)})")
except Exception as e:
    results['MCP'] = f"FAIL: {e}"
    print(f"[9] MCP FAIL: {e}")

# 10. AI Privacy Shield (Microsoft Presidio + Regex Shield)
try:
    from app.services.privacy import redact_pii, privacy_status
    p_status = privacy_status()
    red = redact_pii("Contact John at john@acme.com or 555-123-4567. PAN: ABCDE1234F")
    results['PrivacyShield'] = f"Engine: {p_status.get('engine')}, Entities: {red.get('entities_found')}"
    print(f"[10] Privacy Shield: OK (Engine: {p_status.get('engine')}, Entities found: {red.get('entities_found')})")
except Exception as e:
    results['PrivacyShield'] = f"FAIL: {e}"
    print(f"[10] Privacy Shield FAIL: {e}")

# 11. Guideline File Synthesis Fallback Check
try:
    db = SessionLocal()
    guide = db.query(models.GuidelineDoc).first()
    if guide:
        from app.routers.guidelines import _generate_guideline_pdf
        pdf_path = _generate_guideline_pdf(guide, db)
        exists = os.path.isfile(pdf_path)
        results['GuidelineFileSynthesis'] = f"Generated {os.path.basename(pdf_path)} ({os.path.getsize(pdf_path)} bytes)"
        print(f"[11] Guideline File Synthesis: OK ({os.path.basename(pdf_path)}, size={os.path.getsize(pdf_path)} bytes)")
    db.close()
except Exception as e:
    results['GuidelineFileSynthesis'] = f"FAIL: {e}"
    print(f"[11] Guideline File Synthesis FAIL: {e}")

print("==================================================")
print("FINAL SUMMARY:")
for k, v in results.items():
    print(f"  {k}: {v}")
print("==================================================")
