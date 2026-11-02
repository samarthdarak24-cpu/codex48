"""Persisted Data Report Generator (PDF via ReportLab, CSV via stdlib).

Compliant with PRECEDENT_MASTER_BACKEND_PROMPT.md §3, §9, & §11:
- Generates compliance audit certificates and reports
- Reads strictly from persisted database rows (zero fabricated metrics)
- Professional green/forest/ivory visual palette
"""
import csv
import io
from datetime import datetime, timezone
from typing import List, Optional
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.models import Finding, ReviewDecision, Submission


def generate_submission_compliance_pdf(submission: Submission) -> bytes:
    """Generates an official PDF compliance certificate for a submission version."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CertTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#2C5E3B"),
    )
    meta_style = ParagraphStyle(
        "CertMeta",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#4B5563"),
    )
    body_style = ParagraphStyle(
        "CertBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
    )

    elements = []

    # Header
    elements.append(Paragraph("PRECEDENT BRAND GOVERNANCE CERTIFICATE", title_style))
    elements.append(Spacer(1, 10))
    elements.append(
        Paragraph(
            f"<b>Content Title:</b> {submission.title} &nbsp;|&nbsp; "
            f"<b>Status:</b> {submission.status} &nbsp;|&nbsp; "
            f"<b>Version:</b> v{submission.version}<br/>"
            f"<b>Brand:</b> {submission.brand} &nbsp;|&nbsp; "
            f"<b>Channel:</b> {submission.channel} &nbsp;|&nbsp; "
            f"<b>Created:</b> {submission.created_at.strftime('%Y-%m-%d %H:%M UTC')}",
            meta_style,
        )
    )
    elements.append(Spacer(1, 15))

    # Findings Table
    data = [["Rule Code", "Category", "Status / Severity", "Explanation & Evidence Cited"]]
    for f in submission.findings:
        evidence_tag = " [VERIFIED]" if f.evidence_verified else ""
        data.append([
            f.rule_code or "RULE",
            f.type,
            f"{f.status.upper()} ({f.severity})",
            Paragraph(f"{f.explanation}{evidence_tag}", body_style),
        ])

    if len(data) == 1:
        data.append(["-", "None", "COMPLIANT", "All active brand rules passed with 0 violations."])

    t = Table(data, colWidths=[80, 80, 110, 270])
    t.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F4F7F2")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#2C5E3B")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 10),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ])
    )
    elements.append(t)
    elements.append(Spacer(1, 20))

    # Approvals & Decisions history
    elements.append(Paragraph("<b>Review & Decision History</b>", styles["Heading3"]))
    decision_data = [["Action", "Version", "Reviewer / Manager ID", "Decided At", "Note"]]
    for d in submission.decisions:
        decision_data.append([
            d.action,
            f"v{d.version}",
            d.reviewer_id or "Manager",
            d.created_at.strftime("%Y-%m-%d %H:%M"),
            d.note or "-",
        ])

    if len(decision_data) == 1:
        decision_data.append(["Pending", f"v{submission.version}", "-", "-", "Awaiting human review"])

    dt = Table(decision_data, colWidths=[90, 50, 120, 100, 180])
    dt.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F4F7F2")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#2C5E3B")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ])
    )
    elements.append(dt)

    doc.build(elements)
    buf.seek(0)
    return buf.getvalue()


def export_submissions_csv(submissions: List[Submission]) -> str:
    """Exports submission registry rows to standard CSV string."""
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow([
        "id", "code", "title", "brand", "channel", "type", "status",
        "version", "issues_count", "priority", "created_at", "updated_at"
    ])
    for s in submissions:
        writer.writerow([
            s.id, s.code, s.title, s.brand, s.channel, s.type, s.status,
            s.version, s.issue_count, s.priority,
            s.created_at.isoformat(), s.updated_at.isoformat(),
        ])
    return out.getvalue()

