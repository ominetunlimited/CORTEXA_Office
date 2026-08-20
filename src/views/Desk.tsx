import React, { useMemo, useState } from 'react';
import { useStore, canSee } from '../lib/store';
import { PageHead, Stat, Chip, EmptyState, Avatar, Reveal, CountUp } from '../components/ui';
import { QAHost, type QAKey } from '../components/quick';
import {
  CORR_STATUS_META, TASK_STATUS_META, MEETING_STATUS_META, APPROVAL_META, PRIORITY_META,
} from '../lib/types';
import { cx, daysUntil, dueLabel, fmtDate, fmtTime12, relTime, dateOnly } from '../lib/utils';
import {
  IcInbox, IcStamp, IcAlert, IcEnvelope, IcCheckSquare, IcCalendar, IcSend,
  IcClock, IcSeal, IcCheck, IcX, IcEdit, IcEye, IcChevR,
} from '../components/icons';

/* ── Secretary Desk ──────────────────────────────────────────────────── */
export function SecretaryDesk() {
  const { db, me, users, nav, updateCorrespondence } = useStore();
  const [qa, setQa] = useState<QAKey>(null);

  const d = useMemo(() => {
    const corr = db.correspondence.filter((c) => c.orgId === me?.orgId && !c.archived && canSee(me, c.security));
    const inbox = corr.filter((c) => c.direction === 'incoming' && c.status === 'Received');
    const pendingReg = inbox;
    const pendingResp = corr.filter((c) => c.responseRequired && !['Responded', 'Closed', 'Archived'].includes(c.status) && c.direction === 'incoming')
      .sort((a, b) => (a.responseDeadline ?? '9999').localeCompare(b.responseDeadline ?? '9999'));
    const overdue = corr.filter((c) => c.responseRequired && c.responseDeadline && daysUntil(c.responseDeadline) < 0 && !['Responded', 'Closed', 'Archived'].includes(c.status));
    const overdueTasks = db.tasks.filter((t) => t.orgId === me?.orgId && !t.archived && !['Completed', 'Cancelled'].includes(t.status) && t.dueDate && daysUntil(t.dueDate) < 0);
    const execAttention = db.approvals.filter((a) => a.orgId === me?.orgId && a.overall === 'Pending');
    const week = db.meetings.filter((m) => m.orgId === me?.orgId && !m.archived && m.status !== 'Cancelled' && m.status !== 'Completed' && daysUntil(m.date) >= 0 && daysUntil(m.date) <= 7)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    const dispatch = corr.filter((c) => c.direction === 'outgoing' && (c.deliveryStatus === 'Draft' || c.deliveryStatus === 'Approved'));
    return { inbox, pendingReg, pendingResp, overdue, overdueTasks, execAttention, week, dispatch };
  }, [db, me]);

  return (
    <div>
      <PageHead kicker="Secretary workspace" title="The desk that never loses a letter"
        sub="Registration queue, pending responses, dispatch tray and the executive's attention list — the whole administrative flow from one screen.">
        <button className="btn-brass" onClick={() => setQa('corr')}><IcEnvelope size={14} /> Register correspondence</button>
        <button className="btn-ghost" onClick={() => setQa('meeting')}><IcCalendar size={14} /> Create meeting</button>
      </PageHead>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 mb-5 stagger">
        <Stat label="Inbox" value={d.inbox.length} tone="steel" sub="received, unregistered" onClick={() => nav({ name: 'correspondence' })} />
        <Stat label="Pending responses" value={d.pendingResp.length} tone="brass" sub="deadlines tracked" onClick={() => nav({ name: 'correspondence' })} />
        <Stat label="Overdue" value={d.overdue.length + d.overdueTasks.length} tone="clay" sub="urgent attention" onClick={() => nav({ name: 'correspondence' })} />
        <Stat label="Exec. attention" value={d.execAttention.length} tone="brass" sub="awaiting decision" onClick={() => nav({ name: 'desk-executive' })} />
        <Stat label="Meetings · 7 days" value={d.week.length} tone="pine" sub="upcoming" onClick={() => nav({ name: 'calendar' })} />
        <Stat label="Dispatch tray" value={d.dispatch.length} tone="steel" sub="outgoing, not sent" onClick={() => nav({ name: 'correspondence', tab: 'outgoing' })} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <DeskPanel title="Inbox — pending registration" icon={<IcInbox size={15} />} count={d.inbox.length}
          empty="You're all caught up. New physical and electronic mail appears here for registration."
          action={{ label: 'Register new entry', onClick: () => setQa('corr') }}>
          {d.inbox.map((c) => (
            <Row key={c.id} onClick={() => nav({ name: 'correspondence', id: c.id })}
              left={<span className="ref text-pine-700 font-medium whitespace-nowrap">{c.ref}</span>}
              title={c.subject} sub={`${c.senderOrg ?? c.sender ?? 'Unknown sender'} · ${relTime(c.dateReceived)}`}
              right={<Chip meta={CORR_STATUS_META[c.status]} />} />
          ))}
        </DeskPanel>

        <DeskPanel title="Pending responses" icon={<IcClock size={15} />} count={d.pendingResp.length}
          empty="No correspondence is waiting on a response." action={{ label: 'Open register', onClick: () => nav({ name: 'correspondence' }) }}>
          {d.pendingResp.slice(0, 6).map((c) => {
            const due = dueLabel(c.responseDeadline);
            return (
              <Row key={c.id} onClick={() => nav({ name: 'correspondence', id: c.id })}
                left={<span className={cx('w-2 h-2 rounded-full shrink-0', due.tone === 'overdue' ? 'bg-clay-500 pulse-urgent' : due.tone === 'today' ? 'bg-brass-500' : 'bg-steel-500')} />}
                title={c.subject} sub={`${c.ref} · ${due.text}`}
                right={<span className={cx('text-[11px] font-semibold whitespace-nowrap', due.tone === 'overdue' ? 'text-clay-600' : due.tone === 'today' ? 'text-brass-600' : 'text-ink-faint')}>{c.responseDeadline ? fmtDate(c.responseDeadline) : ''}</span>} />
            );
          })}
        </DeskPanel>

        <DeskPanel title="Overdue — urgent" icon={<IcAlert size={15} />} count={d.overdue.length + d.overdueTasks.length} tone="clay"
          empty="Nothing is overdue. The institution is running on time." action={{ label: 'Review register', onClick: () => nav({ name: 'tasks' }) }}>
          {d.overdue.slice(0, 4).map((c) => (
            <Row key={c.id} onClick={() => nav({ name: 'correspondence', id: c.id })}
              left={<span className="text-clay-600"><IcEnvelope size={15} /></span>}
              title={c.subject} sub={`${c.ref} · ${dueLabel(c.responseDeadline).text}`}
              right={<Chip meta={CORR_STATUS_META[c.status]} />} />
          ))}
          {d.overdueTasks.slice(0, 3).map((t) => (
            <Row key={t.id} onClick={() => nav({ name: 'tasks', id: t.id })}
              left={<span className="text-clay-600"><IcCheckSquare size={15} /></span>}
              title={t.title} sub={`Task · ${users.find((u) => u.id === t.assigneeId)?.name ?? 'unassigned'} · ${dueLabel(t.dueDate).text}`}
              right={<Chip meta={TASK_STATUS_META.Overdue} />} />
          ))}
        </DeskPanel>

        <DeskPanel title="Executive attention" icon={<IcStamp size={15} />} count={d.execAttention.length}
          empty="No documents are waiting on executive decision." action={{ label: 'Executive desk', onClick: () => nav({ name: 'desk-executive' }) }}>
          {d.execAttention.slice(0, 5).map((a) => (
            <Row key={a.id} onClick={() => nav({ name: 'documents', id: a.recordId })}
              left={<span className="text-brass-600"><IcStamp size={15} /></span>}
              title={a.title} sub={`Step ${a.currentStep + 1}/${a.chain.length} · awaiting ${a.chain[a.currentStep]?.role}`}
              right={<Chip meta={APPROVAL_META.Pending} />} />
          ))}
        </DeskPanel>

        <DeskPanel title="Upcoming meetings · 7 days" icon={<IcCalendar size={15} />} count={d.week.length}
          empty="No meetings in the next seven days." action={{ label: 'Open calendar', onClick: () => nav({ name: 'calendar' }) }}>
          {d.week.slice(0, 6).map((m) => (
            <Row key={m.id} onClick={() => nav({ name: 'meeting', id: m.id })}
              left={<span className="ref text-pine-700 font-medium whitespace-nowrap">{daysUntil(m.date) === 0 ? 'Today' : daysUntil(m.date) === 1 ? 'Tmrw' : fmtDate(m.date).slice(0, 6)}</span>}
              title={m.title} sub={`${fmtTime12(m.startTime)} · ${m.venue}`}
              right={<Chip meta={MEETING_STATUS_META[m.status]} />} />
          ))}
        </DeskPanel>

        <DeskPanel title="Dispatch tray" icon={<IcSend size={15} />} count={d.dispatch.length}
          empty="No outgoing correspondence waiting to be dispatched." action={{ label: 'Compose outgoing', onClick: () => setQa('corr') }}>
          {d.dispatch.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
              <button className="flex-1 min-w-0 text-left cursor-pointer" onClick={() => nav({ name: 'correspondence', id: c.id })}>
                <p className="text-[13px] font-medium text-ink truncate hover:text-pine-700">{c.subject}</p>
                <p className="text-[11px] text-ink-faint">{c.ref} · to {c.recipientOrg ?? c.recipient} · {c.dispatchMethod}</p>
              </button>
              <button className="btn-ghost btn-sm shrink-0" onClick={() => updateCorrespondence(c.id, { deliveryStatus: 'Dispatched', dispatchDate: new Date().toISOString(), status: 'Responded' }, 'Dispatched outgoing correspondence')}>
                <IcSend size={12} /> Dispatch
              </button>
            </div>
          ))}
        </DeskPanel>
      </div>

      <QAHost open={qa} onClose={() => setQa(null)} presetCorrDirection={qa === 'corr' ? 'incoming' : undefined} />
    </div>
  );
}

/* ── Executive Desk ──────────────────────────────────────────────────── */
export function ExecutiveDesk() {
  const { db, me, users, nav, canUser, decideApproval } = useStore();

  const d = useMemo(() => {
    const corr = db.correspondence.filter((c) => c.orgId === me?.orgId && !c.archived && canSee(me, c.security));
    const myApprovals = db.approvals.filter((a) => a.orgId === me?.orgId && a.overall === 'Pending' && canUser('approve') &&
      (a.chain[a.currentStep]?.role === me?.role || me?.role === 'Organisation Admin' || me?.role === 'Super Admin'));
    const important = corr.filter((c) => ['Urgent', 'Important'].includes(c.priority) && !['Responded', 'Closed', 'Archived'].includes(c.status))
      .sort((a, b) => b.dateReceived.localeCompare(a.dateReceived)).slice(0, 6);
    const delegated = db.tasks.filter((t) => t.orgId === me?.orgId && !t.archived && t.createdById === me?.id && t.assigneeId && t.assigneeId !== me?.id)
      .sort((a, b) => Number(a.status === 'Completed') - Number(b.status === 'Completed')).slice(0, 7);
    const today = db.meetings.filter((m) => m.orgId === me?.orgId && !m.archived && m.date === dateOnly(0) && m.status !== 'Cancelled' && m.status !== 'Completed');
    const upcoming = db.meetings.filter((m) => m.orgId === me?.orgId && !m.archived && m.status !== 'Cancelled' && m.status !== 'Completed' && daysUntil(m.date) > 0 && daysUntil(m.date) <= 7)
      .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
    const overdueCorr = corr.filter((c) => c.responseRequired && c.responseDeadline && daysUntil(c.responseDeadline) < 0 && !['Responded', 'Closed', 'Archived'].includes(c.status));
    const overdueTasks = db.tasks.filter((t) => t.orgId === me?.orgId && !t.archived && !['Completed', 'Cancelled'].includes(t.status) && t.dueDate && daysUntil(t.dueDate) < 0);
    const decisions = db.audit.filter((a) => a.orgId === me?.orgId && /approv|reject|changes/i.test(a.action)).slice(0, 6);
    return { myApprovals, important, delegated, today, upcoming, overdueCorr, overdueTasks, decisions };
  }, [db, me, canUser]);

  return (
    <div>
      <PageHead kicker="Executive workspace" title="Decisions, not administration"
        sub="What needs your signature, your attendance and your attention — nothing else." />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5 stagger">
        <Stat label="Awaiting your decision" value={d.myApprovals.length} tone="brass" sub="documents in workflow" onClick={() => document.getElementById('exec-approvals')?.scrollIntoView({ behavior: 'smooth' })} />
        <Stat label="Today's meetings" value={d.today.length} tone="pine" sub={d.today[0] ? `${fmtTime12(d.today[0].startTime)} first` : 'none scheduled'} onClick={() => nav({ name: 'calendar' })} />
        <Stat label="Delegated tasks" value={d.delegated.filter((t) => t.status !== 'Completed').length} tone="steel" sub={`${d.delegated.filter((t) => t.status === 'Completed').length} completed`} onClick={() => nav({ name: 'tasks' })} />
        <Stat label="Overdue issues" value={d.overdueCorr.length + d.overdueTasks.length} tone="clay" sub="need escalation" onClick={() => nav({ name: 'tasks' })} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <section className="card" id="exec-approvals">
            <header className="px-4 pt-3.5 pb-2.5 border-b border-line-soft flex items-center gap-2">
              <span className="text-brass-600"><IcStamp size={16} /></span>
              <h3 className="font-display font-bold text-[15px] text-ink">Documents requiring approval</h3>
              <span className="ml-auto ref text-ink-faint">{d.myApprovals.length} pending</span>
            </header>
            {d.myApprovals.length === 0 ? (
              <EmptyState icon={<IcCheck size={20} />} title="Nothing awaiting your signature" body="Approved, rejected and change-requested decisions are written to the audit trail with your name." />
            ) : (
              <div className="divide-y divide-line-soft">
                {d.myApprovals.map((a) => (
                  <div key={a.id} className="px-4 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <button className="text-[13.5px] font-semibold text-ink hover:text-pine-700 cursor-pointer text-left flex-1 min-w-[200px]" onClick={() => nav({ name: 'documents', id: a.recordId })}>{a.title}</button>
                      <Chip meta={APPROVAL_META.Pending} label={`Step ${a.currentStep + 1}/${a.chain.length}`} />
                    </div>
                    <p className="text-[11.5px] text-ink-faint mt-1">Requested by {users.find((u) => u.id === a.requestedById)?.name ?? '—'} · {relTime(a.createdAt)} · chain: {a.chain.map((s) => s.role).join(' → ')}</p>
                    <div className="flex gap-2 mt-2.5">
                      {canUser('approve') && (
                        <>
                          <button className="btn-primary btn-sm" onClick={() => decideApproval(a.id, 'Approved')}><IcCheck size={13} /> Approve</button>
                          <button className="btn-danger btn-sm" onClick={() => decideApproval(a.id, 'Rejected')}><IcX size={13} /> Reject</button>
                          <button className="btn-ghost btn-sm" onClick={() => decideApproval(a.id, 'Changes Requested')}><IcEdit size={13} /> Request changes</button>
                        </>
                      )}
                      <button className="btn-ghost btn-sm ml-auto" onClick={() => nav({ name: 'documents', id: a.recordId })}><IcEye size={13} /> View document</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <header className="px-4 pt-3.5 pb-2.5 border-b border-line-soft flex items-center gap-2">
              <span className="text-pine-600"><IcEnvelope size={16} /></span>
              <h3 className="font-display font-bold text-[15px] text-ink">Important correspondence</h3>
              <button className="btn-ghost btn-sm ml-auto" onClick={() => nav({ name: 'correspondence' })}>Full register</button>
            </header>
            {d.important.length === 0 ? <p className="px-4 py-5 text-[13px] text-ink-faint">No urgent or important open correspondence.</p> : (
              <div className="divide-y divide-line-soft">
                {d.important.map((c) => (
                  <Row key={c.id} onClick={() => nav({ name: 'correspondence', id: c.id })}
                    left={<Chip meta={PRIORITY_META[c.priority]} />}
                    title={c.subject} sub={`${c.ref} · ${c.senderOrg ?? c.recipientOrg ?? ''} · ${c.status}`}
                    right={<IcChevR size={14} className="text-ink-faint" />} />
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <header className="px-4 pt-3.5 pb-2.5 border-b border-line-soft flex items-center gap-2">
              <span className="text-steel-600"><IcCheckSquare size={16} /></span>
              <h3 className="font-display font-bold text-[15px] text-ink">Delegated tasks</h3>
              <button className="btn-ghost btn-sm ml-auto" onClick={() => nav({ name: 'tasks' })}>All tasks</button>
            </header>
            {d.delegated.length === 0 ? <p className="px-4 py-5 text-[13px] text-ink-faint">Delegate a task from any task view — completion reports back to this desk.</p> : (
              <div className="divide-y divide-line-soft">
                {d.delegated.map((t) => {
                  const assignee = users.find((u) => u.id === t.assigneeId);
                  const overdue = t.status !== 'Completed' && t.dueDate && daysUntil(t.dueDate) < 0;
                  return (
                    <Row key={t.id} onClick={() => nav({ name: 'tasks', id: t.id })}
                      left={assignee ? <Avatar name={assignee.name} color={assignee.color} size={24} /> : <span className="w-6" />}
                      title={t.title}
                      sub={`${assignee?.name ?? 'Unassigned'} · ${dueLabel(t.dueDate).text}`}
                      right={t.status === 'Completed'
                        ? <span className="chip bg-moss-100 text-moss-700"><IcCheck size={11} /> Done {t.completedAt ? relTime(t.completedAt) : ''}</span>
                        : overdue ? <Chip meta={TASK_STATUS_META.Overdue} /> : <Chip meta={TASK_STATUS_META[t.status]} />} />
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="card">
            <header className="px-4 pt-3.5 pb-2.5 border-b border-line-soft flex items-center gap-2">
              <span className="text-pine-600"><IcCalendar size={15} /></span>
              <h3 className="font-display font-bold text-[14.5px] text-ink">Today's agenda</h3>
            </header>
            {d.today.length === 0 ? <p className="px-4 py-5 text-[13px] text-ink-faint">No meetings today.</p> : (
              <div className="divide-y divide-line-soft">
                {d.today.map((m) => (
                  <Row key={m.id} onClick={() => nav({ name: 'meeting', id: m.id })}
                    left={<span className="ref text-pine-700 font-semibold whitespace-nowrap">{fmtTime12(m.startTime)}</span>}
                    title={m.title} sub={m.venue} right={<Chip meta={MEETING_STATUS_META[m.status]} />} />
                ))}
              </div>
            )}
            {d.upcoming.length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-faint">Next 7 days</p>
                <div className="pb-2">
                  {d.upcoming.map((m) => (
                    <Row key={m.id} onClick={() => nav({ name: 'meeting', id: m.id })}
                      left={<span className="ref text-ink-faint whitespace-nowrap">{fmtDate(m.date).slice(0, 6)}</span>}
                      title={m.title} sub={`${fmtTime12(m.startTime)} · ${m.venue}`} right={<IcChevR size={13} className="text-ink-faint" />} />
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="card">
            <header className="px-4 pt-3.5 pb-2.5 border-b border-line-soft flex items-center gap-2">
              <span className="text-clay-600"><IcAlert size={15} /></span>
              <h3 className="font-display font-bold text-[14.5px] text-ink">Overdue issues</h3>
            </header>
            {d.overdueCorr.length + d.overdueTasks.length === 0 ? <p className="px-4 py-5 text-[13px] text-ink-faint">Nothing overdue across the institution.</p> : (
              <div className="divide-y divide-line-soft">
                {d.overdueCorr.slice(0, 4).map((c) => (
                  <Row key={c.id} onClick={() => nav({ name: 'correspondence', id: c.id })}
                    left={<span className="dot bg-clay-500 pulse-urgent" />} title={c.subject}
                    sub={`${c.ref} · ${dueLabel(c.responseDeadline).text}`} right={<Chip meta={CORR_STATUS_META[c.status]} />} />
                ))}
                {d.overdueTasks.slice(0, 3).map((t) => (
                  <Row key={t.id} onClick={() => nav({ name: 'tasks', id: t.id })}
                    left={<span className="dot bg-clay-500 pulse-urgent" />} title={t.title}
                    sub={`${users.find((u) => u.id === t.assigneeId)?.name ?? 'Unassigned'} · ${dueLabel(t.dueDate).text}`} right={<Chip meta={TASK_STATUS_META.Overdue} />} />
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <header className="px-4 pt-3.5 pb-2.5 border-b border-line-soft flex items-center gap-2">
              <span className="text-brass-600"><IcSeal size={15} /></span>
              <h3 className="font-display font-bold text-[14.5px] text-ink">Recent decisions</h3>
            </header>
            {d.decisions.length === 0 ? <p className="px-4 py-5 text-[13px] text-ink-faint">Decisions appear here as they are recorded.</p> : (
              <ol className="px-4 py-3">
                {d.decisions.map((a, i) => (
                  <li key={a.id} className="relative pl-4 pb-3 last:pb-0">
                    {i < d.decisions.length - 1 && <span className="absolute left-[3px] top-3 bottom-0 w-px bg-line" />}
                    <span className="absolute left-0 top-1.5 size-[7px] rounded-full bg-brass-500" />
                    <p className="text-[12px] text-ink leading-snug"><span className="font-semibold">{a.userName}</span> · {a.action.toLowerCase()}</p>
                    <p className="text-[11px] text-ink-faint truncate">{a.target}</p>
                    <p className="text-[10px] font-mono text-ink-faint">{relTime(a.at)}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/* ── shared bits ─────────────────────────────────────────────────────── */
function DeskPanel({ title, icon, count, tone, empty, action, children }: {
  title: string; icon: React.ReactNode; count: number; tone?: 'clay';
  empty: string; action: { label: string; onClick: () => void }; children: React.ReactNode;
}) {
  const arr = React.Children.toArray(children);
  return (
    <Reveal className="card overflow-hidden flex flex-col">
      <header className="px-4 pt-3.5 pb-2.5 border-b border-line-soft flex items-center gap-2">
        <span className={tone === 'clay' ? 'text-clay-600' : 'text-pine-600'}>{icon}</span>
        <h3 className="font-display font-bold text-[14.5px] text-ink">{title}</h3>
        <span className={cx('ml-auto ref', tone === 'clay' && count > 0 ? 'text-clay-600 font-bold' : 'text-ink-faint')}><CountUp value={count} /></span>
      </header>
      {arr.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-5 py-7">
          <p className="text-[13px] font-medium text-ink">All clear</p>
          <p className="text-[12px] text-ink-faint mt-1 leading-relaxed">{empty}</p>
        </div>
      ) : (
        <div className="divide-y divide-line-soft">{children}</div>
      )}
      <footer className="mt-auto border-t border-line-soft">
        <button className="w-full py-2 text-[12px] font-semibold text-pine-700 hover:bg-pine-50 transition-colors cursor-pointer" onClick={action.onClick}>{action.label}</button>
      </footer>
    </Reveal>
  );
}

function Row({ onClick, left, title, sub, right }: { onClick: () => void; left: React.ReactNode; title: string; sub: string; right: React.ReactNode }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-pine-50/70 transition-colors cursor-pointer text-left">
      <span className="shrink-0">{left}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-medium text-ink truncate leading-snug">{title}</span>
        <span className="block text-[11px] text-ink-faint truncate mt-0.5">{sub}</span>
      </span>
      <span className="shrink-0">{right}</span>
    </button>
  );
}
