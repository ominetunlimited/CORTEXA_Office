import React, { useMemo, useState } from 'react';
import { useStore, canSee } from '../lib/store';
import { PageHead, Chip, Drawer, Field, Modal, EmptyState, KV, Tabs, Seg, Avatar, Confirm, Hi } from '../components/ui';
import {
  CORR_STATUSES, CORR_STATUS_META, CORR_TYPES, PRIORITIES, PRIORITY_META, SECURITY_META,
  RESPONSE_OPTIONS, RESPONSE_META, DISPATCH_METHODS, DELIVERY_STATUSES,
  type CorrStatus, type Priority, type ResponseOption, type DispatchMethod, type DeliveryStatus, type Correspondence,
} from '../lib/types';
import { cx, daysUntil, dueLabel, fmtDate, fmtDateTime, relTime, dateOnly } from '../lib/utils';
import { IcEnvelope, IcSearch, IcSend, IcCheckSquare, IcSeal, IcArchive, IcPaperclip, IcMail, IcStamp, IcScan, IcRestore } from '../components/icons';

type DirTab = 'incoming' | 'outgoing' | 'email';

export function Correspondence() {
  const { db, me, route, nav } = useStore();
  const [tab, setTab] = useState<DirTab>((route.tab as DirTab) ?? 'incoming');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [priority, setPriority] = useState('');
  const [deptId, setDeptId] = useState('');
  const [quick, setQuick] = useState<'all' | 'response' | 'overdue' | 'invites'>('all');
  const [limit, setLimit] = useState(30);

  const { departments, users } = useStore();

  const all = useMemo(() => {
    const base = db.correspondence.filter((c) => c.orgId === me?.orgId && !c.archived && canSee(me, c.security));
    const qq = q.trim().toLowerCase();
    return base
      .filter((c) => c.direction === (tab === 'incoming' ? 'incoming' : 'outgoing'))
      .filter((c) => !status || c.status === status)
      .filter((c) => !type || c.type === type)
      .filter((c) => !priority || c.priority === priority)
      .filter((c) => !deptId || c.departmentId === deptId)
      .filter((c) => {
        if (quick === 'response') return c.responseRequired && !['Responded', 'Closed'].includes(c.status);
        if (quick === 'overdue') return c.responseRequired && !!c.responseDeadline && daysUntil(c.responseDeadline) < 0 && !['Responded', 'Closed'].includes(c.status);
        if (quick === 'invites') return c.type === 'Invitation';
        return true;
      })
      .filter((c) => !qq || [c.ref, c.subject, c.sender, c.senderOrg, c.recipient, c.recipientOrg, c.externalRef, c.notes].some((s) => s?.toLowerCase().includes(qq)))
      .sort((a, b) => b.dateReceived.localeCompare(a.dateReceived));
  }, [db.correspondence, me, tab, q, status, type, priority, deptId, quick]);

  const sel = route.id ? db.correspondence.find((c) => c.id === route.id) : undefined;

  return (
    <div>
      <PageHead kicker="Registry · incoming & outgoing" title="Correspondence register"
        sub="Every letter, invitation, memo and notice — registered, assigned, deadline-tracked and threaded into matters.">
        <Seg value={tab} onChange={(t) => { setTab(t); setLimit(30); }} options={[
          { v: 'incoming', label: `Incoming` }, { v: 'outgoing', label: `Outgoing` }, { v: 'email', label: `Email` },
        ]} />
      </PageHead>

      {tab !== 'email' && (
        <>
          <div className="card p-3 mb-4 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"><IcSearch size={14} /></span>
                <input className="input !pl-8" placeholder="Search subject, sender, reference…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All statuses</option>{CORR_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select className="input !w-auto" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">All types</option>{CORR_TYPES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select className="input !w-auto hidden sm:block" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">Priority</option>{PRIORITIES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select className="input !w-auto hidden md:block" value={deptId} onChange={(e) => setDeptId(e.target.value)}>
                <option value="">Department</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {([['all', 'All'], ['response', 'Needs response'], ['overdue', 'Overdue'], ['invites', 'Invitations']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setQuick(v)}
                  className={cx('chip cursor-pointer transition-colors', quick === v ? 'bg-pine-700 text-pine-50' : 'bg-line-soft text-ink-faint hover:text-ink')}>{l}</button>
              ))}
              <span className="ml-auto ref text-ink-faint self-center">{all.length} record{all.length === 1 ? '' : 's'}</span>
            </div>
          </div>

          {all.length === 0 ? (
            <div className="card">
              <EmptyState icon={<IcEnvelope size={20} />} title="No correspondence here"
                body={q || status || quick !== 'all' ? 'Nothing matches the current filters. Clear them or register a new entry.' : 'No entries yet in this register. Use Quick → Register Correspondence to add the first one.'} />
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px]">
                  <thead><tr>
                    <th className="th">Ref</th><th className="th">{tab === 'incoming' ? 'Subject / Sender' : 'Subject / Recipient'}</th>
                    <th className="th">Type</th><th className="th">Dept</th><th className="th">Officer</th>
                    <th className="th">Priority</th><th className="th">Status</th><th className="th">Deadline</th>
                  </tr></thead>
                  <tbody>
                    {all.slice(0, limit).map((c) => {
                      const officer = users.find((u) => u.id === c.assignedTo);
                      const due = dueLabel(c.responseRequired ? c.responseDeadline : undefined);
                      return (
                        <tr key={c.id} onClick={() => nav({ name: 'correspondence', id: c.id, tab })}
                          className="cursor-pointer hover:bg-pine-50/70 transition-colors">
                          <td className="td ref whitespace-nowrap text-pine-700 font-medium">{c.ref}</td>
                          <td className="td min-w-[260px]">
                            <p className="font-medium text-ink leading-snug"><Hi text={c.subject} q={q} /></p>
                            <p className="text-[11.5px] text-ink-faint mt-0.5">{tab === 'incoming' ? c.senderOrg ?? c.sender ?? '—' : c.recipientOrg ?? c.recipient} · {fmtDate(c.dateReceived)}</p>
                          </td>
                          <td className="td whitespace-nowrap text-ink-soft">{c.type}</td>
                          <td className="td ref">{departments.find((d) => d.id === c.departmentId)?.code ?? '—'}</td>
                          <td className="td whitespace-nowrap">
                            {officer ? <span className="flex items-center gap-1.5"><Avatar name={officer.name} color={officer.color} size={20} /><span className="text-[12px]">{officer.name.split(' ')[0]}</span></span> : <span className="text-ink-faint text-[12px]">Unassigned</span>}
                          </td>
                          <td className="td"><Chip meta={PRIORITY_META[c.priority]} /></td>
                          <td className="td"><Chip meta={CORR_STATUS_META[c.status]} /></td>
                          <td className="td whitespace-nowrap">
                            {c.responseRequired ? (
                              <span className={cx('text-[11.5px] font-semibold', due.tone === 'overdue' ? 'text-clay-600' : due.tone === 'today' ? 'text-brass-600' : due.tone === 'soon' ? 'text-steel-600' : 'text-ink-faint')}>{due.text}</span>
                            ) : <span className="text-ink-faint text-[11.5px]">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {all.length > limit && (
                <button className="w-full py-2.5 text-[12.5px] font-semibold text-pine-700 hover:bg-pine-50 cursor-pointer border-t border-line-soft" onClick={() => setLimit((l) => l + 30)}>
                  Show {Math.min(30, all.length - limit)} more of {all.length - limit} remaining
                </button>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'email' && <EmailTab />}
      {sel && <CorrDetail key={sel.id} c={sel} onClose={() => nav({ name: 'correspondence', tab })} />}
    </div>
  );
}

/* ── detail drawer ───────────────────────────────────────────────────── */
function CorrDetail({ c, onClose }: { c: Correspondence; onClose: () => void }) {
  const { db, me, users, departments, nav, canUser, updateCorrespondence, respondCorrespondence, linkToMatter, archiveRecord, createTask, addComment } = useStore();
  const [respondOpen, setRespondOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [archiveAsk, setArchiveAsk] = useState(false);
  const [comment, setComment] = useState('');
  const [assignee, setAssignee] = useState(c.assignedTo ?? '');
  const [deadline, setDeadline] = useState(c.responseDeadline ? c.responseDeadline.slice(0, 10) : '');
  const readOnly = !canUser('register') && !canUser('assign');

  const matter = db.matters.find((m) => m.id === c.matterId);
  const relatedOut = db.correspondence.filter((x) => x.relatedCorrId === c.id && x.orgId === me?.orgId);
  const relatedIn = c.relatedCorrId ? db.correspondence.find((x) => x.id === c.relatedCorrId) : undefined;
  const attachDocs = db.documents.filter((d) => c.attachments.includes(d.id));
  const comments = db.comments.filter((x) => x.targetType === 'correspondence' && x.targetId === c.id);
  const officer = users.find((u) => u.id === c.assignedTo);
  const due = dueLabel(c.responseRequired ? c.responseDeadline : undefined);

  const saveAssignment = () => {
    updateCorrespondence(c.id, {
      assignedTo: assignee || undefined,
      responseRequired: c.responseRequired || !!deadline,
      responseDeadline: deadline ? new Date(`${deadline}T17:00:00`).toISOString() : c.responseDeadline,
      status: assignee && ['Received', 'Registered'].includes(c.status) ? 'Assigned' : c.status,
    }, assignee ? 'Assigned correspondence' : 'Updated correspondence', assignee || undefined, assignee ? `${c.ref} — ${c.subject}` : undefined);
  };

  return (
    <Drawer open onClose={onClose} w="max-w-xl"
      title={<span className="flex items-center gap-2 flex-wrap"><span className="ref text-pine-700">{c.ref}</span><Chip meta={CORR_STATUS_META[c.status]} /></span>}
      subtitle={`${c.direction === 'incoming' ? 'Incoming' : 'Outgoing'} · ${c.type} · received ${fmtDate(c.dateReceived)}`}
      footer={
        <div className="flex flex-wrap gap-2">
          {c.status === 'Received' && canUser('register') && (
            <button className="btn-primary btn-sm" onClick={() => updateCorrespondence(c.id, { status: 'Registered' }, 'Completed registration')}>Complete registration</button>
          )}
          {canUser('respond') && c.direction === 'incoming' && !['Responded', 'Closed', 'Archived'].includes(c.status) && (
            <button className="btn-primary btn-sm" onClick={() => setRespondOpen(true)}><IcSend size={13} /> Respond</button>
          )}
          {canUser('create') && <button className="btn-ghost btn-sm" onClick={() => setTaskOpen(true)}><IcCheckSquare size={13} /> Create linked task</button>}
          {canUser('archive') && !c.archived && <button className="btn-ghost btn-sm !text-clay-600" onClick={() => setArchiveAsk(true)}><IcArchive size={13} /> Archive</button>}
        </div>
      }>
      <div className="space-y-4">
        <div>
          <h4 className="font-display font-bold text-[16px] text-ink leading-snug">{c.subject}</h4>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Chip meta={PRIORITY_META[c.priority]} />
            <Chip meta={SECURITY_META[c.security]} />
            {c.responseStatus && <Chip meta={RESPONSE_META[c.responseStatus]} label={`Invitation: ${c.responseStatus}`} />}
            {c.direction === 'outgoing' && c.deliveryStatus && <span className="chip bg-steel-100 text-steel-700">{c.dispatchMethod} · {c.deliveryStatus}</span>}
          </div>
          {c.responseRequired && (
            <p className={cx('mt-2 text-[12px] font-semibold px-2.5 py-1.5 rounded border inline-block',
              due.tone === 'overdue' ? 'text-clay-700 bg-clay-50 border-clay-100' : due.tone === 'today' ? 'text-brass-700 bg-brass-50 border-brass-300' : 'text-steel-700 bg-steel-50 border-steel-100')}>
              Response {due.tone === 'overdue' ? 'was due' : 'due'} {c.responseDeadline ? fmtDate(c.responseDeadline) : ''} · {due.text}
            </p>
          )}
        </div>

        <div className="card p-3.5">
          <KV k={c.direction === 'incoming' ? 'From' : 'To'} v={`${c.direction === 'incoming' ? c.sender ?? '—' : c.recipient}${(c.direction === 'incoming' ? c.senderOrg : c.recipientOrg) ? ` · ${c.direction === 'incoming' ? c.senderOrg : c.recipientOrg}` : ''}`} />
          <KV k="Date of letter" v={fmtDate(c.dateOfLetter)} />
          <KV k={c.direction === 'incoming' ? 'Date received' : 'Date / dispatched'} v={c.direction === 'incoming' ? fmtDateTime(c.dateReceived) : `${fmtDate(c.dateReceived)}${c.dispatchDate ? ` · sent ${fmtDateTime(c.dispatchDate)}` : ''}`} />
          {c.externalRef && <KV k="External ref" v={c.externalRef} mono />}
          <KV k="Department" v={departments.find((d) => d.id === c.departmentId)?.name ?? 'Registry'} />
          <KV k={c.direction === 'incoming' ? 'Assigned officer' : 'Author'} v={officer?.name ?? users.find((u) => u.id === c.authorId)?.name ?? 'Unassigned'} />
          {c.direction === 'outgoing' && <KV k="Approver" v={users.find((u) => u.id === c.approverId)?.name ?? '—'} />}
          <KV k="Matter" v={matter ? <button className="text-pine-700 font-medium hover:underline cursor-pointer" onClick={() => nav({ name: 'matter', id: matter.id })}>{matter.fileNumber} · {matter.title}</button> : 'Not linked'} />
        </div>

        {/* assignment */}
        {canUser('assign') && (
          <div className="card p-3.5">
            <p className="label">Assignment & response deadline</p>
            <div className="flex flex-wrap gap-2">
              <select className="input flex-1 min-w-[180px]" value={assignee} onChange={(e) => setAssignee(e.target.value)} disabled={readOnly}>
                <option value="">Unassigned</option>
                {users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name} · {u.title}</option>)}
              </select>
              <input type="date" className="input !w-40" value={deadline} min={dateOnly(0)} onChange={(e) => setDeadline(e.target.value)} />
              <button className="btn-ghost" onClick={saveAssignment}>Save</button>
            </div>
            <select className="input mt-2" value={c.status} onChange={(e) => updateCorrespondence(c.id, { status: e.target.value as CorrStatus }, `Status changed to ${e.target.value}`)}>
              {CORR_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            {c.type === 'Invitation' && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Invitation response</span>
                <div className="flex gap-1 flex-wrap">
                  {RESPONSE_OPTIONS.map((r) => (
                    <button key={r} onClick={() => updateCorrespondence(c.id, { responseStatus: r }, `Invitation response: ${r}`)}
                      className={cx('chip cursor-pointer transition-all', c.responseStatus === r ? RESPONSE_META[r].chip + ' ring-1 ring-current' : 'bg-line-soft text-ink-faint hover:text-ink')}>{r}</button>
                  ))}
                </div>
              </div>
            )}
            {c.direction === 'outgoing' && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Delivery</span>
                <select className="input !w-auto" value={c.deliveryStatus ?? 'Draft'} onChange={(e) => updateCorrespondence(c.id, { deliveryStatus: e.target.value as DeliveryStatus, dispatchDate: e.target.value === 'Dispatched' || e.target.value === 'Delivered' ? c.dispatchDate ?? new Date().toISOString() : c.dispatchDate }, `Delivery status: ${e.target.value}`)}>
                  {DELIVERY_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <select className="input !w-auto" value={c.dispatchMethod ?? 'Email'} onChange={(e) => updateCorrespondence(c.id, { dispatchMethod: e.target.value as DispatchMethod }, 'Dispatch method updated')}>
                  {DISPATCH_METHODS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {/* matter linking */}
        <div className="card p-3.5">
          <p className="label flex items-center gap-1.5"><IcSeal size={12} /> Thread into a matter</p>
          <select className="input" value={c.matterId ?? ''} onChange={(e) => e.target.value ? linkToMatter('correspondence', c.id, e.target.value) : updateCorrespondence(c.id, { matterId: undefined }, 'Unlinked from matter')} disabled={!canUser('create')}>
            <option value="">Not part of a matter</option>
            {db.matters.filter((m) => m.orgId === me?.orgId && !m.archived).map((m) => <option key={m.id} value={m.id}>{m.fileNumber} · {m.title}</option>)}
          </select>
          <p className="text-[11px] text-ink-faint mt-1.5">Correspondence, memos, meetings and reports on one issue belong to one institutional history.</p>
        </div>

        {c.notes && (
          <div className="card p-3.5">
            <p className="label">Registry notes</p>
            <p className="text-[13px] text-ink-soft leading-relaxed whitespace-pre-wrap">{c.notes}</p>
          </div>
        )}

        {c.ocrText && (
          <div className="card p-3.5 border-brass-300 bg-brass-50/40">
            <p className="label flex items-center gap-1.5 text-brass-700"><IcScan size={12} /> OCR-extracted text · searchable</p>
            <p className="text-[12px] font-mono text-ink-soft leading-relaxed">{c.ocrText}</p>
          </div>
        )}

        {/* attachments */}
        <div>
          <p className="label flex items-center gap-1.5"><IcPaperclip size={12} /> Attached documents ({attachDocs.length})</p>
          {attachDocs.length === 0 ? <p className="text-[12px] text-ink-faint">No documents attached. Upload via Quick → Upload Document and link the matter.</p> : (
            <div className="space-y-1.5">
              {attachDocs.map((doc) => (
                <button key={doc.id} onClick={() => nav({ name: 'documents', id: doc.id })} className="w-full card px-3 py-2 flex items-center gap-2.5 hover:border-pine-400 cursor-pointer text-left">
                  <span className="text-pine-600"><IcPaperclip size={14} /></span>
                  <span className="flex-1 text-[12.5px] font-medium text-ink truncate">{doc.title}</span>
                  <span className="ref text-ink-faint">{doc.fileNumber}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* thread */}
        {(relatedIn || relatedOut.length > 0) && (
          <div>
            <p className="label">Correspondence thread</p>
            <div className="space-y-1.5">
              {relatedIn && (
                <button onClick={() => nav({ name: 'correspondence', id: relatedIn.id })} className="w-full card px-3 py-2 text-left hover:border-pine-400 cursor-pointer">
                  <p className="text-[10.5px] uppercase tracking-wider text-ink-faint font-semibold">In reply to</p>
                  <p className="text-[12.5px] font-medium text-ink">{relatedIn.ref} · {relatedIn.subject}</p>
                </button>
              )}
              {relatedOut.map((r) => (
                <button key={r.id} onClick={() => nav({ name: 'correspondence', id: r.id })} className="w-full card px-3 py-2 text-left hover:border-pine-400 cursor-pointer">
                  <p className="text-[10.5px] uppercase tracking-wider text-pine-600 font-semibold">Response dispatched</p>
                  <p className="text-[12.5px] font-medium text-ink">{r.ref} · {r.subject}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* comments */}
        <div>
          <p className="label">Comments ({comments.length})</p>
          <div className="space-y-2 mb-2">
            {comments.map((cm) => {
              const u = users.find((x) => x.id === cm.userId);
              return (
                <div key={cm.id} className="card px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {u && <Avatar name={u.name} color={u.color} size={20} />}
                    <span className="text-[12px] font-semibold text-ink">{u?.name ?? 'Unknown'}</span>
                    <span className="text-[10.5px] text-ink-faint font-mono ml-auto">{relTime(cm.at)}</span>
                  </div>
                  <p className="text-[12.5px] text-ink-soft mt-1.5 leading-relaxed">{cm.text}</p>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="Add a note to the record…" value={comment} onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && comment.trim()) { addComment('correspondence', c.id, comment.trim()); setComment(''); } }} />
            <button className="btn-ghost" onClick={() => { if (comment.trim()) { addComment('correspondence', c.id, comment.trim()); setComment(''); } }}>Post</button>
          </div>
        </div>
      </div>

      <RespondModal open={respondOpen} onClose={() => setRespondOpen(false)} c={c} onSend={(f) => { respondCorrespondence(c.id, f); setRespondOpen(false); }} />
      <TaskModal open={taskOpen} onClose={() => setTaskOpen(false)} onSave={(t) => { createTask({ ...t, relatedType: 'correspondence', relatedId: c.id, departmentId: c.departmentId }); setTaskOpen(false); }} />
      <Confirm open={archiveAsk} onClose={() => setArchiveAsk(false)} title="Archive this record?"
        body={<>Archiving moves <span className="font-semibold text-ink">{c.ref}</span> to the institutional archive. It remains searchable and can be restored; it is never deleted.</>}
        confirmLabel="Archive record" onConfirm={() => { archiveRecord('correspondence', c.id); onClose(); }} />
    </Drawer>
  );
}

function RespondModal({ open, onClose, c, onSend }: {
  open: boolean; onClose: () => void; c: Correspondence;
  onSend: (f: { subject: string; recipient: string; recipientOrg?: string; method: DispatchMethod; notes?: string }) => void;
}) {
  const [subject, setSubject] = useState(`Re: ${c.subject}`);
  const [recipient, setRecipient] = useState(c.sender ?? '');
  const [recipientOrg, setRecipientOrg] = useState(c.senderOrg ?? '');
  const [method, setMethod] = useState<DispatchMethod>('Email');
  const [notes, setNotes] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Dispatch response" subtitle={`Creates an outgoing entry threaded to ${c.ref}`}
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => subject.trim() && onSend({ subject: subject.trim(), recipient: recipient.trim() || recipientOrg || 'The Sender', recipientOrg: recipientOrg.trim() || undefined, method, notes: notes.trim() || undefined })}><IcSend size={13} /> Dispatch</button></>}>
      <div className="space-y-3">
        <Field label="Subject" req><input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Recipient"><input className="input" value={recipient} onChange={(e) => setRecipient(e.target.value)} /></Field>
          <Field label="Organisation"><input className="input" value={recipientOrg} onChange={(e) => setRecipientOrg(e.target.value)} /></Field>
        </div>
        <Field label="Dispatch method">
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value as DispatchMethod)}>{DISPATCH_METHODS.map((m) => <option key={m}>{m}</option>)}</select>
        </Field>
        <Field label="Registry note"><textarea className="textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function TaskModal({ open, onClose, onSave }: {
  open: boolean; onClose: () => void;
  onSave: (t: { title: string; assigneeId?: string; dueDate?: string; priority: Priority }) => void;
}) {
  const { users } = useStore();
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [due, setDue] = useState('');
  const [priority, setPriority] = useState<Priority>('Important');
  return (
    <Modal open={open} onClose={onClose} title="Create linked task" subtitle="Owner, deadline and link to this correspondence are recorded"
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={!title.trim()} onClick={() => onSave({ title: title.trim(), assigneeId: assignee || undefined, dueDate: due ? new Date(`${due}T17:00:00`).toISOString() : undefined, priority })}>Create task</button></>}>
      <div className="space-y-3">
        <Field label="Task" req><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Prepare briefing note" /></Field>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Assign to"><select className="input" value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Unassigned</option>{users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
          <Field label="Due"><input type="date" className="input" value={due} min={dateOnly(0)} onChange={(e) => setDue(e.target.value)} /></Field>
          <Field label="Priority"><select className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></Field>
        </div>
      </div>
    </Modal>
  );
}

/* ── email tab ───────────────────────────────────────────────────────── */
function EmailTab() {
  const { db, me, nav, canUser, registerEmail, users, departments } = useStore();
  const emails = db.emails.filter((e) => e.orgId === me?.orgId);
  const [regFor, setRegFor] = useState<string | null>(null);
  const [deptId, setDeptId] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState<Priority>('Important');
  const [deadline, setDeadline] = useState('');
  const em = emails.find((e) => e.id === regFor);

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-ink-soft max-w-3xl">Connected mailbox view. Personal mail stays personal — only messages you deliberately register become institutional records.</p>
      {emails.length === 0 ? (
        <div className="card"><EmptyState icon={<IcMail size={20} />} title="No mailbox connected" body="Connect Microsoft Graph or Google Workspace in a production deployment to stream mail into this view." /></div>
      ) : emails.map((e) => {
        const corr = e.registeredCorrId ? db.correspondence.find((c) => c.id === e.registeredCorrId) : undefined;
        return (
          <div key={e.id} className="card p-4">
            <div className="flex items-start gap-3">
              <span className={cx('mt-0.5', corr ? 'text-moss-600' : 'text-steel-600')}><IcMail size={17} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13.5px] font-semibold text-ink">{e.subject}</p>
                  {corr ? (
                    <button onClick={() => nav({ name: 'correspondence', id: corr.id })} className="chip bg-moss-100 text-moss-700 cursor-pointer hover:brightness-95"><IcStamp size={11} /> Registered · {corr.ref}</button>
                  ) : (
                    <span className="chip bg-steel-100 text-steel-700">Unregistered</span>
                  )}
                </div>
                <p className="text-[12px] text-ink-faint mt-0.5">{e.from} · <span className="font-mono">{e.fromEmail}</span> · {fmtDateTime(e.receivedAt)}</p>
                <p className="text-[12.5px] text-ink-soft mt-2 leading-relaxed line-clamp-2">{e.body}</p>
                {e.attachments.length > 0 && (
                  <p className="flex items-center gap-1.5 mt-2 text-[11.5px] text-ink-faint"><IcPaperclip size={12} /> {e.attachments.join(', ')}</p>
                )}
              </div>
              {!corr && canUser('register') && (
                <button className="btn-primary btn-sm shrink-0" onClick={() => { setRegFor(e.id); setDeptId(''); setAssignee(''); setDeadline(''); }}>Register as correspondence</button>
              )}
            </div>
          </div>
        );
      })}
      <Modal open={!!em} onClose={() => setRegFor(null)} title="Register email as official correspondence"
        subtitle={em?.subject}
        footer={<>
          <button className="btn-ghost" onClick={() => setRegFor(null)}>Cancel</button>
          <button className="btn-primary" onClick={() => { if (em) { registerEmail(em.id, { departmentId: deptId || undefined, assignedTo: assignee || undefined, priority, responseDeadline: deadline ? new Date(`${deadline}T17:00:00`).toISOString() : undefined }); setRegFor(null); } }}>Register</button>
        </>}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Department"><select className="input" value={deptId} onChange={(e) => setDeptId(e.target.value)}><option value="">Registry</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
          <Field label="Assign officer"><select className="input" value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Unassigned</option>{users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
          <Field label="Priority"><select className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Response deadline"><input type="date" className="input" value={deadline} min={dateOnly(0)} onChange={(e) => setDeadline(e.target.value)} /></Field>
        </div>
        <p className="text-[11.5px] text-ink-faint mt-3">The email body is indexed (OCR field) and the message is linked to the new correspondence record.</p>
      </Modal>
    </div>
  );
}

void IcRestore;
