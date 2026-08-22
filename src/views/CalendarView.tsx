import React, { useMemo, useState } from 'react';
import { useStore, canSee } from '../lib/store';
import { PageHead, Chip, Seg, Drawer, Field, EmptyState } from '../components/ui';
import { MEETING_STATUS_META, TASK_STATUS_META, type Meeting } from '../lib/types';
import { cx, dateOnly, daysUntil, fmtDate, fmtTime12, fmtWeekday, fmtDateShort } from '../lib/utils';
import { IcChevL, IcChevR, IcCalendar, IcClock, IcUsers, IcCheckSquare, IcPlus } from '../components/icons';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DayItem {
  kind: 'meeting' | 'deadline' | 'task';
  id: string;
  title: string;
  time?: string;
  meta: { label: string; chip: string; dot: string };
  routeName: 'meeting' | 'correspondence' | 'tasks';
  date: string;
}

export function CalendarView() {
  const { db, me, nav, canUser, createMeeting } = useStore();
  const today = new Date();
  const [view, setView] = useState<'month' | 'week' | 'agenda'>('month');
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [dayOpen, setDayOpen] = useState<string | null>(null);

  const items = useMemo(() => {
    const out: DayItem[] = [];
    db.meetings.filter((m) => m.orgId === me?.orgId && !m.archived && m.status !== 'Cancelled').forEach((m) => {
      out.push({ kind: 'meeting', id: m.id, title: m.title, time: m.startTime, meta: MEETING_STATUS_META[m.status], routeName: 'meeting', date: m.date });
    });
    db.correspondence.filter((c) => c.orgId === me?.orgId && !c.archived && c.responseRequired && c.responseDeadline && !['Responded', 'Closed', 'Archived'].includes(c.status) && canSee(me, c.security)).forEach((c) => {
      const late = daysUntil(c.responseDeadline) < 0;
      out.push({
        kind: 'deadline', id: c.id, title: `Response due — ${c.subject}`,
        meta: late ? { label: 'Overdue', chip: 'bg-clay-100 text-clay-700', dot: 'bg-clay-500' } : { label: 'Deadline', chip: 'bg-brass-100 text-brass-700', dot: 'bg-brass-500' },
        routeName: 'correspondence', date: c.responseDeadline!.slice(0, 10),
      });
    });
    db.tasks.filter((t) => t.orgId === me?.orgId && !t.archived && !['Completed', 'Cancelled'].includes(t.status) && t.dueDate).forEach((t) => {
      const late = daysUntil(t.dueDate) < 0;
      out.push({
        kind: 'task', id: t.id, title: t.title,
        meta: late ? TASK_STATUS_META.Overdue : { label: 'Task due', chip: 'bg-steel-100 text-steel-700', dot: 'bg-steel-500' },
        routeName: 'tasks', date: t.dueDate!.slice(0, 10),
      });
    });
    return out;
  }, [db, me]);

  const byDay = useMemo(() => {
    const map: Record<string, DayItem[]> = {};
    items.forEach((it) => { (map[it.date] = map[it.date] || []).push(it); });
    Object.values(map).forEach((arr) => arr.sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99')));
    return map;
  }, [items]);

  const todayStr = dateOnly(0);

  /* month grid */
  const monthCells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    const cells: string[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    return cells;
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = new Date(cursor);
    start.setDate(cursor.getDate() - cursor.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
  }, [cursor]);

  const shift = (dir: number) => {
    if (view === 'month') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
    else { const d = new Date(cursor); d.setDate(d.getDate() + dir * 7); setCursor(d); }
  };

  const agenda = useMemo(() => {
    const upcoming = items.filter((i) => i.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
    const groups: Record<string, DayItem[]> = {};
    upcoming.forEach((i) => { (groups[i.date] = groups[i.date] || []).push(i); });
    return groups;
  }, [items, todayStr]);

  return (
    <div>
      <PageHead kicker="Institutional calendar" title="Meetings, deadlines & reminders"
        sub="One calendar for meetings, response deadlines and task due dates — the reminder engine watches all of them.">
        <Seg value={view} onChange={setView} options={[{ v: 'month', label: 'Month' }, { v: 'week', label: 'Week' }, { v: 'agenda', label: 'Agenda' }]} />
      </PageHead>

      <div className="card p-3 mb-4 flex items-center gap-2">
        <button className="btn-ghost btn-sm !px-2" onClick={() => shift(-1)} aria-label="Previous"><IcChevL size={14} /></button>
        <button className="btn-ghost btn-sm" onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>Today</button>
        <button className="btn-ghost btn-sm !px-2" onClick={() => shift(1)} aria-label="Next"><IcChevR size={14} /></button>
        <h3 className="font-display font-bold text-[15px] text-ink ml-2">
          {view === 'month' ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}` : view === 'week' ? `Week of ${fmtDate(weekDays[0])}` : 'Upcoming agenda'}
        </h3>
        <div className="ml-auto hidden sm:flex items-center gap-3 text-[11px] text-ink-faint">
          <span className="flex items-center gap-1.5"><span className="dot bg-pine-600" /> Meetings</span>
          <span className="flex items-center gap-1.5"><span className="dot bg-brass-500" /> Deadlines</span>
          <span className="flex items-center gap-1.5"><span className="dot bg-steel-500" /> Tasks</span>
        </div>
      </div>

      {view === 'month' && (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-line bg-paper/70">
            {WD.map((d) => <div key={d} className="px-2 py-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-faint text-center">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {monthCells.map((d, i) => {
              const inMonth = d.slice(5, 7) === String(cursor.getMonth() + 1).padStart(2, '0');
              const list = byDay[d] ?? [];
              const isToday = d === todayStr;
              return (
                <button key={d} onClick={() => setDayOpen(d)}
                  className={cx('min-h-[92px] border-b border-r border-line-soft p-1.5 text-left align-top transition-colors cursor-pointer hover:bg-pine-50/60',
                    !inMonth && 'bg-paper/60 opacity-55', (i + 1) % 7 === 0 && 'border-r-0')}>
                  <span className={cx('inline-flex items-center justify-center w-6 h-6 rounded-full text-[11.5px] font-semibold',
                    isToday ? 'bg-pine-700 text-pine-50' : 'text-ink-soft')}>{Number(d.slice(8, 10))}</span>
                  <div className="mt-1 space-y-0.5">
                    {list.slice(0, 3).map((it) => (
                      <p key={it.kind + it.id} className={cx('text-[10px] leading-tight rounded px-1 py-0.5 truncate font-medium', it.meta.chip)}>
                        {it.time ? fmtTime12(it.time) + ' ' : ''}{it.title}
                      </p>
                    ))}
                    {list.length > 3 && <p className="text-[9.5px] text-ink-faint font-mono px-1">+{list.length - 3} more</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {view === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {weekDays.map((d) => {
            const list = byDay[d] ?? [];
            const isToday = d === todayStr;
            return (
              <div key={d} className={cx('card p-2.5 min-h-[120px]', isToday && 'border-pine-500 ring-1 ring-pine-200')}>
                <p className={cx('text-[11px] font-bold uppercase tracking-wider', isToday ? 'text-pine-700' : 'text-ink-faint')}>{fmtWeekday(d)} <span className="font-mono">{d.slice(8, 10)}</span></p>
                <div className="mt-1.5 space-y-1">
                  {list.length === 0 && <p className="text-[10.5px] text-ink-faint">—</p>}
                  {list.map((it) => (
                    <button key={it.kind + it.id} onClick={() => nav({ name: it.routeName, id: it.id })}
                      className={cx('w-full text-left text-[10.5px] leading-tight rounded px-1.5 py-1 font-medium hover:brightness-95 cursor-pointer', it.meta.chip)}>
                      {it.time ? `${fmtTime12(it.time)} · ` : ''}{it.title}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'agenda' && (
        <div className="max-w-3xl space-y-4">
          {Object.keys(agenda).length === 0 && (
            <div className="card"><EmptyState icon={<IcCalendar size={20} />} title="Nothing upcoming" body="No meetings, deadlines or task due dates ahead. The register is calm." /></div>
          )}
          {Object.entries(agenda).slice(0, 14).map(([d, list]) => (
            <div key={d}>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint mb-1.5">
                {d === todayStr ? 'Today' : daysUntil(d) === 1 ? 'Tomorrow' : `${fmtWeekday(d)} · ${fmtDate(d)}`}
              </p>
              <div className="card divide-y divide-line-soft overflow-hidden">
                {list.map((it) => (
                  <button key={it.kind + it.id} onClick={() => nav({ name: it.routeName, id: it.id })}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-pine-50/70 cursor-pointer text-left transition-colors">
                    <span className={cx('dot', it.meta.dot)} />
                    <span className="ref text-ink-faint w-16 shrink-0">{it.time ? fmtTime12(it.time) : it.kind}</span>
                    <span className="flex-1 text-[13px] font-medium text-ink truncate">{it.title}</span>
                    <Chip meta={it.meta} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <DayDrawer date={dayOpen} onClose={() => setDayOpen(null)} items={dayOpen ? byDay[dayOpen] ?? [] : []} nav={nav} canCreate={canUser('create')} createMeeting={createMeeting} />
    </div>
  );
}

function DayDrawer({ date, onClose, items, nav, canCreate, createMeeting }: {
  date: string | null; onClose: () => void; items: DayItem[];
  nav: (r: { name: 'meeting' | 'correspondence' | 'tasks'; id: string }) => void;
  canCreate: boolean; createMeeting: (i: { title: string; date: string; startTime: string; endTime: string; venue: string }) => Meeting | null;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('11:00');
  const [venue, setVenue] = useState('');
  return (
    <Drawer open={!!date} onClose={() => { onClose(); setAdding(false); }} title={date ? `${fmtWeekday(date)}, ${fmtDate(date)}` : ''}
      subtitle={date === dateOnly(0) ? 'Today' : `${items.length} item${items.length === 1 ? '' : 's'} on this day`}>
      {items.length === 0 && !adding && <p className="text-[13px] text-ink-faint py-6 text-center">Nothing scheduled on this day.</p>}
      <div className="space-y-1.5">
        {items.map((it) => (
          <button key={it.kind + it.id} onClick={() => { nav({ name: it.routeName, id: it.id }); onClose(); }}
            className="w-full card px-3 py-2.5 text-left hover:border-pine-400 cursor-pointer flex items-center gap-2.5">
            <span className="text-pine-600">{it.kind === 'meeting' ? <IcUsers size={15} /> : it.kind === 'task' ? <IcCheckSquare size={15} /> : <IcClock size={15} />}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-[12.5px] font-medium text-ink truncate">{it.title}</span>
              {it.time && <span className="text-[11px] text-ink-faint font-mono">{fmtTime12(it.time)}</span>}
            </span>
            <Chip meta={it.meta} />
          </button>
        ))}
      </div>
      {canCreate && !adding && (
        <button className="btn-ghost w-full mt-4" onClick={() => setAdding(true)}><IcPlus size={13} /> Schedule meeting on {date ? fmtDateShort(date) : 'this day'}</button>
      )}
      {adding && date && (
        <div className="card p-3.5 mt-4 space-y-2.5">
          <Field label="Meeting title" req><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Start"><input type="time" className="input" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
            <Field label="End"><input type="time" className="input" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
          </div>
          <Field label="Venue" req><input className="input" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Boardroom" /></Field>
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn-primary flex-1" disabled={!title.trim() || !venue.trim()}
              onClick={() => { createMeeting({ title: title.trim(), date, startTime: start, endTime: end, venue: venue.trim() }); setTitle(''); setVenue(''); setAdding(false); }}>
              Schedule
            </button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
