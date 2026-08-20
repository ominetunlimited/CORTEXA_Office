import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type {
  DB, Route, User, Organisation, Department, Correspondence, DocumentRecord, Matter,
  Meeting, TaskItem, ApprovalRecord, Contact, NotificationItem, AuditEntry, CommentItem,
  EmailRecord, Role, SecurityLevel, CorrStatus, TaskStatus, ResponseOption, DocCategory,
  Priority, MatterEvent, ApprovalState, SessionInfo, PendingSignup, OrgType,
  FinanceTxn, BudgetLine, Vendor, Invoice, Announcement, Asset, FeatureFlags, OrgBrand, FlagKey,
} from './types';
import { buildSeed, SEED_VERSION } from './seed';
import { uid, daysUntil, pad, d, dateOnly } from './utils';
import {
  hashSecret, verifySecret, checkPassword, isValidEmail, normalizeEmail,
  generateOtp, otpExpiresAt, OTP_RULES, lockoutAfterFailures, deviceLabel,
  SESSION_IDLE_MS, SESSION_ABS_MS, sanitizeFilename, storageKey,
} from './security';

const LS_KEY = `cortexa.db.v${SEED_VERSION}`;

/* ── permission model ─────────────────────────────────────────────────── */

export type Capability =
  | 'register' | 'create' | 'assign' | 'approve' | 'archive'
  | 'manageUsers' | 'manageOrg' | 'viewAudit' | 'manageDept' | 'respond'
  | 'finance' | 'announce';

const CAPS: Record<Role, Capability[]> = {
  'Super Admin': ['register', 'create', 'assign', 'approve', 'archive', 'manageUsers', 'manageOrg', 'viewAudit', 'manageDept', 'respond', 'finance', 'announce'],
  'Organisation Admin': ['register', 'create', 'assign', 'approve', 'archive', 'manageUsers', 'manageOrg', 'viewAudit', 'manageDept', 'respond', 'finance', 'announce'],
  Executive: ['register', 'create', 'assign', 'approve', 'archive', 'respond', 'finance', 'announce'],
  Secretary: ['register', 'create', 'assign', 'respond'],
  'Records Officer': ['register', 'create', 'archive', 'respond'],
  'Department Head': ['register', 'create', 'assign', 'approve', 'respond', 'finance'],
  Staff: ['create', 'respond'],
  Viewer: [],
};

export function can(role: Role | undefined, cap: Capability): boolean {
  if (!role) return false;
  return CAPS[role]?.includes(cap) ?? false;
}

const CLEARANCE: Record<Role, number> = {
  'Super Admin': 3, 'Organisation Admin': 3, Executive: 3,
  Secretary: 2, 'Records Officer': 2, 'Department Head': 2,
  Staff: 1, Viewer: 1,
};

export function secRank(level: SecurityLevel): number {
  return ['Public', 'Internal', 'Confidential', 'Highly Confidential'].indexOf(level);
}

export function canSee(user: User | null, level: SecurityLevel): boolean {
  if (!user) return false;
  return secRank(level) <= CLEARANCE[user.role];
}

/* ── context ──────────────────────────────────────────────────────────── */

export interface Toast { id: string; msg: string; kind: 'success' | 'error' | 'info' }

export interface SearchResults {
  correspondence: Correspondence[];
  documents: DocumentRecord[];
  matters: Matter[];
  meetings: Meeting[];
  tasks: TaskItem[];
  contacts: Contact[];
}

interface StoreCtx {
  db: DB;
  me: User | null;
  org: Organisation | null;
  departments: Department[];
  users: User[];
  route: Route;
  nav: (r: Route) => void;
  /* auth & security */
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; lockedS?: number }>;
  demoLogin: (userId: string) => void;
  logout: (reason?: string) => void;
  registerSignup: (input: { firstName: string; lastName: string; orgName: string; orgType: OrgType; country: string; email: string; password: string }) => { ok: boolean; error?: string; field?: string };
  resendCode: (email: string) => { ok: boolean; error?: string; waitS?: number };
  verifyEmail: (email: string, code: string) => { ok: boolean; error?: string; expired?: boolean; attemptsLeft?: number };
  changeSignupEmail: (oldEmail: string, newEmail: string) => { ok: boolean; error?: string };
  demoMailFor: (email: string) => { code: string; sentAt: number } | null;
  completeSetup: (input: { address: string; phone: string; logoInitials: string; refPrefix: string; departments: { name: string; code: string }[]; inviteEmails: string[] }) => { ok: boolean; error?: string };
  changePassword: (current: string, next: string) => { ok: boolean; error?: string };
  updateProfile: (patch: Partial<Pick<User, 'name' | 'title' | 'phone' | 'country'>>) => void;
  mySessions: SessionInfo[];
  revokeSession: (id: string) => void;
  revokeOtherSessions: () => void;
  touchSession: () => void;
  securityLog: AuditEntry[];
  logEvent: (action: string, recordType: string, target: string) => void;
  toasts: Toast[];
  toast: (msg: string, kind?: Toast['kind']) => void;
  dismissToast: (id: string) => void;
  nextRef: (kind: string, deptCode: string) => string;
  canUser: (cap: Capability) => boolean;
  searchAll: (q: string) => SearchResults;
  askAssistant: (q: string) => { answer: string; links: { label: string; route: Route }[] };
  /* mutations */
  registerCorrespondence: (input: Partial<Correspondence> & Pick<Correspondence, 'direction' | 'subject' | 'type'>) => Correspondence | null;
  updateCorrespondence: (id: string, patch: Partial<Correspondence>, label?: string, notifyUserId?: string, notifyMsg?: string) => void;
  respondCorrespondence: (id: string, fields: { subject: string; recipient: string; recipientOrg?: string; method: Correspondence['dispatchMethod']; notes?: string }) => Correspondence | null;
  addDocument: (input: Partial<DocumentRecord> & Pick<DocumentRecord, 'title' | 'category' | 'fileName'>) => DocumentRecord | null;
  addDocumentVersion: (docId: string, input: { fileName?: string; sizeKb?: number; note: string; body?: string }) => void;
  updateDocument: (id: string, patch: Partial<DocumentRecord>, label?: string) => void;
  restoreVersion: (docId: string, version: string) => void;
  addComment: (targetType: CommentItem['targetType'], targetId: string, text: string) => void;
  createMatter: (input: Partial<Matter> & Pick<Matter, 'title'>) => Matter | null;
  updateMatter: (id: string, patch: Partial<Matter>, label?: string) => void;
  linkToMatter: (recordType: 'correspondence' | 'document' | 'meeting' | 'task', recordId: string, matterId: string) => void;
  createMeeting: (input: Partial<Meeting> & Pick<Meeting, 'title' | 'date' | 'startTime' | 'endTime' | 'venue'>) => Meeting | null;
  updateMeeting: (id: string, patch: Partial<Meeting>, label?: string) => void;
  setMeetingResponse: (id: string, response: ResponseOption) => void;
  completeMeeting: (id: string, minutes: { title: string; body: string }) => void;
  createTask: (input: Partial<TaskItem> & Pick<TaskItem, 'title'>) => TaskItem | null;
  updateTask: (id: string, patch: Partial<TaskItem>, label?: string) => void;
  decideApproval: (approvalId: string, decision: Exclude<ApprovalState, 'Pending'>, comment?: string) => void;
  createMemo: (input: { to: string; subject: string; body: string; departmentId?: string; security: SecurityLevel }) => DocumentRecord | null;
  registerEmail: (emailId: string, input: { departmentId?: string; assignedTo?: string; priority: Priority; responseDeadline?: string }) => void;
  archiveRecord: (kind: 'correspondence' | 'document' | 'matter' | 'meeting' | 'task', id: string) => void;
  restoreRecord: (kind: 'correspondence' | 'document' | 'matter' | 'meeting' | 'task', id: string) => void;
  addContact: (input: Omit<Contact, 'id' | 'orgId'>) => void;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  addDepartment: (input: Omit<Department, 'id' | 'orgId'>) => { ok: boolean; error?: string };
  updateDepartment: (id: string, patch: Partial<Department>) => void;
  addUser: (input: Omit<User, 'id' | 'orgId' | 'initials' | 'color' | 'pwdHash' | 'emailVerified' | 'pwdChangedAt' | 'aiEnabled' | 'photo'>) => { ok: boolean; error?: string };
  updateUser: (id: string, patch: Partial<User>) => void;
  updateOrg: (patch: Partial<Organisation>) => void;
  setNotificationPrefs: (prefs: Organisation['notificationPrefs']) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  resetDemo: () => void;
  /* finance & operations */
  addFinanceTxn: (input: Partial<FinanceTxn> & Pick<FinanceTxn, 'kind' | 'party' | 'description' | 'amount' | 'category'>) => FinanceTxn | null;
  setFinanceStatus: (id: string, status: FinanceTxn['status']) => void;
  addBudgetLine: (input: Omit<BudgetLine, 'id' | 'orgId'>) => void;
  addVendor: (input: Omit<Vendor, 'id' | 'orgId' | 'createdAt'>) => void;
  updateVendor: (id: string, patch: Partial<Vendor>) => void;
  addInvoice: (input: Omit<Invoice, 'id' | 'orgId' | 'ref' | 'createdAt'>) => Invoice | null;
  setInvoiceStatus: (id: string, status: Invoice['status']) => void;
  addAnnouncement: (input: Omit<Announcement, 'id' | 'orgId' | 'createdBy' | 'createdAt'>) => void;
  addAsset: (input: Omit<Asset, 'id' | 'orgId' | 'assetCode' | 'createdAt'> & { assetCode?: string }) => void;
  setAssetStatus: (id: string, status: Asset['status'], assignedToId?: string) => void;
  fmtMoney: (amount: number) => string;
  budgetSpent: (budgetId: string) => number;
  pettyCashBalance: () => number;
  /* AI seats & feature flags & brand */
  setUserAI: (userId: string, enabled: boolean) => void;
  aiSeatsUsed: number;
  setFlags: (patch: Partial<FeatureFlags>) => void;
  setBrand: (patch: Partial<OrgBrand> & { website?: string; logoUrl?: string; currency?: Organisation['currency'] }) => void;
  setProfilePhoto: (dataUrl: string | undefined) => void;
  flag: (k: FlagKey) => boolean;
  myAI: boolean;
}

const Ctx = createContext<StoreCtx | null>(null);

export function useStore(): StoreCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('Store missing');
  return v;
}

/* ── persistence ──────────────────────────────────────────────────────── */

function loadDb(): DB {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed && parsed.version === SEED_VERSION) return parsed;
    }
  } catch { /* corrupted — reseed */ }
  return buildSeed();
}

/* ── provider ─────────────────────────────────────────────────────────── */

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(loadDb);
  const [route, setRoute] = useState<Route>({ name: 'dashboard' });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dbRef = React.useRef(db);
  dbRef.current = db;

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch { /* storage full */ }
  }, [db]);

  const me = useMemo(() => db.users.find((u) => u.id === db.session.userId) ?? null, [db]);
  const org = useMemo(() => (me ? db.orgs.find((o) => o.id === me.orgId) ?? null : null), [db, me]);
  const departments = useMemo(() => db.departments.filter((x) => x.orgId === me?.orgId), [db, me]);
  const users = useMemo(() => db.users.filter((x) => x.orgId === me?.orgId), [db, me]);

  const toast = useCallback((msg: string, kind: Toast['kind'] = 'success') => {
    const id = uid('t');
    setToasts((t) => [...t.slice(-3), { id, msg, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  const dismissToast = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const mutate = useCallback((fn: (d: DB) => void) => {
    /* synchronous clone-mutate-commit so callers can read created records immediately */
    const next = structuredClone(dbRef.current);
    fn(next);
    dbRef.current = next;
    setDb(next);
  }, []);

  /* scoped helpers operating on the draft db */
  const audit = (d: DB, action: string, recordType: string, target: string, recordId?: string) => {
    const u = d.users.find((x) => x.id === d.session.userId);
    d.audit.unshift({
      id: uid('au'), orgId: u?.orgId ?? '', at: new Date().toISOString(),
      userId: u?.id ?? 'system', userName: u?.name ?? 'System',
      action, recordType, target, recordId, result: 'success',
    });
    if (d.audit.length > 600) d.audit.length = 600;
  };

  const notify = (d: DB, userId: string | undefined, category: NotificationItem['category'], title: string, body: string, link?: Route) => {
    if (!userId || !me) return;
    d.notifications.unshift({ id: uid('nt'), orgId: me.orgId, userId, category, title, body, at: new Date().toISOString(), read: false, link });
  };

  const matterEvent = (d: DB, matterId: string | undefined, text: string, kind: MatterEvent['kind']) => {
    if (!matterId) return;
    const m = d.matters.find((x) => x.id === matterId);
    if (!m) return;
    m.events.push({ id: uid('ev'), at: new Date().toISOString(), text, kind });
    m.updatedAt = new Date().toISOString();
  };

  const refNext = (d: DB, kind: string, deptCode: string): string => {
    const year = new Date().getFullYear();
    const key = `${me?.orgId}:${kind}:${deptCode}:${year}`;
    const n = (d.counters[key] || 0) + 1;
    d.counters[key] = n;
    return `${org?.refPrefix ?? 'ORG'}/${deptCode}/${year}/${pad(n)}`;
  };

  const nextRef = useCallback((kind: string, deptCode: string) => {
    const year = new Date().getFullYear();
    const key = `${me?.orgId}:${kind}:${deptCode}:${year}`;
    return `${org?.refPrefix ?? 'ORG'}/${deptCode}/${year}/${pad((db.counters[key] || 0) + 1)}`;
  }, [db, me, org]);

  const nav = useCallback((r: Route) => {
    setRoute(r);
    window.scrollTo({ top: 0 });
  }, []);

  const canUser = useCallback((cap: Capability) => can(me?.role, cap), [me]);

  /* org-scoped record lookup — the IDOR boundary. No mutation may touch a
     record unless it belongs to the caller's organisation. */
  const own = <T extends { id: string; orgId: string }>(d: DB, list: T[], id: string | undefined): T | undefined =>
    id ? list.find((x) => x.id === id && x.orgId === me?.orgId) : undefined;

  /* failed cross-tenant / forged-id access attempts are security events */
  const logDenied = (recordType: string, id: string) => {
    mutate((dd) => { secAudit(dd, `Denied access to ${recordType} (outside organisation)`, id, 'denied', me); });
    toast('That record is not in your organisation\u2019s register.', 'error');
  };

  const secAudit = (d: DB, action: string, target: string, result: 'success' | 'denied', user?: User | null) => {
    d.audit.unshift({
      id: uid('au'), orgId: user?.orgId ?? d.orgs[0]?.id ?? '', at: new Date().toISOString(),
      userId: user?.id ?? 'unknown', userName: user?.name ?? 'Unknown',
      action, recordType: 'security', target, result,
    });
    if (d.audit.length > 600) d.audit.length = 600;
  };

  const issueOtp = (d: DB, email: string, purpose: 'signup' | 'reset', signupId?: string): string => {
    const code = generateOtp();
    d.security.otp[email] = {
      hash: hashSecret(code, `otp::${email}`), email, expiresAt: otpExpiresAt(),
      attempts: 0, resends: (d.security.otp[email]?.resends ?? 0), lastSentAt: Date.now(),
      purpose, signupId,
    };
    d.security.lastCodeEcho[email] = code; // demo mail-relay outbox only — production: SMTP provider sees this, never the client
    return code;
  };

  const createSession = (d: DB, userId: string): string => {
    const sid = uid('sess');
    d.sessions.unshift({ id: sid, userId, createdAt: Date.now(), lastSeen: Date.now(), device: deviceLabel(), ip: '105.112.34.18' });
    if (d.sessions.length > 40) d.sessions.length = 40;
    d.session.userId = userId;
    d.session.sessionId = sid;
    return sid;
  };

  /* ── auth ── */

  const login = useCallback(async (email: string, password: string) => {
    const em = normalizeEmail(email);
    if (!isValidEmail(em)) return { ok: false, error: 'Enter a valid email address.' };
    /* progressive lockout check */
    const pre = lockoutAfterFailures(db.security.loginAttempts[em]);
    if (pre.locked && (db.security.loginAttempts[em]?.lockedUntil ?? 0) > Date.now()) {
      return { ok: false, error: `Too many failed attempts. Try again in ${pre.waitS}s.`, lockedS: pre.waitS };
    }
    await new Promise((r) => setTimeout(r, 550)); // deliberate server-like latency + timing equalisation
    const u = db.users.find((x) => x.email.toLowerCase() === em && x.active);
    const hashOk = !!u && verifySecret(password, u.pwdHash ?? hashSecret('cortexa'));
    if (!u || !hashOk) {
      mutate((dd) => {
        const res = lockoutAfterFailures(dd.security.loginAttempts[em]);
        dd.security.loginAttempts[em] = res.next;
        secAudit(dd, res.locked ? `Sign-in locked for ${res.waitS}s after repeated failures` : 'Failed sign-in attempt (invalid credentials)', em, 'denied', u);
      });
      const st = db.security.loginAttempts[em];
      const fails = (st?.count ?? 0) + 1;
      if (fails >= 5) return { ok: false, error: 'Too many failed attempts. The account is temporarily locked.', lockedS: 30 };
      return { ok: false, error: 'Incorrect email or password. Demo accounts use the password shown on this screen.' };
    }
    if (!u.emailVerified) return { ok: false, error: 'This email address has not been verified yet. Complete verification to activate the account.' };
    mutate((dd) => {
      dd.security.loginAttempts[em] = { count: 0, lockedUntil: 0 };
      createSession(dd, u.id);
      secAudit(dd, 'User signed in', `${u.name} · ${deviceLabel()}`, 'success', u);
    });
    setRoute({ name: 'dashboard' });
    return { ok: true };
  }, [db, mutate]);

  /* documented development shortcut — still creates a real, revocable session */
  const demoLogin = useCallback((userId: string) => {
    const u = db.users.find((x) => x.id === userId);
    if (!u) return;
    mutate((dd) => {
      createSession(dd, u.id);
      secAudit(dd, 'User signed in (demo shortcut)', `${u.name} · ${deviceLabel()}`, 'success', u);
    });
    setRoute({ name: 'dashboard' });
    toast(`Signed in as ${u.name}`, 'info');
  }, [db, mutate, toast]);

  const logout = useCallback((reason?: string) => {
    mutate((dd) => {
      const sid = dd.session.sessionId;
      if (sid) dd.sessions = dd.sessions.filter((s) => s.id !== sid);
      secAudit(dd, reason ?? 'User signed out', `${me?.name ?? 'User'} · ${deviceLabel()}`, 'success', me);
      dd.session.userId = null;
      dd.session.sessionId = null;
    });
    if (reason) toast(reason, 'info');
  }, [mutate, me, toast]);

  /* ── signup, verification & onboarding ── */

  const registerSignup = useCallback((input: { firstName: string; lastName: string; orgName: string; orgType: OrgType; country: string; email: string; password: string }) => {
    const em = normalizeEmail(input.email);
    if (!isValidEmail(em)) return { ok: false, error: 'Enter a valid email address.', field: 'email' };
    if (db.users.some((u) => u.email.toLowerCase() === em)) return { ok: false, error: 'An account with this email already exists. Sign in instead.', field: 'email' };
    if (db.pendingSignups.some((p) => p.email === em)) return { ok: false, error: 'A verification for this email is already in progress — enter the code below.', field: 'email' };
    const pw = checkPassword(input.password);
    if (!pw.ok) return { ok: false, error: pw.reason ?? 'Choose a stronger password.', field: 'password' };
    mutate((dd) => {
      dd.pendingSignups.push({
        id: uid('su'), firstName: input.firstName.trim(), lastName: input.lastName.trim(),
        orgName: input.orgName.trim(), orgType: input.orgType, country: input.country,
        email: em, pwdHash: hashSecret(input.password), termsAcceptedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      issueOtp(dd, em, 'signup', dd.pendingSignups[dd.pendingSignups.length - 1].id);
      secAudit(dd, 'Verification code issued (signup)', em, 'success');
    });
    return { ok: true };
  }, [db, mutate]);

  const resendCode = useCallback((email: string) => {
    const em = normalizeEmail(email);
    const rec = db.security.otp[em];
    const pending = db.pendingSignups.find((p) => p.email === em);
    if (!rec || !pending) return { ok: false, error: 'No verification in progress for this address.' };
    const waitMs = rec.lastSentAt + OTP_RULES.resendCooldownMs - Date.now();
    if (waitMs > 0) return { ok: false, error: `Wait ${Math.ceil(waitMs / 1000)}s before requesting another code.`, waitS: Math.ceil(waitMs / 1000) };
    if (rec.resends >= OTP_RULES.maxResends) return { ok: false, error: 'Resend limit reached for this address. Try again later.' };
    mutate((dd) => {
      const r = dd.security.otp[em];
      if (r) r.resends += 1;
      issueOtp(dd, em, 'signup', pending.id);
      dd.security.otp[em].resends = (rec.resends + 1);
      secAudit(dd, 'Verification code re-issued', em, 'success');
    });
    return { ok: true };
  }, [db, mutate]);

  const verifyEmail = useCallback((email: string, code: string) => {
    const em = normalizeEmail(email);
    const rec = db.security.otp[em];
    if (!rec) return { ok: false, error: 'No verification in progress for this address.' };
    if (Date.now() > rec.expiresAt) return { ok: false, error: 'Code expired', expired: true };
    if (rec.attempts >= OTP_RULES.maxAttempts) return { ok: false, error: 'Too many incorrect attempts. Request a new code.', expired: true };
    if (!verifySecret(code, rec.hash, `otp::${em}`)) {
      mutate((dd) => {
        const r = dd.security.otp[em];
        if (r) r.attempts += 1;
        secAudit(dd, 'Incorrect verification code entered', em, 'denied');
      });
      const left = OTP_RULES.maxAttempts - (rec.attempts + 1);
      return { ok: false, error: 'That code is incorrect. Please check your email and try again.', attemptsLeft: Math.max(0, left) };
    }
    /* success — provision organisation + admin, single-use invalidation */
    let adminId = '';
    mutate((dd) => {
      const su = dd.pendingSignups.find((p) => p.email === em);
      delete dd.security.otp[em];
      delete dd.security.lastCodeEcho[em];
      if (!su) return;
      const oid = uid('org');
      dd.orgs.push({
        id: oid, name: su.orgName, type: su.orgType, logoInitials: su.orgName.slice(0, 2).toUpperCase(),
        address: '', email: em, phone: '', country: su.country, refPrefix: su.orgName.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X'),
        approvalChain: ['Department Head', 'Executive', 'Organisation Admin'],
        notificationPrefs: [
          { category: 'Meetings', inApp: true, email: true, browser: false },
          { category: 'Tasks', inApp: true, email: true, browser: false },
          { category: 'Approvals', inApp: true, email: true, browser: false },
          { category: 'Correspondence', inApp: true, email: false, browser: false },
          { category: 'Deadlines', inApp: true, email: true, browser: false },
          { category: 'System', inApp: true, email: false, browser: false },
        ],
        setupComplete: false,
        currency: { code: 'USD', symbol: '$' },
        brand: { primary: '#146355', secondary: '#9C6B1E' },
        flags: { finance: true, assets: true, announcements: true, deadlines: true, ai: true, hr: false, procurement: true, projects: false, board: false },
        aiSeats: 100,
        pettyCashOpening: 0,
        budgetAlertPct: [70, 80, 90, 100],
        createdAt: new Date().toISOString(),
      });
      adminId = uid('u');
      const name = `${su.firstName} ${su.lastName}`;
      dd.users.push({
        id: adminId, orgId: oid, name, email: em, title: 'Administrator', role: 'Organisation Admin',
        active: true, initials: `${su.firstName[0] ?? ''}${su.lastName[0] ?? ''}`.toUpperCase(),
        color: '#146355', pwdHash: su.pwdHash, emailVerified: true, country: su.country,
        pwdChangedAt: new Date().toISOString(),
        aiEnabled: true,
      });
      dd.pendingSignups = dd.pendingSignups.filter((p) => p.email !== em);
      createSession(dd, adminId);
      secAudit(dd, 'Email verified — account activated', `${em} · ${name}`, 'success', dd.users[dd.users.length - 1]);
    });
    setRoute({ name: 'dashboard' });
    toast('Email verified — account activated');
    return { ok: true };
  }, [db, mutate, toast]);

  const changeSignupEmail = useCallback((oldEmail: string, newEmail: string) => {
    const oe = normalizeEmail(oldEmail);
    const ne = normalizeEmail(newEmail);
    if (!isValidEmail(ne)) return { ok: false, error: 'Enter a valid email address.' };
    if (db.users.some((u) => u.email.toLowerCase() === ne)) return { ok: false, error: 'An account with this email already exists.' };
    mutate((dd) => {
      const su = dd.pendingSignups.find((p) => p.email === oe);
      if (!su) return;
      su.email = ne;
      delete dd.security.otp[oe];
      delete dd.security.lastCodeEcho[oe];
      issueOtp(dd, ne, 'signup', su.id);
      secAudit(dd, 'Signup email changed & code re-issued', `${oe} → ${ne}`, 'success');
    });
    return { ok: true };
  }, [db, mutate]);

  const demoMailFor = useCallback((email: string) => {
    const em = normalizeEmail(email);
    const code = db.security.lastCodeEcho[em];
    const rec = db.security.otp[em];
    if (!code || !rec) return null;
    return { code, sentAt: rec.lastSentAt };
  }, [db]);

  const completeSetup = useCallback((input: { address: string; phone: string; logoInitials: string; refPrefix: string; departments: { name: string; code: string }[]; inviteEmails: string[] }) => {
    if (!me) return { ok: false, error: 'Not signed in.' };
    const depCodes = new Set<string>();
    for (const dep of input.departments) {
      const c = dep.code.trim().toUpperCase();
      if (depCodes.has(c)) return { ok: false, error: `Duplicate department code "${c}".` };
      depCodes.add(c);
    }
    mutate((dd) => {
      const o = dd.orgs.find((x) => x.id === me.orgId);
      if (!o) return;
      o.address = input.address.trim();
      o.phone = input.phone.trim();
      o.logoInitials = (input.logoInitials || o.name.slice(0, 2)).toUpperCase().slice(0, 3);
      o.refPrefix = (input.refPrefix || 'ORG').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5) || 'ORG';
      o.setupComplete = true;
      const depIds: string[] = [];
      input.departments.forEach((dep) => {
        const did = uid('dep');
        depIds.push(did);
        dd.departments.push({ id: did, orgId: o.id, name: dep.name.trim(), code: dep.code.trim().toUpperCase(), description: '' });
      });
      const admin = dd.users.find((u) => u.id === me.id);
      if (admin && depIds[0]) admin.departmentId = depIds[0];
      const colors = ['#146355', '#9C6B1E', '#3E5C76', '#A8402C', '#2E7D4F'];
      input.inviteEmails.map(normalizeEmail).filter((em) => em && isValidEmail(em) && !dd.users.some((u) => u.orgId === o.id && u.email === em)).forEach((em, i) => {
        dd.users.push({
          id: uid('u'), orgId: o.id,
          name: em.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()),
          email: em, title: 'Staff', role: 'Staff', departmentId: depIds[i % Math.max(depIds.length, 1)],
          active: true, initials: em.slice(0, 2).toUpperCase(), color: colors[i % colors.length],
          pwdHash: hashSecret('cortexa'), emailVerified: false, pwdChangedAt: new Date().toISOString(),
          aiEnabled: false,
        });
      });
      audit(dd, 'Organisation setup completed', 'organisation', o.name, o.id);
      dd.notifications.unshift({ id: uid('nt'), orgId: o.id, userId: me.id, category: 'System', title: 'Workspace ready', body: `${o.name} is configured. Register your first correspondence to open the institutional register.`, at: new Date().toISOString(), read: false, link: { name: 'dashboard' } });
    });
    toast('Organisation configured — welcome to Cortexa');
    setRoute({ name: 'dashboard' });
    return { ok: true };
  }, [me, mutate, toast]);

  /* ── account security ── */

  const changePassword = useCallback((current: string, next: string) => {
    if (!me) return { ok: false, error: 'Not signed in.' };
    if (!verifySecret(current, me.pwdHash ?? hashSecret('cortexa'))) return { ok: false, error: 'Current password is incorrect.' };
    const pw = checkPassword(next);
    if (!pw.ok) return { ok: false, error: pw.reason ?? 'Choose a stronger password.' };
    mutate((dd) => {
      const u = dd.users.find((x) => x.id === me.id && x.orgId === me.orgId);
      if (!u) return;
      u.pwdHash = hashSecret(next);
      u.pwdChangedAt = new Date().toISOString();
      /* invalidate every other session on password change */
      const keep = dd.session.sessionId;
      dd.sessions = dd.sessions.filter((s) => s.id === keep);
      secAudit(dd, 'Password changed — other sessions revoked', `${u.name} · ${deviceLabel()}`, 'success', u);
      dd.notifications.unshift({ id: uid('nt'), orgId: u.orgId, userId: u.id, category: 'System', title: 'Security notice', body: 'Your password was changed and other active sessions were signed out.', at: new Date().toISOString(), read: false });
    });
    toast('Password changed — other sessions signed out');
    return { ok: true };
  }, [me, mutate, toast]);

  const updateProfile = useCallback((patch: Partial<Pick<User, 'name' | 'title' | 'phone' | 'country'>>) => {
    mutate((dd) => {
      const u = dd.users.find((x) => x.id === me?.id && x.orgId === me?.orgId);
      if (!u) return;
      Object.assign(u, patch);
      u.initials = u.name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
      audit(dd, 'Updated profile', 'user', u.name, u.id);
    });
    toast('Profile saved');
  }, [me, mutate, toast]);

  const mySessions = useMemo(
    () => db.sessions.filter((s) => s.userId === me?.id).sort((a, b) => b.lastSeen - a.lastSeen),
    [db.sessions, me],
  );

  const revokeSession = useCallback((id: string) => {
    mutate((dd) => {
      const s = dd.sessions.find((x) => x.id === id && x.userId === me?.id);
      if (!s) return;
      dd.sessions = dd.sessions.filter((x) => x.id !== id);
      secAudit(dd, 'Session revoked', `${s.device} · ${s.ip}`, 'success', me);
    });
    toast('Session revoked', 'info');
  }, [me, mutate, toast]);

  const revokeOtherSessions = useCallback(() => {
    mutate((dd) => {
      const keep = dd.session.sessionId;
      const removed = dd.sessions.filter((s) => s.userId === me?.id && s.id !== keep).length;
      dd.sessions = dd.sessions.filter((s) => !(s.userId === me?.id && s.id !== keep));
      secAudit(dd, `Signed out ${removed} other session${removed === 1 ? '' : 's'}`, `${me?.name} · ${deviceLabel()}`, 'success', me);
    });
    toast('Signed out of all other sessions', 'info');
  }, [me, mutate, toast]);

  const touchSession = useCallback(() => {
    const sid = db.session.sessionId;
    if (!sid) return;
    const s = db.sessions.find((x) => x.id === sid);
    if (!s) return;
    if (Date.now() - s.lastSeen < 20000) return; // throttle writes
    mutate((dd) => {
      const cur = dd.sessions.find((x) => x.id === sid);
      if (cur) cur.lastSeen = Date.now();
    });
  }, [db, mutate]);

  const securityLog = useMemo(
    () => db.audit.filter((a) => a.recordType === 'security' && (!me || a.orgId === me.orgId || a.orgId === '')).slice(0, 30),
    [db.audit, me],
  );

  const logEvent = useCallback((action: string, recordType: string, target: string) => {
    mutate((dd) => { audit(dd, action, recordType, target); });
  }, [mutate]);

  /* ── correspondence ── */

  const registerCorrespondence = useCallback((input: Partial<Correspondence> & Pick<Correspondence, 'direction' | 'subject' | 'type'>) => {
    if (!canUser('register')) { toast('Your role cannot register correspondence.', 'error'); return null; }
    let created: Correspondence | null = null;
    mutate((dd) => {
      const dept = dd.departments.find((x) => x.id === input.departmentId);
      const code = input.direction === 'outgoing' ? 'OUT' : dept?.code ?? 'ADM';
      const kind = input.direction === 'outgoing' ? 'OUT' : 'IN';
      const c: Correspondence = {
        id: uid('cr'), orgId: me!.orgId, ref: refNext(dd, kind, code),
        direction: input.direction, dateReceived: new Date().toISOString(),
        recipient: input.recipient ?? 'The Secretariat', subject: input.subject, type: input.type,
        priority: input.priority ?? 'Routine', security: input.security ?? 'Internal',
        status: input.status ?? (input.direction === 'incoming' ? 'Registered' : 'Draft' as CorrStatus),
        responseRequired: input.responseRequired ?? false, notes: input.notes ?? '',
        attachments: input.attachments ?? [], departmentId: input.departmentId,
        externalRef: input.externalRef, dateOfLetter: input.dateOfLetter ?? new Date().toISOString(),
        sender: input.sender, senderOrg: input.senderOrg, assignedTo: input.assignedTo,
        responseDeadline: input.responseDeadline, responseStatus: input.type === 'Invitation' ? input.responseStatus ?? 'Pending' : undefined,
        matterId: input.matterId, dispatchMethod: input.dispatchMethod, dispatchDate: input.dispatchDate,
        deliveryStatus: input.deliveryStatus ?? (input.direction === 'outgoing' ? 'Draft' : undefined),
        authorId: input.authorId ?? me!.id, approverId: input.approverId, relatedCorrId: input.relatedCorrId,
        ocrText: input.ocrText, archived: false,
      } as Correspondence;
      if (input.direction === 'incoming' && (c.status as string) === 'Draft') c.status = 'Registered';
      dd.correspondence.unshift(c);
      created = c;
      audit(dd, input.direction === 'incoming' ? 'Registered incoming correspondence' : 'Created outgoing correspondence', 'correspondence', c.subject, c.id);
      if (c.assignedTo && c.assignedTo !== me!.id) {
        notify(dd, c.assignedTo, 'Correspondence', 'Correspondence assigned to you', `${c.ref} — ${c.subject}`, { name: 'correspondence', id: c.id });
      }
      if (input.matterId) matterEvent(dd, input.matterId, `${input.direction === 'incoming' ? 'Correspondence received' : 'Outgoing correspondence'} — ${c.subject}`, 'correspondence');
    });
    if (created) toast(`${(created as Correspondence).ref} registered`);
    return created;
  }, [canUser, mutate, me, toast]);

  const updateCorrespondence = useCallback((id: string, patch: Partial<Correspondence>, label = 'Updated correspondence', notifyUserId?: string, notifyMsg?: string) => {
    if (!own(db, db.correspondence, id)) { logDenied('correspondence', id); return; }
    mutate((dd) => {
      const c = own(dd, dd.correspondence, id);
      if (!c) return;
      Object.assign(c, patch);
      audit(dd, label, 'correspondence', c.subject, c.id);
      if (notifyUserId && notifyMsg) notify(dd, notifyUserId, 'Correspondence', label, notifyMsg, { name: 'correspondence', id });
    });
  }, [mutate]);

  const respondCorrespondence = useCallback((id: string, fields: { subject: string; recipient: string; recipientOrg?: string; method: Correspondence['dispatchMethod']; notes?: string }) => {
    if (!canUser('respond')) { toast('Your role cannot dispatch responses.', 'error'); return null; }
    let out: Correspondence | null = null;
    if (!own(db, db.correspondence, id)) { logDenied('correspondence', id); return null; }
    mutate((dd) => {
      const src = own(dd, dd.correspondence, id);
      if (!src) return;
      const c: Correspondence = {
        id: uid('cr'), orgId: me!.orgId, ref: refNext(dd, 'OUT', 'OUT'),
        direction: 'outgoing', dateReceived: new Date().toISOString(), dateOfLetter: new Date().toISOString(),
        recipient: fields.recipient, recipientOrg: fields.recipientOrg, subject: fields.subject,
        type: src.type === 'Invitation' ? 'Letter' : src.type, departmentId: src.departmentId,
        authorId: me!.id, approverId: me!.id, priority: src.priority, security: src.security,
        responseRequired: false, status: 'Responded', notes: fields.notes ?? '',
        attachments: [], relatedCorrId: src.id, matterId: src.matterId,
        dispatchMethod: fields.method, dispatchDate: new Date().toISOString(), deliveryStatus: 'Dispatched', archived: false,
      };
      dd.correspondence.unshift(c);
      src.status = 'Responded';
      out = c;
      audit(dd, 'Dispatched response', 'correspondence', `${c.ref} in reply to ${src.ref}`, c.id);
      if (src.matterId) matterEvent(dd, src.matterId, `Response dispatched — ${fields.subject}`, 'correspondence');
    });
    if (out) toast(`Response ${ (out as Correspondence).ref } dispatched`);
    return out;
  }, [canUser, mutate, me, toast]);

  /* ── documents ── */

  const addDocument = useCallback((input: Partial<DocumentRecord> & Pick<DocumentRecord, 'title' | 'category' | 'fileName'>) => {
    if (!canUser('create')) { toast('Your role is read-only.', 'error'); return null; }
    /* server-layer upload validation — never trust the client-supplied filename */
    const safeName = sanitizeFilename(input.fileName);
    const ext = (safeName.split('.').pop() ?? '').toLowerCase();
    const ALLOWED = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'tiff', 'tif', 'txt', 'csv'];
    if (!ALLOWED.includes(ext)) { toast(`"${ext || 'unknown'}" files are not accepted by the records vault.`, 'error'); return null; }
    if ((input.sizeKb ?? 0) > 15 * 1024) { toast('File exceeds the 15 MB institutional upload limit.', 'error'); return null; }
    let created: DocumentRecord | null = null;
    mutate((dd) => {
      const dept = dd.departments.find((x) => x.id === input.departmentId && x.orgId === me!.orgId);
      const rec: DocumentRecord = {
        id: uid('doc'), orgId: me!.orgId, fileNumber: refNext(dd, 'DOC', dept?.code ?? 'GEN'),
        title: input.title, category: input.category, departmentId: input.departmentId,
        ownerId: me!.id, security: input.security ?? 'Internal',
        status: input.status ?? (input.category === 'Memo' ? 'Draft' : 'Approved'),
        fileName: safeName, storageKey: storageKey(me!.orgId, ext),
        sizeKb: input.sizeKb ?? 240, mime: input.mime ?? 'application/pdf',
        versions: [{ version: '1.0', authorId: me!.id, at: new Date().toISOString(), note: input.versions?.[0]?.note ?? 'Registered copy', fileName: input.fileName, sizeKb: input.sizeKb ?? 240 }],
        body: input.body, ocr: input.ocr ?? false, matterId: input.matterId,
        retention: 'Active', archived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      dd.documents.unshift(rec);
      created = rec;
      audit(dd, input.ocr ? 'Uploaded scanned document (OCR indexed)' : 'Uploaded document', 'document', rec.title, rec.id);
      if (input.matterId) matterEvent(dd, input.matterId, `Document uploaded — ${rec.title}`, 'document');
    });
    if (created) toast(`${(created as DocumentRecord).fileNumber} · ${input.title} uploaded`);
    return created;
  }, [canUser, mutate, me, toast]);

  const addDocumentVersion = useCallback((docId: string, input: { fileName?: string; sizeKb?: number; note: string; body?: string }) => {
    if (!own(db, db.documents, docId)) { logDenied('document', docId); return; }
    mutate((dd) => {
      const rec = own(dd, dd.documents, docId);
      if (!rec) return;
      const last = rec.versions[rec.versions.length - 1];
      const nv = (parseFloat(last.version) + 0.1).toFixed(1);
      rec.versions.push({ version: nv, authorId: me!.id, at: new Date().toISOString(), note: input.note, fileName: input.fileName ?? rec.fileName, sizeKb: input.sizeKb ?? rec.sizeKb });
      rec.fileName = input.fileName ?? rec.fileName;
      rec.sizeKb = input.sizeKb ?? rec.sizeKb;
      if (input.body) rec.body = input.body;
      rec.updatedAt = new Date().toISOString();
      if (rec.status === 'Draft') rec.status = 'In Review';
      audit(dd, `Uploaded new version (v${nv})`, 'document', rec.title, rec.id);
      if (rec.matterId) matterEvent(dd, rec.matterId, `New document version v${nv} — ${rec.title}`, 'document');
    });
    toast('New version recorded');
  }, [mutate, me, toast]);

  const updateDocument = useCallback((id: string, patch: Partial<DocumentRecord>, label = 'Updated document metadata') => {
    if (!own(db, db.documents, id)) { logDenied('document', id); return; }
    mutate((dd) => {
      const rec = own(dd, dd.documents, id);
      if (!rec) return;
      Object.assign(rec, patch, { updatedAt: new Date().toISOString() });
      audit(dd, label, 'document', rec.title, rec.id);
    });
  }, [mutate]);

  const restoreVersion = useCallback((docId: string, version: string) => {
    if (!own(db, db.documents, docId)) { logDenied('document', docId); return; }
    mutate((dd) => {
      const rec = own(dd, dd.documents, docId);
      if (!rec) return;
      const v = rec.versions.find((x) => x.version === version);
      if (!v) return;
      const nv = (parseFloat(rec.versions[rec.versions.length - 1].version) + 0.1).toFixed(1);
      rec.versions.push({ version: nv, authorId: me!.id, at: new Date().toISOString(), note: `Restored from v${version}`, fileName: v.fileName, sizeKb: v.sizeKb });
      rec.fileName = v.fileName;
      rec.updatedAt = new Date().toISOString();
      audit(dd, `Restored document to v${version}`, 'document', rec.title, rec.id);
    });
    toast(`Restored to version ${version}`);
  }, [mutate, me, toast]);

  const addComment = useCallback((targetType: CommentItem['targetType'], targetId: string, text: string) => {
    mutate((dd) => {
      dd.comments.unshift({ id: uid('cm'), orgId: me!.orgId, targetType, targetId, userId: me!.id, text, at: new Date().toISOString() });
      audit(dd, 'Added comment', targetType, text.slice(0, 60), targetId);
    });
  }, [mutate, me]);

  /* ── matters ── */

  const createMatter = useCallback((input: Partial<Matter> & Pick<Matter, 'title'>) => {
    if (!canUser('create')) { toast('Your role is read-only.', 'error'); return null; }
    let created: Matter | null = null;
    mutate((dd) => {
      const dept = dd.departments.find((x) => x.id === input.departmentId);
      const m: Matter = {
        id: uid('m'), orgId: me!.orgId, fileNumber: refNext(dd, 'FILE', dept?.code ?? 'ADM'),
        title: input.title, description: input.description ?? '', category: input.category ?? 'General',
        departmentId: input.departmentId, ownerId: me!.id, status: 'Active',
        security: input.security ?? 'Internal', retention: 'Active',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        events: [{ id: uid('ev'), at: new Date().toISOString(), text: 'Matter opened', kind: 'note' }],
      };
      dd.matters.unshift(m);
      created = m;
      audit(dd, 'Created matter', 'matter', m.title, m.id);
    });
    if (created) toast(`Matter ${(created as Matter).fileNumber} opened`);
    return created;
  }, [canUser, mutate, me, toast]);

  const updateMatter = useCallback((id: string, patch: Partial<Matter>, label = 'Updated matter') => {
    if (!own(db, db.matters, id)) { logDenied('matter', id); return; }
    mutate((dd) => {
      const m = own(dd, dd.matters, id);
      if (!m) return;
      Object.assign(m, patch, { updatedAt: new Date().toISOString() });
      audit(dd, label, 'matter', m.title, m.id);
    });
  }, [mutate]);

  const linkToMatter = useCallback((recordType: 'correspondence' | 'document' | 'meeting' | 'task', recordId: string, matterId: string) => {
    if (!own(db, db.matters, matterId)) { logDenied('matter', matterId); return; }
    mutate((dd) => {
      let title = '';
      if (recordType === 'correspondence') { const r = dd.correspondence.find((x) => x.id === recordId); if (r) { r.matterId = matterId; title = r.subject; } }
      if (recordType === 'document') { const r = dd.documents.find((x) => x.id === recordId); if (r) { r.matterId = matterId; title = r.title; } }
      if (recordType === 'meeting') { const r = dd.meetings.find((x) => x.id === recordId); if (r) { r.matterId = matterId; title = r.title; } }
      if (recordType === 'task') { const r = dd.tasks.find((x) => x.id === recordId); if (r) { r.relatedType = 'matter'; r.relatedId = matterId; title = r.title; } }
      const m = dd.matters.find((x) => x.id === matterId);
      audit(dd, `Linked ${recordType} to matter`, 'matter', `${title} → ${m?.title ?? ''}`, matterId);
      matterEvent(dd, matterId, `${recordType === 'document' ? 'Document' : recordType === 'meeting' ? 'Meeting' : recordType === 'task' ? 'Task' : 'Correspondence'} linked — ${title}`, recordType === 'correspondence' ? 'correspondence' : recordType);
    });
    toast('Linked to matter');
  }, [mutate, toast]);

  /* ── meetings ── */

  const createMeeting = useCallback((input: Partial<Meeting> & Pick<Meeting, 'title' | 'date' | 'startTime' | 'endTime' | 'venue'>) => {
    if (!canUser('create')) { toast('Your role is read-only.', 'error'); return null; }
    let created: Meeting | null = null;
    mutate((dd) => {
      const m: Meeting = {
        id: uid('mt'), orgId: me!.orgId, ref: refNext(dd, 'MTG', 'GEN'),
        title: input.title, date: input.date, startTime: input.startTime, endTime: input.endTime,
        venue: input.venue, virtualLink: input.virtualLink, organiserId: me!.id,
        participantIds: input.participantIds ?? [], externalOrgs: input.externalOrgs ?? [],
        description: input.description ?? '', agenda: input.agenda ?? [],
        status: input.status ?? 'Scheduled', isInvitation: input.isInvitation ?? false,
        response: input.response ?? 'Accepted', relatedCorrId: input.relatedCorrId, matterId: input.matterId, archived: false,
      };
      dd.meetings.unshift(m);
      created = m;
      audit(dd, 'Created meeting', 'meeting', m.title, m.id);
      m.participantIds.forEach((pid) => {
        if (pid !== me!.id) notify(dd, pid, 'Meetings', 'Meeting invitation', `${m.title} — ${m.date} at ${m.startTime}`, { name: 'meeting', id: m.id });
      });
      if (m.matterId) matterEvent(dd, m.matterId, `Meeting scheduled — ${m.title}`, 'meeting');
      if (m.relatedCorrId) {
        const c = dd.correspondence.find((x) => x.id === m.relatedCorrId);
        if (c) audit(dd, 'Linked meeting to correspondence', 'meeting', `${m.title} ↔ ${c.ref}`, m.id);
      }
    });
    if (created) toast('Meeting scheduled');
    return created;
  }, [canUser, mutate, me, toast]);

  const updateMeeting = useCallback((id: string, patch: Partial<Meeting>, label = 'Updated meeting') => {
    if (!own(db, db.meetings, id)) { logDenied('meeting', id); return; }
    mutate((dd) => {
      const m = own(dd, dd.meetings, id);
      if (!m) return;
      Object.assign(m, patch);
      audit(dd, label, 'meeting', m.title, m.id);
      if (patch.status === 'Rescheduled') m.participantIds.forEach((pid) => notify(dd, pid, 'Meetings', 'Meeting rescheduled', m.title, { name: 'meeting', id }));
    });
  }, [mutate]);

  const setMeetingResponse = useCallback((id: string, response: ResponseOption) => {
    if (!own(db, db.meetings, id)) { logDenied('meeting', id); return; }
    mutate((dd) => {
      const m = own(dd, dd.meetings, id);
      if (!m) return;
      m.response = response;
      if (response === 'Accepted') m.status = m.status === 'Scheduled' ? 'Confirmed' : m.status;
      if (response === 'Declined') m.status = 'Cancelled';
      audit(dd, `Responded to invitation: ${response}`, 'meeting', m.title, m.id);
      notify(dd, m.organiserId === me!.id ? undefined : m.organiserId, 'Meetings', `Invitation ${response.toLowerCase()}`, m.title, { name: 'meeting', id });
      if (m.matterId) matterEvent(dd, m.matterId, `Invitation ${response.toLowerCase()} — ${m.title}`, 'meeting');
    });
    toast(`Response recorded: ${response}`, 'info');
  }, [mutate, me, toast]);

  const completeMeeting = useCallback((id: string, minutes: { title: string; body: string }) => {
    if (!own(db, db.meetings, id)) { logDenied('meeting', id); return; }
    mutate((dd) => {
      const m = own(dd, dd.meetings, id);
      if (!m) return;
      m.status = 'Completed';
      const dept = dd.departments.find((x) => x.id === 'dep_adm');
      const rec: DocumentRecord = {
        id: uid('doc'), orgId: me!.orgId, fileNumber: refNext(dd, 'DOC', dept?.code ?? 'GEN'),
        title: minutes.title, category: 'Minutes', departmentId: dept?.id, ownerId: me!.id,
        security: 'Internal', status: 'Circulated', fileName: `${minutes.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`,
        sizeKb: 148, mime: 'application/pdf',
        versions: [{ version: '1.0', authorId: me!.id, at: new Date().toISOString(), note: 'Minutes from completed meeting', fileName: 'minutes.pdf', sizeKb: 148 }],
        body: minutes.body, ocr: false, matterId: m.matterId, retention: 'Active', archived: false,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      dd.documents.unshift(rec);
      m.minutesDocId = rec.id;
      audit(dd, 'Completed meeting & uploaded minutes', 'meeting', m.title, m.id);
      matterEvent(dd, m.matterId, `Meeting completed — minutes uploaded`, 'meeting');
    });
    toast('Meeting completed — minutes filed');
  }, [mutate, me, toast]);

  /* ── tasks ── */

  const createTask = useCallback((input: Partial<TaskItem> & Pick<TaskItem, 'title'>) => {
    if (!canUser('create')) { toast('Your role is read-only.', 'error'); return null; }
    let created: TaskItem | null = null;
    mutate((dd) => {
      const t: TaskItem = {
        id: uid('tsk'), orgId: me!.orgId, ref: refNext(dd, 'TSK', 'GEN'),
        title: input.title, description: input.description ?? '', assigneeId: input.assigneeId,
        createdById: me!.id, departmentId: input.departmentId, priority: input.priority ?? 'Routine',
        dueDate: input.dueDate, status: 'Not Started', relatedType: input.relatedType, relatedId: input.relatedId,
        archived: false, createdAt: new Date().toISOString(),
      };
      dd.tasks.unshift(t);
      created = t;
      audit(dd, input.assigneeId ? 'Task assigned' : 'Task created', 'task', t.title, t.id);
      if (t.assigneeId && t.assigneeId !== me!.id) {
        notify(dd, t.assigneeId, 'Tasks', 'Task assigned to you', t.title, { name: 'tasks', id: t.id });
      }
      if (t.relatedType === 'matter') matterEvent(dd, t.relatedId, `Task assigned — ${t.title}`, 'task');
    });
    if (created) toast('Task created');
    return created;
  }, [canUser, mutate, me, toast]);

  const updateTask = useCallback((id: string, patch: Partial<TaskItem>, label = 'Updated task') => {
    if (!own(db, db.tasks, id)) { logDenied('task', id); return; }
    mutate((dd) => {
      const t = own(dd, dd.tasks, id);
      if (!t) return;
      const wasDone = t.status === 'Completed';
      Object.assign(t, patch);
      if (patch.status === 'Completed' && !wasDone) t.completedAt = new Date().toISOString();
      if (label === 'Status changed' && patch.status) audit(dd, `Task ${patch.status.toLowerCase()}`, 'task', t.title, t.id);
      else audit(dd, label, 'task', t.title, t.id);
      if (patch.status === 'Completed' && t.createdById !== me!.id) {
        notify(dd, t.createdById, 'Tasks', 'Delegated task completed', t.title, { name: 'tasks', id });
      }
      if (patch.status === 'Completed' && t.relatedType === 'matter') matterEvent(dd, t.relatedId, `Task completed — ${t.title}`, 'task');
    });
  }, [mutate, me]);

  /* ── approvals ── */

  const decideApproval = useCallback((approvalId: string, decision: Exclude<ApprovalState, 'Pending'>, comment?: string) => {
    if (!canUser('approve')) { toast('Your role cannot decide approvals.', 'error'); return; }
    if (!own(db, db.approvals, approvalId)) { logDenied('approval', approvalId); return; }
    mutate((dd) => {
      const a = own(dd, dd.approvals, approvalId);
      if (!a || a.overall !== 'Pending') return;
      const step = a.chain[a.currentStep];
      step.state = decision;
      step.userId = me!.id;
      step.decidedAt = new Date().toISOString();
      step.comment = comment;
      if (decision === 'Approved' && a.currentStep < a.chain.length - 1) {
        a.currentStep += 1;
        audit(dd, `Approved (step ${a.currentStep} of ${a.chain.length})`, 'approval', a.title, a.id);
      } else {
        a.overall = decision;
        audit(dd, decision === 'Approved' ? 'Approved (final step)' : decision === 'Rejected' ? 'Rejected approval' : 'Requested changes', 'approval', a.title, a.id);
        const rec = dd.documents.find((x) => x.id === a.recordId);
        if (rec) {
          rec.status = decision === 'Approved' ? 'Approved' : decision === 'Rejected' ? 'Draft' : 'Draft';
          rec.updatedAt = new Date().toISOString();
        }
      }
      notify(dd, a.requestedById === me!.id ? undefined : a.requestedById, 'Approvals',
        decision === 'Approved' && a.overall === 'Pending' ? 'Approval progressed' : `Approval ${decision.toLowerCase()}`,
        a.title, { name: 'documents' });
      const m = dd.documents.find((x) => x.id === a.recordId);
      if (m?.matterId) matterEvent(dd, m.matterId, `Approval ${decision.toLowerCase()} — ${a.title}`, 'approval');
    });
    toast(`Approval ${decision.toLowerCase()}`, decision === 'Rejected' ? 'error' : 'success');
  }, [canUser, mutate, me, toast]);

  /* ── memos & email ── */

  const createMemo = useCallback((input: { to: string; subject: string; body: string; departmentId?: string; security: SecurityLevel }) => {
    if (!canUser('create')) { toast('Your role is read-only.', 'error'); return null; }
    let created: DocumentRecord | null = null;
    mutate((dd) => {
      const dept = dd.departments.find((x) => x.id === input.departmentId);
      const ref = refNext(dd, 'MEMO', dept?.code ?? 'ADM');
      const rec: DocumentRecord = {
        id: uid('doc'), orgId: me!.orgId, fileNumber: ref,
        title: `Internal Memorandum — ${input.subject}`, category: 'Memo', departmentId: input.departmentId,
        ownerId: me!.id, security: input.security, status: 'Draft',
        fileName: `memo-${Date.now().toString(36)}.docx`, sizeKb: 96, mime: 'application/docx',
        versions: [{ version: '1.0', authorId: me!.id, at: new Date().toISOString(), note: `Draft memo to ${input.to}`, fileName: 'memo.docx', sizeKb: 96 }],
        body: `INTERNAL MEMORANDUM\nRef: ${ref}\nTo: ${input.to}\nFrom: ${me!.name} (${me!.title})\nDate: ${new Date().toLocaleDateString()}\nSubject: ${input.subject}\n\n${input.body}`,
        ocr: false, retention: 'Active', archived: false,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      dd.documents.unshift(rec);
      const chain = (org?.approvalChain ?? ['Department Head', 'Executive']).filter((r) => r !== 'Staff' && r !== 'Viewer').map((role) => ({ role, state: 'Pending' as ApprovalState }));
      dd.approvals.unshift({
        id: uid('apr'), orgId: me!.orgId, recordType: 'memo', recordId: rec.id,
        title: rec.title, requestedById: me!.id, chain, currentStep: 0, overall: 'Pending',
        createdAt: new Date().toISOString(),
      });
      created = rec;
      audit(dd, 'Created internal memorandum', 'document', rec.title, rec.id);
    });
    if (created) toast('Memorandum drafted — approval workflow started');
    return created;
  }, [canUser, mutate, me, org, toast]);

  const registerEmail = useCallback((emailId: string, input: { departmentId?: string; assignedTo?: string; priority: Priority; responseDeadline?: string }) => {
    if (!canUser('register')) { toast('Your role cannot register correspondence.', 'error'); return; }
    if (!own(db, db.emails, emailId)) { logDenied('email', emailId); return; }
    mutate((dd) => {
      const em = own(dd, dd.emails, emailId);
      if (!em || em.registeredCorrId) return;
      const dept = dd.departments.find((x) => x.id === input.departmentId);
      const c: Correspondence = {
        id: uid('cr'), orgId: me!.orgId, ref: refNext(dd, 'IN', dept?.code ?? 'ADM'),
        direction: 'incoming', externalRef: 'EMAIL', dateReceived: em.receivedAt, dateOfLetter: em.receivedAt,
        sender: em.from, senderOrg: em.from.split('—')[1]?.trim() ?? em.from, recipient: 'The Secretariat',
        subject: em.subject, type: em.subject.toLowerCase().includes('invitation') ? 'Invitation' : 'Letter',
        departmentId: input.departmentId, assignedTo: input.assignedTo, priority: input.priority,
        security: 'Internal', responseRequired: !!input.responseDeadline, responseDeadline: input.responseDeadline,
        status: 'Registered', notes: `Registered from email (${em.fromEmail}).`, attachments: [],
        ocrText: em.body, archived: false,
      };
      dd.correspondence.unshift(c);
      em.registeredCorrId = c.id;
      audit(dd, 'Registered email as official correspondence', 'correspondence', `${c.ref} — ${em.subject}`, c.id);
      if (c.assignedTo) notify(dd, c.assignedTo, 'Correspondence', 'Email registered & assigned', c.subject, { name: 'correspondence', id: c.id });
    });
    toast('Email registered as official correspondence');
  }, [canUser, mutate, me, toast]);

  /* ── archive ── */

  const archiveRecord = useCallback((kind: 'correspondence' | 'document' | 'matter' | 'meeting' | 'task', id: string) => {
    if (!canUser('archive')) { toast('Your role cannot archive records.', 'error'); return; }
    if (!(own(db, (db as unknown as Record<string, { id: string; orgId: string }[]>)[kind === 'correspondence' ? 'correspondence' : kind === 'document' ? 'documents' : kind === 'matter' ? 'matters' : kind === 'meeting' ? 'meetings' : 'tasks'] as { id: string; orgId: string }[], id))) { logDenied(kind, id); return; }
    mutate((dd) => {
      const map: Record<string, { id: string; orgId: string; archived?: boolean; title?: string; subject?: string }[]> = {
        correspondence: dd.correspondence, document: dd.documents, matter: dd.matters, meeting: dd.meetings, task: dd.tasks,
      };
      const r = map[kind].find((x) => x.id === id && x.orgId === me?.orgId);
      if (!r) return;
      r.archived = true;
      if (kind === 'document') (r as unknown as DocumentRecord).status = 'Archived';
      if (kind === 'matter') (r as unknown as Matter).status = 'Archived';
      if (kind === 'correspondence') (r as unknown as Correspondence).status = 'Archived';
      audit(dd, `Archived ${kind}`, kind, (r as { title?: string; subject?: string }).title ?? (r as { subject?: string }).subject ?? id, id);
    });
    toast('Record moved to institutional archive', 'info');
  }, [canUser, mutate, toast]);

  const restoreRecord = useCallback((kind: 'correspondence' | 'document' | 'matter' | 'meeting' | 'task', id: string) => {
    mutate((dd) => {
      const map: Record<string, { id: string; orgId: string; archived?: boolean; title?: string; subject?: string }[]> = {
        correspondence: dd.correspondence, document: dd.documents, matter: dd.matters, meeting: dd.meetings, task: dd.tasks,
      };
      const r = map[kind].find((x) => x.id === id && x.orgId === me?.orgId);
      if (!r) return;
      r.archived = false;
      if (kind === 'matter') (r as unknown as Matter).status = 'Active';
      if (kind === 'document') (r as unknown as DocumentRecord).status = 'Approved';
      if (kind === 'correspondence') (r as unknown as Correspondence).status = 'Closed';
      audit(dd, `Restored ${kind} from archive`, kind, (r as { title?: string; subject?: string }).title ?? id, id);
    });
    toast('Record restored to the active register');
  }, [mutate, toast]);

  /* ── directory & admin ── */

  const addContact = useCallback((input: Omit<Contact, 'id' | 'orgId'>) => {
    if (!canUser('create')) { toast('Your role is read-only.', 'error'); return; }
    mutate((dd) => {
      dd.contacts.unshift({ id: uid('ct'), orgId: me!.orgId, ...input });
      audit(dd, 'Added contact', 'contact', input.name);
    });
    toast('Contact added to the directory');
  }, [canUser, mutate, me, toast]);

  const updateContact = useCallback((id: string, patch: Partial<Contact>) => {
    if (!own(db, db.contacts, id)) { logDenied('contact', id); return; }
    mutate((dd) => {
      const c = own(dd, dd.contacts, id);
      if (c) { Object.assign(c, patch); audit(dd, 'Updated contact', 'contact', c.name, c.id); }
    });
  }, [db, mutate]);

  const addDepartment = useCallback((input: Omit<Department, 'id' | 'orgId'>) => {
    if (!canUser('manageDept')) return { ok: false, error: 'Only administrators can manage departments.' };
    if (db.departments.some((x) => x.orgId === me?.orgId && x.code.toLowerCase() === input.code.toLowerCase())) {
      return { ok: false, error: `Department code "${input.code}" already exists.` };
    }
    mutate((dd) => {
      dd.departments.push({ id: uid('dep'), orgId: me!.orgId, ...input });
      audit(dd, 'Created department', 'department', input.name);
    });
    return { ok: true };
  }, [canUser, db, me, mutate]);

  const updateDepartment = useCallback((id: string, patch: Partial<Department>) => {
    if (!own(db, db.departments, id)) { logDenied('department', id); return; }
    mutate((dd) => {
      const dep = own(dd, dd.departments, id);
      if (dep) { Object.assign(dep, patch); audit(dd, 'Updated department', 'department', dep.name, dep.id); }
    });
  }, [db, mutate]);

  const addUser = useCallback((input: Omit<User, 'id' | 'orgId' | 'initials' | 'color' | 'pwdHash' | 'emailVerified' | 'pwdChangedAt' | 'aiEnabled' | 'photo'>) => {
    if (!canUser('manageUsers')) return { ok: false, error: 'Only administrators can manage users.' };
    const em = normalizeEmail(input.email);
    if (!isValidEmail(em)) return { ok: false, error: 'Enter a valid email address.' };
    if (db.users.filter((u) => u.orgId === me?.orgId).length >= 20) {
      return { ok: false, error: 'User limit reached (20 seats on this plan).' };
    }
    if (db.users.some((u) => u.orgId === me?.orgId && u.email.toLowerCase() === em)) {
      return { ok: false, error: 'A user with this email already exists.' };
    }
    mutate((dd) => {
      const colors = ['#146355', '#9C6B1E', '#3E5C76', '#A8402C', '#2E7D4F'];
      dd.users.push({
        ...input, email: em, id: uid('u'), orgId: me!.orgId,
        initials: input.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase(),
        color: colors[dd.users.length % colors.length],
        pwdHash: hashSecret('cortexa'),      // temp credential — rotated on first sign-in in production
        emailVerified: false,                 // invited users verify by email before activation
        pwdChangedAt: new Date().toISOString(),
        aiEnabled: false,                     // AI seats are granted explicitly by the admin
      });
      audit(dd, 'Invited user', 'user', `${input.name} (${input.role})`);
      secAudit(dd, 'User account created (invite pending verification)', em, 'success', me);
      notify(dd, dd.users[dd.users.length - 1].id, 'System', 'Welcome to Cortexa', `You have been added to ${org?.name ?? 'the organisation'}.`, { name: 'dashboard' });
    });
    return { ok: true };
  }, [canUser, db, me, mutate, org]);

  const updateUser = useCallback((id: string, patch: Partial<User>) => {
    if (!own(db, db.users, id)) { logDenied('user', id); return; }
    mutate((dd) => {
      const u = own(dd, dd.users, id);
      if (!u) return;
      /* privilege guard — role changes are an admin action even via direct call */
      if (patch.role && patch.role !== u.role && !canUser('manageUsers')) {
        secAudit(dd, 'Denied role change (insufficient permission)', `${u.email} → ${patch.role}`, 'denied', me);
        return;
      }
      Object.assign(u, patch);
      audit(dd, patch.active === false ? 'Deactivated user' : patch.role ? `Changed role to ${patch.role}` : 'Updated user', 'user', u.name, u.id);
      if (patch.role) secAudit(dd, `Role changed to ${patch.role}`, `${u.email}`, 'success', me);
    });
  }, [db, mutate, canUser, me]);

  const updateOrg = useCallback((patch: Partial<Organisation>) => {
    if (!canUser('manageOrg')) { toast('Only administrators can change organisation settings.', 'error'); return; }
    mutate((dd) => {
      const o = dd.orgs.find((x) => x.id === me!.orgId);
      if (o) { Object.assign(o, patch); audit(dd, 'Updated organisation settings', 'organisation', o.name, o.id); }
    });
    toast('Organisation settings saved');
  }, [canUser, mutate, me, toast]);

  const setNotificationPrefs = useCallback((prefs: Organisation['notificationPrefs']) => {
    mutate((dd) => {
      const o = dd.orgs.find((x) => x.id === me!.orgId);
      if (o) { o.notificationPrefs = prefs; audit(dd, 'Updated notification settings', 'organisation', o.name, o.id); }
    });
    toast('Notification preferences saved');
  }, [mutate, me, toast]);

  const markNotificationRead = useCallback((id: string) => {
    mutate((dd) => {
      const n = dd.notifications.find((x) => x.id === id && x.userId === me?.id);
      if (n) n.read = true;
    });
  }, [mutate, me]);

  const markAllNotificationsRead = useCallback(() => {
    mutate((dd) => {
      dd.notifications.forEach((n) => { if (n.userId === me?.id) n.read = true; });
    });
  }, [mutate, me]);

  /* ── reset ── */

  const resetDemo = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    const fresh = buildSeed();
    setDb(fresh);
    setRoute({ name: 'dashboard' });
    toast('Demo data restored to its original state', 'info');
  }, [toast]);

  /* ── search ── */

  const searchAll = useCallback((q: string): SearchResults => {
    const empty: SearchResults = { correspondence: [], documents: [], matters: [], meetings: [], tasks: [], contacts: [] };
    const query = q.trim().toLowerCase();
    if (!query || !me) return empty;
    const has = (...fields: (string | undefined)[]) => fields.some((f) => f && f.toLowerCase().includes(query));
    const inOrg = <T extends { orgId: string }>(x: T) => x.orgId === me.orgId;
    return {
      correspondence: db.correspondence.filter((c) => inOrg(c) && !c.archived && canSee(me, c.security) &&
        has(c.ref, c.subject, c.sender, c.senderOrg, c.recipient, c.recipientOrg, c.externalRef, c.notes, c.ocrText, c.type, c.status)),
      documents: db.documents.filter((doc) => inOrg(doc) && !doc.archived && canSee(me, doc.security) &&
        has(doc.title, doc.fileNumber, doc.fileName, doc.body, doc.category, doc.status)),
      matters: db.matters.filter((m) => inOrg(m) && !m.archived && canSee(me, m.security) &&
        has(m.title, m.fileNumber, m.description, m.category)),
      meetings: db.meetings.filter((m) => inOrg(m) && !m.archived &&
        has(m.title, m.ref, m.venue, m.description, m.status, ...m.externalOrgs)),
      tasks: db.tasks.filter((t) => inOrg(t) && !t.archived &&
        has(t.title, t.description, t.ref, t.status)),
      contacts: db.contacts.filter((c) => inOrg(c) &&
        has(c.name, c.organisation, c.position, c.email, c.notes, ...c.tags)),
    };
  }, [db, me]);

  /* ── assistant ── */

  const askAssistant = useCallback((q: string): { answer: string; links: { label: string; route: Route }[] } => {
    const question = q.trim().toLowerCase();
    if (!me) return { answer: 'Sign in to query the institutional register.', links: [] };
    const res = searchAll(q.replace(/^(show|find|list|get)\s+(me\s+)?(all\s+)?/i, ''));
    const total = res.correspondence.length + res.documents.length + res.matters.length + res.meetings.length + res.tasks.length + res.contacts.length;
    const links: { label: string; route: Route }[] = [];

    /* overdue tasks */
    if (/(overdue).*(task|action)/.test(question) || /(task|action).*overdue/.test(question)) {
      const overdue = db.tasks.filter((t) => t.orgId === me.orgId && !t.archived && t.status !== 'Completed' && t.status !== 'Cancelled' && t.dueDate && daysUntil(t.dueDate) < 0);
      return {
        answer: overdue.length === 0
          ? 'No overdue tasks. Every open action is within its deadline.'
          : `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}: ${overdue.slice(0, 4).map((t) => `${t.title} (${Math.abs(daysUntil(t.dueDate!))}d late${t.assigneeId ? ', ' + (db.users.find((u) => u.id === t.assigneeId)?.name ?? 'unassigned') : ''})`).join('; ')}${overdue.length > 4 ? '…' : ''}.`,
        links: overdue.slice(0, 3).map((t) => ({ label: t.title, route: { name: 'tasks' as const, id: t.id } })),
      };
    }
    /* pending invitations */
    if (/invitation/.test(question) && /(pending|await|unanswered|open)/.test(question)) {
      const pend = db.correspondence.filter((c) => c.orgId === me.orgId && !c.archived && c.type === 'Invitation' && c.responseStatus === 'Pending');
      const mt = db.meetings.filter((m) => m.orgId === me.orgId && m.isInvitation && m.response === 'Pending');
      return {
        answer: pend.length + mt.length === 0
          ? 'No pending invitations. All received invitations have been answered.'
          : `${pend.length} invitation${pend.length === 1 ? '' : 's'} awaiting response${pend.length ? `: ${pend.slice(0, 3).map((c) => c.subject).join('; ')}` : ''}.${mt.length ? ` ${mt.length} meeting invitation${mt.length === 1 ? '' : 's'} also pending: ${mt.slice(0, 2).map((m) => m.title).join('; ')}.` : ''}`,
        links: [
          ...pend.slice(0, 2).map((c) => ({ label: c.subject, route: { name: 'correspondence' as const, id: c.id } })),
          ...mt.slice(0, 2).map((m) => ({ label: m.title, route: { name: 'meeting' as const, id: m.id } })),
        ],
      };
    }
    /* unresolved older than N days */
    const olderMatch = question.match(/older than (\d+) days/);
    if (olderMatch || /unresolved/.test(question)) {
      const n = olderMatch ? parseInt(olderMatch[1], 10) : 14;
      const open = db.correspondence.filter((c) => c.orgId === me.orgId && !c.archived && canSee(me, c.security) &&
        !['Responded', 'Closed', 'Archived'].includes(c.status) && daysUntil(c.dateReceived) <= -n);
      return {
        answer: open.length === 0
          ? `No unresolved correspondence older than ${n} days. The register is current.`
          : `${open.length} unresolved record${open.length > 1 ? 's' : ''} older than ${n} days: ${open.slice(0, 4).map((c) => `${c.ref} "${c.subject}" (${c.status})`).join('; ')}${open.length > 4 ? '…' : ''}.`,
        links: open.slice(0, 3).map((c) => ({ label: `${c.ref} — ${c.subject}`, route: { name: 'correspondence' as const, id: c.id } })),
      };
    }
    /* matter summary */
    if (/summar|history/.test(question)) {
      const kw = question.replace(/.*(summarise|summarize|summary|history)\s*(of|for)?\s*(this\s+)?(matter\s+)?/, '').trim();
      const m = db.matters.find((x) => x.orgId === me.orgId && canSee(me, x.security) && (kw ? x.title.toLowerCase().includes(kw) || kw.includes(x.title.toLowerCase().split(' ')[0]) : false))
        ?? db.matters.find((x) => x.orgId === me.orgId && canSee(me, x.security) && kw && x.title.toLowerCase().split(' ').some((w) => w.length > 3 && kw.includes(w)));
      if (m) {
        const cor = db.correspondence.filter((c) => c.matterId === m.id).length;
        const docs = db.documents.filter((x) => x.matterId === m.id).length;
        const mts = db.meetings.filter((x) => x.matterId === m.id).length;
        const tks = db.tasks.filter((x) => x.relatedType === 'matter' && x.relatedId === m.id).length;
        const owner = db.users.find((u) => u.id === m.ownerId)?.name ?? 'unassigned';
        return {
          answer: `${m.title} (${m.fileNumber}) — owned by ${owner}, status ${m.status}. Institutional record so far: ${cor} correspondence, ${docs} documents, ${mts} meetings, ${tks} linked tasks. Latest activity: ${[...m.events].sort((a, b) => b.at.localeCompare(a.at))[0]?.text ?? '—'}.`,
          links: [{ label: `Open matter file ${m.fileNumber}`, route: { name: 'matter' as const, id: m.id } }],
        };
      }
      return { answer: 'I could not match a matter from that question. Try a keyword from the matter title, e.g. "Summarise the housing matter".', links: [] };
    }
    /* briefing for meeting */
    if (/brief/.test(question)) {
      const target = /tomorrow/.test(question) ? 1 : /today/.test(question) ? 0 : null;
      const list = db.meetings.filter((m) => m.orgId === me.orgId && !m.archived && m.status !== 'Cancelled' && m.status !== 'Completed')
        .filter((m) => (target === null ? true : daysUntil(m.date) === target))
        .sort((a, b) => a.date.localeCompare(b.date));
      if (!list.length) return { answer: target === null ? 'No upcoming meetings to brief you on.' : `No meetings ${target === 0 ? 'today' : 'tomorrow'} on the institutional calendar.` , links: [] };
      const m = list[0];
      const parts = db.meetings.filter((x) => x.orgId === me.orgId && !x.archived && daysUntil(x.date) === (target ?? daysUntil(m.date)));
      const rel = m.relatedCorrId ? db.correspondence.find((c) => c.id === m.relatedCorrId) : undefined;
      return {
        answer: `${parts.length} meeting${parts.length > 1 ? 's' : ''} ${target === 0 ? 'today' : target === 1 ? 'tomorrow' : 'coming up'}: ${m.title}, ${m.date} at ${m.startTime}, ${m.venue}. ${m.agenda.length ? `Agenda has ${m.agenda.length} items, opening with "${m.agenda[0].text}". ` : ''}${rel ? `Related correspondence: ${rel.ref} (${rel.status}).` : ''} ${m.participantIds.length} internal participant${m.participantIds.length === 1 ? '' : 's'}${m.externalOrgs.length ? `, external: ${m.externalOrgs.join(', ')}` : ''}.`,
        links: parts.slice(0, 3).map((x) => ({ label: x.title, route: { name: 'meeting' as const, id: x.id } })),
      };
    }
    /* responsibility */
    if (/who.*(responsible|owns|handling|assigned)|responsible for/.test(question)) {
      const kw = question.replace(/.*?(responsible for|owns|handling|assigned to)\s*/, '').replace(/[?."']/g, '').trim();
      const t = db.tasks.find((x) => x.orgId === me.orgId && kw && x.title.toLowerCase().includes(kw)) ??
        db.tasks.find((x) => x.orgId === me.orgId && kw && kw.split(' ').some((w) => w.length > 3 && x.title.toLowerCase().includes(w)));
      if (t) {
        const who = db.users.find((u) => u.id === t.assigneeId);
        return {
          answer: `"${t.title}" is ${t.status.toLowerCase()} and ${who ? `assigned to ${who.name} (${who.title})` : 'currently unassigned'}${t.dueDate ? `, due in ${daysUntil(t.dueDate) >= 0 ? daysUntil(t.dueDate) + ' days' : Math.abs(daysUntil(t.dueDate!)) + ' days (overdue)'}` : ''}.`,
          links: [{ label: t.title, route: { name: 'tasks' as const, id: t.id } }],
        };
      }
      return { answer: 'I could not match that to a task. Search works best with a phrase from the task title.', links: [] };
    }
    /* correspondence from org */
    const fromMatch = question.match(/from\s+(?:the\s+)?(.+?)[\?.]*$/);
    if (fromMatch && fromMatch[1].split(' ').some((w) => w.length > 3)) {
      const kw = fromMatch[1].trim();
      const words = kw.split(/\s+/).filter((w) => w.length > 3);
      const hits = db.correspondence.filter((c) => c.orgId === me.orgId && !c.archived && canSee(me, c.security) &&
        ((c.senderOrg ?? '').toLowerCase().includes(kw) || words.some((w) => (c.senderOrg ?? '').toLowerCase().includes(w))));
      if (hits.length) {
        const open = hits.filter((c) => !['Responded', 'Closed', 'Archived'].includes(c.status)).length;
        return {
          answer: `${hits.length} correspondence record${hits.length > 1 ? 's' : ''} from ${kw}: ${open} still open. Most recent: ${hits.slice(0, 3).map((c) => `"${c.subject}" (${c.status})`).join('; ')}.`,
          links: hits.slice(0, 3).map((c) => ({ label: `${c.ref} — ${c.subject}`, route: { name: 'correspondence' as const, id: c.id } })),
        };
      }
      return { answer: `No correspondence on record from "${kw}". Check the Contacts directory for the organisation's profile.`, links: [{ label: 'Open contacts', route: { name: 'contacts' as const } }] };
    }
    /* fallback: structured search summary */
    if (total === 0) {
      return { answer: `No institutional records match "${q}". Try a reference number, a sender organisation, or a subject keyword — OCR-extracted scan text is also searchable.`, links: [] };
    }
    const bits: string[] = [];
    if (res.correspondence.length) bits.push(`${res.correspondence.length} correspondence`);
    if (res.documents.length) bits.push(`${res.documents.length} documents`);
    if (res.matters.length) bits.push(`${res.matters.length} matters`);
    if (res.meetings.length) bits.push(`${res.meetings.length} meetings`);
    if (res.tasks.length) bits.push(`${res.tasks.length} tasks`);
    if (res.contacts.length) bits.push(`${res.contacts.length} contacts`);
    if (res.correspondence[0]) links.push({ label: `${res.correspondence[0].ref} — ${res.correspondence[0].subject}`, route: { name: 'correspondence', id: res.correspondence[0].id } });
    if (res.documents[0]) links.push({ label: res.documents[0].title, route: { name: 'documents', id: res.documents[0].id } });
    if (res.matters[0]) links.push({ label: `Matter: ${res.matters[0].title}`, route: { name: 'matter', id: res.matters[0].id } });
    if (res.meetings[0]) links.push({ label: res.meetings[0].title, route: { name: 'meeting', id: res.meetings[0].id } });
    return { answer: `Across the register I found ${bits.join(', ')} matching "${q}".`, links: links.slice(0, 4) };
  }, [db, me, searchAll]);

  /* ── finance & operations ── */

  const fmtMoney = useCallback((amount: number): string => {
    const sym = org?.currency?.symbol ?? '$';
    return `${sym}${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }, [org]);

  const budgetSpent = useCallback((budgetId: string): number =>
    db.finance.filter((t) => t.orgId === me?.orgId && t.kind === 'expenditure' && t.budgetId === budgetId && !['Rejected', 'Cancelled', 'Draft'].includes(t.status)).reduce((s, t) => s + t.amount, 0),
  [db.finance, me]);

  const pettyCashBalance = useCallback((): number => {
    const pc = db.finance.filter((t) => t.orgId === me?.orgId && t.category === 'Petty Cash');
    const inflow = pc.filter((t) => t.kind === 'income' && t.status === 'Paid').reduce((s, t) => s + t.amount, 0);
    const outflow = pc.filter((t) => t.kind === 'expenditure' && t.status === 'Paid').reduce((s, t) => s + t.amount, 0);
    return (org?.pettyCashOpening ?? 0) + inflow - outflow;
  }, [db.finance, me, org]);

  const finRef = useCallback((d: DB, kind: 'INC' | 'EXP'): string => {
    const year = new Date().getFullYear();
    const key = `${me?.orgId}:${kind}:${year}`;
    const n = (d.counters[key] || 0) + 1;
    d.counters[key] = n;
    return `${kind}/${year}/${pad(n)}`;
  }, [me]);

  const addFinanceTxn = useCallback((input: Partial<FinanceTxn> & Pick<FinanceTxn, 'kind' | 'party' | 'description' | 'amount' | 'category'>): FinanceTxn | null => {
    if (!canUser('finance')) { toast('Your role cannot record financial transactions.', 'error'); return null; }
    let created: FinanceTxn | null = null;
    mutate((dd) => {
      const t: FinanceTxn = {
        id: uid('fin'), orgId: me!.orgId, ref: finRef(dd, input.kind === 'income' ? 'INC' : 'EXP'),
        kind: input.kind, date: input.date ?? dateOnly(0), party: input.party, description: input.description,
        amount: input.amount, currency: org?.currency?.code ?? 'NGN', departmentId: input.departmentId,
        category: input.category, budgetId: input.budgetId, paymentMethod: input.paymentMethod,
        status: input.kind === 'income' ? 'Pending Approval' : 'Submitted',
        requestedById: me!.id, notes: input.notes, createdAt: new Date().toISOString(),
      };
      dd.finance.unshift(t);
      created = t;
      audit(dd, input.kind === 'income' ? 'Recorded income' : 'Submitted expenditure', 'finance', `${t.ref} · ${t.party} · ${t.description}`, t.id);
      if (input.kind === 'expenditure') {
        notify(dd, undefined, 'Approvals', 'Expense submitted', `${t.description} — ${fmtMoney(t.amount)} awaiting approval`, { name: 'finance' });
      }
    });
    if (created) toast(`${input.kind === 'income' ? 'Income' : 'Expenditure'} recorded · ${(created as FinanceTxn).ref}`);
    return created;
  }, [canUser, mutate, me, org, finRef, fmtMoney, toast]);

  const setFinanceStatus = useCallback((id: string, status: FinanceTxn['status']) => {
    mutate((dd) => {
      const t = own(dd, dd.finance, id);
      if (!t) return;
      t.status = status;
      if (status === 'Approved') t.approvedById = me!.id;
      if (status === 'Paid') t.paidById = me!.id;
      audit(dd, `Marked ${t.kind} ${status.toLowerCase()}`, 'finance', `${t.ref} · ${t.party}`, t.id);
    });
    toast(`${status === 'Approved' || status === 'Paid' ? status : 'Status'} recorded`, status === 'Rejected' ? 'error' : 'success');
  }, [mutate, me, toast]);

  const addBudgetLine = useCallback((input: Omit<BudgetLine, 'id' | 'orgId'>) => {
    if (!canUser('finance')) { toast('Your role cannot manage budgets.', 'error'); return; }
    mutate((dd) => {
      dd.budgets.push({ id: uid('bdg'), orgId: me!.orgId, ...input });
      audit(dd, 'Created budget line', 'finance', `${input.category} · ${fmtMoney(input.allocated)}`);
    });
    toast('Budget line added');
  }, [canUser, mutate, me, fmtMoney, toast]);

  const addVendor = useCallback((input: Omit<Vendor, 'id' | 'orgId' | 'createdAt'>) => {
    if (!canUser('finance')) { toast('Your role cannot manage vendors.', 'error'); return; }
    mutate((dd) => {
      dd.vendors.unshift({ id: uid('vnd'), orgId: me!.orgId, createdAt: new Date().toISOString(), ...input });
      audit(dd, 'Added vendor', 'finance', input.name);
    });
    toast('Vendor added to the directory');
  }, [canUser, mutate, me, toast]);

  const updateVendor = useCallback((id: string, patch: Partial<Vendor>) => {
    mutate((dd) => {
      const v = own(dd, dd.vendors, id);
      if (v) { Object.assign(v, patch); audit(dd, 'Updated vendor', 'finance', v.name, v.id); }
    });
  }, [mutate]);

  const addInvoice = useCallback((input: Omit<Invoice, 'id' | 'orgId' | 'ref' | 'createdAt'>): Invoice | null => {
    if (!canUser('finance')) { toast('Your role cannot register invoices.', 'error'); return null; }
    let created: Invoice | null = null;
    mutate((dd) => {
      const year = new Date().getFullYear();
      const key = `${me?.orgId}:INV:${year}`;
      const n = (dd.counters[key] || 0) + 1;
      dd.counters[key] = n;
      const inv: Invoice = { id: uid('inv'), orgId: me!.orgId, ref: `INV/${year}/${pad(n, 3)}`, createdAt: new Date().toISOString(), ...input };
      dd.invoices.unshift(inv);
      created = inv;
      audit(dd, 'Registered invoice', 'finance', `${inv.ref} · ${fmtMoney(inv.amount)}`, inv.id);
    });
    if (created) toast(`Invoice ${(created as Invoice).ref} registered`);
    return created;
  }, [canUser, mutate, me, fmtMoney, toast]);

  const setInvoiceStatus = useCallback((id: string, status: Invoice['status']) => {
    mutate((dd) => {
      const inv = own(dd, dd.invoices, id);
      if (!inv) return;
      inv.status = status;
      audit(dd, `Invoice marked ${status.toLowerCase()}`, 'finance', inv.ref, inv.id);
    });
    toast(`Invoice marked ${status}`, status === 'Disputed' || status === 'Cancelled' ? 'error' : 'success');
  }, [mutate, toast]);

  const addAnnouncement = useCallback((input: Omit<Announcement, 'id' | 'orgId' | 'createdBy' | 'createdAt'>) => {
    if (!canUser('announce')) { toast('Your role cannot publish announcements.', 'error'); return; }
    mutate((dd) => {
      dd.announcements.unshift({ id: uid('ann'), orgId: me!.orgId, createdBy: me!.id, createdAt: new Date().toISOString(), ...input });
      audit(dd, 'Published announcement', 'announcement', input.title);
      dd.users.filter((u) => u.orgId === me!.orgId && u.active).forEach((u) => {
        if (input.targetDepartmentId && u.departmentId !== input.targetDepartmentId) return;
        notify(dd, u.id, 'System', `Announcement: ${input.title}`, input.body, { name: 'dashboard' });
      });
    });
    toast('Announcement published');
  }, [canUser, mutate, me, toast]);

  const addAsset = useCallback((input: Omit<Asset, 'id' | 'orgId' | 'assetCode' | 'createdAt'> & { assetCode?: string }) => {
    if (!canUser('finance')) { toast('Your role cannot manage assets.', 'error'); return; }
    mutate((dd) => {
      const dept = dd.departments.find((x) => x.id === input.departmentId);
      const code = input.assetCode?.trim() || `${dept?.code ?? 'GEN'}/${input.category.slice(0, 3).toUpperCase()}/${new Date().getFullYear()}/${pad(Math.floor(Math.random() * 900) + 100, 3)}`;
      dd.assets.unshift({ id: uid('ast'), orgId: me!.orgId, assetCode: code, createdAt: new Date().toISOString(), ...input });
      audit(dd, 'Registered asset', 'asset', `${code} · ${input.name}`);
    });
    toast('Asset registered');
  }, [canUser, mutate, me, toast]);

  const setAssetStatus = useCallback((id: string, status: Asset['status'], assignedToId?: string) => {
    mutate((dd) => {
      const a = own(dd, dd.assets, id);
      if (!a) return;
      a.status = status;
      if (status === 'Assigned') a.assignedToId = assignedToId;
      if (status === 'Available') a.assignedToId = undefined;
      audit(dd, `Asset ${status.toLowerCase()}`, 'asset', `${a.assetCode} · ${a.name}`, a.id);
    });
    toast(`Asset marked ${status}`, 'info');
  }, [mutate, toast]);

  /* ── AI seats, feature flags, brand, profile photo ── */

  const aiSeatsUsed = useMemo(() => users.filter((u) => u.aiEnabled).length, [users]);

  const setUserAI = useCallback((userId: string, enabled: boolean) => {
    if (!canUser('manageUsers')) { toast('Only administrators manage AI seats.', 'error'); return; }
    if (enabled && aiSeatsUsed >= (org?.aiSeats ?? 0)) { toast('All AI seats are allocated. Upgrade the plan to add more.', 'error'); return; }
    mutate((dd) => {
      const u = own(dd, dd.users, userId);
      if (!u) return;
      u.aiEnabled = enabled;
      audit(dd, enabled ? 'Granted AI access' : 'Revoked AI access', 'user', `${u.name} (${u.email})`, u.id);
    });
    toast(enabled ? 'AI access granted' : 'AI access revoked', 'info');
  }, [canUser, aiSeatsUsed, org, mutate, toast]);

  const setFlags = useCallback((patch: Partial<FeatureFlags>) => {
    if (!canUser('manageOrg')) { toast('Only administrators change module visibility.', 'error'); return; }
    mutate((dd) => {
      const o = dd.orgs.find((x) => x.id === me!.orgId);
      if (o) { o.flags = { ...o.flags, ...patch }; audit(dd, 'Updated module visibility', 'organisation', Object.entries(patch).map(([k, v]) => `${k}: ${v ? 'on' : 'off'}`).join(', '), o.id); }
    });
    toast('Module visibility updated');
  }, [canUser, mutate, me, toast]);

  const setBrand = useCallback((patch: Partial<OrgBrand> & { website?: string; logoUrl?: string; currency?: Organisation['currency'] }) => {
    if (!canUser('manageOrg')) { toast('Only administrators change branding.', 'error'); return; }
    mutate((dd) => {
      const o = dd.orgs.find((x) => x.id === me!.orgId);
      if (!o) return;
      if (patch.primary !== undefined || patch.secondary !== undefined) o.brand = { ...o.brand, ...patch };
      if (patch.website !== undefined) o.website = patch.website;
      if (patch.logoUrl !== undefined) o.logoUrl = patch.logoUrl;
      if (patch.currency !== undefined) o.currency = patch.currency;
      audit(dd, 'Updated organisation branding', 'organisation', o.name, o.id);
    });
    toast('Branding saved');
  }, [canUser, mutate, me, toast]);

  const setProfilePhoto = useCallback((dataUrl: string | undefined) => {
    mutate((dd) => {
      const u = dd.users.find((x) => x.id === me?.id && x.orgId === me?.orgId);
      if (u) { u.photo = dataUrl; audit(dd, dataUrl ? 'Updated profile photo' : 'Removed profile photo', 'user', u.name, u.id); }
    });
    toast(dataUrl ? 'Profile photo updated' : 'Profile photo removed', 'info');
  }, [me, mutate, toast]);

  const flag = useCallback((k: FlagKey): boolean => org?.flags?.[k] ?? false, [org]);
  const myAI = useMemo(() => flag('ai') && (me?.aiEnabled ?? false), [flag, me]);

  /* ── value ── */

  const value: StoreCtx = {
    db, me, org, departments, users, route, nav,
    login, demoLogin, logout,
    registerSignup, resendCode, verifyEmail, changeSignupEmail, demoMailFor,
    completeSetup, changePassword, updateProfile,
    mySessions, revokeSession, revokeOtherSessions, touchSession, securityLog, logEvent,
    toasts, toast, dismissToast,
    nextRef, canUser, searchAll, askAssistant,
    registerCorrespondence, updateCorrespondence, respondCorrespondence,
    addDocument, addDocumentVersion, updateDocument, restoreVersion, addComment,
    createMatter, updateMatter, linkToMatter,
    createMeeting, updateMeeting, setMeetingResponse, completeMeeting,
    createTask, updateTask, decideApproval, createMemo, registerEmail,
    archiveRecord, restoreRecord,
    addContact, updateContact, addDepartment, updateDepartment,
    addUser, updateUser, updateOrg, setNotificationPrefs,
    markNotificationRead, markAllNotificationsRead,
    resetDemo,
    addFinanceTxn, setFinanceStatus, addBudgetLine, addVendor, updateVendor,
    addInvoice, setInvoiceStatus, addAnnouncement, addAsset, setAssetStatus,
    fmtMoney, budgetSpent, pettyCashBalance,
    setUserAI, aiSeatsUsed, setFlags, setBrand, setProfilePhoto, flag, myAI,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* keep d() referenced for potential seed-relative UIs */
void d;
export type { EmailRecord };
