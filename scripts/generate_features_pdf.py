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
            self.drawString(36, 11 * inch - 30, "PRECEDENT — Complete Features & Navigation Directory")
            self.drawRightString(8.5 * inch - 36, 11 * inch - 30, "Platform Reference v2.0")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(36, 11 * inch - 34, 8.5 * inch - 36, 11 * inch - 34)

        # Footer (all pages)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(36, 40, 8.5 * inch - 36, 40)
        
        self.drawString(36, 28, "Precedent Platform Architecture • Confidential & Proprietary • PureGlow Workspace")
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
    
    # Custom styles
    c_primary = colors.HexColor("#0F172A")
    c_accent = colors.HexColor("#059669")
    c_muted = colors.HexColor("#64748B")
    c_border = colors.HexColor("#E2E8F0")
    c_bg_light = colors.HexColor("#F8FAFC")
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=c_primary,
        alignment=TA_LEFT
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=c_muted,
        alignment=TA_LEFT
    )
    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=c_accent,
        alignment=TA_LEFT
    )
    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=6
    )
    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=10,
        spaceAfter=4
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155")
    )
    body_bold = ParagraphStyle(
        'BodyDarkBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    badge_style = ParagraphStyle(
        'Badge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0F766E"),
        alignment=TA_CENTER
    )
    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0369A1")
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
    # Cover / Header Banner
    # -------------------------------------------------------------
    story.append(Paragraph("PRECEDENT", title_style))
    story.append(Paragraph("AI-Assisted Brand Governance & Content Approval Platform", subtitle_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("MASTER FEATURE CATALOG & WEBSITE DIRECTORY • VERSION 2.0 (NOVEMBER 2026)", meta_style))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_primary, spaceBefore=0, spaceAfter=12))
    
    # Overview Box
    intro_p = Paragraph(
        "<b>Executive Summary:</b> Precedent is an enterprise-grade brand governance platform enforcing the principle: "
        "<i>'Deterministic rules decide. AI suggests. Humans approve.'</i> "
        "The application provides <b>21 fully integrated production screens</b> across two persona workspaces (Brand Manager and Creator), "
        "a visual <b>AI Agent Studio</b> with React Flow execution graphs, an in-app grounded <b>Precedent Assistant</b>, "
        "and a 5-agent sequential <b>Review Crew</b>. This directory lists every feature, exact route, UI placement, and functional scope.",
        body_style
    )
    intro_table = Table([[intro_p]], colWidths=[540])
    intro_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(intro_table)
    story.append(Spacer(1, 12))
    
    # Quick Login Reference Card
    auth_header = Paragraph("<b>Verified Demo Credentials & Live Endpoints</b>", h2_style)
    story.append(auth_header)
    
    auth_data = [
        [Paragraph("Role / Persona", th_style), Paragraph("Seed Email", th_style), Paragraph("Password", th_style), Paragraph("Default Landing", th_style), Paragraph("Key Responsibilities", th_style)],
        [
            Paragraph("<b>Brand Manager</b>", body_style),
            Paragraph("david.kim@pureglow.co", code_style),
            Paragraph("precedent", code_style),
            Paragraph("/manager/overview", code_style),
            Paragraph("Policy authoring, final approval/rejection, agent builder, audit review", body_style)
        ],
        [
            Paragraph("<b>Content Creator</b>", body_style),
            Paragraph("emily.carter@pureglow.co", code_style),
            Paragraph("precedent", code_style),
            Paragraph("/app/overview", code_style),
            Paragraph("Content drafting, pre-flight brand check, diff studio, exception filing", body_style)
        ]
    ]
    t_auth = Table(auth_data, colWidths=[95, 125, 65, 105, 150])
    t_auth.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_auth)
    story.append(Spacer(1, 14))

    # -------------------------------------------------------------
    # SECTION 1: Public & Authentication
    # -------------------------------------------------------------
    story.append(Paragraph("1. Public & Authentication Routes", h1_style))
    story.append(Paragraph("Accessible without prior authentication. Handled by root router.", body_style))
    story.append(Spacer(1, 6))
    
    public_rows = [
        [Paragraph("Route URL", th_style), Paragraph("Feature Name", th_style), Paragraph("Screen ID", th_style), Paragraph("Core Capabilities & Interactive Behaviors", th_style)],
        [
            Paragraph("<b>/</b>", code_style),
            Paragraph("Public Landing Page", body_bold),
            Paragraph("PUBLIC", badge_style),
            Paragraph("Product value proposition, interactive governance flow explainer, live feature overview, and primary sign-in action links.", body_style)
        ],
        [
            Paragraph("<b>/login</b>", code_style),
            Paragraph("Authentication Portal", body_bold),
            Paragraph("AUTH", badge_style),
            Paragraph("Server-verified Argon2 password authentication, JWT token issue, and 1-click persona quick-switch buttons (David Kim / Emily Carter).", body_style)
        ]
    ]
    t_pub = Table(public_rows, colWidths=[100, 130, 60, 250])
    t_pub.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#334155")),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_pub)
    story.append(Spacer(1, 14))

    # -------------------------------------------------------------
    # SECTION 2: Brand Manager Workspace (M01 - M11)
    # -------------------------------------------------------------
    story.append(Paragraph("2. Brand Manager Workspace (`/manager/*`)", h1_style))
    story.append(Paragraph("Complete brand governance suite for compliance officers, legal counsel, and brand directors.", body_style))
    story.append(Spacer(1, 6))

    mgr_rows = [
        [Paragraph("Route / Path", th_style), Paragraph("Feature & Menu", th_style), Paragraph("Code", th_style), Paragraph("Detailed Capabilities & Real DB Interactions", th_style)],
        [
            Paragraph("<b>/manager/overview</b>", code_style),
            Paragraph("Command Center<br/><i>Sidebar: Overview</i>", body_style),
            Paragraph("M01", badge_style),
            Paragraph("Live compliance health score, pending decision aggregates, recent audit events stream, workspace drift alerts, and fast navigation pills.", body_style)
        ],
        [
            Paragraph("<b>/manager/queue</b><br/><b>/manager/queue/:id</b>", code_style),
            Paragraph("Review Queue & Decision Workspace<br/><i>Sidebar: Review Queue</i>", body_style),
            Paragraph("M02<br/>M04", badge_style),
            Paragraph("5-Agent Review Crew runner. Inspect submission copy and visuals, exact rule violations cited against policy text, visual OCR overlays, and issue Approve, Reject, or Request Changes with immutable audit stamps.", body_style)
        ],
        [
            Paragraph("<b>/manager/submissions</b>", code_style),
            Paragraph("All Submissions Register<br/><i>Sidebar: All Submissions</i>", body_style),
            Paragraph("M03", badge_style),
            Paragraph("Full-width tabular register matching screenshot 1. Multi-column toggle, status filtering, search by title/creator/campaign, score breakdown popover modal, and CSV export.", body_style)
        ],
        [
            Paragraph("<b>/manager/guidelines</b><br/><b>/manager/rules</b>", code_style),
            Paragraph("Guidelines & Rules Manager<br/><i>Sidebar: Guidelines & Rules</i>", body_style),
            Paragraph("M05<br/>M06", badge_style),
            Paragraph("Manage brand policy documents (PDF, DOCX, Markdown). View, create, and edit deterministic rules with severity weights (Critical, High, Medium, Low), claim mappings, and passage citations.", body_style)
        ],
        [
            Paragraph("<b>/manager/exceptions</b>", code_style),
            Paragraph("Exceptions Center<br/><i>Sidebar: Exceptions</i>", body_style),
            Paragraph("M04", badge_style),
            Paragraph("Review pending policy exemption requests filed by Creators. Assess business justifications, set expiration dates, approve/deny with formal ruling rationale.", body_style)
        ],
        [
            Paragraph("<b>/manager/sandbox</b>", code_style),
            Paragraph("Rule Impact Sandbox<br/><i>Sidebar: Rule Impact Sandbox</i>", body_style),
            Paragraph("M07", badge_style),
            Paragraph("What-If simulation engine. Test new or draft rules against historical submission datasets to evaluate potential pass/fail drift and false positive rates prior to activation.", body_style)
        ],
        [
            Paragraph("<b>/manager/sentinel</b>", code_style),
            Paragraph("Sentinel Monitoring<br/><i>Sidebar: Sentinel Monitoring</i>", body_style),
            Paragraph("M08", badge_style),
            Paragraph("Continuous retrospective compliance scanner. Automatically re-evaluates previously approved content when guidelines change. Configure cron schedules and auto-generate creator reassessment tasks.", body_style)
        ],
        [
            Paragraph("<b>/manager/assets</b>", code_style),
            Paragraph("Asset Library<br/><i>Sidebar: Asset Library</i>", body_style),
            Paragraph("M09", badge_style),
            Paragraph("Digital Asset Management (DAM) for approved logos, color palettes, fonts, and imagery. Includes automated OCR text extraction and status tagging (Approved, Deprecated, Review).", body_style)
        ],
        [
            Paragraph("<b>/manager/analytics</b>", code_style),
            Paragraph("Analytics & Health<br/><i>Sidebar: Analytics & Health</i>", body_style),
            Paragraph("M10", badge_style),
            Paragraph("Interactive compliance score trends, top violated rules heatmap, submission review cycle times, and AI engine observability (latency, token costs, fallback frequencies).", body_style)
        ],
        [
            Paragraph("<b>/manager/audit</b>", code_style),
            Paragraph("Audit History<br/><i>Sidebar: Audit History</i>", body_style),
            Paragraph("M11", badge_style),
            Paragraph("Tamper-evident, chronological log of all security events, logins, AI tool calls, rule evaluations, and manager decisions with full JSON diff modal inspection.", body_style)
        ]
    ]
    t_mgr = Table(mgr_rows, colWidths=[110, 120, 45, 265])
    t_mgr.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_mgr)
    story.append(Spacer(1, 14))

    # Page Break for clean sectioning
    story.append(PageBreak())

    # -------------------------------------------------------------
    # SECTION 3: AI Agent Studio
    # -------------------------------------------------------------
    story.append(Paragraph("3. AI Agent Studio (`/manager/agent-studio` & Sub-Routes)", h1_style))
    story.append(Paragraph("Native n8n-inspired visual workflow and natural language agent building suite.", body_style))
    story.append(Spacer(1, 6))

    studio_rows = [
        [Paragraph("Route / Path", th_style), Paragraph("Feature & View", th_style), Paragraph("Scope", th_style), Paragraph("Key Capabilities & Execution Mechanics", th_style)],
        [
            Paragraph("<b>/manager/agent-studio</b><br/><b>/manager/agents</b>", code_style),
            Paragraph("Agent Studio Dashboard<br/><i>Sidebar: Agent Studio</i>", body_style),
            Paragraph("Studio Hub", badge_style),
            Paragraph("Gallery of workspace agents, real-time success rates, template selector (Reviewer, Sentinel, Auditor), and <b>'Prompt-to-Agent' natural language generator modal</b>.", body_style)
        ],
        [
            Paragraph("<b>/manager/agents/:agentId</b>", code_style),
            Paragraph("Agent Configuration<br/><i>Agent Detail</i>", body_style),
            Paragraph("Config", badge_style),
            Paragraph("Configure agent system instructions, temperature, model selection, memory retention policies, permission restrictions, and tool whitelists.", body_style)
        ],
        [
            Paragraph("<b>/manager/agents/:agentId/builder</b>", code_style),
            Paragraph("React Flow Visual Builder<br/><i>Workflow Canvas</i>", body_style),
            Paragraph("Visual Editor", badge_style),
            Paragraph("Interactive drag-and-drop workflow canvas powered by `@xyflow/react`. Connect trigger nodes, tool execution nodes, logic checkpoints, and output actions with connection validation and test runs.", body_style)
        ],
        [
            Paragraph("<b>/manager/agent-runs</b>", code_style),
            Paragraph("Agent Executions Log<br/><i>Sidebar: Agent Executions</i>", body_style),
            Paragraph("Runs Log", badge_style),
            Paragraph("Chronological execution records of all automated and manual agent runs. Real database tracking of run status (Success, Failed, Running), trigger type, duration, and latency.", body_style)
        ],
        [
            Paragraph("<b>/manager/agent-runs/:runId</b>", code_style),
            Paragraph("Execution Trace Inspector<br/><i>Run Trace Deep-Dive</i>", body_style),
            Paragraph("Inspector", badge_style),
            Paragraph("Comprehensive node-by-node execution autopsy. Inspect exact tool inputs and outputs, step durations (ms), deterministic tool calls, and error stack traces.", body_style)
        ]
    ]
    t_studio = Table(studio_rows, colWidths=[120, 115, 60, 245])
    t_studio.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0284C7")),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_studio)
    story.append(Spacer(1, 14))

    # -------------------------------------------------------------
    # SECTION 4: Content Creator Workspace (C01 - C10)
    # -------------------------------------------------------------
    story.append(Paragraph("4. Content Creator Workspace (`/app/*`)", h1_style))
    story.append(Paragraph("Dedicated workflow environment for copywriters, agencies, designers, and marketing contributors.", body_style))
    story.append(Spacer(1, 6))

    creator_rows = [
        [Paragraph("Route / Path", th_style), Paragraph("Feature & Menu", th_style), Paragraph("Code", th_style), Paragraph("Creator Tooling & Real-Time Feedback Loop", th_style)],
        [
            Paragraph("<b>/app/overview</b>", code_style),
            Paragraph("Creator Overview<br/><i>Sidebar: Overview</i>", body_style),
            Paragraph("C01", badge_style),
            Paragraph("Personal compliance score tracker, active submission states, quick-action draft launchers, and recent manager review notifications.", body_style)
        ],
        [
            Paragraph("<b>/app/new</b>", code_style),
            Paragraph("New Submission Studio<br/><i>Sidebar: New Content</i>", body_style),
            Paragraph("C02", badge_style),
            Paragraph("Content editor with file drag-and-drop, metadata tagging, and instantaneous <b>Pre-Flight Brand Check</b> giving immediate feedback before formal submission.", body_style)
        ],
        [
            Paragraph("<b>/app/submissions</b>", code_style),
            Paragraph("My Submissions Register<br/><i>Sidebar: My Submissions</i>", body_style),
            Paragraph("C03", badge_style),
            Paragraph("Personal submission history with filter pills (All, In Review, Approved, Needs Changes), live status tracking, and quick link to diff studio.", body_style)
        ],
        [
            Paragraph("<b>/app/feedback</b><br/><b>/app/feedback/:id</b>", code_style),
            Paragraph("AI Review & Diff Studio<br/><i>Sidebar: AI Review</i>", body_style),
            Paragraph("C04", badge_style),
            Paragraph("Side-by-side interactive diff viewer. Offending words highlighted with severity badges, verified policy citations, and 1-click 'Apply Suggestion' actions.", body_style)
        ],
        [
            Paragraph("<b>/app/guidelines</b>", code_style),
            Paragraph("Brand Guidelines Explorer<br/><i>Sidebar: Brand Guidelines</i>", body_style),
            Paragraph("C05", badge_style),
            Paragraph("Searchable, creator-friendly knowledgebase of brand voice, acceptable cosmetic claims, prohibited terminology, and typography rules.", body_style)
        ],
        [
            Paragraph("<b>/app/exceptions</b>", code_style),
            Paragraph("Exception Requests<br/><i>Sidebar: Exception Requests</i>", body_style),
            Paragraph("C06", badge_style),
            Paragraph("Submit policy exemption petitions for specific seasonal campaigns. Track manager decisions, active exemption timeframes, and reviewer notes.", body_style)
        ],
        [
            Paragraph("<b>/app/sentinel</b>", code_style),
            Paragraph("Sentinel Tasks<br/><i>Sidebar: Sentinel Tasks</i>", body_style),
            Paragraph("C07", badge_style),
            Paragraph("Action queue for content flagged retrospectively by Sentinel drift scans. View exact rule modifications and update copy to regain compliance.", body_style)
        ],
        [
            Paragraph("<b>/app/approved</b>", code_style),
            Paragraph("Approved Content Hub<br/><i>Sidebar: Approved Content</i>", body_style),
            Paragraph("C09", badge_style),
            Paragraph("Catalog of certified, manager-approved content versions with one-click copy, download, and immutable version certificates.", body_style)
        ],
        [
            Paragraph("<b>/app/notifications</b>", code_style),
            Paragraph("Notifications Center<br/><i>Sidebar: Notifications</i>", body_style),
            Paragraph("C08", badge_style),
            Paragraph("Real-time feed of approval events, required revisions, exception rulings, and Sentinel reassessment alerts with read/unread tracking.", body_style)
        ],
        [
            Paragraph("<b>/app/profile</b>", code_style),
            Paragraph("Creator Profile & Preferences<br/><i>Direct / User Menu</i>", body_style),
            Paragraph("C10", badge_style),
            Paragraph("User account settings, avatar tone, active workspace details, notification frequency preferences, and session termination.", body_style)
        ],
        [
            Paragraph("<b>/app/ai-assistants</b>", code_style),
            Paragraph("My AI Assistants<br/><i>Sidebar: My AI Assistants</i>", body_style),
            Paragraph("CREATOR", badge_style),
            Paragraph("Execute published AI brand assistants assigned to creators by managers for copy assistance, claim verification, and pre-validation.", body_style)
        ]
    ]
    t_creator = Table(creator_rows, colWidths=[110, 120, 45, 265])
    t_creator.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#059669")),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_creator)
    story.append(Spacer(1, 14))

    # Page Break for Architecture & Verification
    story.append(PageBreak())

    # -------------------------------------------------------------
    # SECTION 5: Global Architectural Services
    # -------------------------------------------------------------
    story.append(Paragraph("5. Global Persistent Services (Active on All 21 Screens)", h1_style))
    story.append(Paragraph("Cross-cutting platform features that operate continuously across both workspaces.", body_style))
    story.append(Spacer(1, 6))

    global_rows = [
        [Paragraph("Feature Component", th_style), Paragraph("Visual Placement", th_style), Paragraph("Backend Engine / Endpoint", th_style), Paragraph("Operational Functionality", th_style)],
        [
            Paragraph("<b>Precedent Assistant</b><br/>(In-App Chatbot)", body_style),
            Paragraph("Floating launcher dot at bottom-right of every screen; sliding drawer UI.", code_style),
            Paragraph("<code>/api/v1/assistant/*</code><br/>Hybrid passage retriever & prompt fencing.", code_style),
            Paragraph("Grounded brand knowledge answering. Generates exact guideline passage citations, validates citations against DB text, and accepts user feedback (👍 / 👎).", body_style)
        ],
        [
            Paragraph("<b>Review Crew</b><br/>(5-Agent Governance)", body_style),
            Paragraph("Integrated in Review Queue & Submission detail views.", code_style),
            Paragraph("<code>POST /api/v1/submissions/{id}/review-crew</code>", code_style),
            Paragraph("Sequential governance pipeline: <b>Intake</b> → <b>Rules</b> → <b>Evidence</b> → <b>Visual OCR</b> → <b>Synthesis</b>. Logs every step to <code>agent_runs</code> and <code>agent_tool_calls</code>.", body_style)
        ],
        [
            Paragraph("<b>Dynamic Navigation Badges</b>", body_style),
            Paragraph("Sidebar navigation items (Review Queue, Exceptions, Submissions).", code_style),
            Paragraph("<code>GET /api/v1/nav/counts</code><br/>SQL aggregate queries.", code_style),
            Paragraph("Zero-mock counts: badges dynamically reflect real database rows (e.g. Review Queue 11, Open Exceptions 2, Emily's Submissions 14).", body_style)
        ],
        [
            Paragraph("<b>Fast Persona Switcher</b>", body_style),
            Paragraph("Top header navigation bar on all authenticated pages.", code_style),
            Paragraph("Client-side JWT swap & auth context sync.", code_style),
            Paragraph("Instant 1-click toggle between David Kim (Brand Manager) and Emily Carter (Creator) to evaluate user permissions and role-based views without re-authenticating.", body_style)
        ]
    ]
    t_global = Table(global_rows, colWidths=[115, 125, 120, 180])
    t_global.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#475569")),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_global)
    story.append(Spacer(1, 14))

    # -------------------------------------------------------------
    # SECTION 6: Complete Route Map & Sitemap
    # -------------------------------------------------------------
    story.append(Paragraph("6. Complete System Route & Navigation Map", h1_style))
    story.append(Paragraph("Hierarchical sitemap showing URL paths, component implementations, and role guards:", body_style))
    story.append(Spacer(1, 6))

    sitemap_rows = [
        [Paragraph("Path", th_style), Paragraph("Component File", th_style), Paragraph("Role Guard", th_style), Paragraph("Alias / Alternate Path", th_style)],
        [Paragraph("/"), Paragraph("src/pages/marketing/Home.tsx", code_style), Paragraph("Public", body_style), Paragraph("None", body_style)],
        [Paragraph("/login"), Paragraph("src/pages/Login.tsx", code_style), Paragraph("Public", body_style), Paragraph("None", body_style)],
        [Paragraph("/manager/overview"), Paragraph("src/pages/manager/Overview.tsx", code_style), Paragraph("manager", code_style), Paragraph("/manager", code_style)],
        [Paragraph("/manager/queue"), Paragraph("src/pages/manager/Queue.tsx", code_style), Paragraph("manager", code_style), Paragraph("/manager/review-queue", code_style)],
        [Paragraph("/manager/submissions"), Paragraph("src/pages/manager/AllSubmissions.tsx", code_style), Paragraph("manager", code_style), Paragraph("None", body_style)],
        [Paragraph("/manager/guidelines"), Paragraph("src/pages/manager/GuidelinesRules.tsx", code_style), Paragraph("manager", code_style), Paragraph("/manager/rules", code_style)],
        [Paragraph("/manager/exceptions"), Paragraph("src/pages/manager/Exceptions.tsx", code_style), Paragraph("manager", code_style), Paragraph("None", body_style)],
        [Paragraph("/manager/sandbox"), Paragraph("src/pages/manager/Sandbox.tsx", code_style), Paragraph("manager", code_style), Paragraph("None", body_style)],
        [Paragraph("/manager/sentinel"), Paragraph("src/pages/manager/SentinelMonitoring.tsx", code_style), Paragraph("manager", code_style), Paragraph("None", body_style)],
        [Paragraph("/manager/assets"), Paragraph("src/pages/manager/AssetLibrary.tsx", code_style), Paragraph("manager", code_style), Paragraph("None", body_style)],
        [Paragraph("/manager/analytics"), Paragraph("src/pages/manager/AnalyticsHealth.tsx", code_style), Paragraph("manager", code_style), Paragraph("None", body_style)],
        [Paragraph("/manager/audit"), Paragraph("src/pages/manager/Audit.tsx", code_style), Paragraph("manager", code_style), Paragraph("None", body_style)],
        [Paragraph("/manager/agent-studio"), Paragraph("src/pages/manager/AgentStudio.tsx", code_style), Paragraph("manager", code_style), Paragraph("/manager/agents", code_style)],
        [Paragraph("/manager/agents/:id"), Paragraph("src/pages/manager/AgentDetail.tsx", code_style), Paragraph("manager", code_style), Paragraph("None", body_style)],
        [Paragraph("/manager/agents/:id/builder"), Paragraph("src/pages/manager/WorkflowBuilderPage.tsx", code_style), Paragraph("manager", code_style), Paragraph("None", body_style)],
        [Paragraph("/manager/agent-runs"), Paragraph("src/pages/manager/AgentRunsPage.tsx", code_style), Paragraph("manager", code_style), Paragraph("None", body_style)],
        [Paragraph("/manager/agent-runs/:runId"), Paragraph("src/pages/manager/AgentRunDetailPage.tsx", code_style), Paragraph("manager", code_style), Paragraph("None", body_style)],
        [Paragraph("/app/overview"), Paragraph("src/pages/content/Overview.tsx", code_style), Paragraph("creator", code_style), Paragraph("/creator/dashboard", code_style)],
        [Paragraph("/app/new"), Paragraph("src/pages/content/NewContent.tsx", code_style), Paragraph("creator", code_style), Paragraph("/creator/new-content", code_style)],
        [Paragraph("/app/submissions"), Paragraph("src/pages/content/Submissions.tsx", code_style), Paragraph("creator", code_style), Paragraph("/creator/submissions", code_style)],
        [Paragraph("/app/feedback/:id"), Paragraph("src/pages/content/Feedback.tsx", code_style), Paragraph("creator", code_style), Paragraph("/creator/ai-review", code_style)],
        [Paragraph("/app/guidelines"), Paragraph("src/pages/content/Guidelines.tsx", code_style), Paragraph("creator", code_style), Paragraph("/creator/guidelines", code_style)],
        [Paragraph("/app/exceptions"), Paragraph("src/pages/content/CreatorExceptionRequests.tsx", code_style), Paragraph("creator", code_style), Paragraph("/creator/exception-requests", code_style)],
        [Paragraph("/app/sentinel"), Paragraph("src/pages/content/CreatorSentinelTasks.tsx", code_style), Paragraph("creator", code_style), Paragraph("/creator/sentinel-tasks", code_style)],
        [Paragraph("/app/notifications"), Paragraph("src/pages/content/CreatorNotifications.tsx", code_style), Paragraph("creator", code_style), Paragraph("/creator/notifications", code_style)],
        [Paragraph("/app/approved"), Paragraph("src/pages/content/CreatorApprovedContent.tsx", code_style), Paragraph("creator", code_style), Paragraph("/creator/approved-content", code_style)],
        [Paragraph("/app/profile"), Paragraph("src/pages/content/CreatorProfile.tsx", code_style), Paragraph("creator", code_style), Paragraph("/creator/profile", code_style)],
        [Paragraph("/app/ai-assistants"), Paragraph("src/pages/content/CreatorAssistants.tsx", code_style), Paragraph("creator", code_style), Paragraph("/creator/ai-assistants", code_style)]
    ]
    t_site = Table(sitemap_rows, colWidths=[120, 185, 75, 160])
    t_site.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_site)
    story.append(Spacer(1, 14))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated: {os.path.abspath(filename)}")

if __name__ == "__main__":
    build_pdf()
