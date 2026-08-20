import React, { useMemo, useState } from 'react';
import { useStore, can, type Capability as _C } from '../lib/store';
import { PageHead, Tabs, RoleBadge, Avatar, Toggle, Field, Modal, Confirm, Chip } from '../components/ui';
import { ROLES, type Role } from '../lib/types';
import { cx, fmtDateTime, pad, relTime } from '../lib/utils';
import { IcShield, IcPlus, IcSearch, IcCheck, IcX, IcAlert, IcStamp, IcUsers } from '../components/icons';

type AdminTab = 'users' | 'roles' | 'org' | 'workflow' | 'notifications' | 'audit' | 'danger';

const MATRIX: { cap: _C; label: string }[] = [
  { cap: 'register', label: 'Register correspondence' },
  { cap: 'create', label: 'Create records (documents, tasks, meetings, matters)' },
  { cap: 'assign', label: 'Assign & delegate' },
  { cap: 'respond', label: 'Dispatch responses' },
  { cap: 'approve', label: 'Approve documents & memos' },
  { cap: 'archive', label: 'Archive / restore records' },
  { cap: 'manageDept', label: 'Manage departments' },
  { cap: 'manageUsers', label: 'Manage users (up to 20 seats)' },
  { cap: 'manageOrg', label: 'Organisation settings' },
  { cap: 'viewAudit', label: 'View audit trail' },
];

export function Admin() {
  const { canUser } = useStore();
  const available: { id: AdminTab; label: string }[] = [];
  if (canUser('manageUsers')) available.push({ id: 'users', label: 'Users' });
  available.push({ id: 'roles', label: 'Roles & Permissions' });
  if (canUser('manageOrg')) available.push({ id: 'org', label: 'Organisation' }, { id: 'workflow', label: 'Workflows' }, { id: 'notifications', label: 'Notifications' });
  if (canUser('viewAudit')) available.push({ id: 'audit', label: 'Audit Logs' });
  if (canUser('manageOrg')) available.push({ id: 'danger', label: 'Data' });
  const [tab, setTab] = useState<AdminTab>(available[0]?.id ?? 'roles');

  return (
    <div>
      <PageHead kicker="Administration" title="Admin console"
        sub="Users, granular permissions, organisation settings, approval workflows and the immutable audit trail." />
      <Tabs active={tab} onChange={(t) => setTab(t as AdminTab)} tabs={available} />
      <div className="mt-4">
        {tab === 'users' && <UsersTab />}
        {tab === 'roles' && <RolesTab />}
        {tab === 'org' && <OrgTab />}
        {tab === 'workflow' && <WorkflowTab />}
        {tab === 'notifications' && <NotifTab />}
        {tab === 'audit' && <AuditTab />}
        {tab === 'danger' && <DangerTab />}
      </div>
    </div>
  );
}

/* ── users ───────────────────────────────────────────────────────────── */
function UsersTab() {
  const { users, departments, me, canUser, addUser, updateUser, toast } = useStore();
  const [addOpen, setAddOpen] = useState(false);
  const [f, setF] = useState({ name: '', email: '', title: '', role: 'Staff' as Role, departmentId: '' });
  const seats = users.length;

  const submit = () => {
    if (!f.name.trim() || !/\S+@\S+\.\S+/.test(f.email)) { toast('Name and a valid email are required.', 'error'); return; }
    const r = addUser({ name: f.name.trim(), email: f.email.trim(), title: f.title.trim() || 'Staff', role: f.role, departmentId: f.departmentId || undefined, active: true, pwd: 'cortexa' });
    if (!r.ok) { toast(r.error ?? 'Unable to add user.', 'error'); return; }
    toast(`${f.name} invited — they sign in with password "cortexa"`);
    setAddOpen(false); setF({ name: '', email: '', title: '', role: 'Staff', departmentId: '' });
  };

  return (
    <div>
      <div className="card p-4 mb-4 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[220px]">
          <div className="flex items-center justify-between text-[12px] mb-1.5">
            <span className="font-semibold text-ink flex items-center gap-1.5"><IcUsers size={14} className="text-pine-600" /> Seat utilisation</span>
            <span className="ref text-ink-faint">{seats} / 20 seats</span>
          </div>
          <div className="h-2 rounded-full bg-line-soft overflow-hidden">
            <div className={cx('h-full rounded-full transition-all duration-700', seats >= 20 ? 'bg-clay-500' : 'bg-pine-600')} style={{ width: `${(seats / 20) * 100}%` }} />
          </div>
          <p className="text-[11px] text-ink-faint mt-1.5">The seat limit is plan-configurable on the platform — enforced server-side, never in the UI alone.</p>
        </div>
        {canUser('manageUsers') && <button className="btn-primary" onClick={() => setAddOpen(true)}><IcPlus size={14} /> Add user</button>}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead><tr><th className="th">User</th><th className="th">Role</th><th className="th">Department</th><th className="th">Change role</th><th className="th">Active</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={cx(!u.active && 'opacity-55')}>
                  <td className="td">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={u.name} color={u.color} size={28} />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-ink truncate">{u.name}{u.id === me?.id && <span className="text-ink-faint font-normal"> · you</span>}</span>
                        <span className="block text-[11px] text-ink-faint truncate">{u.email} · {u.title}</span>
                      </span>
                    </span>
                  </td>
                  <td className="td"><RoleBadge role={u.role} /></td>
                  <td className="td">
                    <select className="input !h-7.5 !text-[12px] !w-auto" value={u.departmentId ?? ''} disabled={!canUser('manageUsers')}
                      onChange={(e) => updateUser(u.id, { departmentId: e.target.value || undefined })}>
                      <option value="">—</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </td>
                  <td className="td">
                    <select className="input !h-7.5 !text-[12px] !w-auto" value={u.role} disabled={!canUser('manageUsers') || u.id === me?.id}
                      onChange={(e) => updateUser(u.id, { role: e.target.value as Role })}>
                      {ROLES.filter((r) => r !== 'Super Admin').map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="td">
                    <Toggle checked={u.active} disabled={u.id === me?.id || !canUser('manageUsers')}
                      onChange={(v) => updateUser(u.id, { active: v })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add user" subtitle="An invitation is recorded; the user signs in with the demo password"
        footer={<><button className="btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button><button className="btn-primary" onClick={submit}>Invite user</button></>}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Full name" req><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Email" req><input className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="name@cortexa.demo" /></Field>
          <Field label="Job title"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Role">
            <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
              {ROLES.filter((r) => r !== 'Super Admin').map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Department">
              <select className="input" value={f.departmentId} onChange={(e) => setF({ ...f, departmentId: e.target.value })}>
                <option value="">—</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ── roles matrix ────────────────────────────────────────────────────── */
function RolesTab() {
  const displayRoles = ROLES.filter((r) => r !== 'Super Admin');
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-line-soft flex items-center gap-2">
        <IcShield size={15} className="text-pine-600" />
        <p className="text-[12.5px] text-ink-soft">Granular capability matrix. Enforcement happens server-side on every request — the interface only reflects it.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead><tr><th className="th">Capability</th>{displayRoles.map((r) => <th key={r} className="th text-center">{r.replace('Organisation ', 'Org ')}</th>)}</tr></thead>
          <tbody>
            {MATRIX.map((row) => (
              <tr key={row.cap}>
                <td className="td text-[12.5px] text-ink font-medium">{row.label}</td>
                {displayRoles.map((r) => (
                  <td key={r} className="td text-center">
                    {can(r, row.cap)
                      ? <span className="inline-flex w-5 h-5 rounded-full bg-moss-100 text-moss-700 items-center justify-center"><IcCheck size={11} /></span>
                      : <span className="inline-flex w-5 h-5 rounded-full bg-line-soft text-ink-faint items-center justify-center"><IcX size={10} /></span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-3 text-[11.5px] text-ink-faint border-t border-line-soft">Confidentiality levels add a second axis: Staff & Viewers see up to Internal; Secretaries, Records Officers and Department Heads up to Confidential; Executives and Admins see Highly Confidential records.</p>
    </div>
  );
}

/* ── organisation ────────────────────────────────────────────────────── */
function OrgTab() {
  const { org, me, db, canUser, updateOrg, nextRef } = useStore();
  const [f, setF] = useState({ name: org?.name ?? '', type: org?.type ?? 'NGO', address: org?.address ?? '', email: org?.email ?? '', phone: org?.phone ?? '', logoInitials: org?.logoInitials ?? '', refPrefix: org?.refPrefix ?? 'ORG' });
  if (!org) return null;
  const year = new Date().getFullYear();
  const key = `${me?.orgId}:IN:ADM:${year}`;
  const nextSeq = (db.counters[key] || 0) + 1;
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="card p-4 lg:col-span-2">
        <p className="label">Organisation profile</p>
        <div className="grid sm:grid-cols-2 gap-3 mt-1">
          <Field label="Name" req><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Type">
            <select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as typeof f.type })}>
              {['Government', 'University', 'Polytechnic', 'College', 'School', 'NGO', 'Private Company', 'Association', 'Hospital', 'Religious Organisation', 'Other'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Logo initials"><input className="input !w-24 uppercase font-display font-bold" maxLength={2} value={f.logoInitials} onChange={(e) => setF({ ...f, logoInitials: e.target.value.toUpperCase() })} /></Field>
          <Field label="Official email"><input className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Address"><input className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field></div>
          <Field label="Telephone"><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        </div>
        <button className="btn-primary mt-4" disabled={!canUser('manageOrg')} onClick={() => updateOrg({ ...f, refPrefix: f.refPrefix || org.refPrefix })}>Save settings</button>
      </div>
      <div className="card p-4">
        <p className="label">Reference-number format</p>
        <div className="flex items-center gap-2 mt-1">
          <input className="input !w-28 ref !text-[15px] tracking-widest uppercase" maxLength={5} value={f.refPrefix}
            onChange={(e) => setF({ ...f, refPrefix: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })} />
          <span className="text-[12px] text-ink-faint">/ DEPT / {year} / SEQ</span>
        </div>
        <div className="mt-3 border border-brass-300 bg-brass-50 rounded-md px-3.5 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brass-700">Next administration entry</p>
          <p className="ref text-[16px] font-semibold text-ink mt-0.5">{f.refPrefix || 'ORG'}/ADM/{year}/{pad(nextSeq)}</p>
        </div>
        <p className="text-[11.5px] text-ink-faint mt-2.5 leading-relaxed">Sequences are kept per kind, department and year. Duplicate reference numbers are structurally impossible.</p>
        <button className="btn-ghost mt-3 w-full" disabled={!canUser('manageOrg')} onClick={() => updateOrg({ refPrefix: f.refPrefix || org.refPrefix })}>Apply prefix</button>
      </div>
    </div>
  );
}

/* ── workflow ────────────────────────────────────────────────────────── */
function WorkflowTab() {
  const { org, canUser, updateOrg, toast } = useStore();
  const [chain, setChain] = useState<Role[]>(org?.approvalChain ?? []);
  if (!org) return null;
  const addable = (['Department Head', 'Executive', 'Organisation Admin', 'Records Officer'] as Role[]).filter((r) => !chain.includes(r));
  return (
    <div className="card p-4 max-w-2xl">
      <p className="label flex items-center gap-1.5"><IcStamp size={12} /> Sequential approval chain</p>
      <p className="text-[12.5px] text-ink-soft mb-3">Memos and controlled documents move through these steps in order. Every decision is recorded with the deciding officer and timestamp.</p>
      <ol className="space-y-2">
        {chain.map((r, i) => (
          <li key={r} className="flex items-center gap-3 border border-line rounded-md px-3 py-2.5 bg-card">
            <span className="w-6 h-6 rounded-full bg-pine-900 text-brass-400 font-display font-bold text-[11px] flex items-center justify-center">{i + 1}</span>
            <span className="flex-1 text-[13.5px] font-medium text-ink">{r}</span>
            <Chip meta={{ label: 'Sequential', chip: 'bg-line-soft text-ink-faint', dot: 'bg-ink-faint' }} />
            <button className="btn-ghost btn-sm !px-1.5" disabled={!canUser('manageOrg')} onClick={() => setChain((c) => c.filter((x) => x !== r))} aria-label={`Remove ${r}`}><IcX size={13} /></button>
          </li>
        ))}
      </ol>
      {addable.length > 0 && (
        <button className="btn-ghost mt-3" disabled={!canUser('manageOrg')} onClick={() => setChain((c) => [...c, addable[0]])}><IcPlus size={13} /> Add step ({addable[0]})</button>
      )}
      <div className="flex gap-2 mt-4">
        <button className="btn-primary" disabled={!canUser('manageOrg')} onClick={() => { updateOrg({ approvalChain: chain }); }}>Save workflow</button>
        <button className="btn-ghost" onClick={() => { setChain(org.approvalChain); toast('Reverted to saved workflow', 'info'); }}>Revert</button>
      </div>
    </div>
  );
}

/* ── notifications ───────────────────────────────────────────────────── */
function NotifTab() {
  const { org, canUser, setNotificationPrefs } = useStore();
  const [prefs, setPrefs] = useState(org?.notificationPrefs ?? []);
  if (!org) return null;
  const set = (cat: string, key: 'inApp' | 'email' | 'browser', v: boolean) =>
    setPrefs((p) => p.map((x) => (x.category === cat ? { ...x, [key]: v } : x)));
  return (
    <div className="card p-4 max-w-2xl">
      <p className="label">Notification channels by category</p>
      <p className="text-[12.5px] text-ink-soft mb-3">In-app delivery is live in this demo. Email dispatch uses the configured transactional provider; SMS & WhatsApp channels are provider-ready.</p>
      <table className="w-full">
        <thead><tr><th className="th">Category</th><th className="th text-center">In-app</th><th className="th text-center">Email</th><th className="th text-center">Browser</th></tr></thead>
        <tbody>
          {prefs.map((p) => (
            <tr key={p.category}>
              <td className="td font-medium text-ink">{p.category}</td>
              {(['inApp', 'email', 'browser'] as const).map((k) => (
                <td key={k} className="td text-center">
                  <span className="inline-flex justify-center"><Toggle checked={p[k]} disabled={!canUser('manageOrg')} onChange={(v) => set(p.category, k, v)} /></span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn-primary mt-4" disabled={!canUser('manageOrg')} onClick={() => setNotificationPrefs(prefs)}>Save preferences</button>
    </div>
  );
}

/* ── audit ───────────────────────────────────────────────────────────── */
function AuditTab() {
  const { db, me } = useStore();
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const rows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return db.audit
      .filter((a) => a.orgId === me?.orgId)
      .filter((a) => !type || a.recordType === type)
      .filter((a) => !qq || [a.userName, a.action, a.target, a.recordType].some((s) => s.toLowerCase().includes(qq)))
      .slice(0, 120);
  }, [db.audit, me, q, type]);
  const types = Array.from(new Set(db.audit.filter((a) => a.orgId === me?.orgId).map((a) => a.recordType))).sort();
  return (
    <div>
      <div className="card p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"><IcSearch size={14} /></span>
          <input className="input !pl-8" placeholder="Search the audit trail…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input !w-auto" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All record types</option>{types.map((t) => <option key={t}>{t}</option>)}
        </select>
        <span className="ref text-ink-faint ml-auto">{rows.length} entries (capped view)</span>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead><tr><th className="th">When</th><th className="th">Officer</th><th className="th">Action</th><th className="th">Record</th><th className="th">Result</th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="td whitespace-nowrap"><span className="ref text-ink-soft">{fmtDateTime(a.at)}</span><span className="block text-[10px] text-ink-faint">{relTime(a.at)}</span></td>
                  <td className="td whitespace-nowrap font-medium text-ink">{a.userName}</td>
                  <td className="td text-ink-soft">{a.action}</td>
                  <td className="td min-w-[220px]"><span className="text-ink truncate block max-w-[340px]">{a.target}</span><span className="chip bg-line-soft text-ink-faint mt-0.5 capitalize">{a.recordType}</span></td>
                  <td className="td">{a.result === 'success'
                    ? <span className="chip bg-moss-100 text-moss-700"><IcCheck size={11} /> success</span>
                    : <span className="chip bg-clay-100 text-clay-700"><IcAlert size={11} /> denied</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11.5px] text-ink-faint mt-3 flex items-center gap-1.5"><IcShield size={13} /> Audit entries are append-only. Normal users cannot edit or delete them; administrators can export them for compliance review.</p>
    </div>
  );
}

/* ── danger zone ─────────────────────────────────────────────────────── */
function DangerTab() {
  const { resetDemo } = useStore();
  const [ask, setAsk] = useState(false);
  return (
    <div className="card p-4 max-w-2xl border-clay-100">
      <p className="label text-clay-600">Demo data controls</p>
      <p className="text-[13px] text-ink-soft leading-relaxed">
        This workspace persists entirely in your browser. Restoring demo data rebuilds the Cortexa Demo Foundation
        tenant — correspondence, matters, documents, meetings, tasks and the audit trail — to its original state.
        Organisations you onboarded are removed.
      </p>
      <button className="btn-danger mt-4" onClick={() => setAsk(true)}>Restore original demo data</button>
      <Confirm open={ask} onClose={() => setAsk(false)} title="Restore demo data?" confirmLabel="Restore demo data"
        body="All changes in this browser — new registrations, uploads, decisions and onboarded organisations — will be replaced with the original demo tenant. This cannot be undone."
        onConfirm={resetDemo} />
    </div>
  );
}
