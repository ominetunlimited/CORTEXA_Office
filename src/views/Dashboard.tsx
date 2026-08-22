import React, { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { PageHead, Stat, Chip, EmptyState, Reveal, Avatar } from '../components/ui';
import { QAHost, type QAKey } from '../components/quick';
import {
  IcCalendar, IcEnvelope, IcCheckSquare, IcStamp, IcAlert, IcSeal, IcClock, IcChevR,
} from '../components/icons';

const IcArrowLike = () => <span className="text-ink-faint"><IcChevR size={14} /></span>;
import { cx, daysUntil, fmtTime12, relTime, dateOnly, fmtDate } from '../lib/utils';
import { MEETING_STATUS_META, APPROVAL_META } from '../lib/types';

/* six-week register heartbeat — animated draw-in sparkline */
function RegistryPulse() {
  const { db, me } = useStore();
  const weeks = useMemo(() => {
    const out: { in: number; out: number; label: string }[] = [];
    const now = Date.now();
    for (let w = 5; w >= 0; w--) {
      const start = now - (w + 1) * 7 * 86400000;
      const end = now - w * 7 * 86400000;
      const inC = db.correspondence.filter((c) => c.orgId === me?.orgId && c.direction === 'incoming' && +new Date(c.dateReceived) >= start && +new Date(c.dateReceived) < end).length;
      const outC = db.correspondence.filter((c) => c.orgId === me?.orgId && c.direction === 'outgoing' && +new Date(c.dateReceived) >= start && +new Date(c.dateReceived) < end).length;
      const d0 = new Date(end);
      out.push({ in: inC, out: outC, label: `${d0.getDate()}/${d0.getMonth() + 1}` });
    }
    return out;
  }, [db, me]);

  const W = 188, H = 40, PAD = 3;
  const max = Math.max(1, ...weeks.map((w) => Math.max(w.in, w.out)));
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / 5;
  const y = (v: number) => H - 6 - (v / max) * (H - 12);
  const pts = (k: 'in' | 'out') => weeks.map((w, i) => `${x(i).toFixed(1)},${y(w[k]).toFixed(1)}`).join(' ');
  const area = `${PAD},${H - 4} ${pts('in')} ${W - PAD},${H - 4}`;
  const totIn = weeks.reduce((s, w) => s + w.in, 0);
  const totOut = weeks.reduce((s, w) => s + w.out, 0);

  return (
    <div className="hidden sm:flex items-center gap-3.5" title="Correspondence registered per week, last six weeks">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        <polygon points={area} fill="var(--color-pine-600)" opacity="0.07" className="anim-fade" />
        <polyline points={pts('in')} fill="none" stroke="var(--color-pine-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          pathLength={1} strokeDasharray="1" strokeDashoffset="1" className="chart-line" style={{ '--dash': '1' } as React.CSSProperties} />
        <polyline points={pts('out')} fill="none" stroke="var(--color-brass-500)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="3 3" pathLength={1} className="chart-line" style={{ animationDelay: '0.15s', '--dash': '1' } as React.CSSProperties} />
        <circle cx={x(5)} cy={y(weeks[5].in)} r="3" fill="var(--color-pine-600)" className="live-dot" />
      </svg>
      <div className="text-[10px] leading-[1.5] text-ink-faint whitespace-nowrap">
        <p><span className="dot bg-pine-600 mr-1.5" />{totIn} in · 6w</p>
        <p><span className="dot bg-brass-500 mr-1.5" />{totOut} out · 6w</p>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { me, org, db, users, nav, canUser } = useStore();
  const [qa, setQa] = useState<QAKey>(null);

  const data = useMemo(() => {
    const corr = db.correspondence.filter((c) => c.orgId === me?.orgId && !c.archived);
    const incoming = corr.filter((c) => c.direction === 'incoming');
    const outgoing = corr.filter((c) => c.direction === 'outgoing');
    const openStatuses = ['Received', 'Registered', 'Pending Review', 'Assigned', 'In Progress', 'Awaiting Response'];
    const pending = corr.filter((c) => openStatuses.includes(c.status));
    const overdueCorr = corr.filter((c) => c.responseRequired && c.responseDeadline && daysUntil(c.responseDeadline) < 0 && !['Responded', 'Closed', 'Archived'].includes(c.status));
    const docs = db.documents.filter((d) => d.orgId === me?.orgId && !d.archived);
    const meetings = db.meetings.filter((m) => m.orgId === me?.orgId && !m.archived);
    const today = dateOnly(0);
    const agenda = meetings.filter((m) => m.date === today && m.status !== 'Cancelled' && m.status !== 'Completed');
    const upcoming = meetings.filter((m) => m.status !== 'Cancelled' && m.status !== 'Completed' && daysUntil(m.date) >= 0);
    const tasks = db.tasks.filter((t) => t.orgId === me?.orgId && !t.archived);
    const activeTasks = tasks.filter((t) => ['Not Started', 'In Progress', 'Pending'].includes(t.status));
    const overdueTasks = tasks.filter((t) => !['Completed', 'Cancelled'].includes(t.status) && t.dueDate && daysUntil(t.dueDate) < 0);
    const approvals = db.approvals.filter((a) => a.orgId === me?.orgId && a.overall === 'Pending');
    const myApprovals = approvals.filter((a) => canUser('approve') && (a.chain[a.currentStep]?.role === me?.role || me?.role === 'Organisation Admin' || me?.role === 'Super Admin'));
    const pendingInvites = corr.filter((c) => c.type === 'Invitation' && c.responseStatus === 'Pending');
    const meetingsToAnswer = meetings.filter((m) => m.isInvitation && m.response === 'Pending' && m.participantIds.includes(me?.id ?? ''));
    const tasksDueToday = tasks.filter((t) => t.assigneeId === me?.id && !['Completed', 'Cancelled'].includes(t.status) && t.dueDate && daysUntil(t.dueDate) === 0);
    const activity = db.audit.filter((a) => a.orgId === me?.orgId).slice(0, 9);
    return { corr, incoming, outgoing, pending, overdueCorr, docs, agenda, upcoming, activeTasks, overdueTasks, approvals, myApprovals, pendingInvites, meetingsToAnswer, tasksDueToday, activity };
  }, [db, me, canUser]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = me?.name.split(' ')[0] ?? '';

  type Tone = 'clay' | 'brass' | 'pine' | 'steel';
  const attentionAll: { icon: React.ReactNode; label: string; count: number; tone: Tone; route: () => void }[] = [
    { icon: <IcStamp size={16} />, label: 'Documents awaiting your approval', count: data.myApprovals.length, tone: 'brass' as Tone, route: () => nav({ name: 'desk-executive' }) },
    { icon: <IcAlert size={16} />, label: 'Overdue correspondence responses', count: data.overdueCorr.length, tone: 'clay' as Tone, route: () => nav({ name: 'correspondence' }) },
    { icon: <IcEnvelope size={16} />, label: 'Invitations awaiting a response', count: data.pendingInvites.length + data.meetingsToAnswer.length, tone: 'brass' as Tone, route: () => nav({ name: 'correspondence' }) },
    { icon: <IcCheckSquare size={16} />, label: 'Your tasks due today', count: data.tasksDueToday.length, tone: 'steel' as Tone, route: () => nav({ name: 'tasks' }) },
    { icon: <IcCalendar size={16} />, label: 'Overdue tasks on the register', count: data.overdueTasks.length, tone: 'clay' as Tone, route: () => nav({ name: 'tasks' }) },
  ];
  const attention = attentionAll.filter((a) => a.count > 0);

  const QUICKS: { key: Exclude<QAKey, null>; label: string }[] = [
    { key: 'corr', label: 'Register Correspondence' },
    { key: 'doc', label: 'Upload Document' },
    { key: 'meeting', label: 'Create Meeting' },
    { key: 'task', label: 'Create Task' },
    { key: 'memo', label: 'Create Memo' },
    { key: 'matter', label: 'Create Matter' },
    { key: 'contact', label: 'Add Contact' },
  ];

  return (
    <div>
      <PageHead
        kicker={`${org?.name ?? ''} · ${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
        title={`${greeting}, ${firstName}.`}
        sub="The state of the institution — what happened, what is happening, and what needs to happen."
      />

      {/* executive summary strip */}
      <Reveal>
        <div className="card p-4 mb-5">
          <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-faint">Executive summary</p>
            <RegistryPulse />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 stagger">
            <Stat label="Correspondence" value={data.corr.length} tone="pine" sub={`${data.pending.length} open`} onClick={() => nav({ name: 'correspondence' })} />
            <Stat label="Incoming" value={data.incoming.length} sub="this register" onClick={() => nav({ name: 'correspondence', tab: 'incoming' })} />
            <Stat label="Outgoing" value={data.outgoing.length} sub="dispatched & drafts" onClick={() => nav({ name: 'correspondence', tab: 'outgoing' })} />
            <Stat label="Pending" value={data.pending.length} tone="brass" sub="awaiting action" onClick={() => nav({ name: 'correspondence' })} />
            <Stat label="Overdue" value={data.overdueCorr.length} tone="clay" sub="responses late" onClick={() => nav({ name: 'correspondence' })} />
            <Stat label="Documents" value={data.docs.length} tone="steel" sub="in the records vault" onClick={() => nav({ name: 'documents' })} />
            <Stat label="Meetings" value={data.upcoming.length} sub="upcoming" onClick={() => nav({ name: 'calendar' })} />
            <Stat label="Approvals" value={data.approvals.length} tone="brass" sub="in workflow" onClick={() => nav({ name: 'desk-executive' })} />
            <Stat label="Active tasks" value={data.activeTasks.length} tone="pine" sub="on the register" onClick={() => nav({ name: 'tasks' })} />
            <Stat label="Overdue tasks" value={data.overdueTasks.length} tone="clay" sub="need escalation" onClick={() => nav({ name: 'tasks' })} />
          </div>
        </div>
      </Reveal>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* today's agenda */}
          <Reveal>
            <section className="card">
              <header className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-line-soft">
                <h3 className="font-display font-bold text-[15px] text-ink flex items-center gap-2"><span className="text-pine-600"><IcCalendar size={16} /></span>Today's agenda</h3>
                <button className="btn-ghost btn-sm" onClick={() => nav({ name: 'calendar' })}>Open calendar</button>
              </header>
              {data.agenda.length === 0 ? (
                <EmptyState icon={<IcCalendar size={20} />} title="No meetings scheduled" body="Nothing sits on today's institutional calendar. When meetings are scheduled they appear here with venue, participants and status." />
              ) : (
                <div className="divide-y divide-line-soft">
                  {data.agenda.map((m) => (
                    <button key={m.id} onClick={() => nav({ name: 'meeting', id: m.id })} className="w-full text-left px-4 py-3 hover:bg-pine-50/60 transition-colors cursor-pointer flex gap-3.5">
                      <div className="w-16 shrink-0 text-center">
                        <p className="ref font-semibold text-pine-700 text-[13px]">{fmtTime12(m.startTime)}</p>
                        <p className="text-[10px] text-ink-faint">{fmtTime12(m.endTime)}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold text-ink truncate">{m.title}</p>
                        <p className="text-[12px] text-ink-faint truncate mt-0.5">{m.venue}{m.externalOrgs.length ? ` · ${m.externalOrgs.join(', ')}` : ''}</p>
                        <div className="flex items-center gap-1 mt-1.5 -space-x-1.5">
                          {m.participantIds.slice(0, 5).map((pid) => {
                            const u = users.find((x) => x.id === pid);
                            return u ? <Avatar key={pid} name={u.name} color={u.color} size={20} className="ring-2 ring-card" /> : null;
                          })}
                          <span className="text-[10.5px] text-ink-faint ml-3">{m.participantIds.length} participant{m.participantIds.length === 1 ? '' : 's'}</span>
                        </div>
                      </div>
                      <Chip meta={MEETING_STATUS_META[m.status]} className="self-start shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </section>
          </Reveal>

          {/* requires attention */}
          <Reveal delay={60}>
            <section className="card">
              <header className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-line-soft">
                <h3 className="font-display font-bold text-[15px] text-ink flex items-center gap-2"><span className="text-brass-600"><IcAlert size={16} /></span>Requires your attention</h3>
                <span className="ref text-ink-faint">{attention.length ? `${attention.reduce((s, a) => s + a.count, 0)} items` : 'clear'}</span>
              </header>
              {attention.length === 0 ? (
                <EmptyState icon={<IcCheckSquare size={20} />} title="You're all caught up" body="No approvals, overdue responses or deadlines are waiting on you right now." />
              ) : (
                <div className="divide-y divide-line-soft">
                  {attention.map((a) => (
                    <button key={a.label} onClick={a.route} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-pine-50/60 transition-colors cursor-pointer text-left">
                      <span className={cx('w-8 h-8 rounded-md flex items-center justify-center shrink-0',
                        a.tone === 'clay' && 'bg-clay-100 text-clay-600',
                        a.tone === 'brass' && 'bg-brass-100 text-brass-600',
                        a.tone === 'pine' && 'bg-pine-100 text-pine-600',
                        a.tone === 'steel' && 'bg-steel-100 text-steel-600')}>{a.icon}</span>
                      <span className="flex-1 text-[13px] font-medium text-ink">{a.label}</span>
                      <span className={cx('font-display font-extrabold text-[17px]', a.tone === 'clay' ? 'text-clay-600' : a.tone === 'brass' ? 'text-brass-600' : 'text-pine-700')}>{a.count}</span>
                      <IcArrowLike />
                    </button>
                  ))}
                </div>
              )}
            </section>
          </Reveal>

          {/* approvals snapshot for approvers */}
          {canUser('approve') && (
            <Reveal delay={90}>
              <section className="card">
                <header className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-line-soft">
                  <h3 className="font-display font-bold text-[15px] text-ink flex items-center gap-2"><span className="text-pine-600"><IcStamp size={16} /></span>Awaiting decision</h3>
                  <button className="btn-ghost btn-sm" onClick={() => nav({ name: 'desk-executive' })}>Executive desk</button>
                </header>
                {data.myApprovals.length === 0 ? (
                  <p className="px-4 py-5 text-[13px] text-ink-faint">No documents are waiting on your decision.</p>
                ) : (
                  <div className="divide-y divide-line-soft">
                    {data.myApprovals.slice(0, 4).map((a) => (
                      <button key={a.id} onClick={() => nav({ name: 'documents', id: a.recordId })} className="w-full text-left px-4 py-3 hover:bg-pine-50/60 cursor-pointer flex items-center gap-3">
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-medium text-ink truncate">{a.title}</span>
                          <span className="text-[11px] text-ink-faint">Step {a.currentStep + 1} of {a.chain.length} · {a.chain[a.currentStep].role}</span>
                        </span>
                        <Chip meta={APPROVAL_META[a.overall]} />
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </Reveal>
          )}
        </div>

        {/* right column */}
        <div className="space-y-5">
          <Reveal delay={40}>
            <section className="card">
              <header className="px-4 pt-3.5 pb-2.5 border-b border-line-soft">
                <h3 className="font-display font-bold text-[15px] text-ink flex items-center gap-2"><span className="text-brass-600"><IcSeal size={16} /></span>Quick actions</h3>
              </header>
              <div className="p-3 grid grid-cols-1 gap-1.5">
                {QUICKS.map((qk) => (
                  <button key={qk.key} onClick={() => setQa(qk.key)}
                    className="text-left px-3 py-2 rounded-md border border-line bg-card hover:border-pine-400 hover:bg-pine-50 transition-all cursor-pointer text-[12.5px] font-medium text-ink-soft hover:text-pine-700">
                    {qk.label}
                  </button>
                ))}
              </div>
            </section>
          </Reveal>

          <Reveal delay={80}>
            <section className="card">
              <header className="px-4 pt-3.5 pb-2.5 border-b border-line-soft flex items-center justify-between">
                <h3 className="font-display font-bold text-[15px] text-ink flex items-center gap-2"><span className="text-pine-600"><IcClock size={16} /></span>Recent activity</h3>
                <span className="ref text-ink-faint">audit trail</span>
              </header>
              {data.activity.length === 0 ? (
                <p className="px-4 py-5 text-[13px] text-ink-faint">Institutional activity will appear here as records are registered.</p>
              ) : (
                <ol className="px-4 py-3">
                  {data.activity.map((a, i) => (
                    <li key={a.id} className="relative pl-5 pb-3.5 last:pb-1">
                      {i < data.activity.length - 1 && <span className="absolute left-[5px] top-3 bottom-0 w-px bg-line" />}
                      <span className="absolute left-0 top-1.5 size-[11px] rounded-full border-2 border-card bg-pine-400" />
                      <p className="text-[12.5px] text-ink leading-snug"><span className="font-semibold">{a.userName}</span> · {a.action.toLowerCase()}</p>
                      <p className="text-[11.5px] text-ink-faint truncate">{a.target}</p>
                      <p className="text-[10px] font-mono text-ink-faint mt-0.5">{relTime(a.at)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </Reveal>

          <Reveal delay={120}>
            <section className="card p-4 bg-pine-900 border-pine-800 sidebar-texture">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-brass-400">Upcoming · next 7 days</p>
              {data.upcoming.slice(0, 3).map((m) => (
                <button key={m.id} onClick={() => nav({ name: 'meeting', id: m.id })} className="w-full text-left mt-2.5 group cursor-pointer">
                  <p className="text-[12.5px] font-semibold text-paper group-hover:text-brass-300 transition-colors truncate">{m.title}</p>
                  <p className="text-[11px] text-pine-300">{fmtDate(m.date)} · {fmtTime12(m.startTime)} · {m.venue}</p>
                </button>
              ))}
              {data.upcoming.length === 0 && <p className="text-[12px] text-pine-300 mt-2">No meetings in the coming week.</p>}
            </section>
          </Reveal>
        </div>
      </div>

      <QAHost open={qa} onClose={() => setQa(null)} />
    </div>
  );
}


