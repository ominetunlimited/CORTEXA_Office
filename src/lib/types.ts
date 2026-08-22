/* ── CORTEXA domain model ─────────────────────────────────────────────── */

export type Role =
  | 'Super Admin'
  | 'Organisation Admin'
  | 'Executive'
  | 'Secretary'
  | 'Records Officer'
  | 'Department Head'
  | 'Staff'
  | 'Viewer';

export const ROLES: Role[] = [
  'Super Admin',
  'Organisation Admin',
  'Executive',
  'Secretary',
  'Records Officer',
  'Department Head',
  'Staff',
  'Viewer',
];

export type SecurityLevel = 'Public' | 'Internal' | 'Confidential' | 'Highly Confidential';
export const SECURITY_LEVELS: SecurityLevel[] = ['Public', 'Internal', 'Confidential', 'Highly Confidential'];

export type OrgType =
  | 'Government Ministry' | 'Government Department' | 'Government Agency' | 'Local Government'
  | 'University' | 'Polytechnic' | 'College' | 'Primary School' | 'Secondary School'
  | 'NGO' | 'Civil Society Organisation' | 'Private Company' | 'Professional Association'
  | 'Hospital' | 'Religious Organisation' | 'Foundation' | 'Research Institution' | 'Other';
export const ORG_TYPES: OrgType[] = [
  'Government Ministry', 'Government Department', 'Government Agency', 'Local Government',
  'University', 'Polytechnic', 'College', 'Primary School', 'Secondary School',
  'NGO', 'Civil Society Organisation', 'Private Company', 'Professional Association',
  'Hospital', 'Religious Organisation', 'Foundation', 'Research Institution', 'Other',
];

export type CorrType =
  | 'Letter' | 'Invitation' | 'Memo' | 'Circular' | 'Complaint' | 'Request'
  | 'Proposal' | 'Application' | 'Report' | 'Contract' | 'Notice'
  | 'Government Communication' | 'Other';
export const CORR_TYPES: CorrType[] = [
  'Letter', 'Invitation', 'Memo', 'Circular', 'Complaint', 'Request', 'Proposal',
  'Application', 'Report', 'Contract', 'Notice', 'Government Communication', 'Other',
];

export type CorrStatus =
  | 'Received' | 'Registered' | 'Pending Review' | 'Assigned' | 'In Progress'
  | 'Awaiting Response' | 'Responded' | 'Closed' | 'Archived';
export const CORR_STATUSES: CorrStatus[] = [
  'Received', 'Registered', 'Pending Review', 'Assigned', 'In Progress',
  'Awaiting Response', 'Responded', 'Closed', 'Archived',
];

export type Priority = 'Routine' | 'Important' | 'Urgent';
export const PRIORITIES: Priority[] = ['Routine', 'Important', 'Urgent'];

export type DispatchMethod = 'Email' | 'Physical Delivery' | 'Courier' | 'Postal Service' | 'Hand Delivery' | 'Other';
export const DISPATCH_METHODS: DispatchMethod[] = ['Email', 'Physical Delivery', 'Courier', 'Postal Service', 'Hand Delivery', 'Other'];

export type DeliveryStatus = 'Draft' | 'Approved' | 'Dispatched' | 'Delivered' | 'Returned';
export const DELIVERY_STATUSES: DeliveryStatus[] = ['Draft', 'Approved', 'Dispatched', 'Delivered', 'Returned'];

export type MeetingStatus = 'Scheduled' | 'Confirmed' | 'Rescheduled' | 'Cancelled' | 'Completed';
export const MEETING_STATUSES: MeetingStatus[] = ['Scheduled', 'Confirmed', 'Rescheduled', 'Cancelled', 'Completed'];

export type ResponseOption = 'Accepted' | 'Declined' | 'Delegated' | 'Pending' | 'Rescheduled';
export const RESPONSE_OPTIONS: ResponseOption[] = ['Accepted', 'Declined', 'Delegated', 'Pending', 'Rescheduled'];

export type TaskStatus = 'Not Started' | 'In Progress' | 'Pending' | 'Completed' | 'Cancelled';
export const TASK_STATUSES: TaskStatus[] = ['Not Started', 'In Progress', 'Pending', 'Completed', 'Cancelled'];

export type DocCategory =
  | 'Policy' | 'Report' | 'Contract' | 'Minutes' | 'Scan' | 'Memo' | 'Briefing'
  | 'Financial' | 'Legal' | 'Communication' | 'Form' | 'Other';
export const DOC_CATEGORIES: DocCategory[] = [
  'Policy', 'Report', 'Contract', 'Minutes', 'Scan', 'Memo', 'Briefing',
  'Financial', 'Legal', 'Communication', 'Form', 'Other',
];

export type Retention = 'Active' | 'Closed' | 'Archived' | 'Scheduled for Destruction';
export const RETENTIONS: Retention[] = ['Active', 'Closed', 'Archived', 'Scheduled for Destruction'];

export type MatterStatus = 'Active' | 'Closed' | 'Archived';
export const MATTER_STATUSES: MatterStatus[] = ['Active', 'Closed', 'Archived'];

export type ApprovalState = 'Pending' | 'Approved' | 'Rejected' | 'Changes Requested';

/* ── entities ─────────────────────────────────────────────────────────── */

/* ── feature flags & module visibility ─────────────────────────────── */
export type FlagKey =
  | 'finance' | 'assets' | 'announcements' | 'deadlines' | 'ai'
  | 'hr' | 'procurement' | 'projects' | 'board';
export type FeatureFlags = Record<FlagKey, boolean>;
export const ALL_FLAGS: FlagKey[] = ['finance', 'assets', 'announcements', 'deadlines', 'ai', 'hr', 'procurement', 'projects', 'board'];

export interface OrgBrand {
  primary: string;            // css colour applied to workspace accents
  secondary: string;
}

export interface Organisation {
  id: string;
  name: string;
  type: OrgType;
  logoInitials: string;
  logoUrl?: string;           // uploaded logo data-url
  address: string;
  email: string;
  phone: string;
  website?: string;
  country?: string;           // ISO2
  refPrefix: string;
  approvalChain: Role[];
  notificationPrefs: { category: string; inApp: boolean; email: boolean; browser: boolean }[];
  setupComplete: boolean;     // onboarding wizard finished
  currency: { code: string; symbol: string };
  brand: OrgBrand;
  flags: FeatureFlags;
  aiSeats: number;            // subscription-configurable AI capacity
  pettyCashOpening: number;
  budgetAlertPct: number[];   // e.g. [70,80,90,100]
  createdAt: string;
}

export interface User {
  id: string;
  orgId: string;
  name: string;
  email: string;
  title: string;
  role: Role;
  departmentId?: string;
  active: boolean;
  initials: string;
  color: string;
  photo?: string;             // avatar data-url (JPG/PNG/WEBP)
  pwdHash?: string;           // salted digest — plaintext never stored
  emailVerified: boolean;
  phone?: string;
  country?: string;           // ISO2
  pwdChangedAt?: string;
  aiEnabled: boolean;         // per-seat AI access (max org.aiSeats)
}

/* ── executive authority domain ───────────────────────────────────── */

/** Granular executive grants (§15). A role alone never implies these. */
export type ExecGrant =
  | 'EXECUTIVE_DESK_ACCESS'
  | 'VIEW_EXECUTIVE_CORRESPONDENCE'
  | 'CREATE_EXECUTIVE_DRAFT'
  | 'MANAGE_EXECUTIVE_CALENDAR'
  | 'MANAGE_EXECUTIVE_MEETINGS'
  | 'PREPARE_EXECUTIVE_REPORT'
  | 'VIEW_EXECUTIVE_REPORT'
  | 'APPROVE_EXECUTIVE_DOCUMENT'
  | 'MANAGE_EXECUTIVE_TASKS'
  | 'VIEW_EXECUTIVE_CONFIDENTIAL_RECORDS';
export const EXEC_GRANTS: ExecGrant[] = [
  'EXECUTIVE_DESK_ACCESS', 'VIEW_EXECUTIVE_CORRESPONDENCE', 'CREATE_EXECUTIVE_DRAFT',
  'MANAGE_EXECUTIVE_CALENDAR', 'MANAGE_EXECUTIVE_MEETINGS', 'PREPARE_EXECUTIVE_REPORT',
  'VIEW_EXECUTIVE_REPORT', 'APPROVE_EXECUTIVE_DOCUMENT', 'MANAGE_EXECUTIVE_TASKS',
  'VIEW_EXECUTIVE_CONFIDENTIAL_RECORDS',
];

export type OfficeRole = 'Executive' | 'Chief of Staff' | 'Executive Secretary' | 'Special Assistant' | 'Personal Assistant';

/** Executive inbox states (§19). */
export type ExecInboxState = 'New' | 'Read' | 'Under Review' | 'Action Required' | 'Delegated' | 'Responded' | 'Archived';
export const EXEC_INBOX_STATES: ExecInboxState[] = ['New', 'Read', 'Under Review', 'Action Required', 'Delegated', 'Responded', 'Archived'];

export interface ExecutiveProfile {
  id: string;
  orgId: string;
  userId: string;             // the user who holds this office
  title: string;              // e.g. Vice Chancellor, Registrar, Bursar
  execRef: string;            // e.g. EXEC-001
  level?: string;             // optional executive level
  departmentId?: string;
  officeTeam: { userId: string; officeRole: OfficeRole }[];
  createdAt: string;
}

export interface ExecutiveDelegation {
  id: string;
  orgId: string;
  executiveId: string;        // ExecutiveProfile.id
  delegateUserId: string;
  grants: ExecGrant[];
  startsAt: string;
  expiresAt?: string;         // temporary delegation (§42) — auto-expires
  acting?: boolean;           // acting executive appointment (§43)
  revoked: boolean;
  createdAt: string;
}

export type DecisionStatus = 'Pending' | 'In Progress' | 'Completed' | 'Overdue' | 'Cancelled';
export const DECISION_STATUSES: DecisionStatus[] = ['Pending', 'In Progress', 'Completed', 'Overdue', 'Cancelled'];

export interface ExecutiveDecision {
  id: string;
  orgId: string;
  ref: string;                // DEC/2026/001
  date: string;
  executiveId: string;        // ExecutiveProfile.id
  matterId?: string;
  decision: string;
  responsibleId?: string;     // officer accountable
  deadline?: string;
  status: DecisionStatus;     // Overdue is derived automatically when past deadline
  supportingDocIds: string[];
  taskId?: string;            // linked action (§23)
  createdAt: string;
}

export type ReportPeriodKind = 'Monthly' | 'Quarterly' | 'Biannual' | 'Annual' | 'Custom';

export interface ReportSection { key: string; label: string; body: string }

export interface ExecutiveReport {
  id: string;
  orgId: string;
  ref: string;
  title: string;
  periodKind: ReportPeriodKind;
  periodFrom: string;         // yyyy-mm-dd
  periodTo: string;
  periodLabel: string;        // "Q1 2026", "FY 2026", custom label
  status: 'Draft' | 'Approved' | 'Archived';
  autoCompiled: boolean;      // true until a user approves — "Automatically Compiled Draft"
  sections: ReportSection[];
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  /* Immutable snapshot taken on approval (§32) — later record edits must not
     silently rewrite an approved historical report. */
  snapshot?: {
    compiledAt: string;
    approvedAt: string;
    approvedBy: string;
    sourceDataAt: string;
    counts: Record<string, number>;
  };
  createdAt: string;
  updatedAt: string;
}

/* ── finance domain ────────────────────────────────────────────────── */
export type FinKind = 'income' | 'expenditure';
export type ExpStatus = 'Draft' | 'Submitted' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Paid' | 'Cancelled';
export const EXP_STATUSES: ExpStatus[] = ['Draft', 'Submitted', 'Pending Approval', 'Approved', 'Rejected', 'Paid', 'Cancelled'];

export interface FinanceTxn {
  id: string;
  orgId: string;
  ref: string;
  kind: FinKind;
  date: string;               // ISO date (yyyy-mm-dd)
  party: string;              // income source / payee
  description: string;
  amount: number;
  currency: string;
  departmentId?: string;
  category: string;
  budgetId?: string;
  paymentMethod?: string;
  status: ExpStatus;          // income uses Draft/Approved/Paid; expenditure full workflow
  requestedById?: string;
  approvedById?: string;
  paidById?: string;
  receiptDocId?: string;
  notes?: string;
  createdAt: string;
}

export interface BudgetLine {
  id: string;
  orgId: string;
  year: number;
  departmentId?: string;
  category: string;
  allocated: number;
}

export interface Vendor {
  id: string;
  orgId: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  category: string;
  status: 'Active' | 'Inactive';
  notes?: string;
  createdAt: string;
}

export type InvoiceStatus = 'Received' | 'Under Review' | 'Approved' | 'Partially Paid' | 'Paid' | 'Disputed' | 'Cancelled';
export const INVOICE_STATUSES: InvoiceStatus[] = ['Received', 'Under Review', 'Approved', 'Partially Paid', 'Paid', 'Disputed', 'Cancelled'];

export interface Invoice {
  id: string;
  orgId: string;
  ref: string;
  vendorId?: string;
  date: string;
  dueDate?: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  expenseId?: string;
  receiptDocId?: string;
  createdAt: string;
}

/* ── announcements, assets ─────────────────────────────────────────── */
export interface Announcement {
  id: string;
  orgId: string;
  title: string;
  body: string;
  priority: 'Routine' | 'Important' | 'Urgent';
  targetDepartmentId?: string;
  expiresAt?: string;         // ISO date
  createdBy: string;
  createdAt: string;
}

export type AssetStatus = 'Available' | 'Assigned' | 'Under Repair' | 'Lost' | 'Retired' | 'Disposed';
export const ASSET_STATUSES: AssetStatus[] = ['Available', 'Assigned', 'Under Repair', 'Lost', 'Retired', 'Disposed'];

export interface Asset {
  id: string;
  orgId: string;
  assetCode: string;          // e.g. ICT/LAP/2026/024
  name: string;
  category: string;
  serial?: string;
  purchaseDate?: string;
  cost?: number;
  condition?: string;
  assignedToId?: string;
  departmentId?: string;
  location?: string;
  status: AssetStatus;
  createdAt: string;
}

/* ── security domain ─────────────────────────────────────────────────── */

export interface PendingSignup {
  id: string;
  firstName: string;
  lastName: string;
  orgName: string;
  orgType: OrgType;
  country: string;            // ISO2
  email: string;              // normalised
  pwdHash: string;
  termsAcceptedAt: string;
  createdAt: string;
}

export interface SessionInfo {
  id: string;
  userId: string;
  createdAt: number;
  lastSeen: number;
  device: string;
  ip: string;
}

export interface OtpRecord {
  hash: string;               // salted digest of the 6-digit code
  email: string;              // normalised
  expiresAt: number;
  attempts: number;
  resends: number;
  lastSentAt: number;
  purpose: 'signup' | 'reset';
  signupId?: string;
}

export interface SecurityState {
  loginAttempts: Record<string, { count: number; lockedUntil: number }>;
  otp: Record<string, OtpRecord>;   // keyed by normalised email
  lastCodeEcho: Record<string, string>; // demo mail-relay only (simulated SMTP outbox)
}

export type OfficeType = 'Executive' | 'Administrative' | 'Departmental' | 'Directorate' | 'Unit' | 'Agency' | 'Secretariat' | 'Other';
export const OFFICE_TYPES: OfficeType[] = ['Executive', 'Administrative', 'Departmental', 'Directorate', 'Unit', 'Agency', 'Secretariat', 'Other'];

/** An Office is an organisational unit that can hold executives, secretaries
 *  and staff. Organisation → Offices → Departments → Users (§8-§9).        */
export interface Office {
  id: string;
  orgId: string;
  name: string;               // e.g. "Office of the Vice Chancellor"
  code: string;               // e.g. "VC"
  description: string;
  officeType: OfficeType;
  parentOfficeId?: string;    // hierarchical offices where needed
  headUserId?: string;        // the executive or head of office
  executiveProfileId?: string;// link to the ExecutiveProfile when it is an executive office
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface Department {
  id: string;
  orgId: string;
  name: string;
  code: string;
  headId?: string;
  officeId?: string;          // the office this department sits under (§10)
  parentDepartmentId?: string;// hierarchical departments where needed
  status?: 'Active' | 'Inactive';
  description: string;
}

export interface Contact {
  id: string;
  orgId: string;
  name: string;
  position: string;
  organisation: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  notes: string;
  tags: string[];
}

export interface Correspondence {
  id: string;
  orgId: string;
  ref: string;
  direction: 'incoming' | 'outgoing';
  externalRef?: string;
  dateReceived: string;      // incoming: received · outgoing: dated
  dateOfLetter?: string;
  sender?: string;
  senderOrg?: string;
  recipient: string;
  recipientOrg?: string;
  subject: string;
  type: CorrType;
  departmentId?: string;
  assignedTo?: string;       // user id
  routeToUserId?: string;    // direct person-to-person routing (§12) — an executive or any officer
  routeOfficeId?: string;    // routed to an executive office team (§45) — ExecutiveProfile.id
  execState?: ExecInboxState; // executive inbox state (§19)
  priority: Priority;
  security: SecurityLevel;
  responseRequired: boolean;
  responseDeadline?: string;
  responseStatus?: ResponseOption; // for invitations
  status: CorrStatus;
  notes: string;
  attachments: string[];     // document ids
  matterId?: string;
  dispatchMethod?: DispatchMethod;
  dispatchDate?: string;
  deliveryStatus?: DeliveryStatus;
  authorId?: string;
  approverId?: string;
  relatedCorrId?: string;
  ocrText?: string;
  archived: boolean;
}

export interface DocVersion {
  version: string;
  authorId: string;
  at: string;
  note: string;
  fileName: string;
  sizeKb: number;
}

export interface DocumentRecord {
  id: string;
  orgId: string;
  fileNumber: string;
  title: string;
  category: DocCategory;
  departmentId?: string;
  ownerId: string;
  routeToUserId?: string;    // directly addressed/routed to a person (e.g. an executive)
  routeOfficeId?: string;    // routed to an executive office team
  security: SecurityLevel;
  status: 'Draft' | 'In Review' | 'Approved' | 'Circulated' | 'Archived';
  fileName: string;          // original name — metadata only, never a filesystem path
  storageKey?: string;       // opaque object-storage key (signed URLs in production)
  sizeKb: number;
  mime: string;
  versions: DocVersion[];
  body?: string;             // text content (OCR-extracted or authored) — searchable
  ocr: boolean;
  matterId?: string;
  retention: Retention;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  /* document security & collaboration */
  tags?: string[];                       // free-form labels for filing & search
  shares?: DocShare[];                   // explicit in-org grants (user or department)
  lock?: { userId: string; userName: string; at: string } | null; // edit lock
  originalKb?: number;                   // size before compression (sizeKb = stored)
}

export interface DocShare {
  id: string;
  userId?: string;
  departmentId?: string;
  name: string;              // display label (user name or department)
  grantedBy: string;         // user name who shared
  at: string;
}

export interface MatterEvent {
  id: string;
  at: string;
  text: string;
  kind: 'correspondence' | 'document' | 'meeting' | 'task' | 'approval' | 'note';
}

export interface Matter {
  id: string;
  orgId: string;
  fileNumber: string;
  title: string;
  description: string;
  category: string;
  departmentId?: string;
  ownerId: string;
  status: MatterStatus;
  security: SecurityLevel;
  retention: Retention;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
  events: MatterEvent[];
}

export interface AgendaItem {
  id: string;
  order: number;
  text: string;
}

export interface Meeting {
  id: string;
  orgId: string;
  ref: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  virtualLink?: string;
  organiserId: string;
  participantIds: string[];
  externalOrgs: string[];
  description: string;
  agenda: AgendaItem[];
  status: MeetingStatus;
  isInvitation: boolean;
  response: ResponseOption;
  relatedCorrId?: string;
  matterId?: string;
  minutesDocId?: string;
  archived: boolean;
}

export interface TaskItem {
  id: string;
  orgId: string;
  ref: string;
  title: string;
  description: string;
  assigneeId?: string;
  createdById: string;
  departmentId?: string;
  priority: Priority;
  dueDate?: string;
  status: TaskStatus;
  relatedType?: 'correspondence' | 'document' | 'meeting' | 'matter';
  relatedId?: string;
  completedAt?: string;
  archived: boolean;
  createdAt: string;
}

export interface ApprovalStep {
  role: Role;
  userId?: string;
  state: ApprovalState;
  decidedAt?: string;
  comment?: string;
}

export interface ApprovalRecord {
  id: string;
  orgId: string;
  recordType: 'document' | 'memo';
  recordId: string;
  title: string;
  requestedById: string;
  chain: ApprovalStep[];
  currentStep: number;
  overall: ApprovalState;
  createdAt: string;
}

export interface EmailRecord {
  id: string;
  orgId: string;
  from: string;
  fromEmail: string;
  subject: string;
  receivedAt: string;
  body: string;
  attachments: string[];
  registeredCorrId?: string;
}

export interface NotificationItem {
  id: string;
  orgId: string;
  userId: string;
  category: 'Meetings' | 'Tasks' | 'Approvals' | 'Correspondence' | 'Deadlines' | 'System';
  title: string;
  body: string;
  at: string;
  read: boolean;
  link?: Route;
}

export interface AuditEntry {
  id: string;
  orgId: string;
  at: string;
  userId: string;
  userName: string;
  action: string;
  recordType: string;
  recordId?: string;
  target: string;
  result: 'success' | 'denied';
}

export interface CommentItem {
  id: string;
  orgId: string;
  targetType: 'document' | 'correspondence' | 'matter' | 'task';
  targetId: string;
  userId: string;
  text: string;
  at: string;
}

export interface RefCounters {
  [key: string]: number; // key: `${orgId}:${kind}:${deptCode}:${year}`
}

export interface DB {
  version: number;
  session: { userId: string | null; sessionId: string | null };
  orgs: Organisation[];
  users: User[];
  departments: Department[];
  contacts: Contact[];
  correspondence: Correspondence[];
  documents: DocumentRecord[];
  matters: Matter[];
  meetings: Meeting[];
  tasks: TaskItem[];
  approvals: ApprovalRecord[];
  emails: EmailRecord[];
  notifications: NotificationItem[];
  audit: AuditEntry[];
  comments: CommentItem[];
  counters: RefCounters;
  /* security domain */
  pendingSignups: PendingSignup[];
  sessions: SessionInfo[];
  security: SecurityState;
  /* finance & operations domain */
  finance: FinanceTxn[];
  budgets: BudgetLine[];
  vendors: Vendor[];
  invoices: Invoice[];
  announcements: Announcement[];
  assets: Asset[];
  /* executive authority domain */
  offices: Office[];
  executives: ExecutiveProfile[];
  delegations: ExecutiveDelegation[];
  decisions: ExecutiveDecision[];
  reports: ExecutiveReport[];
}

/* ── routing ──────────────────────────────────────────────────────────── */

export type RouteName =
  | 'dashboard' | 'desk-secretary' | 'desk-executive'
  | 'correspondence' | 'matters' | 'matter' | 'documents' | 'meetings' | 'meeting'
  | 'tasks' | 'calendar' | 'contacts' | 'departments' | 'reports' | 'archive'
  | 'admin' | 'search' | 'account'
  | 'finance' | 'assets' | 'announcements' | 'deadlines';

export interface Route {
  name: RouteName;
  id?: string;
  q?: string;
  tab?: string;
}

/* ── display metadata ─────────────────────────────────────────────────── */

export interface Meta {
  label: string;
  chip: string;   // chip classes
  dot: string;    // dot color class
}

export const CORR_STATUS_META: Record<CorrStatus, Meta> = {
  Received:            { label: 'Received',            chip: 'bg-steel-100 text-steel-700',  dot: 'bg-steel-500' },
  Registered:          { label: 'Registered',          chip: 'bg-pine-100 text-pine-700',    dot: 'bg-pine-500' },
  'Pending Review':    { label: 'Pending Review',      chip: 'bg-brass-100 text-brass-700',  dot: 'bg-brass-500' },
  Assigned:            { label: 'Assigned',            chip: 'bg-steel-100 text-steel-700',  dot: 'bg-steel-600' },
  'In Progress':       { label: 'In Progress',         chip: 'bg-pine-100 text-pine-700',    dot: 'bg-pine-600' },
  'Awaiting Response': { label: 'Awaiting Response',   chip: 'bg-brass-100 text-brass-700',  dot: 'bg-brass-600' },
  Responded:           { label: 'Responded',           chip: 'bg-moss-100 text-moss-700',    dot: 'bg-moss-600' },
  Closed:              { label: 'Closed',              chip: 'bg-line-soft text-ink-soft',   dot: 'bg-ink-faint' },
  Archived:            { label: 'Archived',            chip: 'bg-line-soft text-ink-faint',  dot: 'bg-ink-faint' },
};

export const TASK_STATUS_META: Record<TaskStatus | 'Overdue', Meta> = {
  'Not Started': { label: 'Not Started', chip: 'bg-steel-100 text-steel-700', dot: 'bg-steel-500' },
  'In Progress': { label: 'In Progress', chip: 'bg-pine-100 text-pine-700',   dot: 'bg-pine-600' },
  Pending:       { label: 'Pending',     chip: 'bg-brass-100 text-brass-700', dot: 'bg-brass-500' },
  Completed:     { label: 'Completed',   chip: 'bg-moss-100 text-moss-700',   dot: 'bg-moss-600' },
  Cancelled:     { label: 'Cancelled',   chip: 'bg-line-soft text-ink-faint', dot: 'bg-ink-faint' },
  Overdue:       { label: 'Overdue',     chip: 'bg-clay-100 text-clay-700',   dot: 'bg-clay-500' },
};

export const MEETING_STATUS_META: Record<MeetingStatus, Meta> = {
  Scheduled:   { label: 'Scheduled',   chip: 'bg-steel-100 text-steel-700',  dot: 'bg-steel-500' },
  Confirmed:   { label: 'Confirmed',   chip: 'bg-pine-100 text-pine-700',    dot: 'bg-pine-600' },
  Rescheduled: { label: 'Rescheduled', chip: 'bg-brass-100 text-brass-700',  dot: 'bg-brass-500' },
  Cancelled:   { label: 'Cancelled',   chip: 'bg-clay-100 text-clay-700',    dot: 'bg-clay-500' },
  Completed:   { label: 'Completed',   chip: 'bg-moss-100 text-moss-700',    dot: 'bg-moss-600' },
};

export const RESPONSE_META: Record<ResponseOption, Meta> = {
  Accepted:    { label: 'Accepted',    chip: 'bg-moss-100 text-moss-700',    dot: 'bg-moss-600' },
  Declined:    { label: 'Declined',    chip: 'bg-clay-100 text-clay-700',    dot: 'bg-clay-500' },
  Delegated:   { label: 'Delegated',   chip: 'bg-steel-100 text-steel-700',  dot: 'bg-steel-600' },
  Pending:     { label: 'Pending',     chip: 'bg-brass-100 text-brass-700',  dot: 'bg-brass-500' },
  Rescheduled: { label: 'Rescheduled', chip: 'bg-brass-100 text-brass-700',  dot: 'bg-brass-500' },
};

export const PRIORITY_META: Record<Priority, Meta> = {
  Routine:   { label: 'Routine',   chip: 'bg-line-soft text-ink-soft',    dot: 'bg-ink-faint' },
  Important: { label: 'Important', chip: 'bg-steel-100 text-steel-700',   dot: 'bg-steel-600' },
  Urgent:    { label: 'Urgent',    chip: 'bg-clay-100 text-clay-700',     dot: 'bg-clay-500' },
};

export const SECURITY_META: Record<SecurityLevel, Meta> = {
  Public:               { label: 'Public',               chip: 'bg-moss-100 text-moss-700',      dot: 'bg-moss-600' },
  Internal:             { label: 'Internal',             chip: 'bg-steel-100 text-steel-700',    dot: 'bg-steel-500' },
  Confidential:         { label: 'Confidential',         chip: 'bg-brass-100 text-brass-700',    dot: 'bg-brass-600' },
  'Highly Confidential':{ label: 'Highly Confidential',  chip: 'bg-clay-100 text-clay-700',      dot: 'bg-clay-500' },
};

export const DOC_STATUS_META: Record<DocumentRecord['status'], Meta> = {
  Draft:       { label: 'Draft',       chip: 'bg-steel-100 text-steel-700',  dot: 'bg-steel-500' },
  'In Review': { label: 'In Review',   chip: 'bg-brass-100 text-brass-700',  dot: 'bg-brass-500' },
  Approved:    { label: 'Approved',    chip: 'bg-moss-100 text-moss-700',    dot: 'bg-moss-600' },
  Circulated:  { label: 'Circulated',  chip: 'bg-pine-100 text-pine-700',    dot: 'bg-pine-600' },
  Archived:    { label: 'Archived',    chip: 'bg-line-soft text-ink-faint',  dot: 'bg-ink-faint' },
};

export const APPROVAL_META: Record<ApprovalState, Meta> = {
  Pending:             { label: 'Pending',             chip: 'bg-brass-100 text-brass-700', dot: 'bg-brass-500' },
  Approved:            { label: 'Approved',            chip: 'bg-moss-100 text-moss-700',   dot: 'bg-moss-600' },
  Rejected:            { label: 'Rejected',            chip: 'bg-clay-100 text-clay-700',   dot: 'bg-clay-500' },
  'Changes Requested': { label: 'Changes Requested',   chip: 'bg-steel-100 text-steel-700', dot: 'bg-steel-600' },
};

export const ROLE_META: Record<Role, string> = {
  'Super Admin': 'bg-clay-100 text-clay-700',
  'Organisation Admin': 'bg-pine-100 text-pine-700',
  Executive: 'bg-brass-100 text-brass-700',
  Secretary: 'bg-steel-100 text-steel-700',
  'Records Officer': 'bg-moss-100 text-moss-700',
  'Department Head': 'bg-pine-100 text-pine-700',
  Staff: 'bg-line-soft text-ink-soft',
  Viewer: 'bg-line-soft text-ink-faint',
};
