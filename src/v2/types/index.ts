export type UserRole = 'manager' | 'creator';

export type ManagerPage =
  | 'overview'
  | 'review-queue'
  | 'all-submissions'
  | 'brand-guidelines'
  | 'guidelines'
  | 'rules-conflicts'
  | 'exceptions'
  | 'sandbox'
  | 'sentinel'
  | 'asset-library'
  | 'analytics'
  | 'audit-history'
  | 'agent-studio'
  | 'my-agents'
  | 'agent-executions';

export type CreatorPage =
  | 'creator-dashboard'
  | 'new-content'
  | 'my-submissions'
  | 'ai-review'
  | 'creator-ai-review'
  | 'creator-guidelines'
  | 'exception-requests'
  | 'creator-exceptions'
  | 'sentinel-tasks'
  | 'creator-tasks'
  | 'notifications'
  | 'approved-content'
  | 'profile'
  | 'my-assistants';

export type PageId = ManagerPage | CreatorPage;

export type SubmissionStatus = 'In Review' | 'Needs Changes' | 'Approved' | 'Rejected' | 'Pending';

export interface Submission {
  id: string;
  title: string;
  campaign: string;
  brand?: string;
  text?: string;
  creator: {
    name: string;
    avatar: string;
    initials: string;
    role?: string;
  };
  thumbnail: string;
  version?: string;
  status: SubmissionStatus;
  complianceScore: number;
  submittedAt?: string;
  submittedDate?: string;
  relativeTime?: string;
  time?: string;
  assetType?: string;
  format?: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  viewsCount?: number;
  type?: 'Image' | 'Video' | 'Text' | 'Social' | 'image' | 'video' | 'text' | 'social';
  findingsCount?: number;
  findings?: {
    id: string;
    title: string;
    description: string;
    type: 'error' | 'warning' | 'success' | 'passed';
    badge?: string;
    guidelineRef?: string;
  }[];
  comments?: {
    id: string;
    author: string;
    avatar: string;
    time: string;
    text: string;
  }[];
}

export interface Guideline {
  id: string;
  title: string;
  description: string;
  category: 'Brand Identity' | 'Messaging & Tone' | 'Visual Standards' | 'Product Claims' | 'Legal & Compliance' | 'Marketing Assets';
  version: string;
  status: 'Active' | 'Pending' | 'Archived' | 'Draft';
  lastUpdated: string;
  owner: string;
  thumbnail: string;
  format?: string;
  downloadUrl?: string;
  relatedGuidelines?: { title: string; version: string; thumbnail: string }[];
}

export interface RuleConflict {
  id: string;
  title: string;
  description: string;
  category: string;
  ruleVersion: string;
  status: 'Active' | 'Conflict' | 'Review Required';
  date: string;
  source1?: { name: string; requirement: string };
  source2?: { name: string; requirement: string };
  impact?: string;
  recommendedAction?: string;
  relatedDoc?: string;
  /** Raw rule codes, needed to call the conflict-review endpoint. */
  ruleACode?: string;
  ruleBCode?: string;
  /** True when a manager has persisted a review of this conflict. */
  reviewed?: boolean;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}

export interface ExceptionItem {
  id: string;
  campaign: string;
  requestTitle: string;
  reason: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  submittedOn: string;
  creator: string;
  thumbnail: string;
  scope?: string;
  conditions?: string;
  expiryDate?: string;
  managerNotes?: string;
}

export interface SentinelAlert {
  id: string;
  title: string;
  subtitle: string;
  category: 'Claims Risk' | 'Brand Consistency' | 'Policy Violation' | 'Legal & Compliance';
  severity: 'High' | 'Medium' | 'Low';
  detectedOn: string;
  status: 'Open' | 'Investigating' | 'Resolved';
  thumbnail: string;
  channel?: string;
  campaign?: string;
  contentType?: string;
  recommendedAction?: string;
  description?: string;
  contentId?: string;
  contentTitle?: string;
  submissionId?: string;
  submissionTitle?: string;
}

export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'other';
  format: string;
  size: string;
  dimensions?: string;
  status: 'Approved' | 'In Review' | 'Pending' | 'Flagged';
  campaign: string;
  uploadedBy: string;
  uploadedAt: string;
  thumbnail: string;
  tags: string[];
}

export interface AuditEvent {
  id: string;
  dateTime: string;
  date?: string;
  time?: string;
  user: {
    name: string;
    role: string;
    avatar: string;
    isSystem?: boolean;
  };
  action: string;
  actionColor: string;
  module: string;
  details: string;
  subDetails?: string;
  status: 'Success' | 'Failed';
  thumbnail?: string;
  auditTrail?: {
    step: string;
    time: string;
    actor: string;
    completed: boolean;
  }[];
}

export interface NotificationItem {
  id: string;
  title: string;
  description?: string;
  message?: string;
  time?: string;
  timestamp?: string;
  type: 'approval' | 'action_required' | 'action' | 'update' | 'comment' | 'system' | 'warning' | 'info' | 'guideline';
  badgeText?: string;
  isUnread?: boolean;
  read?: boolean;
  thumbnail?: string;
  campaign?: string;
  actionUrl?: string;
}

