import React, { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { Modal, Field, Seg, Toggle } from './ui';
import {
  CORR_TYPES, PRIORITIES, SECURITY_LEVELS, DOC_CATEGORIES, DISPATCH_METHODS,
  RESPONSE_OPTIONS, type CorrType, type Priority, type SecurityLevel, type DocCategory,
  type DispatchMethod, type ResponseOption,
} from '../lib/types';
import { dateOnly, fmtDate } from '../lib/utils';
import { readHead, validateUpload, sanitizeFilename } from '../lib/security';
import { Spinner } from './authbits';

export type QAKey = 'corr' | 'doc' | 'meeting' | 'task' | 'memo' | 'matter' | 'contact' | null;

export function QAHost({ open, onClose, presetCorrDirection }: { open: QAKey; onClose: () => void; presetCorrDirection?: 'incoming' | 'outgoing' }) {
  return (
    <>
      <CorrForm open={open === 'corr'} onClose={onClose} presetDir={presetCorrDirection} />
      <DocForm open={open === 'doc'} onClose={onClose} />
      <MeetingForm open={open === 'meeting'} onClose={onClose} />
      <TaskForm open={open === 'task'} onClose={onClose} />
      <MemoForm open={open === 'memo'} onClose={onClose} />
      <MatterForm open={open === 'matter'} onClose={onClose} />
      <ContactForm open={open === 'contact'} onClose={onClose} />
    </>
  );
}

const err = (v: string | undefined) => (v ? undefined : 'Required');

/* ── Register correspondence ─────────────────────────────────────────── */
function CorrForm({ open, onClose, presetDir }: { open: boolean; onClose: () => void; presetDir?: 'incoming' | 'outgoing' }) {
  const { departments, users, db, me, registerCorrespondence, nav, nextRef } = useStore();
  const [direction, setDirection] = useState<'incoming' | 'outgoing'>(presetDir ?? 'incoming');
  const [subject, setSubject] = useState('');
  const [type, setType] = useState<CorrType>('Letter');
  const [sender, setSender] = useState('');
  const [senderOrg, setSenderOrg] = useState('');
  const [externalRef, setExternalRef] = useState('');
  const [recipient, setRecipient] = useState('');
  const [recipientOrg, setRecipientOrg] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<Priority>('Routine');
  const [security, setSecurity] = useState<SecurityLevel>('Internal');
  const [responseRequired, setResponseRequired] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [isInvite, setIsInvite] = useState(false);
  const [respStatus, setRespStatus] = useState<ResponseOption>('Pending');
  const [method, setMethod] = useState<DispatchMethod>('Email');
  const [matterId, setMatterId] = useState('');
  const [notes, setNotes] = useState('');
  const [tried, setTried] = useState(false);

  const dept = departments.find((x) => x.id === departmentId);
  const preview = useMemo(() => nextRef(direction === 'outgoing' ? 'OUT' : 'IN', direction === 'outgoing' ? 'OUT' : dept?.code ?? 'ADM'), [nextRef, direction, dept]);
  const matters = db.matters.filter((m) => m.orgId === me?.orgId && !m.archived);
  const dateLetter = dateOnly(0);

  const submit = () => {
    setTried(true);
    if (!subject.trim()) return;
    const c = registerCorrespondence({
      direction, subject: subject.trim(), type,
      sender: direction === 'incoming' ? sender.trim() || undefined : undefined,
      senderOrg: direction === 'incoming' ? senderOrg.trim() || undefined : undefined,
      externalRef: externalRef.trim() || undefined,
      recipient: direction === 'outgoing' ? recipient.trim() || 'The Recipient' : 'The Secretariat',
      recipientOrg: recipientOrg.trim() || undefined,
      departmentId: departmentId || undefined,
      assignedTo: assignedTo || undefined,
      priority, security,
      responseRequired,
      responseDeadline: responseRequired && deadline ? new Date(`${deadline}T17:00:00`).toISOString() : undefined,
      responseStatus: type === 'Invitation' ? respStatus : undefined,
      dispatchMethod: direction === 'outgoing' ? method : undefined,
      deliveryStatus: direction === 'outgoing' ? 'Draft' : undefined,
      matterId: matterId || undefined,
      notes: notes.trim(),
      dateOfLetter: new Date(`${dateLetter}T09:00:00`).toISOString(),
      status: direction === 'incoming' ? (assignedTo ? 'Assigned' : 'Registered') : 'Draft' as never,
    });
    if (c) {
      onClose();
      reset();
      nav({ name: 'correspondence', id: c.id });
    }
  };
  const reset = () => { setSubject(''); setSender(''); setSenderOrg(''); setExternalRef(''); setRecipient(''); setRecipientOrg(''); setDepartmentId(''); setAssignedTo(''); setResponseRequired(false); setDeadline(''); setNotes(''); setMatterId(''); setTried(false); };

  return (
    <Modal open={open} onClose={onClose} title="Register correspondence" subtitle={`Will be registered as ${preview}`} w="max-w-2xl"
      footer={<>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit}>Register entry</button>
      </>}>
      <div className="grid sm:grid-cols-2 gap-3.5">
        <div className="sm:col-span-2 flex items-center justify-between gap-3">
          <Seg value={direction} onChange={setDirection} options={[{ v: 'incoming', label: 'Incoming' }, { v: 'outgoing', label: 'Outgoing' }]} />
          <span className="ref text-ink-faint">Ref preview · {preview}</span>
        </div>
        <div className="sm:col-span-2">
          <Field label="Subject" req error={tried && !subject.trim() ? 'A subject is required' : undefined}>
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Invitation to the National Housing Dialogue" />
          </Field>
        </div>
        <Field label="Correspondence type" req>
          <select className="input" value={type} onChange={(e) => { setType(e.target.value as CorrType); if (e.target.value === 'Invitation') setIsInvite(true); else setIsInvite(false); }}>
            {CORR_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Department">
          <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">— Registry default —</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
          </select>
        </Field>
        {direction === 'incoming' ? (
          <>
            <Field label="Sender"><input className="input" value={sender} onChange={(e) => setSender(e.target.value)} placeholder="Person who signed" /></Field>
            <Field label="Sender organisation"><input className="input" value={senderOrg} onChange={(e) => setSenderOrg(e.target.value)} placeholder="e.g. Federal Ministry of Housing" /></Field>
            <Field label="External reference"><input className="input ref" value={externalRef} onChange={(e) => setExternalRef(e.target.value)} placeholder="FMH/GEN/2026/118" /></Field>
          </>
        ) : (
          <>
            <Field label="Recipient" req error={tried && !recipient.trim() ? 'A recipient is required' : undefined}>
              <input className="input" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="e.g. The Permanent Secretary" />
            </Field>
            <Field label="Recipient organisation"><input className="input" value={recipientOrg} onChange={(e) => setRecipientOrg(e.target.value)} /></Field>
            <Field label="Dispatch method">
              <select className="input" value={method} onChange={(e) => setMethod(e.target.value as DispatchMethod)}>
                {DISPATCH_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
          </>
        )}
        <Field label="Assigned officer">
          <select className="input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">— Unassigned —</option>
            {users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name} · {u.title}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Confidentiality level">
          <select className="input" value={security} onChange={(e) => setSecurity(e.target.value as SecurityLevel)}>
            {SECURITY_LEVELS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Related matter">
          <select className="input" value={matterId} onChange={(e) => setMatterId(e.target.value)}>
            <option value="">— None —</option>
            {matters.map((m) => <option key={m.id} value={m.id}>{m.fileNumber} · {m.title}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-[13px] text-ink-soft cursor-pointer">
            <Toggle checked={responseRequired} onChange={setResponseRequired} /> Response required
          </label>
          {responseRequired && (
            <input type="date" className="input !w-44" value={deadline} onChange={(e) => setDeadline(e.target.value)} min={dateOnly(0)} />
          )}
          {type === 'Invitation' && (
            <label className="flex items-center gap-2 text-[13px] text-ink-soft">
              Invitation response
              <select className="input !w-36" value={respStatus} onChange={(e) => setRespStatus(e.target.value as ResponseOption)}>
                {RESPONSE_OPTIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
          )}
        </div>
        <div className="sm:col-span-2">
          <Field label="Registry notes">
            <textarea className="textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Handling instructions, context…" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

/* ── Upload document ─────────────────────────────────────────────────── */
function DocForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { departments, db, me, addDocument, nav } = useStore();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocCategory>('Report');
  const [departmentId, setDepartmentId] = useState('');
  const [security, setSecurity] = useState<SecurityLevel>('Internal');
  const [fileName, setFileName] = useState('');
  const [sizeKb, setSizeKb] = useState(0);
  const [isScan, setIsScan] = useState(false);
  const [body, setBody] = useState('');
  const [matterId, setMatterId] = useState('');
  const [tried, setTried] = useState(false);
  const [fileError, setFileError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const matters = db.matters.filter((m) => m.orgId === me?.orgId && !m.archived);

  /* file intake: never trust File.type — sniff magic bytes, sanitise the name */
  const onFile = async (f: File) => {
    setFileError('');
    const head = await readHead(f, 8);
    const check = validateUpload(f, head);
    if (!check.ok) { setFileError(check.error ?? 'This file cannot be accepted.'); setFileName(''); setSizeKb(0); return; }
    setFileName(check.safeName ?? sanitizeFilename(f.name));
    setSizeKb(Math.max(8, Math.round(f.size / 1024)));
    if (!title) setTitle(check.safeName!.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
  };

  const ocrRef = useMemo(() => {
    if (!isScan || !body) return null;
    const m = body.match(/\b[A-Z]{2,5}\/[A-Z0-9]{2,6}\/\d{4}\/\d+\b/);
    const words = body.trim().split(/\s+/).filter(Boolean).length;
    return { ref: m?.[0] ?? 'none detected', words };
  }, [isScan, body]);

  const submit = () => {
    setTried(true);
    if (!title.trim() || !fileName.trim() || uploading) return;
    setUploading(true);
    setProgress(0);
    /* simulate a streamed, integrity-checked upload so the UI never freezes or double-submits */
    const iv = window.setInterval(() => {
      setProgress((p) => Math.min(100, p + 14 + Math.random() * 10));
    }, 90);
    window.setTimeout(() => {
      window.clearInterval(iv);
      setProgress(100);
      const doc = addDocument({
        title: title.trim(), category, departmentId: departmentId || undefined, security,
        fileName: sanitizeFilename(fileName.trim()), sizeKb: sizeKb || 180,
        body: body.trim() || undefined, ocr: isScan, matterId: matterId || undefined,
        status: 'Approved',
      });
      setUploading(false);
      setProgress(0);
      if (doc) { onClose(); setTitle(''); setFileName(''); setBody(''); setMatterId(''); setTried(false); setFileError(''); nav({ name: 'documents', id: doc.id }); }
    }, 780);
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload document" subtitle="Stored to the institutional records vault · metadata indexed for search" w="max-w-2xl"
      footer={<>
        {uploading && (
          <div className="flex-1 mr-2">
            <div className="flex items-center gap-2 text-[11.5px] text-ink-faint mb-1">
              <Spinner size={12} /> Uploading document… {Math.round(progress)}%
            </div>
            <div className="h-1.5 rounded-full bg-line-soft overflow-hidden">
              <div className="h-full rounded-full bg-pine-600 transition-all duration-150" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        <button className="btn-ghost" onClick={onClose} disabled={uploading}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={uploading}>
          {uploading ? <><Spinner size={13} /> Uploading…</> : 'Upload & register'}
        </button>
      </>}>
      <div className="grid sm:grid-cols-2 gap-3.5">
        <div className="sm:col-span-2">
          <Field label="Document title" req error={tried && !title.trim() ? 'A title is required' : undefined}>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Briefing note — Housing policy dialogue" />
          </Field>
        </div>
        <label className="sm:col-span-2 flex items-center gap-3 border border-dashed border-pine-300 bg-pine-50/50 rounded-md px-3.5 py-3 cursor-pointer hover:bg-pine-50 transition-colors">
          <input type="file" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = '';
          }} />
          <span className="text-pine-600"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V4M7.5 8 12 3.5 16.5 8" /><path d="M4.5 19.5h15" /></svg></span>
          <span className="text-[13px] text-ink-soft">
            {fileName ? <><span className="font-semibold text-ink">{fileName}</span> · {sizeKb} KB — click to replace</> : 'Choose a file (PDF, DOCX, XLSX, image…) or type a filename below'}
          </span>
        </label>
        {fileError && (
          <div className="sm:col-span-2 rounded-md border border-clay-100 bg-clay-50 px-3 py-2 text-[12.5px] text-clay-700">
            {fileError}
          </div>
        )}
        {!fileName && (
          <Field label="Filename" req error={tried && !fileName.trim() ? 'Provide a file (or filename)' : undefined}
            hint="Names are sanitised server-side — path separators, traversal sequences and script characters are stripped.">
            <input className="input" value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="document.pdf" />
          </Field>
        )}
        <Field label="Category">
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as DocCategory)}>
            {DOC_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Department">
          <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">— General —</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Security level">
          <select className="input" value={security} onChange={(e) => setSecurity(e.target.value as SecurityLevel)}>
            {SECURITY_LEVELS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Related matter">
          <select className="input" value={matterId} onChange={(e) => setMatterId(e.target.value)}>
            <option value="">— None —</option>
            {matters.map((m) => <option key={m.id} value={m.id}>{m.fileNumber} · {m.title}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-[13px] text-ink-soft cursor-pointer">
            <Toggle checked={isScan} onChange={setIsScan} /> This is a scanned document — index extracted text (OCR)
          </label>
        </div>
        {isScan && (
          <div className="sm:col-span-2">
            <Field label="Extracted / pasted text" hint="Paste the scan's text. It becomes searchable across the register.">
              <textarea className="textarea font-mono !text-[12px]" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="FEDERAL MINISTRY OF… " />
            </Field>
            {ocrRef && (
              <p className="mt-1.5 text-[11.5px] text-pine-700 bg-pine-50 border border-pine-100 rounded px-2.5 py-1.5">
                OCR pre-check · reference detected: <span className="ref font-semibold">{ocrRef.ref}</span> · {ocrRef.words} words indexed
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ── Create meeting ──────────────────────────────────────────────────── */
function MeetingForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { departments: _deps, users, db, me, createMeeting, nav } = useStore();
  void _deps;
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(dateOnly(1));
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('11:00');
  const [venue, setVenue] = useState('');
  const [link, setLink] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [external, setExternal] = useState('');
  const [agenda, setAgenda] = useState('');
  const [description, setDescription] = useState('');
  const [isInvite, setIsInvite] = useState(false);
  const [corrId, setCorrId] = useState('');
  const [matterId, setMatterId] = useState('');
  const [tried, setTried] = useState(false);
  const matters = db.matters.filter((m) => m.orgId === me?.orgId && !m.archived);
  const corrs = db.correspondence.filter((c) => c.orgId === me?.orgId && !c.archived);

  const submit = () => {
    setTried(true);
    if (!title.trim() || !venue.trim()) return;
    const m = createMeeting({
      title: title.trim(), date, startTime: start, endTime: end, venue: venue.trim(),
      virtualLink: link.trim() || undefined, participantIds: participants,
      externalOrgs: external.split(',').map((s) => s.trim()).filter(Boolean),
      agenda: agenda.split('\n').map((s) => s.trim()).filter(Boolean).map((text, i) => ({ id: `ag_${Date.now()}_${i}`, order: i + 1, text })),
      description: description.trim(), isInvitation: isInvite, response: isInvite ? 'Pending' : 'Accepted',
      relatedCorrId: corrId || undefined, matterId: matterId || undefined,
    });
    if (m) { onClose(); setTitle(''); setVenue(''); setAgenda(''); setTried(false); nav({ name: 'meeting', id: m.id }); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Schedule meeting" subtitle="Participants are notified and the event appears on the institutional calendar" w="max-w-2xl"
      footer={<>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit}>Schedule meeting</button>
      </>}>
      <div className="grid sm:grid-cols-2 gap-3.5">
        <div className="sm:col-span-2">
          <Field label="Meeting title" req error={tried && !title.trim() ? 'A title is required' : undefined}>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Grant due-diligence war room" />
          </Field>
        </div>
        <Field label="Date" req><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Start" req><input type="time" className="input" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="End" req><input type="time" className="input" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
        <Field label="Venue" req error={tried && !venue.trim() ? 'A venue is required' : undefined}>
          <input className="input" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Boardroom / Virtual / City" />
        </Field>
        <Field label="Virtual meeting link"><input className="input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" /></Field>
        <div className="sm:col-span-2">
          <Field label="Participants">
            <div className="border border-line rounded-md p-2 max-h-36 overflow-y-auto grid sm:grid-cols-2 gap-1 bg-white/60">
              {users.filter((u) => u.active && u.id !== me?.id).map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-[12.5px] text-ink-soft px-1.5 py-1 rounded hover:bg-pine-50 cursor-pointer">
                  <input type="checkbox" className="accent-pine-600" checked={participants.includes(u.id)}
                    onChange={(e) => setParticipants((p) => (e.target.checked ? [...p, u.id] : p.filter((x) => x !== u.id)))} />
                  <span className="truncate">{u.name}</span>
                </label>
              ))}
            </div>
          </Field>
        </div>
        <Field label="External organisations" hint="Comma separated"><input className="input" value={external} onChange={(e) => setExternal(e.target.value)} placeholder="Federal Ministry of Housing, UN Habitat" /></Field>
        <Field label="Related correspondence">
          <select className="input" value={corrId} onChange={(e) => setCorrId(e.target.value)}>
            <option value="">— None —</option>
            {corrs.map((c) => <option key={c.id} value={c.id}>{c.ref} · {c.subject.slice(0, 44)}</option>)}
          </select>
        </Field>
        <Field label="Related matter">
          <select className="input" value={matterId} onChange={(e) => setMatterId(e.target.value)}>
            <option value="">— None —</option>
            {matters.map((m) => <option key={m.id} value={m.id}>{m.fileNumber} · {m.title}</option>)}
          </select>
        </Field>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-[13px] text-ink-soft cursor-pointer">
            <Toggle checked={isInvite} onChange={setIsInvite} /> Track as received invitation
          </label>
        </div>
        <div className="sm:col-span-2">
          <Field label="Agenda" hint="One item per line">
            <textarea className="textarea" rows={3} value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder={'Opening remarks\nFramework presentation\nPartner positions'} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Description"><textarea className="textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}

/* ── Create task ─────────────────────────────────────────────────────── */
function TaskForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { users, departments, db, me, createTask, nav } = useStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [priority, setPriority] = useState<Priority>('Routine');
  const [due, setDue] = useState('');
  const [matterId, setMatterId] = useState('');
  const [corrId, setCorrId] = useState('');
  const [tried, setTried] = useState(false);
  const matters = db.matters.filter((m) => m.orgId === me?.orgId && !m.archived);
  const corrs = db.correspondence.filter((c) => c.orgId === me?.orgId && !c.archived);

  const submit = () => {
    setTried(true);
    if (!title.trim()) return;
    const t = createTask({
      title: title.trim(), description: description.trim(),
      assigneeId: assigneeId || undefined, departmentId: departmentId || undefined, priority,
      dueDate: due ? new Date(`${due}T17:00:00`).toISOString() : undefined,
      relatedType: matterId ? 'matter' : corrId ? 'correspondence' : undefined,
      relatedId: matterId || corrId || undefined,
    });
    if (t) { onClose(); setTitle(''); setDescription(''); setDue(''); setTried(false); nav({ name: 'tasks', id: t.id }); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create task" subtitle="The assignee is notified immediately and the deadline enters the reminder engine" w="max-w-2xl"
      footer={<>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit}>Create & assign</button>
      </>}>
      <div className="grid sm:grid-cols-2 gap-3.5">
        <div className="sm:col-span-2">
          <Field label="Task" req error={tried && !title.trim() ? 'A task title is required' : undefined}>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Prepare briefing note on housing proposal" />
          </Field>
        </div>
        <Field label="Assign to">
          <select className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">— Unassigned —</option>
            {users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name} · {u.title}</option>)}
          </select>
        </Field>
        <Field label="Department">
          <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">—</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Due date"><input type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} min={dateOnly(-1)} /></Field>
        <Field label="Related matter">
          <select className="input" value={matterId} onChange={(e) => { setMatterId(e.target.value); if (e.target.value) setCorrId(''); }}>
            <option value="">— None —</option>
            {matters.map((m) => <option key={m.id} value={m.id}>{m.fileNumber} · {m.title}</option>)}
          </select>
        </Field>
        <Field label="Related correspondence">
          <select className="input" value={corrId} onChange={(e) => { setCorrId(e.target.value); if (e.target.value) setMatterId(''); }}>
            <option value="">— None —</option>
            {corrs.map((c) => <option key={c.id} value={c.id}>{c.ref} · {c.subject.slice(0, 40)}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description"><textarea className="textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}

/* ── Create memo ─────────────────────────────────────────────────────── */
function MemoForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { departments, createMemo, nav } = useStore();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [security, setSecurity] = useState<SecurityLevel>('Internal');
  const [tried, setTried] = useState(false);

  const submit = () => {
    setTried(true);
    if (!to.trim() || !subject.trim()) return;
    const m = createMemo({ to: to.trim(), subject: subject.trim(), body: body.trim(), departmentId: departmentId || undefined, security });
    if (m) { onClose(); setTo(''); setSubject(''); setBody(''); setTried(false); nav({ name: 'documents', id: m.id }); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Internal memorandum" subtitle="Draft → Review → Approval chain → Circulated · versions retained" w="max-w-2xl"
      footer={<>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit}>Draft memorandum</button>
      </>}>
      <div className="grid sm:grid-cols-2 gap-3.5">
        <Field label="To" req error={tried && !to.trim() ? 'A recipient is required' : undefined}>
          <input className="input" value={to} onChange={(e) => setTo(e.target.value)} placeholder="All Department Heads" />
        </Field>
        <Field label="Department">
          <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">— Administration —</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Subject" req error={tried && !subject.trim() ? 'A subject is required' : undefined}>
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Revised registry cut-off times" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Body" req>
            <textarea className="textarea" rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="The memorandum text…" />
          </Field>
        </div>
        <Field label="Security level">
          <select className="input" value={security} onChange={(e) => setSecurity(e.target.value as SecurityLevel)}>
            {SECURITY_LEVELS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>
    </Modal>
  );
}

/* ── Create matter ───────────────────────────────────────────────────── */
function MatterForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { departments, createMatter, nav } = useStore();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Policy Engagement');
  const [departmentId, setDepartmentId] = useState('');
  const [security, setSecurity] = useState<SecurityLevel>('Internal');
  const [description, setDescription] = useState('');
  const [tried, setTried] = useState(false);

  const submit = () => {
    setTried(true);
    if (!title.trim()) return;
    const m = createMatter({ title: title.trim(), category, departmentId: departmentId || undefined, security, description: description.trim() });
    if (m) { onClose(); setTitle(''); setDescription(''); setTried(false); nav({ name: 'matter', id: m.id }); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Open matter file" subtitle="A matter is the complete institutional history around one issue" w="max-w-2xl"
      footer={<>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit}>Open matter</button>
      </>}>
      <div className="grid sm:grid-cols-2 gap-3.5">
        <div className="sm:col-span-2">
          <Field label="Matter title" req error={tried && !title.trim() ? 'A title is required' : undefined}>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Abuja Housing Policy Engagement" />
          </Field>
        </div>
        <Field label="Category">
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {['Policy Engagement', 'Programme Delivery', 'Grants & Finance', 'Procurement', 'Policy', 'Partnership', 'Legal', 'Publication', 'General'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Owning department">
          <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">—</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Security level">
          <select className="input" value={security} onChange={(e) => setSecurity(e.target.value as SecurityLevel)}>
            {SECURITY_LEVELS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description"><textarea className="textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this matter about? Why does it deserve a file of its own?" /></Field>
        </div>
      </div>
    </Modal>
  );
}

/* ── Add contact ─────────────────────────────────────────────────────── */
function ContactForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addContact } = useStore();
  const [f, setF] = useState({ name: '', position: '', organisation: '', email: '', phone: '', address: '', website: '', notes: '', tags: '' });
  const [tried, setTried] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = () => {
    setTried(true);
    if (!f.name.trim()) return;
    addContact({
      name: f.name.trim(), position: f.position.trim(), organisation: f.organisation.trim(),
      email: f.email.trim(), phone: f.phone.trim(), address: f.address.trim(), website: f.website.trim(),
      notes: f.notes.trim(), tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
    onClose();
    setF({ name: '', position: '', organisation: '', email: '', phone: '', address: '', website: '', notes: '', tags: '' });
    setTried(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Add contact" subtitle="Institutional directory entry" w="max-w-2xl"
      footer={<>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit}>Save contact</button>
      </>}>
      <div className="grid sm:grid-cols-2 gap-3.5">
        <Field label="Full name" req error={tried && !f.name.trim() ? 'A name is required' : undefined}>
          <input className="input" value={f.name} onChange={set('name')} />
        </Field>
        <Field label="Position"><input className="input" value={f.position} onChange={set('position')} /></Field>
        <Field label="Organisation"><input className="input" value={f.organisation} onChange={set('organisation')} /></Field>
        <Field label="Email"><input className="input" value={f.email} onChange={set('email')} placeholder="name@org.gov" /></Field>
        <Field label="Phone"><input className="input" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Website"><input className="input" value={f.website} onChange={set('website')} /></Field>
        <div className="sm:col-span-2"><Field label="Address"><input className="input" value={f.address} onChange={set('address')} /></Field></div>
        <div className="sm:col-span-2"><Field label="Notes"><textarea className="textarea" rows={2} value={f.notes} onChange={set('notes')} /></Field></div>
        <div className="sm:col-span-2"><Field label="Tags" hint="Comma separated"><input className="input" value={f.tags} onChange={set('tags')} placeholder="government, housing" /></Field></div>
      </div>
    </Modal>
  );
}

/* keep helpers referenced */
void err;
export function fmtPreviewDate(iso: string) { return fmtDate(iso); }
