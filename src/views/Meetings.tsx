import React, { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { PageHead, Chip, EmptyState, Drawer, KV, Avatar, Field, Modal, Seg, Confirm } from '../components/ui';
import { QAHost } from '../components/quick';
import {
  MEETING_STATUSES, MEETING_STATUS_META, RESPONSE_OPTIONS, RESPONSE_META,
  type Meeting, type MeetingStatus, type ResponseOption,
} from '../lib/types';
import { cx, daysUntil, fmtDate, fmtTime12, fmtWeekday, relTime, dateOnly } from '../lib/utils';
import { IcUsers, IcSearch, IcPlus, IcPin, IcClock, IcChevL, IcCheck, IcSeal, IcFile, IcArchive } from '../components/icons';

export function Meetings() {
  const { db, me, users, route, nav, canUser } = useStore();
  const [q, setQ] = useState('');
  const [when, setWhen] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [status, setStatus] = useState('');
  const [qa, setQa] = useState(false);

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const today = dateOnly(0);
    return db.meetings
      .filter((m) => m.orgId === me?.orgId && !m.archived)
      .filter((m) => (when === 'upcoming' ? m.date >= today : when === 'past' ? m.date < today : true))
      .filter((m) => !status || m.status === status)
      .filter((m) => !qq || [m.title, m.ref, m.venue, m.description, ...m.externalOrgs].some((s) => s.toLowerCase().includes(qq)))
      .sort((a, b) => (when === 'past' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)));
  }, [db.meetings, me, q, when, status]);

  const sel = route.name === 'meeting' && route.id ? db.meetings.find((m) => m.id === route.id) : undefined;
  if (sel) return <MeetingDetail mtg={sel} />;

  return (
    <div>
      <PageHead kicker="Meetings & invitation registry" title="Institutional calendar of meetings"
        sub="Invitations are registered, executives are notified, responses are tracked and minutes become records.">
        {canUser('create') && <button className="btn-primary" onClick={() => setQa(true)}><IcPlus size={15} /> Schedule meeting</button>}
      </PageHead>

      <div className="card p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"><IcSearch size={14} /></span>
          <input className="input !pl-8" placeholder="Search meetings, venues, organisations…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Seg value={when} onChange={setWhen} options={[{ v: 'upcoming', label: 'Upcoming' }, { v: 'past', label: 'Past' }, { v: 'all', label: 'All' }]} />
        <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Status</option>{MEETING_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {list.length === 0 ? (
        <div className="card"><EmptyState icon={<IcUsers size={20} />} title="No meetings scheduled"
          body="Nothing matches this view. Schedule a meeting or register a received invitation from the quick actions.">
          {canUser('create') && <button className="btn-primary" onClick={() => setQa(true)}><IcPlus size={14} /> Schedule the first meeting</button>}
        </EmptyState></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3.5 stagger">
          {list.map((m) => {
            const du = daysUntil(m.date);
            const dayLabel = du === 0 ? 'Today' : du === 1 ? 'Tomorrow' : du < 0 ? `${fmtDate(m.date)}` : `${fmtWeekday(m.date)} · ${fmtDate(m.date)}`;
            const organiser = users.find((u) => u.id === m.organiserId);
            return (
              <button key={m.id} onClick={() => nav({ name: 'meeting', id: m.id })}
                className={cx('card p-4 text-left hover:border-pine-400 hover:shadow-md hover:-translate-y-px transition-all duration-200 cursor-pointer group', m.status === 'Cancelled' && 'opacity-65')}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cx('chip', du === 0 && m.date >= dateOnly(0) ? 'bg-pine-700 text-pine-50' : 'bg-line-soft text-ink-soft')}>{dayLabel}</span>
                  <Chip meta={MEETING_STATUS_META[m.status]} />
                  {m.isInvitation && <span className="chip bg-brass-100 text-brass-700"><IcSeal size={11} /> Invitation · {m.response}</span>}
                  <span className="ml-auto ref text-ink-faint">{fmtTime12(m.startTime)}</span>
                </div>
                <h3 className="font-display font-bold text-[15px] text-ink mt-2 leading-snug group-hover:text-pine-700 transition-colors">{m.title}</h3>
                <p className="text-[12px] text-ink-faint mt-1 flex items-center gap-1.5"><IcPin size={12} /> {m.venue}{m.virtualLink ? ' · virtual link attached' : ''}</p>
                <div className="flex items-center mt-3 -space-x-1.5">
                  {m.participantIds.slice(0, 6).map((pid) => {
                    const u = users.find((x) => x.id === pid);
                    return u ? <Avatar key={pid} name={u.name} color={u.color} size={22} className="ring-2 ring-card" /> : null;
                  })}
                  {organiser && <span className="text-[11px] text-ink-faint ml-3.5">Organised by {organiser.name}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
      <QAHost open={qa ? 'meeting' : null} onClose={() => setQa(false)} />
    </div>
  );
}

/* ── meeting detail ──────────────────────────────────────────────────── */
function MeetingDetail({ mtg }: { mtg: Meeting }) {
  const { db, me, users, nav, canUser, setMeetingResponse, updateMeeting, completeMeeting, createTask, archiveRecord } = useStore();
  const [minutesOpen, setMinutesOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [archiveAsk, setArchiveAsk] = useState(false);
  const organiser = users.find((u) => u.id === mtg.organiserId);
  const corr = mtg.relatedCorrId ? db.correspondence.find((c) => c.id === mtg.relatedCorrId) : undefined;
  const matter = db.matters.find((m) => m.id === mtg.matterId);
  const minutes = mtg.minutesDocId ? db.documents.find((doc) => doc.id === mtg.minutesDocId) : undefined;
  const du = daysUntil(mtg.date);
  const isParticipant = mtg.participantIds.includes(me?.id ?? '') || mtg.organiserId === me?.id;

  return (
    <div>
      <button className="btn-ghost btn-sm mb-3" onClick={() => nav({ name: 'meetings' })}><IcChevL size={13} /> All meetings</button>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cx('chip', du === 0 && mtg.date >= dateOnly(0) ? 'bg-pine-700 text-pine-50' : 'bg-line-soft text-ink-soft')}>
                {du === 0 ? 'Today' : du === 1 ? 'Tomorrow' : fmtWeekday(mtg.date)} · {fmtDate(mtg.date)}
              </span>
              <Chip meta={MEETING_STATUS_META[mtg.status]} />
              {mtg.isInvitation && <Chip meta={RESPONSE_META[mtg.response]} label={`Response: ${mtg.response}`} />}
              <span className="ml-auto ref text-ink-faint">{mtg.ref}</span>
            </div>
            <h1 className="font-display font-extrabold text-[22px] text-ink tracking-tight mt-2.5 leading-tight">{mtg.title}</h1>
            <p className="text-[13px] text-ink-soft mt-1.5 leading-relaxed">{mtg.description || 'No description provided.'}</p>
            <div className="grid sm:grid-cols-2 gap-x-6 mt-4">
              <KV k="Time" v={`${fmtTime12(mtg.startTime)} – ${fmtTime12(mtg.endTime)}`} />
              <KV k="Venue" v={mtg.venue} />
              <KV k="Organiser" v={organiser?.name ?? '—'} />
              <KV k="Virtual link" v={mtg.virtualLink ? <span className="font-mono text-[11.5px]">{mtg.virtualLink}</span> : '—'} />
              <KV k="External organisations" v={mtg.externalOrgs.join(', ') || '—'} />
              <KV k="Matter" v={matter ? <button className="text-pine-700 font-medium hover:underline cursor-pointer" onClick={() => nav({ name: 'matter', id: matter.id })}>{matter.fileNumber}</button> : '—'} />
            </div>
            {corr && (
              <button onClick={() => nav({ name: 'correspondence', id: corr.id })} className="mt-3 w-full card px-3 py-2.5 text-left hover:border-pine-400 cursor-pointer flex items-center gap-2">
                <span className="text-pine-600"><IcFile size={14} /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[10.5px] uppercase tracking-wider font-semibold text-ink-faint">Arising from correspondence</span>
                  <span className="block text-[12.5px] font-medium text-ink truncate">{corr.ref} · {corr.subject}</span>
                </span>
              </button>
            )}
          </div>

          <div className="card p-5">
            <p className="label">Agenda</p>
            {mtg.agenda.length === 0 ? <p className="text-[13px] text-ink-faint">No agenda items recorded.</p> : (
              <ol className="space-y-1.5 mt-1">
                {mtg.agenda.sort((a, b) => a.order - b.order).map((a) => (
                  <li key={a.id} className="flex gap-3 items-baseline">
                    <span className="ref text-pine-700 font-semibold">{a.order}.</span>
                    <span className="text-[13.5px] text-ink">{a.text}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {minutes && (
            <button onClick={() => nav({ name: 'documents', id: minutes.id })} className="w-full card p-4 text-left hover:border-pine-400 cursor-pointer flex items-center gap-3">
              <span className="w-9 h-9 rounded-md bg-moss-100 text-moss-700 flex items-center justify-center"><IcFile size={17} /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13.5px] font-semibold text-ink truncate">{minutes.title}</span>
                <span className="block text-[11.5px] text-ink-faint">Minutes filed as an institutional record · {minutes.fileNumber}</span>
              </span>
              <Chip meta={{ label: 'Minutes', chip: 'bg-moss-100 text-moss-700', dot: 'bg-moss-600' }} />
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <p className="label">Participants ({mtg.participantIds.length})</p>
            <div className="space-y-1.5 mt-1">
              {[mtg.organiserId, ...mtg.participantIds.filter((p) => p !== mtg.organiserId)].map((pid) => {
                const u = users.find((x) => x.id === pid);
                if (!u) return null;
                return (
                  <div key={pid} className="flex items-center gap-2.5">
                    <Avatar name={u.name} color={u.color} size={26} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-medium text-ink truncate">{u.name}</p>
                      <p className="text-[10.5px] text-ink-faint truncate">{u.title}</p>
                    </div>
                    {pid === mtg.organiserId && <span className="chip bg-brass-100 text-brass-700">Organiser</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {mtg.isInvitation && mtg.status !== 'Completed' && mtg.status !== 'Cancelled' && (
            <div className="card p-4">
              <p className="label">Invitation response</p>
              <p className="text-[12px] text-ink-faint mb-2">{isParticipant ? 'Record the executive response — the organiser is notified.' : 'Only participants record responses.'}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {RESPONSE_OPTIONS.map((r) => (
                  <button key={r} disabled={!isParticipant && !canUser('respond')}
                    onClick={() => setMeetingResponse(mtg.id, r)}
                    className={cx('chip justify-center !py-1.5 cursor-pointer transition-all',
                      mtg.response === r ? RESPONSE_META[r].chip + ' ring-1 ring-current font-bold' : 'bg-line-soft text-ink-faint hover:text-ink',
                      (!isParticipant && !canUser('respond')) && 'opacity-40 cursor-not-allowed')}>
                    {r === 'Accepted' && <IcCheck size={11} />}{r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="card p-4 space-y-2">
            <p className="label">Meeting actions</p>
            {canUser('create') && mtg.status !== 'Completed' && mtg.status !== 'Cancelled' && (
              <>
                <select className="input" value={mtg.status} onChange={(e) => updateMeeting(mtg.id, { status: e.target.value as MeetingStatus }, `Meeting status: ${e.target.value}`)}>
                  {MEETING_STATUSES.filter((s) => s !== 'Completed').map((s) => <option key={s}>{s}</option>)}
                </select>
                <button className="btn-ghost w-full" onClick={() => setActionOpen(true)}><IcPlus size={13} /> Add action point (task)</button>
              </>
            )}
            {canUser('create') && mtg.status !== 'Completed' && mtg.status !== 'Cancelled' && (
              <button className="btn-primary w-full" onClick={() => setMinutesOpen(true)}><IcCheck size={13} /> Hold meeting & file minutes</button>
            )}
            {canUser('archive') && <button className="btn-ghost w-full !text-clay-600" onClick={() => setArchiveAsk(true)}><IcArchive size={13} /> Archive meeting</button>}
          </div>

          <div className="card p-4">
            <p className="label">Reminder engine</p>
            <div className="space-y-1.5 text-[12px] text-ink-soft">
              <p className={cx('flex items-center gap-2', du <= 7 && du >= 0 ? 'text-pine-700 font-medium' : '')}><IcClock size={13} /> 7 days before — “Upcoming meeting” {du <= 7 && du >= 0 && '· active'}</p>
              <p className={cx('flex items-center gap-2', du === 1 ? 'text-brass-700 font-medium' : '')}><IcClock size={13} /> 24 hours before — “Meeting tomorrow” {du === 1 && '· active'}</p>
              <p className={cx('flex items-center gap-2', du === 0 ? 'text-clay-700 font-medium' : '')}><IcClock size={13} /> 1 hour before — “Meeting starts soon” {du === 0 && '· active'}</p>
            </div>
          </div>
        </div>
      </div>

      <MinutesModal open={minutesOpen} onClose={() => setMinutesOpen(false)} mtg={mtg}
        onSave={(t, b) => { completeMeeting(mtg.id, { title: t, body: b }); setMinutesOpen(false); }} />
      <ActionModal open={actionOpen} onClose={() => setActionOpen(false)}
        onSave={(t) => { createTask({ title: t.title, assigneeId: t.assigneeId, dueDate: t.dueDate, priority: t.priority, relatedType: 'meeting', relatedId: mtg.id }); setActionOpen(false); }} />
      <Confirm open={archiveAsk} onClose={() => setArchiveAsk(false)} title="Archive this meeting?"
        body={<>The meeting and its links move to the institutional archive. Minutes already filed remain in the records vault.</>}
        confirmLabel="Archive meeting" onConfirm={() => { archiveRecord('meeting', mtg.id); nav({ name: 'meetings' }); }} />
    </div>
  );
}

function MinutesModal({ open, onClose, mtg, onSave }: { open: boolean; onClose: () => void; mtg: Meeting; onSave: (title: string, body: string) => void }) {
  const [title, setTitle] = useState(`Minutes — ${mtg.title}`);
  const [body, setBody] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Hold meeting & file minutes" subtitle="Marks the meeting completed and stores minutes as an institutional record" w="max-w-2xl"
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={!body.trim()} onClick={() => onSave(title.trim() || `Minutes — ${mtg.title}`, body.trim())}>Complete & file minutes</button></>}>
      <div className="space-y-3">
        <Field label="Minutes title" req><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Minutes & decisions" req hint="Decisions and action points become part of the matter timeline.">
          <textarea className="textarea" rows={7} value={body} onChange={(e) => setBody(e.target.value)} placeholder={'Attendees: …\nDecisions:\n1. …\nAction points:\n1. …'} />
        </Field>
      </div>
    </Modal>
  );
}

function ActionModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (t: { title: string; assigneeId?: string; dueDate?: string; priority: 'Routine' | 'Important' | 'Urgent' }) => void }) {
  const { users } = useStore();
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [due, setDue] = useState('');
  const [priority, setPriority] = useState<'Routine' | 'Important' | 'Urgent'>('Important');
  return (
    <Modal open={open} onClose={onClose} title="Action point from meeting" subtitle="Creates a task linked to this meeting, with owner and deadline recorded"
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={!title.trim()} onClick={() => onSave({ title: title.trim(), assigneeId: assignee || undefined, dueDate: due ? new Date(`${due}T17:00:00`).toISOString() : undefined, priority })}>Create action point</button></>}>
      <div className="space-y-3">
        <Field label="Action" req><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Circulate draft terms of reference" /></Field>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Owner"><select className="input" value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Unassigned</option>{users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
          <Field label="Due"><input type="date" className="input" value={due} min={dateOnly(0)} onChange={(e) => setDue(e.target.value)} /></Field>
          <Field label="Priority"><select className="input" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}><option>Routine</option><option>Important</option><option>Urgent</option></select></Field>
        </div>
      </div>
    </Modal>
  );
}
