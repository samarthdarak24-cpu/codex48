import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(36, 11 * inch - 30, "PRECEDENT — Feature Names & Live Website Navigation Guide")
            self.drawRightString(8.5 * inch - 36, 11 * inch - 30, "Live URL: https://precedent-web.onrender.com")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(36, 11 * inch - 34, 8.5 * inch - 36, 11 * inch - 34)

        # Footer (all pages)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(36, 40, 8.5 * inch - 36, 40)
        
        self.drawString(36, 28, "Precedent Brand Governance Platform • PureGlow Workspace • Live Production Guide")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 36, 28, page_str)
        self.restoreState()

def build_pdf(filename="PRECEDENT_FEATURES_AND_NAVIGATION_GUIDE.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=46,
        bottomMargin=50
    )
    
    styles = getSampleStyleSheet()
    
    # Custom colors
    c_primary = colors.HexColor("#0F172A")
    c_mgr = colors.HexColor("#1E3A8A")
    c_creator = colors.HexColor("#065F46")
    c_accent = colors.HexColor("#0284C7")
    c_muted = colors.HexColor("#475569")
    c_border = colors.HexColor("#CBD5E1")
    c_bg_light = colors.HexColor("#F8FAFC")
    c_url = colors.HexColor("#0369A1")
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=c_primary,
        alignment=TA_LEFT
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=c_muted,
        alignment=TA_LEFT
    )
    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#059669"),
        alignment=TA_LEFT
    )
    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=c_primary,
        spaceBefore=12,
        spaceAfter=5
    )
    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=8,
        spaceAfter=4
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1E293B")
    )
    body_bold = ParagraphStyle(
        'BodyDarkBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    feat_name_style = ParagraphStyle(
        'FeatName',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0F172A")
    )
    nav_click_style = ParagraphStyle(
        'NavClick',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#D97706")
    )
    url_style = ParagraphStyle(
        'UrlStyle',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=8,
        leading=10.5,
        textColor=c_url
    )
    th_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )
    
    story = []
    
    # -------------------------------------------------------------
    # Cover / Header
    # -------------------------------------------------------------
    story.append(Paragraph("PRECEDENT — LIVE WEBSITE FEATURE DIRECTORY", title_style))
    story.append(Paragraph("Complete List of Feature Names and Where They Are Located on the Live Website", subtitle_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("LIVE URL: https://precedent-web.onrender.com • LOCAL URL: http://127.0.0.1:5173", meta_style))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_primary, spaceBefore=0, spaceAfter=10))
    
    # Quick Navigation Instructions Box
    guide_p = Paragraph(
        "<b>How to Navigate the Live Website:</b><br/>"
        "1. Open <b>https://precedent-web.onrender.com/</b> (or local <b>http://127.0.0.1:5173/</b>).<br/>"
        "2. On the <b>Login screen</b>, use the 1-click quick buttons: "
        "<b>'Brand Manager (David Kim)'</b> or <b>'Creator (Emily Carter)'</b>.<br/>"
        "3. Once logged in, use the <b>Left Sidebar Navigation Menu</b> to access features, or switch roles anytime using the "
        "<b>'Switch Persona' button in the top-right header</b>.<br/>"
        "4. The <b>Precedent Assistant (AI Chatbot)</b> is always available as a floating bubble at the <b>bottom-right corner of every screen</b>.",
        body_style
    )
    t_guide = Table([[guide_p]], colWidths=[540])
    t_guide.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#EFF6FF")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#93C5FD")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t_guide)
    story.append(Spacer(1, 10))

    # -------------------------------------------------------------
    # SECTION 1: GLOBAL FEATURES (ON EVERY SCREEN)
    # -------------------------------------------------------------
    story.append(Paragraph("1. Global Persistent Features (Located on Every Screen)", h1_style))
    story.append(Paragraph("Visible and interactive across all 21 screens in the application:", body_style))
    story.append(Spacer(1, 4))

    global_rows = [
        [Paragraph("Feature Name", th_style), Paragraph("Where to Find / Click in Live UI", th_style), Paragraph("Live URL & Screen Location", th_style), Paragraph("What It Does", th_style)],
        [
            Paragraph("<b>Precedent Assistant (AI Chatbot)</b>", feat_name_style),
            Paragraph("<b>Bottom-Right Floating Bubble</b><br/>Click the purple sparkle icon with the green status dot.", nav_click_style),
            Paragraph("Visible on <b>ALL URLs</b><br/><code>https://precedent-web.onrender.com/*</code><br/>Slides out as a right drawer.", url_style),
            Paragraph("In-app brand governance assistant. Answers questions using verified passages from brand books, checks rules, and provides cited references.", body_style)
        ],
        [
            Paragraph("<b>Instant Persona Switcher</b>", feat_name_style),
            Paragraph("<b>Top Header Bar (Right Side)</b><br/>Click 'Switch to Creator' or 'Switch to Manager'.", nav_click_style),
            Paragraph("Top header of <b>ALL URLs</b><br/>Right side next to user avatar pill.", url_style),
            Paragraph("Instantly flips between Brand Manager (David Kim) and Creator (Emily Carter) perspectives without typing passwords.", body_style)
        ],
        [
            Paragraph("<b>Dynamic Counter Badges</b>", feat_name_style),
            Paragraph("<b>Left Sidebar Navigation</b><br/>Colored badges next to menu labels.", nav_click_style),
            Paragraph("Left sidebar across all pages.<br/>Badges on Queue, Exceptions, etc.", url_style),
            Paragraph("Live database counts: Red badge (11 pending reviews), Yellow badge (2 exceptions), Creator badge (14 submissions).", body_style)
        ]
    ]
    t_global = Table(global_rows, colWidths=[110, 140, 140, 150])
    t_global.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#334155")),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_global)
    story.append(Spacer(1, 12))

    # -------------------------------------------------------------
    # SECTION 2: BRAND MANAGER FEATURES (DAVID KIM)
    # -------------------------------------------------------------
    story.append(Paragraph("2. Brand Manager Features (Sign in as David Kim)", h1_style))
    story.append(Paragraph("Complete brand governance, decision-making, and AI Agent Studio tools for Brand Managers:", body_style))
    story.append(Spacer(1, 4))

    mgr_rows = [
        [Paragraph("Feature Name", th_style), Paragraph("Where to Find / Click in Live UI", th_style), Paragraph("Exact Live Website URL", th_style), Paragraph("Screen Location & Key Controls", th_style)],
        [
            Paragraph("<b>Command Center & Overview</b>", feat_name_style),
            Paragraph("Left Sidebar → Click <b>'Overview'</b>", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/manager/overview</code>", url_style),
            Paragraph("Top summary stats (Health score 92%), pending decision counter, quick action cards, and real-time audit feed.", body_style)
        ],
        [
            Paragraph("<b>Review Queue</b>", feat_name_style),
            Paragraph("Left Sidebar → Click <b>'Review Queue'</b> (red badge)", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/manager/queue</code>", url_style),
            Paragraph("Cards showing submissions awaiting review. Clicking any card navigates to the Manager Decision Workspace.", body_style)
        ],
        [
            Paragraph("<b>Manager Decision Workspace & 5-Agent Review Crew</b>", feat_name_style),
            Paragraph("From Review Queue → Click any submission card (e.g. <i>'PureGlow Summer Glow'</i>)", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/manager/queue/:id</code>", url_style),
            Paragraph("Main panel shows copy & imagery. Right sidebar has 5-Agent Review Crew results, cited rules, and <b>Approve</b> / <b>Reject</b> / <b>Request Changes</b> buttons.", body_style)
        ],
        [
            Paragraph("<b>All Submissions Register</b>", feat_name_style),
            Paragraph("Left Sidebar → Click <b>'All Submissions'</b>", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/manager/submissions</code>", url_style),
            Paragraph("Full-width data table. Filter by Approved/In Review/Rejected, search, customize columns, and click scores to open the Score Breakdown modal.", body_style)
        ],
        [
            Paragraph("<b>Guidelines & Rules Manager</b>", feat_name_style),
            Paragraph("Left Sidebar → Click <b>'Guidelines & Rules'</b>", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/manager/guidelines</code>", url_style),
            Paragraph("Tabs for Brand Policy Documents and Deterministic Rules. Click any rule to inspect severity weights (Critical, High, Medium, Low) and text passages.", body_style)
        ],
        [
            Paragraph("<b>AI Agent Studio & Prompt-to-Agent Generator</b>", feat_name_style),
            Paragraph("Left Sidebar → Click <b>'Agent Studio'</b>", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/manager/agent-studio</code>", url_style),
            Paragraph("Studio dashboard with active agents and templates. Click top-right <b>'+ Create Agent'</b> to open the <b>Prompt-to-Agent natural language generator</b>.", body_style)
        ],
        [
            Paragraph("<b>Visual Workflow Builder (React Flow Canvas)</b>", feat_name_style),
            Paragraph("Inside Agent Studio → Click <b>'Open Builder'</b> on any agent card", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/manager/agents/:id/builder</code>", url_style),
            Paragraph("Interactive node-based canvas. Drag, connect, delete, and configure trigger, tool, logic, and output nodes; zoom/pan; test workflow.", body_style)
        ],
        [
            Paragraph("<b>Agent Executions Log</b>", feat_name_style),
            Paragraph("Left Sidebar → Click <b>'Agent Executions'</b>", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/manager/agent-runs</code>", url_style),
            Paragraph("Real-time table of all agent executions with duration, trigger type, status (Success/Failed), and direct links to execution autopsies.", body_style)
        ],
        [
            Paragraph("<b>Execution Trace Inspector</b>", feat_name_style),
            Paragraph("From Agent Executions → Click any run row", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/manager/agent-runs/:runId</code>", url_style),
            Paragraph("Detailed execution autopsy showing node-by-node execution steps, tool inputs/outputs, millisecond execution timings, and error traces.", body_style)
        ],
        [
            Paragraph("<b>Exceptions Center</b>", feat_name_style),
            Paragraph("Left Sidebar → Click <b>'Exceptions'</b> (yellow badge)", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/manager/exceptions</code>", url_style),
            Paragraph("Table of policy exemption requests filed by Creators. Managers can click 'Review' to evaluate rationale, set expiration dates, and Approve/Deny.", body_style)
        ],
        [
            Paragraph("<b>Rule Impact Sandbox</b>", feat_name_style),
            Paragraph("Left Sidebar → Click <b>'Rule Impact Sandbox'</b>", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/manager/sandbox</code>", url_style),
            Paragraph("What-If simulator. Draft a new rule or edit an existing one, run simulation across past submissions, and view estimated pass/fail drift.", body_style)
        ],
        [
            Paragraph("<b>Sentinel Monitoring</b>", feat_name_style),
            Paragraph("Left Sidebar → Click <b>'Sentinel Monitoring'</b> (yellow badge)", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/manager/sentinel</code>", url_style),
            Paragraph("Continuous drift detection. Click <b>'Run Scan Now'</b> to re-evaluate approved content against updated rules, and schedule automated cron scans.", body_style)
        ],
        [
            Paragraph("<b>Asset Library & OCR Inspector</b>", feat_name_style),
            Paragraph("Left Sidebar → Click <b>'Asset Library'</b>", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/manager/assets</code>", url_style),
            Paragraph("Media asset repository. Click any logo or product image to inspect OCR-extracted text, brand guidelines compliance, and status tags.", body_style)
        ],
        [
            Paragraph("<b>Analytics & AI Health Observability</b>", feat_name_style),
            Paragraph("Left Sidebar → Click <b>'Analytics & Health'</b>", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/manager/analytics</code>", url_style),
            Paragraph("Interactive compliance score graphs, top violated rules heatmap, submission review cycle times, and AI token cost & latency charts.", body_style)
        ],
        [
            Paragraph("<b>Audit History & Security Ledger</b>", feat_name_style),
            Paragraph("Left Sidebar → Click <b>'Audit History'</b>", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/manager/audit</code>", url_style),
            Paragraph("Immutable, tamper-evident security audit trail. Click any log entry to open the JSON Diff modal showing before/after snapshots.", body_style)
        ]
    ]
    t_mgr = Table(mgr_rows, colWidths=[110, 130, 140, 160])
    t_mgr.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_mgr),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
    ]))
    story.append(t_mgr)
    story.append(Spacer(1, 12))

    # Page Break for Creator section
    story.append(PageBreak())

    # -------------------------------------------------------------
    # SECTION 3: CONTENT CREATOR FEATURES (EMILY CARTER)
    # -------------------------------------------------------------
    story.append(Paragraph("3. Content Creator Features (Sign in as Emily Carter)", h1_style))
    story.append(Paragraph("Creation tools, instant brand pre-flight checks, and interactive review diffing for Creators:", body_style))
    story.append(Spacer(1, 4))

    creator_rows = [
        [Paragraph("Feature Name", th_style), Paragraph("Where to Find / Click in Live UI", th_style), Paragraph("Exact Live Website URL", th_style), Paragraph("Screen Location & Key Controls", th_style)],
        [
            Paragraph("<b>Creator Dashboard & Overview</b>", feat_name_style),
            Paragraph("Left Sidebar → Click <b>'Overview'</b>", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/app/overview</code>", url_style),
            Paragraph("Personal compliance rating (88%), recent submissions table, quick-action draft buttons, and pending manager review alerts.", body_style)
        ],
        [
            Paragraph("<b>New Content Submission Studio</b>", feat_name_style),
            Paragraph("Left Sidebar → Click <b>'New Content'</b> (or '+ New Submission')", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/app/new</code>", url_style),
            Paragraph("Copy text editor, campaign metadata fields, and image uploader. Features the <b>'Run Pre-Flight Check'</b> button for instant feedback.", body_style)
        ],
        [
            Paragraph("<b>Instant Pre-Flight Brand Check</b>", feat_name_style),
            Paragraph("Inside New Content Submission page → Click <b>'Run Brand Check'</b>", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/app/new</code> (Inline Panel)", url_style),
            Paragraph("Inline results card showing instant score, highlighted violations, and verified brand rule citations before formal submission.", body_style)
        ],
        [
            Paragraph("<b>My Submissions Register</b>", feat_name_style),
            Paragraph("Left Sidebar → Click <b>'My Submissions'</b> (badge shows count)", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/app/submissions</code>", url_style),
            Paragraph("Filterable list of all personal submissions (*All, In Review, Approved, Needs Changes*). Click any item to open the diff feedback studio.", body_style)
        ],
        [
            Paragraph("<b>AI Review & Interactive Diff Studio</b>", feat_name_style),
            Paragraph("Left Sidebar → Click <b>'AI Review'</b> (or click any submission)", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/app/feedback/:id</code>", url_style),
            Paragraph("Side-by-side visual diff. Violations are tagged with severity pills; click any violation to see cited rule and click <b>'Accept Suggestion'</b> to auto-fix.", body_style)
        ],
        [
            Paragraph("<b>Brand Guidelines Explorer</b>", feat_name_style),
            Paragraph("Left Sidebar → Click <b>'Brand Guidelines'</b>", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/app/guidelines</code>", url_style),
            Paragraph("Searchable creator knowledgebase. Explore dos & don'ts, acceptable claims, prohibited medical claims, typography, and logo usage rules.", body_style)
        ],
        [
            Paragraph("<b>Exception Requests Center</b>", feat_name_style),
            Paragraph("Left Sidebar → Click <b>'Exception Requests'</b>", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/app/exceptions</code>", url_style),
            Paragraph("Click <b>'+ New Exception Request'</b> button to petition for a seasonal rule waiver; track manager rulings (Approved/Rejected) and active dates.", body_style)
        ],
        [
            Paragraph("<b>Sentinel Reassessment Tasks</b>", feat_name_style),
            Paragraph("Left Sidebar → Click <b>'Sentinel Tasks'</b> (yellow badge)", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/app/sentinel</code>", url_style),
            Paragraph("Task list for approved content that requires updates due to new policy changes. Click 'Update Copy' to modify copy and regain compliance.", body_style)
        ],
        [
            Paragraph("<b>Approved Content Hub</b>", feat_name_style),
            Paragraph("Left Sidebar → Click <b>'Approved Content'</b> (green badge)", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/app/approved</code>", url_style),
            Paragraph("Card grid of manager-approved content versions with one-click <b>'Copy Approved Copy'</b>, immutable version hashes, and export actions.", body_style)
        ],
        [
            Paragraph("<b>Notifications Center</b>", feat_name_style),
            Paragraph("Left Sidebar → Click <b>'Notifications'</b> (or top bar bell icon)", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/app/notifications</code>", url_style),
            Paragraph("Real-time notifications feed for approvals, requested revisions, exception rulings, and Sentinel alerts with unread filtering.", body_style)
        ],
        [
            Paragraph("<b>Creator Profile & Settings</b>", feat_name_style),
            Paragraph("Top-Right User Pill → Click Avatar / Name", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/app/profile</code>", url_style),
            Paragraph("Manage account identity, avatar color, email notification preferences, PureGlow workspace info, and sign out.", body_style)
        ],
        [
            Paragraph("<b>My AI Assistants</b>", feat_name_style),
            Paragraph("Left Sidebar → Click <b>'My AI Assistants'</b>", nav_click_style),
            Paragraph("<code>https://precedent-web.onrender.com/app/ai-assistants</code>", url_style),
            Paragraph("Execute AI brand assistants assigned by Brand Managers to run pre-flight claim validations, copy generation, and compliance checks.", body_style)
        ]
    ]
    t_creator = Table(creator_rows, colWidths=[110, 130, 140, 160])
    t_creator.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_creator),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
    ]))
    story.append(t_creator)
    story.append(Spacer(1, 14))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated: {os.path.abspath(filename)}")

if __name__ == "__main__":
    build_pdf()
