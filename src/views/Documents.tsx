import React, { useMemo, useState } from 'react';
import { useStore, canSee } from '../lib/store';
import { PageHead, Chip, EmptyState, Drawer, KV, Avatar, Field, Modal, Confirm, Hi } from '../components/ui';
import { QAHost } from '../components/quick';
import {
  DOC_CATEGORIES, DOC_STATUS_META, SECURITY_META, SECURITY_LEVELS, APPROVAL_META,
  type DocumentRecord, type SecurityLevel, type ApprovalState,
} from '../lib/types';
import { cx, download, fileSizeLabel, fmtDate, fmtDateTime, relTime } from '../lib/utils';
import { isDocOffline, saveDocOffline, removeDocOffline } from '../lib/offline';
import { IcFile, IcSearch, IcPlus, IcDownload, IcPaperclip, IcHistory, IcStamp, IcArchive, IcRestore, IcScan, IcCheck, IcX, IcEdit, IcLock, IcSeal, IcPrinter } from '../components/icons';

export function Documents() {
  const { db, me, users, departments, route, nav, canUser } = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [deptId, setDeptId] = useState('');
  const [sec, setSec] = useState('');
  const [status, setStatus] = useState('');
  const [qa, setQa] = useState(false);

  const docs = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return db.documents
      .filter((d) => d.orgId === me?.orgId && !d.archived && canSee(me, d.security))
      .filter((d) => !cat || d.category === cat)
      .filter((d) => !deptId || d.departmentId === deptId)
      .filter((d) => !sec || d.security === sec)
      .filter((d) => !status || d.status === status)
      .filter((d) => !qq || [d.title, d.fileNumber, d.fileName, d.body, d.category].some((s) => s?.toLowerCase().includes(qq)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [db.documents, me, q, cat, deptId, sec, status]);

  const sel = route.id ? db.documents.find((d) => d.id === route.id) : undefined;

  return (
    <div>
      <PageHead kicker="Records vault" title="Institutional documents"
        sub="Policies, minutes, contracts, scans and memos — versioned, security-classified and searchable, including OCR text.">
        {canUser('create') && <button className="btn-primary" onClick={() => setQa(true)}><IcPlus size={15} /> Upload document</button>}
      </PageHead>

      <div className="card p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"><IcSearch size={14} /></span>
          <input className="input !pl-8" placeholder="Search title, file number, extracted text…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input !w-auto" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Category</option>{DOC_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Status</option>{Object.keys(DOC_STATUS_META).map((s) => <option key={s}>{s}</option>)}</select>
        <select className="input !w-auto hidden sm:block" value={sec} onChange={(e) => setSec(e.target.value)}><option value="">Security</option>{SECURITY_LEVELS.map((s) => <option key={s}>{s}</option>)}</select>
        <select className="input !w-auto hidden md:block" value={deptId} onChange={(e) => setDeptId(e.target.value)}><option value="">Department</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <span className="ref text-ink-faint ml-auto">{docs.length} record{docs.length === 1 ? '' : 's'}</span>
      </div>

      {docs.length === 0 ? (
        <div className="card"><EmptyState icon={<IcFile size={20} />} title="No institutional documents have been uploaded yet"
          body="Upload policies, minutes, contracts or scanned correspondence. Every file is versioned and indexed for the register search.">
          {canUser('create') && <button className="btn-primary" onClick={() => setQa(true)}><IcPlus size={14} /> Upload the first document</button>}
        </EmptyState></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead><tr><th className="th">File №</th><th className="th">Title</th><th className="th">Category</th><th className="th">Security</th><th className="th">Status</th><th className="th">Version</th><th className="th">Owner</th><th className="th">Updated</th></tr></thead>
              <tbody>
                {docs.map((d) => {
                  const owner = users.find((u) => u.id === d.ownerId);
                  return (
                    <tr key={d.id} onClick={() => nav({ name: 'documents', id: d.id })} className="cursor-pointer hover:bg-pine-50/70 transition-colors">
                      <td className="td ref whitespace-nowrap text-pine-700 font-medium">{d.fileNumber}</td>
                      <td className="td min-w-[240px]">
                        <p className="font-medium text-ink flex items-center gap-1.5">{d.ocr && <span className="text-brass-600" title="OCR indexed"><IcScan size={13} /></span>}<Hi text={d.title} q={q} /></p>
                        <p className="text-[11px] text-ink-faint font-mono mt-0.5">{d.fileName} · {fileSizeLabel(d.sizeKb)}</p>
                      </td>
                      <td className="td whitespace-nowrap text-ink-soft">{d.category}</td>
                      <td className="td"><Chip meta={SECURITY_META[d.security]} /></td>
                      <td className="td"><Chip meta={DOC_STATUS_META[d.status]} /></td>
                      <td className="td ref">v{d.versions[d.versions.length - 1].version} <span className="text-ink-faint">({d.versions.length})</span></td>
                      <td className="td whitespace-nowrap">{owner ? <span className="flex items-center gap-1.5"><Avatar name={owner.name} color={owner.color} size={20} /><span className="text-[12px]">{owner.name.split(' ')[0]}</span></span> : '—'}</td>
                      <td className="td whitespace-nowrap text-ink-faint text-[12px]">{relTime(d.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sel && <DocDetail key={sel.id} d={sel} onClose={() => nav({ name: 'documents' })} />}
      <QAHost open={qa ? 'doc' : null} onClose={() => setQa(false)} />
    </div>
  );
}

/* ── detail ──────────────────────────────────────────────────────────── */
function DocDetail({ d, onClose }: { d: DocumentRecord; onClose: () => void }) {
  const { db, me, users, nav, canUser, addDocumentVersion, updateDocument, restoreVersion, addComment, linkToMatter, archiveRecord, restoreRecord, decideApproval, toast } = useStore();
  const [verOpen, setVerOpen] = useState(false);
  const [decideOpen, setDecideOpen] = useState<Exclude<ApprovalState, 'Pending'> | null>(null);
  const [archiveAsk, setArchiveAsk] = useState(false);
  const [comment, setComment] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState(d.title);
  const [offline, setOffline] = useState(() => isDocOffline(d.id));
  const readOnly = !canUser('create');

  const toggleOffline = () => {
    if (offline) {
      removeDocOffline(d.id);
      setOffline(false);
      toast('Offline copy removed — the register record is untouched', 'info');
    } else {
      const r = saveDocOffline(d);
      if (r.ok) { setOffline(true); toast('Available offline ✓', 'success'); }
      else toast(r.error ?? 'Unable to save offline.', 'error');
    }
  };

  const approval = db.approvals.find((a) => a.recordId === d.id);
  const comments = db.comments.filter((x) => x.targetType === 'document' && x.targetId === d.id);
  const owner = users.find((u) => u.id === d.ownerId);
  const matter = db.matters.find((m) => m.id === d.matterId);
  const myStep = approval && approval.overall === 'Pending' && canUser('approve') &&
    (approval.chain[approval.currentStep]?.role === me?.role || me?.role === 'Organisation Admin' || me?.role === 'Super Admin')
    ? approval.chain[approval.currentStep] : undefined;

  const doDownload = () => {
    const content = d.body ?? `${d.title}\n${d.fileNumber}\n\nDocument content is stored in the object store in production deployments. This demo exports the record metadata and extracted text.`;
    download(d.fileName.replace(/\.[^.]+$/, '') + '.txt', content);
    toast('Secure download prepared', 'info');
  };

  const doPrint = () => {
    /* the print stylesheet isolates the record for a clean institutional copy */
    window.print();
  };

  return (
    <Drawer open onClose={onClose} w="max-w-2xl"
      title={<span className="flex items-center gap-2 flex-wrap"><span className="ref text-pine-700">{d.fileNumber}</span><Chip meta={DOC_STATUS_META[d.status]} /><Chip meta={SECURITY_META[d.security]} /></span>}
      subtitle={`${d.category} · owner ${owner?.name ?? '—'} · updated ${relTime(d.updatedAt)}`}
      footer={
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary btn-sm" onClick={doDownload}><IcDownload size={13} /> Download</button>
          <button className="btn-ghost btn-sm" onClick={doPrint} title="Print this record"><IcPrinter size={13} /> Print</button>
          <button className={cx('btn-sm', offline ? 'btn-brass' : 'btn-ghost')} onClick={toggleOffline}
            title={offline ? 'A local copy is cached for offline use — click to remove it' : 'Cache this document for offline use'}>
            {offline ? <><IcCheck size={13} /> Available offline</> : <><IcArchive size={13} /> Make available offline</>}
          </button>
          {canUser('create') && <button className="btn-ghost btn-sm" onClick={() => setVerOpen(true)}><IcHistory size={13} /> New version</button>}
          {myStep && <button className="btn-brass btn-sm" onClick={() => setDecideOpen('Approved')}><IcCheck size={13} /> Approve</button>}
          {myStep && <button className="btn-danger btn-sm" onClick={() => setDecideOpen('Rejected')}><IcX size={13} /> Reject</button>}
          {myStep && <button className="btn-ghost btn-sm" onClick={() => setDecideOpen('Changes Requested')}><IcEdit size={13} /> Request changes</button>}
          {canUser('archive') && !d.archived && <button className="btn-ghost btn-sm !text-clay-600" onClick={() => setArchiveAsk(true)}><IcArchive size={13} /> Archive</button>}
          {d.archived && <button className="btn-ghost btn-sm" onClick={() => { restoreRecord('document', d.id); }}><IcRestore size={13} /> Restore</button>}
        </div>
      }>
      <div className="space-y-4">
        <div>
          {renaming ? (
            <div className="flex gap-2 items-center">
              <input className="input flex-1 !font-display !font-bold !text-[15px]" value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && titleDraft.trim()) { updateDocument(d.id, { title: titleDraft.trim() }, 'Renamed document'); setRenaming(false); toast('Document renamed'); } if (e.key === 'Escape') { setTitleDraft(d.title); setRenaming(false); } }} />
              <button className="btn-primary btn-sm !px-2" aria-label="Save title" onClick={() => { if (titleDraft.trim()) { updateDocument(d.id, { title: titleDraft.trim() }, 'Renamed document'); setRenaming(false); toast('Document renamed'); } }}><IcCheck size={14} /></button>
              <button className="btn-ghost btn-sm !px-2" aria-label="Cancel rename" onClick={() => { setTitleDraft(d.title); setRenaming(false); }}><IcX size={14} /></button>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <h4 className="font-display font-bold text-[17px] text-ink leading-snug flex-1">{d.title}</h4>
              {canUser('create') && (
                <button className="btn-ghost btn-sm !px-1.5 shrink-0" title="Rename document" aria-label="Rename document" onClick={() => { setTitleDraft(d.title); setRenaming(true); }}><IcEdit size={13} /></button>
              )}
            </div>
          )}
          <p className="text-[11.5px] font-mono text-ink-faint mt-1">{d.fileName} · {fileSizeLabel(d.sizeKb)} · {d.versions.length} version{d.versions.length === 1 ? '' : 's'}</p>
        </div>

        {/* preview */}
        <div className="rounded-lg border border-line bg-[#fdfdf9] shadow-[inset_0_1px_4px_rgba(27,38,34,0.05)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-line-soft bg-paper/70">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-faint">Preview</span>
            <span className="ref text-ink-faint">{d.ocr ? 'OCR source' : 'Record extract'}</span>
          </div>
          {d.body ? (
            <div className="px-6 py-5 max-h-72 overflow-y-auto">
              <p className="font-mono text-[12px] leading-relaxed text-ink whitespace-pre-wrap">{d.body}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center px-6">
              <span className="text-pine-300"><IcFile size={34} /></span>
              <p className="text-[13px] font-medium text-ink mt-2">Binary preview renders via the storage service</p>
              <p className="text-[11.5px] text-ink-faint mt-1 max-w-sm">In production the signed storage URL streams PDF and image previews here. Metadata and versions remain fully managed in Cortexa.</p>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="card p-3.5">
            <KV k="File number" v={d.fileNumber} mono />
            <KV k="Category" v={d.category} />
            <KV k="Owner" v={owner?.name ?? '—'} />
            <KV k="Created" v={fmtDate(d.createdAt)} />
            <KV k="Last updated" v={fmtDateTime(d.updatedAt)} />
            <KV k="Retention" v={d.retention} />
            <KV k="Matter" v={matter ? <button className="text-pine-700 font-medium hover:underline cursor-pointer" onClick={() => nav({ name: 'matter', id: matter.id })}>{matter.fileNumber}</button> : (
              canUser('create') ? (
                <select className="input !h-7 !text-[12px]" value="" onChange={(e) => e.target.value && linkToMatter('document', d.id, e.target.value)}>
                  <option value="">Link to matter…</option>
                  {db.matters.filter((m) => m.orgId === me?.orgId && !m.archived).map((m) => <option key={m.id} value={m.id}>{m.fileNumber}</option>)}
                </select>
              ) : 'Not linked'
            )} />
          </div>
          <div className="card p-3.5">
            <p className="label flex items-center gap-1.5"><IcStamp size={12} /> Approval workflow</p>
            {!approval ? <p className="text-[12px] text-ink-faint">No approval chain on this record.{d.category === 'Memo' ? '' : ' Memos start a chain automatically.'}</p> : (
              <ol className="mt-1">
                {approval.chain.map((s, i) => (
                  <li key={i} className="flex items-center gap-2 py-1.5 border-b border-line-soft last:border-0">
                    <span className="ref text-ink-faint w-4">{i + 1}</span>
                    <span className={cx('text-[12.5px] flex-1', i === approval.currentStep && approval.overall === 'Pending' ? 'font-semibold text-ink' : 'text-ink-soft')}>{s.role}</span>
                    {s.userId && <span className="text-[10.5px] text-ink-faint">{users.find((u) => u.id === s.userId)?.name?.split(' ')[0]}</span>}
                    <Chip meta={APPROVAL_META[s.state]} />
                  </li>
                ))}
              </ol>
            )}
            {approval && approval.overall === 'Pending' && !myStep && (
              <p className="text-[11.5px] text-ink-faint mt-2 flex items-center gap-1.5"><IcLock size={12} /> Awaiting {approval.chain[approval.currentStep]?.role} — decisions are server-side role-checked.</p>
            )}
            {myStep && <p className="text-[11.5px] text-brass-700 font-medium mt-2">This step is assigned to your role ({me?.role}).</p>}
          </div>
        </div>

        {/* versions */}
        <div className="card p-3.5">
          <p className="label flex items-center gap-1.5"><IcHistory size={12} /> Version history · restorable, never overwritten</p>
          <div className="space-y-1">
            {[...d.versions].reverse().map((v) => (
              <div key={v.version} className="flex items-center gap-2.5 py-1.5 border-b border-line-soft last:border-0">
                <span className="ref font-semibold text-pine-700 w-10">v{v.version}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] text-ink truncate">{v.note}</span>
                  <span className="block text-[10.5px] text-ink-faint">{users.find((u) => u.id === v.authorId)?.name ?? '—'} · {fmtDateTime(v.at)} · {fileSizeLabel(v.sizeKb)}</span>
                </span>
                {v.version !== d.versions[d.versions.length - 1].version && canUser('create') && (
                  <button className="btn-ghost btn-sm" onClick={() => restoreVersion(d.id, v.version)} title="Restore this version as the current one"><IcRestore size={12} /> Restore</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* comments */}
        <div>
          <p className="label flex items-center gap-1.5"><IcPaperclip size={12} /> Comments ({comments.length})</p>
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
          {!readOnly && (
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Comment on this document…" value={comment} onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && comment.trim()) { addComment('document', d.id, comment.trim()); setComment(''); } }} />
              <button className="btn-ghost" onClick={() => { if (comment.trim()) { addComment('document', d.id, comment.trim()); setComment(''); } }}>Post</button>
            </div>
          )}
        </div>
      </div>

      {/* new version modal */}
      <VersionModal open={verOpen} onClose={() => setVerOpen(false)} onSave={(note) => { addDocumentVersion(d.id, { note }); setVerOpen(false); }} />

      {/* decide modal */}
      <Modal open={!!decideOpen} onClose={() => setDecideOpen(null)} title={`Decision: ${decideOpen}`}
        subtitle="Every decision is written to the audit trail with your name and timestamp"
        footer={<>
          <button className="btn-ghost" onClick={() => setDecideOpen(null)}>Cancel</button>
          <button className={decideOpen === 'Rejected' ? 'btn-danger' : 'btn-primary'} onClick={() => {
            const cm = (document.getElementById('appr-comment') as HTMLTextAreaElement)?.value ?? '';
            if (decideOpen) decideApproval(approval!.id, decideOpen, cm.trim() || undefined);
            setDecideOpen(null);
          }}>Record decision</button>
        </>}>
        <Field label="Comment (recorded with the decision)">
          <textarea id="appr-comment" className="textarea" rows={3} placeholder="e.g. Approved for circulation. / Tighten clause 4 before circulation." />
        </Field>
      </Modal>

      <Confirm open={archiveAsk} onClose={() => setArchiveAsk(false)} title="Archive this document?"
        body={<>Archiving moves <span className="font-semibold text-ink">{d.title}</span> to the institutional archive under its retention policy. It remains restorable; versions are preserved.</>}
        confirmLabel="Archive document" onConfirm={() => { archiveRecord('document', d.id); onClose(); }} />
    </Drawer>
  );
}

function VersionModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (note: string) => void }) {
  const [note, setNote] = useState('');
  const [fname, setFname] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Record a new version" subtitle="Previous versions are preserved and restorable"
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={!note.trim()} onClick={() => { onSave(note.trim()); setNote(''); setFname(''); }}>Save version</button></>}>
      <div className="space-y-3">
        <Field label="Change description" req>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Incorporated legal comments" />
        </Field>
        <Field label="Replacement file (optional)">
          <input type="file" className="input !py-1.5" onChange={(e) => setFname(e.target.files?.[0]?.name ?? '')} />
          {fname && <p className="text-[11px] text-ink-faint mt-1 font-mono">{fname}</p>}
        </Field>
      </div>
    </Modal>
  );
}

void IcSeal;
