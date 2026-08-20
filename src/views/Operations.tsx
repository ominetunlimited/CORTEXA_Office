import React, { useMemo, useState } from 'react';
import { useStore, canSee } from '../lib/store';
import { PageHead, Chip, EmptyState, Modal, Field, Seg, Avatar, Reveal } from '../components/ui';
import { cx, daysUntil, dueLabel, fmtDate, dateOnly } from '../lib/utils';
import { ASSET_STATUSES, type Asset, type AssetStatus } from '../lib/types';
import { IcClock, IcPlus, IcSeal, IcColumns, IcAlert, IcCheckSquare, IcEnvelope, IcCalendar, IcStamp, IcFile } from '../components/icons';

/* ── Deadline Centre ── */
interface Deadline { id: string; kind: 'correspondence' | 'task' | 'meeting' | 'invoice' | 'approval'; title: string; sub: string; date: string; route: { name: any; id?: string }; icon: React.ReactNode }

export function DeadlinesView() {
  const { db, me, users, departments, nav } = useStore();
  const [when, setWhen] = useState<'today' | 'tomorrow' | 'week' | 'overdue' | 'all'>('week');
  const [dept, setDept] = useState('');

  const items = useMemo<Deadline[]>(() => {
    const out: Deadline[] = [];
    db.correspondence.filter((c) => c.orgId === me?.orgId && !c.archived && canSee(me, c.security) && c.responseRequired && c.responseDeadline && !['Responded', 'Closed', 'Archived'].includes(c.status))
      .forEach((c) => out.push({ id: c.id, kind: 'correspondence', title: c.subject, sub: `${c.ref} · ${c.senderOrg ?? c.recipientOrg ?? ''}`, date: c.responseDeadline!, route: { name: 'correspondence', id: c.id }, icon: <IcEnvelope size={14} /> }));
    db.tasks.filter((t) => t.orgId === me?.orgId && !t.archived && !['Completed', 'Cancelled'].includes(t.status) && t.dueDate)
      .forEach((t) => out.push({ id: t.id, kind: 'task', title: t.title, sub: `${users.find((u) => u.id === t.assigneeId)?.name ?? 'Unassigned'} · ${t.ref}`, date: t.dueDate!, route: { name: 'tasks', id: t.id }, icon: <IcCheckSquare size={14} /> }));
    db.meetings.filter((m) => m.orgId === me?.orgId && !m.archived && !['Cancelled', 'Completed'].includes(m.status))
      .forEach((m) => out.push({ id: m.id, kind: 'meeting', title: m.title, sub: `${m.venue} · ${m.startTime}`, date: m.date, route: { name: 'meeting', id: m.id }, icon: <IcCalendar size={14} /> }));
    db.invoices.filter((i) => i.orgId === me?.orgId && i.dueDate && !['Paid', 'Cancelled'].includes(i.status))
      .forEach((i) => out.push({ id: i.id, kind: 'invoice', title: `Invoice ${i.ref}`, sub: `${db.vendors.find((v) => v.id === i.vendorId)?.name ?? 'Vendor'}`, date: i.dueDate!, route: { name: 'finance' }, icon: <IcFile size={14} /> }));
    db.approvals.filter((a) => a.orgId === me?.orgId && a.overall === 'Pending')
      .forEach((a) => out.push({ id: a.id, kind: 'approval', title: a.title, sub: `Awaiting ${a.chain[a.currentStep]?.role}`, date: a.createdAt, route: { name: 'documents', id: a.recordId }, icon: <IcStamp size={14} /> }));
    return out;
  }, [db, me, users]);

  const filtered = useMemo(() => {
    const today = dateOnly(0);
    let list: Deadline[];
    if (when === 'all') list = [...items];
    else if (when === 'overdue') list = items.filter((i) => i.kind === 'approval' || daysUntil(i.date) < 0);
    else {
      const dated = items.filter((i) => i.kind !== 'approval');
      if (when === 'today') list = dated.filter((i) => i.date.slice(0, 10) === today);
      else if (when === 'tomorrow') list = dated.filter((i) => daysUntil(i.date) === 1);
      else list = dated.filter((i) => { const d = daysUntil(i.date); return d >= 0 && d <= 7; });
    }
    if (dept) list = list.filter((i) => {
      if (i.kind === 'correspondence') return db.correspondence.find((c) => c.id === i.id)?.departmentId === dept;
      if (i.kind === 'task') return db.tasks.find((t) => t.id === i.id)?.departmentId === dept;
      return true;
    });
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [items, when, dept, db]);

  const overdueCount = items.filter((i) => i.kind !== 'approval' && daysUntil(i.date) < 0).length;

  return (
    <div>
      <PageHead kicker="Deadline centre" title="Every deadline in one ledger"
        sub="Correspondence responses, task due dates, meetings, invoices and pending approvals — nothing slips through.">
        {overdueCount > 0 && <span className="chip bg-clay-100 text-clay-700 pulse-urgent"><IcAlert size={12} /> {overdueCount} overdue</span>}
      </PageHead>

      <div className="card p-3 mb-4 flex flex-wrap items-center gap-2">
        <Seg value={when} onChange={setWhen} options={[{ v: 'today', label: 'Today' }, { v: 'tomorrow', label: 'Tomorrow' }, { v: 'week', label: 'This week' }, { v: 'overdue', label: 'Overdue' }, { v: 'all', label: 'All' }]} />
        <select className="input !w-auto ml-auto" value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="">All departments</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><EmptyState icon={<IcClock size={20} />} title="Nothing due in this view"
          body="No deadlines match the current filter. Adjust the range or department to see more." /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((i) => {
            const d = daysUntil(i.date);
            const due = dueLabel(i.date);
            return (
              <button key={i.kind + i.id} onClick={() => nav(i.route)}
                className={cx('w-full card px-4 py-3 flex items-center gap-3 text-left hover:border-pine-400 hover:-translate-y-px hover:shadow-md transition-all cursor-pointer', d < 0 && 'border-clay-500/40')}>
                <span className={cx('w-8 h-8 rounded-md flex items-center justify-center shrink-0',
                  i.kind === 'correspondence' && 'bg-steel-100 text-steel-600',
                  i.kind === 'task' && 'bg-pine-100 text-pine-600',
                  i.kind === 'meeting' && 'bg-brass-100 text-brass-600',
                  i.kind === 'invoice' && 'bg-moss-100 text-moss-700',
                  i.kind === 'approval' && 'bg-brass-100 text-brass-600')}>{i.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13.5px] font-medium text-ink truncate">{i.title}</span>
                  <span className="block text-[11.5px] text-ink-faint truncate">{i.sub}</span>
                </span>
                <span className="text-right shrink-0">
                  <span className={cx('block text-[12px] font-semibold', d < 0 ? 'text-clay-600' : d === 0 ? 'text-brass-600' : 'text-ink-soft')}>{i.kind === 'approval' ? 'Pending' : due.text}</span>
                  {i.kind !== 'approval' && <span className="block text-[10.5px] text-ink-faint font-mono">{fmtDate(i.date)}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Announcements ── */
export function AnnouncementsView() {
  const { db, me, users, departments, canUser, addAnnouncement } = useStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [priority, setPriority] = useState<'Routine' | 'Important' | 'Urgent'>('Important'); const [target, setTarget] = useState(''); const [expires, setExpires] = useState('');
  const list = useMemo(() => db.announcements.filter((a) => a.orgId === me?.orgId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [db.announcements, me]);
  const PMETA = { Routine: { chip: 'bg-line-soft text-ink-soft', dot: 'bg-ink-faint' }, Important: { chip: 'bg-brass-100 text-brass-700', dot: 'bg-brass-500' }, Urgent: { chip: 'bg-clay-100 text-clay-700', dot: 'bg-clay-500' } };

  return (
    <div>
      <PageHead kicker="Communications" title="Organisation announcements"
        sub="Published notices appear on every member's dashboard until they expire.">
        {canUser('announce') && <button className="btn-primary" onClick={() => setOpen(true)}><IcPlus size={14} /> Publish announcement</button>}
      </PageHead>
      <div className="grid md:grid-cols-2 gap-3.5 stagger">
        {list.length === 0 && <div className="card md:col-span-2"><EmptyState icon={<IcSeal size={20} />} title="No announcements" body="Publish notices for holidays, policy updates, meetings and emergencies." /></div>}
        {list.map((a) => {
          const author = users.find((u) => u.id === a.createdBy);
          const targetDept = departments.find((d) => d.id === a.targetDepartmentId);
          return (
            <Reveal key={a.id} className={cx('card p-4', a.priority === 'Urgent' && 'border-clay-500/50')}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display font-bold text-[15px] text-ink leading-snug">{a.title}</h3>
                <Chip meta={{ label: a.priority, chip: PMETA[a.priority].chip, dot: PMETA[a.priority].dot }} />
              </div>
              <p className="text-[12.5px] text-ink-soft mt-1.5 leading-relaxed">{a.body}</p>
              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-line-soft text-[11px] text-ink-faint">
                {author && <Avatar name={author.name} color={author.color} size={20} />}
                <span>{author?.name ?? '—'} · {fmtDate(a.createdAt)}</span>
                {targetDept && <span className="chip bg-line-soft text-ink-soft">{targetDept.name}</span>}
                {a.expiresAt && <span className="ml-auto ref">Expires {fmtDate(a.expiresAt)}</span>}
              </div>
            </Reveal>
          );
        })}
      </div>
      {open && (
        <Modal open onClose={() => setOpen(false)} title="Publish announcement" subtitle="Notifies every member (or a target department) and pins it to dashboards" w="max-w-lg"
          footer={<><button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={!title.trim() || !body.trim()} onClick={() => { addAnnouncement({ title: title.trim(), body: body.trim(), priority, targetDepartmentId: target || undefined, expiresAt: expires || undefined }); setOpen(false); setTitle(''); setBody(''); }}>Publish</button></>}>
          <div className="space-y-3">
            <Field label="Title" req><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            <Field label="Message" req><textarea className="textarea" rows={3} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Priority"><select className="input" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}><option>Routine</option><option>Important</option><option>Urgent</option></select></Field>
              <Field label="Audience"><select className="input" value={target} onChange={(e) => setTarget(e.target.value)}><option value="">Everyone</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
              <Field label="Expires"><input className="input" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} /></Field>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── Assets ── */
export function AssetsView() {
  const { db, me, users, departments, canUser, addAsset, setAssetStatus } = useStore();
  const [q, setQ] = useState(''); const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(''); const [cat, setCat] = useState('Computer'); const [cost, setCost] = useState(''); const [dept, setDept] = useState(''); const [loc, setLoc] = useState('');
  const list = useMemo(() => db.assets.filter((a) => a.orgId === me?.orgId)
    .filter((a) => (!status || a.status === status) && (!q || [a.name, a.assetCode, a.category, a.serial ?? ''].some((s) => s.toLowerCase().includes(q.toLowerCase())))), [db.assets, me, q, status]);
  const AMETA: Record<AssetStatus, { chip: string; dot: string }> = {
    Available: { chip: 'bg-moss-100 text-moss-700', dot: 'bg-moss-600' },
    Assigned: { chip: 'bg-steel-100 text-steel-700', dot: 'bg-steel-500' },
    'Under Repair': { chip: 'bg-brass-100 text-brass-700', dot: 'bg-brass-500' },
    Lost: { chip: 'bg-clay-100 text-clay-700', dot: 'bg-clay-500' },
    Retired: { chip: 'bg-line-soft text-ink-soft', dot: 'bg-ink-faint' },
    Disposed: { chip: 'bg-line-soft text-ink-faint', dot: 'bg-ink-faint' },
  };
  const totalValue = list.reduce((s, a) => s + (a.cost ?? 0), 0);

  return (
    <div>
      <PageHead kicker="Asset register" title="What the organisation owns"
        sub="Equipment, vehicles and furniture — with custody, condition and value on record.">
        {canUser('finance') && <button className="btn-primary" onClick={() => setOpen(true)}><IcPlus size={14} /> Register asset</button>}
      </PageHead>
      <div className="card p-3 mb-4 flex flex-wrap items-center gap-2">
        <input className="input !w-auto flex-1 min-w-[180px]" placeholder="Search assets…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>{ASSET_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <span className="ml-auto ref text-ink-faint">{list.length} assets · register value {`₦${totalValue.toLocaleString()}`}</span>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3.5 stagger">
        {list.length === 0 && <div className="card md:col-span-3"><EmptyState icon={<IcColumns size={20} />} title="No assets" body="Register computers, vehicles, cameras and equipment to track custody and condition." /></div>}
        {list.map((a) => {
          const assignee = users.find((u) => u.id === a.assignedToId);
          const deptName = departments.find((d) => d.id === a.departmentId)?.name;
          return (
            <div key={a.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-display font-bold text-[14.5px] text-ink leading-snug">{a.name}</p><p className="ref text-pine-700 text-[11px] mt-0.5">{a.assetCode}</p></div>
                <Chip meta={{ label: a.status, chip: AMETA[a.status].chip, dot: AMETA[a.status].dot }} />
              </div>
              <div className="mt-2.5 space-y-1 text-[11.5px] text-ink-soft">
                <p>{a.category}{deptName ? ` · ${deptName}` : ''}</p>
                {a.serial && <p className="ref">SN {a.serial}</p>}
                {a.location && <p>{a.location}</p>}
                {a.cost !== undefined && <p>Value <span className="ref font-bold text-ink">{`₦${a.cost.toLocaleString()}`}</span></p>}
              </div>
              <div className="mt-3 pt-2.5 border-t border-line-soft flex items-center gap-2">
                {assignee ? (<><Avatar name={assignee.name} color={assignee.color} size={22} /><span className="text-[11.5px] text-ink-soft flex-1 truncate">{assignee.name}</span></>) : <span className="text-[11.5px] text-ink-faint flex-1">Unassigned</span>}
                {canUser('finance') && a.status === 'Assigned' && <button className="btn-ghost btn-sm" onClick={() => setAssetStatus(a.id, 'Available')}>Return</button>}
                {canUser('finance') && a.status === 'Available' && <button className="btn-ghost btn-sm" onClick={() => setAssetStatus(a.id, 'Assigned', me?.id)}>Assign</button>}
              </div>
            </div>
          );
        })}
      </div>
      {open && (
        <Modal open onClose={() => setOpen(false)} title="Register asset" w="max-w-lg"
          footer={<><button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={!name.trim()} onClick={() => { addAsset({ name: name.trim(), category: cat, cost: cost ? Number(cost) : undefined, departmentId: dept || undefined, location: loc || undefined, status: 'Available' }); setOpen(false); setName(''); setCost(''); setLoc(''); }}>Register</button></>}>
          <div className="space-y-3">
            <Field label="Asset name" req><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dell Latitude 7440" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category"><select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>{['Computer', 'Phone', 'Printer', 'Camera', 'Presentation', 'Furniture', 'Vehicle', 'Equipment'].map((c) => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Cost"><input className="input" type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Department"><select className="input" value={dept} onChange={(e) => setDept(e.target.value)}><option value="">None</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
              <Field label="Location"><input className="input" value={loc} onChange={(e) => setLoc(e.target.value)} /></Field>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
