import React, { useMemo, useState } from 'react';
import { useStore, canSee } from '../lib/store';
import { PageHead, EmptyState, Confirm, Seg } from '../components/ui';
import { cx, relTime, fmtDate } from '../lib/utils';
import { IcArchive, IcRestore, IcShield, IcEnvelope, IcFile, IcSeal, IcUsers, IcCheckSquare } from '../components/icons';

type Kind = 'all' | 'correspondence' | 'document' | 'matter' | 'meeting' | 'task';

interface Row { kind: Exclude<Kind, 'all'>; id: string; ref: string; title: string; meta: string; at: string }

export function ArchiveView() {
  const { db, me, nav, canUser, restoreRecord } = useStore();
  const [kind, setKind] = useState<Kind>('all');
  const [confirmRow, setConfirmRow] = useState<Row | null>(null);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    db.correspondence.filter((c) => c.orgId === me?.orgId && c.archived && canSee(me, c.security)).forEach((c) => out.push({ kind: 'correspondence', id: c.id, ref: c.ref, title: c.subject, meta: `${c.direction} · ${c.type}`, at: c.dateReceived }));
    db.documents.filter((d) => d.orgId === me?.orgId && d.archived && canSee(me, d.security)).forEach((d) => out.push({ kind: 'document', id: d.id, ref: d.fileNumber, title: d.title, meta: `${d.category} · retention ${d.retention}`, at: d.updatedAt }));
    db.matters.filter((m) => m.orgId === me?.orgId && m.archived && canSee(me, m.security)).forEach((m) => out.push({ kind: 'matter', id: m.id, ref: m.fileNumber, title: m.title, meta: m.category, at: m.updatedAt }));
    db.meetings.filter((m) => m.orgId === me?.orgId && m.archived).forEach((m) => out.push({ kind: 'meeting', id: m.id, ref: m.ref, title: m.title, meta: `${m.date} · ${m.venue}`, at: m.date }));
    db.tasks.filter((t) => t.orgId === me?.orgId && t.archived).forEach((t) => out.push({ kind: 'task', id: t.id, ref: t.ref, title: t.title, meta: t.status, at: t.createdAt }));
    return out.filter((r) => kind === 'all' || r.kind === kind).sort((a, b) => b.at.localeCompare(a.at));
  }, [db, me, kind]);

  const ICONS: Record<Row['kind'], React.ReactNode> = {
    correspondence: <IcEnvelope size={15} />, document: <IcFile size={15} />, matter: <IcSeal size={15} />,
    meeting: <IcUsers size={15} />, task: <IcCheckSquare size={15} />,
  };

  return (
    <div>
      <PageHead kicker="Institutional archive" title="Archive & retention"
        sub="Records are never destroyed silently. Archived records stay searchable and restorable under the retention policy.">
        <Seg value={kind} onChange={setKind} options={[
          { v: 'all', label: 'All' }, { v: 'correspondence', label: 'Corr.' }, { v: 'document', label: 'Docs' },
          { v: 'matter', label: 'Matters' }, { v: 'meeting', label: 'Meetings' }, { v: 'task', label: 'Tasks' },
        ]} />
      </PageHead>

      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <div className="card p-4 md:col-span-2 flex gap-3">
          <span className="text-brass-600 mt-0.5"><IcShield size={18} /></span>
          <div>
            <p className="text-[13px] font-semibold text-ink">Retention policy (demo configuration)</p>
            <p className="text-[12px] text-ink-soft mt-1 leading-relaxed">
              Correspondence & matters — <span className="font-semibold">10 years</span> after closure · Financial records — <span className="font-semibold">7 years</span> ·
              Routine circulars — <span className="font-semibold">3 years</span>. Records reaching the end of retention enter a
              <span className="font-semibold"> destruction-review window</span> requiring Organisation Admin sign-off; nothing is deleted automatically.
            </p>
          </div>
        </div>
        <div className="card p-4 bg-pine-900 border-pine-800 sidebar-texture">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-brass-400">Archive ledger</p>
          <p className="font-display font-extrabold text-[30px] text-paper mt-1 leading-none">{rows.length}</p>
          <p className="text-[11.5px] text-pine-300 mt-1.5">record{rows.length === 1 ? '' : 's'} held in cold storage · restorable at any time</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card"><EmptyState icon={<IcArchive size={20} />} title="The archive is empty"
          body="Closed records move here when archived by authorised officers. Nothing is ever deleted without explicit approval." /></div>
      ) : (
        <div className="card divide-y divide-line-soft overflow-hidden">
          {rows.map((r) => (
            <div key={r.kind + r.id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-8 h-8 rounded-md bg-line-soft text-ink-soft flex items-center justify-center shrink-0">{ICONS[r.kind]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink truncate">{r.title}</p>
                <p className="text-[11px] text-ink-faint"><span className="ref">{r.ref}</span> · {r.meta} · archived around {fmtDate(r.at)}</p>
              </div>
              <span className="chip bg-line-soft text-ink-faint capitalize hidden sm:inline-flex">{r.kind}</span>
              {canUser('archive') && (
                <button className="btn-ghost btn-sm" onClick={() => setConfirmRow(r)}><IcRestore size={13} /> Restore</button>
              )}
            </div>
          ))}
        </div>
      )}

      <Confirm open={!!confirmRow} onClose={() => setConfirmRow(null)} title="Restore this record?" tone="primary" confirmLabel="Restore to active register"
        body={<>Restoring returns <span className="font-semibold text-ink">{confirmRow?.title}</span> to the active register with its full history and versions intact. The action is written to the audit trail.</>}
        onConfirm={() => { if (confirmRow) { restoreRecord(confirmRow.kind, confirmRow.id); } }} />
    </div>
  );
}

void cx; void relTime;
