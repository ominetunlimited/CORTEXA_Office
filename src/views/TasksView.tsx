import React, { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { PageHead, Chip, EmptyState, Modal, Field, Avatar, Toggle } from '../components/ui';
import { QAHost } from '../components/quick';
import {
  TASK_STATUSES, TASK_STATUS_META, PRIORITY_META, PRIORITIES,
  type TaskItem, type TaskStatus, type Priority,
} from '../lib/types';
import { cx, daysUntil, dueLabel, fmtDate, relTime, dateOnly } from '../lib/utils';
import { IcCheckSquare, IcSearch, IcPlus, IcClock, IcSeal, IcEnvelope, IcUsers, IcFile } from '../components/icons';

const COLS: TaskStatus[] = ['Not Started', 'In Progress', 'Pending', 'Completed'];

export function TasksView() {
  const { db, me, users, departments, route, nav, canUser } = useStore();
  const [q, setQ] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [deptId, setDeptId] = useState('');
  const [qa, setQa] = useState(false);
  const [selId, setSelId] = useState<string | null>(route.id ?? null);

  const tasks = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return db.tasks
      .filter((t) => t.orgId === me?.orgId && !t.archived)
      .filter((t) => !mineOnly || t.assigneeId === me?.id || t.createdById === me?.id)
      .filter((t) => !deptId || t.departmentId === deptId)
      .filter((t) => !qq || [t.title, t.description, t.ref].some((s) => s.toLowerCase().includes(qq)));
  }, [db.tasks, me, q, mineOnly, deptId]);

  const sel = selId ? db.tasks.find((t) => t.id === selId) : undefined;
  const overdueCount = tasks.filter((t) => !['Completed', 'Cancelled'].includes(t.status) && t.dueDate && daysUntil(t.dueDate) < 0).length;

  return (
    <div>
      <PageHead kicker="Actions & delegation" title="Tasks & action points"
        sub={overdueCount ? `${overdueCount} task${overdueCount === 1 ? '' : 's'} overdue — escalation recommended.` : 'Every task has an owner and a deadline.'}>
        {canUser('create') && <button className="btn-primary" onClick={() => setQa(true)}><IcPlus size={15} /> Create task</button>}
      </PageHead>

      <div className="card p-3 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"><IcSearch size={14} /></span>
          <input className="input !pl-8" placeholder="Search tasks…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-[12.5px] text-ink-soft cursor-pointer">
          <Toggle checked={mineOnly} onChange={setMineOnly} /> My tasks
        </label>
        <select className="input !w-auto" value={deptId} onChange={(e) => setDeptId(e.target.value)}>
          <option value="">Department</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <span className="ref text-ink-faint ml-auto">{tasks.length} task{tasks.length === 1 ? '' : 's'}</span>
      </div>

      {tasks.length === 0 ? (
        <div className="card"><EmptyState icon={<IcCheckSquare size={20} />} title="No tasks on the register"
          body="Create tasks from correspondence, meetings or matters — each with an owner, deadline and audit trail.">
          {canUser('create') && <button className="btn-primary" onClick={() => setQa(true)}><IcPlus size={14} /> Create the first task</button>}
        </EmptyState></div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3.5 items-start">
          {COLS.map((col) => {
            const list = tasks.filter((t) => (col === 'Completed' ? ['Completed', 'Cancelled'].includes(t.status) : t.status === col))
              .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
            return (
              <div key={col} className="card overflow-hidden">
                <header className="px-3.5 py-2.5 border-b border-line-soft flex items-center gap-2">
                  <span className={cx('dot', TASK_STATUS_META[col].dot)} />
                  <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-soft">{col}</h3>
                  <span className="ml-auto ref text-ink-faint">{list.length}</span>
                </header>
                <div className="p-2 space-y-2 min-h-[80px]">
                  {list.length === 0 && <p className="text-[11.5px] text-ink-faint text-center py-4">Empty</p>}
                  {list.map((t) => {
                    const assignee = users.find((u) => u.id === t.assigneeId);
                    const overdue = !['Completed', 'Cancelled'].includes(t.status) && t.dueDate && daysUntil(t.dueDate) < 0;
                    const due = dueLabel(t.dueDate);
                    return (
                      <button key={t.id} onClick={() => setSelId(t.id)}
                        className={cx('w-full text-left rounded-md border bg-card px-3 py-2.5 transition-all duration-150 cursor-pointer hover:-translate-y-px hover:shadow-sm',
                          overdue ? 'border-clay-100 bg-clay-50/50 hover:border-clay-500' : 'border-line hover:border-pine-400')}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Chip meta={PRIORITY_META[t.priority]} />
                          {t.status === 'Cancelled' && <Chip meta={TASK_STATUS_META.Cancelled} />}
                          {overdue && <Chip meta={TASK_STATUS_META.Overdue} />}
                        </div>
                        <p className="text-[13px] font-medium text-ink leading-snug mt-1.5">{t.title}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {assignee ? <Avatar name={assignee.name} color={assignee.color} size={20} /> : <span className="w-5 h-5 rounded-full border border-dashed border-line flex items-center justify-center text-[9px] text-ink-faint">?</span>}
                          <span className={cx('text-[11px] font-medium flex items-center gap-1',
                            overdue ? 'text-clay-600' : due.tone === 'today' ? 'text-brass-600' : 'text-ink-faint')}>
                            <IcClock size={11} /> {due.text}
                          </span>
                          <span className="ml-auto ref text-[10px] text-ink-faint">{t.ref.slice(-5)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sel && <TaskDetail key={sel.id} t={sel} onClose={() => { setSelId(null); if (route.id) nav({ name: 'tasks' }); }} />}
      <QAHost open={qa ? 'task' : null} onClose={() => setQa(false)} />
    </div>
  );
}

function TaskDetail({ t, onClose }: { t: TaskItem; onClose: () => void }) {
  const { db, me, users, departments, nav, canUser, updateTask, addComment } = useStore();
  const [comment, setComment] = useState('');
  const assignee = users.find((u) => u.id === t.assigneeId);
  const creator = users.find((u) => u.id === t.createdById);
  const comments = db.comments.filter((x) => x.targetType === 'task' && x.targetId === t.id);
  const overdue = !['Completed', 'Cancelled'].includes(t.status) && t.dueDate && daysUntil(t.dueDate) < 0;
  const due = dueLabel(t.dueDate);

  const related = useMemo(() => {
    if (t.relatedType === 'matter') return db.matters.find((m) => m.id === t.relatedId);
    if (t.relatedType === 'correspondence') return db.correspondence.find((c) => c.id === t.relatedId);
    if (t.relatedType === 'meeting') return db.meetings.find((m) => m.id === t.relatedId);
    if (t.relatedType === 'document') return db.documents.find((d) => d.id === t.relatedId);
    return undefined;
  }, [db, t]);

  const relRoute = t.relatedType === 'matter' ? { name: 'matter' as const, id: t.relatedId }
    : t.relatedType === 'correspondence' ? { name: 'correspondence' as const, id: t.relatedId }
    : t.relatedType === 'meeting' ? { name: 'meeting' as const, id: t.relatedId }
    : t.relatedType === 'document' ? { name: 'documents' as const, id: t.relatedId } : undefined;

  const editable = canUser('assign') || canUser('create') || t.assigneeId === me?.id;

  return (
    <Modal open onClose={onClose} w="max-w-xl"
      title={<span className="flex items-center gap-2 flex-wrap"><span className="ref text-pine-700">{t.ref}</span>
        <Chip meta={overdue ? TASK_STATUS_META.Overdue : TASK_STATUS_META[t.status]} /><Chip meta={PRIORITY_META[t.priority]} /></span>}
      subtitle={`Created by ${creator?.name ?? '—'} ${relTime(t.createdAt)}`}
      footer={
        <div className="flex gap-2">
          {t.status !== 'Completed' && t.status !== 'Cancelled' && editable && (
            <button className="btn-primary" onClick={() => updateTask(t.id, { status: 'Completed' }, 'Status changed')}><IcCheckSquare size={13} /> Mark completed</button>
          )}
          {t.status === 'Completed' && editable && (
            <button className="btn-ghost" onClick={() => updateTask(t.id, { status: 'In Progress' }, 'Status changed')}>Reopen</button>
          )}
          <button className="btn-ghost ml-auto" onClick={onClose}>Close</button>
        </div>
      }>
      <div className="space-y-4">
        <div>
          <h4 className="font-display font-bold text-[16px] text-ink leading-snug">{t.title}</h4>
          {t.description && <p className="text-[13px] text-ink-soft mt-1.5 leading-relaxed">{t.description}</p>}
          <p className={cx('mt-2 text-[12px] font-semibold px-2.5 py-1.5 rounded border inline-flex items-center gap-1.5',
            overdue ? 'text-clay-700 bg-clay-50 border-clay-100' : due.tone === 'today' ? 'text-brass-700 bg-brass-50 border-brass-300' : 'text-steel-700 bg-steel-50 border-steel-100')}>
            <IcClock size={12} /> {t.dueDate ? `Due ${fmtDate(t.dueDate)} · ${due.text}` : 'No deadline set'}
            {t.completedAt && ` · completed ${relTime(t.completedAt)}`}
          </p>
        </div>

        {editable ? (
          <div className="card p-3.5 grid sm:grid-cols-2 gap-3">
            <Field label="Assigned to">
              <select className="input" value={t.assigneeId ?? ''} onChange={(e) => updateTask(t.id, { assigneeId: e.target.value || undefined }, e.target.value ? 'Task reassigned' : 'Assignee cleared')}>
                <option value="">Unassigned</option>
                {users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="input" value={t.status} onChange={(e) => updateTask(t.id, { status: e.target.value as TaskStatus }, 'Status changed')}>
                {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Due date">
              <input type="date" className="input" value={t.dueDate ? t.dueDate.slice(0, 10) : ''} min={dateOnly(-30)}
                onChange={(e) => updateTask(t.id, { dueDate: e.target.value ? new Date(`${e.target.value}T17:00:00`).toISOString() : undefined }, 'Deadline updated')} />
            </Field>
            <Field label="Priority">
              <select className="input" value={t.priority} onChange={(e) => updateTask(t.id, { priority: e.target.value as Priority }, 'Priority updated')}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
          </div>
        ) : (
          <div className="card p-3.5 text-[12.5px] text-ink-soft">
            Assigned to <span className="font-semibold text-ink">{assignee?.name ?? 'nobody'}</span> · {departments.find((d) => d.id === t.departmentId)?.name ?? 'General'} department. Your role has read access to this task.
          </div>
        )}

        {related && relRoute && (
          <button onClick={() => { nav({ ...relRoute }); onClose(); }} className="w-full card px-3 py-2.5 text-left hover:border-pine-400 cursor-pointer flex items-center gap-2.5">
            <span className="text-pine-600">{t.relatedType === 'matter' ? <IcSeal size={15} /> : t.relatedType === 'correspondence' ? <IcEnvelope size={15} /> : t.relatedType === 'meeting' ? <IcUsers size={15} /> : <IcFile size={15} />}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-[10.5px] uppercase tracking-wider font-semibold text-ink-faint">Linked {t.relatedType}</span>
              <span className="block text-[12.5px] font-medium text-ink truncate">{('title' in related ? related.title : 'subject' in related ? (related as { subject: string }).subject : '')}</span>
            </span>
          </button>
        )}

        <div>
          <p className="label">Comments ({comments.length})</p>
          <div className="space-y-2 mb-2">
            {comments.map((cm) => {
              const u = users.find((x) => x.id === cm.userId);
              return (
                <div key={cm.id} className="card px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {u && <Avatar name={u.name} color={u.color} size={20} />}
                    <span className="text-[12px] font-semibold">{u?.name}</span>
                    <span className="ml-auto text-[10.5px] font-mono text-ink-faint">{relTime(cm.at)}</span>
                  </div>
                  <p className="text-[12.5px] text-ink-soft mt-1.5">{cm.text}</p>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="Progress note…" value={comment} onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && comment.trim()) { addComment('task', t.id, comment.trim()); setComment(''); } }} />
            <button className="btn-ghost" onClick={() => { if (comment.trim()) { addComment('task', t.id, comment.trim()); setComment(''); } }}>Post</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}


