import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import type { Route, NotificationItem } from '../lib/types';
import { relTime, cx, fmtTime12, daysUntil } from '../lib/utils';
import { useNetwork, queueSize } from '../lib/offline';
import { Drawer, Avatar, RoleBadge, Chip, ToastHost } from './ui';
import { QAHost, type QAKey } from './quick';
import {
  IcGrid, IcInbox, IcStamp, IcEnvelope, IcSeal, IcFile, IcUsers, IcCheckSquare,
  IcCalendar, IcBook, IcColumns, IcChart, IcArchive, IcShield, IcBell, IcSearch,
  IcSpark, IcPlus, IcLogout, IcMenu, IcX, IcSend, CortexaSeal, IcChevD, IcMail,
  IcPaperclip, IcEdit, IcRegistry, IcClock, IcCheck,
} from './icons';
import { SESSION_IDLE_MS, SESSION_ABS_MS } from '../lib/security';

const TITLES: Record<string, string> = {
  dashboard: 'Dashboard', 'desk-secretary': 'Secretary Desk', 'desk-executive': 'Executive Desk',
  correspondence: 'Correspondence Register', matters: 'Matters & Case Files', matter: 'Matter File',
  documents: 'Records Vault', meetings: 'Meetings & Invitations', meeting: 'Meeting',
  tasks: 'Tasks & Actions', calendar: 'Institutional Calendar', contacts: 'Contact Directory',
  departments: 'Departments', reports: 'Reports & Analytics', archive: 'Institutional Archive',
  admin: 'Administration', search: 'Registry Search', account: 'Profile & Security',
  finance: 'Finance & Bookkeeping', deadlines: 'Deadline Centre',
  announcements: 'Announcements', assets: 'Asset Register',
};

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

/* live tally of the active institutional register */
function LiveRegister() {
  const { db, me } = useStore();
  const oid = me?.orgId;
  const count = db.correspondence.filter((r) => r.orgId === oid && !r.archived).length
    + db.documents.filter((r) => r.orgId === oid && !r.archived).length
    + db.matters.filter((r) => r.orgId === oid && !r.archived).length
    + db.meetings.filter((r) => r.orgId === oid && !r.archived).length
    + db.tasks.filter((r) => r.orgId === oid && !r.archived).length;
  return (
    <span className="hidden xl:flex items-center gap-2 text-[11px] font-mono text-ink-faint" title="Active records across correspondence, documents, matters, meetings and tasks">
      <span className="dot bg-pine-500 live-dot" />
      register live · {count} records
    </span>
  );
}

/* live connectivity pill — ONLINE / OFFLINE / SYNCING */
function NetworkPill() {
  const { toast } = useStore();
  const onSynced = React.useCallback((queued: number) => {
    toast(queued > 0 ? `Synced successfully — ${queued} offline draft${queued === 1 ? '' : 's'} reconciled` : 'Back online', 'success');
  }, [toast]);
  const net = useNetwork(onSynced);
  const pending = queueSize();
  const meta: Record<string, { label: string; cls: string; dot: string; title: string }> = {
    online: { label: 'Online', cls: 'bg-moss-100 text-moss-700', dot: 'bg-moss-600', title: 'Connected — changes save to the register' },
    offline: { label: `Offline${pending ? ` · ${pending} queued` : ''}`, cls: 'bg-clay-100 text-clay-700', dot: 'bg-clay-500', title: 'No connection — records you create are queued as offline drafts and synced on reconnect' },
    syncing: { label: 'Syncing…', cls: 'bg-brass-100 text-brass-700', dot: 'bg-brass-500', title: 'Reconnecting and reconciling offline drafts' },
  };
  const m = meta[net];
  return (
    <span role="status" title={m.title} className={cx('hidden sm:inline-flex items-center gap-1.5 chip', m.cls)}>
      <span className={cx('dot', m.dot, net === 'syncing' && 'animate-pulse', net === 'offline' && 'pulse-urgent')} />
      {m.label}
    </span>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { me, org, db, route, nav, logout, canUser, markNotificationRead, markAllNotificationsRead, touchSession, flag, myAI } = useStore();
  const [sideOpen, setSideOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [assistOpen, setAssistOpen] = useState(false);
  const [qa, setQa] = useState<QAKey>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const now = useClock();

  /* session lifecycle — activity keep-alive, idle + absolute expiry */
  useEffect(() => {
    const touch = () => touchSession();
    window.addEventListener('pointerdown', touch);
    window.addEventListener('keydown', touch);
    const iv = window.setInterval(() => {
      const sid = db.session.sessionId;
      const s = sid ? db.sessions.find((x) => x.id === sid) : undefined;
      if (!s) return;
      if (Date.now() - s.lastSeen > SESSION_IDLE_MS) logout('Signed out after 30 minutes of inactivity.');
      else if (Date.now() - s.createdAt > SESSION_ABS_MS) logout('Session expired after 12 hours. Please sign in again.');
    }, 30000);
    return () => {
      window.removeEventListener('pointerdown', touch);
      window.removeEventListener('keydown', touch);
      window.clearInterval(iv);
    };
  }, [db.session.sessionId, db.sessions, touchSession, logout]);

  /* Ctrl/Cmd+K focuses the global registry search */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('cortexa:focus-search'));
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const myNotifs = useMemo(
    () => db.notifications.filter((n) => n.userId === me?.id).sort((a, b) => b.at.localeCompare(a.at)),
    [db.notifications, me],
  );
  const unread = myNotifs.filter((n) => !n.read).length;

  const overdueTasks = useMemo(
    () => db.tasks.filter((t) => t.orgId === me?.orgId && !t.archived && !['Completed', 'Cancelled'].includes(t.status) && t.dueDate && daysUntil(t.dueDate) < 0).length,
    [db.tasks, me],
  );

  const navTo = (r: Route) => { nav(r); setSideOpen(false); };

  type NavItem = { name: Route['name']; label: string; icon: (p: { size?: number }) => React.ReactElement; badge?: number; badgeTone?: string };
  const ops: NavItem[] = [];
  if (flag('finance')) ops.push({ name: 'finance', label: 'Finance', icon: IcChart });
  if (flag('deadlines')) ops.push({ name: 'deadlines', label: 'Deadline Centre', icon: IcClock });
  if (flag('announcements')) ops.push({ name: 'announcements', label: 'Announcements', icon: IcBell });
  if (flag('assets')) ops.push({ name: 'assets', label: 'Assets', icon: IcColumns });

  const NAV: { section: string; items: NavItem[] }[] = [
    {
      section: 'Workspace',
      items: [
        { name: 'dashboard', label: 'Dashboard', icon: IcGrid },
        { name: 'desk-secretary', label: 'Secretary Desk', icon: IcInbox },
        { name: 'desk-executive', label: 'Executive Desk', icon: IcStamp },
      ],
    },
    {
      section: 'Registry',
      items: [
        { name: 'correspondence', label: 'Correspondence', icon: IcEnvelope },
        { name: 'matters', label: 'Matters', icon: IcSeal },
        { name: 'documents', label: 'Documents', icon: IcFile },
        { name: 'meetings', label: 'Meetings', icon: IcUsers },
        { name: 'tasks', label: 'Tasks', icon: IcCheckSquare, badge: overdueTasks, badgeTone: 'bg-clay-500' },
        { name: 'calendar', label: 'Calendar', icon: IcCalendar },
      ],
    },
    ...(ops.length ? [{ section: 'Operations', items: ops }] : []),
    {
      section: 'Institution',
      items: [
        { name: 'contacts', label: 'Contacts', icon: IcBook },
        { name: 'departments', label: 'Departments', icon: IcColumns },
        { name: 'reports', label: 'Reports', icon: IcChart },
        { name: 'archive', label: 'Archive', icon: IcArchive },
      ],
    },
  ];
  const showAdmin = canUser('manageOrg') || canUser('viewAudit') || canUser('manageUsers');

  const isActive = (name: Route['name']) =>
    route.name === name ||
    (name === 'matters' && route.name === 'matter') ||
    (name === 'meetings' && route.name === 'meeting');

  const QUICK: { key: Exclude<QAKey, null> | 'search'; label: string; icon: React.ReactElement }[] = [
    { key: 'corr', label: 'Register Correspondence', icon: <IcRegistry size={15} /> },
    { key: 'doc', label: 'Upload Document', icon: <IcFile size={15} /> },
    { key: 'meeting', label: 'Create Meeting', icon: <IcUsers size={15} /> },
    { key: 'task', label: 'Create Task', icon: <IcCheckSquare size={15} /> },
    { key: 'memo', label: 'Create Memo', icon: <IcMail size={15} /> },
    { key: 'matter', label: 'Create Matter', icon: <IcSeal size={15} /> },
    { key: 'contact', label: 'Add Contact', icon: <IcBook size={15} /> },
    { key: 'search', label: 'Search Records', icon: <IcSearch size={15} /> },
  ];

  return (
    <div className="min-h-full flex">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      {/* ── sidebar ── */}
      {sideOpen && <div className="fixed inset-0 z-40 bg-pine-950/50 lg:hidden anim-fade" onClick={() => setSideOpen(false)} />}
      <aside className={cx(
        'fixed lg:sticky top-0 z-40 h-screen w-[248px] shrink-0 bg-pine-900 sidebar-texture text-pine-100 flex flex-col transition-transform duration-300 lg:translate-x-0',
        sideOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <button className="lg:hidden absolute right-3 top-4 text-pine-200 hover:text-paper cursor-pointer" onClick={() => setSideOpen(false)} aria-label="Close menu"><IcX size={18} /></button>
        <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
          <span className="text-brass-400"><CortexaSeal size={36} /></span>
          <div className="min-w-0">
            <p className="font-display font-extrabold text-[16px] tracking-tight text-paper leading-none">CORTEXA</p>
            <p className="text-[10.5px] text-pine-300 mt-1 truncate">{org?.name ?? 'Institutional Registry'}</p>
          </div>
        </div>
        <div className="mx-4 border-t border-white/10" />
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {NAV.map((g) => (
            <div key={g.section}>
              <p className="px-2.5 mb-1 text-[9.5px] font-bold uppercase tracking-[0.18em] text-pine-300/60">{g.section}</p>
              <div className="space-y-0.5">
                {g.items.map((it) => (
                  <button key={it.name} className={cx('nav-item', isActive(it.name) && 'active')} onClick={() => navTo({ name: it.name })}>
                    <it.icon size={16} />
                    <span className="flex-1 text-left">{it.label}</span>
                    {!!it.badge && <span className={cx('text-[10px] font-mono font-semibold text-white rounded px-1.5 py-px', it.badgeTone)}>{it.badge}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {showAdmin && (
            <div>
              <p className="px-2.5 mb-1 text-[9.5px] font-bold uppercase tracking-[0.18em] text-pine-300/60">Administration</p>
              <button className={cx('nav-item', isActive('admin') && 'active')} onClick={() => navTo({ name: 'admin' })}>
                <IcShield size={16} /><span className="flex-1 text-left">Admin Console</span>
              </button>
            </div>
          )}
        </nav>
        <div className="px-4 py-3 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            {me && <Avatar name={me.name} color={me.color} size={34} />}
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold text-paper truncate">{me?.name}</p>
              <p className="text-[10.5px] text-pine-300 truncate">{me?.title}</p>
            </div>
            <button onClick={() => logout()} className="text-pine-300 hover:text-clay-500 transition-colors cursor-pointer p-1" title="Sign out" aria-label="Sign out">
              <IcLogout size={16} />
            </button>
          </div>
          <p className="text-[9.5px] text-pine-300/50 mt-2.5 leading-relaxed">Every document has a history.<br />Every action leaves a record.</p>
        </div>
      </aside>

      {/* ── main column ── */}
      <div className="flex-1 min-w-0 flex flex-col ledger-bg">
        <header className="sticky top-0 z-30 bg-paper/85 backdrop-blur border-b border-line">
          <div className="flex items-center gap-3 px-4 sm:px-6 h-14">
            <button className="lg:hidden text-ink-soft hover:text-ink cursor-pointer" onClick={() => setSideOpen(true)} aria-label="Open menu"><IcMenu size={20} /></button>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint leading-none hidden sm:block">{org?.name}</p>
              <h2 className="font-display font-bold text-[14.5px] text-ink leading-tight truncate">{TITLES[route.name] ?? 'Cortexa'}</h2>
            </div>
            <div className="flex-1" />
            <NetworkPill />
            <LiveRegister />
            <span className="hidden md:flex items-center gap-1.5 text-[11.5px] font-mono text-ink-faint"><IcClock size={13} />{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <div className="hidden md:block"><GlobalSearch /></div>
            <button onClick={() => setAssistOpen(true)} className="btn-ghost !px-2.5 relative" title="Cortexa Assistant — ask the register anything">
              <span className="text-brass-600"><IcSpark size={16} /></span>
              <span className="hidden sm:inline">Assistant</span>
            </button>
            <button onClick={() => setNotifOpen(true)} className="btn-ghost !px-2.5 relative" title="Notifications" aria-label="Notifications">
              <IcBell size={16} />
              {unread > 0 && <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-clay-600 text-white text-[9.5px] font-bold flex items-center justify-center pulse-urgent">{unread}</span>}
            </button>
            {canUser('create') || canUser('register') ? (
              <div className="relative">
                <button className="btn-brass !px-2.5" onClick={() => setQuickOpen((v) => !v)} aria-label="Quick actions">
                  <IcPlus size={16} /><span className="hidden sm:inline">Quick</span><IcChevD size={12} />
                </button>
                {quickOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setQuickOpen(false)} />
                    <div className="absolute right-0 mt-2 w-60 card shadow-xl z-40 py-1.5 anim-pop">
                      {QUICK.map((q) => (
                        <button key={q.key} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-ink-soft hover:bg-pine-50 hover:text-pine-700 transition-colors cursor-pointer"
                          onClick={() => { setQuickOpen(false); if (q.key === 'search') nav({ name: 'search' }); else setQa(q.key); }}>
                          <span className="text-pine-600">{q.icon}</span>{q.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : null}
            <div className="relative">
              <button className="flex items-center gap-1 cursor-pointer" onClick={() => setUserOpen((v) => !v)} aria-label="Account menu">
                {me && <Avatar name={me.name} color={me.color} size={30} />}
              </button>
              {userOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setUserOpen(false)} />
                  <div className="absolute right-0 mt-2 w-64 card shadow-xl z-40 anim-pop">
                    <div className="px-4 py-3 border-b border-line-soft">
                      <p className="font-semibold text-[13.5px] text-ink">{me?.name}</p>
                      <p className="text-[11.5px] text-ink-faint">{me?.email}</p>
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        {me && <RoleBadge role={me.role} />}
                        <span className="chip bg-moss-100 text-moss-700"><IcCheck size={10} /> Verified</span>
                      </div>
                    </div>
                    <button className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-ink-soft hover:bg-pine-50 hover:text-pine-700 cursor-pointer"
                      onClick={() => { setUserOpen(false); nav({ name: 'account' }); }}>
                      <IcShield size={15} /> Profile & security
                    </button>
                    <button className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-clay-600 hover:bg-clay-50 cursor-pointer" onClick={() => logout()}>
                      <IcLogout size={15} /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="md:hidden px-4 pb-2.5"><GlobalSearch /></div>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 px-4 sm:px-6 py-5 max-w-[1440px] w-full mx-auto outline-none">{children}</main>
        <footer className="px-6 py-3 border-t border-line text-[10.5px] text-ink-faint flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-mono">CORTEXA · demo tenant</span>
          <span>Multi-tenant isolation enforced per organisation</span>
          <span className="ml-auto">Records in this workspace persist in your browser</span>
        </footer>
      </div>

      <QAHost open={qa} onClose={() => setQa(null)} />
      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} items={myNotifs} onRead={markNotificationRead} onReadAll={markAllNotificationsRead} nav={nav} />
      <AssistantDrawer open={assistOpen} onClose={() => setAssistOpen(false)} />
      <ToastHost />
    </div>
  );
}

/* ── global search ───────────────────────────────────────────────────── */
export function GlobalSearch({ autoFocus, big }: { autoFocus?: boolean; big?: boolean }) {
  const { searchAll, nav } = useStore();
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const h = () => { inputRef.current?.focus(); inputRef.current?.select(); };
    window.addEventListener('cortexa:focus-search', h);
    return () => window.removeEventListener('cortexa:focus-search', h);
  }, []);
  const res = useMemo(() => searchAll(q), [q, searchAll]);
  const total = res.correspondence.length + res.documents.length + res.matters.length + res.meetings.length + res.tasks.length + res.contacts.length;
  const showDrop = focus && q.trim().length >= 2;

  const rt = (name: Route['name'], id: string): Route => ({ name, id });
  const groups: { label: string; items: { id: string; title: string; sub: string; route: Route }[] }[] = [
    { label: 'Correspondence', items: res.correspondence.slice(0, 3).map((c) => ({ id: c.id, title: c.subject, sub: `${c.ref} · ${c.senderOrg ?? c.recipientOrg ?? ''}`, route: rt('correspondence', c.id) })) },
    { label: 'Documents', items: res.documents.slice(0, 3).map((doc) => ({ id: doc.id, title: doc.title, sub: doc.fileNumber, route: rt('documents', doc.id) })) },
    { label: 'Matters', items: res.matters.slice(0, 3).map((m) => ({ id: m.id, title: m.title, sub: m.fileNumber, route: rt('matter', m.id) })) },
    { label: 'Meetings', items: res.meetings.slice(0, 2).map((m) => ({ id: m.id, title: m.title, sub: `${m.date} · ${m.venue}`, route: rt('meeting', m.id) })) },
    { label: 'Tasks', items: res.tasks.slice(0, 2).map((t) => ({ id: t.id, title: t.title, sub: t.ref, route: rt('tasks', t.id) })) },
    { label: 'Contacts', items: res.contacts.slice(0, 2).map((c) => ({ id: c.id, title: c.name, sub: c.organisation, route: rt('contacts', c.id) })) },
  ].filter((g) => g.items.length);

  return (
    <div className={cx('relative', big ? 'w-full' : 'w-64 xl:w-80')}>
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"><IcSearch size={15} /></span>
      <input
        ref={inputRef}
        className={cx('input !pl-8', big && '!h-11 !text-[14px]')}
        placeholder="Search correspondence, documents, matters, people…"
        aria-label="Search the institutional register"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => window.setTimeout(() => setFocus(false), 160)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && q.trim()) { nav({ name: 'search', q: q.trim() }); setFocus(false); }
          if (e.key === 'Escape') { setFocus(false); (e.target as HTMLInputElement).blur(); }
        }}
      />
      {showDrop && (
        <div className="absolute left-0 right-0 mt-1.5 card shadow-xl z-50 max-h-[420px] overflow-y-auto anim-pop">
          {total === 0 ? (
            <p className="px-4 py-4 text-[12.5px] text-ink-faint">No records visible to you match “{q}”. OCR text and reference numbers are searchable too.</p>
          ) : (
            groups.map((g) => (
              <div key={g.label}>
                <p className="px-3.5 pt-2.5 pb-1 text-[9.5px] font-bold uppercase tracking-[0.16em] text-ink-faint">{g.label}</p>
                {g.items.map((it) => (
                  <button key={it.id} className="w-full text-left px-3.5 py-2 hover:bg-pine-50 transition-colors cursor-pointer"
                    onMouseDown={(e) => { e.preventDefault(); nav(it.route); setFocus(false); }}>
                    <p className="text-[13px] font-medium text-ink truncate">{it.title}</p>
                    <p className="text-[11px] text-ink-faint ref truncate">{it.sub}</p>
                  </button>
                ))}
              </div>
            ))
          )}
          <button className="w-full px-3.5 py-2.5 border-t border-line-soft text-[12px] font-semibold text-pine-700 hover:bg-pine-50 cursor-pointer flex items-center gap-1.5"
            onMouseDown={(e) => { e.preventDefault(); nav({ name: 'search', q: q.trim() }); setFocus(false); }}>
            <IcSearch size={13} /> View all {total} result{total === 1 ? '' : 's'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── notifications ───────────────────────────────────────────────────── */
const CAT_META: Record<NotificationItem['category'], string> = {
  Meetings: 'bg-steel-100 text-steel-700', Tasks: 'bg-pine-100 text-pine-700',
  Approvals: 'bg-brass-100 text-brass-700', Correspondence: 'bg-moss-100 text-moss-700',
  Deadlines: 'bg-clay-100 text-clay-700', System: 'bg-line-soft text-ink-soft',
};

function NotificationsPanel({ open, onClose, items, onRead, onReadAll, nav }: {
  open: boolean; onClose: () => void; items: NotificationItem[];
  onRead: (id: string) => void; onReadAll: () => void; nav: (r: Route) => void;
}) {
  const [cat, setCat] = useState<'All' | NotificationItem['category']>('All');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const cats = ['All', 'Meetings', 'Tasks', 'Approvals', 'Correspondence', 'Deadlines', 'System'] as const;
  const list = items.filter((n) => cat === 'All' || n.category === cat);
  const unread = items.filter((n) => !n.read).length;

  /* group related notifications (same title) — show latest + "N updates" */
  const groups = useMemo(() => {
    const map = new Map<string, NotificationItem[]>();
    list.forEach((n) => {
      const key = n.title;
      map.set(key, [...(map.get(key) ?? []), n]);
    });
    return Array.from(map.entries());
  }, [list]);
  return (
    <Drawer open={open} onClose={onClose} title="Notification centre" subtitle={unread ? `${unread} unread notification${unread === 1 ? '' : 's'}` : 'You are all caught up'}
      footer={<button className="btn-ghost w-full" onClick={onReadAll} disabled={unread === 0}>Mark all as read</button>}>
      <div className="flex gap-1.5 flex-wrap mb-3">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={cx('chip cursor-pointer transition-colors', cat === c ? 'bg-pine-700 text-pine-50' : 'bg-line-soft text-ink-faint hover:text-ink')}>
            {c}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="text-[13px] text-ink-faint py-8 text-center">No {cat === 'All' ? '' : cat.toLowerCase() + ' '}notifications.</p>
      ) : (
        <div className="space-y-1.5">
          {groups.map(([title, ns]) => {
            const isExpanded = expanded.has(title) || ns.length === 1;
            const unreadInGroup = ns.filter((n) => !n.read).length;
            return (
              <div key={title} className="space-y-1.5">
                {ns.length > 1 && !isExpanded && (
                  <button className="w-full text-left rounded-md border border-brass-300/70 bg-brass-50 px-3 py-2.5 cursor-pointer hover:border-brass-500 transition-colors"
                    onClick={() => setExpanded((s) => new Set(s).add(title))}>
                    <div className="flex items-center gap-2">
                      {unreadInGroup > 0 && <span className="dot bg-clay-500 pulse-urgent" />}
                      <span className={cx('chip', CAT_META[ns[0].category])}>{ns[0].category}</span>
                      <span className="chip bg-brass-100 text-brass-700">{ns.length} updates</span>
                      <span className="ml-auto text-[10.5px] text-ink-faint font-mono">{relTime(ns[0].at)}</span>
                    </div>
                    <p className="text-[13px] font-semibold text-ink mt-1.5 leading-snug">{title}</p>
                    <p className="text-[12px] text-brass-700 font-medium mt-0.5">Latest: {ns[0].body}</p>
                  </button>
                )}
                {(isExpanded ? ns : []).map((n) => (
                  <button key={n.id}
                    className={cx('w-full text-left rounded-md border px-3 py-2.5 transition-all cursor-pointer',
                      n.read ? 'bg-card border-line-soft opacity-75' : 'bg-pine-50/70 border-pine-200 hover:border-pine-400')}
                    onClick={() => { onRead(n.id); if (n.link) { nav(n.link); onClose(); } }}>
                    <div className="flex items-center gap-2">
                      {!n.read && <span className="dot bg-clay-500 pulse-urgent" />}
                      <span className={cx('chip', CAT_META[n.category])}>{n.category}</span>
                      {ns.length > 1 && <span className="chip bg-line-soft text-ink-faint">×{ns.length}</span>}
                      <span className="ml-auto text-[10.5px] text-ink-faint font-mono">{relTime(n.at)}</span>
                    </div>
                    <p className="text-[13px] font-semibold text-ink mt-1.5 leading-snug">{n.title}</p>
                    <p className="text-[12px] text-ink-soft mt-0.5 leading-snug">{n.body}</p>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}

/* ── assistant ───────────────────────────────────────────────────────── */
interface AiMsg { who: 'me' | 'ai'; text: string; links?: { label: string; route: Route }[] }

function AssistantDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { askAssistant, nav } = useStore();
  const [msgs, setMsgs] = useState<AiMsg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, thinking]);

  const SUGGESTIONS = [
    'What tasks are overdue?',
    'Which invitations are pending?',
    'Show correspondence from Ministry of Housing',
    'Summarise the housing matter',
    'Brief me for tomorrow\u2019s meetings',
    'Unresolved correspondence older than 14 days',
  ];

  const ask = (q: string) => {
    if (!q.trim() || thinking) return;
    setMsgs((m) => [...m, { who: 'me', text: q }]);
    setInput('');
    setThinking(true);
    window.setTimeout(() => {
      const r = askAssistant(q);
      setMsgs((m) => [...m, { who: 'ai', text: r.answer, links: r.links }]);
      setThinking(false);
    }, 420);
  };

  return (
    <Drawer open={open} onClose={onClose} title={<span className="flex items-center gap-2"><span className="text-brass-600"><IcSpark size={16} /></span>Cortexa Assistant</span>}
      subtitle="Natural-language queries over the register · respects your access level · never alters records"
      w="max-w-lg"
      footer={
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Ask about correspondence, deadlines, matters…" value={input}
            onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask(input)} />
          <button className="btn-primary !px-3" onClick={() => ask(input)} aria-label="Ask"><IcSend size={15} /></button>
        </div>
      }>
      {msgs.length === 0 ? (
        <div>
          <p className="text-[13px] text-ink-soft leading-relaxed">
            Ask the register anything. The assistant searches the same index as global search — including OCR-extracted scan text — and only returns records your role may see.
          </p>
          <p className="label mt-4">Try one of these</p>
          <div className="flex flex-col gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => ask(s)} className="text-left text-[13px] px-3 py-2 rounded-md border border-line bg-card hover:border-brass-400 hover:bg-brass-50 transition-colors cursor-pointer flex items-center gap-2">
                <span className="text-brass-600"><IcSpark size={13} /></span>{s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {msgs.map((m, i) => (
            <div key={i} className={cx('anim-rise', m.who === 'me' ? 'flex justify-end' : '')}>
              <div className={cx('max-w-[92%] rounded-lg px-3.5 py-2.5 text-[13px] leading-relaxed',
                m.who === 'me' ? 'bg-pine-700 text-pine-50' : 'bg-line-soft/70 border border-line text-ink')}>
                {m.text}
                {m.links && m.links.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    {m.links.map((l, j) => (
                      <button key={j} onClick={() => { nav(l.route); onClose(); }}
                        className={cx('text-left text-[12px] font-medium rounded px-2 py-1.5 transition-colors cursor-pointer flex items-center gap-1.5',
                          m.who === 'me' ? 'bg-pine-800 hover:bg-pine-600 text-pine-100' : 'bg-card border border-line hover:border-pine-400 text-pine-700')}>
                        <IcPaperclip size={12} /> {l.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex items-center gap-1.5 text-ink-faint text-[12px]">
              <span className="dot bg-pine-500 animate-pulse" /><span className="dot bg-pine-400 animate-pulse [animation-delay:120ms]" /><span className="dot bg-pine-300 animate-pulse [animation-delay:240ms]" />
              consulting the register…
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}
    </Drawer>
  );
}

/* keep referenced icons for tree-shaking safety */
void [IcEdit, Chip, fmtTime12];
