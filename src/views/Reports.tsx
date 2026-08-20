import React, { useMemo } from 'react';
import { useStore, canSee } from '../lib/store';
import { PageHead, Reveal, Avatar } from '../components/ui';
import { cx, download, toCSV, lastNMonthKeys, monthKey, monthLabel, daysUntil, fmtDate } from '../lib/utils';
import { IcDownload, IcChart } from '../components/icons';
import { TASK_STATUSES } from '../lib/types';

export function Reports() {
  const { db, me, users, departments, toast } = useStore();

  const data = useMemo(() => {
    const corr = db.correspondence.filter((c) => c.orgId === me?.orgId && !c.archived && canSee(me, c.security));
    const tasks = db.tasks.filter((t) => t.orgId === me?.orgId && !t.archived);
    const meetings = db.meetings.filter((m) => m.orgId === me?.orgId && !m.archived);
    const docs = db.documents.filter((d) => d.orgId === me?.orgId && !d.archived && canSee(me, d.security));
    const months = lastNMonthKeys(6);
    const byMonth = months.map((mk) => ({
      label: monthLabel(mk),
      incoming: corr.filter((c) => c.direction === 'incoming' && monthKey(c.dateReceived) === mk).length,
      outgoing: corr.filter((c) => c.direction === 'outgoing' && monthKey(c.dateReceived) === mk).length,
    }));
    const byDept = departments.map((d) => ({ label: d.code, name: d.name, value: corr.filter((c) => c.departmentId === d.id).length })).sort((a, b) => b.value - a.value);
    const taskByStatus = TASK_STATUSES.map((s) => ({ label: s, value: tasks.filter((t) => t.status === s).length }));
    const docsByCat = Object.entries(docs.reduce<Record<string, number>>((acc, d) => { acc[d.category] = (acc[d.category] || 0) + 1; return acc; }, {}))
      .map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);
    const meetingByStatus = ['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'Rescheduled'].map((s) => ({ label: s, value: meetings.filter((m) => m.status === s).length })).filter((x) => x.value > 0);
    const workload = users
      .map((u) => ({
        user: u,
        open: tasks.filter((t) => t.assigneeId === u.id && !['Completed', 'Cancelled'].includes(t.status)).length,
        overdue: tasks.filter((t) => t.assigneeId === u.id && !['Completed', 'Cancelled'].includes(t.status) && t.dueDate && daysUntil(t.dueDate) < 0).length,
        approvals: db.approvals.filter((a) => a.orgId === me?.orgId && a.requestedById === u.id && a.overall === 'Pending').length,
        meetings: meetings.filter((m) => m.organiserId === u.id && m.status !== 'Cancelled' && m.status !== 'Completed' && daysUntil(m.date) >= 0).length,
      }))
      .filter((w) => w.open + w.overdue + w.approvals + w.meetings > 0)
      .sort((a, b) => b.open + b.overdue - (a.open + a.overdue))
      .slice(0, 8);
    return { corr, tasks, meetings, docs, byMonth, byDept, taskByStatus, docsByCat, meetingByStatus, workload };
  }, [db, me, users, departments]);

  const exportCSV = (kind: 'correspondence' | 'tasks' | 'documents') => {
    let rows: Record<string, string | number>[] = [];
    if (kind === 'correspondence') rows = data.corr.map((c) => ({ Reference: c.ref, Direction: c.direction, Subject: c.subject, Type: c.type, Sender: c.senderOrg ?? c.sender ?? '', Recipient: c.recipientOrg ?? c.recipient, Status: c.status, Priority: c.priority, Received: c.dateReceived.slice(0, 10), Deadline: c.responseDeadline?.slice(0, 10) ?? '' }));
    if (kind === 'tasks') rows = data.tasks.map((t) => ({ Reference: t.ref, Title: t.title, Assignee: users.find((u) => u.id === t.assigneeId)?.name ?? 'Unassigned', Status: t.status, Priority: t.priority, Due: t.dueDate?.slice(0, 10) ?? '', Completed: t.completedAt?.slice(0, 10) ?? '' }));
    if (kind === 'documents') rows = data.docs.map((d) => ({ FileNumber: d.fileNumber, Title: d.title, Category: d.category, Security: d.security, Status: d.status, Versions: d.versions.length, Updated: d.updatedAt.slice(0, 10) }));
    download(`cortexa-${kind}-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows), 'text/csv');
    toast(`${kind[0].toUpperCase() + kind.slice(1)} register exported to CSV`);
  };

  return (
    <div>
      <PageHead kicker="Institutional analytics" title="Reports"
        sub="Live figures from the register — export any ledger to Excel/CSV for board packs and statutory returns.">
        <button className="btn-ghost" onClick={() => exportCSV('correspondence')}><IcDownload size={14} /> Correspondence CSV</button>
        <button className="btn-ghost" onClick={() => exportCSV('tasks')}><IcDownload size={14} /> Tasks CSV</button>
        <button className="btn-ghost" onClick={() => exportCSV('documents')}><IcDownload size={14} /> Documents CSV</button>
      </PageHead>

      <div className="grid lg:grid-cols-2 gap-4">
        <Reveal className="card p-4">
          <ChartTitle t="Correspondence volume" s="Incoming vs outgoing · last 6 months" />
          <PairedBars data={data.byMonth} />
        </Reveal>
        <Reveal delay={50} className="card p-4">
          <ChartTitle t="Correspondence by department" s="Where the register works hardest" />
          <HBars data={data.byDept.map((d) => ({ label: `${d.label} · ${d.name}`, value: d.value }))} color="var(--color-pine-600)" />
        </Reveal>
        <Reveal className="card p-4">
          <ChartTitle t="Task ledger" s="By status across the institution" />
          <div className="flex items-center gap-6">
            <Donut data={data.taskByStatus.filter((x) => x.value > 0)} />
            <div className="flex-1 space-y-1.5">
              {data.taskByStatus.map((t) => (
                <p key={t.label} className="flex items-center justify-between text-[12.5px] text-ink-soft">
                  <span>{t.label}</span><span className="ref font-semibold text-ink">{t.value}</span>
                </p>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal delay={50} className="card p-4">
          <ChartTitle t="Documents by category" s="Records vault composition" />
          <HBars data={data.docsByCat} color="var(--color-brass-500)" />
        </Reveal>
        <Reveal className="card p-4">
          <ChartTitle t="Meetings" s="By status" />
          <HBars data={data.meetingByStatus} color="var(--color-steel-600)" />
        </Reveal>
        <Reveal delay={50} className="card p-4">
          <ChartTitle t="Executive workload" s="Open and overdue actions by officer" />
          {data.workload.length === 0 ? <p className="text-[12.5px] text-ink-faint py-6 text-center">No open workload recorded.</p> : (
            <table className="w-full">
              <thead><tr><th className="th !px-1">Officer</th><th className="th">Open</th><th className="th">Overdue</th><th className="th">Approvals</th><th className="th">Meetings</th></tr></thead>
              <tbody>
                {data.workload.map((w) => (
                  <tr key={w.user.id}>
                    <td className="td !px-1">
                      <span className="flex items-center gap-2"><Avatar name={w.user.name} color={w.user.color} size={22} />
                        <span className="min-w-0"><span className="block text-[12.5px] font-medium text-ink leading-tight truncate">{w.user.name}</span>
                          <span className="text-[10.5px] text-ink-faint">{w.user.title}</span></span></span>
                    </td>
                    <td className="td ref font-semibold text-pine-700">{w.open}</td>
                    <td className={cx('td ref font-semibold', w.overdue ? 'text-clay-600' : 'text-ink-faint')}>{w.overdue}</td>
                    <td className="td ref text-brass-600">{w.approvals}</td>
                    <td className="td ref text-steel-600">{w.meetings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Reveal>
      </div>

      <Reveal className="card p-4 mt-4">
        <ChartTitle t="Pending & overdue correspondence" s="The response-risk ledger" />
        {(() => {
          const rows = data.corr.filter((c) => c.responseRequired && !['Responded', 'Closed', 'Archived'].includes(c.status))
            .sort((a, b) => (a.responseDeadline ?? '9999').localeCompare(b.responseDeadline ?? '9999')).slice(0, 8);
          if (!rows.length) return <p className="text-[12.5px] text-ink-faint py-6 text-center">No open response obligations. The register is current.</p>;
          return (
            <table className="w-full">
              <thead><tr><th className="th">Ref</th><th className="th">Subject</th><th className="th">Counterparty</th><th className="th">Deadline</th><th className="th">Status</th></tr></thead>
              <tbody>
                {rows.map((c) => {
                  const late = c.responseDeadline && daysUntil(c.responseDeadline) < 0;
                  return (
                    <tr key={c.id}>
                      <td className="td ref text-pine-700 whitespace-nowrap">{c.ref}</td>
                      <td className="td text-ink min-w-[200px]">{c.subject}</td>
                      <td className="td text-ink-soft whitespace-nowrap">{c.senderOrg ?? c.recipientOrg ?? '—'}</td>
                      <td className={cx('td whitespace-nowrap font-semibold', late ? 'text-clay-600' : 'text-ink-soft')}>{c.responseDeadline ? fmtDate(c.responseDeadline) : '—'}{late ? ' · overdue' : ''}</td>
                      <td className="td text-ink-soft whitespace-nowrap">{c.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          );
        })()}
      </Reveal>
    </div>
  );
}

function ChartTitle({ t, s }: { t: string; s: string }) {
  return (
    <div className="mb-3 flex items-start gap-2.5">
      <span className="text-pine-600 mt-0.5"><IcChart size={15} /></span>
      <div>
        <h3 className="font-display font-bold text-[14.5px] text-ink leading-tight">{t}</h3>
        <p className="text-[11px] text-ink-faint">{s}</p>
      </div>
    </div>
  );
}

function PairedBars({ data }: { data: { label: string; incoming: number; outgoing: number }[] }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.incoming, d.outgoing)));
  return (
    <div>
      <div className="flex items-end gap-3 h-40">
        {data.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <div className="w-full flex items-end justify-center gap-1 flex-1">
              <div className="w-1/3 max-w-[26px] bg-pine-600 rounded-t-sm transition-all duration-500 relative group" style={{ height: `${(d.incoming / max) * 100}%`, minHeight: d.incoming ? 4 : 1 }}>
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] ref text-pine-700 opacity-0 group-hover:opacity-100 transition-opacity">{d.incoming}</span>
              </div>
              <div className="w-1/3 max-w-[26px] bg-brass-400 rounded-t-sm transition-all duration-500 relative group" style={{ height: `${(d.outgoing / max) * 100}%`, minHeight: d.outgoing ? 4 : 1 }}>
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] ref text-brass-700 opacity-0 group-hover:opacity-100 transition-opacity">{d.outgoing}</span>
              </div>
            </div>
            <p className="text-[10px] font-mono text-ink-faint">{d.label}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3 text-[11px] text-ink-soft">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-pine-600" /> Incoming</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brass-400" /> Outgoing</span>
      </div>
    </div>
  );
}

function HBars({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="text-[12.5px] text-ink-faint py-6 text-center">No data in this period.</p>;
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex justify-between text-[11.5px] mb-0.5">
            <span className="text-ink-soft truncate pr-2">{d.label}</span>
            <span className="ref font-semibold text-ink">{d.value}</span>
          </div>
          <div className="h-2 rounded-full bg-line-soft overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const DONUT_COLORS = ['var(--color-steel-500)', 'var(--color-pine-600)', 'var(--color-brass-500)', 'var(--color-moss-600)', 'var(--color-ink-faint)'];

function Donut({ data }: { data: { label: string; value: number }[] }) {
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0));
  const R = 42, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0 -rotate-90">
      <circle cx="60" cy="60" r={R} fill="none" stroke="var(--color-line-soft)" strokeWidth="14" />
      {data.map((d, i) => {
        const frac = d.value / total;
        const dash = frac * C;
        const off = -acc * C;
        acc += frac;
        return <circle key={d.label} cx="60" cy="60" r={R} fill="none" stroke={DONUT_COLORS[i % DONUT_COLORS.length]} strokeWidth="14"
          strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={off} className="transition-all duration-700" />;
      })}
      <circle cx="60" cy="60" r="30" fill="var(--color-card)" />
      <text x="60" y="60" textAnchor="middle" dominantBaseline="central" transform="rotate(90 60 60)"
        className="font-display" style={{ fontSize: 20, fontWeight: 800, fill: 'var(--color-ink)' }}>{total}</text>
    </svg>
  );
}
