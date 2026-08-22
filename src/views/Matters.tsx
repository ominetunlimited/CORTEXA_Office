import React, { useMemo, useState } from 'react';
import { useStore, canSee } from '../lib/store';
import { PageHead, Chip, EmptyState, Tabs, Avatar, Field, Modal, Confirm } from '../components/ui';
import { QAHost } from '../components/quick';
import {
  MATTER_STATUSES, CORR_STATUS_META, TASK_STATUS_META, MEETING_STATUS_META, SECURITY_META,
  DOC_STATUS_META, APPROVAL_META, MATTER_STATUSES as _MS, type Matter, type MatterStatus,
} from '../lib/types';
import { cx, daysUntil, dueLabel, fmtDate, fmtDateTime, fmtTime12, relTime } from '../lib/utils';
import {
  IcSeal, IcSearch, IcPlus, IcEnvelope, IcFile, IcUsers, IcCheckSquare, IcStamp,
  IcChevL, IcLink, IcHistory, IcEdit, IcArchive,
} from '../components/icons';

export function Matters() {
  const { db, me, users, departments, route, nav, canUser } = useStore();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [qa, setQa] = useState(false);

  const matters = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return db.matters
      .filter((m) => m.orgId === me?.orgId && !m.archived && canSee(me, m.security))
      .filter((m) => !status || m.status === status)
      .filter((m) => !qq || [m.title, m.fileNumber, m.description, m.category].some((s) => s.toLowerCase().includes(qq)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [db.matters, me, q, status]);

  const sel = route.name === 'matter' && route.id ? db.matters.find((m) => m.id === route.id) : undefined;
  if (sel) return <MatterDetail m={sel} />;

  return (
    <div>
      <PageHead kicker="Institutional memory" title="Matters & case files"
        sub="A matter gathers every letter, memo, meeting, task and decision around one issue — the answer to “what happened to that file?”">
        {canUser('create') && <button className="btn-primary" onClick={() => setQa(true)}><IcPlus size={15} /> Open matter file</button>}
      </PageHead>

      <div className="card p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"><IcSearch size={14} /></span>
          <input className="input !pl-8" placeholder="Search file number, title, category…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>{MATTER_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <span className="ref text-ink-faint ml-auto">{matters.length} file{matters.length === 1 ? '' : 's'}</span>
      </div>

      {matters.length === 0 ? (
        <div className="card"><EmptyState icon={<IcSeal size={20} />} title="No matter files yet"
          body="When an issue deserves a complete institutional history — letters, meetings, decisions — open a matter file for it." >
          {canUser('create') && <button className="btn-primary" onClick={() => setQa(true)}><IcPlus size={14} /> Open the first matter</button>}
        </EmptyState></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3.5 stagger">
          {matters.map((m) => {
            const corr = db.correspondence.filter((c) => c.matterId === m.id && !c.archived).length;
            const docs = db.documents.filter((d) => d.matterId === m.id && !d.archived).length;
            const mtgs = db.meetings.filter((x) => x.matterId === m.id && !x.archived).length;
            const tks = db.tasks.filter((t) => t.relatedType === 'matter' && t.relatedId === m.id && !t.archived).length;
            const owner = users.find((u) => u.id === m.ownerId);
            const statusMeta = m.status === 'Active' ? { label: 'Active', chip: 'bg-moss-100 text-moss-700', dot: 'bg-moss-600' }
              : m.status === 'Closed' ? { label: 'Closed', chip: 'bg-line-soft text-ink-soft', dot: 'bg-ink-faint' }
              : { label: 'Archived', chip: 'bg-line-soft text-ink-faint', dot: 'bg-ink-faint' };
            return (
              <button key={m.id} onClick={() => nav({ name: 'matter', id: m.id })}
                className="card p-4 text-left hover:border-pine-400 hover:shadow-md hover:-translate-y-px transition-all duration-200 cursor-pointer group">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="ref text-pine-700 font-semibold bg-pine-50 border border-pine-100 rounded px-2 py-0.5">{m.fileNumber}</span>
                  <Chip meta={statusMeta} />
                  <Chip meta={SECURITY_META[m.security]} />
                  <span className="ml-auto text-[10.5px] font-mono text-ink-faint">{relTime(m.updatedAt)}</span>
                </div>
                <h3 className="font-display font-bold text-[15.5px] text-ink mt-2.5 leading-snug group-hover:text-pine-700 transition-colors">{m.title}</h3>
                <p className="text-[12.5px] text-ink-soft mt-1 line-clamp-2 leading-relaxed">{m.description}</p>
                <div className="flex items-center gap-3.5 mt-3 text-[11.5px] text-ink-faint flex-wrap">
                  <span className="flex items-center gap-1"><IcEnvelope size={12} /> {corr}</span>
                  <span className="flex items-center gap-1"><IcFile size={12} /> {docs}</span>
                  <span className="flex items-center gap-1"><IcUsers size={12} /> {mtgs}</span>
                  <span className="flex items-center gap-1"><IcCheckSquare size={12} /> {tks}</span>
                  <span className="ml-auto flex items-center gap-1.5">
                    {owner && <Avatar name={owner.name} color={owner.color} size={20} />}
                    <span>{departments.find((d) => d.id === m.departmentId)?.name ?? 'General'}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <QAHost open={qa ? 'matter' : null} onClose={() => setQa(false)} />
    </div>
  );
}

/* ── matter detail ───────────────────────────────────────────────────── */
const KIND_ICON: Record<string, React.ReactNode> = {
  correspondence: <IcEnvelope size={13} />, document: <IcFile size={13} />, meeting: <IcUsers size={13} />,
  task: <IcCheckSquare size={13} />, approval: <IcStamp size={13} />, note: <IcEdit size={13} />,
};

function MatterDetail({ m }: { m: Matter }) {
  const { db, me, users, departments, nav, canUser, updateMatter, linkToMatter, addComment, archiveRecord } = useStore();
  const [tab, setTab] = useState('timeline');
  const [linkOpen, setLinkOpen] = useState(false);
  const [archiveAsk, setArchiveAsk] = useState(false);
  const [note, setNote] = useState('');
  const [comment, setComment] = useState('');

  const corr = db.correspondence.filter((c) => c.orgId === me?.orgId && c.matterId === m.id && !c.archived && canSee(me, c.security)).sort((a, b) => b.dateReceived.localeCompare(a.dateReceived));
  const docs = db.documents.filter((d) => d.orgId === me?.orgId && d.matterId === m.id && !d.archived && canSee(me, d.security));
  const mtgs = db.meetings.filter((x) => x.orgId === me?.orgId && x.matterId === m.id && !x.archived).sort((a, b) => b.date.localeCompare(a.date));
  const tasks = db.tasks.filter((t) => t.orgId === me?.orgId && t.relatedType === 'matter' && t.relatedId === m.id && !t.archived);
  const appr = db.approvals.filter((a) => a.orgId === me?.orgId && docs.some((d) => d.id === a.recordId));
  const comments = db.comments.filter((x) => x.targetType === 'matter' && x.targetId === m.id);
  const events = [...m.events].sort((a, b) => b.at.localeCompare(a.at));
  const owner = users.find((u) => u.id === m.ownerId);
  const statusMeta = m.status === 'Active' ? { label: 'Active', chip: 'bg-moss-100 text-moss-700', dot: 'bg-moss-600' }
    : m.status === 'Closed' ? { label: 'Closed', chip: 'bg-line-soft text-ink-soft', dot: 'bg-ink-faint' }
    : { label: 'Archived', chip: 'bg-line-soft text-ink-faint', dot: 'bg-ink-faint' };

  return (
    <div>
      <button className="btn-ghost btn-sm mb-3" onClick={() => nav({ name: 'matters' })}><IcChevL size={13} /> All matters</button>
      <div className="card p-5 mb-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="ref text-[13px] font-semibold text-pine-700 bg-pine-50 border border-pine-100 rounded px-2 py-0.5">{m.fileNumber}</span>
              <Chip meta={statusMeta} /><Chip meta={SECURITY_META[m.security]} />
              <span className="chip bg-line-soft text-ink-soft">{m.category}</span>
            </div>
            <h1 className="font-display font-extrabold text-[22px] text-ink tracking-tight mt-2 leading-tight">{m.title}</h1>
            <p className="text-[13px] text-ink-soft mt-1.5 leading-relaxed max-w-2xl">{m.description}</p>
            <div className="flex items-center gap-4 mt-3 text-[12px] text-ink-faint flex-wrap">
              <span className="flex items-center gap-1.5">{owner && <Avatar name={owner.name} color={owner.color} size={22} />} Owner · {owner?.name ?? '—'}</span>
              <span>{departments.find((d) => d.id === m.departmentId)?.name ?? 'General'}</span>
              <span>Opened {fmtDate(m.createdAt)}</span>
              <span>Updated {relTime(m.updatedAt)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {canUser('create') && (
              <select className="input !w-44" value={m.status} onChange={(e) => updateMatter(m.id, { status: e.target.value as MatterStatus }, `Matter status: ${e.target.value}`)}>
                {MATTER_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            )}
            {canUser('create') && <button className="btn-ghost btn-sm" onClick={() => setLinkOpen(true)}><IcLink size={13} /> Link existing record</button>}
            {canUser('archive') && <button className="btn-ghost btn-sm !text-clay-600" onClick={() => setArchiveAsk(true)}><IcArchive size={13} /> Archive file</button>}
          </div>
        </div>
      </div>

      <Tabs active={tab} onChange={setTab} tabs={[
        { id: 'timeline', label: 'Timeline', count: events.length },
        { id: 'correspondence', label: 'Correspondence', count: corr.length },
        { id: 'documents', label: 'Documents', count: docs.length },
        { id: 'meetings', label: 'Meetings', count: mtgs.length },
        { id: 'tasks', label: 'Tasks', count: tasks.length },
        { id: 'approvals', label: 'Approvals', count: appr.length },
        { id: 'comments', label: 'Comments', count: comments.length },
      ]} />

      <div className="mt-4">
        {tab === 'timeline' && (
          <div className="card p-5 max-w-3xl">
            <p className="label flex items-center gap-1.5"><IcHistory size={12} /> Chronological institutional history</p>
            {events.length === 0 ? <p className="text-[13px] text-ink-faint py-6 text-center">No events yet — register correspondence or documents into this matter.</p> : (
              <ol className="mt-2">
                {events.map((e, i) => (
                  <li key={e.id} className="relative pl-9 pb-4 last:pb-0">
                    {i < events.length - 1 && <span className="absolute left-[13px] top-7 bottom-0 w-px bg-line" />}
                    <span className="absolute left-0 top-0.5 w-[27px] h-[27px] rounded-full bg-pine-900 text-brass-400 flex items-center justify-center border-2 border-paper">{KIND_ICON[e.kind]}</span>
                    <p className="text-[10.5px] font-mono text-ink-faint">{fmtDateTime(e.at)}</p>
                    <p className="text-[13.5px] text-ink font-medium leading-snug">{e.text}</p>
                  </li>
                ))}
              </ol>
            )}
            {canUser('create') && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-line-soft">
                <input className="input flex-1" placeholder="Add a note to the matter history…" value={note} onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && note.trim()) { updateMatter(m.id, { events: [...m.events, { id: `ev_${Date.now()}`, at: new Date().toISOString(), text: note.trim(), kind: 'note' }] }, 'Note added to matter'); setNote(''); } }} />
                <button className="btn-ghost" onClick={() => { if (note.trim()) { updateMatter(m.id, { events: [...m.events, { id: `ev_${Date.now()}`, at: new Date().toISOString(), text: note.trim(), kind: 'note' }] }, 'Note added to matter'); setNote(''); } }}>Add note</button>
              </div>
            )}
          </div>
        )}

        {tab === 'correspondence' && (
          <RecordList empty="No correspondence threaded into this matter yet.">
            {corr.map((c) => (
              <RowBtn key={c.id} onClick={() => nav({ name: 'correspondence', id: c.id })}
                left={<span className="ref text-pine-700 font-medium whitespace-nowrap">{c.ref}</span>}
                title={c.subject}
                sub={`${c.direction === 'incoming' ? c.senderOrg ?? c.sender ?? '' : c.recipientOrg ?? c.recipient} · ${fmtDate(c.dateReceived)}`}
                right={<Chip meta={CORR_STATUS_META[c.status]} />} />
            ))}
          </RecordList>
        )}

        {tab === 'documents' && (
          <RecordList empty="No documents filed under this matter yet.">
            {docs.map((d) => (
              <RowBtn key={d.id} onClick={() => nav({ name: 'documents', id: d.id })}
                left={<span className="ref text-pine-700 font-medium whitespace-nowrap">{d.fileNumber}</span>}
                title={d.title}
                sub={`${d.category} · v${d.versions[d.versions.length - 1].version} · ${relTime(d.updatedAt)}`}
                right={<Chip meta={DOC_STATUS_META[d.status]} />} />
            ))}
          </RecordList>
        )}

        {tab === 'meetings' && (
          <RecordList empty="No meetings connected to this matter yet.">
            {mtgs.map((mt) => (
              <RowBtn key={mt.id} onClick={() => nav({ name: 'meeting', id: mt.id })}
                left={<span className="ref text-pine-700 font-medium whitespace-nowrap">{fmtDate(mt.date)}</span>}
                title={mt.title}
                sub={`${fmtTime12(mt.startTime)} · ${mt.venue}`}
                right={<Chip meta={MEETING_STATUS_META[mt.status]} />} />
            ))}
          </RecordList>
        )}

        {tab === 'tasks' && (
          <RecordList empty="No tasks linked to this matter yet.">
            {tasks.map((t) => {
              const assignee = users.find((u) => u.id === t.assigneeId);
              const overdue = t.dueDate && daysUntil(t.dueDate) < 0 && !['Completed', 'Cancelled'].includes(t.status);
              return (
                <RowBtn key={t.id} onClick={() => nav({ name: 'tasks', id: t.id })}
                  left={assignee ? <Avatar name={assignee.name} color={assignee.color} size={24} /> : <span className="w-6" />}
                  title={t.title}
                  sub={`${dueLabel(t.dueDate).text}${assignee ? ` · ${assignee.name}` : ''}`}
                  right={<Chip meta={overdue ? TASK_STATUS_META.Overdue : TASK_STATUS_META[t.status]} />} />
              );
            })}
          </RecordList>
        )}

        {tab === 'approvals' && (
          <RecordList empty="No approvals raised on this matter's documents.">
            {appr.map((a) => (
              <RowBtn key={a.id} onClick={() => nav({ name: 'documents', id: a.recordId })}
                left={<span className="text-brass-600"><IcStamp size={16} /></span>}
                title={a.title}
                sub={`Step ${a.currentStep + 1} of ${a.chain.length} · ${a.chain[a.currentStep]?.role ?? ''}`}
                right={<Chip meta={APPROVAL_META[a.overall]} />} />
            ))}
          </RecordList>
        )}

        {tab === 'comments' && (
          <div className="max-w-2xl space-y-2.5">
            {comments.length === 0 && <div className="card"><p className="px-4 py-6 text-[13px] text-ink-faint text-center">No comments on this matter.</p></div>}
            {comments.map((cm) => {
              const u = users.find((x) => x.id === cm.userId);
              return (
                <div key={cm.id} className="card px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    {u && <Avatar name={u.name} color={u.color} size={22} />}
                    <span className="text-[12.5px] font-semibold text-ink">{u?.name}</span>
                    <span className="ml-auto text-[10.5px] font-mono text-ink-faint">{relTime(cm.at)}</span>
                  </div>
                  <p className="text-[13px] text-ink-soft mt-1.5 leading-relaxed">{cm.text}</p>
                </div>
              );
            })}
            {canUser('create') && (
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="Comment on this matter…" value={comment} onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && comment.trim()) { addComment('matter', m.id, comment.trim()); setComment(''); } }} />
                <button className="btn-ghost" onClick={() => { if (comment.trim()) { addComment('matter', m.id, comment.trim()); setComment(''); } }}>Post</button>
              </div>
            )}
          </div>
        )}
      </div>

      <LinkRecordModal open={linkOpen} onClose={() => setLinkOpen(false)} matterId={m.id} onLink={linkToMatter} />
      <Confirm open={archiveAsk} onClose={() => setArchiveAsk(false)} title="Archive this matter file?"
        body={<>The complete history of <span className="font-semibold text-ink">{m.title}</span> moves to the institutional archive. Nothing is deleted; the file can be restored at any time.</>}
        confirmLabel="Archive file" onConfirm={() => { archiveRecord('matter', m.id); nav({ name: 'matters' }); }} />
    </div>
  );
}

function RecordList({ children, empty }: { children: React.ReactNode; empty: string }) {
  const arr = React.Children.toArray(children);
  if (!arr.length) return <div className="card"><p className="px-4 py-8 text-[13px] text-ink-faint text-center">{empty}</p></div>;
  return <div className="card divide-y divide-line-soft overflow-hidden">{children}</div>;
}

function RowBtn({ onClick, left, title, sub, right }: { onClick: () => void; left: React.ReactNode; title: string; sub: string; right: React.ReactNode }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-pine-50/70 transition-colors cursor-pointer text-left">
      <span className="shrink-0">{left}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13.5px] font-medium text-ink truncate">{title}</span>
        <span className="block text-[11.5px] text-ink-faint truncate mt-0.5">{sub}</span>
      </span>
      <span className="shrink-0">{right}</span>
    </button>
  );
}

function LinkRecordModal({ open, onClose, matterId, onLink }: {
  open: boolean; onClose: () => void; matterId: string;
  onLink: (type: 'correspondence' | 'document' | 'meeting' | 'task', id: string, matterId: string) => void;
}) {
  const { db, me } = useStore();
  const [kind, setKind] = useState<'correspondence' | 'document' | 'meeting' | 'task'>('correspondence');
  const [recId, setRecId] = useState('');
  const pool = useMemo(() => {
    if (kind === 'correspondence') return db.correspondence.filter((c) => c.orgId === me?.orgId && !c.archived && c.matterId !== matterId).map((c) => ({ id: c.id, label: `${c.ref} — ${c.subject}` }));
    if (kind === 'document') return db.documents.filter((d) => d.orgId === me?.orgId && !d.archived && d.matterId !== matterId).map((d) => ({ id: d.id, label: `${d.fileNumber} — ${d.title}` }));
    if (kind === 'meeting') return db.meetings.filter((m) => m.orgId === me?.orgId && !m.archived && m.matterId !== matterId).map((m) => ({ id: m.id, label: `${m.date} — ${m.title}` }));
    return db.tasks.filter((t) => t.orgId === me?.orgId && !t.archived && t.relatedId !== matterId).map((t) => ({ id: t.id, label: `${t.ref} — ${t.title}` }));
  }, [kind, db, me, matterId]);

  return (
    <Modal open={open} onClose={onClose} title="Link existing record" subtitle="Adds the record to this matter's institutional history"
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={!recId} onClick={() => { onLink(kind, recId, matterId); onClose(); setRecId(''); }}>Link record</button></>}>
      <div className="space-y-3">
        <Field label="Record type">
          <select className="input" value={kind} onChange={(e) => { setKind(e.target.value as typeof kind); setRecId(''); }}>
            <option value="correspondence">Correspondence</option><option value="document">Document</option>
            <option value="meeting">Meeting</option><option value="task">Task</option>
          </select>
        </Field>
        <Field label="Record">
          <select className="input" value={recId} onChange={(e) => setRecId(e.target.value)}>
            <option value="">Choose a record…</option>
            {pool.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
      </div>
    </Modal>
  );
}

void [_MS, cx];
